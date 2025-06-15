import * as THREE from 'three'

export class AdvancedWaterSurface {
  private waterMesh: THREE.Mesh
  private waterMaterial: THREE.MeshStandardMaterial
  private waterGeometry: THREE.PlaneGeometry
  private normalMap!: THREE.Texture
  
  constructor(scene: THREE.Scene, width: number, depth: number, y: number) {
    // Create high-resolution water geometry for better wave effects
    this.waterGeometry = new THREE.PlaneGeometry(width, depth, 128, 128)
    this.waterGeometry.rotateX(-Math.PI / 2)
    
    // Create advanced water material with PBR properties
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.85,
      metalness: 0.1,
      roughness: 0.1,
      envMapIntensity: 1.5,
      normalScale: new THREE.Vector2(0.5, 0.5)
    })
    
    // Load water normal map for realistic surface detail
    this.loadWaterNormals()
    
    // Add advanced wave animation to vertices
    this.addAdvancedWaveAnimation()
    
    this.waterMesh = new THREE.Mesh(this.waterGeometry, this.waterMaterial)
    this.waterMesh.position.y = y
    this.waterMesh.receiveShadow = true
    this.waterMesh.castShadow = false // Water doesn't cast shadows
    
    console.log(`Water surface created at position y=${y}, size=${width}x${depth}`)
    
    scene.add(this.waterMesh)
  }
  
  private loadWaterNormals(): void {
    // Create procedural water normal map
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Generate noise-based normal map
    const imageData = ctx.createImageData(512, 512)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random() * 0.5 + 0.5
      imageData.data[i] = noise * 128 + 127     // R: normal X
      imageData.data[i + 1] = noise * 128 + 127 // G: normal Y  
      imageData.data[i + 2] = 255               // B: normal Z (up)
      imageData.data[i + 3] = 255               // A: alpha
    }
    ctx.putImageData(imageData, 0, 0)
    
    this.normalMap = new THREE.CanvasTexture(canvas)
    this.normalMap.wrapS = this.normalMap.wrapT = THREE.RepeatWrapping
    this.normalMap.repeat.set(4, 4)
    this.waterMaterial.normalMap = this.normalMap
  }
  
  private addAdvancedWaveAnimation(): void {
    const positions = this.waterGeometry.attributes.position.array as Float32Array
    const originalPositions = new Float32Array(positions)
    
    // Store original positions and wave parameters for advanced animation
    this.waterGeometry.userData = {
      originalPositions: originalPositions,
      time: 0,
      waveParams: {
        amplitude: [0.08, 0.05, 0.03, 0.02],
        frequency: [0.05, 0.08, 0.12, 0.15],
        speed: [0.8, 1.2, 0.6, 1.5],
        direction: [
          { x: 1, z: 0 },
          { x: 0.7, z: 0.7 },
          { x: 0, z: 1 },
          { x: -0.6, z: 0.8 }
        ]
      }
    }
  }
  
  update(_deltaTime: number): void {
    const time = performance.now() * 0.001
    const userData = this.waterGeometry.userData
    
    if (userData && userData.originalPositions) {
      userData.time = time
      
      const positions = this.waterGeometry.attributes.position.array as Float32Array
      const originalPositions = userData.originalPositions
      const { waveParams } = userData
      
      // Advanced multi-wave animation with realistic water physics
      for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i]
        const z = originalPositions[i + 2]
        let height = 0
        
        // Layer multiple waves for realistic water surface
        for (let w = 0; w < waveParams.amplitude.length; w++) {
          const dir = waveParams.direction[w]
          const dotProduct = x * dir.x + z * dir.z
          
          const wave = Math.sin(
            dotProduct * waveParams.frequency[w] + 
            time * waveParams.speed[w]
          ) * waveParams.amplitude[w]
          
          height += wave
        }
        
        // Add some noise for natural variation
        const noise = (Math.sin(x * 0.3 + time * 0.1) * Math.cos(z * 0.25 + time * 0.15)) * 0.01
        positions[i + 1] = height + noise
      }
      
      this.waterGeometry.attributes.position.needsUpdate = true
      this.waterGeometry.computeVertexNormals()
    }
    
    // Animate normal map for water surface detail
    if (this.normalMap) {
      this.normalMap.offset.x = time * 0.01
      this.normalMap.offset.y = time * 0.005
    }
    
    // Dynamic water color based on lighting conditions
    const colorPhase = Math.sin(time * 0.1) * 0.1 + 0.9
    this.waterMaterial.color.setHSL(0.58, 0.8, 0.3 * colorPhase)
    
    // Subtle opacity animation
    this.waterMaterial.opacity = 0.85 + Math.sin(time * 0.2) * 0.05
    
    // Animate surface roughness for dynamic water quality
    this.waterMaterial.roughness = 0.1 + Math.sin(time * 0.3) * 0.05
  }
  
  setEnvironmentMap(envMap: THREE.CubeTexture): void {
    this.waterMaterial.envMap = envMap
    this.waterMaterial.needsUpdate = true
  }
  
  getMesh(): THREE.Mesh {
    return this.waterMesh
  }
  
  dispose(): void {
    this.waterGeometry.dispose()
    this.waterMaterial.dispose()
  }
}