import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from './DetailedFish'
import type { FishGroup, Theme } from '../types/aquarium'
import { EnhancedParticleSystem } from './EnhancedParticles'
import { EnvironmentLoader } from './Environment'
import { AquascapingSystem } from './Aquascaping'
import { SpiralDecorations } from './SpiralDecorations'
import { GodRaysEffect } from './GodRays'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { defaultTheme } from '../utils/stateSchema'
import { disposeSceneResources } from '../utils/threeDisposal'
import { createOpenWaterBounds } from './sceneBounds'

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
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    scene.background = new THREE.Color(resolvedTheme.waterTint)
    scene.fog = new THREE.FogExp2(resolvedTheme.waterTint, resolvedTheme.fogDensity)
    return
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  const baseColor = new THREE.Color(resolvedTheme.waterTint)
  const deepColor = baseColor.clone().lerp(new THREE.Color('#000000'), 0.75)
  const midDeepColor = baseColor.clone().lerp(new THREE.Color('#000000'), 0.45)
  const surfaceColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.35)

  gradient.addColorStop(0, `#${surfaceColor.getHexString()}`)
  gradient.addColorStop(0.3, `#${baseColor.getHexString()}`)
  gradient.addColorStop(0.6, `#${midDeepColor.getHexString()}`)
  gradient.addColorStop(1, `#${deepColor.getHexString()}`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (typeof ctx.createRadialGradient === 'function') {
    const surfaceBloom = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.08,
      canvas.width * 0.04,
      canvas.width * 0.5,
      canvas.height * 0.08,
      canvas.width * 0.55
    )
    surfaceBloom.addColorStop(0, 'rgba(236, 250, 255, 0.34)')
    surfaceBloom.addColorStop(0.45, 'rgba(159, 225, 235, 0.12)')
    surfaceBloom.addColorStop(1, 'rgba(12, 37, 46, 0)')
    ctx.fillStyle = surfaceBloom
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const lowerVignette = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.92,
      canvas.width * 0.1,
      canvas.width * 0.5,
      canvas.height * 0.92,
      canvas.width * 0.75
    )
    lowerVignette.addColorStop(0, 'rgba(9, 28, 37, 0)')
    lowerVignette.addColorStop(0.55, 'rgba(7, 19, 27, 0.12)')
    lowerVignette.addColorStop(1, 'rgba(3, 8, 12, 0.34)')
    ctx.fillStyle = lowerVignette
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  drawLightShafts(ctx, canvas)
  drawDistantSilhouettes(ctx, canvas)

  const backgroundTexture = new THREE.CanvasTexture(canvas)
  backgroundTexture.mapping = THREE.EquirectangularReflectionMapping
  backgroundTexture.colorSpace = THREE.SRGBColorSpace
  backgroundTexture.userData = {
    ...backgroundTexture.userData,
    isGradientBackground: true
  }

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
  private causticsMeshes: THREE.Mesh[] = []
  private currentVisualQuality: 'low' | 'medium' | 'high' = 'high'
  
  private animationId: number | null = null
  public motionEnabled = true
  public advancedEffectsEnabled = true
  
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
  
  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    
    this.setupCamera()
    this.setupRenderer(container)
    this.setupComposer()
    this.setupControls()
    
    this.tank = new THREE.Group()
    this.scene.add(this.tank)
    
    this.environmentLoader = new EnvironmentLoader(this.scene)
    
    this.init()
  }
  
  private setupCamera(): void {
    const { width, height } = this.getViewportSize()
    this.camera = new THREE.PerspectiveCamera(
      48,
      width / height,
      0.1,
      1000
    )
    this.camera.position.set(0, 1.7, 13.2)
    this.camera.lookAt(0, -0.25, 0)
  }
  
  private setupRenderer(container: HTMLElement): void {
    const { width, height } = this.getViewportSize()
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Performance optimizations
    this.renderer.info.autoReset = false
    container.appendChild(this.renderer.domElement)
  }
  
  private setupComposer(): void {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
  }
  
  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false
    this.controls.enableRotate = false
    this.controls.enableZoom = false
    this.controls.enablePan = false
    this.controls.autoRotate = false
    this.controls.target.set(0, 0, 0)
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
    const ambientLight = new THREE.AmbientLight(0x9bc4cf, 0.24)
    this.scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0xdff5fb, 0x0c1d26, 0.7)
    this.scene.add(hemiLight)

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.35)
    sunLight.position.set(4.8, 12, 6.5)
    sunLight.castShadow = true
    sunLight.shadow.camera.near = 0.1
    sunLight.shadow.camera.far = 100
    sunLight.shadow.camera.left = -20
    sunLight.shadow.camera.right = 20
    sunLight.shadow.camera.top = 20
    sunLight.shadow.camera.bottom = -20
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.bias = -0.0001
    this.scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0x95d0e1, 0.28)
    fillLight.position.set(-7, 5.5, 8)
    this.scene.add(fillLight)

    const bounceLight = new THREE.PointLight(0x4b7f8d, 0.16, 22)
    bounceLight.position.set(0, -3.2, 1.4)
    this.scene.add(bounceLight)

    const rimLight = new THREE.DirectionalLight(0xe7fbff, 0.18)
    rimLight.position.set(0, 3.6, -12)
    this.scene.add(rimLight)
  }

  private setupGradientBackground(): void {
    applyGradientBackground(this.scene)
  }

  private createAdvancedTank(): void {
    const tankWidth = 14
    const tankHeight = 14
    const tankDepth = 10

    this.ensureTankVisualLayers()
    this.createGlassShell(tankWidth, tankHeight, tankDepth)

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

    this.createSubstrate(tankWidth, tankHeight, tankDepth)
    this.createWaterVolume(tankWidth, tankHeight, tankDepth)
    this.createWaterSurface(tankWidth, tankHeight, tankDepth)
    this.createCausticsLayers(tankWidth, tankHeight, tankDepth)
    const initialTheme = this.scene instanceof THREE.Scene ? resolveTheme(this.scene) : defaultTheme
    this.applyTankTheme(initialTheme)
    this.applyVisualQuality(this.currentVisualQuality ?? 'high')
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
  
  private createSubstrate(tankWidth: number, tankHeight: number, tankDepth: number): void {
    const baseHeight = 0.45
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
    baseMesh.position.y = -tankHeight / 2 + (baseHeight / 2)
    baseMesh.receiveShadow = true
    this.tank.add(baseMesh)

    const sandGeometry = new THREE.PlaneGeometry(tankWidth, tankDepth, 48, 32)
    sandGeometry.rotateX(-Math.PI / 2)

    const positions = sandGeometry.attributes.position.array as Float32Array
    const halfWidth = tankWidth / 2
    const halfDepth = tankDepth / 2

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      const widthBlend = 1 - Math.min(1, Math.abs(x) / halfWidth)
      const depthBlend = 1 - Math.min(1, Math.abs(z) / halfDepth)
      const edgeBlend = Math.pow(Math.max(0, Math.min(widthBlend, depthBlend)), 1.4)
      const broadRipples = Math.sin(x * 0.55) * Math.cos(z * 0.75) * 0.12
      const gentleRidges = Math.sin((x + z) * 1.1) * 0.05
      const fineTexture = Math.sin(x * 2.2) * Math.cos(z * 2.4) * 0.018

      positions[i + 1] = (broadRipples + gentleRidges + fineTexture) * edgeBlend
    }

    sandGeometry.attributes.position.needsUpdate = true
    sandGeometry.computeVertexNormals()

    const sandTexture = this.createSandTexture()
    sandTexture.repeat.set(
      Math.max(1.5, tankWidth / 3.5),
      Math.max(1.5, tankDepth / 3)
    )
    
    const sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTexture,
      color: 0xD2BB9B,
      roughness: 0.8,
      metalness: 0,
      transparent: false,
      side: THREE.DoubleSide
    })
    
    const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial)
    sandMesh.position.y = -tankHeight / 2 + baseHeight + 0.02
    sandMesh.receiveShadow = true
    sandMesh.castShadow = false
    this.tank.add(sandMesh)
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
    if (!Array.isArray(this.causticsMeshes)) {
      this.causticsMeshes = []
    }
  }

  private createGlassShell(tankWidth: number, tankHeight: number, tankDepth: number): void {
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

  private createWaterVolume(tankWidth: number, tankHeight: number, tankDepth: number): void {
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

  private createWaterSurface(tankWidth: number, tankHeight: number, tankDepth: number): void {
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
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    surfaceHighlight.name = 'tank-water-surface-highlight'
    surfaceHighlight.rotation.x = -Math.PI / 2
    surfaceHighlight.position.y = tankHeight / 2 - 0.39
    surfaceHighlight.renderOrder = 4
    surfaceHighlight.userData.baseOpacity = 0.2
    this.waterSurfaceHighlightMesh = surfaceHighlight
    this.tank.add(surfaceHighlight)
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
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.stroke !== 'function'
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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    ctx.lineWidth = 2
    for (let y = 24; y < canvas.height; y += 32) {
      ctx.beginPath()
      for (let x = 0; x <= canvas.width; x += 16) {
        const waveY = y + Math.sin((x / canvas.width) * Math.PI * 5.5) * 8
        if (x === 0) {
          ctx.moveTo(x, waveY)
        } else {
          ctx.lineTo(x, waveY)
        }
      }
      ctx.stroke()
    }

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
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.stroke !== 'function'
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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 3
    for (let y = 36; y < canvas.height; y += 54) {
      ctx.beginPath()
      for (let x = 0; x <= canvas.width; x += 18) {
        const waveY = y + Math.sin((x / canvas.width) * Math.PI * 7 + (y * 0.024)) * 10
        if (x === 0) {
          ctx.moveTo(x, waveY)
        } else {
          ctx.lineTo(x, waveY)
        }
      }
      ctx.stroke()
    }

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private createCausticsLayers(tankWidth: number, tankHeight: number, tankDepth: number): void {
    const causticsTexture = this.createCausticsTexture()
    const floorMaterial = new THREE.MeshBasicMaterial({
      map: causticsTexture,
      transparent: true,
      opacity: 0.12,
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
    floorCaustics.position.y = -tankHeight / 2 + 0.56
    floorCaustics.renderOrder = 2
    this.tank.add(floorCaustics)

    const backCaustics = new THREE.Mesh(
      new THREE.PlaneGeometry(tankWidth * 0.9, tankHeight * 0.65),
      floorMaterial.clone()
    )
    backCaustics.name = 'tank-caustics-back'
    backCaustics.position.set(0, -1.05, -tankDepth / 2 + 0.12)
    backCaustics.renderOrder = 2
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
    texture.repeat.set(2.2, 1.8)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.stroke !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < 18; i++) {
      const x = (i / 18) * canvas.width
      const gradient = ctx.createLinearGradient(x, 0, x + 60, canvas.height)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      gradient.addColorStop(0.45, 'rgba(237, 249, 255, 0.4)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.strokeStyle = gradient
      ctx.lineWidth = 16 + (i % 3) * 4
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(
        x + 24,
        canvas.height * 0.24,
        x - 30,
        canvas.height * 0.72,
        x + 16,
        canvas.height
      )
      ctx.stroke()
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

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.08 + (premiumTheme.surfaceGlowStrength * 0.26)
      this.waterSurfaceHighlightMesh.userData.baseOpacity = baseOpacity
      material.color = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#ffffff'), 0.52)
      material.opacity = baseOpacity
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = premiumTheme.causticsStrength * (index === 0 ? 0.38 : 0.26)
      material.needsUpdate = true
    })
  }

  private createSandTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    baseGradient.addColorStop(0, '#d8c4a4')
    baseGradient.addColorStop(0.55, '#cbb392')
    baseGradient.addColorStop(1, '#b79d7d')
    ctx.fillStyle = baseGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 3 + 1
      
      const hue = 28 + Math.random() * 12
      const saturation = 18 + Math.random() * 12
      const brightness = 0.62 + Math.random() * 0.16
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness * 100}%)`
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 6 + 2
      
      const hue = 24 + Math.random() * 16
      const saturation = 8 + Math.random() * 14
      const brightness = 0.42 + Math.random() * 0.2
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness * 100}%)`
      
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const edgeShade = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.18,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.62
    )
    edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    edgeShade.addColorStop(1, 'rgba(45, 31, 20, 0.18)')
    ctx.fillStyle = edgeShade
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
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
    const tankBounds = createOpenWaterBounds()
    this.aquascaping = new AquascapingSystem(this.scene, tankBounds)
  }

  private createAdvancedFishSystem(): void {
    const tankBounds = createOpenWaterBounds()
    this.fishSystem = new DetailedFishSystem(this.scene, tankBounds)
    if (this.pendingFishGroups) {
      this.fishSystem.setFishGroups(this.pendingFishGroups)
      this.pendingFishGroups = null
    }
  }

  private createAdvancedWaterEffects(): void {
    const tankBounds = createOpenWaterBounds()
    this.particleSystem = new EnhancedParticleSystem(this.scene, tankBounds)
  }
  
  private setupAdvancedPostProcessing(): void {
    if (!this.advancedEffectsEnabled) return
    
    // God rays effect
    this.godRaysEffect = new GodRaysEffect(
      this.renderer,
      this.scene,
      this.camera
    )
  }

  public animate = (): void => {
    const startTime = performance.now()
    
    this.animationId = requestAnimationFrame(this.animate)
    
    const deltaTime = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()
    
    // Reset render info
    this.renderer.info.reset()
    
    this.controls.update()
    
    if (this.motionEnabled) {
      if (this.fishSystem) {
        this.fishSystem.update(deltaTime, elapsedTime)
      }
      this.syncFishVisibleStat()
      
      if (this.particleSystem) {
        this.particleSystem.update(elapsedTime)
      }

      this.updateTankWaterMotion(elapsedTime)
      
      if (this.aquascaping) {
        this.aquascaping.update(elapsedTime)
      }
      
      if (this.spiralDecorations) {
        this.spiralDecorations.update(deltaTime)
      }
    }
    
    // Render with or without post-processing
    if (this.godRaysEffect && this.advancedEffectsEnabled) {
      this.godRaysEffect.update(elapsedTime)
      this.godRaysEffect.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
    
    // Update performance stats
    this.updatePerformanceStats(startTime)
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

    this.causticsMeshes.forEach((mesh, index) => {
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.offset.x = elapsedTime * (0.006 + (index * 0.002))
        material.map.offset.y = elapsedTime * (0.012 + (index * 0.002))
      }
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
  
  public setWaterQuality(quality: 'low' | 'medium' | 'high'): void {
    this.currentVisualQuality = quality
    const { width, height } = this.getViewportSize()
    const pixelRatioCap = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap))
    this.renderer.setSize(width, height)

    if (this.composer) {
      this.composer.setSize(width, height)
    }

    if (this.godRaysEffect) {
      this.godRaysEffect.resize(width, height)
    }

    this.renderer.shadowMap.enabled = quality !== 'low'

    if (this.fishSystem) {
      this.fishSystem.setQuality(quality)
    }

    this.applyVisualQuality(quality)
  }

  public applyTheme(theme: Theme): void {
    applyThemeToScene(this.scene, theme)
    this.applyTankTheme(theme)
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

  private applyVisualQuality(quality: 'low' | 'medium' | 'high'): void {
    const resolvedQuality = quality ?? 'high'
    this.ensureTankVisualLayers()

    this.glassPanes.forEach((pane, index) => {
      pane.visible = resolvedQuality !== 'low' || index === 0
      const material = pane.material as THREE.MeshPhysicalMaterial
      material.thickness = resolvedQuality === 'high' ? 0.42 : resolvedQuality === 'medium' ? 0.38 : 0.3
      material.attenuationDistance = resolvedQuality === 'high' ? 1.2 : resolvedQuality === 'medium' ? 1.45 : 1.75
      material.envMapIntensity = resolvedQuality === 'high' ? 1.32 : resolvedQuality === 'medium' ? 1.1 : 0.92
      material.opacity = index === 0
        ? resolvedQuality === 'high' ? 0.17 : resolvedQuality === 'medium' ? 0.14 : 0.12
        : resolvedQuality === 'high' ? 0.1 : resolvedQuality === 'medium' ? 0.08 : 0.05
      material.needsUpdate = true
    })

    if (this.waterVolumeMesh) {
      this.waterVolumeMesh.visible = resolvedQuality !== 'low'
      const material = this.waterVolumeMesh.material as THREE.MeshPhysicalMaterial
      material.thickness = resolvedQuality === 'high' ? 4.6 : resolvedQuality === 'medium' ? 4.1 : 3.6
      material.attenuationDistance = resolvedQuality === 'high' ? 2.2 : resolvedQuality === 'medium' ? 2.5 : 2.9
      material.envMapIntensity = resolvedQuality === 'high' ? 0.54 : resolvedQuality === 'medium' ? 0.42 : 0.28
      material.opacity = resolvedQuality === 'high' ? 0.12 : resolvedQuality === 'medium' ? 0.1 : 0.08
      material.needsUpdate = true
    }

    if (this.waterSurfaceMesh) {
      this.waterSurfaceMesh.visible = true
      const material = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial
      material.thickness = resolvedQuality === 'high' ? 1.24 : resolvedQuality === 'medium' ? 1.04 : 0.84
      material.attenuationDistance = resolvedQuality === 'high' ? 1.3 : resolvedQuality === 'medium' ? 1.55 : 1.9
      material.envMapIntensity = resolvedQuality === 'high' ? 1.46 : resolvedQuality === 'medium' ? 1.18 : 0.92
      material.opacity = resolvedQuality === 'high' ? 0.27 : resolvedQuality === 'medium' ? 0.24 : 0.2
      material.needsUpdate = true
    }

    if (this.frontGlassHighlightMesh) {
      const material = this.frontGlassHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.frontGlassHighlightMesh.userData.baseOpacity as number | undefined) ?? 0.16
      this.frontGlassHighlightMesh.visible = resolvedQuality !== 'low'
      material.opacity = resolvedQuality === 'high' ? baseOpacity : baseOpacity * 0.68
      material.needsUpdate = true
    }

    if (this.waterSurfaceHighlightMesh) {
      const material = this.waterSurfaceHighlightMesh.material as THREE.MeshBasicMaterial
      const baseOpacity = (this.waterSurfaceHighlightMesh.userData.baseOpacity as number | undefined) ?? 0.2
      this.waterSurfaceHighlightMesh.visible = resolvedQuality === 'high'
      material.opacity = resolvedQuality === 'high' ? baseOpacity : 0
      material.needsUpdate = true
    }

    this.causticsMeshes.forEach((mesh, index) => {
      if (resolvedQuality === 'low') {
        mesh.visible = false
        return
      }
      mesh.visible = resolvedQuality === 'high' || index === 0
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
