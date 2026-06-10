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

export function createBackHorizonFogTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
      return texture
    }

    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.52)')
    gradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.96)')
    gradient.addColorStop(0.78, 'rgba(255, 255, 255, 0.28)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    texture.needsUpdate = true
    return texture
  }

export function createBackdropTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    const baseGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    baseGradient.addColorStop(0, 'rgba(88, 97, 78, 0.16)')
    baseGradient.addColorStop(0.28, 'rgba(53, 61, 48, 0.34)')
    baseGradient.addColorStop(0.68, 'rgba(25, 30, 24, 0.72)')
    baseGradient.addColorStop(1, 'rgba(17, 22, 19, 0.92)')
    ctx.fillStyle = baseGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const haze = ctx.createRadialGradient(
      canvas.width * 0.52,
      canvas.height * 0.22,
      canvas.width * 0.08,
      canvas.width * 0.52,
      canvas.height * 0.22,
      canvas.width * 0.64
    )
    haze.addColorStop(0, 'rgba(174, 180, 157, 0.1)')
    haze.addColorStop(0.45, 'rgba(86, 95, 74, 0.058)')
    haze.addColorStop(1, 'rgba(17, 22, 19, 0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const sideHaze = ctx.createRadialGradient(
      canvas.width * 0.24,
      canvas.height * 0.44,
      canvas.width * 0.04,
      canvas.width * 0.24,
      canvas.height * 0.44,
      canvas.width * 0.34
    )
    sideHaze.addColorStop(0, 'rgba(114, 121, 96, 0.066)')
    sideHaze.addColorStop(0.52, 'rgba(63, 72, 57, 0.058)')
    sideHaze.addColorStop(1, 'rgba(17, 22, 19, 0)')
    ctx.fillStyle = sideHaze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const upperMist = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.62)
    upperMist.addColorStop(0, 'rgba(206, 208, 190, 0.12)')
    upperMist.addColorStop(0.32, 'rgba(128, 135, 109, 0.056)')
    upperMist.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = upperMist
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.62)

    ctx.lineWidth = 18
    ctx.strokeStyle = 'rgba(18, 22, 18, 0.16)'
    ;[
      { x: 0.16, height: 0.32, bend: -0.05 },
      { x: 0.35, height: 0.48, bend: 0.04 },
      { x: 0.57, height: 0.38, bend: -0.03 },
      { x: 0.78, height: 0.44, bend: 0.05 }
    ].forEach((leaf) => {
      const baseX = canvas.width * leaf.x
      const baseY = canvas.height
      const tipY = canvas.height * (1 - leaf.height)
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.bezierCurveTo(
        baseX - canvas.width * 0.04,
        canvas.height * 0.84,
        baseX + canvas.width * leaf.bend,
        canvas.height * 0.56,
        baseX - canvas.width * leaf.bend,
        tipY
      )
      ctx.stroke()
    })

    ctx.globalCompositeOperation = 'destination-in'
    const mask = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.48,
      canvas.width * 0.12,
      canvas.width * 0.5,
      canvas.height * 0.48,
      canvas.width * 0.58
    )
    mask.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
    mask.addColorStop(0.72, 'rgba(255, 255, 255, 0.74)')
    mask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = mask
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const horizontalMask = ctx.createLinearGradient(0, 0, canvas.width, 0)
    horizontalMask.addColorStop(0, 'rgba(255, 255, 255, 0)')
    horizontalMask.addColorStop(0.16, 'rgba(255, 255, 255, 0.76)')
    horizontalMask.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
    horizontalMask.addColorStop(0.84, 'rgba(255, 255, 255, 0.72)')
    horizontalMask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = horizontalMask
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createWallPanelTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    const verticalGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    verticalGradient.addColorStop(0, 'rgba(149, 155, 135, 0.1)')
    verticalGradient.addColorStop(0.28, 'rgba(86, 93, 77, 0.086)')
    verticalGradient.addColorStop(1, 'rgba(26, 30, 24, 0.076)')
    ctx.fillStyle = verticalGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 3; i++) {
      const x = canvas.width * (0.18 + (i * 0.2))
      const glow = ctx.createLinearGradient(x, 0, x + (canvas.width * 0.1), canvas.height)
      glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
      glow.addColorStop(0.5, 'rgba(168, 174, 152, 0.066)')
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(x - (canvas.width * 0.08), 0, canvas.width * 0.2, canvas.height)
    }

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.moveTo === 'function' &&
      typeof ctx.bezierCurveTo === 'function' &&
      typeof ctx.stroke === 'function'
    ) {
      ctx.globalAlpha = 0.22
      for (let i = 0; i < 11; i++) {
        const startY = canvas.height * (0.08 + (i * 0.08))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(149, 156, 137, 0.09)' : 'rgba(52, 62, 50, 0.15)'
        ctx.lineWidth = 10 + (i % 3)
        ctx.beginPath()
        ctx.moveTo(-24, startY)
        ctx.bezierCurveTo(
          canvas.width * 0.24,
          startY - 14,
          canvas.width * 0.7,
          startY + 18,
          canvas.width + 24,
          startY - 10
        )
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const lowerSilt = ctx.createLinearGradient(0, canvas.height * 0.62, 0, canvas.height)
    lowerSilt.addColorStop(0, 'rgba(82, 67, 49, 0)')
    lowerSilt.addColorStop(1, 'rgba(82, 67, 49, 0.16)')
    ctx.fillStyle = lowerSilt
    ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.38)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

export function createDepthLayers(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const theme = this.scene instanceof THREE.Scene
      ? resolveTheme(this.scene)
      : defaultTheme
    const useOpenWaterPresentation = usesOpenWaterPresentation(theme)

    const midground = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.78, tankHeight * 0.54),
      new THREE.MeshBasicMaterial({
        map: this.createDepthMidgroundTexture(),
        alphaMap: this.createFeatherMaskTexture('midground'),
        color: new THREE.Color('#4b5846'),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    midground.name = 'tank-depth-midground'
    midground.position.copy(
      resolveTankRelativePosition(dimensions, AQUARIUM_DEPTH_LAYER_ANCHORS.midground)
    )
    midground.renderOrder = 1
    midground.userData.baseOpacity = 0.24
    this.depthMidgroundMesh = midground
    this.tank.add(midground)

    const foregroundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.74),
      new THREE.MeshBasicMaterial({
        map: this.createForegroundShadowTexture(),
        alphaMap: this.createFeatherMaskTexture('foreground'),
        color: new THREE.Color('#292d24'),
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    foregroundShadow.name = 'tank-depth-foreground-shadow'
    foregroundShadow.position.copy(
      resolveTankRelativePosition(dimensions, AQUARIUM_DEPTH_LAYER_ANCHORS.foregroundShadow)
    )
    foregroundShadow.renderOrder = 4
    foregroundShadow.userData.baseOpacity = 0.08
    this.foregroundShadowMesh = foregroundShadow
    this.tank.add(foregroundShadow)

    if (useOpenWaterPresentation) {
      const backHorizonFog = new THREE.Mesh(
        new THREE.PlaneGeometry(tankWidth * 5.2, tankHeight * 0.42),
        new THREE.MeshBasicMaterial({
          alphaMap: this.createBackHorizonFogTexture(),
          color: new THREE.Color('#07120f'),
          transparent: true,
          opacity: 0.64,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      backHorizonFog.name = 'tank-back-horizon-fog'
      backHorizonFog.position.set(0, -tankHeight / 2 + tankHeight * 0.25, -tankDepth / 2 + 0.18)
      backHorizonFog.renderOrder = 3
      this.tank.add(backHorizonFog)
    }
  }

export function createHeroLightingLayers(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const lightCanopyPosition = resolveTankRelativePosition(dimensions, AQUARIUM_LAYERED_LIGHTING_ANCHORS.lightCanopy)
    const heroRimLightPosition = resolveTankRelativePosition(dimensions, AQUARIUM_LAYERED_LIGHTING_ANCHORS.heroRimLight)
    const heroGroundGlowPosition = resolveTankRelativePosition(dimensions, AQUARIUM_LAYERED_LIGHTING_ANCHORS.heroGroundGlow)
    const heroFrontFillPosition = resolveTankRelativePosition(dimensions, AQUARIUM_LAYERED_LIGHTING_ANCHORS.heroFrontFill)

    const lightCanopy = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.94, tankHeight * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.createHeroLightCanopyTexture(),
        color: new THREE.Color('#e1ddc9'),
        transparent: true,
        opacity: 0.164,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    lightCanopy.name = 'tank-light-canopy'
    lightCanopy.position.copy(lightCanopyPosition)
    lightCanopy.renderOrder = 2
    lightCanopy.userData.baseOpacity = 0.176
    lightCanopy.userData.baseY = lightCanopyPosition.y
    this.lightCanopyMesh = lightCanopy
    this.tank.add(lightCanopy)

    const heroRimLight = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.24, tankHeight * 0.48),
      new THREE.MeshBasicMaterial({
        map: this.createHeroRimLightTexture(),
        color: new THREE.Color('#d7ddcf'),
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    heroRimLight.name = 'tank-hero-rim-light'
    heroRimLight.position.copy(heroRimLightPosition)
    heroRimLight.rotation.y = -0.24
    heroRimLight.renderOrder = 2
    heroRimLight.userData.baseOpacity = 0.08
    heroRimLight.userData.baseX = heroRimLightPosition.x
    this.heroRimLightMesh = heroRimLight
    this.tank.add(heroRimLight)

    const heroGroundGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.44, tankDepth * 0.34),
      new THREE.MeshBasicMaterial({
        map: this.createHeroGroundGlowTexture(),
        color: new THREE.Color('#c2b296'),
        transparent: true,
        opacity: 0.082,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    heroGroundGlow.name = 'tank-hero-ground-glow'
    heroGroundGlow.rotation.x = -Math.PI / 2
    heroGroundGlow.position.copy(heroGroundGlowPosition)
    heroGroundGlow.renderOrder = 2
    heroGroundGlow.userData.baseOpacity = 0.092
    this.heroGroundGlowMesh = heroGroundGlow
    this.tank.add(heroGroundGlow)

    const heroFrontFill = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.34, tankHeight * 0.32),
      new THREE.MeshBasicMaterial({
        map: this.createHeroFrontFillTexture(),
        color: new THREE.Color('#c9ccb8'),
        transparent: true,
        opacity: 0.084,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    heroFrontFill.name = 'tank-hero-front-fill'
    heroFrontFill.position.copy(heroFrontFillPosition)
    heroFrontFill.rotation.y = 0.08
    heroFrontFill.rotation.z = -0.04
    heroFrontFill.renderOrder = 2
    heroFrontFill.userData.baseOpacity = 0.096
    heroFrontFill.userData.baseX = heroFrontFillPosition.x
    heroFrontFill.userData.baseY = heroFrontFillPosition.y
    this.heroFrontFillMesh = heroFrontFill
    this.tank.add(heroFrontFill)
  }

export function syncScreenSpaceHazePass(this: any, theme: Theme, quality: QualityLevel = this.currentVisualQuality ?? 'standard'): void {
    const cameraAspect = this.camera?.aspect
    const fallbackAspect = this.screenSpaceHazePass?.uniforms.aspect.value
    const aspect = Number.isFinite(cameraAspect) && cameraAspect !== 1
      ? cameraAspect
      : fallbackAspect

    if (this.performanceTuning?.screenSpaceHazeEnabled === false) {
      if (this.screenSpaceHazePass) {
        this.screenSpaceHazePass.enabled = false
      }
      this.godRaysEffect?.setScreenSpaceWaterHazeEnabled?.(false)
      return
    }

    syncScreenSpaceWaterHazePass(this.screenSpaceHazePass, theme, quality, aspect)
    this.godRaysEffect?.configureScreenSpaceWaterHaze?.(theme, quality, aspect)
  }

export function createUnderwaterLightingBands(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight } = dimensions

    const nearSurfaceTexture = this.createNearSurfaceLightTexture()
    const nearSurfaceConfig = {
      name: 'tank-light-near-surface-sheet',
      size: new THREE.Vector2(tankWidth * 1.55, tankHeight * 0.62),
      anchor: AQUARIUM_LAYERED_LIGHTING_ANCHORS.nearSurfaceBands[2],
      rotationY: -0.08,
      rotationZ: -0.01,
      opacity: 0.13,
      scrollX: 0.0014,
      scrollY: 0.0072,
      swayX: 0.075,
      swayY: 0.05,
      opacityPulse: 0.048,
      phase: 1.24,
      mapRepeatX: 1.2,
      mapRepeatY: 1.04,
      mapWarpX: 0.025,
      mapWarpY: 0.016,
      mapRotation: 0.036
    }
    nearSurfaceTexture.repeat.set(nearSurfaceConfig.mapRepeatX, nearSurfaceConfig.mapRepeatY)
    const nearSurfacePosition = resolveTankRelativePosition(dimensions, nearSurfaceConfig.anchor)
    const nearSurfaceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(nearSurfaceConfig.size.x, nearSurfaceConfig.size.y),
      new THREE.MeshBasicMaterial({
        map: nearSurfaceTexture,
        color: new THREE.Color('#ddd9c7'),
        transparent: true,
        opacity: nearSurfaceConfig.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    nearSurfaceMesh.name = nearSurfaceConfig.name
    nearSurfaceMesh.position.copy(nearSurfacePosition)
    nearSurfaceMesh.rotation.y = nearSurfaceConfig.rotationY
    nearSurfaceMesh.rotation.z = nearSurfaceConfig.rotationZ
    nearSurfaceMesh.renderOrder = 2
    nearSurfaceMesh.userData.baseOpacity = nearSurfaceConfig.opacity
    nearSurfaceMesh.userData.baseX = nearSurfacePosition.x
    nearSurfaceMesh.userData.baseY = nearSurfacePosition.y
    nearSurfaceMesh.userData.scrollX = nearSurfaceConfig.scrollX
    nearSurfaceMesh.userData.scrollY = nearSurfaceConfig.scrollY
    nearSurfaceMesh.userData.swayX = nearSurfaceConfig.swayX
    nearSurfaceMesh.userData.swayY = nearSurfaceConfig.swayY
    nearSurfaceMesh.userData.opacityPulse = nearSurfaceConfig.opacityPulse
    nearSurfaceMesh.userData.phase = nearSurfaceConfig.phase
    nearSurfaceMesh.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
    nearSurfaceMesh.userData.mapRepeatX = nearSurfaceConfig.mapRepeatX
    nearSurfaceMesh.userData.mapRepeatY = nearSurfaceConfig.mapRepeatY
    nearSurfaceMesh.userData.mapWarpX = nearSurfaceConfig.mapWarpX
    nearSurfaceMesh.userData.mapWarpY = nearSurfaceConfig.mapWarpY
    nearSurfaceMesh.userData.mapRotation = nearSurfaceConfig.mapRotation
    this.tank.add(nearSurfaceMesh)
    this.nearSurfaceLightMeshes = [nearSurfaceMesh]

    const midwaterPosition = resolveTankRelativePosition(dimensions, AQUARIUM_LAYERED_LIGHTING_ANCHORS.midwater)
    const midwaterConfig = {
      name: 'tank-light-midwater-sheet',
      size: new THREE.Vector2(tankWidth * 0.9, tankHeight * 0.64),
      position: midwaterPosition.clone(),
      rotationY: -0.08,
      rotationZ: 0.014,
      opacity: 0.084,
      scrollX: 0.0002,
      scrollY: 0.0044,
      swayX: 0.05,
      swayY: 0.045,
      swayZ: 0.052,
      opacityPulse: 0.04,
      phase: 0.72,
      mapRepeatX: 1.12,
      mapRepeatY: 1.05,
      mapWarpX: 0.018,
      mapWarpY: 0.013,
      mapRotation: 0.024,
      variant: 'combined' as const
    }
    const midwaterTexture = this.createMidwaterLightTexture(midwaterConfig.variant)
    midwaterTexture.repeat.set(midwaterConfig.mapRepeatX, midwaterConfig.mapRepeatY)
    const midwaterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(midwaterConfig.size.x, midwaterConfig.size.y),
      new THREE.MeshBasicMaterial({
        map: midwaterTexture,
        color: new THREE.Color('#d4d2c0'),
        transparent: true,
        opacity: midwaterConfig.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    midwaterMesh.name = midwaterConfig.name
    midwaterMesh.position.copy(midwaterConfig.position)
    midwaterMesh.rotation.y = midwaterConfig.rotationY
    midwaterMesh.rotation.z = midwaterConfig.rotationZ
    midwaterMesh.renderOrder = 2
    midwaterMesh.userData.baseOpacity = midwaterConfig.opacity
    midwaterMesh.userData.baseX = midwaterConfig.position.x
    midwaterMesh.userData.baseY = midwaterConfig.position.y
    midwaterMesh.userData.baseZ = midwaterConfig.position.z
    midwaterMesh.userData.baseRotationZ = midwaterConfig.rotationZ
    midwaterMesh.userData.scrollX = midwaterConfig.scrollX
    midwaterMesh.userData.scrollY = midwaterConfig.scrollY
    midwaterMesh.userData.swayX = midwaterConfig.swayX
    midwaterMesh.userData.swayY = midwaterConfig.swayY
    midwaterMesh.userData.swayZ = midwaterConfig.swayZ
    midwaterMesh.userData.opacityPulse = midwaterConfig.opacityPulse
    midwaterMesh.userData.phase = midwaterConfig.phase
    midwaterMesh.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
    midwaterMesh.userData.mapRepeatX = midwaterConfig.mapRepeatX
    midwaterMesh.userData.mapRepeatY = midwaterConfig.mapRepeatY
    midwaterMesh.userData.mapWarpX = midwaterConfig.mapWarpX
    midwaterMesh.userData.mapWarpY = midwaterConfig.mapWarpY
    midwaterMesh.userData.mapRotation = midwaterConfig.mapRotation
    midwaterMesh.userData.midwaterLayer = midwaterConfig.variant
    this.tank.add(midwaterMesh)
    this.midwaterLightMeshes = [midwaterMesh]
  }

export function createHardscapeOcclusionLayers(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const layoutStyle = this.scene instanceof THREE.Scene
      ? resolveTheme(this.scene).layoutStyle
      : defaultTheme.layoutStyle
    const hardscapeAnchors = resolveSubstrateHardscapeAnchors(layoutStyle)

    const driftwoodAnchor = hardscapeAnchors.find((anchor) => anchor.id === 'driftwood-root-flare')
    const ridgeAnchor = hardscapeAnchors.find((anchor) => anchor.id === 'ridge-rock-hero')

    const createFloorOcclusion = (
      name: string,
      anchor: typeof hardscapeAnchors[number] | undefined,
      width: number,
      depth: number,
      opacity: number,
      occlusionStrength: number,
      offsetX = 0,
      offsetZ = 0
    ): THREE.Mesh | null => {
      if (!anchor) {
        return null
      }

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, depth),
        new THREE.MeshBasicMaterial({
          map: this.createHardscapeOcclusionTexture('floor'),
          color: new THREE.Color('#171d1b'),
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.NormalBlending,
          side: THREE.DoubleSide
        })
      )
      mesh.name = name
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(
        (anchor.x * tankWidth) + offsetX,
        -tankHeight / 2 + 0.08,
        (anchor.z * tankDepth) + offsetZ
      )
      mesh.renderOrder = 3
      mesh.userData.baseOpacity = opacity
      mesh.userData.occlusionLayer = 'floor'
      mesh.userData.occlusionStrength = occlusionStrength
      this.tank.add(mesh)
      return mesh
    }

    const driftwoodOcclusion = createFloorOcclusion(
      'tank-hardscape-occlusion-driftwood',
      driftwoodAnchor,
      tankWidth * 0.24,
      tankDepth * 0.18,
      0.108,
      0.82,
      -0.02,
      0.24
    )
    const ridgeOcclusion = createFloorOcclusion(
      'tank-hardscape-occlusion-ridge',
      ridgeAnchor,
      tankWidth * 0.28,
      tankDepth * 0.22,
      0.132,
      0.86,
      0.16,
      0.12
    )

    const backwallOcclusion = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.54, tankHeight * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.createHardscapeOcclusionTexture('backwall'),
        color: new THREE.Color('#181f1d'),
        transparent: true,
        opacity: 0.094,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      })
    )
    backwallOcclusion.name = 'tank-hardscape-occlusion-backwall'
    backwallOcclusion.position.set(tankWidth * 0.09, -tankHeight * 0.02, -tankDepth / 2 + 0.12)
    backwallOcclusion.renderOrder = 3
    backwallOcclusion.userData.baseOpacity = 0.094
    backwallOcclusion.userData.occlusionLayer = 'backwall'
    this.tank.add(backwallOcclusion)

    this.hardscapeOcclusionMeshes = [
      driftwoodOcclusion,
      ridgeOcclusion,
      backwallOcclusion
    ].filter((mesh): mesh is THREE.Mesh => mesh instanceof THREE.Mesh)
  }
