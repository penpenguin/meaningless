import * as THREE from 'three'

export class AquascapingSystem {
  private group: THREE.Group
  private plants: THREE.Group[] = []
  private decorations: THREE.Group[] = []
  private time = 0
  private fishPositions: THREE.Vector3[] = []
  private fishVelocities: THREE.Vector3[] = []
  private fishInfluences: Map<THREE.Object3D, { force: number; direction: THREE.Vector3 }> = new Map()
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    this.createCorals(bounds)
    this.createRocks(bounds)
    this.createSandDetails(bounds)
  }
  
  private createSeaweed(bounds: THREE.Box3): void {
    const seaweedCount = 15
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < seaweedCount; i++) {
      const seaweedGroup = new THREE.Group()
      
      const x = (Math.random() - 0.5) * size.x * 0.7
      const z = (Math.random() - 0.5) * size.z * 0.7
      const y = bounds.min.y + 0.1
      
      seaweedGroup.position.set(x, y, z)
      
      const height = 2 + Math.random() * 3
      const segments = Math.floor(height * 3)
      
      for (let j = 0; j < segments; j++) {
        const segmentHeight = height / segments
        const width = 0.1 + (segments - j) * 0.02
        
        const geometry = new THREE.CylinderGeometry(
          width * 0.3, 
          width, 
          segmentHeight, 
          6
        )
        
        const hue = 0.3 + Math.random() * 0.2 // Green variations
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color().setHSL(hue, 0.7, 0.3),
          metalness: 0,
          roughness: 0.8,
          transmission: 0.3,
          thickness: 0.1,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
        
        const segment = new THREE.Mesh(geometry, material)
        segment.position.y = j * segmentHeight + segmentHeight / 2
        segment.rotation.z = Math.sin(j * 0.5) * 0.2
        
        // Enhanced shadow settings for plants
        segment.castShadow = true
        segment.receiveShadow = true
        segment.userData = { 
          originalRotation: segment.rotation.z,
          swayOffset: Math.random() * Math.PI * 2,
          swayAmplitude: 0.1 + Math.random() * 0.1,
          segmentIndex: j,
          maxSegments: segments,
          flexibility: 1.0 - (j / segments) * 0.3 // Top segments are more flexible
        }
        
        seaweedGroup.add(segment)
      }
      
      this.plants.push(seaweedGroup)
      this.group.add(seaweedGroup)
    }
  }
  
  private createCorals(bounds: THREE.Box3): void {
    const coralCount = 8
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < coralCount; i++) {
      const coralGroup = new THREE.Group()
      
      const x = (Math.random() - 0.5) * size.x * 0.6
      const z = (Math.random() - 0.5) * size.z * 0.6
      const y = bounds.min.y + 0.1
      
      coralGroup.position.set(x, y, z)
      
      // Branch coral structure
      const branchCount = 3 + Math.floor(Math.random() * 4)
      
      for (let j = 0; j < branchCount; j++) {
        const branchHeight = 0.5 + Math.random() * 1.5
        const branchRadius = 0.05 + Math.random() * 0.03
        
        const geometry = new THREE.ConeGeometry(
          branchRadius * 2,
          branchHeight,
          6
        )
        
        const coralColors = [
          new THREE.Color(0xff6b47),
          new THREE.Color(0xff8c69),
          new THREE.Color(0xffa500),
          new THREE.Color(0xff69b4)
        ]
        
        const material = new THREE.MeshPhysicalMaterial({
          color: coralColors[Math.floor(Math.random() * coralColors.length)],
          metalness: 0,
          roughness: 0.9,
          clearcoat: 0.3,
          clearcoatRoughness: 0.8
        })
        
        const branch = new THREE.Mesh(geometry, material)
        branch.position.y = branchHeight / 2
        branch.rotation.x = (Math.random() - 0.5) * 0.5
        branch.rotation.z = (Math.random() - 0.5) * 0.5
        branch.rotation.y = (j / branchCount) * Math.PI * 2 + Math.random() * 0.5
        
        // Enhanced shadow settings for corals
        branch.castShadow = true
        branch.receiveShadow = true
        
        coralGroup.add(branch)
      }
      
      this.decorations.push(coralGroup)
      this.group.add(coralGroup)
    }
  }
  
  private createRocks(bounds: THREE.Box3): void {
    const rockCount = 12
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < rockCount; i++) {
      const rockScale = 0.3 + Math.random() * 0.8
      
      // Irregular rock shape
      const geometry = new THREE.DodecahedronGeometry(rockScale)
      
      // Deform the geometry for natural look
      const positionAttribute = geometry.getAttribute('position')
      for (let j = 0; j < positionAttribute.count; j++) {
        const vertex = new THREE.Vector3()
        vertex.fromBufferAttribute(positionAttribute, j)
        
        const noise = (Math.random() - 0.5) * 0.3
        vertex.multiplyScalar(1 + noise)
        
        positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z)
      }
      geometry.computeVertexNormals()
      
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(
          0.1 + Math.random() * 0.1, // Brown-gray hues
          0.2 + Math.random() * 0.3,
          0.2 + Math.random() * 0.3
        ),
        metalness: 0.1,
        roughness: 0.9,
        bumpScale: 0.5
      })
      
      const rock = new THREE.Mesh(geometry, material)
      
      const x = (Math.random() - 0.5) * size.x * 0.8
      const z = (Math.random() - 0.5) * size.z * 0.8
      const y = bounds.min.y + rockScale * 0.3
      
      rock.position.set(x, y, z)
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      
      // Enhanced shadow settings for rocks
      rock.castShadow = true
      rock.receiveShadow = true
      
      this.decorations.push(new THREE.Group().add(rock))
      this.group.add(rock)
    }
  }
  
  private createSandDetails(bounds: THREE.Box3): void {
    // Sand ripples
    const rippleGeometry = new THREE.PlaneGeometry(1, 0.1, 10, 1)
    const rippleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8d5b8,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.3
    })
    
    for (let i = 0; i < 20; i++) {
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
      ripple.rotation.x = -Math.PI / 2
      ripple.rotation.z = Math.random() * Math.PI
      
      const size = new THREE.Vector3()
      bounds.getSize(size)
      
      ripple.position.set(
        (Math.random() - 0.5) * size.x * 0.9,
        bounds.min.y + 0.01,
        (Math.random() - 0.5) * size.z * 0.9
      )
      
      const scale = 0.5 + Math.random() * 2
      ripple.scale.set(scale, 1, scale)
      
      this.group.add(ripple)
    }
  }
  
  update(elapsedTime: number): void {
    this.time = elapsedTime
    
    // Update fish influences on plants
    this.updateFishInfluences()
    
    // Animate seaweed swaying with fish proximity effects
    this.plants.forEach((plant) => {
      plant.children.forEach((segment, segmentIndex) => {
        if (segment.userData.originalRotation !== undefined) {
          const swayOffset = segment.userData.swayOffset || 0
          const swayAmplitude = segment.userData.swayAmplitude || 0.1
          const flexibility = segment.userData.flexibility || 1.0
          
          // Base swaying motion
          let sway = Math.sin(this.time * 0.8 + swayOffset + segmentIndex * 0.3) * swayAmplitude
          let xSway = Math.sin(this.time * 0.5 + swayOffset) * 0.05
          
          // Add fish influence
          const influence = this.fishInfluences.get(segment)
          if (influence && influence.force > 0.1) {
            const fishEffect = influence.force * flexibility
            
            // Add disturbance in the direction opposite to fish movement
            sway += influence.direction.x * fishEffect * 0.5
            xSway += influence.direction.z * fishEffect * 0.3
            
            // Add quick shake effect for fast-moving fish
            if (influence.force > 0.5) {
              const shake = Math.sin(this.time * 8 + swayOffset) * fishEffect * 0.2
              sway += shake
            }
          }
          
          // Apply rotations with wave propagation through plant
          const waveDelay = segmentIndex * 0.1
          segment.rotation.z = segment.userData.originalRotation + sway * Math.sin(this.time + waveDelay)
          segment.rotation.x = xSway * Math.cos(this.time * 0.7 + waveDelay)
          
          // Add slight y-axis twist for more natural movement
          segment.rotation.y = Math.sin(this.time * 0.3 + swayOffset) * 0.03 * flexibility
        }
      })
    })
  }
  
  updateFishData(fishPositions: THREE.Vector3[], fishVelocities: THREE.Vector3[]): void {
    this.fishPositions = fishPositions
    this.fishVelocities = fishVelocities
  }
  
  private updateFishInfluences(): void {
    // Clear previous influences
    this.fishInfluences.clear()
    
    // Calculate fish influence on each plant segment
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        let maxInfluence = 0
        const influenceDirection = new THREE.Vector3()
        
        // Get world position of segment
        const segmentWorldPos = new THREE.Vector3()
        segment.getWorldPosition(segmentWorldPos)
        
        for (let i = 0; i < this.fishPositions.length; i++) {
          const fishPos = this.fishPositions[i]
          const fishVel = this.fishVelocities[i]
          
          const distance = segmentWorldPos.distanceTo(fishPos)
          const fishSpeed = fishVel.length()
          
          // Fish influence radius based on speed
          const influenceRadius = 1.5 + fishSpeed * 2
          
          if (distance < influenceRadius) {
            // Calculate influence strength (closer = stronger, faster = stronger)
            const proximityFactor = 1 - (distance / influenceRadius)
            const speedFactor = Math.min(fishSpeed / 2, 1) // Cap at speed 2
            const influence = proximityFactor * speedFactor
            
            if (influence > maxInfluence) {
              maxInfluence = influence
              
              // Direction is away from fish
              influenceDirection.subVectors(segmentWorldPos, fishPos).normalize()
              
              // Add velocity influence for wake effect
              const wakeInfluence = fishVel.clone().normalize().multiplyScalar(fishSpeed * 0.3)
              influenceDirection.add(wakeInfluence).normalize()
            }
          }
        }
        
        if (maxInfluence > 0.05) {
          this.fishInfluences.set(segment, {
            force: maxInfluence,
            direction: influenceDirection
          })
        }
      })
    })
  }
  
  setMotionEnabled(enabled: boolean): void {
    // Plants can still sway slightly even when motion is reduced
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        if (!enabled && segment.userData.originalRotation !== undefined) {
          segment.rotation.z = segment.userData.originalRotation
          segment.rotation.x = 0
          segment.rotation.y = 0
        }
      })
    })
    
    if (!enabled) {
      // Clear fish influences when motion is disabled
      this.fishInfluences.clear()
    }
  }
}