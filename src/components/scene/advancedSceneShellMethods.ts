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

export function createGlassShell(this: any, dimensions: AquariumTankDimensions): void {
    void dimensions
    this.glassPanes = []
    this.glassEdgeHighlightMeshes = []
    this.frontGlassHighlightMesh = null
  }

export function createInteriorWallPanels(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const theme = this.scene instanceof THREE.Scene ? resolveTheme(this.scene) : defaultTheme

    if (usesOpenWaterPresentation(theme)) {
      this.wallPanelMeshes = []
      return
    }

    const halfWidth = tankWidth / 2
    const halfDepth = tankDepth / 2
    const createWallMaterial = (opacity: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({
      map: this.createWallPanelTexture(),
      color: new THREE.Color('#dbe4db'),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    const backPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.82),
      createWallMaterial(0.2)
    )
    backPanel.name = 'tank-wall-back-panel'
    backPanel.position.set(0, -0.18, -halfDepth + 0.18)
    backPanel.renderOrder = 2
    backPanel.userData.baseOpacity = 0.2
    this.tank.add(backPanel)

    const leftPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(tankDepth * 0.86, tankHeight * 0.72),
      createWallMaterial(0.12)
    )
    leftPanel.name = 'tank-wall-left-panel'
    leftPanel.rotation.y = Math.PI / 2
    leftPanel.position.set(-halfWidth + 0.14, -0.28, 0.08)
    leftPanel.renderOrder = 2
    leftPanel.userData.baseOpacity = 0.12
    this.tank.add(leftPanel)

    const rightPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(tankDepth * 0.86, tankHeight * 0.72),
      createWallMaterial(0.12)
    )
    rightPanel.name = 'tank-wall-right-panel'
    rightPanel.rotation.y = -Math.PI / 2
    rightPanel.position.set(halfWidth - 0.14, -0.28, -0.08)
    rightPanel.renderOrder = 2
    rightPanel.userData.baseOpacity = 0.12
    this.tank.add(rightPanel)

    this.wallPanelMeshes = [backPanel, leftPanel, rightPanel]
  }

export function createWaterVolume(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const theme = this.scene instanceof THREE.Scene ? resolveTheme(this.scene) : defaultTheme

    if (usesOpenWaterPresentation(theme)) {
      const waterVolume = new THREE.Mesh(
        new THREE.PlaneGeometry(tankWidth * 1.38, tankHeight * 1.02),
        new THREE.MeshPhysicalMaterial({
          alphaMap: this.createFeatherMaskTexture('midground'),
          color: new THREE.Color('#3f554b'),
          transmission: 0.36,
          transparent: true,
          opacity: 0.024,
          roughness: 0.28,
          metalness: 0,
          thickness: 1.2,
          ior: 1.335,
          attenuationColor: new THREE.Color('#aebdab'),
          attenuationDistance: 8.4,
          specularIntensity: 0.18,
          envMapIntensity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      )
      waterVolume.name = 'tank-water-volume'
      waterVolume.position.set(0, -0.14, -tankDepth * 0.04)
      this.waterVolumeMesh = waterVolume
      this.tank.add(waterVolume)
      return
    }

    const waterVolume = new THREE.Mesh(
      new THREE.BoxGeometry(tankWidth - 0.24, tankHeight - 0.72, tankDepth - 0.24),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#506356'),
        transmission: 0.7,
        transparent: true,
        opacity: 0.045,
        roughness: 0.14,
        metalness: 0,
        thickness: 2.8,
        ior: 1.335,
        attenuationColor: new THREE.Color('#c9d1c4'),
        attenuationDistance: 6.8,
        specularIntensity: 0.34,
        envMapIntensity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    waterVolume.name = 'tank-water-volume'
    waterVolume.position.set(0, -0.18, 0)
    this.waterVolumeMesh = waterVolume
    this.tank.add(waterVolume)
  }

export function createWaterSurface(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const surfaceTexture = this.createWaterSurfaceTexture()
    const surfaceGeometry = new THREE.PlaneGeometry(tankWidth - 0.32, tankDepth - 0.32, 48, 36)
    surfaceGeometry.rotateX(-Math.PI / 2)

    const positions = surfaceGeometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      positions[i + 1] = (Math.sin(x * 0.8) * Math.cos(z * 0.65) * 0.06) + (Math.sin((x + z) * 1.15) * 0.025)
    }
    surfaceGeometry.attributes.position.needsUpdate = true
    surfaceGeometry.computeVertexNormals()

    const surfaceMaterial = new THREE.MeshPhysicalMaterial({
      map: surfaceTexture,
      color: new THREE.Color('#dcdfd1'),
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0,
      transmission: 0.82,
      thickness: 1.18,
      ior: 1.335,
      attenuationColor: new THREE.Color('#c5c8b8'),
      attenuationDistance: 1.5,
      specularIntensity: 0.84,
      specularColor: new THREE.Color('#ffffff'),
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.16,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    surfaceMaterial.emissive = new THREE.Color('#d1d3c1')
    surfaceMaterial.emissiveIntensity = 0.05

    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial)
    surfaceMesh.name = 'tank-water-surface'
    surfaceMesh.position.y = tankHeight / 2 - 0.42
    surfaceMesh.renderOrder = 3
    this.waterSurfaceMesh = surfaceMesh
    this.tank.add(surfaceMesh)

    const surfaceHighlight = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth - 0.56, tankDepth - 0.56),
      new THREE.MeshBasicMaterial({
        map: this.createWaterSurfaceHighlightTexture(),
        color: new THREE.Color('#dddccb'),
        transparent: true,
        opacity: 0.126,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    surfaceHighlight.name = 'tank-water-surface-highlight'
    surfaceHighlight.rotation.x = -Math.PI / 2
    surfaceHighlight.position.y = tankHeight / 2 - 0.39
    surfaceHighlight.renderOrder = 4
    surfaceHighlight.userData.baseOpacity = 0.126
    this.waterSurfaceHighlightMesh = surfaceHighlight
    this.tank.add(surfaceHighlight)

    const waterlineTexture = this.createWaterSurfaceHighlightTexture()
    waterlineTexture.repeat.set(1.1, 0.62)
    const waterlineFront = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth - 0.84, 0.58),
      new THREE.MeshBasicMaterial({
        map: waterlineTexture,
        color: new THREE.Color('#ddd9c8'),
        transparent: true,
        opacity: 0.086,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    waterlineFront.name = 'tank-waterline-front'
    waterlineFront.position.set(0, tankHeight / 2 - 0.48, tankDepth / 2 - 0.14)
    waterlineFront.renderOrder = 5
    waterlineFront.userData.baseOpacity = 0.086
    waterlineFront.userData.baseY = tankHeight / 2 - 0.48
    this.waterlineFrontMesh = waterlineFront
    this.tank.add(waterlineFront)
  }
