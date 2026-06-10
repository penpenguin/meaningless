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

export function resolveRendererPixelRatio(this: any): number {
    const pixelRatioCap = this.currentVisualQuality === 'simple' ? 1 : 2
    return Math.min(window.devicePixelRatio * this.adaptiveRenderScale, pixelRatioCap)
  }

export function syncAdaptiveRenderScale(this: any, frameTimeMs: number): void {
    if (this.currentVisualQuality !== 'standard') return

    if (frameTimeMs >= 28) {
      this.stressedFrameSamples++
      this.stableFrameSamples = 0
    } else if (frameTimeMs <= 20) {
      this.stableFrameSamples++
      this.stressedFrameSamples = 0
    } else {
      this.stressedFrameSamples = 0
      this.stableFrameSamples = 0
    }

    const nextScale = resolveAdaptiveRenderScale({
      currentScale: this.adaptiveRenderScale,
      averageFrameTimeMs: frameTimeMs,
      stressedSampleCount: this.stressedFrameSamples,
      stableSampleCount: this.stableFrameSamples
    })
    if (nextScale === this.adaptiveRenderScale) return

    this.adaptiveRenderScale = nextScale
    this.stressedFrameSamples = 0
    this.stableFrameSamples = 0
    this.renderer.setPixelRatio(this.resolveRendererPixelRatio())
  }

export function updatePerformanceStats(this: any, startTime: number): void {
    this.stats.frameTime = performance.now() - startTime
    this.syncAdaptiveRenderScale(this.stats.frameTime)
    Object.assign(this.stats, readRendererDebugStats(this.renderer.info))
    this.syncUpdateTimingStats()
    this.syncGodRaysDepthRenderStats()
    
    this.fpsCounter++
    if (performance.now() - this.lastStatsUpdate > 1000) {
      this.stats.fps = this.fpsCounter
      this.fpsCounter = 0
      this.lastStatsUpdate = performance.now()
    }
  }

export function start(this: any): void {
    this.animate()
  }

export function stop(this: any): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

export function setMotionEnabled(this: any, enabled: boolean): void {
    this.motionEnabled = enabled
    if (this.fishSystem) {
      this.fishSystem.setMotionEnabled(enabled)
    }
    if (this.particleSystem) {
      this.particleSystem.setEnabled(enabled)
    }
    if (this.aquascaping) {
      this.aquascaping.setMotionEnabled(enabled)
    }
  }

export function setPhotoMode(this: any, options: PhotoModeOptions): void {
    this.photoModeEnabled = options.enabled
    this.photoModeFollowMode = options.followMode
    this.motionScale = options.enabled ? 0.72 : 1
    this.controls.autoRotate = options.enabled && options.followMode === 'fish'
    this.controls.autoRotateSpeed = options.enabled ? 0.45 : 1
  }

export function setAdvancedEffects(this: any, enabled: boolean): void {
    this.advancedEffectsEnabled = enabled
  }

export function getPerformanceStats(this: any): PerformanceStats {
    return { ...this.stats }
  }

export function getPerformanceTier(this: any, fps: number): 'high' | 'medium' | 'low' {
    if (fps <= this.performanceThresholds.low) return 'low'
    if (fps <= this.performanceThresholds.medium) return 'medium'
    return 'high'
  }

export function enableAutoRotate(this: any, enabled: boolean): void {
    this.controls.autoRotate = enabled
  }

export function setVisualQuality(this: any, quality: QualityLevel): void {
    this.currentVisualQuality = quality
    this.syncRendererPipelineForQuality(quality)
    const { width, height } = this.getViewportSize()
    this.adaptiveRenderScale = 1
    this.stressedFrameSamples = 0
    this.stableFrameSamples = 0
    this.waterMotionFrame = 0
    this.renderer.setPixelRatio(this.resolveRendererPixelRatio())
    this.renderer.setSize(width, height)

    if (this.composer) {
      this.composer.setSize(width, height)
    }

    if (this.godRaysEffect) {
      this.godRaysEffect.resize(width, height)
    }

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = quality === 'simple'
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap
    this.applyShadowQuality(quality)

    if (this.fishSystem) {
      this.fishSystem.setQuality(quality)
    }

    if (this.particleSystem) {
      this.particleSystem.setQuality(quality)
    }

    this.applyVisualQuality(quality)
  }

export function applyTheme(this: any, theme: Theme): void {
    applyThemeToScene(this.scene, theme)
    this.applyTankTheme(theme)
    if (this.godRaysEffect) {
      this.godRaysEffect.applyTheme(theme)
    }
    this.syncScreenSpaceHazePass(theme)
    this.applyVisualQuality(this.currentVisualQuality)
  }

export function applyFishGroups(this: any, groups: FishGroup[]): boolean {
    if (!this.fishSystem) {
      this.pendingFishGroups = groups
      return false
    }
    this.fishSystem.setFishGroups(groups)
    return true
  }

export function setupEventListeners(this: any): void {
    window.addEventListener('resize', this.handleResize)
    this.container.addEventListener('pointermove', this.handlePhotoModePointerMove)
  }

export function getViewportSize(this: any): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width || this.container.clientWidth || window.innerWidth))
    const height = Math.max(1, Math.floor(rect.height || this.container.clientHeight || window.innerHeight))
    return { width, height }
  }
