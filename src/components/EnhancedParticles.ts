import * as THREE from 'three'

interface ParticleSystem {
  points: THREE.Points
  material: THREE.ShaderMaterial
  count: number
}

import type { SpatialAudioManager } from './SpatialAudio'

export class EnhancedParticleSystem {
  private group: THREE.Group
  private bubbleSystem: ParticleSystem
  private dustSystem: ParticleSystem
  private lightRaysSystem: ParticleSystem
  private fishBubbleSystem: ParticleSystem
  private fishTrails: Array<{ position: THREE.Vector3; velocity: THREE.Vector3; age: number; maxAge: number; soundPlayed?: boolean }> = []
  private spatialAudio: SpatialAudioManager | null = null
  private camera: THREE.Camera | null = null
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    this.bubbleSystem = this.createBubbleSystem(bounds)
    this.dustSystem = this.createDustSystem(bounds)
    this.lightRaysSystem = this.createLightRaySystem(bounds)
    this.fishBubbleSystem = this.createFishBubbleSystem(bounds)
    
    this.group.add(this.bubbleSystem.points)
    this.group.add(this.dustSystem.points)
    this.group.add(this.lightRaysSystem.points)
    this.group.add(this.fishBubbleSystem.points)
  }
  
  private createBubbleSystem(bounds: THREE.Box3): ParticleSystem {
    const count = 120
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)
    const offsets = new Float32Array(count)
    const phases = new Float32Array(count)
    const startY = new Float32Array(count)
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < count; i++) {
      // 泡は水槽の底付近からランダムに生成
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.9
      positions[i * 3 + 1] = bounds.min.y + Math.random() * 1.0 // 底から1ユニット以内
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.9
      
      // より小さく現実的な泡サイズ
      sizes[i] = Math.random() * 1.5 + 0.5
      speeds[i] = Math.random() * 0.4 + 0.2  // ゆっくりと上昇
      offsets[i] = Math.random() * 20
      phases[i] = Math.random() * Math.PI * 2
      startY[i] = positions[i * 3 + 1]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    geometry.setAttribute('startY', new THREE.BufferAttribute(startY, 1))
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0.8, 0.9, 1.0) },
        tankBounds: { value: new THREE.Vector4(bounds.min.y, bounds.max.y, 0, 0) }
      },
      vertexShader: `
        attribute float size;
        attribute float speed;
        attribute float offset;
        attribute float phase;
        attribute float startY;
        
        varying float vAlpha;
        varying float vSize;
        
        uniform float time;
        uniform vec4 tankBounds; // min.y, max.y
        
        void main() {
          vec3 pos = position;
          
          float totalTime = time * speed + offset;
          float travelDistance = tankBounds.y - tankBounds.x; // 水槽の高さ
          
          // 底から天井まで連続的に移動
          float progress = mod(totalTime * 0.5, 1.0);
          pos.y = tankBounds.x + progress * travelDistance;
          
          // 泡が上昇するにつれて左右に揺れる
          float wiggle = sin(progress * 10.0 + phase) * 0.1 * progress;
          pos.x += wiggle;
          pos.z += cos(progress * 8.0 + phase) * 0.08 * progress;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vSize = size;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          // 水面に近づくほど透明に
          vAlpha = 1.0 - smoothstep(0.7, 1.0, progress);
          vAlpha *= (0.8 + 0.2 * sin(time * 3.0 + phase));
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vSize;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * 0.8;
          
          float highlight = smoothstep(0.3, 0.1, dist);
          vec3 finalColor = color + vec3(highlight * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return {
      points: new THREE.Points(geometry, material),
      material,
      count
    }
  }
  
  private createDustSystem(bounds: THREE.Box3): ParticleSystem {
    const count = 200
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities = new Float32Array(count * 3)
    const life = new Float32Array(count)
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x
      positions[i * 3 + 1] = center.y + (Math.random() - 0.5) * size.y
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z
      
      sizes[i] = Math.random() * 1.5 + 0.5
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = Math.random() * 0.01 + 0.005
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
      
      life[i] = Math.random()
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('life', new THREE.BufferAttribute(life, 1))
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0.9, 0.8, 0.6) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 velocity;
        attribute float life;
        
        varying float vAlpha;
        
        uniform float time;
        
        void main() {
          vec3 pos = position + velocity * time * 100.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * (200.0 / -mvPosition.z);
          
          vAlpha = sin(life + time * 0.5) * 0.3 + 0.2;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return {
      points: new THREE.Points(geometry, material),
      material,
      count
    }
  }
  
  private createLightRaySystem(bounds: THREE.Box3): ParticleSystem {
    const count = 50
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const intensities = new Float32Array(count)
    const phases = new Float32Array(count)
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.9
      positions[i * 3 + 1] = center.y + (Math.random() - 0.5) * size.y * 0.9
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.9
      
      sizes[i] = Math.random() * 8 + 4
      intensities[i] = Math.random() * 0.5 + 0.3
      phases[i] = Math.random() * Math.PI * 2
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1))
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(1.0, 0.95, 0.8) }
      },
      vertexShader: `
        attribute float size;
        attribute float intensity;
        attribute float phase;
        
        varying float vAlpha;
        varying float vIntensity;
        
        uniform float time;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          vIntensity = intensity;
          vAlpha = (sin(time * 0.8 + phase) * 0.5 + 0.5) * intensity;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vIntensity;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.4;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return {
      points: new THREE.Points(geometry, material),
      material,
      count
    }
  }
  
  update(time: number): void {
    this.bubbleSystem.material.uniforms.time.value = time
    this.dustSystem.material.uniforms.time.value = time
    this.lightRaysSystem.material.uniforms.time.value = time
    this.fishBubbleSystem.material.uniforms.time.value = time
    
    this.updateFishTrails(time)
    this.triggerRandomBubbleSounds(time)
  }
  
  private triggerRandomBubbleSounds(_time: number): void {
    // Occasionally play bubble sounds for the general bubble system
    if (this.spatialAudio && this.camera && Math.random() < 0.02) {
      // Get a random position from the bubble system
      const bubblePositions = this.bubbleSystem.points.geometry.attributes.position
      const randomIndex = Math.floor(Math.random() * this.bubbleSystem.count)
      
      const x = bubblePositions.getX(randomIndex)
      const y = bubblePositions.getY(randomIndex)
      const z = bubblePositions.getZ(randomIndex)
      
      // Only play sound for bubbles near the surface
      if (y > 4) {
        const bubblePosition = new THREE.Vector3(x, y, z)
        const size = Math.random() * 0.8 + 0.2
        this.spatialAudio.playBubbleSound(bubblePosition, size, this.camera)
      }
    }
  }
  
  updateFishData(fishPositions: THREE.Vector3[], fishVelocities: THREE.Vector3[]): void {
    // Create bubble trails for fast-moving fish
    for (let i = 0; i < fishPositions.length; i++) {
      const position = fishPositions[i]
      const velocity = fishVelocities[i]
      const speed = velocity.length()
      
      // Only generate bubbles for fish moving fast enough
      if (speed > 0.8 && Math.random() < 0.3) {
        // Create bubble trail behind fish
        const trailPosition = position.clone().sub(velocity.clone().normalize().multiplyScalar(0.5))
        
        // Add random offset for more natural effect
        trailPosition.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3
        ))
        
        const bubbleTrail = {
          position: trailPosition,
          velocity: velocity.clone().multiplyScalar(-0.2).add(new THREE.Vector3(0, 0.05, 0)),
          age: 0,
          maxAge: 2 + Math.random() * 3
        }
        
        this.fishTrails.push(bubbleTrail)
        
        // Play bubble sound for fish trails
        if (this.spatialAudio && this.camera && Math.random() < 0.4) {
          const bubbleSize = 0.3 + Math.random() * 0.4
          this.spatialAudio.playBubbleSound(trailPosition, bubbleSize, this.camera)
        }
      }
    }
    
    // Limit the number of trails
    if (this.fishTrails.length > 200) {
      this.fishTrails = this.fishTrails.slice(-200)
    }
  }
  
  private updateFishTrails(_time: number): void {
    const deltaTime = 0.016 // Approximate 60fps
    
    // Update existing trails
    this.fishTrails = this.fishTrails.filter(trail => {
      trail.age += deltaTime
      trail.position.add(trail.velocity.clone().multiplyScalar(deltaTime))
      
      // Apply buoyancy
      trail.velocity.y += 0.3 * deltaTime
      
      // Apply drag
      trail.velocity.multiplyScalar(0.98)
      
      return trail.age < trail.maxAge
    })
    
    // Update fish bubble system positions
    this.updateFishBubblePositions()
  }
  
  private updateFishBubblePositions(): void {
    const positions = this.fishBubbleSystem.points.geometry.attributes.position as THREE.BufferAttribute
    const sizes = this.fishBubbleSystem.points.geometry.attributes.size as THREE.BufferAttribute
    const alphas = this.fishBubbleSystem.points.geometry.attributes.alpha as THREE.BufferAttribute
    
    // Update positions based on fish trails
    for (let i = 0; i < Math.min(this.fishTrails.length, this.fishBubbleSystem.count); i++) {
      const trail = this.fishTrails[i]
      
      positions.setXYZ(i, trail.position.x, trail.position.y, trail.position.z)
      
      // Size based on age (start small, grow, then shrink)
      const lifeProgress = trail.age / trail.maxAge
      let sizeMultiplier = 1.0
      if (lifeProgress < 0.2) {
        sizeMultiplier = lifeProgress / 0.2
      } else if (lifeProgress > 0.8) {
        sizeMultiplier = (1.0 - lifeProgress) / 0.2
      }
      sizes.setX(i, 2.0 * sizeMultiplier)
      
      // Alpha based on age
      alphas.setX(i, 1.0 - lifeProgress)
    }
    
    // Hide unused particles
    for (let i = this.fishTrails.length; i < this.fishBubbleSystem.count; i++) {
      positions.setXYZ(i, 0, -1000, 0) // Hide off-screen
      alphas.setX(i, 0)
    }
    
    positions.needsUpdate = true
    sizes.needsUpdate = true
    alphas.needsUpdate = true
  }
  
  setEnabled(enabled: boolean): void {
    this.group.visible = enabled
  }
  
  setSpatialAudio(spatialAudio: SpatialAudioManager, camera: THREE.Camera): void {
    this.spatialAudio = spatialAudio
    this.camera = camera
  }
  
  private createFishBubbleSystem(_bounds: THREE.Box3): ParticleSystem {
    const count = 200 // Max fish bubbles
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    
    // Initialize all particles off-screen
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -1000
      positions[i * 3 + 2] = 0
      sizes[i] = 1.0
      alphas[i] = 0
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0.9, 0.95, 1.0) }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        
        varying float vAlpha;
        varying vec2 vUv;
        
        uniform float time;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = size * (200.0 / -mvPosition.z);
          
          vAlpha = alpha;
          vUv = gl_PointCoord;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec2 vUv;
        uniform vec3 color;
        uniform float time;
        
        void main() {
          vec2 center = vUv - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Create shimmering effect
          float shimmer = sin(time * 4.0 + dist * 10.0) * 0.1 + 0.9;
          
          // Soft circular gradient
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * shimmer;
          
          // Add slight blue tint to fish bubbles
          vec3 finalColor = color * vec3(0.9, 0.95, 1.0);
          
          gl_FragColor = vec4(finalColor, alpha * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return {
      points: new THREE.Points(geometry, material),
      material,
      count
    }
  }
}