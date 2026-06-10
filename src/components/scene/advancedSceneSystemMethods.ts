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

export function createAquascaping(this: any): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.aquascaping = new AquascapingSystem(this.scene, tankBounds, this.visualAssets, resolveTheme(this.scene))
  }

export function createAdvancedFishSystem(this: any): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.fishSystem = new DetailedFishSystem(this.scene, tankBounds, this.visualAssets, {
      layoutStyle: resolveTheme(this.scene).layoutStyle
    })
    if (this.pendingFishGroups) {
      this.fishSystem.setFishGroups(this.pendingFishGroups)
      this.pendingFishGroups = null
    }
  }

export function createAdvancedWaterEffects(this: any): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.particleSystem = new EnhancedParticleSystem(this.scene, tankBounds)
    this.particleSystem.setQuality(this.currentVisualQuality)
  }

export function setupAdvancedPostProcessing(this: any): void {
    if (!this.advancedEffectsEnabled) return
    
    // God rays effect
    this.godRaysEffect = new GodRaysEffect(
      this.renderer,
      this.scene,
      this.camera
    )
    const theme = resolveTheme(this.scene)
    this.godRaysEffect.applyTheme(theme)
    this.syncScreenSpaceHazePass(theme)
  }

export function renderSceneFrame(this: any, elapsedTime: number): void {
    if (
      this.performanceTuning?.postProcessingEnabled === false ||
      this.currentVisualQuality === 'simple'
    ) {
      this.renderer.render(this.scene, this.camera)
      return
    }

    // Render with or without post-processing
    if (this.godRaysEffect && this.advancedEffectsEnabled) {
      this.godRaysEffect.update(elapsedTime * this.motionScale)
      this.godRaysEffect.render()
    } else if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

export function shouldUpdateTankWaterMotion(this: any): boolean {
    const waterMotionFrame = (this.waterMotionFrame as number | undefined) ?? 0
    this.waterMotionFrame = waterMotionFrame + 1
    return shouldRunQualityCadencedUpdate({
      frame: waterMotionFrame,
      quality: this.currentVisualQuality
    })
  }

export function resolvePhotoModeTarget(this: any): THREE.Vector3 {
    this.tempPhotoModeTarget.copy(this.photoModeControlsTarget)

    if (this.photoModeFollowMode === 'mouse') {
      const dimensions = this.tankDimensions ?? AQUARIUM_TANK_DIMENSIONS
      this.tempPhotoModeTarget.x += this.photoModePointer.x * dimensions.width * 0.18
      this.tempPhotoModeTarget.y += this.photoModePointer.y * dimensions.height * 0.16
      this.tempPhotoModeTarget.z -= this.photoModePointer.y * dimensions.depth * 0.08
      return this.tempPhotoModeTarget
    }

    const heroFocusPoint = this.fishSystem?.getHeroFocusPoint?.()
    if (!heroFocusPoint) {
      return this.tempPhotoModeTarget
    }

    this.tempPhotoModeTarget.lerp(
      new THREE.Vector3(
        heroFocusPoint.x,
        heroFocusPoint.y + 0.18,
        heroFocusPoint.z - 0.45
      ),
      0.45
    )

    return this.tempPhotoModeTarget
  }

export function updateTankWaterMotion(this: any, elapsedTime: number): void {
    const surfacePhase = elapsedTime * 0.18
    const refractionPhase = elapsedTime * 0.24
    const refractedShearPhase = elapsedTime * 0.13

    if (this.waterSurfaceMesh) {
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.01
        material.map.offset.y = elapsedTime * 0.014
      }
      this.waterSurfaceMesh.rotation.z = Math.sin(surfacePhase) * 0.012
    }

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.012
        material.map.offset.y = elapsedTime * 0.018
      }
      this.waterSurfaceHighlightMesh.rotation.z = Math.sin(surfacePhase) * 0.012
    }

    if (this.frontGlassHighlightMesh) {
      const material = this.frontGlassHighlightMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.y = elapsedTime * 0.01
      }
      this.frontGlassHighlightMesh.position.y = 0.2 + Math.sin(elapsedTime * 0.2) * 0.06
    }

    this.glassEdgeHighlightMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.y = elapsedTime * (0.008 + (index * 0.001))
      }
      const baseY = (mesh.userData.baseY as number | undefined) ?? 0.12
      mesh.position.y = baseY + Math.sin((elapsedTime * 0.18) + (index * 0.7)) * 0.03
    })

    this.wallPanelMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * (0.003 + (index * 0.001))
        material.map.offset.y = elapsedTime * (0.006 + (index * 0.0015))
      }
    })

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.016
      }
      const baseY = (this.waterlineFrontMesh.userData.baseY as number | undefined) ?? 6.48
      this.waterlineFrontMesh.position.y = baseY + Math.sin(elapsedTime * 0.7) * 0.016
    }

    if (this.lightCanopyMesh) {
      const material = this.lightCanopyMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.006
        material.map.offset.y = elapsedTime * 0.004
      }
      const baseY = (this.lightCanopyMesh.userData.baseY as number | undefined) ?? 5.45
      const baseOpacity = (this.lightCanopyMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      this.lightCanopyMesh.position.y = baseY + Math.sin(elapsedTime * 0.22) * 0.06
      material.opacity = baseOpacity * (0.94 + Math.sin(elapsedTime * 0.34) * 0.06)
    }

    this.nearSurfaceLightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        const phase = (mesh.userData.phase as number | undefined) ?? 0
        const mapRepeatX = (mesh.userData.mapRepeatX as number | undefined) ?? 1.12
        const mapRepeatY = (mesh.userData.mapRepeatY as number | undefined) ?? 1.04
        const mapWarpX = (mesh.userData.mapWarpX as number | undefined) ?? 0.02
        const mapWarpY = (mesh.userData.mapWarpY as number | undefined) ?? 0.015
        const mapRotation = (mesh.userData.mapRotation as number | undefined) ?? 0.03
        material.map.offset.x = (
          elapsedTime * (((mesh.userData.scrollX as number | undefined) ?? 0.003)) +
          Math.sin(refractionPhase + phase) * mapWarpX
        )
        material.map.offset.y = (
          elapsedTime * (((mesh.userData.scrollY as number | undefined) ?? 0.009)) +
          Math.cos((surfacePhase * 1.22) + phase) * mapWarpY
        )
        material.map.repeat.set(
          mapRepeatX + Math.sin((refractedShearPhase * 1.18) + phase) * 0.05,
          mapRepeatY + Math.cos((refractionPhase * 1.1) + phase) * 0.04
        )
        material.map.center.set(0.5, 0.5)
        material.map.rotation = Math.sin((surfacePhase * 0.92) + phase) * mapRotation
      }
      const baseX = (mesh.userData.baseX as number | undefined) ?? mesh.position.x
      const baseY = (mesh.userData.baseY as number | undefined) ?? mesh.position.y
      const swayX = (mesh.userData.swayX as number | undefined) ?? 0.05
      const swayY = (mesh.userData.swayY as number | undefined) ?? 0.03
      const phase = (mesh.userData.phase as number | undefined) ?? 0
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      const opacityPulse = (mesh.userData.opacityPulse as number | undefined) ?? 0.05
      mesh.position.x = baseX + Math.sin((surfacePhase * 1.18) + phase) * swayX
      mesh.position.y = baseY + Math.sin((refractionPhase * 1.22) + phase) * swayY
      material.opacity = baseOpacity * (0.95 + Math.sin((surfacePhase * 1.34) + phase) * opacityPulse)
    })

    this.midwaterLightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        const phase = (mesh.userData.phase as number | undefined) ?? 0
        const mapRepeatX = (mesh.userData.mapRepeatX as number | undefined) ?? 1.08
        const mapRepeatY = (mesh.userData.mapRepeatY as number | undefined) ?? 1.04
        const mapWarpX = (mesh.userData.mapWarpX as number | undefined) ?? 0.014
        const mapWarpY = (mesh.userData.mapWarpY as number | undefined) ?? 0.012
        const mapRotation = (mesh.userData.mapRotation as number | undefined) ?? 0.02
        material.map.offset.x = (
          elapsedTime * (((mesh.userData.scrollX as number | undefined) ?? -0.0016)) +
          Math.sin((refractedShearPhase * 0.92) + phase) * mapWarpX
        )
        material.map.offset.y = (
          elapsedTime * (((mesh.userData.scrollY as number | undefined) ?? 0.0068)) +
          Math.cos((surfacePhase * 0.88) + phase) * mapWarpY
        )
        material.map.repeat.set(
          mapRepeatX + Math.sin((refractedShearPhase * 0.8) + phase) * 0.035,
          mapRepeatY + Math.cos((refractionPhase * 0.72) + phase) * 0.028
        )
        material.map.center.set(0.5, 0.5)
        material.map.rotation = Math.sin((surfacePhase * 0.68) + phase) * mapRotation
      }
      const baseX = (mesh.userData.baseX as number | undefined) ?? mesh.position.x
      const baseY = (mesh.userData.baseY as number | undefined) ?? mesh.position.y
      const baseZ = (mesh.userData.baseZ as number | undefined) ?? mesh.position.z
      const baseRotationZ = (mesh.userData.baseRotationZ as number | undefined) ?? mesh.rotation.z
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      const swayX = (mesh.userData.swayX as number | undefined) ?? 0.05
      const swayY = (mesh.userData.swayY as number | undefined) ?? 0.04
      const swayZ = (mesh.userData.swayZ as number | undefined) ?? 0.08
      const phase = (mesh.userData.phase as number | undefined) ?? 0
      const opacityPulse = (mesh.userData.opacityPulse as number | undefined) ?? 0.04
      mesh.position.x = baseX + Math.sin((surfacePhase * 0.72) + phase) * swayX
      mesh.position.y = baseY + Math.sin((refractionPhase * 0.82) + phase) * swayY
      mesh.position.z = baseZ + Math.sin((refractedShearPhase * 0.94) + phase) * swayZ
      mesh.rotation.z = baseRotationZ + Math.sin((surfacePhase * 0.86) + phase) * 0.02
      material.opacity = baseOpacity * (0.95 + Math.sin((refractionPhase * 0.98) + phase) * opacityPulse)
    })

    if (this.heroRimLightMesh) {
      const material = this.heroRimLightMesh.material as THREE.MeshBasicMaterial
      const baseX = (this.heroRimLightMesh.userData.baseX as number | undefined) ?? 1.86
      const baseOpacity = (this.heroRimLightMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      this.heroRimLightMesh.position.x = baseX + Math.sin((elapsedTime * 0.26) + 0.8) * 0.04
      material.opacity = baseOpacity * (0.92 + Math.sin((elapsedTime * 0.38) + 0.2) * 0.08)
    }

    if (this.heroGroundGlowMesh) {
      const material = this.heroGroundGlowMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.01
        material.map.offset.y = elapsedTime * 0.008
      }
      const baseOpacity = (this.heroGroundGlowMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      material.opacity = baseOpacity * (0.92 + Math.sin((elapsedTime * 0.4) + 0.6) * 0.08)
    }

    if (this.heroFrontFillMesh) {
      const material = this.heroFrontFillMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.003
        material.map.offset.y = elapsedTime * 0.006
      }
      const baseX = (this.heroFrontFillMesh.userData.baseX as number | undefined) ?? this.heroFrontFillMesh.position.x
      const baseY = (this.heroFrontFillMesh.userData.baseY as number | undefined) ?? this.heroFrontFillMesh.position.y
      const baseOpacity = (this.heroFrontFillMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      this.heroFrontFillMesh.position.x = baseX + Math.sin((elapsedTime * 0.21) + 0.4) * 0.03
      this.heroFrontFillMesh.position.y = baseY + Math.sin((elapsedTime * 0.26) + 1.1) * 0.02
      material.opacity = baseOpacity * (0.94 + Math.sin((elapsedTime * 0.34) + 1.2) * 0.05)
    }

    if (this.substrateDetailMesh) {
      const material = this.substrateDetailMesh.material as THREE.MeshStandardMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.002
        material.map.offset.y = elapsedTime * 0.004
      }
      if (material.alphaMap) {
        material.alphaMap.offset.x = elapsedTime * 0.0015
        material.alphaMap.offset.y = elapsedTime * 0.003
      }
      const baseOpacity = (this.substrateDetailMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      material.opacity = baseOpacity * (0.96 + Math.sin((elapsedTime * 0.32) + 0.4) * 0.04)
    }

    if (this.substrateFrontDetailMesh) {
      const material = this.substrateFrontDetailMesh.material as THREE.MeshStandardMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.0015
        material.map.offset.y = elapsedTime * 0.003
      }
      if (material.alphaMap) {
        material.alphaMap.offset.x = elapsedTime * 0.0012
        material.alphaMap.offset.y = elapsedTime * 0.0024
      }
      const baseOpacity = (this.substrateFrontDetailMesh.userData.baseOpacity as number | undefined) ?? material.opacity
      material.opacity = baseOpacity * (0.97 + Math.sin((elapsedTime * 0.28) + 1) * 0.03)
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        const phaseOffset = (mesh.userData.phaseOffset as number | undefined) ?? (index * 0.32)
        const mapRepeatX = (mesh.userData.mapRepeatX as number | undefined) ?? 1.24
        const mapRepeatY = (mesh.userData.mapRepeatY as number | undefined) ?? 1.08
        const mapWarpX = (mesh.userData.mapWarpX as number | undefined) ?? 0.015
        const mapWarpY = (mesh.userData.mapWarpY as number | undefined) ?? 0.011
        const mapRotation = (mesh.userData.mapRotation as number | undefined) ?? 0.012
        material.map.offset.x = (
          elapsedTime * (index === 0 ? 0.0038 : -0.0018) +
          Math.sin((surfacePhase * 0.94) + phaseOffset) * mapWarpX
        )
        material.map.offset.y = (
          elapsedTime * (index === 0 ? 0.0068 : 0.0042) +
          Math.cos((refractionPhase * 0.88) + phaseOffset) * mapWarpY
        )
        material.map.repeat.set(
          mapRepeatX + Math.sin((refractedShearPhase * 0.76) + phaseOffset) * 0.03,
          mapRepeatY + Math.cos((surfacePhase * 0.68) + phaseOffset) * 0.025
        )
        material.map.center.set(0.5, 0.5)
        material.map.rotation = Math.sin((surfacePhase * 0.62) + phaseOffset) * mapRotation
      }
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      const phaseOffset = (mesh.userData.phaseOffset as number | undefined) ?? (index * 0.32)
      material.opacity = baseOpacity * (0.97 + Math.sin((refractionPhase * 0.96) + phaseOffset) * 0.035)
    })

    this.hardscapeOcclusionMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const occlusionLayer = (mesh.userData.occlusionLayer as 'floor' | 'backwall' | 'shaft' | undefined) ?? 'floor'
      if (material.map) {
        material.map.offset.x = elapsedTime * (
          occlusionLayer === 'backwall'
            ? 0.0008
            : occlusionLayer === 'shaft'
              ? 0.0007
              : 0.0004
        )
        material.map.offset.y = elapsedTime * (
          occlusionLayer === 'backwall'
            ? 0.0012
            : occlusionLayer === 'shaft'
              ? 0.001
              : 0.0006
        )
      }
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      const pulse = occlusionLayer === 'shaft' ? 0.03 : 0.02
      material.opacity = baseOpacity * (0.98 + Math.sin((elapsedTime * 0.18) + (index * 0.6)) * pulse)
    })
  }

export function syncFishVisibleStat(this: any): void {
    if (!this.fishSystem) {
      this.stats.fishVisible = 0
      return
    }
    this.stats.fishVisible = this.fishSystem.getVisibleFishCount()
  }

export function syncGodRaysDepthRenderStats(this: any): void {
    const depthStats = this.godRaysEffect?.getDepthRenderStats()
    this.stats.godRaysDepthRenderCount = depthStats?.count ?? 0
    this.stats.godRaysDepthRenderLastMs = depthStats?.lastMs ?? 0
    this.stats.godRaysDepthRenderAverageMs = depthStats?.averageMs ?? 0
  }

export function syncUpdateTimingStats(this: any): void {
    this.stats.fishUpdateCount = this.fishUpdateStats.count
    this.stats.fishUpdateLastMs = this.fishUpdateStats.lastMs
    this.stats.fishUpdateAverageMs = this.fishUpdateStats.averageMs
    this.stats.waterMotionUpdateCount = this.waterMotionUpdateStats.count
    this.stats.waterMotionUpdateLastMs = this.waterMotionUpdateStats.lastMs
    this.stats.waterMotionUpdateAverageMs = this.waterMotionUpdateStats.averageMs
  }
