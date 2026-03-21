import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from './DetailedFish'
import type { AquascapeLayoutStyle, FishGroup, Theme } from '../types/aquarium'
import { EnhancedParticleSystem } from './EnhancedParticles'
import { EnvironmentLoader, createEnvironmentBackdropTexture } from './Environment'
import {
  AquascapingSystem,
  resolveSubstrateHardscapeAnchors,
  resolveSubstratePlantAnchors
} from './Aquascaping'
import { SpiralDecorations } from './SpiralDecorations'
import { GodRaysEffect } from './GodRays'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { defaultTheme } from '../utils/stateSchema'
import { disposeSceneResources } from '../utils/threeDisposal'
import { createOpenWaterBounds } from './sceneBounds'
import {
  AQUARIUM_CAMERA_FRAMING,
  AQUARIUM_DEPTH_LAYER_ANCHORS,
  AQUARIUM_FRONT_GLASS_THICKNESS,
  AQUARIUM_TANK_DIMENSIONS,
  MAIN_LIGHT_RIG_ANCHORS,
  MAIN_LIGHT_TARGET_OFFSETS,
  PRIMARY_SHADOW_CAMERA_RANGE,
  PRIMARY_SHADOW_FRUSTUM_RATIOS,
  type AquariumTankDimensions,
  type TankRelativeAnchor,
  resolveDefaultCameraPosition,
  resolveDefaultControlsTarget,
  resolveLightTarget,
  resolvePhotoModeCameraPosition,
  resolvePhotoModeControlsTarget,
  resolveTankRelativePosition
} from './aquariumLayout'
import type { VisualAssetBundle } from '../assets/visualAssets'
import type { QualityLevel } from '../types/settings'

interface PerformanceStats {
  fps: number
  frameTime: number
  fishVisible: number
  drawCalls: number
}

type PremiumThemeValues = {
  glassTint: string
  glassReflectionStrength: number
  surfaceGlowStrength: number
  causticsStrength: number
}

const substrateGeometrySegments = {
  topWidth: 96,
  topDepth: 64,
  frontWidth: 72,
  frontHeight: 28
}

const SURFACE_CAUSTIC_PHASE_FAMILY = 'surface-caustic'

const tankRelativeLightingAnchors = {
  lightCanopy: {
    x: 0.04,
    topClearance: 0.114,
    z: -0.18
  },
  heroRimLight: {
    x: 0.142,
    y: 0.034,
    z: -0.188
  },
  heroGroundGlow: {
    x: 0.106,
    bottomClearance: 0.058,
    z: -0.1
  },
  heroFrontFill: {
    x: 0.068,
    bottomClearance: 0.132,
    z: 0.126
  },
  nearSurfaceBands: [
    {
      x: -0.312,
      topClearance: 0.202,
      z: -0.06
    },
    {
      x: -0.162,
      topClearance: 0.194,
      z: -0.11
    },
    {
      x: 0.018,
      topClearance: 0.212,
      z: -0.152
    },
    {
      x: 0.182,
      topClearance: 0.192,
      z: -0.198
    },
    {
      x: 0.314,
      topClearance: 0.205,
      z: -0.244
    }
  ] satisfies TankRelativeAnchor[],
  midwater: {
    x: 0.028,
    y: 0.082,
    z: -0.172
  }
} satisfies Record<string, TankRelativeAnchor | TankRelativeAnchor[]>

const calculateGaussianFalloff = (
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number
): number => {
  const safeRadiusX = Math.max(radiusX, 0.001)
  const safeRadiusZ = Math.max(radiusZ, 0.001)
  const dx = (x - centerX) / safeRadiusX
  const dz = (z - centerZ) / safeRadiusZ
  return Math.exp(-((dx * dx) + (dz * dz)))
}

const calculateEllipticalDistance = (
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number
): number => {
  const safeRadiusX = Math.max(radiusX, 0.001)
  const safeRadiusZ = Math.max(radiusZ, 0.001)
  const dx = (x - centerX) / safeRadiusX
  const dz = (z - centerZ) / safeRadiusZ
  return Math.sqrt((dx * dx) + (dz * dz))
}

const sampleSubstrateHeight = (
  x: number,
  z: number,
  tankWidth: number,
  tankDepth: number,
  layoutStyle: AquascapeLayoutStyle = 'planted'
): number => {
  const halfWidth = tankWidth / 2
  const halfDepth = tankDepth / 2
  const normalizedX = halfWidth === 0 ? 0 : x / halfWidth
  const normalizedZ = halfDepth === 0 ? 0 : z / halfDepth
  const widthBlend = 1 - THREE.MathUtils.clamp(Math.abs(normalizedX), 0, 1)
  const depthBlend = 1 - THREE.MathUtils.clamp(Math.abs(normalizedZ), 0, 1)
  const coreBlend = THREE.MathUtils.smoothstep(Math.min(widthBlend, depthBlend), 0, 1)
  const backness = THREE.MathUtils.clamp((halfDepth - z) / tankDepth, 0, 1)
  const frontness = 1 - backness
  const leftness = THREE.MathUtils.clamp((-normalizedX + 1) / 2, 0, 1)
  const rightness = 1 - leftness
  const hardscapeAnchors = resolveSubstrateHardscapeAnchors(layoutStyle)
  const plantAnchors = resolveSubstratePlantAnchors(layoutStyle)

  if (layoutStyle === 'nature-showcase') {
    const leftMound =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.31,
        -tankDepth * 0.08,
        tankWidth * 0.24,
        tankDepth * 0.28
      ) * 0.294) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.22,
        -tankDepth * 0.24,
        tankWidth * 0.2,
        tankDepth * 0.2
      ) * 0.172) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.18,
        tankDepth * 0.04,
        tankWidth * 0.16,
        tankDepth * 0.18
      ) * 0.11) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.24,
        tankDepth * 0.16,
        tankWidth * 0.16,
        tankDepth * 0.14
      ) * 0.088) +
      (backness * leftness * widthBlend * 0.056)

    const shoulderLift =
      calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.12,
        -tankDepth * 0.14,
        tankWidth * 0.18,
        tankDepth * 0.2
      ) * 0.108

    const sandBeach =
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.37,
        tankDepth * 0.38,
        tankWidth * 0.16,
        tankDepth * 0.12
      ) * -0.194) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.3,
        tankDepth * 0.28,
        tankWidth * 0.11,
        tankDepth * 0.08
      ) * -0.032)

    const curvedPath =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.01,
        tankDepth * 0.12,
        tankWidth * 0.16,
        tankDepth * 0.1
      ) * -0.08) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.16,
        tankDepth * 0.22,
        tankWidth * 0.1,
        tankDepth * 0.09
      ) * -0.042) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.28,
        tankDepth * 0.3,
        tankWidth * 0.08,
        tankDepth * 0.08
      ) * -0.026)

    const transitionLift =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.12,
        tankDepth * 0.16,
        tankWidth * 0.16,
        tankDepth * 0.12
      ) * 0.046) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.02,
        tankDepth * 0.2,
        tankWidth * 0.1,
        tankDepth * 0.08
      ) * 0.004)

    const shorelineBreakup =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.1,
        tankDepth * 0.44,
        tankWidth * 0.2,
        tankDepth * 0.08
      ) * -0.046) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.24,
        tankDepth * 0.46,
        tankWidth * 0.14,
        tankDepth * 0.08
      ) * -0.034) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.02,
        tankDepth * 0.14,
        tankWidth * 0.06,
        tankDepth * 0.06
      ) * -0.054) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.12,
        tankDepth * 0.18,
        tankWidth * 0.07,
        tankDepth * 0.06
      ) * -0.052) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.12,
        tankDepth * 0.18,
        tankWidth * 0.045,
        tankDepth * 0.045
      ) * -0.112) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.15,
        tankDepth * 0.19,
        tankWidth * 0.05,
        tankDepth * 0.05
      ) * -0.108) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.08,
        tankDepth * 0.18,
        tankWidth * 0.08,
        tankDepth * 0.06
      ) * 0.05) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.03,
        tankDepth * 0.18,
        tankWidth * 0.05,
        tankDepth * 0.05
      ) * 0.074) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.08,
        tankDepth * 0.18,
        tankWidth * 0.042,
        tankDepth * 0.048
      ) * 0.07) +
      (Math.sin((x * 0.62) + 0.3) * frontness * 0.016)

    const macroNoise = (
      (Math.sin((x * 0.42) + (z * 0.14) + 0.4) * 0.038) +
      (Math.cos((x * 0.18) - (z * 0.52) + 0.2) * 0.024)
    ) * (0.34 + (coreBlend * 0.46))

    const microNoise = (
      (Math.sin((x * 1.64) - (z * 0.92)) * 0.01) +
      (Math.cos((x * 2.1) + (z * 2.42) + 0.28) * 0.008)
    ) * (0.16 + (coreBlend * 0.6))

    let hardscapeRelief = 0
    hardscapeAnchors.forEach((anchor) => {
      const anchorX = anchor.x * tankWidth
      const anchorZ = anchor.z * tankDepth
      const radiusX = anchor.radiusX * tankWidth
      const radiusZ = anchor.radiusZ * tankDepth
      const distance = calculateEllipticalDistance(x, z, anchorX, anchorZ, radiusX, radiusZ)
      const sink = -anchor.sinkDepth * Math.exp(-((distance * distance) * 1.7))
      const settlingRim = anchor.rimHeight * 1.2 * Math.exp(-(Math.pow(distance - 1.05, 2) * 4))
      const biasedRim = anchor.rimHeight * 0.9 * calculateGaussianFalloff(
        x,
        z,
        anchorX + (anchor.rimBiasX * tankWidth),
        anchorZ + (anchor.rimBiasZ * tankDepth),
        radiusX * 1.2,
        radiusZ * 1.15
      )

      hardscapeRelief += sink + settlingRim + biasedRim
    })

    let plantRelief = 0
    plantAnchors.forEach((anchor) => {
      const anchorX = anchor.x * tankWidth
      const anchorZ = anchor.z * tankDepth
      const radiusX = anchor.radiusX * tankWidth
      const radiusZ = anchor.radiusZ * tankDepth
      const layerWeight = anchor.layer === 'background' ? 0.58 : anchor.layer === 'midground' ? 0.78 : 0.62
      const mound = anchor.moundHeight * layerWeight * calculateGaussianFalloff(
        x,
        z,
        anchorX,
        anchorZ,
        radiusX,
        radiusZ
      )
      const scoop = -anchor.scoopDepth * layerWeight * calculateGaussianFalloff(
        x,
        z,
        anchorX + (anchor.scoopBiasX * tankWidth),
        anchorZ + (anchor.scoopBiasZ * tankDepth),
        radiusX * 0.92,
        radiusZ * 0.9
      )

      plantRelief += mound + scoop
    })

    const edgeSettle =
      ((1 - widthBlend) * -0.018) +
      (THREE.MathUtils.clamp(frontness - 0.8, 0, 0.2) * -0.026) +
      (rightness * frontness * -0.016) +
      (leftness * frontness * 0.016)

    return THREE.MathUtils.clamp(
      leftMound +
        shoulderLift +
        sandBeach +
        curvedPath +
        transitionLift +
        shorelineBreakup +
        macroNoise +
        microNoise +
        hardscapeRelief +
        plantRelief +
        edgeSettle,
      -0.26,
      0.52
    )
  }

  const rearBerm =
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.16,
      -tankDepth * 0.22,
      tankWidth * 0.34,
      tankDepth * 0.24
    ) * 0.16) +
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.18,
      -tankDepth * 0.08,
      tankWidth * 0.24,
      tankDepth * 0.3
    ) * 0.08) +
    (backness * rightness * widthBlend * 0.05)

  const frontScoop =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.08,
      tankDepth * 0.34,
      tankWidth * 0.28,
      tankDepth * 0.16
    ) * -0.14) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.25,
      tankDepth * 0.4,
      tankWidth * 0.16,
      tankDepth * 0.1
    ) * -0.055)

  const frontSilhouette =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.16,
      tankDepth * 0.46,
      tankWidth * 0.22,
      tankDepth * 0.08
    ) * -0.08) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.22,
      tankDepth * 0.48,
      tankWidth * 0.15,
      tankDepth * 0.07
    ) * 0.045) +
    (Math.sin((x * 0.72) + 0.4) * frontness * 0.018)

  const sideDrift =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.36,
      tankDepth * 0.08,
      tankWidth * 0.14,
      tankDepth * 0.28
    ) * 0.075) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.4,
      tankDepth * 0.14,
      tankWidth * 0.12,
      tankDepth * 0.24
    ) * -0.03)

  const macroNoise = (
    (Math.sin((x * 0.46) + (z * 0.18) + 0.9) * 0.052) +
    (Math.sin((x * 0.18) - (z * 0.63) - 0.6) * 0.038) +
    (Math.cos((x + (z * 1.3)) * 0.78 + 0.2) * 0.03)
  ) * (0.42 + (coreBlend * 0.58))

  const microNoise = (
    (Math.sin((x * 1.85) - (z * 1.1)) * 0.012) +
    (Math.cos((x * 2.35) + (z * 2.8) + 0.25) * 0.01)
  ) * (0.2 + (coreBlend * 0.8))

  let hardscapeRelief = 0
  hardscapeAnchors.forEach((anchor) => {
    const anchorX = anchor.x * tankWidth
    const anchorZ = anchor.z * tankDepth
    const radiusX = anchor.radiusX * tankWidth
    const radiusZ = anchor.radiusZ * tankDepth
    const distance = calculateEllipticalDistance(x, z, anchorX, anchorZ, radiusX, radiusZ)
    const sink = -anchor.sinkDepth * Math.exp(-((distance * distance) * 1.7))
    const settlingRim = anchor.rimHeight * 1.15 * Math.exp(-(Math.pow(distance - 1.05, 2) * 4.2))
    const biasedRim = anchor.rimHeight * 0.82 * calculateGaussianFalloff(
      x,
      z,
      anchorX + (anchor.rimBiasX * tankWidth),
      anchorZ + (anchor.rimBiasZ * tankDepth),
      radiusX * 1.25,
      radiusZ * 1.15
    )

    hardscapeRelief += sink + settlingRim + biasedRim
  })

  let plantRelief = 0
  plantAnchors.forEach((anchor) => {
    const anchorX = anchor.x * tankWidth
    const anchorZ = anchor.z * tankDepth
    const radiusX = anchor.radiusX * tankWidth
    const radiusZ = anchor.radiusZ * tankDepth
    const layerWeight = anchor.layer === 'background' ? 0.72 : 1
    const mound = anchor.moundHeight * layerWeight * calculateGaussianFalloff(
      x,
      z,
      anchorX,
      anchorZ,
      radiusX,
      radiusZ
    )
    const scoop = -anchor.scoopDepth * layerWeight * calculateGaussianFalloff(
      x,
      z,
      anchorX + (anchor.scoopBiasX * tankWidth),
      anchorZ + (anchor.scoopBiasZ * tankDepth),
      radiusX * 0.92,
      radiusZ * 0.9
    )

    plantRelief += mound + scoop
  })

  const edgeSettle =
    ((1 - widthBlend) * -0.014) +
    (THREE.MathUtils.clamp(frontness - 0.82, 0, 0.18) * -0.02)

  return THREE.MathUtils.clamp(
    rearBerm +
      frontScoop +
      frontSilhouette +
      sideDrift +
      macroNoise +
      microNoise +
      hardscapeRelief +
      plantRelief +
      edgeSettle,
    -0.22,
    0.46
  )
}

const sampleFrontSubstrateProfile = (
  x: number,
  tankWidth: number,
  tankDepth: number,
  layoutStyle: AquascapeLayoutStyle = 'planted'
): { crestHeight: number; wallInset: number } => {
  const crestHeight = sampleSubstrateHeight(x, (tankDepth / 2) - 0.22, tankWidth, tankDepth, layoutStyle)
  const wallInset = layoutStyle === 'nature-showcase'
    ? 0.03 + (Math.max(crestHeight, 0) * 0.15) + Math.abs(Math.sin((x * 0.36) + 0.4)) * 0.005
    : 0.038 + (Math.max(crestHeight, 0) * 0.16) + Math.abs(Math.sin((x * 0.42) + 0.2)) * 0.008

  return {
    crestHeight,
    wallInset
  }
}

const resolvePremiumThemeValues = (theme?: Theme): PremiumThemeValues => {
  const fallback = defaultTheme

  return {
    glassTint: theme?.glassTint ?? fallback.glassTint ?? '#c3dde3',
    glassReflectionStrength: theme?.glassReflectionStrength ?? fallback.glassReflectionStrength ?? 0.32,
    surfaceGlowStrength: theme?.surfaceGlowStrength ?? fallback.surfaceGlowStrength ?? 0.45,
    causticsStrength: theme?.causticsStrength ?? fallback.causticsStrength ?? 0.3
  }
}

export const applyThemeToScene = (scene: THREE.Scene, theme: Theme): void => {
  scene.userData.theme = theme
  const background = scene.background
  const shouldPreserveGradient =
    background instanceof THREE.CanvasTexture &&
    (background.userData as { isGradientBackground?: boolean } | undefined)?.isGradientBackground
  if (shouldPreserveGradient) {
    applyGradientBackground(scene, theme)
    return
  }
  scene.background = new THREE.Color(theme.waterTint)
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color = new THREE.Color(theme.waterTint)
    scene.fog.density = theme.fogDensity
    return
  }
  scene.fog = new THREE.FogExp2(theme.waterTint, theme.fogDensity)
}

const resolveTheme = (scene: THREE.Scene, theme?: Theme): Theme => {
  const storedTheme = scene.userData.theme as Theme | undefined
  return theme ?? storedTheme ?? defaultTheme
}

const drawLightShafts = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void => {
  if (
    typeof ctx.createLinearGradient !== 'function' ||
    typeof ctx.beginPath !== 'function' ||
    typeof ctx.moveTo !== 'function' ||
    typeof ctx.lineTo !== 'function' ||
    typeof ctx.closePath !== 'function' ||
    typeof ctx.fill !== 'function'
  ) return

  ;[
    { x: 0.18, width: 0.12, alpha: 0.14 },
    { x: 0.52, width: 0.1, alpha: 0.1 },
    { x: 0.8, width: 0.14, alpha: 0.08 }
  ].forEach((shaft) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, `rgba(235, 249, 255, ${shaft.alpha})`)
    gradient.addColorStop(0.35, `rgba(162, 221, 232, ${shaft.alpha * 0.55})`)
    gradient.addColorStop(1, 'rgba(9, 28, 37, 0)')
    ctx.fillStyle = gradient

    const startX = canvas.width * shaft.x
    const topWidth = canvas.width * shaft.width
    const bottomSpread = topWidth * 2.2
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX + topWidth, 0)
    ctx.lineTo(startX + bottomSpread, canvas.height)
    ctx.lineTo(startX - bottomSpread * 0.45, canvas.height)
    ctx.closePath()
    ctx.fill()
  })
}

const drawDistantSilhouettes = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void => {
  if (
    typeof ctx.beginPath !== 'function' ||
    typeof ctx.moveTo !== 'function' ||
    typeof ctx.bezierCurveTo !== 'function' ||
    typeof ctx.stroke !== 'function'
  ) return

  const silhouettes = [
    { x: 0.14, height: 0.2, bend: -0.04 },
    { x: 0.32, height: 0.28, bend: 0.03 },
    { x: 0.54, height: 0.22, bend: -0.02 },
    { x: 0.76, height: 0.3, bend: 0.05 }
  ]

  ctx.lineWidth = canvas.width * 0.012
  ctx.strokeStyle = 'rgba(8, 25, 33, 0.18)'
  silhouettes.forEach((silhouette) => {
    const baseX = canvas.width * silhouette.x
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * (1 - silhouette.height)

    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.bezierCurveTo(
      baseX - canvas.width * 0.015,
      canvas.height * 0.82,
      baseX + canvas.width * silhouette.bend,
      canvas.height * 0.55,
      baseX - canvas.width * silhouette.bend,
      tipY
    )
    ctx.bezierCurveTo(
      baseX + canvas.width * silhouette.bend * 0.6,
      canvas.height * 0.62,
      baseX + canvas.width * 0.02,
      canvas.height * 0.84,
      baseX,
      baseY
    )
    ctx.stroke()
  })
}

export const applyGradientBackground = (scene: THREE.Scene, theme?: Theme): void => {
  const resolvedTheme = resolveTheme(scene, theme)
  const currentBackground = scene.background
  if (
    currentBackground instanceof THREE.CanvasTexture &&
    (currentBackground.userData as { isGradientBackground?: boolean } | undefined)?.isGradientBackground
  ) {
    currentBackground.dispose()
  }
  const baseColor = new THREE.Color(resolvedTheme.waterTint).lerp(new THREE.Color('#5f7467'), 0.42)
  const deepColor = baseColor.clone().lerp(new THREE.Color('#141a18'), 0.8)
  const midDeepColor = baseColor.clone().lerp(new THREE.Color('#222c28'), 0.58)
  const surfaceColor = baseColor.clone().lerp(new THREE.Color('#dfe5d7'), 0.3)
  const backgroundTexture = createEnvironmentBackdropTexture({
    topColor: `#${surfaceColor.getHexString()}`,
    upperMidColor: `#${baseColor.getHexString()}`,
    lowerMidColor: `#${midDeepColor.getHexString()}`,
    deepColor: `#${deepColor.getHexString()}`,
    silhouetteColor: 'rgba(18, 27, 24, 0.18)'
  })
  const canvas = backgroundTexture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    scene.background = new THREE.Color(resolvedTheme.waterTint)
    scene.fog = new THREE.FogExp2(resolvedTheme.waterTint, resolvedTheme.fogDensity)
    return
  }

  drawLightShafts(ctx, canvas)
  drawDistantSilhouettes(ctx, canvas)

  backgroundTexture.userData = {
    ...backgroundTexture.userData,
    isGradientBackground: true
  }
  backgroundTexture.needsUpdate = true

  scene.background = backgroundTexture
  scene.fog = new THREE.FogExp2(resolvedTheme.waterTint, resolvedTheme.fogDensity)
}

export class AdvancedAquariumScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private composer!: EffectComposer
  private controls!: OrbitControls
  private clock: THREE.Clock
  private tank: THREE.Group
  
  // Advanced components
  private fishSystem: DetailedFishSystem | null = null
  private pendingFishGroups: FishGroup[] | null = null
  private particleSystem: EnhancedParticleSystem | null = null
  private aquascaping: AquascapingSystem | null = null
  private spiralDecorations: SpiralDecorations | null = null
  private godRaysEffect: GodRaysEffect | null = null
  private environmentLoader: EnvironmentLoader
  private glassPanes: THREE.Mesh[] = []
  private waterVolumeMesh: THREE.Mesh | null = null
  private waterSurfaceMesh: THREE.Mesh | null = null
  private frontGlassHighlightMesh: THREE.Mesh | null = null
  private waterSurfaceHighlightMesh: THREE.Mesh | null = null
  private glassEdgeHighlightMeshes: THREE.Mesh[] = []
  private wallPanelMeshes: THREE.Mesh[] = []
  private waterlineFrontMesh: THREE.Mesh | null = null
  private depthMidgroundMesh: THREE.Mesh | null = null
  private foregroundShadowMesh: THREE.Mesh | null = null
  private lightCanopyMesh: THREE.Mesh | null = null
  private nearSurfaceLightMeshes: THREE.Mesh[] = []
  private midwaterLightMeshes: THREE.Mesh[] = []
  private heroRimLightMesh: THREE.Mesh | null = null
  private heroGroundGlowMesh: THREE.Mesh | null = null
  private heroFrontFillMesh: THREE.Mesh | null = null
  private substrateDetailMesh: THREE.Mesh | null = null
  private substrateFrontDetailMesh: THREE.Mesh | null = null
  private causticsMeshes: THREE.Mesh[] = []
  private hardscapeOcclusionMeshes: THREE.Mesh[] = []
  private currentVisualQuality: QualityLevel
  private primaryShadowLight: THREE.DirectionalLight | null = null
  private hemiLight: THREE.HemisphereLight | null = null
  private fillLight: THREE.DirectionalLight | null = null
  private bounceLight: THREE.PointLight | null = null
  private rimLight: THREE.DirectionalLight | null = null
  private currentRendererAntialias = false
  
  private animationId: number | null = null
  public motionEnabled = true
  private photoModeEnabled = false
  private motionScale = 1
  public advancedEffectsEnabled = true
  private readonly tankDimensions = AQUARIUM_TANK_DIMENSIONS
  private defaultCameraPosition = resolveDefaultCameraPosition(this.tankDimensions)
  private photoModeCameraPosition = resolvePhotoModeCameraPosition(this.tankDimensions)
  private defaultControlsTarget = resolveDefaultControlsTarget(this.tankDimensions)
  private photoModeControlsTarget = resolvePhotoModeControlsTarget(this.tankDimensions)
  private readonly tempPhotoModeTarget = new THREE.Vector3()
  private readonly visualAssets?: VisualAssetBundle
  
  // Performance monitoring
  private stats: PerformanceStats = {
    fps: 0,
    frameTime: 0,
    fishVisible: 0,
    drawCalls: 0
  }
  private fpsCounter = 0
  private lastStatsUpdate = 0
  private readonly performanceThresholds = {
    medium: 50,
    low: 30
  }
  
  constructor(
    container: HTMLElement,
    visualAssets?: VisualAssetBundle,
    initialQuality: QualityLevel = 'standard',
    initialTheme: Theme = defaultTheme
  ) {
    this.container = container
    this.visualAssets = visualAssets
    this.currentVisualQuality = initialQuality
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
  
  private refreshCameraFraming(aspect: number): void {
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

  private setupCamera(): void {
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
  
  private setupRenderer(container: HTMLElement): void {
    const { width, height } = this.getViewportSize()
    const antialias = this.currentVisualQuality === 'standard'
    this.renderer = new THREE.WebGLRenderer({ 
      antialias,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.currentVisualQuality === 'simple' ? 1 : 2))
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
  
  private setupComposer(): void {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    this.composer.addPass(new OutputPass())
  }
  
  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false
    this.controls.enableRotate = false
    this.controls.enableZoom = false
    this.controls.enablePan = false
    this.controls.autoRotate = false
    this.controls.target.copy(this.defaultControlsTarget)
    this.controls.update()
  }
  
  private async init(): Promise<void> {
    await this.environmentLoader.loadHDRI()
    this.setupAdvancedLighting()
    this.setupGradientBackground()
    this.createAdvancedTank()
    this.createSpiralDecorations()
    this.createAquascaping()
    this.createAdvancedFishSystem()
    this.createAdvancedWaterEffects()
    this.setupAdvancedPostProcessing()
    this.setupEventListeners()
  }

  private setupAdvancedLighting(): void {
    const dimensions = this.getTankDimensions()
    const controlsTarget = resolveDefaultControlsTarget(dimensions)
    const shadowTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.sun)
    const fillTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.fill)
    const rimTarget = resolveLightTarget(dimensions, controlsTarget, MAIN_LIGHT_TARGET_OFFSETS.rim)
    const ambientLight = new THREE.AmbientLight(0xe1e2d2, 0.53)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xf5f1df, 0x444936, 1.18)
    this.hemiLight = hemiLight
    this.scene.add(hemiLight)

    const sunLight = new THREE.DirectionalLight(0xfff2de, 2.16)
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

    const fillLight = new THREE.DirectionalLight(0xdce0cb, 0.56)
    fillLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.fill))
    fillLight.target.position.copy(fillTarget)
    this.fillLight = fillLight
    this.scene.add(fillLight)
    this.scene.add(fillLight.target)

    const bounceLight = new THREE.PointLight(0xa19473, 0.46, 24)
    bounceLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.bounce))
    this.bounceLight = bounceLight
    this.scene.add(bounceLight)

    const rimLight = new THREE.DirectionalLight(0xd9ddca, 0.074)
    rimLight.position.copy(resolveTankRelativePosition(dimensions, MAIN_LIGHT_RIG_ANCHORS.rim))
    rimLight.target.position.copy(rimTarget)
    this.rimLight = rimLight
    this.scene.add(rimLight)
    this.scene.add(rimLight.target)

    this.applyLightingQuality(this.currentVisualQuality)
  }

  private resolveToneMappingExposure(quality: QualityLevel): number {
    return (quality ?? 'standard') === 'standard' ? 1.44 : 1.33
  }

  private applyLightingQuality(quality: QualityLevel): void {
    const isStandard = (quality ?? 'standard') === 'standard'

    if (this.renderer) {
      this.renderer.toneMappingExposure = this.resolveToneMappingExposure(quality)
    }

    if (this.primaryShadowLight) {
      this.primaryShadowLight.intensity = isStandard ? 2.16 : 2.02
    }

    if (this.hemiLight) {
      this.hemiLight.intensity = isStandard ? 1.18 : 1.04
    }

    if (this.fillLight) {
      this.fillLight.intensity = isStandard ? 0.56 : 0.48
    }

    if (this.bounceLight) {
      this.bounceLight.intensity = isStandard ? 0.46 : 0.35
    }

    if (this.rimLight) {
      this.rimLight.intensity = isStandard ? 0.074 : 0.062
    }
  }

  private setupGradientBackground(): void {
    applyGradientBackground(this.scene)
  }

  private getTankDimensions(): AquariumTankDimensions {
    return this.tankDimensions ?? AQUARIUM_TANK_DIMENSIONS
  }

  private createAdvancedTank(): void {
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

  private getVisualTexture(id: string): THREE.Texture | null {
    return this.visualAssets?.textures[id] ?? null
  }

  private createFeatherMaskTexture(
    layer: 'backdrop' | 'overlay' | 'midground' | 'foreground'
  ): THREE.CanvasTexture {
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

  private createBackdropTexture(): THREE.CanvasTexture {
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

  private createWallPanelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    const verticalGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    verticalGradient.addColorStop(0, 'rgba(151, 159, 138, 0.11)')
    verticalGradient.addColorStop(0.28, 'rgba(88, 96, 78, 0.09)')
    verticalGradient.addColorStop(1, 'rgba(27, 31, 25, 0.078)')
    ctx.fillStyle = verticalGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 3; i++) {
      const x = canvas.width * (0.18 + (i * 0.2))
      const glow = ctx.createLinearGradient(x, 0, x + (canvas.width * 0.1), canvas.height)
      glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
      glow.addColorStop(0.5, 'rgba(171, 178, 156, 0.072)')
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
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(154, 161, 140, 0.1)' : 'rgba(54, 64, 52, 0.16)'
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

  private createDepthLayers(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight } = dimensions

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
  }

  private createHeroLightingLayers(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const lightCanopyPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.lightCanopy)
    const heroRimLightPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.heroRimLight)
    const heroGroundGlowPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.heroGroundGlow)
    const heroFrontFillPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.heroFrontFill)

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

  private createUnderwaterLightingBands(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight } = dimensions

    this.nearSurfaceLightMeshes = [
      {
        name: 'tank-light-near-surface-band-0',
        size: new THREE.Vector2(tankWidth * 0.28, tankHeight * 0.52),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[0],
        rotationY: 0.12,
        rotationZ: -0.05,
        opacity: 0.124,
        scrollX: 0.0028,
        scrollY: 0.0078,
        swayX: 0.1,
        swayY: 0.045,
        opacityPulse: 0.04,
        phase: 0.18,
        mapRepeatX: 1.18,
        mapRepeatY: 1.02,
        mapWarpX: 0.024,
        mapWarpY: 0.016,
        mapRotation: 0.038
      },
      {
        name: 'tank-light-near-surface-band-1',
        size: new THREE.Vector2(tankWidth * 0.26, tankHeight * 0.54),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[1],
        rotationY: -0.04,
        rotationZ: 0.018,
        opacity: 0.129,
        scrollX: -0.0021,
        scrollY: 0.0072,
        swayX: 0.082,
        swayY: 0.05,
        opacityPulse: 0.05,
        phase: 0.72,
        mapRepeatX: 1.12,
        mapRepeatY: 1.04,
        mapWarpX: 0.022,
        mapWarpY: 0.015,
        mapRotation: 0.032
      },
      {
        name: 'tank-light-near-surface-band-2',
        size: new THREE.Vector2(tankWidth * 0.34, tankHeight * 0.58),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[2],
        rotationY: -0.09,
        rotationZ: -0.016,
        opacity: 0.136,
        scrollX: 0.0014,
        scrollY: 0.0068,
        swayX: 0.072,
        swayY: 0.052,
        opacityPulse: 0.05,
        phase: 1.24,
        mapRepeatX: 1.24,
        mapRepeatY: 1.06,
        mapWarpX: 0.026,
        mapWarpY: 0.017,
        mapRotation: 0.036
      },
      {
        name: 'tank-light-near-surface-band-3',
        size: new THREE.Vector2(tankWidth * 0.28, tankHeight * 0.54),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[3],
        rotationY: -0.08,
        rotationZ: 0.024,
        opacity: 0.129,
        scrollX: -0.0018,
        scrollY: 0.0076,
        swayX: 0.088,
        swayY: 0.046,
        opacityPulse: 0.045,
        phase: 1.84,
        mapRepeatX: 1.14,
        mapRepeatY: 1.03,
        mapWarpX: 0.023,
        mapWarpY: 0.015,
        mapRotation: 0.03
      },
      {
        name: 'tank-light-near-surface-band-4',
        size: new THREE.Vector2(tankWidth * 0.29, tankHeight * 0.5),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[4],
        rotationY: -0.14,
        rotationZ: -0.02,
        opacity: 0.12,
        scrollX: 0.0025,
        scrollY: 0.0074,
        swayX: 0.102,
        swayY: 0.044,
        opacityPulse: 0.04,
        phase: 2.36,
        mapRepeatX: 1.16,
        mapRepeatY: 1.01,
        mapWarpX: 0.024,
        mapWarpY: 0.014,
        mapRotation: 0.04
      }
    ].map((config) => {
      const texture = this.createNearSurfaceLightTexture()
      texture.repeat.set(config.mapRepeatX, config.mapRepeatY)
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(config.size.x, config.size.y),
        new THREE.MeshBasicMaterial({
          map: texture,
        color: new THREE.Color('#ddd9c7'),
          transparent: true,
          opacity: config.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      const position = resolveTankRelativePosition(dimensions, config.anchor)
      mesh.name = config.name
      mesh.position.copy(position)
      mesh.rotation.y = config.rotationY
      mesh.rotation.z = config.rotationZ
      mesh.renderOrder = 2
      mesh.userData.baseOpacity = config.opacity
      mesh.userData.baseX = position.x
      mesh.userData.baseY = position.y
      mesh.userData.scrollX = config.scrollX
      mesh.userData.scrollY = config.scrollY
      mesh.userData.swayX = config.swayX
      mesh.userData.swayY = config.swayY
      mesh.userData.opacityPulse = config.opacityPulse
      mesh.userData.phase = config.phase
      mesh.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
      mesh.userData.mapRepeatX = config.mapRepeatX
      mesh.userData.mapRepeatY = config.mapRepeatY
      mesh.userData.mapWarpX = config.mapWarpX
      mesh.userData.mapWarpY = config.mapWarpY
      mesh.userData.mapRotation = config.mapRotation
      this.tank.add(mesh)
      return mesh
    })

    const midwaterPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.midwater)
    this.midwaterLightMeshes = [
      {
        name: 'tank-light-midwater-fill',
        size: new THREE.Vector2(tankWidth * 0.88, tankHeight * 0.62),
        position: midwaterPosition.clone(),
        rotationY: -0.06,
        rotationZ: 0.028,
        opacity: 0.074,
        scrollX: 0.0011,
        scrollY: 0.0038,
        swayX: 0.055,
        swayY: 0.042,
        swayZ: 0.045,
        opacityPulse: 0.035,
        phase: 0.44,
        mapRepeatX: 1.08,
        mapRepeatY: 1.02,
        mapWarpX: 0.015,
        mapWarpY: 0.012,
        mapRotation: 0.02,
        variant: 'fill' as const
      },
      {
        name: 'tank-light-midwater-breakup',
        size: new THREE.Vector2(tankWidth * 0.6, tankHeight * 0.52),
        position: midwaterPosition.clone().add(new THREE.Vector3(-tankWidth * 0.014, -tankHeight * 0.018, tankWidth * 0.008)),
        rotationY: -0.1,
        rotationZ: -0.014,
        opacity: 0.088,
        scrollX: -0.0008,
        scrollY: 0.0049,
        swayX: 0.042,
        swayY: 0.048,
        swayZ: 0.054,
        opacityPulse: 0.042,
        phase: 1.02,
        mapRepeatX: 1.16,
        mapRepeatY: 1.08,
        mapWarpX: 0.019,
        mapWarpY: 0.014,
        mapRotation: 0.028,
        variant: 'breakup' as const
      }
    ].map((config) => {
      const texture = this.createMidwaterLightTexture(config.variant)
      texture.repeat.set(config.mapRepeatX, config.mapRepeatY)
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(config.size.x, config.size.y),
        new THREE.MeshBasicMaterial({
          map: texture,
        color: new THREE.Color('#d4d2c0'),
          transparent: true,
          opacity: config.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      mesh.name = config.name
      mesh.position.copy(config.position)
      mesh.rotation.y = config.rotationY
      mesh.rotation.z = config.rotationZ
      mesh.renderOrder = 2
      mesh.userData.baseOpacity = config.opacity
      mesh.userData.baseX = config.position.x
      mesh.userData.baseY = config.position.y
      mesh.userData.baseZ = config.position.z
      mesh.userData.baseRotationZ = config.rotationZ
      mesh.userData.scrollX = config.scrollX
      mesh.userData.scrollY = config.scrollY
      mesh.userData.swayX = config.swayX
      mesh.userData.swayY = config.swayY
      mesh.userData.swayZ = config.swayZ
      mesh.userData.opacityPulse = config.opacityPulse
      mesh.userData.phase = config.phase
      mesh.userData.phaseFamily = SURFACE_CAUSTIC_PHASE_FAMILY
      mesh.userData.mapRepeatX = config.mapRepeatX
      mesh.userData.mapRepeatY = config.mapRepeatY
      mesh.userData.mapWarpX = config.mapWarpX
      mesh.userData.mapWarpY = config.mapWarpY
      mesh.userData.mapRotation = config.mapRotation
      mesh.userData.midwaterLayer = config.variant
      this.tank.add(mesh)
      return mesh
    })
  }

  private createHardscapeOcclusionLayers(dimensions: AquariumTankDimensions): void {
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

  private createDepthMidgroundTexture(): THREE.CanvasTexture {
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

  private createForegroundShadowTexture(): THREE.CanvasTexture {
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
  
  private createSubstrate(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const layoutStyle = this.scene instanceof THREE.Scene
      ? resolveTheme(this.scene).layoutStyle
      : defaultTheme.layoutStyle
    const isNatureShowcase = layoutStyle === 'nature-showcase'

    const baseHeight = 0.68
    const baseBottomY = -tankHeight / 2
    const baseGeometry = new THREE.BoxGeometry(
      tankWidth + 0.6,
      baseHeight,
      tankDepth + 0.6
    )
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x97856D,
      roughness: 0.7,
      metalness: 0.05
    })
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
    baseMesh.name = 'tank-substrate-base'
    baseMesh.position.y = baseBottomY + (baseHeight / 2)
    baseMesh.receiveShadow = true
    this.tank.add(baseMesh)

    const sandGeometry = new THREE.PlaneGeometry(
      tankWidth,
      tankDepth,
      substrateGeometrySegments.topWidth,
      substrateGeometrySegments.topDepth
    )
    sandGeometry.rotateX(-Math.PI / 2)

    const positions = sandGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]

      positions[i + 1] = sampleSubstrateHeight(x, z, tankWidth, tankDepth, layoutStyle)
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
      Math.max(2.4, tankWidth / 2.6),
      Math.max(2, tankDepth / 2.3)
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
      color: isNatureShowcase
        ? (usingAuthoredSandAlbedo ? 0xC1AD92 : 0x9A846C)
        : (usingAuthoredSandAlbedo ? 0xD7C4AD : 0xB7A288),
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

    const frontHeight = baseHeight + 0.22
    const frontWidth = tankWidth - 0.35
    const frontGeometry = new THREE.PlaneGeometry(
      frontWidth,
      frontHeight,
      substrateGeometrySegments.frontWidth,
      substrateGeometrySegments.frontHeight
    )
    const frontPositions = frontGeometry.attributes.position.array as Float32Array

    for (let i = 0; i < frontPositions.length; i += 3) {
      const x = frontPositions[i]
      const y = frontPositions[i + 1]
      const verticalProgress = (y + (frontHeight / 2)) / frontHeight
      const profile = sampleFrontSubstrateProfile(x, tankWidth, tankDepth, layoutStyle)
      const compactedCurve = Math.pow(verticalProgress, 1.45) * profile.wallInset
      const faceBreakup = Math.pow(verticalProgress, 1.2) * (
        (Math.sin((x * 0.9) + 0.2) * 0.01) +
        (Math.cos((x * 1.6) - 0.45) * 0.008)
      )
      const toeSettle = (1 - verticalProgress) * (0.016 + (Math.max(-profile.crestHeight, 0) * 0.04))

      frontPositions[i + 1] = y + (Math.pow(verticalProgress, 1.32) * profile.crestHeight * 1.08) + faceBreakup - toeSettle
      frontPositions[i + 2] = -(compactedCurve + ((1 - verticalProgress) * 0.012))
    }

    frontGeometry.attributes.position.needsUpdate = true
    frontGeometry.computeVertexNormals()
    const frontUv = frontGeometry.getAttribute('uv')
    if (frontUv && !frontGeometry.getAttribute('uv2')) {
      frontGeometry.setAttribute('uv2', frontUv.clone())
    }

    const sandFrontMaterial = sandMaterial.clone()
    sandFrontMaterial.color = new THREE.Color(
      isNatureShowcase
        ? (usingAuthoredSandAlbedo ? 0xA88E73 : 0x7B624C)
        : (usingAuthoredSandAlbedo ? 0xCEBBA2 : 0xAA9277)
    )
    sandFrontMaterial.normalScale = usingAuthoredSandAlbedo
      ? new THREE.Vector2(0.38, 0.56)
      : new THREE.Vector2(0.32, 0.5)
    sandFrontMaterial.roughness = usingAuthoredSandAlbedo ? 0.91 : 0.95

    const sandFrontMesh = new THREE.Mesh(frontGeometry, sandFrontMaterial)
    sandFrontMesh.name = 'tank-substrate-front'
    sandFrontMesh.position.set(0, baseBottomY + (frontHeight / 2) + 0.06, tankDepth / 2 - 0.16)
    sandFrontMesh.receiveShadow = true
    this.tank.add(sandFrontMesh)

    const sedimentFrontDetailTexture = this.createSubstrateDetailTexture()
    const sedimentFrontAlphaTexture = this.createSubstrateDetailAlphaTexture()
    const frontSedimentRepeat = new THREE.Vector2(
      Math.max(1.2, sedimentRepeat.x * 0.82),
      Math.max(1, sedimentRepeat.y * 0.74)
    )
    sedimentFrontDetailTexture.repeat.copy(frontSedimentRepeat)
    sedimentFrontAlphaTexture.repeat.copy(frontSedimentRepeat)

    const sedimentFrontNormalTexture = sandNormalTexture.clone()
    const sedimentFrontRoughnessTexture = sandRoughnessTexture.clone()
    sedimentFrontNormalTexture.repeat.copy(frontSedimentRepeat)
    sedimentFrontRoughnessTexture.repeat.copy(frontSedimentRepeat)

    const sedimentFrontDetailMaterial = new THREE.MeshStandardMaterial({
      map: sedimentFrontDetailTexture,
      alphaMap: sedimentFrontAlphaTexture,
      normalMap: sedimentFrontNormalTexture,
      normalScale: new THREE.Vector2(0.16, 0.24),
      roughnessMap: sedimentFrontRoughnessTexture,
      color: new THREE.Color(isNatureShowcase ? '#5b4333' : '#a9815c'),
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: isNatureShowcase ? 0.29 : 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })

    const sedimentFrontDetailMesh = new THREE.Mesh(frontGeometry.clone(), sedimentFrontDetailMaterial)
    sedimentFrontDetailMesh.name = 'tank-substrate-front-detail'
    sedimentFrontDetailMesh.position.set(
      sandFrontMesh.position.x,
      sandFrontMesh.position.y,
      sandFrontMesh.position.z + 0.018
    )
    sedimentFrontDetailMesh.receiveShadow = true
    sedimentFrontDetailMesh.userData.baseOpacity = isNatureShowcase ? 0.31 : 0.54
    this.substrateFrontDetailMesh = sedimentFrontDetailMesh
    this.tank.add(sedimentFrontDetailMesh)
  }

  private ensureTankVisualLayers(): void {
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

  private createGlassShell(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const thickness = AQUARIUM_FRONT_GLASS_THICKNESS
    const halfDepth = tankDepth / 2
    const halfWidth = tankWidth / 2
    const halfHeight = tankHeight / 2
    const glassMaterial = this.createGlassMaterial()

    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(tankWidth, tankHeight), glassMaterial.clone())
    frontGlass.name = 'tank-glass-front'
    frontGlass.position.set(0, 0, halfDepth + thickness)
    this.tank.add(frontGlass)

    const frontHighlight = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.88),
      new THREE.MeshBasicMaterial({
        map: this.createGlassHighlightTexture(),
        color: new THREE.Color('#dde2d7'),
        transparent: true,
        opacity: 0.088,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    frontHighlight.name = 'tank-glass-front-highlight'
    frontHighlight.position.set(0, 0.2, halfDepth + thickness + 0.014)
    frontHighlight.renderOrder = 4
    frontHighlight.userData.baseOpacity = 0.088
    this.frontGlassHighlightMesh = frontHighlight
    this.tank.add(frontHighlight)

    const createEdgeHighlight = (name: string, x: number, rotationY: number): THREE.Mesh => {
      const edgeHighlight = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, tankHeight * 0.84),
        new THREE.MeshBasicMaterial({
          map: this.createGlassHighlightTexture(),
          color: new THREE.Color('#e2e5da'),
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      edgeHighlight.name = name
      edgeHighlight.position.set(x, 0.12, halfDepth + thickness + 0.016)
      edgeHighlight.rotation.y = rotationY
      edgeHighlight.renderOrder = 5
      edgeHighlight.userData.baseOpacity = 0.07
      edgeHighlight.userData.baseY = 0.12
      this.tank.add(edgeHighlight)
      return edgeHighlight
    }

    const leftEdgeHighlight = createEdgeHighlight('tank-glass-edge-highlight-left', -halfWidth + 0.12, 0.1)
    const rightEdgeHighlight = createEdgeHighlight('tank-glass-edge-highlight-right', halfWidth - 0.12, -0.1)

    const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(tankDepth, tankHeight), glassMaterial.clone())
    leftGlass.name = 'tank-glass-left'
    leftGlass.rotation.y = Math.PI / 2
    leftGlass.position.set(-halfWidth - thickness, 0, 0)
    this.tank.add(leftGlass)

    const rightGlass = new THREE.Mesh(new THREE.PlaneGeometry(tankDepth, tankHeight), glassMaterial.clone())
    rightGlass.name = 'tank-glass-right'
    rightGlass.rotation.y = -Math.PI / 2
    rightGlass.position.set(halfWidth + thickness, 0, 0)
    this.tank.add(rightGlass)

    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(tankWidth, tankHeight), glassMaterial.clone())
    backGlass.name = 'tank-glass-back'
    backGlass.rotation.y = Math.PI
    backGlass.position.set(0, 0, -halfDepth - thickness)
    this.tank.add(backGlass)

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaab6af,
      roughness: 0.48,
      metalness: 0.1,
      transparent: true,
      opacity: 0.14
    })

    const topEdge = new THREE.Mesh(new THREE.BoxGeometry(tankWidth + 0.12, 0.08, 0.08), edgeMaterial)
    topEdge.name = 'tank-glass-edge-top'
    topEdge.position.set(0, halfHeight + 0.02, halfDepth + 0.02)
    this.tank.add(topEdge)

    this.glassPanes = [frontGlass, leftGlass, rightGlass, backGlass]
    this.glassEdgeHighlightMeshes = [leftEdgeHighlight, rightEdgeHighlight]
  }

  private createInteriorWallPanels(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

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

  private createGlassMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xb7c3ba,
      transmission: 0.96,
      transparent: true,
      opacity: 0.12,
      roughness: 0.08,
      metalness: 0,
      thickness: 0.42,
      ior: 1.18,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      attenuationColor: new THREE.Color('#cad3c8'),
      attenuationDistance: 2.1,
      specularIntensity: 0.62,
      specularColor: new THREE.Color('#ffffff'),
      envMapIntensity: 1.08,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  }

  private createWaterVolume(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

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

  private createWaterSurface(dimensions: AquariumTankDimensions): void {
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

  private createWaterSurfaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.6, 1.4)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, 'rgba(234, 240, 231, 0.28)')
    gradient.addColorStop(0.5, 'rgba(174, 194, 182, 0.08)')
    gradient.addColorStop(1, 'rgba(245, 247, 240, 0.16)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 18; i++) {
      const x = ((i * 83) % 460) + 26
      const y = ((i * 59) % 360) + 48
      const radius = 44 + ((i % 4) * 18)
      const bloom = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius)
      bloom.addColorStop(0, 'rgba(241, 245, 238, 0.18)')
      bloom.addColorStop(0.45, 'rgba(195, 214, 201, 0.08)')
      bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = bloom
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 8; i++) {
      const x = ((i * 111) % 420) + 40
      const y = ((i * 73) % 300) + 90
      const radius = 96 + (i * 6)
      const haze = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius)
      haze.addColorStop(0, 'rgba(238, 241, 234, 0.07)')
      haze.addColorStop(0.5, 'rgba(183, 200, 190, 0.04)')
      haze.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = haze
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createNearSurfaceLightTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.14, 1.04)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.closePath !== 'function' ||
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const surfaceFalloff = ctx.createLinearGradient(0, 0, 0, canvas.height)
    surfaceFalloff.addColorStop(0, 'rgba(236, 238, 226, 0.24)')
    surfaceFalloff.addColorStop(0.22, 'rgba(200, 206, 188, 0.15)')
    surfaceFalloff.addColorStop(0.48, 'rgba(116, 125, 106, 0.07)')
    surfaceFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = surfaceFalloff
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.08, topWidth: 108, midWidth: 170, bottomWidth: 214, drift: -20, alpha: 0.15 },
      { x: 0.26, topWidth: 98, midWidth: 154, bottomWidth: 198, drift: 10, alpha: 0.16 },
      { x: 0.48, topWidth: 122, midWidth: 182, bottomWidth: 236, drift: -8, alpha: 0.19 },
      { x: 0.7, topWidth: 98, midWidth: 154, bottomWidth: 198, drift: 18, alpha: 0.16 },
      { x: 0.9, topWidth: 92, midWidth: 146, bottomWidth: 188, drift: -12, alpha: 0.14 }
    ].forEach((sheet) => {
      const centerX = canvas.width * sheet.x
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, `rgba(242, 243, 232, ${sheet.alpha})`)
      gradient.addColorStop(0.18, `rgba(205, 210, 193, ${sheet.alpha * 0.76})`)
      gradient.addColorStop(0.52, `rgba(126, 137, 118, ${sheet.alpha * 0.28})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(centerX - sheet.topWidth, 0)
      ctx.bezierCurveTo(
        centerX - sheet.midWidth,
        canvas.height * 0.2,
        centerX - sheet.bottomWidth + sheet.drift,
        canvas.height * 0.66,
        centerX - (sheet.bottomWidth * 0.72) + sheet.drift,
        canvas.height
      )
      ctx.lineTo(centerX + (sheet.bottomWidth * 0.8) + sheet.drift, canvas.height)
      ctx.bezierCurveTo(
        centerX + sheet.bottomWidth + sheet.drift,
        canvas.height * 0.64,
        centerX + sheet.midWidth,
        canvas.height * 0.22,
        centerX + sheet.topWidth,
        0
      )
      ctx.closePath()
      ctx.fill()
    })

    ;[
      { x: 0.18, y: 0.18, radius: 108, alpha: 0.11 },
      { x: 0.42, y: 0.24, radius: 140, alpha: 0.15 },
      { x: 0.64, y: 0.16, radius: 110, alpha: 0.13 },
      { x: 0.84, y: 0.22, radius: 112, alpha: 0.11 }
    ].forEach((bloom) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius * 0.1,
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius
      )
      gradient.addColorStop(0, `rgba(242, 243, 233, ${bloom.alpha})`)
      gradient.addColorStop(0.42, `rgba(202, 209, 191, ${bloom.alpha * 0.44})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * bloom.x) - bloom.radius,
        (canvas.height * bloom.y) - bloom.radius,
        bloom.radius * 2,
        bloom.radius * 2
      )
    })

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.16, y: 0.42, radius: 90, alpha: 0.11 },
      { x: 0.34, y: 0.62, radius: 102, alpha: 0.14 },
      { x: 0.58, y: 0.74, radius: 114, alpha: 0.16 },
      { x: 0.82, y: 0.54, radius: 92, alpha: 0.13 }
    ].forEach((breakup) => {
      const erode = ctx.createRadialGradient(
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius * 0.08,
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius
      )
      erode.addColorStop(0, `rgba(255, 255, 255, ${breakup.alpha})`)
      erode.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = erode
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createMidwaterLightTexture(variant: 'fill' | 'breakup'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.08, variant === 'fill' ? 1.02 : 1.08)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.closePath !== 'function' ||
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const verticalFalloff = ctx.createLinearGradient(0, 0, 0, canvas.height)
    if (variant === 'fill') {
      verticalFalloff.addColorStop(0, 'rgba(236, 240, 228, 0.36)')
      verticalFalloff.addColorStop(0.16, 'rgba(199, 206, 189, 0.26)')
      verticalFalloff.addColorStop(0.46, 'rgba(124, 136, 117, 0.11)')
      verticalFalloff.addColorStop(0.76, 'rgba(56, 66, 54, 0.05)')
      verticalFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    } else {
      verticalFalloff.addColorStop(0, 'rgba(237, 240, 229, 0.22)')
      verticalFalloff.addColorStop(0.18, 'rgba(201, 208, 191, 0.15)')
      verticalFalloff.addColorStop(0.44, 'rgba(124, 136, 118, 0.07)')
      verticalFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    }
    ctx.fillStyle = verticalFalloff
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    if (variant === 'fill') {
      [
        { x: 0.18, y: 0.26, radius: 126, alpha: 0.11 },
        { x: 0.42, y: 0.22, radius: 152, alpha: 0.15 },
        { x: 0.68, y: 0.32, radius: 140, alpha: 0.13 },
        { x: 0.86, y: 0.24, radius: 116, alpha: 0.1 }
      ].forEach((wash) => {
        const glow = ctx.createRadialGradient(
          canvas.width * wash.x,
          canvas.height * wash.y,
          wash.radius * 0.1,
          canvas.width * wash.x,
          canvas.height * wash.y,
          wash.radius
        )
        glow.addColorStop(0, `rgba(240, 241, 231, ${wash.alpha})`)
        glow.addColorStop(0.5, `rgba(202, 209, 191, ${wash.alpha * 0.44})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(
          (canvas.width * wash.x) - wash.radius,
          (canvas.height * wash.y) - wash.radius,
          wash.radius * 2,
          wash.radius * 2
        )
      })
    } else {
      [
        { x: 0.34, topWidth: 72, midWidth: 122, bottomWidth: 164, drift: -18, alpha: 0.13 },
        { x: 0.58, topWidth: 62, midWidth: 112, bottomWidth: 150, drift: 12, alpha: 0.12 },
        { x: 0.76, topWidth: 54, midWidth: 98, bottomWidth: 132, drift: -8, alpha: 0.09 }
      ].forEach((band) => {
        const centerX = canvas.width * band.x
        const shaftGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        shaftGradient.addColorStop(0, `rgba(242, 243, 233, ${band.alpha})`)
        shaftGradient.addColorStop(0.18, `rgba(201, 208, 191, ${band.alpha * 0.68})`)
        shaftGradient.addColorStop(0.54, `rgba(117, 129, 111, ${band.alpha * 0.16})`)
        shaftGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = shaftGradient
        ctx.beginPath()
        ctx.moveTo(centerX - band.topWidth, 0)
        ctx.bezierCurveTo(
          centerX - band.midWidth,
          canvas.height * 0.26,
          centerX - band.bottomWidth + band.drift,
          canvas.height * 0.72,
          centerX - (band.bottomWidth * 0.58) + band.drift,
          canvas.height
        )
        ctx.lineTo(centerX + (band.bottomWidth * 0.64) + band.drift, canvas.height)
        ctx.bezierCurveTo(
          centerX + band.bottomWidth + band.drift,
          canvas.height * 0.7,
          centerX + band.midWidth,
          canvas.height * 0.28,
          centerX + band.topWidth,
          0
        )
        ctx.closePath()
        ctx.fill()
      })
    }

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.18, y: 0.5, radius: 88, alpha: variant === 'fill' ? 0.18 : 0.26 },
      { x: 0.52, y: 0.68, radius: 116, alpha: variant === 'fill' ? 0.22 : 0.32 },
      { x: 0.78, y: 0.82, radius: 104, alpha: variant === 'fill' ? 0.2 : 0.28 }
    ].forEach((breakup) => {
      const erode = ctx.createRadialGradient(
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius * 0.14,
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius
      )
      erode.addColorStop(0, `rgba(255, 255, 255, ${breakup.alpha})`)
      erode.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = erode
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })

    if (variant === 'breakup') {
      const lowerShear = ctx.createLinearGradient(0, canvas.height * 0.48, 0, canvas.height)
      lowerShear.addColorStop(0, 'rgba(255, 255, 255, 0)')
      lowerShear.addColorStop(0.54, 'rgba(255, 255, 255, 0.14)')
      lowerShear.addColorStop(1, 'rgba(255, 255, 255, 0.28)')
      ctx.fillStyle = lowerShear
      ctx.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.52)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createHeroLightCanopyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.2, 1.05)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const canopyGlow = ctx.createLinearGradient(0, 0, 0, canvas.height)
      canopyGlow.addColorStop(0, 'rgba(240, 240, 229, 0.36)')
      canopyGlow.addColorStop(0.24, 'rgba(204, 206, 188, 0.18)')
      canopyGlow.addColorStop(0.58, 'rgba(120, 126, 108, 0.07)')
    canopyGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = canopyGlow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.22, y: 0.16, radius: 126, alpha: 0.11 },
      { x: 0.48, y: 0.18, radius: 186, alpha: 0.17 },
      { x: 0.78, y: 0.16, radius: 132, alpha: 0.09 }
    ].forEach((bloom) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius * 0.16,
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius
      )
      gradient.addColorStop(0, `rgba(242, 242, 232, ${bloom.alpha})`)
      gradient.addColorStop(0.48, `rgba(202, 207, 190, ${bloom.alpha * 0.44})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * bloom.x) - bloom.radius,
        (canvas.height * bloom.y) - bloom.radius,
        bloom.radius * 2,
        bloom.radius * 2
      )
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createHeroGroundGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.1, 0.96)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const warmCore = ctx.createRadialGradient(
      canvas.width * 0.56,
      canvas.height * 0.52,
      canvas.width * 0.03,
      canvas.width * 0.56,
      canvas.height * 0.52,
      canvas.width * 0.24
    )
    warmCore.addColorStop(0, 'rgba(236, 232, 214, 0.2)')
    warmCore.addColorStop(0.34, 'rgba(194, 188, 154, 0.12)')
    warmCore.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = warmCore
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.28, y: 0.62, radius: 74, alpha: 0.08 },
      { x: 0.58, y: 0.46, radius: 88, alpha: 0.14 },
      { x: 0.76, y: 0.58, radius: 70, alpha: 0.1 }
    ].forEach((cluster) => {
      const glow = ctx.createRadialGradient(
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius * 0.12,
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius
      )
      glow.addColorStop(0, `rgba(231, 226, 205, ${cluster.alpha})`)
      glow.addColorStop(0.5, `rgba(187, 179, 146, ${cluster.alpha * 0.38})`)
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(
        (canvas.width * cluster.x) - cluster.radius,
        (canvas.height * cluster.y) - cluster.radius,
        cluster.radius * 2,
        cluster.radius * 2
      )
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createHeroFrontFillTexture(): THREE.CanvasTexture {
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
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const lowerLift = ctx.createLinearGradient(
      canvas.width * 0.5,
      canvas.height,
      canvas.width * 0.5,
      canvas.height * 0.08
    )
    lowerLift.addColorStop(0, 'rgba(244, 252, 242, 0.18)')
    lowerLift.addColorStop(0.28, 'rgba(212, 238, 226, 0.16)')
    lowerLift.addColorStop(0.62, 'rgba(164, 214, 208, 0.08)')
    lowerLift.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = lowerLift
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ;[
      { x: 0.36, y: 0.74, radius: 96, alpha: 0.18 },
      { x: 0.54, y: 0.58, radius: 124, alpha: 0.22 },
      { x: 0.7, y: 0.68, radius: 88, alpha: 0.14 }
    ].forEach((glow) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius * 0.1,
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius
      )
      gradient.addColorStop(0, `rgba(248, 253, 245, ${glow.alpha})`)
      gradient.addColorStop(0.5, `rgba(177, 224, 212, ${glow.alpha * 0.5})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * glow.x) - glow.radius,
        (canvas.height * glow.y) - glow.radius,
        glow.radius * 2,
        glow.radius * 2
      )
    })

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createHeroRimLightTexture(): THREE.CanvasTexture {
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
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const verticalCore = ctx.createLinearGradient(canvas.width * 0.14, 0, canvas.width * 0.78, canvas.height)
    verticalCore.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalCore.addColorStop(0.28, 'rgba(198, 243, 248, 0.12)')
    verticalCore.addColorStop(0.52, 'rgba(238, 252, 255, 0.36)')
    verticalCore.addColorStop(0.78, 'rgba(166, 228, 238, 0.18)')
    verticalCore.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalCore
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ;[
      { x: 0.56, y: 0.26, radius: 106, alpha: 0.24 },
      { x: 0.48, y: 0.54, radius: 138, alpha: 0.3 },
      { x: 0.6, y: 0.78, radius: 92, alpha: 0.18 }
    ].forEach((glow) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius * 0.12,
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glow.alpha})`)
      gradient.addColorStop(0.48, `rgba(191, 238, 245, ${glow.alpha * 0.45})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * glow.x) - glow.radius,
        (canvas.height * glow.y) - glow.radius,
        glow.radius * 2,
        glow.radius * 2
      )
    })

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createGlassHighlightTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)

    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const verticalGlow = ctx.createLinearGradient(canvas.width * 0.22, 0, canvas.width * 0.72, canvas.height)
    verticalGlow.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalGlow.addColorStop(0.32, 'rgba(240, 243, 238, 0.14)')
    verticalGlow.addColorStop(0.56, 'rgba(210, 220, 214, 0.28)')
    verticalGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalGlow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (typeof ctx.createRadialGradient === 'function') {
      const bloom = ctx.createRadialGradient(
        canvas.width * 0.62,
        canvas.height * 0.26,
        canvas.width * 0.04,
        canvas.width * 0.62,
        canvas.height * 0.26,
        canvas.width * 0.34
      )
      bloom.addColorStop(0, 'rgba(241, 244, 239, 0.28)')
      bloom.addColorStop(0.45, 'rgba(208, 220, 213, 0.14)')
      bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = bloom
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createWaterSurfaceHighlightTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.44, 1.28)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const glow = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
    glow.addColorStop(0.34, 'rgba(202, 208, 188, 0.14)')
    glow.addColorStop(0.68, 'rgba(171, 179, 156, 0.15)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97) % 452) + 30
      const y = ((i * 67) % 280) + 84
      const radius = 34 + ((i % 3) * 18)
      const highlight = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius)
      highlight.addColorStop(0, 'rgba(222, 225, 201, 0.12)')
      highlight.addColorStop(0.36, 'rgba(190, 195, 171, 0.07)')
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlight
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 6; i++) {
      const x = ((i * 121) % 420) + 46
      const y = ((i * 89) % 240) + 120
      const radius = 84 + (i * 10)
      const shimmer = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius)
      shimmer.addColorStop(0, 'rgba(205, 209, 187, 0.082)')
      shimmer.addColorStop(0.52, 'rgba(171, 177, 155, 0.055)')
      shimmer.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shimmer
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createCausticsLayers(dimensions: AquariumTankDimensions): void {
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

  private createCausticsTexture(): THREE.CanvasTexture {
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

  private createHardscapeOcclusionTexture(layer: 'floor' | 'backwall' | 'shaft'): THREE.CanvasTexture {
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

  private applyTankTheme(theme: Theme): void {
    this.ensureTankVisualLayers()
    const premiumTheme = resolvePremiumThemeValues(theme)
    const isNatureShowcase = theme.layoutStyle === 'nature-showcase'
    const freshwaterTint = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#68715b'), 0.7)
    const glassTint = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#d2d5c7'), 0.68)
    const daylightTint = freshwaterTint.clone().lerp(new THREE.Color('#efe6d0'), 0.56)
    const depthTint = freshwaterTint.clone().lerp(new THREE.Color('#3d3f2f'), 0.9)
    const shadowTint = freshwaterTint.clone().lerp(new THREE.Color('#3a342b'), 0.84)

    this.glassPanes.forEach((pane, index) => {
      const material = pane.material as THREE.MeshPhysicalMaterial
      material.color = glassTint.clone()
      material.attenuationColor = glassTint.clone().lerp(new THREE.Color('#f2f3ea'), 0.12)
      material.opacity = index === 0 ? 0.12 : 0.085
      material.envMapIntensity = 0.6 + (premiumTheme.glassReflectionStrength * 0.92)
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.color = freshwaterTint.clone()
      material.attenuationColor = freshwaterTint.clone().lerp(new THREE.Color('#d2d8cb'), 0.32)
      material.opacity = 0.032 + (premiumTheme.glassReflectionStrength * 0.024)
      material.envMapIntensity = 0.12 + (premiumTheme.glassReflectionStrength * 0.28)
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
      const baseOpacity = 0.05 + (premiumTheme.glassReflectionStrength * 0.12)
      this.frontGlassHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = glassTint.clone().lerp(new THREE.Color('#d7ddcf'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.glassEdgeHighlightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.035 + (premiumTheme.glassReflectionStrength * 0.09)
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
      const baseOpacity = 0.082 + (premiumTheme.surfaceGlowStrength * 0.115)
      this.waterSurfaceHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color('#e3dbc2'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.058 + (premiumTheme.surfaceGlowStrength * 0.08)
      this.waterlineFrontMesh.userData.baseOpacity = baseOpacity
      material.color = daylightTint.clone().lerp(new THREE.Color('#ddd4bc'), 0.32)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.depthMidgroundMesh) {
      const material = this.depthMidgroundMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.134 + (premiumTheme.surfaceGlowStrength * 0.092)
      this.depthMidgroundMesh.userData.baseOpacity = baseOpacity
      material.color = depthTint.clone().lerp(new THREE.Color('#504f3d'), 0.06)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.foregroundShadowMesh) {
      const material = this.foregroundShadowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.038 + (premiumTheme.glassReflectionStrength * 0.046)
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
      const baseOpacity = isNatureShowcase
        ? 0.018 + (premiumTheme.causticsStrength * 0.065)
        : 0.041 + (premiumTheme.causticsStrength * 0.09)
      this.heroGroundGlowMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color(isNatureShowcase ? '#b7a284' : '#c7b896'), isNatureShowcase ? 0.18 : 0.22)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.heroFrontFillMesh) {
      const material = this.heroFrontFillMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = isNatureShowcase
        ? 0.064 - (premiumTheme.causticsStrength * 0.012) - (premiumTheme.surfaceGlowStrength * 0.007)
        : 0.089 - (premiumTheme.causticsStrength * 0.012) - (premiumTheme.surfaceGlowStrength * 0.004)
      this.heroFrontFillMesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(new THREE.Color(isNatureShowcase ? '#baa387' : '#cabba0'), isNatureShowcase ? 0.12 : 0.16)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateDetailMesh) {
      const material = this.substrateDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = isNatureShowcase
        ? 0.202 + (premiumTheme.causticsStrength * 0.032)
        : 0.29 + (premiumTheme.causticsStrength * 0.08)
      this.substrateDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(isNatureShowcase ? '#644b38' : '#9f7c5d').lerp(freshwaterTint, isNatureShowcase ? 0.014 : 0.03)
      material.emissive = freshwaterTint.clone().lerp(new THREE.Color(isNatureShowcase ? '#9d8766' : '#ccb993'), isNatureShowcase ? 0.024 : 0.08)
      material.emissiveIntensity = isNatureShowcase
        ? 0.006 + (premiumTheme.causticsStrength * 0.01)
        : 0.024 + (premiumTheme.causticsStrength * 0.04)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateFrontDetailMesh) {
      const material = this.substrateFrontDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = isNatureShowcase
        ? 0.21 + (premiumTheme.causticsStrength * 0.034)
        : 0.31 + (premiumTheme.causticsStrength * 0.08)
      this.substrateFrontDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(isNatureShowcase ? '#563e2f' : '#936e4f').lerp(freshwaterTint, isNatureShowcase ? 0.012 : 0.02)
      material.emissive = freshwaterTint.clone().lerp(new THREE.Color(isNatureShowcase ? '#957f61' : '#c8b18b'), isNatureShowcase ? 0.022 : 0.06)
      material.emissiveIntensity = isNatureShowcase
        ? 0.006 + (premiumTheme.causticsStrength * 0.01)
        : 0.02 + (premiumTheme.causticsStrength * 0.035)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = premiumTheme.causticsStrength * (
        isNatureShowcase
          ? (index === 0 ? 0.04 : 0.027)
          : (index === 0 ? 0.085 : 0.058)
      )
      mesh.userData.baseOpacity = baseOpacity
      material.color = freshwaterTint.clone().lerp(
        new THREE.Color(
          isNatureShowcase
            ? (index === 0 ? '#b3ab93' : '#a2a78f')
            : (index === 0 ? '#c9c7b3' : '#bec1ab')
        ),
        isNatureShowcase
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

  private createSandTexture(): THREE.CanvasTexture {
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

  private createSubstrateDetailTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.moveTo === 'function' &&
      typeof ctx.bezierCurveTo === 'function' &&
      typeof ctx.stroke === 'function'
    ) {
      ctx.globalAlpha = 0.42
      for (let i = 0; i < 10; i++) {
        const startY = canvas.height * (0.12 + (i * 0.085))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(121, 87, 53, 0.46)' : 'rgba(244, 215, 176, 0.34)'
        ctx.lineWidth = 14 + (i % 3) * 2
        ctx.beginPath()
        ctx.moveTo(-24, startY)
        ctx.bezierCurveTo(
          canvas.width * 0.18,
          startY + 18,
          canvas.width * 0.74,
          startY - 22,
          canvas.width + 24,
          startY + 12
        )
        ctx.stroke()
      }
    }

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.ellipse === 'function' &&
      typeof ctx.fill === 'function'
    ) {
      ctx.globalAlpha = 0.32
      for (let i = 0; i < 36; i++) {
        const x = (i * 73) % canvas.width
        const y = (i * 59) % canvas.height
        const width = 26 + ((i * 11) % 34)
        const height = 10 + ((i * 7) % 14)
        ctx.fillStyle = i % 3 === 0 ? 'rgba(90, 63, 40, 0.42)' : 'rgba(255, 236, 204, 0.28)'
        ctx.beginPath()
        ctx.ellipse(x, y, width, height, (i % 5) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

  private createSubstrateDetailAlphaTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.moveTo === 'function' &&
      typeof ctx.bezierCurveTo === 'function' &&
      typeof ctx.stroke === 'function'
    ) {
      ctx.globalAlpha = 0.9
      for (let i = 0; i < 9; i++) {
        const startY = canvas.height * (0.14 + (i * 0.09))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.78)' : 'rgba(185, 185, 185, 0.58)'
        ctx.lineWidth = 18 + (i % 2) * 4
        ctx.beginPath()
        ctx.moveTo(-24, startY)
        ctx.bezierCurveTo(
          canvas.width * 0.22,
          startY - 8,
          canvas.width * 0.68,
          startY + 20,
          canvas.width + 24,
          startY - 6
        )
        ctx.stroke()
      }
    }

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.ellipse === 'function' &&
      typeof ctx.fill === 'function'
    ) {
      ctx.globalAlpha = 0.56
      for (let i = 0; i < 28; i++) {
        const x = (i * 61) % canvas.width
        const y = (i * 47) % canvas.height
        const width = 22 + ((i * 13) % 28)
        const height = 9 + ((i * 5) % 12)
        const shade = 180 + ((i * 9) % 70)
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
        ctx.beginPath()
        ctx.ellipse(x, y, width, height, (i % 6) * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

  private createSandNormalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#8080ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.42
    for (let i = 0; i < 22; i++) {
      const startY = canvas.height * (0.06 + (i * 0.045))
      ctx.strokeStyle = i % 2 === 0 ? '#8f8fff' : '#7070ff'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.24,
        startY + 16,
        canvas.width * 0.7,
        startY - 10,
        canvas.width + 24,
        startY + 12
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.6 + 0.4
      ctx.fillStyle = Math.random() > 0.5 ? '#8a8aff' : '#7676ff'
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }

  private createSandRoughnessTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const roughnessGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    roughnessGradient.addColorStop(0, '#7c7c7c')
    roughnessGradient.addColorStop(0.45, '#969696')
    roughnessGradient.addColorStop(1, '#bdbdbd')
    ctx.fillStyle = roughnessGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.34
    for (let i = 0; i < 20; i++) {
      const startY = canvas.height * (0.08 + (i * 0.048))
      ctx.strokeStyle = i % 2 === 0 ? '#5d5d5d' : '#c8c8c8'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.18,
        startY + 12,
        canvas.width * 0.76,
        startY - 14,
        canvas.width + 24,
        startY + 8
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1700; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.8 + 0.4
      const shade = 84 + Math.floor(Math.random() * 120)
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }

  private createSandAoTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const aoGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    aoGradient.addColorStop(0, '#d8d8d8')
    aoGradient.addColorStop(0.45, '#ababab')
    aoGradient.addColorStop(1, '#767676')
    ctx.fillStyle = aoGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.26
    for (let i = 0; i < 24; i++) {
      const startY = canvas.height * (0.07 + (i * 0.04))
      ctx.strokeStyle = i % 3 === 0 ? '#5a5a5a' : '#909090'
      ctx.lineWidth = 8 + (i % 2)
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.18,
        startY + 12,
        canvas.width * 0.74,
        startY - 10,
        canvas.width + 24,
        startY + 8
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.6 + 0.5
      const shade = 96 + Math.floor(Math.random() * 72)
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.2
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const width = 16 + Math.random() * 44
      const height = 7 + Math.random() * 14
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 56, 56, 0.6)' : 'rgba(188, 188, 188, 0.42)'
      ctx.beginPath()
      ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }

  private createSpiralDecorations(): void {
    this.spiralDecorations = new SpiralDecorations(this.scene)
  }
  
  private createAquascaping(): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.aquascaping = new AquascapingSystem(this.scene, tankBounds, this.visualAssets, resolveTheme(this.scene))
  }
  
  private createAdvancedFishSystem(): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.fishSystem = new DetailedFishSystem(this.scene, tankBounds, this.visualAssets, {
      layoutStyle: resolveTheme(this.scene).layoutStyle
    })
    if (this.pendingFishGroups) {
      this.fishSystem.setFishGroups(this.pendingFishGroups)
      this.pendingFishGroups = null
    }
  }

  private createAdvancedWaterEffects(): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.particleSystem = new EnhancedParticleSystem(this.scene, tankBounds)
    this.particleSystem.setQuality(this.currentVisualQuality)
  }
  
  private setupAdvancedPostProcessing(): void {
    if (!this.advancedEffectsEnabled) return
    
    // God rays effect
    this.godRaysEffect = new GodRaysEffect(
      this.renderer,
      this.scene,
      this.camera
    )
    this.godRaysEffect.applyTheme(resolveTheme(this.scene))
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
        this.fishSystem.update(deltaTime * this.motionScale, elapsedTime * this.motionScale)
      }
      this.syncFishVisibleStat()
      
      if (this.particleSystem) {
        this.particleSystem.update(elapsedTime * this.motionScale)
      }

      this.updateTankWaterMotion(elapsedTime * this.motionScale)
      
      if (this.aquascaping) {
        this.aquascaping.update(elapsedTime * this.motionScale)
      }
      
      if (this.spiralDecorations) {
        this.spiralDecorations.update(deltaTime * this.motionScale)
      }
    }
    
    // Render with or without post-processing
    if (this.godRaysEffect && this.advancedEffectsEnabled) {
      this.godRaysEffect.update(elapsedTime * this.motionScale)
      this.godRaysEffect.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
    
    // Update performance stats
    this.updatePerformanceStats(startTime)
  }

  private resolvePhotoModeTarget(): THREE.Vector3 {
    this.tempPhotoModeTarget.copy(this.photoModeControlsTarget)

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

  private updateTankWaterMotion(elapsedTime: number): void {
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

  private syncFishVisibleStat(): void {
    if (!this.fishSystem) {
      this.stats.fishVisible = 0
      return
    }
    this.stats.fishVisible = this.fishSystem.getVisibleFishCount()
  }
  
  private updatePerformanceStats(startTime: number): void {
    this.stats.frameTime = performance.now() - startTime
    this.stats.drawCalls = this.renderer.info.render.calls
    
    this.fpsCounter++
    if (performance.now() - this.lastStatsUpdate > 1000) {
      this.stats.fps = this.fpsCounter
      this.fpsCounter = 0
      this.lastStatsUpdate = performance.now()
    }
  }

  public start(): void {
    this.animate()
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  public setMotionEnabled(enabled: boolean): void {
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

  public setPhotoMode(enabled: boolean): void {
    this.photoModeEnabled = enabled
    this.motionScale = enabled ? 0.72 : 1
    this.controls.autoRotate = enabled
    this.controls.autoRotateSpeed = enabled ? 0.45 : 1
  }
  
  public setAdvancedEffects(enabled: boolean): void {
    this.advancedEffectsEnabled = enabled
  }
  
  public getPerformanceStats(): PerformanceStats {
    return { ...this.stats }
  }

  public getPerformanceTier(fps: number): 'high' | 'medium' | 'low' {
    if (fps <= this.performanceThresholds.low) return 'low'
    if (fps <= this.performanceThresholds.medium) return 'medium'
    return 'high'
  }
  
  public enableAutoRotate(enabled: boolean): void {
    this.controls.autoRotate = enabled
  }
  
  public setWaterQuality(quality: QualityLevel): void {
    this.currentVisualQuality = quality
    this.syncRendererPipelineForQuality(quality)
    const { width, height } = this.getViewportSize()
    const pixelRatioCap = quality === 'simple' ? 1 : 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap))
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

  public applyTheme(theme: Theme): void {
    applyThemeToScene(this.scene, theme)
    this.applyTankTheme(theme)
    if (this.godRaysEffect) {
      this.godRaysEffect.applyTheme(theme)
    }
    this.applyVisualQuality(this.currentVisualQuality)
  }

  public applyFishGroups(groups: FishGroup[]): boolean {
    if (!this.fishSystem) {
      this.pendingFishGroups = groups
      return false
    }
    this.fishSystem.setFishGroups(groups)
    return true
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize)
  }

  private getViewportSize(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width || this.container.clientWidth || window.innerWidth))
    const height = Math.max(1, Math.floor(rect.height || this.container.clientHeight || window.innerHeight))
    return { width, height }
  }

  private handleResize = (): void => {
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
    
    if (this.godRaysEffect) {
      this.godRaysEffect.resize(width, height)
    }
  }

  private applyShadowQuality(quality: QualityLevel): void {
    if (!this.primaryShadowLight) return
    const shadowMapSize = quality === 'simple' ? 2048 : 4096
    this.primaryShadowLight.shadow.mapSize.width = shadowMapSize
    this.primaryShadowLight.shadow.mapSize.height = shadowMapSize
  }

  private syncRendererPipelineForQuality(quality: QualityLevel): void {
    const nextAntialias = quality === 'standard'
    if (this.currentRendererAntialias === nextAntialias) return
    if (!this.renderer || !this.controls || !this.composer) return

    const previousDomElement = this.renderer.domElement
    const previousTarget = this.controls.target.clone()
    const previousAutoRotate = this.controls.autoRotate
    const previousAutoRotateSpeed = this.controls.autoRotateSpeed

    this.godRaysEffect?.dispose()
    this.godRaysEffect = null
    this.composer.dispose()
    this.controls.dispose()
    this.renderer.dispose()

    if (previousDomElement.parentElement) {
      previousDomElement.parentElement.removeChild(previousDomElement)
    }

    this.setupRenderer(this.container)
    this.setupComposer()
    this.setupControls()
    this.controls.target.copy(previousTarget)
    this.controls.autoRotate = previousAutoRotate
    this.controls.autoRotateSpeed = previousAutoRotateSpeed
    this.controls.update()
    this.setupAdvancedPostProcessing()
  }

  private applyVisualQuality(quality: QualityLevel): void {
    const resolvedQuality = quality ?? 'standard'
    const isStandard = resolvedQuality === 'standard'
    this.ensureTankVisualLayers()
    this.applyLightingQuality(resolvedQuality)

    this.glassPanes.forEach((pane, index) => {
      pane.visible = isStandard || index === 0
      const material = pane.material as THREE.MeshPhysicalMaterial
      material.thickness = isStandard ? 0.42 : 0.34
      material.attenuationDistance = isStandard ? 1.2 : 1.6
      material.envMapIntensity = isStandard ? 1.32 : 0.98
      material.opacity = index === 0
        ? isStandard ? 0.17 : 0.13
        : isStandard ? 0.1 : 0.06
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      this.waterVolumeMesh.visible = true
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.thickness = isStandard ? 4.6 : 3.9
      material.attenuationDistance = isStandard ? 2.2 : 2.65
      material.envMapIntensity = isStandard ? 0.54 : 0.34
      material.opacity = isStandard ? 0.12 : 0.09
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
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.58
      material.needsUpdate = true
    }

    this.glassEdgeHighlightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 0.13
      mesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.56
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
      this.waterSurfaceHighlightMesh.visible = isStandard
      material.opacity = isStandard ? baseOpacity * 1.05 : 0
      material.needsUpdate = true
    }

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.waterlineFrontMesh.userData.baseOpacity as number | undefined) ?? 0.18
      this.waterlineFrontMesh.visible = isStandard
      material.opacity = isStandard ? baseOpacity : 0
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
      this.foregroundShadowMesh.visible = isStandard
      material.opacity = isStandard ? baseOpacity : 0
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
      material.opacity = isStandard ? baseOpacity * 0.94 : baseOpacity * 0.5
      material.needsUpdate = true
    }

    if (this.heroFrontFillMesh) {
      const material = this.heroFrontFillMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.heroFrontFillMesh.userData.baseOpacity as number | undefined) ?? 0.08
      this.heroFrontFillMesh.visible = true
      material.opacity = isStandard ? baseOpacity : baseOpacity * 0.56
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
      material.opacity = isStandard
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

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)

    if (this.spiralDecorations) {
      this.spiralDecorations.dispose()
    }
    
    if (this.godRaysEffect) {
      this.godRaysEffect.dispose()
    }

    disposeSceneResources(this.scene)
    
    const rendererElement = this.renderer.domElement
    if (rendererElement?.parentElement) {
      rendererElement.parentElement.removeChild(rendererElement)
    }

    this.renderer.dispose()
    this.controls.dispose()
    this.composer.dispose()
  }
}
