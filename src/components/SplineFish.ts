import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

interface FishParams {
  length: number
  height: number
  width: number
  tailSize: number
  dorsalFinHeight: number
  color: THREE.Color
}

export class SplineFish {
  private geometry: THREE.BufferGeometry
  private material: THREE.MeshPhongMaterial
  private mesh: THREE.Mesh
  private params: FishParams
  private time: number = 0
  private swimOffset: number
  private swimSpeed: number
  
  constructor(params: Partial<FishParams> = {}) {
    this.params = {
      length: 10,
      height: 2,
      width: 1.5,
      tailSize: 3,
      dorsalFinHeight: 1.5,
      color: new THREE.Color(0x4a90e2),
      ...params
    }
    
    this.swimOffset = Math.random() * Math.PI * 2
    this.swimSpeed = 0.5 + Math.random() * 0.5
    
    this.geometry = this.createFishGeometry()
    this.material = this.createFishMaterial()
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    
    // Add vertex animation for swimming
    this.setupSwimmingAnimation()
  }
  
  private createFishGeometry(): THREE.BufferGeometry {
    const { length, height, width } = this.params
    
    // Create a simple fish body using basic shapes
    const bodyGeometry = this.createSimpleFishBody(length, height, width)
    const tailGeometry = this.createSimpleTail(length, height)
    const dorsalFinGeometry = this.createSimpleDorsalFin(length, height)
    
    // Merge geometries safely
    try {
      const mergedGeometry = BufferGeometryUtils.mergeGeometries([
        bodyGeometry,
        tailGeometry,
        dorsalFinGeometry
      ])
      
      if (mergedGeometry) {
        mergedGeometry.computeVertexNormals()
        return mergedGeometry
      }
    } catch (error) {
      console.warn('Failed to merge fish geometries, using simple body:', error)
    }
    
    // Fallback to simple body
    bodyGeometry.computeVertexNormals()
    return bodyGeometry
  }
  
  private createSimpleFishBody(length: number, height: number, width: number): THREE.BufferGeometry {
    // Create a more sophisticated fish body using spline-inspired approach
    const segments = 20
    const rings = 12
    
    const vertices: number[] = []
    const indices: number[] = []
    const uvs: number[] = []
    
    // Fish body profile curves (simplified spline approach)
    const bodyProfile = this.createFishProfile(length, height, width)
    
    // Generate vertices along fish body
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = t * length - length * 0.5
      
      // Get cross-section at this point
      const crossSection = this.getFishCrossSection(t, height, width, bodyProfile)
      
      for (let j = 0; j <= rings; j++) {
        const angle = (j / rings) * Math.PI * 2
        const radius = crossSection.radius
        const yOffset = crossSection.yOffset
        
        const y = Math.cos(angle) * radius + yOffset
        const z = Math.sin(angle) * radius * crossSection.aspectRatio
        
        vertices.push(x, y, z)
        uvs.push(t, j / rings)
      }
    }
    
    // Generate indices for triangulation
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < rings; j++) {
        const a = i * (rings + 1) + j
        const b = a + rings + 1
        const c = a + 1
        const d = b + 1
        
        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    
    return geometry
  }
  
  private createFishProfile(_length: number, _height: number, _width: number) {
    // Define fish body proportions along its length
    return {
      head: { radius: 0.15, yOffset: 0, aspectRatio: 0.8 },      // t = 0.0
      neck: { radius: 0.25, yOffset: 0, aspectRatio: 0.9 },      // t = 0.1  
      body: { radius: 0.4, yOffset: -0.1, aspectRatio: 1.0 },    // t = 0.4
      tail: { radius: 0.15, yOffset: 0, aspectRatio: 1.2 },      // t = 0.8
      end: { radius: 0.05, yOffset: 0, aspectRatio: 1.5 }        // t = 1.0
    }
  }
  
  private getFishCrossSection(t: number, height: number, width: number, profile: any) {
    // Interpolate between profile points based on position along fish
    let radius, yOffset, aspectRatio
    
    if (t <= 0.1) {
      // Head to neck
      const alpha = t / 0.1
      radius = this.lerp(profile.head.radius, profile.neck.radius, alpha)
      yOffset = this.lerp(profile.head.yOffset, profile.neck.yOffset, alpha)
      aspectRatio = this.lerp(profile.head.aspectRatio, profile.neck.aspectRatio, alpha)
    } else if (t <= 0.4) {
      // Neck to body
      const alpha = (t - 0.1) / 0.3
      radius = this.lerp(profile.neck.radius, profile.body.radius, alpha)
      yOffset = this.lerp(profile.neck.yOffset, profile.body.yOffset, alpha)
      aspectRatio = this.lerp(profile.neck.aspectRatio, profile.body.aspectRatio, alpha)
    } else if (t <= 0.8) {
      // Body to tail
      const alpha = (t - 0.4) / 0.4
      radius = this.lerp(profile.body.radius, profile.tail.radius, alpha)
      yOffset = this.lerp(profile.body.yOffset, profile.tail.yOffset, alpha)
      aspectRatio = this.lerp(profile.body.aspectRatio, profile.tail.aspectRatio, alpha)
    } else {
      // Tail to end
      const alpha = (t - 0.8) / 0.2
      radius = this.lerp(profile.tail.radius, profile.end.radius, alpha)
      yOffset = this.lerp(profile.tail.yOffset, profile.end.yOffset, alpha)
      aspectRatio = this.lerp(profile.tail.aspectRatio, profile.end.aspectRatio, alpha)
    }
    
    return {
      radius: radius * height,
      yOffset: yOffset * height,
      aspectRatio: aspectRatio * (width / height)
    }
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }
  
  private createSimpleTail(length: number, height: number): THREE.BufferGeometry {
    // Create tail as a triangle fan
    const tailGeometry = new THREE.ConeGeometry(height * 0.4, length * 0.3, 6)
    tailGeometry.rotateZ(Math.PI / 2)
    tailGeometry.translate(length * 0.6, 0, 0)
    
    return tailGeometry
  }
  
  private createSimpleDorsalFin(length: number, height: number): THREE.BufferGeometry {
    // Create dorsal fin as a small triangle
    const finGeometry = new THREE.ConeGeometry(height * 0.15, height * 0.4, 4)
    finGeometry.rotateX(-Math.PI / 2)
    finGeometry.translate(length * 0.3, height * 0.35, 0)
    
    return finGeometry
  }
  
  
  private createFishMaterial(): THREE.MeshPhongMaterial {
    const fishMaterial = new THREE.MeshPhongMaterial({
      color: this.params.color,
      shininess: 100,
      specular: new THREE.Color(0x222222)
    })
    
    // Store animation parameters without custom shaders to avoid compilation errors
    ;(fishMaterial as any).userData = {
      time: 0,
      swimSpeed: this.swimSpeed,
      swimOffset: this.swimOffset
    }
    
    return fishMaterial
  }
  
  private setupSwimmingAnimation(): void {
    // Add morph targets for more complex animations if needed
    const positions = this.geometry.attributes.position
    const morphPositions = []
    
    for (let i = 0; i < 3; i++) {
      const morphPosAttr = positions.clone()
      morphPositions.push(morphPosAttr)
    }
    
    this.geometry.morphAttributes.position = morphPositions
  }
  
  update(deltaTime: number): void {
    this.time += deltaTime
    
    // Update animation parameters
    const userData = (this.material as any).userData
    if (userData) {
      userData.time = this.time
    }
    
    // Apply swimming animation through object rotation instead of vertex shader
    const phase = this.time * this.swimSpeed + this.swimOffset
    const wave = Math.sin(phase) * 0.05
    const tailWave = Math.sin(phase * 2.0) * 0.02
    
    // Apply subtle rotation for swimming effect
    this.mesh.rotation.z = wave
    this.mesh.rotation.y += tailWave * deltaTime
  }
  
  getMesh(): THREE.Mesh {
    return this.mesh
  }
  
  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z)
  }
  
  setRotation(x: number, y: number, z: number): void {
    this.mesh.rotation.set(x, y, z)
  }
}