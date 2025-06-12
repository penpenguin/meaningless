import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FishSystem } from './Fish'
import { WaterSurface } from './Water'
import { BubbleSystem } from './Bubbles'

export class AquariumScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock
  private tank: THREE.Group
  private fishSystem: FishSystem | null = null
  private waterSurface: WaterSurface | null = null
  private bubbleSystem: BubbleSystem | null = null
  private animationId: number | null = null
  public motionEnabled = true

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 5, 15)
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 5
    this.controls.maxDistance = 30
    this.controls.maxPolarAngle = Math.PI * 0.8
    
    this.tank = new THREE.Group()
    this.scene.add(this.tank)
    
    this.setupLighting()
    this.createTank()
    this.createFishSystem()
    this.createWaterEffects()
    this.setupEventListeners()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x6ac7d6, 0.4)
    this.scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)
    
    const pointLight1 = new THREE.PointLight(0x6ac7d6, 0.5, 20)
    pointLight1.position.set(-5, 3, -5)
    this.scene.add(pointLight1)
    
    const pointLight2 = new THREE.PointLight(0x4a9eb2, 0.5, 20)
    pointLight2.position.set(5, 3, 5)
    this.scene.add(pointLight2)
  }

  private createTank(): void {
    const tankWidth = 10
    const tankHeight = 6
    const tankDepth = 8
    const glassThickness = 0.05
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 0.95,
      thickness: glassThickness,
      transparent: true,
      opacity: 0.3,
      reflectivity: 0.5,
      ior: 1.5,
      side: THREE.DoubleSide
    })
    
    const glassGeometry = new THREE.BoxGeometry(
      tankWidth, 
      tankHeight, 
      tankDepth,
      1, 1, 1
    )
    
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial)
    glassMesh.castShadow = true
    glassMesh.receiveShadow = true
    this.tank.add(glassMesh)
    
    const bottomGeometry = new THREE.BoxGeometry(
      tankWidth - glassThickness * 2,
      0.2,
      tankDepth - glassThickness * 2
    )
    const bottomMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a4d5a,
      roughness: 0.8,
      metalness: 0.1
    })
    const bottomMesh = new THREE.Mesh(bottomGeometry, bottomMaterial)
    bottomMesh.position.y = -tankHeight / 2 + 0.1
    bottomMesh.receiveShadow = true
    this.tank.add(bottomMesh)
    
    const sandGeometry = new THREE.PlaneGeometry(
      tankWidth - glassThickness * 2,
      tankDepth - glassThickness * 2
    )
    const sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8d5b8,
      roughness: 1,
      metalness: 0,
      normalScale: new THREE.Vector2(0.5, 0.5)
    })
    const sandMesh = new THREE.Mesh(sandGeometry, sandMaterial)
    sandMesh.rotation.x = -Math.PI / 2
    sandMesh.position.y = -tankHeight / 2 + 0.21
    sandMesh.receiveShadow = true
    this.tank.add(sandMesh)
  }

  private createFishSystem(): void {
    const tankBounds = new THREE.Box3(
      new THREE.Vector3(-4.5, -2.5, -3.5),
      new THREE.Vector3(4.5, 2.5, 3.5)
    )
    this.fishSystem = new FishSystem(this.scene, tankBounds)
  }

  private createWaterEffects(): void {
    this.waterSurface = new WaterSurface(this.scene, 10, 8, 2.8)
    
    const tankBounds = new THREE.Box3(
      new THREE.Vector3(-4.5, -2.5, -3.5),
      new THREE.Vector3(4.5, 2.5, 3.5)
    )
    this.bubbleSystem = new BubbleSystem(this.scene, tankBounds)
  }

  public animate = (): void => {
    if (!this.motionEnabled) {
      this.animationId = requestAnimationFrame(this.animate)
      return
    }
    
    this.animationId = requestAnimationFrame(this.animate)
    
    const deltaTime = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()
    
    this.controls.update()
    
    if (this.fishSystem) {
      this.fishSystem.update(deltaTime, elapsedTime)
    }
    
    if (this.waterSurface) {
      this.waterSurface.update(elapsedTime, this.camera.position)
    }
    
    if (this.bubbleSystem) {
      this.bubbleSystem.update(elapsedTime)
    }
    
    this.renderer.render(this.scene, this.camera)
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
    if (this.bubbleSystem) {
      this.bubbleSystem.setEnabled(enabled)
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    this.renderer.dispose()
    this.controls.dispose()
  }
}