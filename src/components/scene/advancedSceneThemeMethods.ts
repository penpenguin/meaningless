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

export function applyTankTheme(this: any, theme: Theme): void {
    this.ensureTankVisualLayers()
    const premiumTheme = resolvePremiumThemeValues(theme)
    const useOpenWaterPresentation = usesOpenWaterPresentation(theme)
    const freshwaterTint = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#68715b'), 0.7)
    const glassTint = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#d2d5c7'), 0.68)
    const daylightTint = freshwaterTint.clone().lerp(new THREE.Color('#efe6d0'), 0.56)
    const depthTint = freshwaterTint.clone().lerp(new THREE.Color('#3d3f2f'), 0.9)
    const shadowTint = freshwaterTint.clone().lerp(new THREE.Color('#3a342b'), 0.84)

    this.glassPanes.forEach((pane, index) => {
      const material = pane.material as THREE.MeshPhysicalMaterial
      pane.visible = useOpenWaterPresentation ? index === 0 : true
      material.color = glassTint.clone()
      material.attenuationColor = glassTint.clone().lerp(new THREE.Color('#f2f3ea'), 0.12)
      material.opacity = useOpenWaterPresentation
        ? (index === 0 ? 0.018 : 0)
        : (index === 0 ? 0.12 : 0.085)
      material.envMapIntensity = useOpenWaterPresentation
        ? 0.08 + (premiumTheme.glassReflectionStrength * 0.18)
        : 0.6 + (premiumTheme.glassReflectionStrength * 0.92)
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.color = freshwaterTint.clone()
      material.attenuationColor = freshwaterTint.clone().lerp(new THREE.Color('#d2d8cb'), 0.32)
      material.opacity = useOpenWaterPresentation
        ? 0.003 + (premiumTheme.glassReflectionStrength * 0.004)
        : 0.032 + (premiumTheme.glassReflectionStrength * 0.024)
      material.envMapIntensity = useOpenWaterPresentation
        ? 0.06 + (premiumTheme.glassReflectionStrength * 0.08)
        : 0.12 + (premiumTheme.glassReflectionStrength * 0.28)
      material.needsUpdate = true
    }

    if (this.waterSurfaceMesh) {
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      material.color = glassTint.clone().lerp(freshwaterTint, 0.3)
      material.attenuationColor = glassTint.clone().lerp(new THREE.Color('#ebece1'), 0.1)
      material.opacity = 0.12 + (premiumTheme.surfaceGlowStrength * 0.08)
      material.emissive = daylightTint.clone()
      material.emissiveIntensity = premiumTheme.surfaceGlowStrength * 0.08
      material.envMapIntensity = 0.56 + (premiumTheme.glassReflectionStrength * 0.6)
      material.needsUpdate = true
    }

    if (this.frontGlassHighlightMesh) {
      const material = this.frontGlassHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.006 + (premiumTheme.glassReflectionStrength * 0.012)
        : 0.05 + (premiumTheme.glassReflectionStrength * 0.12)
      this.frontGlassHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = glassTint.clone().lerp(new THREE.Color('#d7ddcf'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.glassEdgeHighlightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0
        : 0.035 + (premiumTheme.glassReflectionStrength * 0.09)
      mesh.visible = !useOpenWaterPresentation
      mesh.userData.baseOpacity = baseOpacity
      material.color = glassTint.clone().lerp(new THREE.Color('#d9dece'), 0.36)
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.wallPanelMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (index === 0 ? 0.078 : 0.056)
        + (premiumTheme.causticsStrength * 0.062)
        + (premiumTheme.glassReflectionStrength * 0.026)
      mesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color('#b8bfab'), index === 0 ? 0.18 : 0.13)
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0
        : 0.082 + (premiumTheme.surfaceGlowStrength * 0.115)
      this.waterSurfaceHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color('#e3dbc2'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0
        : 0.058 + (premiumTheme.surfaceGlowStrength * 0.08)
      this.waterlineFrontMesh.userData.baseOpacity = baseOpacity
      material.color = daylightTint.clone().lerp(new THREE.Color('#ddd4bc'), 0.32)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.depthMidgroundMesh) {
      const material = this.depthMidgroundMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.032 + (premiumTheme.glassReflectionStrength * 0.018)
        : 0.134 + (premiumTheme.surfaceGlowStrength * 0.092)
      this.depthMidgroundMesh.userData.baseOpacity = baseOpacity
      material.color = depthTint.clone().lerp(new THREE.Color('#504f3d'), 0.06)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.foregroundShadowMesh) {
      const material = this.foregroundShadowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.002 + (premiumTheme.glassReflectionStrength * 0.004)
        : 0.038 + (premiumTheme.glassReflectionStrength * 0.046)
      this.foregroundShadowMesh.userData.baseOpacity = baseOpacity
      material.color = shadowTint.clone().lerp(new THREE.Color('#4a4136'), 0.08)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }


    if (this.lightCanopyMesh) {
      const material = this.lightCanopyMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.114 + (premiumTheme.surfaceGlowStrength * 0.118) + (premiumTheme.glassReflectionStrength * 0.02)
      this.lightCanopyMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color('#e3ddc7'), 0.48)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.nearSurfaceLightMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (0.08 + (premiumTheme.surfaceGlowStrength * 0.074) + (premiumTheme.causticsStrength * 0.016))
        * (index === 2 ? 0.98 : index === 0 || index === 4 ? 0.82 : 0.9)
      mesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(
        new THREE.Color(index === 2 ? '#dfdcc8' : '#d0cebf'),
          0.32
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.midwaterLightMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (
        0.042 +
        (premiumTheme.surfaceGlowStrength * 0.032) +
        (premiumTheme.causticsStrength * 0.014)
      ) * (index === 0 ? 1 : 1.14)
      mesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(
        new THREE.Color(index === 0 ? '#d2d1c0' : '#dad7c5'),
        index === 0 ? 0.28 : 0.3
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    if (this.heroGroundGlowMesh) {
      const material = this.heroGroundGlowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.004 + (premiumTheme.causticsStrength * 0.008)
        : 0.041 + (premiumTheme.causticsStrength * 0.09)
      this.heroGroundGlowMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color(useOpenWaterPresentation ? '#b7a284' : '#c7b896'), useOpenWaterPresentation ? 0.18 : 0.22)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.heroFrontFillMesh) {
      const material = this.heroFrontFillMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.014 - (premiumTheme.causticsStrength * 0.004) - (premiumTheme.surfaceGlowStrength * 0.003)
        : 0.089 - (premiumTheme.causticsStrength * 0.012) - (premiumTheme.surfaceGlowStrength * 0.004)
      this.heroFrontFillMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color(useOpenWaterPresentation ? '#baa387' : '#cabba0'), useOpenWaterPresentation ? 0.12 : 0.16)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateDetailMesh) {
      const material = this.substrateDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.12 + (premiumTheme.causticsStrength * 0.015)
        : 0.29 + (premiumTheme.causticsStrength * 0.08)
      this.substrateDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(useOpenWaterPresentation ? '#644b38' : '#9f7c5d').lerp(freshwaterTint, useOpenWaterPresentation ? 0.014 : 0.03)
      material.emissive = freshwaterTint.clone().lerp(new THREE.Color(useOpenWaterPresentation ? '#9d8766' : '#ccb993'), useOpenWaterPresentation ? 0.024 : 0.08)
      material.emissiveIntensity = useOpenWaterPresentation
        ? 0.006 + (premiumTheme.causticsStrength * 0.01)
        : 0.024 + (premiumTheme.causticsStrength * 0.04)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateFrontDetailMesh) {
      const material = this.substrateFrontDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = useOpenWaterPresentation
        ? 0.13 + (premiumTheme.causticsStrength * 0.015)
        : 0.31 + (premiumTheme.causticsStrength * 0.08)
      this.substrateFrontDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(useOpenWaterPresentation ? '#563e2f' : '#936e4f').lerp(freshwaterTint, useOpenWaterPresentation ? 0.012 : 0.02)
      material.emissive = freshwaterTint.clone().lerp(new THREE.Color(useOpenWaterPresentation ? '#957f61' : '#c8b18b'), useOpenWaterPresentation ? 0.022 : 0.06)
      material.emissiveIntensity = useOpenWaterPresentation
        ? 0.006 + (premiumTheme.causticsStrength * 0.01)
        : 0.02 + (premiumTheme.causticsStrength * 0.035)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = premiumTheme.causticsStrength * (
        useOpenWaterPresentation
          ? (index === 0 ? 0.012 : 0.008)
          : (index === 0 ? 0.085 : 0.058)
      )
      mesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(
        new THREE.Color(
          useOpenWaterPresentation
            ? (index === 0 ? '#b3ab93' : '#a2a78f')
            : (index === 0 ? '#c9c7b3' : '#bec1ab')
        ),
        useOpenWaterPresentation
          ? (index === 0 ? 0.1 : 0.085)
          : (index === 0 ? 0.18 : 0.16)
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.hardscapeOcclusionMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const occlusionLayer = (mesh.userData.occlusionLayer as 'floor' | 'backwall' | 'shaft' | undefined) ?? 'floor'
      const occlusionStrength = (mesh.userData.occlusionStrength as number | undefined) ?? 1
      const baseOpacity = (
        occlusionLayer === 'backwall'
          ? 0.052 + (premiumTheme.glassReflectionStrength * 0.036)
          : occlusionLayer === 'shaft'
            ? 0.06 + (premiumTheme.glassReflectionStrength * 0.044)
            : 0.07 + (premiumTheme.glassReflectionStrength * 0.036)
      ) * occlusionStrength
      mesh.userData.baseOpacity = baseOpacity
      material.color = shadowTint.clone()
      material.opacity = baseOpacity
      material.needsUpdate = true
    })
  }

export function createSandTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    baseGradient.addColorStop(0, '#e1cfb1')
    baseGradient.addColorStop(0.42, '#d0b694')
    baseGradient.addColorStop(1, '#b39472')
    ctx.fillStyle = baseGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.22
    for (let i = 0; i < 18; i++) {
      const startY = canvas.height * (0.08 + (i * 0.05))
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(244, 226, 193, 0.34)' : 'rgba(110, 83, 52, 0.16)'
      ctx.lineWidth = 8 + (i % 3)
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.22,
        startY + 10 + Math.sin(i) * 14,
        canvas.width * 0.72,
        startY - 8 + Math.cos(i * 1.7) * 16,
        canvas.width + 24,
        startY + 14
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    
    for (let i = 0; i < 2800; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 2.4 + 0.6
      
      const hue = 26 + Math.random() * 14
      const saturation = 16 + Math.random() * 14
      const brightness = 0.6 + Math.random() * 0.18
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness * 100}%)`
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    for (let i = 0; i < 360; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 5 + 1.8
      
      const hue = 22 + Math.random() * 18
      const saturation = 8 + Math.random() * 16
      const brightness = 0.38 + Math.random() * 0.22
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness * 100}%)`
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.18
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const width = 18 + Math.random() * 42
      const height = 8 + Math.random() * 16
      ctx.fillStyle = i % 2 === 0 ? 'rgba(88, 68, 46, 0.34)' : 'rgba(255, 241, 214, 0.24)'
      ctx.beginPath()
      ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const edgeShade = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.18,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.62
    )
    edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    edgeShade.addColorStop(1, 'rgba(45, 31, 20, 0.24)')
    ctx.fillStyle = edgeShade
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    
    return texture
  }
