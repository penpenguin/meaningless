import * as THREE from 'three'
import bubbleVertexShader from '../shaders/bubble.vert'
import bubbleFragmentShader from '../shaders/bubble.frag'

export class BubbleSystem {
  private points: THREE.Points
  private material: THREE.ShaderMaterial
  private count: number
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.count = 50
    
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.count * 3)
    const sizes = new Float32Array(this.count)
    const speeds = new Float32Array(this.count)
    const offsets = new Float32Array(this.count)
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.8
      positions[i * 3 + 1] = bounds.min.y + Math.random() * size.y
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.8
      
      sizes[i] = Math.random() * 3 + 1
      speeds[i] = Math.random() * 0.5 + 0.2
      offsets[i] = Math.random() * 10
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      uniforms: {
        time: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    this.points = new THREE.Points(geometry, this.material)
    scene.add(this.points)
  }
  
  update(time: number): void {
    this.material.uniforms.time.value = time
  }
  
  setEnabled(enabled: boolean): void {
    this.points.visible = enabled
  }
}