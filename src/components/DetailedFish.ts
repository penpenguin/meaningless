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
    
    this.variants = this.createFishVariants()
    this.boids = new BoidsSystem(this.fishCount, bounds)
    
    this.createDetailedFishMeshes()
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
    
    this.variants.forEach((variant, variantIndex) => {
      const actualCount = Math.min(fishPerVariant, this.fishCount - variantIndex * fishPerVariant)
      if (actualCount <= 0) return
      
      const fishGeometry = this.createDetailedFishGeometry(variant)
      const fishMaterial = this.createFishMaterial(variant)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      
      // 個体差のある色を設定
      const colors = new Float32Array(actualCount * 3)
      for (let i = 0; i < actualCount; i++) {
        const hue = Math.random() * 0.1 - 0.05
        const saturation = 0.8 + Math.random() * 0.2
        const lightness = 0.5 + Math.random() * 0.3
        
        const color = new THREE.Color()
        color.setHSL(
          (variant.primaryColor.getHSL({} as any).h + hue) % 1,
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
    })
  }
  
  private createDetailedFishGeometry(variant: FishVariant): THREE.BufferGeometry {
    
    // メインボディ
    const bodyShape = new THREE.Shape()
    bodyShape.moveTo(0, 0)
    bodyShape.quadraticCurveTo(0.4, 0.25, 0.8, 0.15)
    bodyShape.quadraticCurveTo(1.2, 0.08, 1.5, 0)
    bodyShape.quadraticCurveTo(1.2, -0.08, 0.8, -0.15)
    bodyShape.quadraticCurveTo(0.4, -0.25, 0, 0)
    
    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03
    }
    
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings)
    bodyGeometry.center()
    
    // 尾ひれ
    const tailGeometry = new THREE.ConeGeometry(0.2, 0.6, 6)
    tailGeometry.rotateZ(Math.PI / 2)
    tailGeometry.translate(-0.8, 0, 0)
    
    // 胸ひれ
    const pectoralFinGeometry = new THREE.ConeGeometry(0.08, 0.25, 4)
    pectoralFinGeometry.rotateZ(-Math.PI / 3)
    pectoralFinGeometry.rotateY(Math.PI / 6)
    pectoralFinGeometry.translate(0.3, 0.15, 0.12)
    
    const pectoralFinGeometry2 = pectoralFinGeometry.clone()
    pectoralFinGeometry2.translate(0, -0.3, -0.24)
    
    // 背びれ
    const dorsalFinGeometry = new THREE.ConeGeometry(0.12, 0.4, 5)
    dorsalFinGeometry.rotateX(Math.PI / 2)
    dorsalFinGeometry.translate(0.2, 0.2, 0)
    
    // 腹びれ
    const ventralFinGeometry = new THREE.ConeGeometry(0.06, 0.15, 4)
    ventralFinGeometry.rotateX(-Math.PI / 2)
    ventralFinGeometry.translate(0.1, -0.18, 0)
    
    // ジオメトリを結合
    const mergedGeometry = new THREE.BufferGeometry()
    mergedGeometry.copy(bodyGeometry)
    
    // スケールを適用
    mergedGeometry.scale(variant.scale, variant.scale, variant.scale)
    
    return mergedGeometry
  }
  
  private createFishMaterial(variant: FishVariant): THREE.MeshPhysicalMaterial {
    // 魚のテクスチャを手続き的に生成
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, variant.primaryColor.getStyle())
    gradient.addColorStop(0.5, variant.secondaryColor.getStyle())
    gradient.addColorStop(1, variant.primaryColor.clone().multiplyScalar(0.7).getStyle())
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 鱗のパターン
    ctx.globalCompositeOperation = 'overlay'
    for (let x = 0; x < canvas.width; x += 12) {
      for (let y = 0; y < canvas.height; y += 12) {
        const offsetX = (y % 24 === 0) ? 6 : 0
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.1})`
        ctx.beginPath()
        ctx.arc(x + offsetX, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      reflectivity: 0.9,
      envMapIntensity: 0.5,
      transparent: false,
      side: THREE.FrontSide
    })
  }
  
  update(_deltaTime: number, elapsedTime: number): void {
    this.boids.update()
    
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
        
        const scale = variant.scale * (0.9 + Math.sin(elapsedTime + boidIndex) * 0.05)
        this.dummy.scale.set(scale, scale, scale)
        
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }
      
      mesh.instanceMatrix.needsUpdate = true
    })
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