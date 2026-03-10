import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BoidsSystem } from '../utils/Boids'
import type { FishGroup, SchoolMood, Tuning } from '../types/aquarium'
import { getFishContent, getFishContentList } from '../content/registry'

interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
  silhouette?: {
    bodyLength?: number
    bodyHeight?: number
    bodyThickness?: number
    noseLength?: number
    tailLength?: number
    tailHeight?: number
    dorsalHeight?: number
    ventralHeight?: number
    pectoralLength?: number
    topFullness?: number
    bellyFullness?: number
  }
}

type BehaviorProfile = {
  speed: number
  cohesion: number
  separation: number
  alignment: number
  avoidWalls: number
  preferredDepth: number
  schoolMood: SchoolMood
  depthVariance: number
  turnBias: number
}

const DEFAULT_BEHAVIOR_PROFILE: BehaviorProfile = {
  speed: 0.55,
  cohesion: 0.55,
  separation: 0.62,
  alignment: 0.58,
  avoidWalls: 0.8,
  preferredDepth: 0.5,
  schoolMood: 'calm',
  depthVariance: 0.18,
  turnBias: 0.14
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
  private tempDepthForce = new THREE.Vector3()
  private tempBoundsSize = new THREE.Vector3()
  private behaviorProfile: BehaviorProfile = { ...DEFAULT_BEHAVIOR_PROFILE }
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
    this.behaviorProfile = {
      ...this.behaviorProfile,
      ...('speed' in tuning && tuning.speed !== undefined ? { speed: tuning.speed } : {}),
      ...('cohesion' in tuning && tuning.cohesion !== undefined ? { cohesion: tuning.cohesion } : {}),
      ...('separation' in tuning && tuning.separation !== undefined ? { separation: tuning.separation } : {}),
      ...('alignment' in tuning && tuning.alignment !== undefined ? { alignment: tuning.alignment } : {}),
      ...('avoidWalls' in tuning && tuning.avoidWalls !== undefined ? { avoidWalls: tuning.avoidWalls } : {}),
      ...('preferredDepth' in tuning && tuning.preferredDepth !== undefined ? { preferredDepth: tuning.preferredDepth } : {}),
      ...('schoolMood' in tuning && tuning.schoolMood !== undefined ? { schoolMood: tuning.schoolMood } : {}),
      ...('depthVariance' in tuning && tuning.depthVariance !== undefined ? { depthVariance: tuning.depthVariance } : {}),
      ...('turnBias' in tuning && tuning.turnBias !== undefined ? { turnBias: tuning.turnBias } : {})
    }

    this.boids.params.maxSpeed = this.behaviorProfile.speed
    this.boids.params.cohesion = this.behaviorProfile.cohesion
    this.boids.params.separation = this.behaviorProfile.separation
    this.boids.params.alignment = this.behaviorProfile.alignment
    this.boids.params.maxForce = 0.004 + (this.behaviorProfile.turnBias * 0.01)
    this.boids.boids.forEach((boid) => {
      boid.maxSpeed = this.behaviorProfile.speed
      boid.maxForce = this.boids.params.maxForce
    })
  }

  setFishGroups(groups: FishGroup[]): void {
    const sanitized = groups.filter((group) => group.count > 0)
    const totalCount = sanitized.reduce((sum, group) => sum + group.count, 0)
    const countsPerVariant = this.mapGroupsToVariantCounts(sanitized)

    this.rebuildFishSystem(totalCount, countsPerVariant)
    this.setQuality(this.currentQuality)

    this.applyBehaviorProfile(this.resolveBehaviorProfile(sanitized))
  }
  
  private createFishVariants(): FishVariant[] {
    return [
      {
        name: 'Tropical',
        primaryColor: new THREE.Color(0xff6b35),
        secondaryColor: new THREE.Color(0xffd700),
        scale: 0.5,
        speed: 1.0,
        silhouette: {
          bodyLength: 1.45,
          bodyHeight: 0.38,
          bodyThickness: 0.28,
          noseLength: 0.24,
          tailLength: 0.44,
          tailHeight: 0.42,
          dorsalHeight: 0.28,
          ventralHeight: 0.16,
          pectoralLength: 0.22,
          topFullness: 0.72,
          bellyFullness: 0.8
        }
      },
      {
        name: 'Angelfish',
        primaryColor: new THREE.Color(0x87ceeb),
        secondaryColor: new THREE.Color(0x4169e1),
        scale: 0.65,
        speed: 0.8,
        silhouette: {
          bodyLength: 1.06,
          bodyHeight: 0.62,
          bodyThickness: 0.18,
          noseLength: 0.18,
          tailLength: 0.34,
          tailHeight: 0.52,
          dorsalHeight: 0.9,
          ventralHeight: 0.96,
          pectoralLength: 0.24,
          topFullness: 0.9,
          bellyFullness: 0.88
        }
      },
      {
        name: 'Neon',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.35,
        speed: 1.5,
        silhouette: {
          bodyLength: 1.82,
          bodyHeight: 0.18,
          bodyThickness: 0.15,
          noseLength: 0.3,
          tailLength: 0.36,
          tailHeight: 0.28,
          dorsalHeight: 0.12,
          ventralHeight: 0.06,
          pectoralLength: 0.14,
          topFullness: 0.56,
          bellyFullness: 0.64
        }
      },
      {
        name: 'Goldfish',
        primaryColor: new THREE.Color(0xffd700),
        secondaryColor: new THREE.Color(0xff8c00),
        scale: 0.55,
        speed: 0.9,
        silhouette: {
          bodyLength: 1.26,
          bodyHeight: 0.48,
          bodyThickness: 0.32,
          noseLength: 0.22,
          tailLength: 0.52,
          tailHeight: 0.6,
          dorsalHeight: 0.36,
          ventralHeight: 0.22,
          pectoralLength: 0.26,
          topFullness: 0.84,
          bellyFullness: 0.94
        }
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

  private resolveBehaviorProfile(groups: FishGroup[]): BehaviorProfile {
    const totalCount = groups.reduce((sum, group) => sum + group.count, 0)
    if (totalCount <= 0) return { ...DEFAULT_BEHAVIOR_PROFILE }

    const moodWeights: Record<SchoolMood, number> = {
      calm: 0,
      alert: 0,
      feeding: 0
    }

    const weighted = groups.reduce((profile, group) => {
      const tuning = {
        ...DEFAULT_BEHAVIOR_PROFILE,
        ...group.tuning
      }
      moodWeights[tuning.schoolMood] += group.count
      return {
        speed: profile.speed + (tuning.speed * group.count),
        cohesion: profile.cohesion + (tuning.cohesion * group.count),
        separation: profile.separation + (tuning.separation * group.count),
        alignment: profile.alignment + (tuning.alignment * group.count),
        avoidWalls: profile.avoidWalls + (tuning.avoidWalls * group.count),
        preferredDepth: profile.preferredDepth + (tuning.preferredDepth * group.count),
        depthVariance: profile.depthVariance + (tuning.depthVariance * group.count),
        turnBias: profile.turnBias + (tuning.turnBias * group.count)
      }
    }, {
      speed: 0,
      cohesion: 0,
      separation: 0,
      alignment: 0,
      avoidWalls: 0,
      preferredDepth: 0,
      depthVariance: 0,
      turnBias: 0
    })

    const dominantMood = (Object.entries(moodWeights).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'calm') as SchoolMood

    return {
      speed: weighted.speed / totalCount,
      cohesion: weighted.cohesion / totalCount,
      separation: weighted.separation / totalCount,
      alignment: weighted.alignment / totalCount,
      avoidWalls: weighted.avoidWalls / totalCount,
      preferredDepth: weighted.preferredDepth / totalCount,
      schoolMood: dominantMood,
      depthVariance: weighted.depthVariance / totalCount,
      turnBias: weighted.turnBias / totalCount
    }
  }

  private applyBehaviorProfile(profile: BehaviorProfile): void {
    this.behaviorProfile = profile
    this.applyTuning(profile)
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
    const species = getFishContent(speciesId) ?? getFishContentList()[0]
    if (!species) return this.safeVariantIndex('neon')

    const archetype = species.render.archetype
    if (archetype === 'Neon') return this.safeVariantIndex('neon')
    if (archetype === 'Tropical') return this.safeVariantIndex('tropical')
    if (archetype === 'Angelfish') return this.safeVariantIndex('angelfish')
    if (archetype === 'Goldfish') return this.safeVariantIndex('goldfish')
    return this.safeVariantIndex('neon')
  }

  private safeVariantIndex(name: string): number {
    const index = this.variants.findIndex((variant) => variant.name.toLowerCase() === name)
    return index >= 0 ? index : 0
  }
  
  private createDetailedFishGeometry(variant: FishVariant): THREE.BufferGeometry {
    const silhouette = {
      bodyLength: variant.silhouette?.bodyLength ?? 1.5,
      bodyHeight: variant.silhouette?.bodyHeight ?? 0.32,
      bodyThickness: variant.silhouette?.bodyThickness ?? 0.3,
      noseLength: variant.silhouette?.noseLength ?? 0.24,
      tailLength: variant.silhouette?.tailLength ?? 0.42,
      tailHeight: variant.silhouette?.tailHeight ?? 0.4,
      dorsalHeight: variant.silhouette?.dorsalHeight ?? 0.28,
      ventralHeight: variant.silhouette?.ventralHeight ?? 0.16,
      pectoralLength: variant.silhouette?.pectoralLength ?? 0.22,
      topFullness: variant.silhouette?.topFullness ?? 0.72,
      bellyFullness: variant.silhouette?.bellyFullness ?? 0.8
    }

    const tailRootX = -silhouette.bodyLength * 0.48
    const bodyShoulderX = silhouette.bodyLength * 0.06
    const noseX = silhouette.bodyLength * 0.5 + silhouette.noseLength
    const upperCurveHeight = silhouette.bodyHeight * silhouette.topFullness
    const lowerCurveHeight = silhouette.bodyHeight * silhouette.bellyFullness

    // メインボディ
    const bodyShape = new THREE.Shape()
    bodyShape.moveTo(tailRootX, 0)
    bodyShape.bezierCurveTo(
      tailRootX + (silhouette.bodyLength * 0.18),
      upperCurveHeight,
      bodyShoulderX,
      silhouette.bodyHeight,
      noseX - (silhouette.noseLength * 0.22),
      silhouette.bodyHeight * 0.18
    )
    bodyShape.quadraticCurveTo(
      noseX,
      0,
      noseX - (silhouette.noseLength * 0.26),
      -silhouette.bodyHeight * 0.16
    )
    bodyShape.bezierCurveTo(
      bodyShoulderX,
      -lowerCurveHeight,
      tailRootX + (silhouette.bodyLength * 0.12),
      -silhouette.bodyHeight,
      tailRootX,
      0
    )
    
    const extrudeSettings = {
      depth: silhouette.bodyThickness,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03
    }
    
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings)
    
    // 尾ひれ
    const tailShape = new THREE.Shape()
    tailShape.moveTo(tailRootX + 0.06, silhouette.tailHeight * 0.16)
    tailShape.lineTo(tailRootX - silhouette.tailLength, silhouette.tailHeight * 0.54)
    tailShape.lineTo(tailRootX - (silhouette.tailLength * 0.58), 0)
    tailShape.lineTo(tailRootX - silhouette.tailLength, -silhouette.tailHeight * 0.54)
    tailShape.lineTo(tailRootX + 0.06, -silhouette.tailHeight * 0.16)
    tailShape.closePath()
    const tailGeometry = new THREE.ExtrudeGeometry(tailShape, {
      depth: Math.max(0.08, silhouette.bodyThickness * 0.3),
      bevelEnabled: false,
      steps: 1
    })
    
    // 胸ひれ
    const pectoralFinGeometry = new THREE.ConeGeometry(
      Math.max(0.05, silhouette.bodyHeight * 0.22),
      silhouette.pectoralLength,
      4
    )
    pectoralFinGeometry.rotateZ(-Math.PI / 3)
    pectoralFinGeometry.rotateY(Math.PI / 6)
    pectoralFinGeometry.translate(
      silhouette.bodyLength * 0.08,
      silhouette.bodyHeight * 0.38,
      silhouette.bodyThickness * 0.4
    )
    
    const pectoralFinGeometry2 = pectoralFinGeometry.clone()
    pectoralFinGeometry2.translate(
      0,
      -silhouette.bodyHeight * 0.76,
      -silhouette.bodyThickness * 0.8
    )
    
    // 背びれ
    const dorsalFinGeometry = new THREE.ConeGeometry(
      Math.max(0.06, silhouette.bodyHeight * 0.18),
      silhouette.dorsalHeight,
      5
    )
    dorsalFinGeometry.rotateX(Math.PI / 2)
    dorsalFinGeometry.translate(
      silhouette.bodyLength * 0.04,
      silhouette.bodyHeight * 0.42 + (silhouette.dorsalHeight * 0.28),
      0
    )
    
    // 腹びれ
    const ventralFinGeometry = new THREE.ConeGeometry(
      Math.max(0.04, silhouette.bodyHeight * 0.12),
      silhouette.ventralHeight,
      4
    )
    ventralFinGeometry.rotateX(-Math.PI / 2)
    ventralFinGeometry.translate(
      silhouette.bodyLength * 0.02,
      -(silhouette.bodyHeight * 0.34) - (silhouette.ventralHeight * 0.36),
      0
    )
    
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
    mergedGeometry.center()
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
    const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
    const behavior = this.behaviorProfile ?? DEFAULT_BEHAVIOR_PROFILE
    const boundsSize = this.tempBoundsSize ?? new THREE.Vector3()
    const depthForce = this.tempDepthForce ?? new THREE.Vector3()
    bounds.getSize(boundsSize)
    this.tempBoundsSize = boundsSize
    this.tempDepthForce = depthForce
    const depthRange = boundsSize.y * behavior.depthVariance * 0.35
    const moodWanderStrength = behavior.schoolMood === 'alert'
      ? 0.004
      : behavior.schoolMood === 'feeding'
        ? 0.0034
        : 0.0028
    const jitterScale = 0.0004 + (behavior.turnBias * 0.0012)
    const curiosityChance = 0.0005 + (behavior.turnBias * 0.01)
    const turnNoiseScale = 0.6 + behavior.turnBias
    const depthForceScale = 0.0015 + (behavior.depthVariance * 0.006)
    
    // Add strong individual wander behavior to break up schooling
    this.boids.boids.forEach((boid, index) => {
      if (index < this.wanderTargets.length) {
        // 非常に弱い放浪力で非常にゆったりした動き
        this.tempWanderForce.copy(this.wanderTargets[index]).sub(boid.position)
        if (this.tempWanderForce.lengthSq() > 0) {
          this.tempWanderForce.normalize().multiplyScalar(moodWanderStrength * this.speedMultipliers[index])
        }
        
        // 非常に小さなジッターで非常にゆったりした動き
        this.tempJitter.set(
          (Math.random() - 0.5) * jitterScale,
          (Math.random() - 0.5) * jitterScale,
          (Math.random() - 0.5) * jitterScale
        )
        
        // 非常に小さなノイズ力で非常にゆったりした動き
        this.tempNoiseForce.set(
          Math.sin(elapsedTime * 0.06 + this.randomOffsets[index]) * jitterScale,
          Math.sin(elapsedTime * 0.05 + this.randomOffsets[index] * 2) * jitterScale * 0.8,
          Math.sin(elapsedTime * 0.04 + this.randomOffsets[index] * 3) * jitterScale
        )

        const desiredY = bounds.max.y -
          (behavior.preferredDepth * boundsSize.y) +
          (Math.sin(elapsedTime * (0.45 + behavior.turnBias) + this.randomOffsets[index]) * depthRange)
        depthForce.set(0, desiredY - boid.position.y, 0).multiplyScalar(depthForceScale)
        
        // 稀な方向転換を更に減らして直線性を向上
        if (Math.random() < curiosityChance) {
          this.tempCuriosityForce.set(
            (Math.random() - 0.5) * (0.01 + behavior.turnBias * 0.04),
            (Math.random() - 0.5) * (0.008 + behavior.depthVariance * 0.03),
            (Math.random() - 0.5) * (0.01 + behavior.turnBias * 0.04)
          )
          boid.acceleration.add(this.tempCuriosityForce)
        }
        
        boid.acceleration
          .add(this.tempWanderForce)
          .add(this.tempJitter)
          .add(this.tempNoiseForce)
          .add(depthForce)
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
            (Math.sin(elapsedTime * 0.8 + randomOffset) * 0.15 +
            Math.sin(elapsedTime * 1.3 + randomOffset * 2) * 0.08) * turnNoiseScale,
            
            // 垂直方向のノイズ（上下の方向転換）
            (Math.sin(elapsedTime * 0.6 + randomOffset + 1) * 0.12 +
            Math.sin(elapsedTime * 1.1 + randomOffset * 3) * 0.06) * turnNoiseScale,
            
            // 奥行き方向のノイズ（前後の方向転換）
            (Math.sin(elapsedTime * 0.7 + randomOffset + 2) * 0.1 +
            Math.sin(elapsedTime * 1.2 + randomOffset * 4) * 0.05) * turnNoiseScale
          )
          
          // ランダムな瞬間的方向変化（魚の気まぐれ）
          if (Math.random() < 0.002 + (behavior.turnBias * 0.02)) {
            this.tempSuddenTurn.set(
              (Math.random() - 0.5) * (0.2 + behavior.turnBias * 0.6),
              (Math.random() - 0.5) * (0.15 + behavior.depthVariance * 0.4),
              (Math.random() - 0.5) * (0.2 + behavior.turnBias * 0.5)
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
        const floatWave = Math.sin(elapsedTime * 0.8 + randomOffset) * (0.01 + behavior.depthVariance * 0.03) * speedMult
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
        if (Math.random() < 0.0002 + (behavior.turnBias * 0.0025)) {
          // 温和な方向調整のみ
          const gentleTurn = (Math.random() - 0.5) * (0.08 + behavior.turnBias * 0.16)
          this.dummy.rotation.y += gentleTurn
        }
        
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }
      
      mesh.instanceMatrix.needsUpdate = true
    })
  }

  getVisibleFishCount(): number {
    return this.instancedMeshes.reduce((count, mesh) => count + mesh.count, 0)
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
