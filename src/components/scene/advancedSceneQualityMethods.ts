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

export function applyShadowQuality(this: any, quality: QualityLevel): void {
    if (!this.primaryShadowLight) return
    const shadowMapSize = this.performanceTuning?.shadowMapSize ?? (quality === 'simple' ? 1024 : 2048)
    this.primaryShadowLight.shadow.mapSize.width = shadowMapSize
    this.primaryShadowLight.shadow.mapSize.height = shadowMapSize
  }

export function syncRendererPipelineForQuality(this: any, quality: QualityLevel): void {
    const nextAntialias = quality === 'standard'
    if (this.currentRendererAntialias === nextAntialias) return
    if (!this.renderer || !this.controls || !this.composer) return

    const previousDomElement = this.renderer.domElement
    const previousTarget = this.controls.target.clone()
    const previousAutoRotate = this.controls.autoRotate
    const previousAutoRotateSpeed = this.controls.autoRotateSpeed

    this.disposeRendererPipeline(previousDomElement)

    this.setupRenderer(this.container)
    this.setupComposer()
    this.setupControls()
    this.controls.target.copy(previousTarget)
    this.controls.autoRotate = previousAutoRotate
    this.controls.autoRotateSpeed = previousAutoRotateSpeed
    this.controls.update()
    this.setupAdvancedPostProcessing()
  }

export function applyVisualQuality(this: any, quality: QualityLevel): void {
    const resolvedQuality = quality ?? 'standard'
    const isStandard = resolvedQuality === 'standard'
    const theme = this.scene instanceof THREE.Scene ? resolveTheme(this.scene) : defaultTheme
    const useOpenWaterPresentation = usesOpenWaterPresentation(theme)
    this.ensureTankVisualLayers()
    this.applyLightingQuality(resolvedQuality)
    this.syncScreenSpaceHazePass(theme, resolvedQuality)

    this.glassPanes.forEach((pane, index) => {
      pane.visible = useOpenWaterPresentation ? index === 0 : isStandard || index === 0
      const material = pane.material as THREE.MeshPhysicalMaterial
      material.thickness = useOpenWaterPresentation ? 0.24 : (isStandard ? 0.42 : 0.34)
      material.attenuationDistance = useOpenWaterPresentation ? 2.4 : (isStandard ? 1.2 : 1.6)
      material.envMapIntensity = useOpenWaterPresentation ? 0.05 : (isStandard ? 1.32 : 0.98)
      material.opacity = useOpenWaterPresentation
        ? (index === 0 ? 0.018 : 0)
        : index === 0
          ? isStandard ? 0.17 : 0.13
          : isStandard ? 0.1 : 0.06
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      this.waterVolumeMesh.visible = true
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.thickness = useOpenWaterPresentation ? 1.2 : (isStandard ? 4.6 : 3.9)
      material.attenuationDistance = useOpenWaterPresentation ? 8.4 : (isStandard ? 2.2 : 2.65)
      material.envMapIntensity = useOpenWaterPresentation ? 0.02 : (isStandard ? 0.54 : 0.34)
      material.opacity = useOpenWaterPresentation ? 0.004 : (isStandard ? 0.12 : 0.09)
      material.needsUpdate = true
    }

    if (this.waterSurfaceMesh) {
      this.waterSurfaceMesh.visible = true
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      material.thickness = isStandard ? 1.24 : 0.94
      material.attenuationDistance = isStandard ? 1.3 : 1.7
      material.envMapIntensity = isStandard ? 1.46 : 1.04
      material.opacity = isStandard ? 0.27 : 0.22
      material.needsUpdate = true
    }

    if (this.frontGlassHighlightMesh) {
      const material = this.frontGlassHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.frontGlassHighlightMesh.userData.baseOpacity as number | undefined) ?? 0.16
      this.frontGlassHighlightMesh.visible = true
      material.opacity = useOpenWaterPresentation
        ? Math.min(baseOpacity, 0.012)
        : isStandard ? baseOpacity : baseOpacity * 0.58
      material.needsUpdate = true
    }

    this.glassEdgeHighlightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 0.13
      mesh.visible = !useOpenWaterPresentation
      material.opacity = useOpenWaterPresentation ? 0 : isStandard ? baseOpacity : baseOpacity * 0.56
      material.needsUpdate = true
    })

    this.wallPanelMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? (index === 0 ? 0.2 : 0.12)
      mesh.visible = isStandard || index === 0
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.54
      material.needsUpdate = true
    })

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.waterSurfaceHighlightMesh.userData.baseOpacity as number | undefined) ?? 0.2
      this.waterSurfaceHighlightMesh.visible = useOpenWaterPresentation ? false : isStandard
      material.opacity = useOpenWaterPresentation ? 0 : isStandard ? baseOpacity * 1.05 : 0
      material.needsUpdate = true
    }

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.waterlineFrontMesh.userData.baseOpacity as number | undefined) ?? 0.18
      this.waterlineFrontMesh.visible = useOpenWaterPresentation ? false : isStandard
      material.opacity = useOpenWaterPresentation ? 0 : isStandard ? baseOpacity : 0
      material.needsUpdate = true
    }

    if (this.depthMidgroundMesh) {
      const material = this.depthMidgroundMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.depthMidgroundMesh.userData.baseOpacity as number | undefined) ?? 0.28
      this.depthMidgroundMesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.68
      material.needsUpdate = true
    }

    if (this.foregroundShadowMesh) {
      const material = this.foregroundShadowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.foregroundShadowMesh.userData.baseOpacity as number | undefined) ?? 0.22
      this.foregroundShadowMesh.visible = useOpenWaterPresentation ? true : isStandard
      material.opacity = useOpenWaterPresentation ? Math.min(baseOpacity, 0.004) : isStandard ? baseOpacity : 0
      material.needsUpdate = true
    }

    if (this.lightCanopyMesh) {
      const material = this.lightCanopyMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.lightCanopyMesh.userData.baseOpacity as number | undefined) ?? 0.18
      this.lightCanopyMesh.visible = true
      material.opacity = isStandard ? baseOpacity * 1.04 : baseOpacity * 0.42
      material.needsUpdate = true
    }

    this.nearSurfaceLightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 0.16
      mesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.62
      material.needsUpdate = true
    })

    this.midwaterLightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 0.14
      mesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.56
      material.needsUpdate = true
    })

    if (this.heroRimLightMesh) {
      const material = this.heroRimLightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.heroRimLightMesh.userData.baseOpacity as number | undefined) ?? 0.2
      this.heroRimLightMesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.4
      material.needsUpdate = true
    }

    if (this.heroGroundGlowMesh) {
      const material = this.heroGroundGlowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.heroGroundGlowMesh.userData.baseOpacity as number | undefined) ?? 0.16
      this.heroGroundGlowMesh.visible = true
      material.opacity = useOpenWaterPresentation
        ? (isStandard ? Math.min(baseOpacity, 0.014) : Math.min(baseOpacity * 0.35, 0.006))
        : isStandard ? baseOpacity * 0.94 : baseOpacity * 0.5
      material.needsUpdate = true
    }

    if (this.heroFrontFillMesh) {
      const material = this.heroFrontFillMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.heroFrontFillMesh.userData.baseOpacity as number | undefined) ?? 0.08
      this.heroFrontFillMesh.visible = true
      material.opacity = useOpenWaterPresentation
        ? (isStandard ? Math.min(baseOpacity, 0.018) : Math.min(baseOpacity * 0.35, 0.007))
        : isStandard ? baseOpacity : baseOpacity * 0.56
      material.needsUpdate = true
    }

    if (this.substrateDetailMesh) {
      const material = this.substrateDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = (this.substrateDetailMesh.userData.baseOpacity as number | undefined) ?? 0.58
      this.substrateDetailMesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.52
      material.needsUpdate = true
    }

    if (this.substrateFrontDetailMesh) {
      const material = this.substrateFrontDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = (this.substrateFrontDetailMesh.userData.baseOpacity as number | undefined) ?? 0.62
      this.substrateFrontDetailMesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.56
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? (index === 0 ? 0.14 : 0.1)
      mesh.visible = true
      material.opacity = useOpenWaterPresentation
        ? (isStandard
            ? Math.min(baseOpacity, index === 0 ? 0.008 : 0.006)
            : Math.min(baseOpacity * (index === 0 ? 0.42 : 0.36), index === 0 ? 0.004 : 0.003))
        : isStandard
          ? baseOpacity
          : baseOpacity * (index === 0 ? 0.82 : 0.74)
      material.needsUpdate = true
    })

    this.hardscapeOcclusionMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 0.14
      mesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.92
      material.needsUpdate = true
    })
  }

export function disposeRendererPipeline(this: any, rendererElement = this.renderer.domElement): void {
    this.godRaysEffect?.dispose()
    this.godRaysEffect = null
    this.composer.dispose()
    this.controls.dispose()
    this.renderer.dispose()

    if (rendererElement?.parentElement) {
      rendererElement.parentElement.removeChild(rendererElement)
    }
  }

export function dispose(this: any): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    this.container?.removeEventListener('pointermove', this.handlePhotoModePointerMove)

    disposeSceneResources(this.scene)
    this.disposeRendererPipeline()
  }
