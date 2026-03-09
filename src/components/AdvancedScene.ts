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
    this.camera.position.set(0, 1.1, 14.5)
    this.camera.lookAt(0, -1.4, 0)
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
    // Underwater ambient lighting
    const ambientLight = new THREE.AmbientLight(0x4a90b8, 0.3)
    this.scene.add(ambientLight)
    
    // Main directional light (sunlight through water)
    const sunLight = new THREE.DirectionalLight(0xfff8dc, 1.2)
    sunLight.position.set(8, 15, 5)
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
    
    // Underwater color grading lights
    const underwaterLight1 = new THREE.PointLight(0x4a90e2, 0.6, 25)
    underwaterLight1.position.set(-8, 4, -8)
    this.scene.add(underwaterLight1)
    
    const underwaterLight2 = new THREE.PointLight(0x2ecc71, 0.4, 20)
    underwaterLight2.position.set(8, 4, 8)
    this.scene.add(underwaterLight2)
    
    const underwaterLight3 = new THREE.PointLight(0x3498db, 0.5, 15)
    underwaterLight3.position.set(0, -2, 0)
    this.scene.add(underwaterLight3)
    
    // Rim lighting for depth
    const rimLight = new THREE.DirectionalLight(0x87ceeb, 0.3)
    rimLight.position.set(-5, 8, -10)
    this.scene.add(rimLight)
  }

  private setupGradientBackground(): void {
    applyGradientBackground(this.scene)
  }

  private createAdvancedTank(): void {
    const tankWidth = 14
    const tankHeight = 14
    const tankDepth = 10
    const frameOffset = 0.2

    const frameGeometry = new THREE.BoxGeometry(
      tankWidth + frameOffset,
      tankHeight + frameOffset,
      tankDepth + frameOffset,
      1, 1, 1
    )
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.0,
      visible: false
    })
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial)
    this.tank.add(frameMesh)

    this.createSubstrate(tankWidth, tankHeight, tankDepth)
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
  }

  public applyTheme(theme: Theme): void {
    applyThemeToScene(this.scene, theme)
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
