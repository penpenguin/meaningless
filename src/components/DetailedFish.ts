import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BoidsSystem } from '../utils/Boids'
import type { FishGroup, Tuning } from '../types/aquarium'

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
  private bounds: THREE.Box3
  private dummy = new THREE.Object3D()
  private variants: FishVariant[]
  private randomOffsets: Float32Array = new Float32Array()
  private swimPhases: Float32Array = new Float32Array()
  private speedMultipliers: Float32Array = new Float32Array()
  private wanderTargets: THREE.Vector3[] = []
  private lastWanderUpdate: number = 0
  private baseInstanceCounts: number[] = []
  private tempWanderForce = new THREE.Vector3()
  private tempJitter = new THREE.Vector3()
  private tempNoiseForce = new THREE.Vector3()
  private tempDirection = new THREE.Vector3()
  private tempTurnNoise = new THREE.Vector3()
  private tempSuddenTurn = new THREE.Vector3()
  private tempCuriosityForce = new THREE.Vector3()
  private tempForward = new THREE.Vector3(-1, 0, 0)
  private tempQuaternion = new THREE.Quaternion()
  private tempCurrentPos = new THREE.Vector3()
  private tempWanderDirection = new THREE.Vector3()
  private tempWanderTarget = new THREE.Vector3()
  private currentQuality: 'low' | 'medium' | 'high' = 'high'
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)

    this.bounds = bounds
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.fishCount = isMobile ? 25 : 60
    
    this.variants = this.createFishVariants()
    this.boids = new BoidsSystem(this.fishCount, bounds)
    
    // Initialize randomness arrays
    this.initializeRandomness()
    
    this.createDetailedFishMeshes()
  }

  applyTuning(tuning: Partial<Tuning>): void {
    if (tuning.speed !== undefined) {
      const speed = tuning.speed
      this.boids.params.maxSpeed = speed
      this.boids.boids.forEach((boid) => {
        boid.maxSpeed = speed
      })
    }
    if (tuning.cohesion !== undefined) {
      this.boids.params.cohesion = tuning.cohesion
    }
    if (tuning.separation !== undefined) {
      this.boids.params.separation = tuning.separation
    }
    if (tuning.alignment !== undefined) {
      this.boids.params.alignment = tuning.alignment
    }
  }

  setFishGroups(groups: FishGroup[]): void {
    const sanitized = groups.filter((group) => group.count > 0)
    const totalCount = sanitized.reduce((sum, group) => sum + group.count, 0)
    const countsPerVariant = this.mapGroupsToVariantCounts(sanitized)

    this.rebuildFishSystem(totalCount, countsPerVariant)
    this.setQuality(this.currentQuality)

    const first = sanitized[0]
    if (first?.tuning) {
      this.applyTuning(first.tuning)
    }
  }
  
  private createFishVariants(): FishVariant[] {
    return [
      {
        name: 'Tropical',
        primaryColor: new THREE.Color(0xff6b35),
        secondaryColor: new THREE.Color(0xffd700),
        scale: 0.5,
        speed: 1.0
      },
      {
        name: 'Angelfish',
        primaryColor: new THREE.Color(0x87ceeb),
        secondaryColor: new THREE.Color(0x4169e1),
        scale: 0.65,
        speed: 0.8
      },
      {
        name: 'Neon',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.35,
        speed: 1.5
      },
      {
        name: 'Goldfish',
        primaryColor: new THREE.Color(0xffd700),
        secondaryColor: new THREE.Color(0xff8c00),
        scale: 0.55,
        speed: 0.9
      }
    ]
  }
  
  private initializeRandomness(): void {
    // Create arrays for individual fish randomness
    this.randomOffsets = new Float32Array(this.fishCount)
    this.swimPhases = new Float32Array(this.fishCount)
    this.speedMultipliers = new Float32Array(this.fishCount)
    this.wanderTargets = []
    
    for (let i = 0; i < this.fishCount; i++) {
      // Random offset for animations (0 to 2π)
      this.randomOffsets[i] = Math.random() * Math.PI * 2
      
      // Random swim phase for different timing
      this.swimPhases[i] = Math.random() * Math.PI * 2
      
      // Random speed multiplier (0.3 to 0.7) - 非常にゆったり
      this.speedMultipliers[i] = 0.3 + Math.random() * 0.4
      
      // Random wander target for individual exploration
      this.wanderTargets.push(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 16
      ))
    }
  }
  
  private updateWanderTargets(elapsedTime: number): void {
    // 魚らしいゆっくりとした目標変更（5-12秒）
    if (elapsedTime - this.lastWanderUpdate > 5 + Math.random() * 7) {
      this.lastWanderUpdate = elapsedTime
      
      // 少数の魚が新しい関心を持つ（20%）
      const updateCount = Math.floor(this.fishCount * 0.2)
      for (let i = 0; i < updateCount; i++) {
        const fishIndex = Math.floor(Math.random() * this.fishCount)
        
        // 現在位置から適度な距離の新しい目標
        const boid = this.boids.boids[fishIndex]
        if (boid) {
          this.tempCurrentPos.copy(boid.position)
        } else {
          this.tempCurrentPos.set(0, 0, 0)
        }

        this.tempWanderDirection.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize()

        this.tempWanderTarget.copy(this.tempWanderDirection)
          .multiplyScalar(3 + Math.random() * 5)  // 3-8ユニット先
          .add(this.tempCurrentPos)

        this.wanderTargets[fishIndex].copy(this.tempWanderTarget)
      }
    }
  }
  
  private createDetailedFishMeshes(countsPerVariant?: number[]): void {
    const fallbackCounts = this.variants.map((_variant, index) => {
      const fishPerVariant = Math.ceil(this.fishCount / this.variants.length)
      return Math.max(0, Math.min(fishPerVariant, this.fishCount - index * fishPerVariant))
    })
    const counts = countsPerVariant ?? fallbackCounts

    this.variants.forEach((variant, variantIndex) => {
      const actualCount = counts[variantIndex] ?? 0
      if (actualCount <= 0) return
      
      const fishGeometry = this.createDetailedFishGeometry(variant)
      const fishMaterial = this.createFishMaterial(variant)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.userData.variantIndex = variantIndex
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
        const hslTarget = { h: 0, s: 0, l: 0 }
        color.setHSL(
          (variant.primaryColor.getHSL(hslTarget).h + hue) % 1,
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

    this.baseInstanceCounts = this.instancedMeshes.map(mesh => mesh.count)
  }

  private rebuildFishSystem(totalCount: number, countsPerVariant: number[]): void {
    this.clearMeshes()

    this.fishCount = Math.max(0, totalCount)
    this.boids = new BoidsSystem(this.fishCount, this.bounds)
    this.initializeRandomness()
    this.createDetailedFishMeshes(countsPerVariant)
  }

  private disposeMaterialTextures(material: THREE.Material): void {
    const texturedMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      alphaMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      bumpMap?: THREE.Texture | null
      displacementMap?: THREE.Texture | null
      emissiveMap?: THREE.Texture | null
      lightMap?: THREE.Texture | null
      metalnessMap?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      specularMap?: THREE.Texture | null
      clearcoatMap?: THREE.Texture | null
      clearcoatNormalMap?: THREE.Texture | null
      clearcoatRoughnessMap?: THREE.Texture | null
      sheenColorMap?: THREE.Texture | null
      sheenRoughnessMap?: THREE.Texture | null
      transmissionMap?: THREE.Texture | null
      thicknessMap?: THREE.Texture | null
      iridescenceMap?: THREE.Texture | null
      iridescenceThicknessMap?: THREE.Texture | null
      anisotropyMap?: THREE.Texture | null
    }

    const textures = [
      texturedMaterial.map,
      texturedMaterial.alphaMap,
      texturedMaterial.aoMap,
      texturedMaterial.bumpMap,
      texturedMaterial.displacementMap,
      texturedMaterial.emissiveMap,
      texturedMaterial.lightMap,
      texturedMaterial.metalnessMap,
      texturedMaterial.normalMap,
      texturedMaterial.roughnessMap,
      texturedMaterial.specularMap,
      texturedMaterial.clearcoatMap,
      texturedMaterial.clearcoatNormalMap,
      texturedMaterial.clearcoatRoughnessMap,
      texturedMaterial.sheenColorMap,
      texturedMaterial.sheenRoughnessMap,
      texturedMaterial.transmissionMap,
      texturedMaterial.thicknessMap,
      texturedMaterial.iridescenceMap,
      texturedMaterial.iridescenceThicknessMap,
      texturedMaterial.anisotropyMap
    ]

    const disposed = new Set<THREE.Texture>()
    textures.forEach((texture) => {
      if (!texture || disposed.has(texture)) return
      texture.dispose()
      disposed.add(texture)
    })
  }

  private clearMeshes(): void {
    this.instancedMeshes.forEach((mesh) => {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => {
          this.disposeMaterialTextures(material)
          material.dispose()
        })
      } else if (mesh.material instanceof THREE.Material) {
        this.disposeMaterialTextures(mesh.material)
        mesh.material.dispose()
      }
    })
    this.instancedMeshes = []
  }

  private mapGroupsToVariantCounts(groups: FishGroup[]): number[] {
    const counts = new Array(this.variants.length).fill(0)
    groups.forEach((group) => {
      const index = this.resolveVariantIndex(group.speciesId)
      counts[index] += group.count
    })
    return counts
  }

  private resolveVariantIndex(speciesId: string): number {
    const normalized = speciesId.toLowerCase()
    const directMatch = this.variants.findIndex((variant) =>
      normalized.includes(variant.name.toLowerCase())
    )
    if (directMatch >= 0) return directMatch
    if (normalized.includes('neon')) {
      return this.safeVariantIndex('neon')
    }
    if (normalized.includes('clown')) {
      return this.safeVariantIndex('tropical')
    }
    if (normalized.includes('angel')) {
      return this.safeVariantIndex('angelfish')
    }
    if (normalized.includes('gold')) {
      return this.safeVariantIndex('goldfish')
    }
    return 0
  }

  private safeVariantIndex(name: string): number {
    const index = this.variants.findIndex((variant) => variant.name.toLowerCase() === name)
    return index >= 0 ? index : 0
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
    const geometries = [
      bodyGeometry,
      tailGeometry,
      pectoralFinGeometry,
      pectoralFinGeometry2,
      dorsalFinGeometry,
      ventralFinGeometry
    ]

    const nonIndexedGeometries = geometries.map(geometry =>
      geometry.index ? geometry.toNonIndexed() : geometry
    )

    let mergedGeometry = BufferGeometryUtils.mergeGeometries(nonIndexedGeometries)
    if (!mergedGeometry) {
      // Fallback to body geometry only on failure
      mergedGeometry = bodyGeometry
    }

    // スケールを適用
    mergedGeometry.scale(variant.scale, variant.scale, variant.scale)
    mergedGeometry.computeVertexNormals()

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
    // Update wander targets periodically
    this.updateWanderTargets(elapsedTime)
    
    // Add strong individual wander behavior to break up schooling
    this.boids.boids.forEach((boid, index) => {
      if (index < this.wanderTargets.length) {
        // 非常に弱い放浪力で非常にゆったりした動き
        this.tempWanderForce.copy(this.wanderTargets[index]).sub(boid.position)
        this.tempWanderForce.normalize().multiplyScalar(0.003 * this.speedMultipliers[index])
        
        // 非常に小さなジッターで非常にゆったりした動き
        this.tempJitter.set(
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001
        )
        
        // 非常に小さなノイズ力で非常にゆったりした動き
        this.tempNoiseForce.set(
          Math.sin(elapsedTime * 0.06 + this.randomOffsets[index]) * 0.001,
          Math.sin(elapsedTime * 0.05 + this.randomOffsets[index] * 2) * 0.0008,
          Math.sin(elapsedTime * 0.04 + this.randomOffsets[index] * 3) * 0.001
        )
        
        // 稀な方向転換を更に減らして直線性を向上
        if (Math.random() < 0.001) {  // 0.1% chance per frame - 非常に稀
          this.tempCuriosityForce.set(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.02
          )
          boid.acceleration.add(this.tempCuriosityForce)
        }
        
        boid.acceleration.add(this.tempWanderForce).add(this.tempJitter).add(this.tempNoiseForce)
      }
    })
    
    this.boids.update()
    
    let boidIndex = 0
    
    this.instancedMeshes.forEach((mesh, meshIndex) => {
      const variantIndex =
        typeof mesh.userData.variantIndex === 'number' ? mesh.userData.variantIndex : meshIndex
      const variant = this.variants[variantIndex] ?? this.variants[meshIndex]
      const instanceCount = mesh.count
      
      for (let i = 0; i < instanceCount && boidIndex < this.boids.boids.length; i++, boidIndex++) {
        const boid = this.boids.boids[boidIndex]
        
        // Individual randomness factors
        const randomOffset = this.randomOffsets[boidIndex]
        const swimPhase = this.swimPhases[boidIndex]
        const speedMult = this.speedMultipliers[boidIndex]
        
        this.dummy.position.copy(boid.position)
        
        // 魚を進行方向に正しく向ける（魚の先端が前方向）
        this.tempDirection.copy(boid.velocity)
        if (this.tempDirection.lengthSq() > 0) {
          // 方向転換にノイズを追加（より自然な魚の動き）
          this.tempTurnNoise.set(
            // 水平方向のノイズ（左右の方向転換）
            Math.sin(elapsedTime * 0.8 + randomOffset) * 0.15 + 
            Math.sin(elapsedTime * 1.3 + randomOffset * 2) * 0.08,
            
            // 垂直方向のノイズ（上下の方向転換）
            Math.sin(elapsedTime * 0.6 + randomOffset + 1) * 0.12 + 
            Math.sin(elapsedTime * 1.1 + randomOffset * 3) * 0.06,
            
            // 奥行き方向のノイズ（前後の方向転換）
            Math.sin(elapsedTime * 0.7 + randomOffset + 2) * 0.1 + 
            Math.sin(elapsedTime * 1.2 + randomOffset * 4) * 0.05
          )
          
          // ランダムな瞬間的方向変化（魚の気まぐれ）
          if (Math.random() < 0.008) {  // 0.8%の確率で突然の方向転換
            this.tempSuddenTurn.set(
              (Math.random() - 0.5) * 0.4,
              (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 0.35
            )
            this.tempTurnNoise.add(this.tempSuddenTurn)
          }
          
          this.tempDirection.normalize()
          this.tempDirection.add(this.tempTurnNoise).normalize()
          
          // 魚の先端を進行方向に向ける
          // 魚ジオメトリは-X方向を向いているので、進行方向との角度を計算
          // 進行方向への回転を計算
          this.tempQuaternion.setFromUnitVectors(this.tempForward, this.tempDirection)
          this.dummy.setRotationFromQuaternion(this.tempQuaternion)
        }
        
        // 魚らしい優雅な体の揺れ
        const swimFreq = variant.speed * speedMult * (2 + Math.sin(randomOffset) * 1)
        const wiggle = Math.sin(elapsedTime * swimFreq + swimPhase) * (0.03 + Math.sin(randomOffset * 2) * 0.02)
        this.dummy.rotation.z += wiggle
        
        // 尾ひれの自然な推進動作
        const tailFreq = swimFreq * (1.8 + Math.sin(randomOffset * 3) * 0.4)
        const tailWave = Math.sin(elapsedTime * tailFreq + swimPhase * 1.5) * (0.08 + Math.sin(randomOffset * 4) * 0.04)
        this.dummy.rotation.y += tailWave
        
        // 滑らかな進行方向調整
        const speed = boid.velocity.length()
        const pitchIntensity = 0.5 + Math.sin(randomOffset * 5) * 0.3
        this.dummy.rotation.x += speed * pitchIntensity * 0.8
        
        // 魚らしい浮遊感（ゆっくりとした上下動）
        const floatWave = Math.sin(elapsedTime * 0.8 + randomOffset) * 0.015 * speedMult
        this.dummy.position.y += floatWave
        
        // 微細な横揺れ
        const sideDrift = Math.sin(elapsedTime * 0.6 + randomOffset * 2) * 0.008 * speedMult
        this.dummy.position.x += sideDrift
        
        // 自然な呼吸のようなサイズ変化
        const breathingSpeed = 0.4 + Math.sin(randomOffset * 6) * 0.2
        const breathing = Math.sin(elapsedTime * breathingSpeed + swimPhase) * 0.015 + 1.0
        const scale = variant.scale * breathing * (0.98 + Math.sin(randomOffset * 7) * 0.04)
        this.dummy.scale.set(scale, scale, scale)
        
        // 突然の停止・方向転換を減らして直線性を維持
        if (Math.random() < 0.0002) {  // 非常に稀に
          // 温和な方向調整のみ
          const gentleTurn = (Math.random() - 0.5) * 0.1
          this.dummy.rotation.y += gentleTurn
        }
        
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

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.currentQuality = quality
    const qualityScale = quality === 'low' ? 0.5 : quality === 'medium' ? 0.75 : 1
    if (this.baseInstanceCounts.length === 0) {
      this.baseInstanceCounts = this.instancedMeshes.map(mesh => mesh.count)
    }

    this.instancedMeshes.forEach((mesh, index) => {
      const baseCount = this.baseInstanceCounts[index] ?? mesh.count
      if (baseCount === 0) {
        mesh.count = 0
        return
      }

      mesh.count = Math.max(1, Math.floor(baseCount * qualityScale))
    })
  }
}
