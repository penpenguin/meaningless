import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from './DetailedFish'
import { WaterSurface } from './Water'
import { EnhancedParticleSystem } from './EnhancedParticles'
import { EnvironmentLoader } from './Environment'
import { AquascapingSystem } from './Aquascaping'
import { VolumetricLighting } from './VolumetricLighting'
import { SpatialAudioManager } from './SpatialAudio'
import { AmbientOcclusionRenderer } from './AmbientOcclusion'

export class AquariumScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock
  private tank: THREE.Group
  private fishSystem: DetailedFishSystem | null = null
  private waterSurface: WaterSurface | null = null
  private particleSystem: EnhancedParticleSystem | null = null
  private aquascaping: AquascapingSystem | null = null
  private environmentLoader: EnvironmentLoader
  private volumetricLighting: VolumetricLighting | null = null
  private spatialAudio: SpatialAudioManager | null = null
  private causticLights: THREE.PointLight[] = []
  private ambientOcclusion: AmbientOcclusionRenderer | null = null
  private animationId: number | null = null
  public motionEnabled = true

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 25)
    
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
    this.renderer.shadowMap.autoUpdate = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Enhanced renderer settings for better visual quality
    this.renderer.useLegacyLights = false
    container.appendChild(this.renderer.domElement)
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.02
    this.controls.minDistance = 15
    this.controls.maxDistance = 50
    this.controls.maxPolarAngle = Math.PI * 0.6
    this.controls.minPolarAngle = Math.PI * 0.2
    this.controls.enablePan = false
    
    this.tank = new THREE.Group()
    this.scene.add(this.tank)
    
    this.environmentLoader = new EnvironmentLoader(this.scene)
    
    this.init()
  }
  
  private async init(): Promise<void> {
    await this.environmentLoader.loadHDRI()
    this.setupLighting()
    this.createTank()
    this.createAquascaping()
    this.createFishSystem()
    this.createWaterEffects()
    this.setupVolumetricLighting()
    this.setupSpatialAudio()
    this.setupAmbientOcclusion()
    this.connectSpatialAudio()
    this.setupEventListeners()
  }

  private setupLighting(): void {
    // Underwater ambient lighting with depth-based color shift
    const ambientLight = new THREE.AmbientLight(0x4a7c8a, 0.3) // Darker blue ambient
    this.scene.add(ambientLight)
    
    // Main sunlight from above (directional light)
    const sunLight = new THREE.DirectionalLight(0xfff5e1, 1.2) // Warm sunlight
    sunLight.position.set(0, 15, 8)
    sunLight.target.position.set(0, 0, 0)
    sunLight.castShadow = true
    
    // Enhanced shadow settings for crisp shadows
    sunLight.shadow.camera.near = 0.1
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -15
    sunLight.shadow.camera.right = 15
    sunLight.shadow.camera.top = 15
    sunLight.shadow.camera.bottom = -15
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.bias = -0.0005
    sunLight.shadow.normalBias = 0.02
    
    this.scene.add(sunLight)
    this.scene.add(sunLight.target)
    
    // Aquarium tank lights (LED strip simulation)
    const tankLight1 = new THREE.SpotLight(0x87ceeb, 0.8, 25, Math.PI / 6, 0.5)
    tankLight1.position.set(-8, 8, 0)
    tankLight1.target.position.set(0, -2, 0)
    tankLight1.castShadow = true
    tankLight1.shadow.mapSize.width = 1024
    tankLight1.shadow.mapSize.height = 1024
    tankLight1.shadow.bias = -0.0001
    
    const tankLight2 = new THREE.SpotLight(0x87ceeb, 0.8, 25, Math.PI / 6, 0.5)
    tankLight2.position.set(8, 8, 0)
    tankLight2.target.position.set(0, -2, 0)
    tankLight2.castShadow = true
    tankLight2.shadow.mapSize.width = 1024
    tankLight2.shadow.mapSize.height = 1024
    tankLight2.shadow.bias = -0.0001
    
    this.scene.add(tankLight1)
    this.scene.add(tankLight1.target)
    this.scene.add(tankLight2)
    this.scene.add(tankLight2.target)
    
    // Underwater caustic light (moving point lights)
    for (let i = 0; i < 3; i++) {
      const causticLight = new THREE.PointLight(0x87ceeb, 0.3, 12)
      causticLight.position.set(
        (Math.random() - 0.5) * 16,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 12
      )
      causticLight.userData = {
        originalPosition: causticLight.position.clone(),
        offset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.0
      }
      this.scene.add(causticLight)
      this.causticLights = this.causticLights || []
      this.causticLights.push(causticLight)
    }
    
    // Rim lighting for depth perception
    const rimLight = new THREE.DirectionalLight(0x6bb6ff, 0.4)
    rimLight.position.set(-10, 5, -10)
    this.scene.add(rimLight)
  }

  private createTank(): void {
    const tankWidth = 20
    const tankHeight = 12
    const tankDepth = 16
    const glassThickness = 0.1
    
    const envMap = this.environmentLoader.getEnvironmentMap()
    
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.01,
      transmission: 0.95,
      thickness: glassThickness * 8,
      transparent: true,
      opacity: 0.05,
      reflectivity: 0.9,
      ior: 1.52,
      envMap: envMap,
      envMapIntensity: 2.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      
      // Enhanced glass appearance
      iridescence: 0.1,
      iridescenceIOR: 1.3
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
  
  private createAquascaping(): void {
    const tankBounds = new THREE.Box3(
      new THREE.Vector3(-9.5, -5.5, -7.5),
      new THREE.Vector3(9.5, 5.5, 7.5)
    )
    this.aquascaping = new AquascapingSystem(this.scene, tankBounds)
  }

  private createFishSystem(): void {
    const tankBounds = new THREE.Box3(
      new THREE.Vector3(-9.5, -5.5, -7.5),
      new THREE.Vector3(9.5, 5.5, 7.5)
    )
    this.fishSystem = new DetailedFishSystem(this.scene, tankBounds)
  }

  private createWaterEffects(): void {
    this.waterSurface = new WaterSurface(this.scene, 20, 16, 5.8)
    
    const tankBounds = new THREE.Box3(
      new THREE.Vector3(-9.5, -5.5, -7.5),
      new THREE.Vector3(9.5, 5.5, 7.5)
    )
    this.particleSystem = new EnhancedParticleSystem(this.scene, tankBounds)
  }
  
  private setupVolumetricLighting(): void {
    this.volumetricLighting = new VolumetricLighting(this.renderer, this.scene, this.camera)
    
    // Position the light source to create beautiful god rays
    const lightPosition = new THREE.Vector3(5, 8, 5)
    this.volumetricLighting.setLightPosition(lightPosition)
  }
  
  private setupSpatialAudio(): void {
    this.spatialAudio = new SpatialAudioManager()
  }
  
  private setupAmbientOcclusion(): void {
    this.ambientOcclusion = new AmbientOcclusionRenderer(
      this.renderer,
      this.scene,
      this.camera
    )
  }
  
  private connectSpatialAudio(): void {
    if (this.spatialAudio && this.particleSystem) {
      this.particleSystem.setSpatialAudio(this.spatialAudio, this.camera)
    }
  }
  
  private updateCausticLights(time: number): void {
    this.causticLights.forEach((light, _index) => {
      const userData = light.userData
      if (userData.originalPosition && userData.offset !== undefined && userData.speed !== undefined) {
        // Create flowing caustic movement
        const x = userData.originalPosition.x + Math.sin(time * userData.speed + userData.offset) * 2
        const y = userData.originalPosition.y + Math.sin(time * userData.speed * 0.7 + userData.offset) * 0.5
        const z = userData.originalPosition.z + Math.cos(time * userData.speed * 0.8 + userData.offset) * 1.5
        
        light.position.set(x, y, z)
        
        // Vary intensity for more dynamic effect
        const intensity = 0.2 + Math.sin(time * userData.speed * 2 + userData.offset) * 0.1
        light.intensity = intensity
      }
    })
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
    
    // Update spatial audio listener position
    if (this.spatialAudio) {
      this.spatialAudio.updateListenerPosition(this.camera)
    }
    
    if (this.fishSystem) {
      this.fishSystem.update(deltaTime, elapsedTime)
    }
    
    // Update caustic lighting animation
    this.updateCausticLights(elapsedTime)
    
    if (this.waterSurface) {
      this.waterSurface.update(elapsedTime, this.camera.position)
      
      // Pass fish data to water for ripple effects
      if (this.fishSystem) {
        const fishPositions = this.fishSystem.getFishPositions()
        const fishVelocities = this.fishSystem.getFishVelocities()
        this.waterSurface.updateFishData(fishPositions, fishVelocities)
      }
    }
    
    if (this.particleSystem) {
      this.particleSystem.update(elapsedTime)
      
      // Pass fish data for bubble trails
      if (this.fishSystem) {
        const fishPositions = this.fishSystem.getFishPositions()
        const fishVelocities = this.fishSystem.getFishVelocities()
        this.particleSystem.updateFishData(fishPositions, fishVelocities)
      }
    }
    
    if (this.aquascaping) {
      this.aquascaping.update(elapsedTime)
      
      // Pass fish data for plant swaying effects
      if (this.fishSystem) {
        const fishPositions = this.fishSystem.getFishPositions()
        const fishVelocities = this.fishSystem.getFishVelocities()
        this.aquascaping.updateFishData(fishPositions, fishVelocities)
      }
    }
    
    // Update and render with post-processing
    if (this.volumetricLighting && this.ambientOcclusion) {
      this.volumetricLighting.update(this.camera, elapsedTime)
      
      // Pass fish data for dynamic light effects
      if (this.fishSystem) {
        const fishPositions = this.fishSystem.getFishPositions()
        this.volumetricLighting.updateFishData(fishPositions)
      }
      
      // Render with ambient occlusion for enhanced depth
      this.ambientOcclusion.render()
    } else if (this.volumetricLighting) {
      this.volumetricLighting.update(this.camera, elapsedTime)
      
      if (this.fishSystem) {
        const fishPositions = this.fishSystem.getFishPositions()
        this.volumetricLighting.updateFishData(fishPositions)
      }
      
      this.volumetricLighting.render()
    } else if (this.ambientOcclusion) {
      this.ambientOcclusion.render()
    } else {
      this.renderer.render(this.scene, this.camera)
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
    if (this.spatialAudio) {
      this.spatialAudio.setEnabled(enabled)
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    
    if (this.volumetricLighting) {
      this.volumetricLighting.resize(window.innerWidth, window.innerHeight)
    }
    
    if (this.ambientOcclusion) {
      this.ambientOcclusion.resize(window.innerWidth, window.innerHeight)
    }
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    
    if (this.volumetricLighting) {
      this.volumetricLighting.dispose()
    }
    
    if (this.ambientOcclusion) {
      this.ambientOcclusion.dispose()
    }
    
    if (this.spatialAudio) {
      this.spatialAudio.dispose()
    }
    
    this.renderer.dispose()
    this.controls.dispose()
  }
}