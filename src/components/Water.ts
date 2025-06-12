import * as THREE from 'three'
import waterVertexShader from '../shaders/advancedWater.vert'
import waterFragmentShader from '../shaders/advancedWater.frag'

export class WaterSurface {
  private mesh: THREE.Mesh
  private material: THREE.ShaderMaterial
  
  constructor(scene: THREE.Scene, width: number, depth: number, y: number) {
    const geometry = new THREE.PlaneGeometry(width * 0.98, depth * 0.98, 64, 64)
    
    const normalTexture = this.createNormalMap()
    const envMap = this.getEnvironmentMap(scene)
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        time: { value: 0 },
        normalMap: { value: normalTexture },
        envMap: { value: envMap },
        cameraPosition: { value: new THREE.Vector3() },
        lightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
        lightColor: { value: new THREE.Vector3(1.0, 1.0, 0.9) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.y = y
    scene.add(this.mesh)
  }
  
  private createNormalMap(): THREE.DataTexture {
    const size = 128
    const data = new Uint8Array(size * size * 4)
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 4
        
        const nx = Math.sin(i * 0.1) * 0.5 + 0.5
        const ny = Math.cos(j * 0.1) * 0.5 + 0.5
        const nz = 1.0
        
        data[index] = nx * 255
        data[index + 1] = ny * 255
        data[index + 2] = nz * 255
        data[index + 3] = 255
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true
    
    return texture
  }
  
  private getEnvironmentMap(scene: THREE.Scene): THREE.CubeTexture | null {
    return scene.environment as THREE.CubeTexture
  }
  
  update(time: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.time.value = time
    this.material.uniforms.cameraPosition.value.copy(cameraPosition)
  }
}