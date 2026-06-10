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

export function refreshCameraFraming(this: any, aspect: number): void {
    const dimensions = this.getTankDimensions()
    this.defaultControlsTarget.copy(resolveDefaultControlsTarget(dimensions))
    this.photoModeControlsTarget.copy(resolvePhotoModeControlsTarget(dimensions))
    this.defaultCameraPosition.copy(
      resolveDefaultCameraPosition(
        dimensions,
        AQUARIUM_CAMERA_FRAMING.standardFov,
        aspect
      )
    )
    this.photoModeCameraPosition.copy(
      resolvePhotoModeCameraPosition(
        dimensions,
        AQUARIUM_CAMERA_FRAMING.standardFov,
        aspect
      )
    )
  }

export function setupCamera(this: any): void {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.refreshCameraFraming(aspect)
    this.camera = new THREE.PerspectiveCamera(
      AQUARIUM_CAMERA_FRAMING.standardFov,
      aspect,
      0.1,
      1000
    )
    this.camera.position.copy(this.defaultCameraPosition)
    this.camera.lookAt(this.defaultControlsTarget)
  }

export function setupRenderer(this: any, container: HTMLElement): void {
    const { width, height } = this.getViewportSize()
    const antialias = this.currentVisualQuality === 'standard'
    this.renderer = new THREE.WebGLRenderer({ 
      antialias,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(this.resolveRendererPixelRatio())
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = this.resolveToneMappingExposure(this.currentVisualQuality)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = this.currentVisualQuality === 'simple'
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.currentRendererAntialias = antialias
    
    // Performance optimizations
    this.renderer.info.autoReset = false
    container.appendChild(this.renderer.domElement)
  }

export function setupComposer(this: any): void {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    const screenSpaceHazePass = new ShaderPass(ScreenSpaceWaterHazeShader)
    const size = new THREE.Vector2()
    this.renderer.getSize(size)
    screenSpaceHazePass.uniforms.aspect.value = size.y > 0 ? size.x / size.y : 16 / 9
    screenSpaceHazePass.enabled = false
    this.screenSpaceHazePass = screenSpaceHazePass
    this.composer.addPass(screenSpaceHazePass)
    this.composer.addPass(new OutputPass())
  }

export function setupControls(this: any): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false
    this.controls.enableRotate = false
    this.controls.enableZoom = false
    this.controls.enablePan = false
    this.controls.autoRotate = false
    this.controls.target.copy(this.defaultControlsTarget)
    this.controls.update()
  }

export async function init(this: any): Promise<void> {
    await this.environmentLoader.loadHDRI()
    this.setupAdvancedLighting()
    this.setupGradientBackground()
    this.createAdvancedTank()
    this.createAquascaping()
    this.createAdvancedFishSystem()
    this.createAdvancedWaterEffects()
    this.setupAdvancedPostProcessing()
    this.setupEventListeners()
  }

export function setupAdvancedLighting(this: any): void {
    const dimensions = this.getTankDimensions()
    const controlsTarget = resolveDefaultControlsTarget(dimensions)
    const shadowTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.sun)
    const fillTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.fill)
    const rimTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.rim)
    const ambientLight = new THREE.AmbientLight(0xe3dfd0, 0.52)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xf2ecdb, 0x4a4938, 1.15)
    this.hemiLight = hemiLight
    this.scene.add(hemiLight)

    const sunLight = new THREE.DirectionalLight(0xfff0dc, 2.14)
    sunLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.sun))
    sunLight.castShadow = true
    sunLight.shadow.camera.near = PRIMARY_SHADOW_CAMERA_RANGE.near
    sunLight.shadow.camera.far = PRIMARY_SHADOW_CAMERA_RANGE.far
    sunLight.shadow.camera.left = dimensions.width * PRIMARY_SHADOW_FRUSTUM_RATIOS.left
    sunLight.shadow.camera.right = dimensions.width * PRIMARY_SHADOW_FRUSTUM_RATIOS.right
    sunLight.shadow.camera.top = dimensions.height * PRIMARY_SHADOW_FRUSTUM_RATIOS.top
    sunLight.shadow.camera.bottom = dimensions.height * PRIMARY_SHADOW_FRUSTUM_RATIOS.bottom
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.bias = -0.00018
    sunLight.shadow.normalBias = 0.018
    sunLight.target.position.copy(shadowTarget)
    this.primaryShadowLight = sunLight
    this.applyShadowQuality(this.currentVisualQuality)
    this.scene.add(sunLight)
    this.scene.add(sunLight.target)

    const fillLight = new THREE.DirectionalLight(0xd8d4c3, 0.52)
    fillLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.fill))
    fillLight.target.position.copy(fillTarget)
    this.fillLight = fillLight
    this.scene.add(fillLight)
    this.scene.add(fillLight.target)

    const bounceLight = new THREE.PointLight(0x9c8d6d, 0.43, 24)
    bounceLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.bounce))
    this.bounceLight = bounceLight
    this.scene.add(bounceLight)

    const rimLight = new THREE.DirectionalLight(0xd7d2c1, 0.068)
    rimLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.rim))
    rimLight.target.position.copy(rimTarget)
    this.rimLight = rimLight
    this.scene.add(rimLight)
    this.scene.add(rimLight.target)

    this.applyLightingQuality(this.currentVisualQuality)
  }

export function resolveToneMappingExposure(this: any, quality: QualityLevel): number {
    return (quality ?? 'standard') === 'standard' ? 1.4 : 1.29
  }

export function applyLightingQuality(this: any, quality: QualityLevel): void {
    const isStandard = (quality ?? 'standard') === 'standard'

    if (this.renderer) {
      this.renderer.toneMappingExposure = this.resolveToneMappingExposure(quality)
    }

    if (this.primaryShadowLight) {
      this.primaryShadowLight.intensity = isStandard ? 2.14 : 1.96
    }

    if (this.hemiLight) {
      this.hemiLight.intensity = isStandard ? 1.15 : 0.98
    }

    if (this.fillLight) {
      this.fillLight.intensity = isStandard ? 0.52 : 0.43
    }

    if (this.bounceLight) {
      this.bounceLight.intensity = isStandard ? 0.43 : 0.31
    }

    if (this.rimLight) {
      this.rimLight.intensity = isStandard ? 0.068 : 0.056
    }
  }

export function setupGradientBackground(this: any): void {
    applyGradientBackground(this.scene)
  }

export function getTankDimensions(this: any): AquariumTankDimensions {
    return this.tankDimensions ?? AQUARIUM_TANK_DIMENSIONS
  }

export function createAdvancedTank(this: any): void {
    const dimensions = this.getTankDimensions()
    const { width: tankWidth, height: tankHeight } = dimensions

    this.ensureTankVisualLayers()
    this.createGlassShell(dimensions)
    this.createInteriorWallPanels(dimensions)

    const backdropGeometry = new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.74)
    const backdropMaterial = new THREE.MeshBasicMaterial({
      map: this.createBackdropTexture(),
      alphaMap: this.createFeatherMaskTexture('backdrop'),
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
    const backdropMesh = new THREE.Mesh(backdropGeometry, backdropMaterial)
    backdropMesh.name = 'tank-backdrop'
    backdropMesh.position.copy(
      resolveTankRelativePosition(dimensions, AQUARIUM_DEPTH_LAYER_ANCHORS.backdrop)
    )
    this.tank.add(backdropMesh)

    const backdropOverlayTexture = this.visualAssets?.textures['backdrop-depth'] ?? null
    if (backdropOverlayTexture) {
      const backdropOverlayMaterial = new THREE.MeshBasicMaterial({
        map: backdropOverlayTexture,
        alphaMap: this.createFeatherMaskTexture('overlay'),
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
      const backdropOverlayMesh = new THREE.Mesh(backdropGeometry.clone(), backdropOverlayMaterial)
      backdropOverlayMesh.name = 'tank-backdrop-overlay'
      backdropOverlayMesh.position.copy(
        resolveTankRelativePosition(dimensions, AQUARIUM_DEPTH_LAYER_ANCHORS.backdropOverlay)
      )
      this.tank.add(backdropOverlayMesh)
    }

    this.createDepthLayers(dimensions)
    this.createSubstrate(dimensions)
    this.createHeroLightingLayers(dimensions)
    this.createUnderwaterLightingBands(dimensions)
    this.createWaterVolume(dimensions)
    this.createWaterSurface(dimensions)
    this.createCausticsLayers(dimensions)
    this.createHardscapeOcclusionLayers(dimensions)
    const initialTheme = this.scene instanceof THREE.Scene ? resolveTheme(this.scene) : defaultTheme
    this.applyTankTheme(initialTheme)
    this.applyVisualQuality(this.currentVisualQuality ?? 'standard')
  }

export function getVisualTexture(this: any, id: string): THREE.Texture | null {
    return this.visualAssets?.textures[id] ?? null
  }

export function createFeatherMaskTexture(this: any, layer: 'backdrop' | 'overlay' | 'midground' | 'foreground'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.fillRect !== 'function'
    ) {
      return texture
    }

    const config = layer === 'backdrop'
      ? {
          pools: [
            { x: 0.48, y: 0.48, radius: 0.44, alpha: 0.98 },
            { x: 0.28, y: 0.36, radius: 0.22, alpha: 0.5 },
            { x: 0.74, y: 0.34, radius: 0.24, alpha: 0.44 },
            { x: 0.58, y: 0.72, radius: 0.28, alpha: 0.38 }
          ],
          edgeFade: { top: 0.18, bottom: 0.16, left: 0.14, right: 0.16 },
          diagonalFade: 0.62
        }
      : layer === 'overlay'
        ? {
            pools: [
              { x: 0.5, y: 0.46, radius: 0.38, alpha: 0.92 },
              { x: 0.32, y: 0.3, radius: 0.18, alpha: 0.44 },
              { x: 0.68, y: 0.28, radius: 0.2, alpha: 0.38 },
              { x: 0.54, y: 0.72, radius: 0.22, alpha: 0.3 }
            ],
            edgeFade: { top: 0.21, bottom: 0.18, left: 0.18, right: 0.2 },
            diagonalFade: 0.56
          }
        : layer === 'midground'
          ? {
              pools: [
                { x: 0.52, y: 0.52, radius: 0.34, alpha: 0.96 },
                { x: 0.28, y: 0.44, radius: 0.2, alpha: 0.52 },
                { x: 0.7, y: 0.36, radius: 0.16, alpha: 0.46 },
                { x: 0.62, y: 0.7, radius: 0.22, alpha: 0.36 }
              ],
              edgeFade: { top: 0.24, bottom: 0.22, left: 0.2, right: 0.24 },
              diagonalFade: 0.48
            }
          : {
              pools: [
                { x: 0.46, y: 0.22, radius: 0.32, alpha: 0.88 },
                { x: 0.24, y: 0.26, radius: 0.18, alpha: 0.42 },
                { x: 0.76, y: 0.28, radius: 0.18, alpha: 0.4 },
                { x: 0.54, y: 0.48, radius: 0.18, alpha: 0.24 }
              ],
              edgeFade: { top: 0.16, bottom: 0.34, left: 0.18, right: 0.18 },
              diagonalFade: 0.42
            }

    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    config.pools.forEach((pool) => {
      const radius = canvas.width * pool.radius
      const centerX = canvas.width * pool.x
      const centerY = canvas.height * pool.y
      const gradient = ctx.createRadialGradient(
        centerX - (radius * 0.16),
        centerY - (radius * 0.12),
        radius * 0.12,
        centerX,
        centerY,
        radius
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${pool.alpha})`)
      gradient.addColorStop(0.56, `rgba(255, 255, 255, ${pool.alpha * 0.78})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
    })

    ctx.globalCompositeOperation = 'destination-in'

    const verticalFade = ctx.createLinearGradient(0, 0, 0, canvas.height)
    verticalFade.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalFade.addColorStop(config.edgeFade.top, 'rgba(255, 255, 255, 0.7)')
    verticalFade.addColorStop(0.52, 'rgba(255, 255, 255, 0.98)')
    verticalFade.addColorStop(1 - config.edgeFade.bottom, 'rgba(255, 255, 255, 0.76)')
    verticalFade.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalFade
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const horizontalFade = ctx.createLinearGradient(0, 0, canvas.width, 0)
    horizontalFade.addColorStop(0, 'rgba(255, 255, 255, 0)')
    horizontalFade.addColorStop(config.edgeFade.left, 'rgba(255, 255, 255, 0.74)')
    horizontalFade.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
    horizontalFade.addColorStop(1 - config.edgeFade.right, 'rgba(255, 255, 255, 0.72)')
    horizontalFade.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = horizontalFade
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const diagonalFade = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    diagonalFade.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    diagonalFade.addColorStop(config.diagonalFade, 'rgba(255, 255, 255, 0.98)')
    diagonalFade.addColorStop(1, 'rgba(255, 255, 255, 0.42)')
    ctx.fillStyle = diagonalFade
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'source-over'
    texture.needsUpdate = true
    return texture
  }
