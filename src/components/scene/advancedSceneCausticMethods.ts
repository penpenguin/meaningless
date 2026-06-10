/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from '../fish/DetailedFish'
import { EnhancedParticleSystem } from '../effects/EnhancedParticles'
import { EnvironmentLoader, createEnvironmentBackdropTexture } from './Environment'
import { AquascapingSystem, resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors } from '../aquascape/Aquascaping'
import { GodRaysEffect } from '../effects/GodRays'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { defaultTheme } from '../../utils/storage/stateSchema'
import { disposeSceneResources } from '../../utils/three/threeDisposal'
import { createOpenWaterBounds } from '../../utils/layout/sceneBounds'
import { createEmptySpanTimingStats, createEmptyPerformanceStats, measurePerformanceSpan, readRendererDebugStats } from '../../utils/performance/performanceStats'
import { DEFAULT_PERFORMANCE_TUNING } from '../../utils/performance/performanceTuning'
import { resolveAdaptiveRenderScale } from '../../utils/performance/renderScale'
import { shouldRunQualityCadencedUpdate } from '../../utils/performance/updateCadence'
import { AQUARIUM_CAMERA_FRAMING, AQUARIUM_DEPTH_LAYER_ANCHORS, AQUARIUM_TANK_DIMENSIONS, MAIN_LIGHT_RIG_ANCHORS, MAIN_LIGHT_TARGET_OFFSETS, PRIMARY_SHADOW_CAMERA_RANGE, PRIMARY_SHADOW_FRUSTUM_RATIOS, resolveDefaultCameraPosition, resolveDefaultControlsTarget, resolveLightTarget, resolvePhotoModeCameraPosition, resolvePhotoModeControlsTarget, resolveTankRelativePosition } from '../../utils/layout/aquariumLayout'
import { ScreenSpaceWaterHazeShader, syncScreenSpaceWaterHazePass } from '../effects/screenSpaceWaterHaze'
import { AQUARIUM_LAYERED_LIGHTING_ANCHORS, SURFACE_CAUSTIC_PHASE_FAMILY } from './sceneLighting'
import { SUBSTRATE_GEOMETRY_SEGMENTS, SUBSTRATE_VISUAL_FOOTPRINT_SCALE } from './substrateGeometry'
import { sampleSubstrateHeight } from './advancedSceneSubstrateHeight'
import { applyGradientBackground, applyThemeToScene, resolvePremiumThemeValues, resolveTheme, usesOpenWaterPresentation } from './advancedSceneTheme'

export function createCausticsLayers(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const floorMaterial = new THREE.MeshBasicMaterial({
      map: this.createCausticsTexture(),
      color: new THREE.Color('#bcc1b0'),
      transparent: true,
      opacity: 0.046,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    const floorCaustics = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth - 0.5, tankDepth - 0.5),
      floorMaterial
    )
    floorCaustics.name = 'tank-caustics-floor'
    floorCaustics.rotation.x = -Math.PI / 2
    floorCaustics.position.y = -tankHeight / 2 + 0.58
    floorCaustics.renderOrder = 2
    floorCaustics.userData.baseOpacity = 0.046
    floorCaustics.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
    floorCaustics.userData.phaseOffset = 0.22
    floorCaustics.userData.mapRepeatX = 1.42
    floorCaustics.userData.mapRepeatY = 1.16
    floorCaustics.userData.mapWarpX = 0.018
    floorCaustics.userData.mapWarpY = 0.013
    floorCaustics.userData.mapRotation = 0.016
    this.tank.add(floorCaustics)

    const backMaterial = floorMaterial.clone()
    backMaterial.map = this.createCausticsTexture()
    backMaterial.alphaMap = this.createFeatherMaskTexture('midground')
    backMaterial.color = new THREE.Color('#b9bfad')
    backMaterial.opacity = 0.03

    const backCaustics = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 1.02, tankHeight * 0.72),
      backMaterial
    )
    backCaustics.name = 'tank-caustics-back'
    backCaustics.position.set(tankWidth * 0.08, -tankHeight * 0.06, -tankDepth / 2 + 0.12)
    backCaustics.renderOrder = 2
    backCaustics.userData.baseOpacity = 0.03
    backCaustics.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
    backCaustics.userData.phaseOffset = 0.54
    backCaustics.userData.mapRepeatX = 1.18
    backCaustics.userData.mapRepeatY = 1.08
    backCaustics.userData.mapWarpX = 0.014
    backCaustics.userData.mapWarpY = 0.01
    backCaustics.userData.mapRotation = 0.012
    this.tank.add(backCaustics)

    this.causticsMeshes = [floorCaustics, backCaustics]
  }

export function createCausticsTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.26, 1.08)

    if (
      !ctx ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.fillRect !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'screen'

    const clusters = [
      { x: 0.12, y: 0.18, radius: 94, alpha: 0.1 },
      { x: 0.32, y: 0.16, radius: 78, alpha: 0.082 },
      { x: 0.56, y: 0.22, radius: 108, alpha: 0.108 },
      { x: 0.84, y: 0.18, radius: 86, alpha: 0.074 },
      { x: 0.22, y: 0.46, radius: 112, alpha: 0.092 },
      { x: 0.5, y: 0.38, radius: 92, alpha: 0.082 },
      { x: 0.78, y: 0.48, radius: 124, alpha: 0.102 },
      { x: 0.18, y: 0.78, radius: 96, alpha: 0.072 },
      { x: 0.48, y: 0.82, radius: 88, alpha: 0.064 },
      { x: 0.76, y: 0.72, radius: 116, alpha: 0.092 }
    ]

    for (const cluster of clusters) {
      const centerX = canvas.width * cluster.x
      const centerY = canvas.height * cluster.y
      const outerRadius = cluster.radius
      const outerGradient = ctx.createRadialGradient(
        centerX - outerRadius * 0.24,
        centerY - outerRadius * 0.18,
        outerRadius * 0.08,
        centerX,
        centerY,
        outerRadius
      )
      outerGradient.addColorStop(0, `rgba(198, 194, 171, ${cluster.alpha * 0.9})`)
      outerGradient.addColorStop(0.35, `rgba(150, 147, 122, ${cluster.alpha * 0.4})`)
      outerGradient.addColorStop(0.72, `rgba(92, 101, 74, ${cluster.alpha * 0.1})`)
      outerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = outerGradient
      ctx.fillRect(
        centerX - outerRadius,
        centerY - outerRadius * 0.82,
        outerRadius * 2,
        outerRadius * 1.64
      )

      const coreRadius = outerRadius * 0.5
      const coreGradient = ctx.createRadialGradient(
        centerX + outerRadius * 0.14,
        centerY - outerRadius * 0.08,
        0,
        centerX + outerRadius * 0.14,
        centerY - outerRadius * 0.08,
        coreRadius
      )
      coreGradient.addColorStop(0, `rgba(205, 201, 178, ${cluster.alpha * 0.38})`)
      coreGradient.addColorStop(0.55, `rgba(149, 145, 121, ${cluster.alpha * 0.14})`)
      coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = coreGradient
      ctx.fillRect(
        centerX - coreRadius * 0.8,
        centerY - coreRadius * 0.72,
        coreRadius * 1.6,
        coreRadius * 1.44
      )
    }

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createHardscapeOcclusionTexture(this: any, layer: 'floor' | 'backwall' | 'shaft'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (!ctx || typeof ctx.createRadialGradient !== 'function') {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const occlusionPools = layer === 'floor'
      ? [
          { x: 0.46, y: 0.48, radiusX: 196, radiusY: 128, alpha: 0.52 },
          { x: 0.64, y: 0.38, radiusX: 128, radiusY: 92, alpha: 0.28 }
        ]
      : layer === 'backwall'
        ? [
            { x: 0.42, y: 0.46, radiusX: 220, radiusY: 184, alpha: 0.38 },
            { x: 0.64, y: 0.58, radiusX: 124, radiusY: 112, alpha: 0.18 }
          ]
        : [
            { x: 0.36, y: 0.3, radiusX: 114, radiusY: 164, alpha: 0.44 },
            { x: 0.68, y: 0.62, radiusX: 132, radiusY: 192, alpha: 0.36 }
          ]

    occlusionPools.forEach((pool) => {
      ctx.save()
      ctx.translate(canvas.width * pool.x, canvas.height * pool.y)
      ctx.scale(1, pool.radiusY / pool.radiusX)
      const gradient = ctx.createRadialGradient(0, 0, pool.radiusX * 0.18, 0, 0, pool.radiusX)
      gradient.addColorStop(0, `rgba(19, 24, 21, ${pool.alpha})`)
      gradient.addColorStop(0.58, `rgba(19, 24, 21, ${pool.alpha * 0.4})`)
      gradient.addColorStop(1, 'rgba(19, 24, 21, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(-pool.radiusX, -pool.radiusX, pool.radiusX * 2, pool.radiusX * 2)
      ctx.restore()
    })

    if (layer === 'backwall') {
      const topFade = ctx.createLinearGradient(0, 0, 0, canvas.height)
      topFade.addColorStop(0, 'rgba(16, 20, 18, 0.18)')
      topFade.addColorStop(0.38, 'rgba(16, 20, 18, 0.06)')
      topFade.addColorStop(1, 'rgba(16, 20, 18, 0)')
      ctx.fillStyle = topFade
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (layer === 'shaft') {
      const topFade = ctx.createLinearGradient(0, 0, 0, canvas.height)
      topFade.addColorStop(0, 'rgba(16, 20, 18, 0.03)')
      topFade.addColorStop(0.3, 'rgba(16, 20, 18, 0.08)')
      topFade.addColorStop(0.72, 'rgba(16, 20, 18, 0.18)')
      topFade.addColorStop(1, 'rgba(16, 20, 18, 0.04)')
      ctx.fillStyle = topFade
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
