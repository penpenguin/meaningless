import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BoidsSystem } from '../utils/Boids'

interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
  schoolSize: number
  behavior: 'schooling' | 'solitary' | 'territorial'
}

interface LODLevel {
  distance: number
  instanceCount: number
  quality: 'high' | 'medium' | 'low'
}

export class AdvancedFishSystem {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private fishGroups: Map<string, THREE.Group> = new Map()
  private instancedMeshes: Map<string, THREE.InstancedMesh[]> = new Map()
  private boidsSystems: Map<string, BoidsSystem> = new Map()
  private lodLevels: LODLevel[] = [
    { distance: 0, instanceCount: 100, quality: 'high' },
    { distance: 30, instanceCount: 60, quality: 'medium' },
    { distance: 50, instanceCount: 30, quality: 'low' }
  ]
  private dummy = new THREE.Object3D()
  private variants: FishVariant[]
  private bounds: THREE.Box3
  private totalFishCount: number
  private frustum = new THREE.Frustum()
  private cameraMatrix = new THREE.Matrix4()
  
  // Performance monitoring
  private renderStats = {
    visibleFish: 0,
    culledFish: 0,
    frameTime: 0
  }
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, bounds: THREE.Box3) {
    this.scene = scene
    this.camera = camera
    this.bounds = bounds
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.totalFishCount = isMobile ? 80 : 200
    
    this.variants = this.createFishVariants()
    this.initializeFishSystem()
  }
  
  private createFishVariants(): FishVariant[] {
    return [
      {
        name: 'TropicalSchool',
        primaryColor: new THREE.Color(0xff6b35),
        secondaryColor: new THREE.Color(0xffd700),
        scale: 0.8,
        speed: 1.2,
        schoolSize: 15,
        behavior: 'schooling'
      },
      {
        name: 'Angelfish',
        primaryColor: new THREE.Color(0x87ceeb),
        secondaryColor: new THREE.Color(0x4169e1),
        scale: 1.5,
        speed: 0.7,
        schoolSize: 3,
        behavior: 'territorial'
      },
      {
        name: 'NeonTetra',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.5,
        speed: 1.8,
        schoolSize: 25,
        behavior: 'schooling'
      },
      {
        name: 'SoloFish',
        primaryColor: new THREE.Color(0xffd700),
        secondaryColor: new THREE.Color(0xff8c00),
        scale: 1.2,
        speed: 0.5,
        schoolSize: 1,
        behavior: 'solitary'
      },
      {
        name: 'SplineGenerated',
        primaryColor: new THREE.Color(0x9370db),
        secondaryColor: new THREE.Color(0x8a2be2),
        scale: 1.0,
        speed: 1.0,
        schoolSize: 5,
        behavior: 'schooling'
      }
    ]
  }
  
  private initializeFishSystem(): void {
    let fishAllocated = 0
    
    console.log(`Initializing fish system with ${this.totalFishCount} total fish`)
    
    this.variants.forEach(variant => {
      const schoolCount = Math.ceil(this.totalFishCount * 0.2 / this.variants.length)
      const fishPerSchool = variant.schoolSize
      const totalFishForVariant = Math.min(schoolCount * fishPerSchool, this.totalFishCount - fishAllocated)
      
      if (totalFishForVariant <= 0) return
      
      console.log(`Creating ${totalFishForVariant} fish of type ${variant.name}`)
      
      // Use instanced rendering for all fish types
      this.createInstancedFishGroup(variant, totalFishForVariant)
      
      fishAllocated += totalFishForVariant
    })
    
    console.log(`Fish system initialized with ${fishAllocated} fish total`)
  }
  
  
  private createInstancedFishGroup(variant: FishVariant, count: number): void {
    const group = new THREE.Group()
    group.name = `${variant.name}_Group`
    
    // Create LOD levels for this variant
    const lodMeshes: THREE.InstancedMesh[] = []
    
    this.lodLevels.forEach(lod => {
      const instanceCount = Math.min(lod.instanceCount, count)
      const geometry = this.createFishGeometry(variant, lod.quality)
      const material = this.createAdvancedFishMaterial(variant, lod.quality)
      
      const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount)
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      instancedMesh.frustumCulled = false // We handle culling manually
      instancedMesh.castShadow = lod.quality === 'high'
      instancedMesh.receiveShadow = lod.quality === 'high'
      
      // Setup instance colors
      this.setupInstanceColors(instancedMesh, variant, instanceCount)
      
      // Setup custom attributes for animation
      this.setupCustomAttributes(instancedMesh, instanceCount)
      
      group.add(instancedMesh)
      lodMeshes.push(instancedMesh)
    })
    
    this.instancedMeshes.set(variant.name, lodMeshes)
    this.scene.add(group)
    this.fishGroups.set(variant.name, group)
    
    // Create boids system
    const boids = new BoidsSystem(count, this.bounds)
    // Configure boids behavior based on variant
    if (variant.behavior === 'schooling') {
      boids.setSeparation(0.5)
      boids.setAlignment(0.8)
      boids.setCohesion(0.3)
    } else if (variant.behavior === 'territorial') {
      boids.setSeparation(2.0)
      boids.setAlignment(0.2)
      boids.setCohesion(0.1)
    } else {
      boids.setSeparation(1.0)
      boids.setAlignment(0.1)
      boids.setCohesion(0.1)
    }
    this.boidsSystems.set(variant.name, boids)
  }
  
  private createFishGeometry(variant: FishVariant, quality: 'high' | 'medium' | 'low'): THREE.BufferGeometry {
    // Simple, reliable fish geometry using basic shapes
    const scale = variant.scale
    
    try {
      // Create main body (ellipsoid)
      const bodyGeometry = new THREE.SphereGeometry(0.3 * scale, 8, 6)
      
      // Transform to fish shape
      const positions = bodyGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const y = positions[i + 1] 
        const z = positions[i + 2]
        
        // Create fish body shape
        positions[i] = x * 2.5      // Longer body
        positions[i + 1] = y * 0.7  // Flatter
        positions[i + 2] = z * 0.8  // Narrower
      }
      
      // Add simple tail
      if (quality !== 'low') {
        const tailGeometry = new THREE.ConeGeometry(0.1 * scale, 0.6 * scale, 6)
        tailGeometry.rotateZ(Math.PI / 2)
        tailGeometry.translate(-0.8 * scale, 0, 0)
        
        // Safely merge geometries
        const geometries = [bodyGeometry, tailGeometry]
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries)
        
        if (mergedGeometry) {
          mergedGeometry.computeVertexNormals()
          return mergedGeometry
        }
      }
      
      bodyGeometry.attributes.position.needsUpdate = true
      bodyGeometry.computeVertexNormals()
      return bodyGeometry
      
    } catch (error) {
      console.warn('Failed to create fish geometry, using fallback:', error)
      // Fallback to simple box
      return new THREE.BoxGeometry(0.6 * scale, 0.2 * scale, 0.3 * scale)
    }
  }
  
  private createAdvancedFishMaterial(variant: FishVariant, quality: 'high' | 'medium' | 'low'): THREE.Material {
    if (quality === 'low') {
      // Simple material for distant fish
      const material = new THREE.MeshBasicMaterial({
        color: variant.primaryColor,
        transparent: true
      })
      
      // Store material for animation updates without custom shaders
      ;(material as any).userData = {
        time: 0,
        swimSpeed: 1.0,
        swimOffset: Math.random() * Math.PI * 2
      }
      
      return material
    }
    
    // Use standard material instead of custom shader to avoid shader errors
    const material = new THREE.MeshPhongMaterial({
      color: variant.primaryColor,
      shininess: 30,
      transparent: false
    })
    
    // Store material for animation updates without custom shaders
    ;(material as any).userData = {
      time: 0,
      swimSpeed: 1.0,
      swimOffset: Math.random() * Math.PI * 2
    }
    
    return material
  }
  
  private setupInstanceColors(mesh: THREE.InstancedMesh, variant: FishVariant, count: number): void {
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const hueVariation = (Math.random() - 0.5) * 0.1
      const satVariation = 0.8 + Math.random() * 0.2
      const lightVariation = 0.5 + Math.random() * 0.3
      
      const color = new THREE.Color()
      const hsl = variant.primaryColor.getHSL({ h: 0, s: 0, l: 0 })
      color.setHSL(
        (hsl.h + hueVariation) % 1,
        satVariation,
        lightVariation
      )
      
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
  }
  
  private setupCustomAttributes(mesh: THREE.InstancedMesh, count: number): void {
    const fishIds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      fishIds[i] = Math.random()
    }
    
    mesh.geometry.setAttribute('fishId', new THREE.InstancedBufferAttribute(fishIds, 1))
  }
  
  private updateLOD(): void {
    this.frustum.setFromProjectionMatrix(this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    ))
    
    this.renderStats.visibleFish = 0
    this.renderStats.culledFish = 0
    
    this.instancedMeshes.forEach((lodMeshes, variantName) => {
      const boids = this.boidsSystems.get(variantName)
      if (!boids) return
      
      lodMeshes.forEach((mesh, lodIndex) => {
        const lod = this.lodLevels[lodIndex]
        mesh.count = 0 // Reset count
        
        let instanceIndex = 0
        
        for (let i = 0; i < boids.boids.length && instanceIndex < lod.instanceCount; i++) {
          const boid = boids.boids[i]
          const distance = boid.position.distanceTo(this.camera.position)
          
          // Check if this LOD level should handle this distance
          const nextLOD = this.lodLevels[lodIndex + 1]
          if (distance < lod.distance || (nextLOD && distance >= nextLOD.distance)) {
            continue
          }
          
          // Frustum culling
          const boundingSphere = new THREE.Sphere(boid.position, 2)
          if (!this.frustum.intersectsSphere(boundingSphere)) {
            this.renderStats.culledFish++
            continue
          }
          
          this.renderStats.visibleFish++
          
          // Update instance matrix
          this.dummy.position.copy(boid.position)
          
          const direction = boid.velocity.clone().normalize()
          if (direction.length() > 0) {
            this.dummy.lookAt(
              boid.position.x + direction.x,
              boid.position.y + direction.y,
              boid.position.z + direction.z
            )
          }
          
          this.dummy.updateMatrix()
          mesh.setMatrixAt(instanceIndex, this.dummy.matrix)
          instanceIndex++
        }
        
        mesh.count = instanceIndex
        mesh.instanceMatrix.needsUpdate = true
      })
    })
  }
  
  update(deltaTime: number): void {
    const startTime = performance.now()
    
    // Update boids systems
    this.boidsSystems.forEach(boids => {
      boids.update()
    })
    
    // Spline fish removed - using instanced fish only
    
    // Update LOD and instance matrices
    this.updateLOD()
    
    // Update material animation parameters
    const time = performance.now() * 0.001
    this.instancedMeshes.forEach(lodMeshes => {
      lodMeshes.forEach(mesh => {
        const material = mesh.material as THREE.MeshPhongMaterial
        if ((material as any).userData) {
          (material as any).userData.time = time
        }
      })
    })
    
    this.renderStats.frameTime = performance.now() - startTime
  }
  
  setMotionEnabled(enabled: boolean): void {
    this.boidsSystems.forEach(boids => {
      if (!enabled) {
        boids.boids.forEach(boid => {
          boid.velocity.multiplyScalar(0)
          boid.acceleration.multiplyScalar(0)
        })
      }
    })
  }
  
  getRenderStats(): typeof this.renderStats {
    return this.renderStats
  }
  
  dispose(): void {
    this.fishGroups.forEach(group => {
      this.scene.remove(group)
    })
    
    this.instancedMeshes.forEach(lodMeshes => {
      lodMeshes.forEach(mesh => {
        mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      })
    })
    
    // Spline fish removed
  }
}