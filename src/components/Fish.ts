import * as THREE from 'three'
import { BoidsSystem } from '../utils/Boids'

export class FishSystem {
  private group: THREE.Group
  private instancedMesh!: THREE.InstancedMesh
  private boids: BoidsSystem
  private fishCount: number
  private dummy = new THREE.Object3D()
  private color = new THREE.Color()
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.fishCount = isMobile ? 50 : 100
    
    this.boids = new BoidsSystem(this.fishCount, bounds)
    
    this.createFishMesh()
  }
  
  private createFishMesh(): void {
    const fishGeometry = this.createFishGeometry()
    
    const fishMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b35,
      emissive: 0x331a0d,
      emissiveIntensity: 0.1,
      shininess: 100,
      specular: 0xffffff,
      vertexColors: true
    })
    
    this.instancedMesh = new THREE.InstancedMesh(
      fishGeometry,
      fishMaterial,
      this.fishCount
    )
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.instancedMesh.castShadow = true
    this.instancedMesh.receiveShadow = true
    
    const colors = new Float32Array(this.fishCount * 3)
    const baseColors = [
      new THREE.Color(0xff6b35),
      new THREE.Color(0xffa500),
      new THREE.Color(0xffcd3c),
      new THREE.Color(0xff8c42),
      new THREE.Color(0xffd700)
    ]
    
    for (let i = 0; i < this.fishCount; i++) {
      const colorIndex = Math.floor(Math.random() * baseColors.length)
      const baseColor = baseColors[colorIndex]
      const hslColor = { h: 0, s: 0, l: 0 }
      baseColor.getHSL(hslColor)
      
      this.color.setHSL(
        hslColor.h + (Math.random() - 0.5) * 0.1,
        hslColor.s + (Math.random() - 0.5) * 0.2,
        hslColor.l + (Math.random() - 0.5) * 0.2
      )
      
      colors[i * 3] = this.color.r
      colors[i * 3 + 1] = this.color.g
      colors[i * 3 + 2] = this.color.b
    }
    
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
    
    this.group.add(this.instancedMesh)
  }
  
  private createFishGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.quadraticCurveTo(0.3, 0.15, 0.6, 0.1)
    shape.quadraticCurveTo(0.8, 0.05, 1, 0)
    shape.quadraticCurveTo(0.8, -0.05, 0.6, -0.1)
    shape.quadraticCurveTo(0.3, -0.15, 0, 0)
    
    const extrudeSettings = {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02
    }
    
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    bodyGeometry.center()
    
    const tailGeometry = new THREE.ConeGeometry(0.15, 0.4, 4)
    tailGeometry.rotateZ(Math.PI / 2)
    tailGeometry.translate(-0.6, 0, 0)
    
    const finGeometry = new THREE.ConeGeometry(0.1, 0.2, 3)
    finGeometry.rotateZ(-Math.PI / 2)
    finGeometry.rotateY(Math.PI / 4)
    finGeometry.translate(0.2, 0.1, 0.1)
    
    const finGeometry2 = finGeometry.clone()
    finGeometry2.translate(0, -0.2, -0.2)
    
    const mergedGeometry = new THREE.BufferGeometry()
    mergedGeometry.setAttribute('position', bodyGeometry.getAttribute('position'))
    mergedGeometry.setAttribute('normal', bodyGeometry.getAttribute('normal'))
    mergedGeometry.setIndex(bodyGeometry.getIndex())
    
    return mergedGeometry
  }
  
  update(_deltaTime: number, elapsedTime: number): void {
    
    this.boids.update()
    
    for (let i = 0; i < this.fishCount; i++) {
      const boid = this.boids.boids[i]
      
      this.dummy.position.copy(boid.position)
      
      const direction = boid.velocity.clone().normalize()
      if (direction.length() > 0) {
        this.dummy.lookAt(
          boid.position.x + direction.x,
          boid.position.y + direction.y,
          boid.position.z + direction.z
        )
      }
      
      const wiggle = Math.sin(elapsedTime * 5 + i) * 0.1
      this.dummy.rotation.z += wiggle
      
      const scale = 0.8 + Math.random() * 0.4
      this.dummy.scale.set(scale, scale, scale)
      
      this.dummy.updateMatrix()
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix)
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }
  
  setMotionEnabled(enabled: boolean): void {
    if (!enabled) {
      for (const boid of this.boids.boids) {
        boid.velocity.multiplyScalar(0)
        boid.acceleration.multiplyScalar(0)
      }
    }
  }
}