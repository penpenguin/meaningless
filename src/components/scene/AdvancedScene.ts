import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DetailedFishSystem } from '../fish/DetailedFish'
import type { FishGroup, Theme } from '../../types/aquarium'
import type { EnhancedParticleSystem } from '../effects/EnhancedParticles'
import { EnvironmentLoader } from './Environment'
import type { AquascapingSystem } from '../aquascape/Aquascaping'
import type { GodRaysEffect } from '../effects/GodRays'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { defaultTheme } from '../../utils/storage/stateSchema'
import { applyAssetLoadTimings, createEmptySpanTimingStats, createEmptyPerformanceStats, measurePerformanceSpan, type PerformanceStats, type SpanTimingStats } from '../../utils/performance/performanceStats'
import { DEFAULT_PERFORMANCE_TUNING, type PerformanceTuningOptions } from '../../utils/performance/performanceTuning'
import { AQUARIUM_TANK_DIMENSIONS, resolveDefaultCameraPosition, resolveDefaultControlsTarget, resolvePhotoModeCameraPosition, resolvePhotoModeControlsTarget } from '../../utils/layout/aquariumLayout'
import type { VisualAssetBundle } from '../../assets/visualAssets'
import type { QualityLevel } from '../../types/settings'
import { applyThemeToScene } from './advancedSceneTheme'
export { applyGradientBackground, applyThemeToScene } from './advancedSceneTheme'
import {
  refreshCameraFraming,
  setupCamera,
  setupRenderer,
  setupComposer,
  setupControls,
  init,
  setupAdvancedLighting,
  resolveToneMappingExposure,
  applyLightingQuality,
  setupGradientBackground,
  getTankDimensions,
  createAdvancedTank,
  getVisualTexture,
  createFeatherMaskTexture
} from './advancedSceneSetupMethods'
import { createBackHorizonFogTexture, createBackdropTexture, createWallPanelTexture, createDepthLayers, createHeroLightingLayers, syncScreenSpaceHazePass, createUnderwaterLightingBands, createHardscapeOcclusionLayers } from './advancedSceneBackdropMethods'
import { createDepthMidgroundTexture, createForegroundShadowTexture, createSubstrate, ensureTankVisualLayers } from './advancedSceneSubstrateMethods'
import { createGlassShell, createInteriorWallPanels, createWaterVolume, createWaterSurface } from './advancedSceneShellMethods'
import { createWaterSurfaceTexture, createNearSurfaceLightTexture, createMidwaterLightTexture, createHeroLightCanopyTexture, createHeroGroundGlowTexture, createHeroFrontFillTexture, createHeroRimLightTexture, createWaterSurfaceHighlightTexture } from './advancedSceneLightTextureMethods'
import { createCausticsLayers, createCausticsTexture, createHardscapeOcclusionTexture } from './advancedSceneCausticMethods'
import { applyTankTheme, createSandTexture } from './advancedSceneThemeMethods'
import { createSubstrateDetailTexture, createSubstrateDetailAlphaTexture, createSubstrateHorizonFadeTexture, createSandNormalTexture, createSandRoughnessTexture, createSandAoTexture } from './advancedSceneSandTextureMethods'
import { createAquascaping, createAdvancedFishSystem, createAdvancedWaterEffects, setupAdvancedPostProcessing, renderSceneFrame, shouldUpdateTankWaterMotion, resolvePhotoModeTarget, updateTankWaterMotion, syncFishVisibleStat, syncGodRaysDepthRenderStats, syncUpdateTimingStats } from './advancedSceneSystemMethods'
import { resolveRendererPixelRatio, syncAdaptiveRenderScale, updatePerformanceStats, start, stop, setMotionEnabled, setPhotoMode, setAdvancedEffects, getPerformanceStats, getPerformanceTier, enableAutoRotate, setVisualQuality, applyTheme, applyFishGroups, setupEventListeners, getViewportSize } from './advancedScenePublicMethods'
import { applyShadowQuality, syncRendererPipelineForQuality, applyVisualQuality, disposeRendererPipeline, dispose } from './advancedSceneQualityMethods'

type PhotoModeFollowMode = 'fish' | 'mouse'

type PhotoModeOptions = {
  enabled: boolean
  followMode: PhotoModeFollowMode
}
export class AdvancedAquariumScene {
  declare public refreshCameraFraming: (aspect: number) => void
  declare public setupCamera: () => void
  declare public setupRenderer: (container: HTMLElement) => void
  declare public setupComposer: () => void
  declare public setupControls: () => void
  declare public init: () => Promise<void>
  declare public resolvePhotoModeTarget: () => THREE.Vector3
  declare public syncFishVisibleStat: () => void
  declare public shouldUpdateTankWaterMotion: () => boolean
  declare public updateTankWaterMotion: (elapsedTime: number) => void
  declare public renderSceneFrame: (elapsedTime: number) => void
  declare public updatePerformanceStats: (startTime: number) => void
  declare public getViewportSize: () => { width: number; height: number }
  declare public applyTheme: (theme: Theme) => void
  declare public applyFishGroups: (groups: FishGroup[]) => boolean
  declare public setMotionEnabled: (enabled: boolean) => void
  declare public setPhotoMode: (options: PhotoModeOptions) => void
  declare public setAdvancedEffects: (enabled: boolean) => void
  declare public setVisualQuality: (quality: QualityLevel) => void
  declare public getPerformanceStats: () => PerformanceStats
  declare public start: () => void
  declare public stop: () => void
  declare public dispose: () => void

  public container: HTMLElement
  public scene: THREE.Scene
  public camera!: THREE.PerspectiveCamera
  public renderer!: THREE.WebGLRenderer
  public composer!: EffectComposer
  public controls!: OrbitControls
  public clock: THREE.Clock
  public tank: THREE.Group
  
  // Advanced components
  public fishSystem: DetailedFishSystem | null = null
  public pendingFishGroups: FishGroup[] | null = null
  public particleSystem: EnhancedParticleSystem | null = null
  public aquascaping: AquascapingSystem | null = null
  public godRaysEffect: GodRaysEffect | null = null
  public screenSpaceHazePass: ShaderPass | null = null
  public environmentLoader: EnvironmentLoader
  public glassPanes: THREE.Mesh[] = []
  public waterVolumeMesh: THREE.Mesh | null = null
  public waterSurfaceMesh: THREE.Mesh | null = null
  public frontGlassHighlightMesh: THREE.Mesh | null = null
  public waterSurfaceHighlightMesh: THREE.Mesh | null = null
  public glassEdgeHighlightMeshes: THREE.Mesh[] = []
  public wallPanelMeshes: THREE.Mesh[] = []
  public waterlineFrontMesh: THREE.Mesh | null = null
  public depthMidgroundMesh: THREE.Mesh | null = null
  public foregroundShadowMesh: THREE.Mesh | null = null
  public lightCanopyMesh: THREE.Mesh | null = null
  public nearSurfaceLightMeshes: THREE.Mesh[] = []
  public midwaterLightMeshes: THREE.Mesh[] = []
  public heroRimLightMesh: THREE.Mesh | null = null
  public heroGroundGlowMesh: THREE.Mesh | null = null
  public heroFrontFillMesh: THREE.Mesh | null = null
  public substrateDetailMesh: THREE.Mesh | null = null
  public substrateFrontDetailMesh: THREE.Mesh | null = null
  public causticsMeshes: THREE.Mesh[] = []
  public hardscapeOcclusionMeshes: THREE.Mesh[] = []
  public currentVisualQuality: QualityLevel
  public primaryShadowLight: THREE.DirectionalLight | null = null
  public hemiLight: THREE.HemisphereLight | null = null
  public fillLight: THREE.DirectionalLight | null = null
  public bounceLight: THREE.PointLight | null = null
  public rimLight: THREE.DirectionalLight | null = null
  public currentRendererAntialias = false
  
  public animationId: number | null = null
  public motionEnabled = true
  public photoModeEnabled = false
  public photoModeFollowMode: PhotoModeFollowMode = 'fish'
  public readonly photoModePointer = new THREE.Vector2()
  public motionScale = 1
  public advancedEffectsEnabled = true
  public readonly performanceTuning: PerformanceTuningOptions
  public readonly tankDimensions = AQUARIUM_TANK_DIMENSIONS
  public defaultCameraPosition = resolveDefaultCameraPosition(this.tankDimensions)
  public photoModeCameraPosition = resolvePhotoModeCameraPosition(this.tankDimensions)
  public defaultControlsTarget = resolveDefaultControlsTarget(this.tankDimensions)
  public photoModeControlsTarget = resolvePhotoModeControlsTarget(this.tankDimensions)
  public readonly tempPhotoModeTarget = new THREE.Vector3()
  public readonly visualAssets?: VisualAssetBundle
  
  // Performance monitoring
  public stats: PerformanceStats = createEmptyPerformanceStats()
  public fishUpdateStats: SpanTimingStats = createEmptySpanTimingStats()
  public waterMotionUpdateStats: SpanTimingStats = createEmptySpanTimingStats()
  public fpsCounter = 0
  public lastStatsUpdate = 0
  public adaptiveRenderScale = 1
  public stressedFrameSamples = 0
  public stableFrameSamples = 0
  public waterMotionFrame = 0
  public readonly performanceThresholds = {
    medium: 50,
    low: 30
  }
  
  constructor(
    container: HTMLElement,
    visualAssets?: VisualAssetBundle,
    initialTheme: Theme = defaultTheme,
    performanceTuning: PerformanceTuningOptions = DEFAULT_PERFORMANCE_TUNING
  ) {
    this.container = container
    this.visualAssets = visualAssets
    this.performanceTuning = performanceTuning
    applyAssetLoadTimings(this.stats, visualAssets?.loadTimings)
    this.currentVisualQuality = 'standard'
    this.scene = new THREE.Scene()
    applyThemeToScene(this.scene, initialTheme)
    this.clock = new THREE.Clock()

    this.setupCamera()
    this.setupRenderer(container)
    this.setupComposer()
    this.setupControls()
    
    this.tank = new THREE.Group()
    this.scene.add(this.tank)
    
    this.environmentLoader = new EnvironmentLoader(this.scene, {
      renderer: this.renderer,
      visualAssets: this.visualAssets
    })
    
    this.init()
  }
  public animate = (): void => {
    const startTime = performance.now()
    
    this.animationId = requestAnimationFrame(this.animate)
    
    const deltaTime = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()
    
    // Reset render info
    this.renderer.info.reset()
    
    const desiredCameraPosition = this.photoModeEnabled
      ? this.photoModeCameraPosition
      : this.defaultCameraPosition
    const desiredCameraTarget = this.photoModeEnabled
      ? this.resolvePhotoModeTarget()
      : this.defaultControlsTarget
    const frameLerp = this.photoModeEnabled ? 0.06 : 0.1
    this.camera.position.lerp(desiredCameraPosition, frameLerp)
    this.controls.target.lerp(desiredCameraTarget, frameLerp)
    this.controls.update()
    
    if (this.motionEnabled) {
      if (this.fishSystem) {
        measurePerformanceSpan(
          this.fishUpdateStats,
          {
            name: 'aquarium:fish:update',
            startMark: 'aquarium:fish:update:start',
            endMark: 'aquarium:fish:update:end'
          },
          () => {
            this.fishSystem?.update(deltaTime * this.motionScale, elapsedTime * this.motionScale)
          }
        )
      }
      this.syncFishVisibleStat()
      
      if (this.particleSystem) {
        this.particleSystem.update(elapsedTime * this.motionScale)
      }

      if (this.shouldUpdateTankWaterMotion()) {
        measurePerformanceSpan(
          this.waterMotionUpdateStats,
          {
            name: 'aquarium:water-motion:update',
            startMark: 'aquarium:water-motion:update:start',
            endMark: 'aquarium:water-motion:update:end'
          },
          () => {
            this.updateTankWaterMotion(elapsedTime * this.motionScale)
          }
        )
      }
      
      if (this.aquascaping) {
        this.aquascaping.update(elapsedTime * this.motionScale)
      }

    }

    this.renderSceneFrame(elapsedTime)

    // Update performance stats
    this.updatePerformanceStats(startTime)
  }

  public handlePhotoModePointerMove = (event: PointerEvent): void => {
    const rect = this.container.getBoundingClientRect()
    const width = rect.width || this.container.clientWidth || window.innerWidth
    const height = rect.height || this.container.clientHeight || window.innerHeight
    if (width <= 0 || height <= 0) return

    const x = ((event.clientX - rect.left) / width) * 2 - 1
    const y = -(((event.clientY - rect.top) / height) * 2 - 1)
    this.photoModePointer.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1)
    )
  }

  public handleResize = (): void => {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.refreshCameraFraming(aspect)
    this.camera.aspect = aspect
    const desiredCameraPosition = this.photoModeEnabled
      ? this.photoModeCameraPosition
      : this.defaultCameraPosition
    const desiredCameraTarget = this.photoModeEnabled
      ? this.resolvePhotoModeTarget()
      : this.defaultControlsTarget
    this.camera.position.copy(desiredCameraPosition)
    this.camera.lookAt(desiredCameraTarget)
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(desiredCameraTarget)
    this.controls.update()
    this.renderer.setSize(width, height)
    
    if (this.composer) {
      this.composer.setSize(width, height)
    }

    if (this.screenSpaceHazePass) {
      this.screenSpaceHazePass.uniforms.aspect.value = aspect
    }
    
    if (this.godRaysEffect) {
      this.godRaysEffect.resize(width, height)
    }
  }

}

Object.assign(AdvancedAquariumScene.prototype, {
  refreshCameraFraming,
  setupCamera,
  setupRenderer,
  setupComposer,
  setupControls,
  init,
  setupAdvancedLighting,
  resolveToneMappingExposure,
  applyLightingQuality,
  setupGradientBackground,
  getTankDimensions,
  createAdvancedTank,
  getVisualTexture,
  createFeatherMaskTexture,
  createBackHorizonFogTexture,
  createBackdropTexture,
  createWallPanelTexture,
  createDepthLayers,
  createHeroLightingLayers,
  syncScreenSpaceHazePass,
  createUnderwaterLightingBands,
  createHardscapeOcclusionLayers,
  createDepthMidgroundTexture,
  createForegroundShadowTexture,
  createSubstrate,
  ensureTankVisualLayers,
  createGlassShell,
  createInteriorWallPanels,
  createWaterVolume,
  createWaterSurface,
  createWaterSurfaceTexture,
  createNearSurfaceLightTexture,
  createMidwaterLightTexture,
  createHeroLightCanopyTexture,
  createHeroGroundGlowTexture,
  createHeroFrontFillTexture,
  createHeroRimLightTexture,
  createWaterSurfaceHighlightTexture,
  createCausticsLayers,
  createCausticsTexture,
  createHardscapeOcclusionTexture,
  applyTankTheme,
  createSandTexture,
  createSubstrateDetailTexture,
  createSubstrateDetailAlphaTexture,
  createSubstrateHorizonFadeTexture,
  createSandNormalTexture,
  createSandRoughnessTexture,
  createSandAoTexture,
  createAquascaping,
  createAdvancedFishSystem,
  createAdvancedWaterEffects,
  setupAdvancedPostProcessing,
  renderSceneFrame,
  shouldUpdateTankWaterMotion,
  resolvePhotoModeTarget,
  updateTankWaterMotion,
  syncFishVisibleStat,
  syncGodRaysDepthRenderStats,
  syncUpdateTimingStats,
  resolveRendererPixelRatio,
  syncAdaptiveRenderScale,
  updatePerformanceStats,
  start,
  stop,
  setMotionEnabled,
  setPhotoMode,
  setAdvancedEffects,
  getPerformanceStats,
  getPerformanceTier,
  enableAutoRotate,
  setVisualQuality,
  applyTheme,
  applyFishGroups,
  setupEventListeners,
  getViewportSize,
  applyShadowQuality,
  syncRendererPipelineForQuality,
  applyVisualQuality,
  disposeRendererPipeline,
  dispose
})
