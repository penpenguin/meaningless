import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from './DetailedFish'
import type { FishGroup, Theme } from '../types/aquarium'
import { EnhancedParticleSystem } from './EnhancedParticles'
import { EnvironmentLoader, createEnvironmentBackdropTexture } from './Environment'
import { AquascapingSystem, substrateHardscapeAnchors, substratePlantAnchors } from './Aquascaping'
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
  AQUARIUM_TANK_DIMENSIONS,
  type AquariumTankDimensions,
  resolveDefaultCameraPosition,
  resolveDefaultControlsTarget,
  resolvePhotoModeCameraPosition,
  resolvePhotoModeControlsTarget
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

type TankRelativeAnchor = {
  x: number
  z: number
  y?: number
  topClearance?: number
  bottomClearance?: number
}

const tankRelativeLightingAnchors = {
  lightCanopy: {
    x: 0.5 / AQUARIUM_TANK_DIMENSIONS.width,
    topClearance: 1.48 / AQUARIUM_TANK_DIMENSIONS.height,
    z: -0.2
  },
  heroRimLight: {
    x: 1.86 / AQUARIUM_TANK_DIMENSIONS.width,
    y: 0.42 / AQUARIUM_TANK_DIMENSIONS.height,
    z: -0.18
  },
  heroGroundGlow: {
    x: 1.2 / AQUARIUM_TANK_DIMENSIONS.width,
    bottomClearance: 0.72 / AQUARIUM_TANK_DIMENSIONS.height,
    z: -0.08
  },
  nearSurfaceBands: [
    {
      x: -2.55 / AQUARIUM_TANK_DIMENSIONS.width,
      topClearance: ((AQUARIUM_TANK_DIMENSIONS.height / 2) - 3.95) / AQUARIUM_TANK_DIMENSIONS.height,
      z: -0.08
    },
    {
      x: 0.48 / AQUARIUM_TANK_DIMENSIONS.width,
      topClearance: ((AQUARIUM_TANK_DIMENSIONS.height / 2) - 4.15) / AQUARIUM_TANK_DIMENSIONS.height,
      z: -0.14
    },
    {
      x: 2.82 / AQUARIUM_TANK_DIMENSIONS.width,
      topClearance: ((AQUARIUM_TANK_DIMENSIONS.height / 2) - 3.82) / AQUARIUM_TANK_DIMENSIONS.height,
      z: -0.18
    }
  ] satisfies TankRelativeAnchor[],
  midwater: {
    x: 0.42 / AQUARIUM_TANK_DIMENSIONS.width,
    y: 1.12 / AQUARIUM_TANK_DIMENSIONS.height,
    z: -0.16
  },
  primaryShadowTarget: {
    x: 0.8 / AQUARIUM_TANK_DIMENSIONS.width,
    y: -0.35 / AQUARIUM_TANK_DIMENSIONS.height,
    z: 0.2 / AQUARIUM_TANK_DIMENSIONS.depth
  }
} satisfies Record<string, TankRelativeAnchor | TankRelativeAnchor[]>

const primaryShadowFrustumRatios = {
  left: -11.5 / AQUARIUM_TANK_DIMENSIONS.width,
  right: 11.5 / AQUARIUM_TANK_DIMENSIONS.width,
  top: 10.5 / AQUARIUM_TANK_DIMENSIONS.height,
  bottom: -9.5 / AQUARIUM_TANK_DIMENSIONS.height
} as const

const resolveTankRelativePosition = (
  dimensions: AquariumTankDimensions,
  anchor: TankRelativeAnchor
): THREE.Vector3 => {
  const { width, height, depth } = dimensions
  const y =
    anchor.topClearance !== undefined
      ? (height / 2) - (height * anchor.topClearance)
      : anchor.bottomClearance !== undefined
        ? (-height / 2) + (height * anchor.bottomClearance)
        : height * (anchor.y ?? 0)

  return new THREE.Vector3(width * anchor.x, y, depth * anchor.z)
}

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
  tankDepth: number
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
  substrateHardscapeAnchors.forEach((anchor) => {
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
  substratePlantAnchors.forEach((anchor) => {
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
  tankDepth: number
): { crestHeight: number; wallInset: number } => {
  const crestHeight = sampleSubstrateHeight(x, (tankDepth / 2) - 0.22, tankWidth, tankDepth)
  const wallInset = 0.038 + (Math.max(crestHeight, 0) * 0.16) + Math.abs(Math.sin((x * 0.42) + 0.2)) * 0.008

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
  const baseColor = new THREE.Color(resolvedTheme.waterTint)
  const deepColor = baseColor.clone().lerp(new THREE.Color('#000000'), 0.75)
  const midDeepColor = baseColor.clone().lerp(new THREE.Color('#000000'), 0.45)
  const surfaceColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.35)
  const backgroundTexture = createEnvironmentBackdropTexture({
    topColor: `#${surfaceColor.getHexString()}`,
    upperMidColor: `#${baseColor.getHexString()}`,
    lowerMidColor: `#${midDeepColor.getHexString()}`,
    deepColor: `#${deepColor.getHexString()}`,
    silhouetteColor: 'rgba(8, 25, 33, 0.18)'
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
  private readonly defaultCameraPosition = resolveDefaultCameraPosition(this.tankDimensions)
  private readonly photoModeCameraPosition = resolvePhotoModeCameraPosition(this.tankDimensions)
  private readonly defaultControlsTarget = resolveDefaultControlsTarget(this.tankDimensions)
  private readonly photoModeControlsTarget = resolvePhotoModeControlsTarget(this.tankDimensions)
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
  
  constructor(container: HTMLElement, visualAssets?: VisualAssetBundle, initialQuality: QualityLevel = 'standard') {
    this.container = container
    this.visualAssets = visualAssets
    this.currentVisualQuality = initialQuality
    this.scene = new THREE.Scene()
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
  
  private setupCamera(): void {
    const { width, height } = this.getViewportSize()
    this.camera = new THREE.PerspectiveCamera(
      AQUARIUM_CAMERA_FRAMING.standardFov,
      width / height,
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
    const shadowTarget = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.primaryShadowTarget)
    const ambientLight = new THREE.AmbientLight(0xa9d2db, 0.3)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xe9fbff, 0x163845, 0.88)
    this.hemiLight = hemiLight
    this.scene.add(hemiLight)

    const sunLight = new THREE.DirectionalLight(0xfff4dc, 1.88)
    sunLight.position.set(2.6, 13.9, 4.4)
    sunLight.castShadow = true
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 42
    sunLight.shadow.camera.left = dimensions.width * primaryShadowFrustumRatios.left
    sunLight.shadow.camera.right = dimensions.width * primaryShadowFrustumRatios.right
    sunLight.shadow.camera.top = dimensions.height * primaryShadowFrustumRatios.top
    sunLight.shadow.camera.bottom = dimensions.height * primaryShadowFrustumRatios.bottom
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.bias = -0.00018
    sunLight.shadow.normalBias = 0.018
    sunLight.target.position.copy(shadowTarget)
    this.primaryShadowLight = sunLight
    this.applyShadowQuality(this.currentVisualQuality)
    this.scene.add(sunLight)
    this.scene.add(sunLight.target)

    const fillLight = new THREE.DirectionalLight(0xc4edf2, 0.5)
    fillLight.position.set(-10.2, 6.8, 8.9)
    this.fillLight = fillLight
    this.scene.add(fillLight)

    const bounceLight = new THREE.PointLight(0x7faeaa, 0.3, 24)
    bounceLight.position.set(0.8, -2.5, 1.2)
    this.bounceLight = bounceLight
    this.scene.add(bounceLight)

    const rimLight = new THREE.DirectionalLight(0xdaf4f7, 0.12)
    rimLight.position.set(-2.2, 5.2, -13.4)
    this.rimLight = rimLight
    this.scene.add(rimLight)

    this.applyLightingQuality(this.currentVisualQuality)
  }

  private resolveToneMappingExposure(quality: QualityLevel): number {
    return (quality ?? 'standard') === 'standard' ? 1.36 : 1.27
  }

  private applyLightingQuality(quality: QualityLevel): void {
    const isStandard = (quality ?? 'standard') === 'standard'

    if (this.renderer) {
      this.renderer.toneMappingExposure = this.resolveToneMappingExposure(quality)
    }

    if (this.primaryShadowLight) {
      this.primaryShadowLight.intensity = isStandard ? 1.88 : 1.78
    }

    if (this.hemiLight) {
      this.hemiLight.intensity = isStandard ? 0.9 : 0.8
    }

    if (this.fillLight) {
      this.fillLight.intensity = isStandard ? 0.5 : 0.4
    }

    if (this.bounceLight) {
      this.bounceLight.intensity = isStandard ? 0.3 : 0.24
    }

    if (this.rimLight) {
      this.rimLight.intensity = isStandard ? 0.12 : 0.08
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
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    this.ensureTankVisualLayers()
    this.createGlassShell(dimensions)
    this.createInteriorWallPanels(dimensions)

    const backdropGeometry = new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.74)
    const backdropMaterial = new THREE.MeshBasicMaterial({
      map: this.createBackdropTexture(),
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    })
    const backdropMesh = new THREE.Mesh(backdropGeometry, backdropMaterial)
    backdropMesh.name = 'tank-backdrop'
    backdropMesh.position.set(0, -1.1, -tankDepth / 2 + 0.08)
    this.tank.add(backdropMesh)

    const backdropOverlayTexture = this.visualAssets?.textures['backdrop-depth'] ?? null
    if (backdropOverlayTexture) {
      const backdropOverlayMaterial = new THREE.MeshBasicMaterial({
        map: backdropOverlayTexture,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
      const backdropOverlayMesh = new THREE.Mesh(backdropGeometry.clone(), backdropOverlayMaterial)
      backdropOverlayMesh.name = 'tank-backdrop-overlay'
      backdropOverlayMesh.position.set(0, -1.2, -tankDepth / 2 + 0.16)
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

  private createBackdropTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.CanvasTexture(canvas)
    }

    const baseGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    baseGradient.addColorStop(0, 'rgba(141, 207, 219, 0.32)')
    baseGradient.addColorStop(0.4, 'rgba(34, 92, 104, 0.42)')
    baseGradient.addColorStop(1, 'rgba(8, 28, 34, 0.78)')
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
    haze.addColorStop(0, 'rgba(215, 247, 255, 0.18)')
    haze.addColorStop(0.45, 'rgba(100, 175, 187, 0.08)')
    haze.addColorStop(1, 'rgba(8, 28, 34, 0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.lineWidth = 18
    ctx.strokeStyle = 'rgba(9, 25, 30, 0.26)'
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
    verticalGradient.addColorStop(0, 'rgba(219, 246, 255, 0.44)')
    verticalGradient.addColorStop(0.28, 'rgba(109, 182, 196, 0.26)')
    verticalGradient.addColorStop(1, 'rgba(15, 43, 52, 0.08)')
    ctx.fillStyle = verticalGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 4; i++) {
      const x = canvas.width * (0.18 + (i * 0.2))
      const glow = ctx.createLinearGradient(x, 0, x + (canvas.width * 0.1), canvas.height)
      glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
      glow.addColorStop(0.5, 'rgba(236, 251, 255, 0.32)')
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
      ctx.globalAlpha = 0.28
      for (let i = 0; i < 11; i++) {
        const startY = canvas.height * (0.08 + (i * 0.08))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(235, 248, 250, 0.32)' : 'rgba(63, 97, 106, 0.36)'
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
    lowerSilt.addColorStop(0, 'rgba(89, 69, 44, 0)')
    lowerSilt.addColorStop(1, 'rgba(89, 69, 44, 0.26)')
    ctx.fillStyle = lowerSilt
    ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.38)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

  private createDepthLayers(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const midground = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.78, tankHeight * 0.54),
      new THREE.MeshBasicMaterial({
        map: this.createDepthMidgroundTexture(),
        color: new THREE.Color('#3f7880'),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    midground.name = 'tank-depth-midground'
    midground.position.set(0, -1.2, -tankDepth * 0.22)
    midground.renderOrder = 1
    midground.userData.baseOpacity = 0.28
    this.depthMidgroundMesh = midground
    this.tank.add(midground)

    const foregroundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.92, tankHeight * 0.74),
      new THREE.MeshBasicMaterial({
        map: this.createForegroundShadowTexture(),
        color: new THREE.Color('#07212a'),
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    foregroundShadow.name = 'tank-depth-foreground-shadow'
    foregroundShadow.position.set(0, 0.35, tankDepth * 0.26)
    foregroundShadow.renderOrder = 4
    foregroundShadow.userData.baseOpacity = 0.11
    this.foregroundShadowMesh = foregroundShadow
    this.tank.add(foregroundShadow)
  }

  private createHeroLightingLayers(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions
    const lightCanopyPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.lightCanopy)
    const heroRimLightPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.heroRimLight)
    const heroGroundGlowPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.heroGroundGlow)

    const lightCanopy = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.6, tankHeight * 0.34),
      new THREE.MeshBasicMaterial({
        map: this.createHeroLightCanopyTexture(),
        color: new THREE.Color('#d4f0ea'),
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    lightCanopy.name = 'tank-light-canopy'
    lightCanopy.position.copy(lightCanopyPosition)
    lightCanopy.renderOrder = 2
    lightCanopy.userData.baseOpacity = 0.18
    lightCanopy.userData.baseY = lightCanopyPosition.y
    this.lightCanopyMesh = lightCanopy
    this.tank.add(lightCanopy)

    const heroRimLight = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.24, tankHeight * 0.48),
      new THREE.MeshBasicMaterial({
        map: this.createHeroRimLightTexture(),
        color: new THREE.Color('#dff6f3'),
        transparent: true,
        opacity: 0.08,
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
        color: new THREE.Color('#deeed0'),
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    heroGroundGlow.name = 'tank-hero-ground-glow'
    heroGroundGlow.rotation.x = -Math.PI / 2
    heroGroundGlow.position.copy(heroGroundGlowPosition)
    heroGroundGlow.renderOrder = 2
    heroGroundGlow.userData.baseOpacity = 0.18
    this.heroGroundGlowMesh = heroGroundGlow
    this.tank.add(heroGroundGlow)
  }

  private createUnderwaterLightingBands(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight } = dimensions

    this.nearSurfaceLightMeshes = [
      {
        name: 'tank-light-near-surface-band-0',
        size: new THREE.Vector2(tankWidth * 0.16, tankHeight * 0.5),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[0],
        rotationY: 0.08,
        rotationZ: -0.04,
        opacity: 0.18,
        scrollX: 0.0038,
        scrollY: 0.0105,
        swayX: 0.08,
        swayY: 0.04,
        opacityPulse: 0.05,
        phase: 0.2
      },
      {
        name: 'tank-light-near-surface-band-1',
        size: new THREE.Vector2(tankWidth * 0.18, tankHeight * 0.54),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[1],
        rotationY: -0.06,
        rotationZ: 0.03,
        opacity: 0.2,
        scrollX: -0.0028,
        scrollY: 0.0094,
        swayX: 0.06,
        swayY: 0.05,
        opacityPulse: 0.06,
        phase: 0.9
      },
      {
        name: 'tank-light-near-surface-band-2',
        size: new THREE.Vector2(tankWidth * 0.14, tankHeight * 0.46),
        anchor: tankRelativeLightingAnchors.nearSurfaceBands[2],
        rotationY: -0.12,
        rotationZ: -0.02,
        opacity: 0.14,
        scrollX: 0.0022,
        scrollY: 0.0086,
        swayX: 0.05,
        swayY: 0.035,
        opacityPulse: 0.05,
        phase: 1.6
      }
    ].map((config) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(config.size.x, config.size.y),
        new THREE.MeshBasicMaterial({
          map: this.createNearSurfaceLightTexture(),
          color: new THREE.Color('#bdebe3'),
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
      this.tank.add(mesh)
      return mesh
    })

    const midwaterLayer = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.68, tankHeight * 0.54),
      new THREE.MeshBasicMaterial({
        map: this.createMidwaterLightTexture(),
        color: new THREE.Color('#b8e6e0'),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    const midwaterPosition = resolveTankRelativePosition(dimensions, tankRelativeLightingAnchors.midwater)
    midwaterLayer.name = 'tank-light-midwater'
    midwaterLayer.position.copy(midwaterPosition)
    midwaterLayer.rotation.y = -0.08
    midwaterLayer.rotation.z = 0.03
    midwaterLayer.renderOrder = 2
    midwaterLayer.userData.baseOpacity = 0.12
    midwaterLayer.userData.baseX = midwaterPosition.x
    midwaterLayer.userData.baseY = midwaterPosition.y
    midwaterLayer.userData.baseZ = midwaterPosition.z
    midwaterLayer.userData.baseRotationZ = 0.03
    midwaterLayer.userData.scrollX = 0.0012
    midwaterLayer.userData.scrollY = 0.0048
    midwaterLayer.userData.swayX = 0.05
    midwaterLayer.userData.swayY = 0.04
    midwaterLayer.userData.swayZ = 0.05
    midwaterLayer.userData.opacityPulse = 0.04
    midwaterLayer.userData.phase = 0.5
    this.midwaterLightMeshes = [midwaterLayer]
    this.tank.add(midwaterLayer)
  }

  private createHardscapeOcclusionLayers(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const driftwoodAnchor = substrateHardscapeAnchors.find((anchor) => anchor.id === 'driftwood-root-flare')
    const ridgeAnchor = substrateHardscapeAnchors.find((anchor) => anchor.id === 'ridge-rock-hero')

    const createFloorOcclusion = (
      name: string,
      anchor: typeof substrateHardscapeAnchors[number] | undefined,
      width: number,
      depth: number,
      opacity: number,
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
          color: new THREE.Color('#102129'),
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
      this.tank.add(mesh)
      return mesh
    }

    const driftwoodOcclusion = createFloorOcclusion(
      'tank-hardscape-occlusion-driftwood',
      driftwoodAnchor,
      tankWidth * 0.24,
      tankDepth * 0.18,
      0.17,
      -0.02,
      0.24
    )
    const ridgeOcclusion = createFloorOcclusion(
      'tank-hardscape-occlusion-ridge',
      ridgeAnchor,
      tankWidth * 0.28,
      tankDepth * 0.22,
      0.2,
      0.16,
      0.12
    )

    const backwallOcclusion = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.54, tankHeight * 0.5),
      new THREE.MeshBasicMaterial({
        map: this.createHardscapeOcclusionTexture('backwall'),
        color: new THREE.Color('#10222a'),
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide
      })
    )
    backwallOcclusion.name = 'tank-hardscape-occlusion-backwall'
    backwallOcclusion.position.set(0.96, -0.1, -tankDepth / 2 + 0.1)
    backwallOcclusion.renderOrder = 3
    backwallOcclusion.userData.baseOpacity = 0.14
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
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, 'rgba(199, 241, 247, 0)')
    gradient.addColorStop(0.3, 'rgba(122, 185, 194, 0.16)')
    gradient.addColorStop(1, 'rgba(12, 39, 45, 0.56)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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

    const haze = ctx.createRadialGradient(
      canvas.width * 0.58,
      canvas.height * 0.28,
      canvas.width * 0.05,
      canvas.width * 0.58,
      canvas.height * 0.28,
      canvas.width * 0.4
    )
    haze.addColorStop(0, 'rgba(220, 248, 255, 0.16)')
    haze.addColorStop(0.55, 'rgba(134, 196, 205, 0.08)')
    haze.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    const topShade = ctx.createLinearGradient(0, 0, 0, canvas.height)
    topShade.addColorStop(0, 'rgba(4, 17, 24, 0.24)')
    topShade.addColorStop(0.18, 'rgba(6, 26, 34, 0.1)')
    topShade.addColorStop(0.56, 'rgba(6, 26, 34, 0.03)')
    topShade.addColorStop(1, 'rgba(4, 17, 24, 0)')
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
    canopy.addColorStop(0, 'rgba(6, 26, 34, 0.18)')
    canopy.addColorStop(0.72, 'rgba(6, 26, 34, 0.06)')
    canopy.addColorStop(1, 'rgba(6, 26, 34, 0)')
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
    rightShadow.addColorStop(0, 'rgba(8, 29, 37, 0.14)')
    rightShadow.addColorStop(0.68, 'rgba(8, 29, 37, 0.04)')
    rightShadow.addColorStop(1, 'rgba(8, 29, 37, 0)')
    ctx.fillStyle = rightShadow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
  
  private createSubstrate(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const baseHeight = 0.68
    const baseBottomY = -tankHeight / 2
    const baseGeometry = new THREE.BoxGeometry(
      tankWidth + 0.6,
      baseHeight,
      tankDepth + 0.6
    )
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xB59E84,
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

      positions[i + 1] = sampleSubstrateHeight(x, z, tankWidth, tankDepth)
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
      color: usingAuthoredSandAlbedo ? 0xF3E7D6 : 0xD2BB9B,
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
      color: new THREE.Color('#cfaa7a'),
      roughness: 0.86,
      metalness: 0,
      transparent: true,
      opacity: 0.58,
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
    sedimentDetailMesh.userData.baseOpacity = 0.58
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
      const profile = sampleFrontSubstrateProfile(x, tankWidth, tankDepth)
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
    sandFrontMaterial.color = new THREE.Color(usingAuthoredSandAlbedo ? 0xE8D6C1 : 0xC8B08E)
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
      color: new THREE.Color('#bf9163'),
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.62,
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
    sedimentFrontDetailMesh.userData.baseOpacity = 0.62
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

    const thickness = 0.06
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
        color: new THREE.Color('#edf9ff'),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    frontHighlight.name = 'tank-glass-front-highlight'
    frontHighlight.position.set(0, 0.2, halfDepth + thickness + 0.014)
    frontHighlight.renderOrder = 4
    frontHighlight.userData.baseOpacity = 0.16
    this.frontGlassHighlightMesh = frontHighlight
    this.tank.add(frontHighlight)

    const createEdgeHighlight = (name: string, x: number, rotationY: number): THREE.Mesh => {
      const edgeHighlight = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, tankHeight * 0.84),
        new THREE.MeshBasicMaterial({
          map: this.createGlassHighlightTexture(),
          color: new THREE.Color('#f3fdff'),
          transparent: true,
          opacity: 0.13,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      edgeHighlight.name = name
      edgeHighlight.position.set(x, 0.12, halfDepth + thickness + 0.016)
      edgeHighlight.rotation.y = rotationY
      edgeHighlight.renderOrder = 5
      edgeHighlight.userData.baseOpacity = 0.13
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
      color: 0xbfd7dd,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22
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
      color: new THREE.Color('#dff5fb'),
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
      color: 0xc3dde3,
      transmission: 0.96,
      transparent: true,
      opacity: 0.16,
      roughness: 0.06,
      metalness: 0,
      thickness: 0.42,
      ior: 1.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      attenuationColor: new THREE.Color('#d7f0f5'),
      attenuationDistance: 1.2,
      specularIntensity: 0.72,
      specularColor: new THREE.Color('#ffffff'),
      envMapIntensity: 1.22,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  }

  private createWaterVolume(dimensions: AquariumTankDimensions): void {
    const { width: tankWidth, height: tankHeight, depth: tankDepth } = dimensions

    const waterVolume = new THREE.Mesh(
      new THREE.BoxGeometry(tankWidth - 0.24, tankHeight - 0.72, tankDepth - 0.24),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0b5666'),
        transmission: 0.58,
        transparent: true,
        opacity: 0.12,
        roughness: 0.12,
        metalness: 0,
        thickness: 4.4,
        ior: 1.335,
        attenuationColor: new THREE.Color('#72cad4'),
        attenuationDistance: 2.4,
        specularIntensity: 0.34,
        envMapIntensity: 0.48,
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
      color: new THREE.Color('#d9f4fb'),
      transparent: true,
      opacity: 0.26,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.82,
      thickness: 1.18,
      ior: 1.335,
      attenuationColor: new THREE.Color('#9ce7f0'),
      attenuationDistance: 1.35,
      specularIntensity: 0.92,
      specularColor: new THREE.Color('#ffffff'),
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.32,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    surfaceMaterial.emissive = new THREE.Color('#c9edf4')
    surfaceMaterial.emissiveIntensity = 0.1

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
        color: new THREE.Color('#e4fbff'),
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    surfaceHighlight.name = 'tank-water-surface-highlight'
    surfaceHighlight.rotation.x = -Math.PI / 2
    surfaceHighlight.position.y = tankHeight / 2 - 0.39
    surfaceHighlight.renderOrder = 4
    surfaceHighlight.userData.baseOpacity = 0.22
    this.waterSurfaceHighlightMesh = surfaceHighlight
    this.tank.add(surfaceHighlight)

    const waterlineTexture = this.createWaterSurfaceHighlightTexture()
    waterlineTexture.repeat.set(1.15, 0.4)
    const waterlineFront = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth - 0.84, 0.34),
      new THREE.MeshBasicMaterial({
        map: waterlineTexture,
        color: new THREE.Color('#f6feff'),
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    waterlineFront.name = 'tank-waterline-front'
    waterlineFront.position.set(0, tankHeight / 2 - 0.52, tankDepth / 2 - 0.14)
    waterlineFront.renderOrder = 5
    waterlineFront.userData.baseOpacity = 0.18
    waterlineFront.userData.baseY = tankHeight / 2 - 0.52
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
    gradient.addColorStop(0, 'rgba(240, 252, 255, 0.34)')
    gradient.addColorStop(0.5, 'rgba(164, 220, 234, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.22)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 18; i++) {
      const x = ((i * 83) % 460) + 26
      const y = ((i * 59) % 360) + 48
      const radius = 44 + ((i % 4) * 18)
      const bloom = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius)
      bloom.addColorStop(0, 'rgba(245, 252, 255, 0.24)')
      bloom.addColorStop(0.45, 'rgba(196, 236, 244, 0.1)')
      bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = bloom
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 8; i++) {
      const x = ((i * 111) % 420) + 40
      const y = ((i * 73) % 300) + 90
      const radius = 96 + (i * 6)
      const haze = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius)
      haze.addColorStop(0, 'rgba(255, 255, 255, 0.08)')
      haze.addColorStop(0.5, 'rgba(178, 229, 238, 0.05)')
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
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.closePath !== 'function' ||
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'screen'

    ;[
      { x: 0.2, topWidth: 30, bottomWidth: 132, alpha: 0.34, drift: -18 },
      { x: 0.48, topWidth: 26, bottomWidth: 126, alpha: 0.4, drift: 14 },
      { x: 0.76, topWidth: 22, bottomWidth: 108, alpha: 0.28, drift: -10 }
    ].forEach((shaft) => {
      const centerX = canvas.width * shaft.x
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, `rgba(244, 252, 255, ${shaft.alpha})`)
      gradient.addColorStop(0.18, `rgba(158, 231, 224, ${shaft.alpha * 0.68})`)
      gradient.addColorStop(0.48, `rgba(92, 176, 177, ${shaft.alpha * 0.24})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(centerX - shaft.topWidth, 0)
      ctx.lineTo(centerX + shaft.topWidth, 0)
      ctx.lineTo(centerX + shaft.bottomWidth + shaft.drift, canvas.height)
      ctx.lineTo(centerX - (shaft.bottomWidth * 0.72) + shaft.drift, canvas.height)
      ctx.closePath()
      ctx.fill()

      const breakup = ctx.createRadialGradient(
        centerX + shaft.drift,
        canvas.height * 0.72,
        12,
        centerX + shaft.drift,
        canvas.height * 0.72,
        shaft.bottomWidth * 0.9
      )
      breakup.addColorStop(0, 'rgba(255, 255, 255, 0.04)')
      breakup.addColorStop(0.42, 'rgba(108, 195, 190, 0.14)')
      breakup.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = breakup
      ctx.fillRect(
        centerX - shaft.bottomWidth,
        canvas.height * 0.46,
        shaft.bottomWidth * 2,
        canvas.height * 0.54
      )
    })

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.3, y: 0.64, radius: 72, alpha: 0.3 },
      { x: 0.58, y: 0.78, radius: 84, alpha: 0.34 },
      { x: 0.8, y: 0.58, radius: 62, alpha: 0.22 }
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

  private createMidwaterLightTexture(): THREE.CanvasTexture {
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
    verticalFalloff.addColorStop(0, 'rgba(248, 253, 255, 0.82)')
    verticalFalloff.addColorStop(0.14, 'rgba(208, 243, 240, 0.58)')
    verticalFalloff.addColorStop(0.4, 'rgba(118, 197, 196, 0.2)')
    verticalFalloff.addColorStop(0.72, 'rgba(40, 85, 94, 0.06)')
    verticalFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalFalloff
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.42, topWidth: 56, midWidth: 112, bottomWidth: 142, drift: -18, alpha: 0.34 },
      { x: 0.58, topWidth: 48, midWidth: 98, bottomWidth: 136, drift: 12, alpha: 0.28 }
    ].forEach((band) => {
      const centerX = canvas.width * band.x
      const shaftGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      shaftGradient.addColorStop(0, `rgba(250, 253, 255, ${band.alpha})`)
      shaftGradient.addColorStop(0.18, `rgba(194, 239, 233, ${band.alpha * 0.68})`)
      shaftGradient.addColorStop(0.54, `rgba(93, 176, 180, ${band.alpha * 0.18})`)
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

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.22, y: 0.52, radius: 86, alpha: 0.34 },
      { x: 0.7, y: 0.68, radius: 106, alpha: 0.42 },
      { x: 0.46, y: 0.86, radius: 124, alpha: 0.48 }
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

    const lowerShear = ctx.createLinearGradient(0, canvas.height * 0.52, 0, canvas.height)
    lowerShear.addColorStop(0, 'rgba(255, 255, 255, 0)')
    lowerShear.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)')
    lowerShear.addColorStop(1, 'rgba(255, 255, 255, 0.4)')
    ctx.fillStyle = lowerShear
    ctx.fillRect(0, canvas.height * 0.52, canvas.width, canvas.height * 0.48)
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
    canopyGlow.addColorStop(0, 'rgba(232, 249, 248, 0.34)')
    canopyGlow.addColorStop(0.2, 'rgba(170, 227, 221, 0.16)')
    canopyGlow.addColorStop(0.56, 'rgba(83, 151, 162, 0.06)')
    canopyGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = canopyGlow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.22, y: 0.16, radius: 84, alpha: 0.14 },
      { x: 0.48, y: 0.18, radius: 126, alpha: 0.2 },
      { x: 0.78, y: 0.16, radius: 88, alpha: 0.12 }
    ].forEach((bloom) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius * 0.16,
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius
      )
      gradient.addColorStop(0, `rgba(243, 252, 251, ${bloom.alpha})`)
      gradient.addColorStop(0.48, `rgba(169, 226, 220, ${bloom.alpha * 0.45})`)
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
    warmCore.addColorStop(0, 'rgba(240, 251, 241, 0.3)')
    warmCore.addColorStop(0.34, 'rgba(176, 228, 214, 0.18)')
    warmCore.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = warmCore
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.28, y: 0.62, radius: 74, alpha: 0.12 },
      { x: 0.58, y: 0.46, radius: 88, alpha: 0.22 },
      { x: 0.76, y: 0.58, radius: 70, alpha: 0.16 }
    ].forEach((cluster) => {
      const glow = ctx.createRadialGradient(
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius * 0.12,
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius
      )
      glow.addColorStop(0, `rgba(241, 252, 243, ${cluster.alpha})`)
      glow.addColorStop(0.5, `rgba(171, 223, 211, ${cluster.alpha * 0.45})`)
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
    verticalGlow.addColorStop(0.32, 'rgba(255, 255, 255, 0.2)')
    verticalGlow.addColorStop(0.56, 'rgba(214, 243, 250, 0.38)')
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
      bloom.addColorStop(0, 'rgba(255, 255, 255, 0.42)')
      bloom.addColorStop(0.45, 'rgba(214, 243, 250, 0.18)')
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
    texture.repeat.set(1.5, 1.35)

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
    glow.addColorStop(0.42, 'rgba(224, 250, 255, 0.14)')
    glow.addColorStop(0.7, 'rgba(194, 238, 246, 0.24)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97) % 452) + 30
      const y = ((i * 67) % 280) + 84
      const radius = 28 + ((i % 3) * 14)
      const highlight = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius)
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.34)')
      highlight.addColorStop(0.36, 'rgba(228, 249, 255, 0.18)')
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlight
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 6; i++) {
      const x = ((i * 121) % 420) + 46
      const y = ((i * 89) % 240) + 120
      const radius = 70 + (i * 8)
      const shimmer = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius)
      shimmer.addColorStop(0, 'rgba(225, 248, 255, 0.14)')
      shimmer.addColorStop(0.52, 'rgba(189, 235, 244, 0.08)')
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

    const causticsTexture = this.createCausticsTexture()
    const floorMaterial = new THREE.MeshBasicMaterial({
      map: causticsTexture,
      color: new THREE.Color('#d3efe2'),
      transparent: true,
      opacity: 0.14,
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
    floorCaustics.userData.baseOpacity = 0.14
    this.tank.add(floorCaustics)

    const backCaustics = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.9, tankHeight * 0.65),
      floorMaterial.clone()
    )
    backCaustics.name = 'tank-caustics-back'
    backCaustics.position.set(0.3, -0.84, -tankDepth / 2 + 0.1)
    backCaustics.renderOrder = 2
    backCaustics.userData.baseOpacity = 0.11
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
    texture.repeat.set(2, 1.7)

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
      { x: 0.16, y: 0.2, radius: 64, alpha: 0.32 },
      { x: 0.36, y: 0.14, radius: 52, alpha: 0.24 },
      { x: 0.6, y: 0.24, radius: 72, alpha: 0.34 },
      { x: 0.82, y: 0.16, radius: 48, alpha: 0.2 },
      { x: 0.26, y: 0.44, radius: 78, alpha: 0.3 },
      { x: 0.52, y: 0.38, radius: 62, alpha: 0.24 },
      { x: 0.72, y: 0.48, radius: 88, alpha: 0.36 },
      { x: 0.2, y: 0.74, radius: 70, alpha: 0.26 },
      { x: 0.46, y: 0.8, radius: 58, alpha: 0.18 },
      { x: 0.72, y: 0.68, radius: 80, alpha: 0.3 }
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
      outerGradient.addColorStop(0, `rgba(244, 252, 251, ${cluster.alpha})`)
      outerGradient.addColorStop(0.35, `rgba(188, 233, 226, ${cluster.alpha * 0.58})`)
      outerGradient.addColorStop(0.72, `rgba(103, 190, 191, ${cluster.alpha * 0.18})`)
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
      coreGradient.addColorStop(0, `rgba(244, 252, 251, ${cluster.alpha * 0.74})`)
      coreGradient.addColorStop(0.55, `rgba(176, 224, 218, ${cluster.alpha * 0.32})`)
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
      gradient.addColorStop(0, `rgba(9, 18, 22, ${pool.alpha})`)
      gradient.addColorStop(0.58, `rgba(9, 18, 22, ${pool.alpha * 0.46})`)
      gradient.addColorStop(1, 'rgba(9, 18, 22, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(-pool.radiusX, -pool.radiusX, pool.radiusX * 2, pool.radiusX * 2)
      ctx.restore()
    })

    if (layer === 'backwall') {
      const topFade = ctx.createLinearGradient(0, 0, 0, canvas.height)
      topFade.addColorStop(0, 'rgba(7, 14, 18, 0.22)')
      topFade.addColorStop(0.38, 'rgba(7, 14, 18, 0.08)')
      topFade.addColorStop(1, 'rgba(7, 14, 18, 0)')
      ctx.fillStyle = topFade
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (layer === 'shaft') {
      const topFade = ctx.createLinearGradient(0, 0, 0, canvas.height)
      topFade.addColorStop(0, 'rgba(7, 14, 18, 0.04)')
      topFade.addColorStop(0.3, 'rgba(7, 14, 18, 0.1)')
      topFade.addColorStop(0.72, 'rgba(7, 14, 18, 0.24)')
      topFade.addColorStop(1, 'rgba(7, 14, 18, 0.06)')
      ctx.fillStyle = topFade
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private applyTankTheme(theme: Theme): void {
    this.ensureTankVisualLayers()
    const premiumTheme = resolvePremiumThemeValues(theme)

    this.glassPanes.forEach((pane, index) => {
      const material = pane.material as THREE.MeshPhysicalMaterial
      material.color = new THREE.Color(premiumTheme.glassTint)
      material.attenuationColor = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#ffffff'), 0.24)
      material.opacity = index === 0 ? 0.18 : 0.11
      material.envMapIntensity = 0.8 + (premiumTheme.glassReflectionStrength * 1.5)
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.color = new THREE.Color(theme.waterTint)
      material.attenuationColor = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#8adbe6'), 0.26)
      material.opacity = 0.08 + (premiumTheme.glassReflectionStrength * 0.08)
      material.envMapIntensity = 0.2 + (premiumTheme.glassReflectionStrength * 0.5)
      material.needsUpdate = true
    }

    if (this.waterSurfaceMesh) {
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      material.color = new THREE.Color(premiumTheme.glassTint)
      material.attenuationColor = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#ffffff'), 0.16)
      material.opacity = 0.18 + (premiumTheme.surfaceGlowStrength * 0.16)
      material.emissive = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#ffffff'), 0.2)
      material.emissiveIntensity = premiumTheme.surfaceGlowStrength * 0.22
      material.envMapIntensity = 0.75 + (premiumTheme.glassReflectionStrength * 1.1)
      material.needsUpdate = true
    }

    if (this.frontGlassHighlightMesh) {
      const material = this.frontGlassHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.08 + (premiumTheme.glassReflectionStrength * 0.24)
      this.frontGlassHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#ffffff'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.glassEdgeHighlightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.06 + (premiumTheme.glassReflectionStrength * 0.18)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(premiumTheme.glassTint).lerp(new THREE.Color('#ffffff'), 0.58)
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.wallPanelMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (index === 0 ? 0.13 : 0.08)
        + (premiumTheme.causticsStrength * 0.16)
        + (premiumTheme.glassReflectionStrength * 0.08)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#f3fbff'), index === 0 ? 0.44 : 0.34)
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.08 + (premiumTheme.surfaceGlowStrength * 0.26)
      this.waterSurfaceHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#ffffff'), 0.52)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.waterlineFrontMesh) {
      const material = this.waterlineFrontMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.08 + (premiumTheme.surfaceGlowStrength * 0.24)
      this.waterlineFrontMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#ffffff'), 0.68)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.depthMidgroundMesh) {
      const material = this.depthMidgroundMesh.material as THREE.MeshBasicMaterial
      const depthTint = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#d9f5fb'), 0.22)
      const baseOpacity = 0.18 + (premiumTheme.surfaceGlowStrength * 0.2)
      this.depthMidgroundMesh.userData.baseOpacity = baseOpacity
      material.color = depthTint
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.foregroundShadowMesh) {
      const material = this.foregroundShadowMesh.material as THREE.MeshBasicMaterial
      const shadowTint = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#04151b'), 0.62)
      const baseOpacity = 0.05 + (premiumTheme.glassReflectionStrength * 0.09)
      this.foregroundShadowMesh.userData.baseOpacity = baseOpacity
      material.color = shadowTint
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.lightCanopyMesh) {
      const material = this.lightCanopyMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.07 + (premiumTheme.surfaceGlowStrength * 0.14) + (premiumTheme.glassReflectionStrength * 0.03)
      this.lightCanopyMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#def3ea'), 0.4)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.nearSurfaceLightMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (0.09 + (premiumTheme.surfaceGlowStrength * 0.11) + (premiumTheme.causticsStrength * 0.04))
        * (index === 1 ? 1.08 : index === 2 ? 0.76 : 0.92)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(
        new THREE.Color(index === 1 ? '#effcf7' : '#c9efe5'),
        0.48
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.midwaterLightMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (
        0.06 +
        (premiumTheme.surfaceGlowStrength * 0.07) +
        (premiumTheme.causticsStrength * 0.04)
      ) * (index === 0 ? 1 : 0.9)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(
        new THREE.Color('#d4f0ea'),
        0.4
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    if (this.heroGroundGlowMesh) {
      const material = this.heroGroundGlowMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.1 + (premiumTheme.causticsStrength * 0.24)
      this.heroGroundGlowMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#dbe9c8'), 0.42)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateDetailMesh) {
      const material = this.substrateDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = 0.42 + (premiumTheme.causticsStrength * 0.18)
      this.substrateDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color('#bb9060').lerp(new THREE.Color(theme.waterTint), 0.08)
      material.emissive = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#ffe8b2'), 0.24)
      material.emissiveIntensity = 0.08 + (premiumTheme.causticsStrength * 0.16)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    if (this.substrateFrontDetailMesh) {
      const material = this.substrateFrontDetailMesh.material as THREE.MeshStandardMaterial
      const baseOpacity = 0.46 + (premiumTheme.causticsStrength * 0.16)
      this.substrateFrontDetailMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color('#b68455').lerp(new THREE.Color(theme.waterTint), 0.06)
      material.emissive = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#ffe5b1'), 0.18)
      material.emissiveIntensity = 0.05 + (premiumTheme.causticsStrength * 0.12)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const baseOpacity = premiumTheme.causticsStrength * (index === 0 ? 0.34 : 0.22)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(
        new THREE.Color(index === 0 ? '#e6f8eb' : '#cbe8e0'),
        index === 0 ? 0.48 : 0.28
      )
      material.opacity = baseOpacity
      material.needsUpdate = true
    })

    this.hardscapeOcclusionMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      const occlusionLayer = (mesh.userData.occlusionLayer as 'floor' | 'backwall' | 'shaft' | undefined) ?? 'floor'
      const baseOpacity = occlusionLayer === 'backwall'
        ? 0.1 + (premiumTheme.glassReflectionStrength * 0.08)
        : occlusionLayer === 'shaft'
          ? 0.12 + (premiumTheme.glassReflectionStrength * 0.1)
          : 0.14 + (premiumTheme.glassReflectionStrength * 0.12)
      mesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#07141a'), 0.76)
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
    this.aquascaping = new AquascapingSystem(this.scene, tankBounds, this.visualAssets)
  }
  
  private createAdvancedFishSystem(): void {
    const tankBounds = createOpenWaterBounds(this.getTankDimensions())
    this.fishSystem = new DetailedFishSystem(this.scene, tankBounds, this.visualAssets)
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
    if (this.waterSurfaceMesh) {
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.01
        material.map.offset.y = elapsedTime * 0.014
      }
      this.waterSurfaceMesh.rotation.z = Math.sin(elapsedTime * 0.18) * 0.012
    }

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * 0.012
        material.map.offset.y = elapsedTime * 0.018
      }
      this.waterSurfaceHighlightMesh.rotation.z = Math.sin(elapsedTime * 0.18) * 0.012
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
        material.map.offset.x = elapsedTime * (((mesh.userData.scrollX as number | undefined) ?? 0.003))
        material.map.offset.y = elapsedTime * (((mesh.userData.scrollY as number | undefined) ?? 0.009))
      }
      const baseX = (mesh.userData.baseX as number | undefined) ?? mesh.position.x
      const baseY = (mesh.userData.baseY as number | undefined) ?? mesh.position.y
      const swayX = (mesh.userData.swayX as number | undefined) ?? 0.05
      const swayY = (mesh.userData.swayY as number | undefined) ?? 0.03
      const phase = (mesh.userData.phase as number | undefined) ?? 0
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      const opacityPulse = (mesh.userData.opacityPulse as number | undefined) ?? 0.05
      mesh.position.x = baseX + Math.sin((elapsedTime * 0.22) + phase) * swayX
      mesh.position.y = baseY + Math.sin((elapsedTime * 0.28) + phase) * swayY
      material.opacity = baseOpacity * (0.94 + Math.sin((elapsedTime * 0.36) + phase) * opacityPulse)
    })

    this.midwaterLightMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * (((mesh.userData.scrollX as number | undefined) ?? -0.0016))
        material.map.offset.y = elapsedTime * (((mesh.userData.scrollY as number | undefined) ?? 0.0068))
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
      mesh.position.x = baseX + Math.sin((elapsedTime * 0.14) + phase) * swayX
      mesh.position.y = baseY + Math.sin((elapsedTime * 0.18) + phase) * swayY
      mesh.position.z = baseZ + Math.sin((elapsedTime * 0.12) + phase) * swayZ
      mesh.rotation.z = baseRotationZ + Math.sin((elapsedTime * 0.22) + phase) * 0.016
      material.opacity = baseOpacity * (0.94 + Math.sin((elapsedTime * 0.3) + phase) * opacityPulse)
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
        material.map.offset.x = elapsedTime * (index === 0 ? 0.0045 : -0.0024)
        material.map.offset.y = elapsedTime * (index === 0 ? 0.0094 : 0.0056)
      }
      const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? material.opacity
      material.opacity = baseOpacity * (0.96 + Math.sin((elapsedTime * 0.26) + (index * 0.7)) * 0.04)
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
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
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
