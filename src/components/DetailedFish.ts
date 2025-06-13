import * as THREE from 'three'
import { BoidsSystem } from '../utils/Boids'

interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
}

export class DetailedFishSystem {
  private group: THREE.Group
  private instancedMeshes: THREE.InstancedMesh[] = []
  private boids: BoidsSystem
  private fishCount: number
  private dummy = new THREE.Object3D()
  private variants: FishVariant[]
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.fishCount = isMobile ? 50 : 120
    
    console.log('Creating fish system with', this.fishCount, 'fish')
    
    // Add click handler for feeding
    this.setupInteraction(scene)
    
    this.variants = this.createFishVariants()
    this.boids = new BoidsSystem(this.fishCount, bounds)
    
    console.log('Created boids system with', this.boids.boids.length, 'boids')
    
    this.createDetailedFishMeshes()
    
    console.log('Created fish meshes. Group has', this.group.children.length, 'children')
  }
  
  private createFishVariants(): FishVariant[] {
    return [
      {
        name: 'Tropical',
        primaryColor: new THREE.Color(0xff6b35),
        secondaryColor: new THREE.Color(0xffd700),
        scale: 1.0,
        speed: 1.0
      },
      {
        name: 'Angelfish',
        primaryColor: new THREE.Color(0x87ceeb),
        secondaryColor: new THREE.Color(0x4169e1),
        scale: 1.3,
        speed: 0.8
      },
      {
        name: 'Neon',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.7,
        speed: 1.5
      },
      {
        name: 'Goldfish',
        primaryColor: new THREE.Color(0xffd700),
        secondaryColor: new THREE.Color(0xff8c00),
        scale: 1.1,
        speed: 0.9
      }
    ]
  }
  
  private createDetailedFishMeshes(): void {
    const fishPerVariant = Math.ceil(this.fishCount / this.variants.length)
    
    console.log('Creating fish meshes. Fish per variant:', fishPerVariant)
    
    this.variants.forEach((variant, variantIndex) => {
      const actualCount = Math.min(fishPerVariant, this.fishCount - variantIndex * fishPerVariant)
      console.log(`Variant ${variantIndex} (${variant.name}): creating ${actualCount} fish`)
      
      if (actualCount <= 0) return
      
      const fishGeometry = this.createDetailedFishGeometry(variant)
      const fishMaterial = this.createFishMaterial(variant)
      
      console.log('Created geometry and material for', variant.name)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      
      // Enhanced shadow settings for realistic fish shadows
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      instancedMesh.frustumCulled = true
      
      // 個体差のある色を設定
      const colors = new Float32Array(actualCount * 3)
      for (let i = 0; i < actualCount; i++) {
        const hue = Math.random() * 0.1 - 0.05
        const saturation = 0.8 + Math.random() * 0.2
        const lightness = 0.5 + Math.random() * 0.3
        
        const color = new THREE.Color()
        const hslRef = { h: 0, s: 0, l: 0 }
        variant.primaryColor.getHSL(hslRef)
        color.setHSL(
          (hslRef.h + hue) % 1,
          saturation,
          lightness
        )
        
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }
      
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
      this.instancedMeshes.push(instancedMesh)
      this.group.add(instancedMesh)
      
      console.log('Added instanced mesh to group. Mesh count:', instancedMesh.count)
    })
  }
  
  private createDetailedFishGeometry(variant: FishVariant): THREE.BufferGeometry {
    // Use simpler but visible fish geometry first
    return this.createSimpleReliableFish(variant)
  }
  
  private createSimpleReliableFish(variant: FishVariant): THREE.BufferGeometry {
    // Create simple but visible fish body - start with basic ellipsoid
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 12)
    
    // Simple fish-like deformation
    const positions = bodyGeometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      
      // Simple fish shape - elongate along x-axis and taper toward tail
      const fishLength = 1.2
      const fishHeight = 0.6
      const fishWidth = 0.4
      
      // Taper factor (smaller toward the tail)
      const taper = 1.0 - Math.max(0, x + 0.3) * 0.8
      
      const newX = x * fishLength
      const newY = y * fishHeight * Math.max(0.3, taper)
      const newZ = z * fishWidth * Math.max(0.3, taper)
      
      positions.setXYZ(i, newX, newY, newZ)
    }
    
    // Add simple tail
    const tailGeometry = new THREE.ConeGeometry(0.15, 0.4, 8)
    tailGeometry.rotateZ(Math.PI / 2)
    tailGeometry.translate(-0.6, 0, 0)
    
    // Merge body and tail using BufferGeometryUtils
    const mergedGeometry = new THREE.BufferGeometry()
    
    // Simple merge - just copy body geometry for now
    mergedGeometry.copy(bodyGeometry)
    
    // Recompute after modifications
    mergedGeometry.computeVertexNormals()
    mergedGeometry.computeBoundingBox()
    mergedGeometry.computeBoundingSphere()
    
    // Apply variant scale
    mergedGeometry.scale(variant.scale, variant.scale, variant.scale)
    
    return mergedGeometry
  }
  
  // Removed complex geometry helper functions for now - can add back once basic visibility is confirmed
  
  private createFishMaterial(variant: FishVariant): THREE.MeshPhysicalMaterial {
    return this.createSimpleVisibleMaterial(variant)
  }
  
  private createSimpleVisibleMaterial(variant: FishVariant): THREE.MeshPhysicalMaterial {
    // Simple but effective material that we know will work
    return new THREE.MeshPhysicalMaterial({
      color: variant.primaryColor,
      metalness: 0.1,
      roughness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      
      // Basic subsurface scattering
      transmission: 0.1,
      thickness: 0.5,
      
      // Make sure it's visible
      transparent: false,
      side: THREE.FrontSide,
      
      // Enable shadows
      flatShading: false
    })
  }
  
  // Removed complex texture generation functions for now - using simple color materials
  
  update(deltaTime: number, elapsedTime: number): void {
    this.boids.update(deltaTime)
    
    let boidIndex = 0
    
    this.instancedMeshes.forEach((mesh, meshIndex) => {
      const variant = this.variants[meshIndex]
      const instanceCount = mesh.count
      
      for (let i = 0; i < instanceCount && boidIndex < this.boids.boids.length; i++, boidIndex++) {
        const boid = this.boids.boids[boidIndex]
        
        this.dummy.position.copy(boid.position)
        
        // 泳ぎの方向に向ける
        const direction = boid.velocity.clone().normalize()
        if (direction.length() > 0) {
          this.dummy.lookAt(
            boid.position.x + direction.x,
            boid.position.y + direction.y,
            boid.position.z + direction.z
          )
        }
        
        // 体の揺れ
        const wiggleSpeed = variant.speed * 8
        const wiggle = Math.sin(elapsedTime * wiggleSpeed + boidIndex) * 0.08
        this.dummy.rotation.z += wiggle
        
        // 尾ひれの動き
        const tailWave = Math.sin(elapsedTime * wiggleSpeed * 2 + boidIndex) * 0.15
        this.dummy.rotation.y += tailWave
        
        // 速度に応じたピッチング
        const speed = boid.velocity.length()
        this.dummy.rotation.x += speed * 0.3
        
        // Tired fish droop slightly
        if (boid.energy < 0.5) {
          this.dummy.rotation.x += (0.5 - boid.energy) * 0.2
        }
        
        // Scale based on fish size and variant
        const baseScale = variant.scale * boid.size
        const breathingScale = baseScale * (0.95 + Math.sin(elapsedTime * 2 + boidIndex) * 0.05)
        this.dummy.scale.set(breathingScale, breathingScale, breathingScale)
        
        // Leader fish glow effect
        if (boid.isLeader) {
          // Leaders are slightly brighter
          const instanceColors = mesh.instanceColor
          if (instanceColors) {
            const color = new THREE.Color()
            color.setRGB(
              instanceColors.array[i * 3],
              instanceColors.array[i * 3 + 1],
              instanceColors.array[i * 3 + 2]
            )
            const brightness = 1.2 + Math.sin(elapsedTime * 3) * 0.1
            color.multiplyScalar(brightness)
            instanceColors.setXYZ(i, color.r, color.g, color.b)
            instanceColors.needsUpdate = true
          }
        }
        
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }
      
      mesh.instanceMatrix.needsUpdate = true
      
      // Material uniforms update removed for simplicity - can add back later if needed
    })
  }
  
  private setupInteraction(scene: THREE.Scene): void {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    const handleClick = (event: MouseEvent) => {
      // Convert mouse position to normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
      
      // Update the picking ray with the camera and mouse position
      const camera = scene.getObjectByProperty('type', 'PerspectiveCamera') as THREE.PerspectiveCamera
      if (!camera) return
      
      raycaster.setFromCamera(mouse, camera)
      
      // Create an invisible plane at water surface for intersection
      const planeGeometry = new THREE.PlaneGeometry(100, 100)
      const planeMaterial = new THREE.MeshBasicMaterial({ visible: false })
      const plane = new THREE.Mesh(planeGeometry, planeMaterial)
      plane.rotation.x = -Math.PI / 2
      plane.position.y = 4 // Water surface level
      
      const intersects = raycaster.intersectObject(plane)
      
      if (intersects.length > 0) {
        const point = intersects[0].point
        // Add feeding point at click location
        this.boids.addFeedingPoint(point)
        
        // Visual feedback - create ripple effect
        this.createFeedingRipple(scene, point)
      }
    }
    
    window.addEventListener('click', handleClick)
  }
  
  private createFeedingRipple(scene: THREE.Scene, position: THREE.Vector3): void {
    const rippleGeometry = new THREE.RingGeometry(0.1, 0.5, 32)
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0x4169e1,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
    ripple.position.copy(position)
    ripple.position.y += 0.1
    ripple.rotation.x = -Math.PI / 2
    scene.add(ripple)
    
    // Animate ripple
    const startTime = Date.now()
    const animateRipple = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const scale = 1 + elapsed * 3
      ripple.scale.set(scale, scale, 1)
      rippleMaterial.opacity = Math.max(0, 0.6 - elapsed * 0.6)
      
      if (elapsed < 1) {
        requestAnimationFrame(animateRipple)
      } else {
        scene.remove(ripple)
        ripple.geometry.dispose()
        rippleMaterial.dispose()
      }
    }
    animateRipple()
  }
  
  setMotionEnabled(enabled: boolean): void {
    if (!enabled) {
      for (const boid of this.boids.boids) {
        boid.velocity.multiplyScalar(0)
        boid.acceleration.multiplyScalar(0)
      }
    }
  }
  
  getFishPositions(): THREE.Vector3[] {
    return this.boids.boids.map(boid => boid.position.clone())
  }
  
  getFishVelocities(): THREE.Vector3[] {
    return this.boids.boids.map(boid => boid.velocity.clone())
  }
}