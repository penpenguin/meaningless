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

export function createDepthMidgroundTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.fill !== 'function' ||
      typeof ctx.fillRect !== 'function'
    ) {
      return texture
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, 'rgba(226, 233, 223, 0)')
    gradient.addColorStop(0.24, 'rgba(162, 180, 165, 0.12)')
    gradient.addColorStop(0.58, 'rgba(88, 108, 97, 0.2)')
    gradient.addColorStop(1, 'rgba(24, 35, 32, 0.42)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const hazeColumns = [
      { x: 0.24, y: 0.34, radius: 104, alpha: 0.12 },
      { x: 0.58, y: 0.2, radius: 112, alpha: 0.16 },
      { x: 0.74, y: 0.42, radius: 122, alpha: 0.1 }
    ]

    ctx.globalCompositeOperation = 'screen'
    hazeColumns.forEach((column) => {
      const centerX = canvas.width * column.x
      const centerY = canvas.height * column.y
      const glow = ctx.createRadialGradient(
        centerX - 18,
        centerY - 24,
        10,
        centerX,
        centerY,
        column.radius
      )
      glow.addColorStop(0, `rgba(224, 234, 223, ${column.alpha})`)
      glow.addColorStop(0.6, `rgba(147, 170, 157, ${column.alpha * 0.48})`)
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(
        centerX - column.radius,
        centerY - column.radius,
        column.radius * 2,
        column.radius * 2
      )
    })

    const upperHaze = ctx.createRadialGradient(
      canvas.width * 0.56,
      canvas.height * 0.16,
      canvas.width * 0.04,
      canvas.width * 0.56,
      canvas.height * 0.16,
      canvas.width * 0.38
    )
    upperHaze.addColorStop(0, 'rgba(232, 236, 225, 0.18)')
    upperHaze.addColorStop(0.52, 'rgba(160, 172, 158, 0.08)')
    upperHaze.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = upperHaze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'rgba(24, 48, 40, 0.32)'
    for (const plant of [
      { x: 0.16, width: 0.11, height: 0.38, sway: -0.04 },
      { x: 0.39, width: 0.12, height: 0.48, sway: 0.03 },
      { x: 0.63, width: 0.14, height: 0.42, sway: -0.02 },
      { x: 0.82, width: 0.1, height: 0.34, sway: 0.04 }
    ]) {
      const baseX = canvas.width * plant.x
      const baseY = canvas.height
      const spread = canvas.width * plant.width
      const tipY = canvas.height * (1 - plant.height)
      ctx.beginPath()
      ctx.moveTo(baseX - spread, baseY)
      ctx.bezierCurveTo(
        baseX - spread * 0.7,
        canvas.height * 0.84,
        baseX + (canvas.width * plant.sway),
        canvas.height * 0.56,
        baseX,
        tipY
      )
      ctx.bezierCurveTo(
        baseX - (canvas.width * plant.sway),
        canvas.height * 0.6,
        baseX + spread * 0.72,
        canvas.height * 0.82,
        baseX + spread,
        baseY
      )
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'screen'
    const haze = ctx.createRadialGradient(
      canvas.width * 0.58,
      canvas.height * 0.28,
      canvas.width * 0.05,
      canvas.width * 0.58,
      canvas.height * 0.28,
      canvas.width * 0.4
    )
    haze.addColorStop(0, 'rgba(225, 233, 220, 0.14)')
    haze.addColorStop(0.55, 'rgba(148, 168, 155, 0.08)')
    haze.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const lowerBloom = ctx.createRadialGradient(
      canvas.width * 0.42,
      canvas.height * 0.68,
      canvas.width * 0.03,
      canvas.width * 0.42,
      canvas.height * 0.68,
      canvas.width * 0.34
    )
    lowerBloom.addColorStop(0, 'rgba(155, 180, 160, 0.1)')
    lowerBloom.addColorStop(0.62, 'rgba(98, 124, 111, 0.04)')
    lowerBloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = lowerBloom
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.18
    for (let i = 0; i < 48; i++) {
      const x = ((i * 67) % (canvas.width - 32)) + 16
      const y = ((i * 41) % (canvas.height * 0.66)) + (canvas.height * 0.08)
      const size = 1 + (i % 3)
      ctx.fillStyle = i % 3 === 0 ? 'rgba(223, 230, 220, 0.18)' : 'rgba(169, 184, 171, 0.14)'
      ctx.fillRect(x, y, size, size)
    }
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = 'destination-in'
    const verticalMask = ctx.createLinearGradient(0, 0, 0, canvas.height)
    verticalMask.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalMask.addColorStop(0.2, 'rgba(255, 255, 255, 0.74)')
    verticalMask.addColorStop(0.52, 'rgba(255, 255, 255, 0.96)')
    verticalMask.addColorStop(0.8, 'rgba(255, 255, 255, 0.72)')
    verticalMask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalMask
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const horizontalMask = ctx.createLinearGradient(0, 0, canvas.width, 0)
    horizontalMask.addColorStop(0, 'rgba(255, 255, 255, 0)')
    horizontalMask.addColorStop(0.18, 'rgba(255, 255, 255, 0.72)')
    horizontalMask.addColorStop(0.6, 'rgba(255, 255, 255, 0.98)')
    horizontalMask.addColorStop(0.82, 'rgba(255, 255, 255, 0.66)')
    horizontalMask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = horizontalMask
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createForegroundShadowTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.fillRect !== 'function'
    ) {
      return texture
    }

    const topShade = ctx.createLinearGradient(0, 0, 0, canvas.height)
    topShade.addColorStop(0, 'rgba(18, 30, 28, 0.12)')
    topShade.addColorStop(0.18, 'rgba(24, 38, 35, 0.06)')
    topShade.addColorStop(0.56, 'rgba(24, 38, 35, 0.02)')
    topShade.addColorStop(1, 'rgba(18, 30, 28, 0)')
    ctx.fillStyle = topShade
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const canopy = ctx.createRadialGradient(
      canvas.width * 0.28,
      canvas.height * 0.18,
      canvas.width * 0.04,
      canvas.width * 0.28,
      canvas.height * 0.18,
      canvas.width * 0.36
    )
    canopy.addColorStop(0, 'rgba(22, 37, 34, 0.1)')
    canopy.addColorStop(0.72, 'rgba(22, 37, 34, 0.04)')
    canopy.addColorStop(1, 'rgba(22, 37, 34, 0)')
    ctx.fillStyle = canopy
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const rightShadow = ctx.createRadialGradient(
      canvas.width * 0.82,
      canvas.height * 0.28,
      canvas.width * 0.06,
      canvas.width * 0.82,
      canvas.height * 0.28,
      canvas.width * 0.28
    )
    rightShadow.addColorStop(0, 'rgba(24, 40, 35, 0.08)')
    rightShadow.addColorStop(0.68, 'rgba(24, 40, 35, 0.03)')
    rightShadow.addColorStop(1, 'rgba(24, 40, 35, 0)')
    ctx.fillStyle = rightShadow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const leftShadow = ctx.createRadialGradient(
      canvas.width * 0.18,
      canvas.height * 0.3,
      canvas.width * 0.04,
      canvas.width * 0.18,
      canvas.height * 0.3,
      canvas.width * 0.22
    )
    leftShadow.addColorStop(0, 'rgba(27, 44, 39, 0.07)')
    leftShadow.addColorStop(0.7, 'rgba(27, 44, 39, 0.02)')
    leftShadow.addColorStop(1, 'rgba(27, 44, 39, 0)')
    ctx.fillStyle = leftShadow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const groundContact = ctx.createRadialGradient(
      canvas.width * 0.56,
      canvas.height * 0.78,
      canvas.width * 0.04,
      canvas.width * 0.56,
      canvas.height * 0.78,
      canvas.width * 0.34
    )
    groundContact.addColorStop(0, 'rgba(25, 40, 36, 0.1)')
    groundContact.addColorStop(0.58, 'rgba(25, 40, 36, 0.04)')
    groundContact.addColorStop(1, 'rgba(25, 40, 36, 0)')
    ctx.fillStyle = groundContact
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'destination-in'
    const verticalMask = ctx.createLinearGradient(0, 0, 0, canvas.height)
    verticalMask.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalMask.addColorStop(0.16, 'rgba(255, 255, 255, 0.82)')
    verticalMask.addColorStop(0.42, 'rgba(255, 255, 255, 0.72)')
    verticalMask.addColorStop(0.68, 'rgba(255, 255, 255, 0.3)')
    verticalMask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalMask
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const horizontalMask = ctx.createLinearGradient(0, 0, canvas.width, 0)
    horizontalMask.addColorStop(0, 'rgba(255, 255, 255, 0)')
    horizontalMask.addColorStop(0.18, 'rgba(255, 255, 255, 0.62)')
    horizontalMask.addColorStop(0.5, 'rgba(255, 255, 255, 0.94)')
    horizontalMask.addColorStop(0.82, 'rgba(255, 255, 255, 0.58)')
    horizontalMask.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = horizontalMask
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createSubstrate(this: any, dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const theme = this.scene instanceof THREE.Scene
      ? resolveTheme(this.scene)
      : defaultTheme
    const layoutStyle = theme.layoutStyle
    const layoutSeed = this.scene instanceof THREE.Scene
      ? resolveRuntimeLayoutSeed(this.scene, layoutStyle)
      : undefined
    const isNatureShowcase = layoutStyle === 'nature-showcase'
    const useOpenWaterPresentation = usesOpenWaterPresentation(theme)

    const baseHeight = 0.68
    const baseBottomY = -tankHeight / 2
    const substrateVisualWidth = tankWidth * SUBSTRATE_VISUAL_FOOTPRINT_SCALE.width
    const substrateVisualDepth = tankDepth * SUBSTRATE_VISUAL_FOOTPRINT_SCALE.depth
    const redistributeSubstrateCoordinate = (coordinate: number, visualSize: number): number => {
      const halfSize = visualSize / 2
      const normalized = THREE.MathUtils.clamp(coordinate / halfSize, -1, 1)
      return Math.sign(normalized) * halfSize * Math.pow(Math.abs(normalized), 2.65)
    }
    const sampleSubstrateSurfaceHeight = (x: number, z: number): number => (
      sampleSubstrateHeight(
        THREE.MathUtils.clamp(x, -tankWidth / 2, tankWidth / 2),
        THREE.MathUtils.clamp(z, -tankDepth / 2, tankDepth / 2),
        tankWidth,
        tankDepth,
        layoutStyle,
        layoutSeed
      )
    )
    const baseGeometry = useOpenWaterPresentation
      ? new THREE.PlaneGeometry(substrateVisualWidth, substrateVisualDepth)
      : new THREE.BoxGeometry(
        substrateVisualWidth + 0.6,
        baseHeight,
        substrateVisualDepth + 0.6
      )
    if (useOpenWaterPresentation) {
      baseGeometry.rotateX(-Math.PI / 2)
    }
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x97856D,
      roughness: 0.7,
      metalness: 0.05,
      transparent: useOpenWaterPresentation,
      opacity: useOpenWaterPresentation ? 0.012 : 1,
      depthWrite: !useOpenWaterPresentation
    })
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
    baseMesh.name = 'tank-substrate-base'
    baseMesh.position.y = useOpenWaterPresentation
      ? baseBottomY + baseHeight - 0.035
      : baseBottomY + (baseHeight / 2)
    baseMesh.receiveShadow = true
    this.tank.add(baseMesh)

    const sandGeometry = new THREE.PlaneGeometry(
      substrateVisualWidth,
      substrateVisualDepth,
      SUBSTRATE_GEOMETRY_SEGMENTS.topWidth,
      SUBSTRATE_GEOMETRY_SEGMENTS.topDepth
    )
    sandGeometry.rotateX(-Math.PI / 2)

    const positions = sandGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < positions.length; i += 3) {
      const x = redistributeSubstrateCoordinate(positions[i], substrateVisualWidth)
      const z = redistributeSubstrateCoordinate(positions[i + 2], substrateVisualDepth)

      positions[i] = x
      positions[i + 1] = sampleSubstrateSurfaceHeight(x, z)
      positions[i + 2] = z
    }

    sandGeometry.attributes.position.needsUpdate = true
    sandGeometry.computeVertexNormals()

    const uv = sandGeometry.getAttribute('uv')
    if (uv && !sandGeometry.getAttribute('uv2')) {
      sandGeometry.setAttribute('uv2', uv.clone())
    }

    const authoredSandTexture = this.getVisualTexture('substrate-sand-albedo')
    const authoredSandNormalTexture = this.getVisualTexture('substrate-sand-normal')
    const authoredSandRoughnessTexture = this.getVisualTexture('substrate-sand-roughness')
    const authoredSandAoTexture = this.getVisualTexture('substrate-sand-ao')
    const sandTexture = authoredSandTexture ?? this.createSandTexture()
    const sandNormalTexture = authoredSandNormalTexture ?? this.createSandNormalTexture()
    const sandRoughnessTexture = authoredSandRoughnessTexture ?? this.createSandRoughnessTexture()
    const sandAoTexture = authoredSandAoTexture ?? this.createSandAoTexture()
    const usingAuthoredSandAlbedo = authoredSandTexture instanceof THREE.Texture
    sandTexture.repeat.set(
      Math.max(2.4, substrateVisualWidth / 2.6),
      Math.max(2, substrateVisualDepth / 2.3)
    )
    sandNormalTexture.repeat.copy(sandTexture.repeat)
    sandRoughnessTexture.repeat.copy(sandTexture.repeat)
    sandAoTexture?.repeat.copy(sandTexture.repeat)

    const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1
    sandTexture.anisotropy = maxAnisotropy
    sandNormalTexture.anisotropy = maxAnisotropy
    sandRoughnessTexture.anisotropy = maxAnisotropy
    if (sandAoTexture) {
      sandAoTexture.anisotropy = maxAnisotropy
    }
    
    const sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTexture,
      normalMap: sandNormalTexture,
      normalScale: usingAuthoredSandAlbedo ? new THREE.Vector2(0.48, 0.48) : new THREE.Vector2(0.42, 0.42),
      roughnessMap: sandRoughnessTexture,
      aoMap: sandAoTexture,
      aoMapIntensity: sandAoTexture ? 0.94 : 1,
      color: useOpenWaterPresentation
        ? (isNatureShowcase ? 0x6d5943 : 0x806a50)
        : (isNatureShowcase
            ? (usingAuthoredSandAlbedo ? 0xC1AD92 : 0x9A846C)
            : (usingAuthoredSandAlbedo ? 0xD7C4AD : 0xB7A288)),
      roughness: usingAuthoredSandAlbedo ? 0.88 : 0.92,
      metalness: 0,
      transparent: false,
      side: THREE.DoubleSide
    })
    
    const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial)
    sandMesh.name = 'tank-substrate-top'
    sandMesh.position.y = baseBottomY + baseHeight + 0.02
    sandMesh.receiveShadow = true
    sandMesh.castShadow = false
    this.tank.add(sandMesh)

    if (useOpenWaterPresentation) {
      const horizonFill = new THREE.Mesh(
        new THREE.PlaneGeometry(tankWidth * 11.5, tankDepth * 18),
        new THREE.MeshStandardMaterial({
          color: 0x1d2925,
          roughness: 0.94,
          metalness: 0,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      horizonFill.name = 'tank-substrate-horizon-fill'
      horizonFill.rotation.x = -Math.PI / 2
      horizonFill.position.set(0, sandMesh.position.y - 0.055, -tankDepth * 2.2)
      horizonFill.receiveShadow = true
      this.tank.add(horizonFill)

      const horizonShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(tankWidth * 11.5, tankDepth * 7.2),
        new THREE.MeshBasicMaterial({
          alphaMap: this.createSubstrateHorizonFadeTexture(),
          color: new THREE.Color('#07120f'),
          transparent: true,
          opacity: 0.56,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      horizonShadow.name = 'tank-substrate-horizon-shadow'
      horizonShadow.rotation.x = -Math.PI / 2
      horizonShadow.position.set(0, sandMesh.position.y + 0.07, -tankDepth * 0.92)
      horizonShadow.renderOrder = 3
      this.tank.add(horizonShadow)
    }

    const sedimentDetailTexture = this.createSubstrateDetailTexture()
    const sedimentDetailAlphaTexture = this.createSubstrateDetailAlphaTexture()
    const sedimentRepeat = new THREE.Vector2(
      Math.max(1.8, sandTexture.repeat.x * 0.56),
      Math.max(1.6, sandTexture.repeat.y * 0.52)
    )
    sedimentDetailTexture.repeat.copy(sedimentRepeat)
    sedimentDetailAlphaTexture.repeat.copy(sedimentRepeat)

    const sedimentNormalTexture = sandNormalTexture.clone()
    const sedimentRoughnessTexture = sandRoughnessTexture.clone()
    sedimentNormalTexture.repeat.copy(sedimentRepeat)
    sedimentRoughnessTexture.repeat.copy(sedimentRepeat)

    const sedimentDetailMaterial = new THREE.MeshStandardMaterial({
      map: sedimentDetailTexture,
      alphaMap: sedimentDetailAlphaTexture,
      normalMap: sedimentNormalTexture,
      normalScale: new THREE.Vector2(0.2, 0.16),
      roughnessMap: sedimentRoughnessTexture,
      color: new THREE.Color(isNatureShowcase ? '#68513f' : '#b7966f'),
      roughness: 0.86,
      metalness: 0,
      transparent: true,
      opacity: isNatureShowcase ? 0.28 : 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })

    const sedimentDetailMesh = new THREE.Mesh(sandGeometry.clone(), sedimentDetailMaterial)
    sedimentDetailMesh.name = 'tank-substrate-detail'
    sedimentDetailMesh.position.y = sandMesh.position.y + 0.035
    sedimentDetailMesh.receiveShadow = true
    sedimentDetailMesh.castShadow = false
    sedimentDetailMesh.userData.baseOpacity = isNatureShowcase ? 0.3 : 0.52
    this.substrateDetailMesh = sedimentDetailMesh
    this.tank.add(sedimentDetailMesh)
  }

export function ensureTankVisualLayers(this: any): void {
    if (!Array.isArray(this.glassPanes)) {
      this.glassPanes = []
    }
    if (!(this.frontGlassHighlightMesh instanceof THREE.Mesh)) {
      this.frontGlassHighlightMesh = null
    }
    if (!(this.waterSurfaceHighlightMesh instanceof THREE.Mesh)) {
      this.waterSurfaceHighlightMesh = null
    }
    if (!Array.isArray(this.glassEdgeHighlightMeshes)) {
      this.glassEdgeHighlightMeshes = []
    }
    if (!Array.isArray(this.wallPanelMeshes)) {
      this.wallPanelMeshes = []
    }
    if (!(this.waterlineFrontMesh instanceof THREE.Mesh)) {
      this.waterlineFrontMesh = null
    }
    if (!(this.depthMidgroundMesh instanceof THREE.Mesh)) {
      this.depthMidgroundMesh = null
    }
    if (!(this.foregroundShadowMesh instanceof THREE.Mesh)) {
      this.foregroundShadowMesh = null
    }
    if (!(this.lightCanopyMesh instanceof THREE.Mesh)) {
      this.lightCanopyMesh = null
    }
    if (!Array.isArray(this.nearSurfaceLightMeshes)) {
      this.nearSurfaceLightMeshes = []
    }
    if (!Array.isArray(this.midwaterLightMeshes)) {
      this.midwaterLightMeshes = []
    }
    if (!(this.heroRimLightMesh instanceof THREE.Mesh)) {
      this.heroRimLightMesh = null
    }
    if (!(this.heroGroundGlowMesh instanceof THREE.Mesh)) {
      this.heroGroundGlowMesh = null
    }
    if (!(this.heroFrontFillMesh instanceof THREE.Mesh)) {
      this.heroFrontFillMesh = null
    }
    if (!(this.substrateDetailMesh instanceof THREE.Mesh)) {
      this.substrateDetailMesh = null
    }
    if (!(this.substrateFrontDetailMesh instanceof THREE.Mesh)) {
      this.substrateFrontDetailMesh = null
    }
    if (!Array.isArray(this.causticsMeshes)) {
      this.causticsMeshes = []
    }
    if (!Array.isArray(this.hardscapeOcclusionMeshes)) {
      this.hardscapeOcclusionMeshes = []
    }
  }
