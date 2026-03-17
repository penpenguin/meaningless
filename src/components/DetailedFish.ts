import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BoidsSystem } from '../utils/Boids'
import type { FishGroup, SchoolMood, Tuning } from '../types/aquarium'
import { getFishContent, getFishContentList } from '../content/registry'
import type { LoadedModelAsset, VisualAssetBundle } from '../assets/visualAssets'
import type { QualityLevel } from '../types/settings'

interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
  locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
  modelForwardAxis?: {
    procedural: [number, number, number]
    school: [number, number, number]
    hero: [number, number, number]
  }
  patternTextureId?: string
  baseColorTextureId?: string
  normalTextureId?: string
  roughnessTextureId?: string
  alphaTextureId?: string
  schoolModelId?: string
  heroModelId?: string
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

type FishRenderPath = 'procedural' | 'school' | 'hero'

type LocomotionProfile = {
  cruiseSpeed: number
  yawResponsiveness: number
  bankAmount: number
  tailBeatFreq: number
  bodyWiggleAmount: number
  curiosityRate: number
  depthBobAmount: number
  boundaryArcRadius: number
  cruiseBias: number
  turnNoise: number
  suddenTurnRate: number
  steeringWeights: {
    alignment: number
    cohesion: number
    separation: number
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

const DEFAULT_FORWARD_AXIS: [number, number, number] = [1, 0, 0]

const LOCOMOTION_PROFILES: Record<NonNullable<FishVariant['locomotionProfileId']>, LocomotionProfile> = {
  'calm-cruiser': {
    cruiseSpeed: 0.96,
    yawResponsiveness: 0.82,
    bankAmount: 0.34,
    tailBeatFreq: 1.45,
    bodyWiggleAmount: 0.28,
    curiosityRate: 0.72,
    depthBobAmount: 0.3,
    boundaryArcRadius: 0.78,
    cruiseBias: 0.78,
    turnNoise: 0.14,
    suddenTurnRate: 0.008,
    steeringWeights: {
      alignment: 0.94,
      cohesion: 1.02,
      separation: 0.96
    }
  },
  'disk-glider': {
    cruiseSpeed: 0.86,
    yawResponsiveness: 0.68,
    bankAmount: 0.48,
    tailBeatFreq: 1.05,
    bodyWiggleAmount: 0.24,
    curiosityRate: 0.54,
    depthBobAmount: 0.22,
    boundaryArcRadius: 1.02,
    cruiseBias: 0.64,
    turnNoise: 0.08,
    suddenTurnRate: 0.005,
    steeringWeights: {
      alignment: 0.88,
      cohesion: 1.08,
      separation: 0.92
    }
  },
  'slender-darter': {
    cruiseSpeed: 1.22,
    yawResponsiveness: 1.18,
    bankAmount: 0.58,
    tailBeatFreq: 2.35,
    bodyWiggleAmount: 0.18,
    curiosityRate: 1.08,
    depthBobAmount: 0.18,
    boundaryArcRadius: 0.42,
    cruiseBias: 0.94,
    turnNoise: 0.22,
    suddenTurnRate: 0.018,
    steeringWeights: {
      alignment: 1.12,
      cohesion: 0.84,
      separation: 1.08
    }
  },
  'goldfish-wobble': {
    cruiseSpeed: 0.9,
    yawResponsiveness: 0.74,
    bankAmount: 0.38,
    tailBeatFreq: 1.64,
    bodyWiggleAmount: 0.46,
    curiosityRate: 0.82,
    depthBobAmount: 0.4,
    boundaryArcRadius: 0.9,
    cruiseBias: 0.7,
    turnNoise: 0.18,
    suddenTurnRate: 0.012,
    steeringWeights: {
      alignment: 0.9,
      cohesion: 0.98,
      separation: 0.9
    }
  }
}

export class DetailedFishSystem {
  private group: THREE.Group
  private instancedMeshes: THREE.InstancedMesh[] = []
  private heroFishMeshes: THREE.Object3D[] = []
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
  private tempSuddenTurn = new THREE.Vector3()
  private tempCuriosityForce = new THREE.Vector3()
  private tempForwardAxis = new THREE.Vector3(1, 0, 0)
  private tempQuaternion = new THREE.Quaternion()
  private tempHorizontalDirection = new THREE.Vector3()
  private tempHorizontalPreviousDirection = new THREE.Vector3()
  private tempCurrentPos = new THREE.Vector3()
  private tempWanderDirection = new THREE.Vector3()
  private tempWanderTarget = new THREE.Vector3()
  private tempDepthForce = new THREE.Vector3()
  private tempBoundsSize = new THREE.Vector3()
  private smoothedQuaternions: THREE.Quaternion[] = []
  private previousVelocities: THREE.Vector3[] = []
  private headingInitialized: boolean[] = []
  private behaviorProfile: BehaviorProfile = { ...DEFAULT_BEHAVIOR_PROFILE }
  private currentQuality: QualityLevel = 'standard'
  private visualAssets: VisualAssetBundle | null
  private boidVariantIndices: number[] = []
  private heroAssignments = new Map<number, {
    object: THREE.Object3D
    body: THREE.Object3D
    tail: THREE.Object3D | null
    lateralOffset: number
    verticalOffset: number
    depthOffset: number
    scaleMultiplier: number
  }>()
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3, visualAssets: VisualAssetBundle | null = null) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    scene.add(this.group)

    this.bounds = bounds
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.fishCount = isMobile ? 25 : 66
    
    this.variants = this.createFishVariants()
    this.boids = new BoidsSystem(this.fishCount, bounds)
    const initialCounts = this.resolveVariantCounts()
    this.boidVariantIndices = this.buildBoidVariantIndices(initialCounts)
    
    // Initialize randomness arrays
    this.initializeRandomness()
    
    this.createDetailedFishMeshes(initialCounts)
    this.applyVariantLocomotionTuning()
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

    this.boids.params.cohesion = this.behaviorProfile.cohesion
    this.boids.params.separation = this.behaviorProfile.separation
    this.boids.params.alignment = this.behaviorProfile.alignment
    this.boids.setBehaviorTuning({
      speed: this.behaviorProfile.speed,
      turnBias: this.behaviorProfile.turnBias,
      avoidWalls: this.behaviorProfile.avoidWalls
    })
    this.applyVariantLocomotionTuning()
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
        locomotionProfileId: 'calm-cruiser',
        modelForwardAxis: {
          procedural: [1, 0, 0],
          school: [1, 0, 0],
          hero: [1, 0, 0]
        },
        patternTextureId: 'fish-tropical',
        baseColorTextureId: 'fish-tropical-basecolor',
        normalTextureId: 'fish-tropical-normal',
        roughnessTextureId: 'fish-tropical-roughness',
        alphaTextureId: 'fish-tropical-alpha',
        schoolModelId: 'fish-tropical-school',
        heroModelId: 'fish-tropical-hero',
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
        locomotionProfileId: 'disk-glider',
        modelForwardAxis: {
          procedural: [1, 0, 0],
          school: [1, 0, 0],
          hero: [1, 0, 0]
        },
        patternTextureId: 'fish-angelfish',
        baseColorTextureId: 'fish-angelfish-basecolor',
        normalTextureId: 'fish-angelfish-normal',
        roughnessTextureId: 'fish-angelfish-roughness',
        alphaTextureId: 'fish-angelfish-alpha',
        schoolModelId: 'fish-angelfish-school',
        heroModelId: 'fish-angelfish-hero',
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
        locomotionProfileId: 'slender-darter',
        modelForwardAxis: {
          procedural: [1, 0, 0],
          school: [1, 0, 0],
          hero: [1, 0, 0]
        },
        patternTextureId: 'fish-neon',
        baseColorTextureId: 'fish-neon-basecolor',
        normalTextureId: 'fish-neon-normal',
        roughnessTextureId: 'fish-neon-roughness',
        alphaTextureId: 'fish-neon-alpha',
        schoolModelId: 'fish-neon-school',
        heroModelId: 'fish-neon-hero',
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
        locomotionProfileId: 'goldfish-wobble',
        modelForwardAxis: {
          procedural: [1, 0, 0],
          school: [1, 0, 0],
          hero: [1, 0, 0]
        },
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-goldfish-school',
        heroModelId: 'fish-goldfish-hero',
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

  private resolveVariantCounts(countsPerVariant?: number[]): number[] {
    const fallbackCounts = this.variants.map((_variant, index) => {
      const fishPerVariant = Math.ceil(this.fishCount / this.variants.length)
      return Math.max(0, Math.min(fishPerVariant, this.fishCount - index * fishPerVariant))
    })

    return countsPerVariant ?? fallbackCounts
  }

  private buildBoidVariantIndices(countsPerVariant: number[]): number[] {
    return countsPerVariant.flatMap((count, variantIndex) => Array.from({ length: Math.max(0, count ?? 0) }, () => variantIndex))
  }

  private getBoidVariantIndex(index: number): number {
    const variantIndices = this.boidVariantIndices ?? []
    const variantCount = this.variants?.length ?? 0

    if (variantIndices[index] !== undefined) {
      return variantIndices[index]
    }

    if (variantCount <= 0) {
      return 0
    }

    return Math.min(index, variantCount - 1)
  }

  private getLocomotionProfile(variant: FishVariant): LocomotionProfile {
    return LOCOMOTION_PROFILES[variant.locomotionProfileId ?? 'calm-cruiser']
  }

  private getModelForwardAxis(variant: FishVariant, renderPath: FishRenderPath): THREE.Vector3 {
    const axis = variant.modelForwardAxis?.[renderPath] ?? DEFAULT_FORWARD_AXIS
    const forwardAxis = this.tempForwardAxis ?? new THREE.Vector3()
    this.tempForwardAxis = forwardAxis
    return forwardAxis.set(axis[0], axis[1], axis[2]).normalize()
  }

  private resolveHeadingQuaternion(
    variant: FishVariant,
    renderPath: FishRenderPath,
    direction: THREE.Vector3
  ): THREE.Quaternion {
    const headingQuaternion = this.tempQuaternion ?? new THREE.Quaternion()
    this.tempQuaternion = headingQuaternion
    if (direction.lengthSq() === 0) {
      return headingQuaternion.identity()
    }

    return headingQuaternion.setFromUnitVectors(
      this.getModelForwardAxis(variant, renderPath),
      direction.clone().normalize()
    )
  }

  private applyVariantLocomotionTuning(): void {
    if (!this.boids || typeof (this.boids as unknown as { setBoidTuning?: unknown }).setBoidTuning !== 'function') {
      return
    }

    this.boids.boids.forEach((_boid, index) => {
      const variant = this.variants[this.getBoidVariantIndex(index)] ?? this.variants[0]
      if (!variant) return

      const profile = this.getLocomotionProfile(variant)
      this.boids.setBoidTuning(index, {
        cruiseSpeed: profile.cruiseSpeed,
        yawResponsiveness: profile.yawResponsiveness,
        cruiseBias: profile.cruiseBias,
        turnNoise: profile.turnNoise,
        boundaryArcRadius: profile.boundaryArcRadius,
        steeringWeights: profile.steeringWeights
      })
    })
  }
  
  private initializeRandomness(): void {
    // Create arrays for individual fish randomness
    this.randomOffsets = new Float32Array(this.fishCount)
    this.swimPhases = new Float32Array(this.fishCount)
    this.speedMultipliers = new Float32Array(this.fishCount)
    this.wanderTargets = []
    this.smoothedQuaternions = Array.from({ length: this.fishCount }, () => new THREE.Quaternion())
    this.previousVelocities = Array.from({ length: this.fishCount }, () => new THREE.Vector3())
    this.headingInitialized = Array.from({ length: this.fishCount }, () => false)

    const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
    const boundsSize = this.tempBoundsSize ?? new THREE.Vector3()
    bounds.getSize(boundsSize)
    this.tempBoundsSize = boundsSize
    const xInset = boundsSize.x * 0.09
    const yInset = boundsSize.y * 0.24
    const zInset = boundsSize.z * 0.3
    const xMin = bounds.min.x + xInset
    const xMax = bounds.max.x - xInset
    const yMin = bounds.min.y + yInset
    const yMax = bounds.max.y - yInset
    const zMin = bounds.min.z + zInset
    const zMax = bounds.max.z - zInset
    
    for (let i = 0; i < this.fishCount; i++) {
      const variant = this.variants?.[this.getBoidVariantIndex(i)] ?? this.variants?.[0]
      const profile = variant ? this.getLocomotionProfile(variant) : LOCOMOTION_PROFILES['calm-cruiser']

      // Random offset for animations (0 to 2π)
      this.randomOffsets[i] = Math.random() * Math.PI * 2
      
      // Random swim phase for different timing
      this.swimPhases[i] = Math.random() * Math.PI * 2
      
      // Variant-aware cadence spread keeps schools from sharing one rhythm.
      const minSpeed = THREE.MathUtils.clamp(0.84 + ((profile.cruiseSpeed - 1) * 0.12), 0.76, 0.98)
      const maxSpeed = THREE.MathUtils.clamp(minSpeed + 0.18 + (profile.turnNoise * 0.12), minSpeed + 0.12, 1.22)
      this.speedMultipliers[i] = THREE.MathUtils.lerp(minSpeed, maxSpeed, Math.random())
      
      // Keep initial wander targets inside a tank-relative cruising band.
      this.wanderTargets.push(new THREE.Vector3(
        THREE.MathUtils.lerp(xMin, xMax, Math.random()),
        THREE.MathUtils.lerp(yMin, yMax, Math.random()),
        THREE.MathUtils.lerp(zMin, zMax, Math.random())
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

        const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
        const boundsSize = this.tempBoundsSize ?? new THREE.Vector3()
        bounds.getSize(boundsSize)
        this.tempBoundsSize = boundsSize
        const lateralDistance = boundsSize.x * (0.22 + Math.random() * 0.2)
        const verticalDistance = boundsSize.y * (0.025 + Math.random() * 0.05)
        const depthDistance = boundsSize.z * (0.03 + Math.random() * 0.07)

        this.tempWanderDirection.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.7,
          (Math.random() - 0.5) * 0.5
        ).normalize()

        this.tempWanderTarget.copy(this.tempWanderDirection)
          .set(
            this.tempWanderDirection.x * lateralDistance,
            this.tempWanderDirection.y * verticalDistance,
            this.tempWanderDirection.z * depthDistance
          )
          .add(this.tempCurrentPos)

        this.tempWanderTarget.x = THREE.MathUtils.clamp(
          this.tempWanderTarget.x,
          bounds.min.x + boundsSize.x * 0.06,
          bounds.max.x - boundsSize.x * 0.06
        )
        this.tempWanderTarget.y = THREE.MathUtils.clamp(
          this.tempWanderTarget.y,
          bounds.min.y + boundsSize.y * 0.16,
          bounds.max.y - boundsSize.y * 0.16
        )
        this.tempWanderTarget.z = THREE.MathUtils.clamp(
          this.tempWanderTarget.z,
          bounds.min.z + boundsSize.z * 0.2,
          bounds.max.z - boundsSize.z * 0.2
        )

        this.wanderTargets[fishIndex].copy(this.tempWanderTarget)
      }
    }
  }
  
  private createDetailedFishMeshes(countsPerVariant?: number[]): void {
    const counts = this.resolveVariantCounts(countsPerVariant)
    this.boidVariantIndices = this.buildBoidVariantIndices(counts)

    this.variants.forEach((variant, variantIndex) => {
      const actualCount = counts[variantIndex] ?? 0
      if (actualCount <= 0) return
      
      const schoolAsset = this.getVisualModel(variant.schoolModelId)
      const sourceMesh = schoolAsset?.sourceMesh ?? null
      const fishGeometry = sourceMesh?.geometry ?? this.createDetailedFishGeometry(variant)
      const fishMaterial = sourceMesh
        ? this.createFishAssetMaterial(sourceMesh.material, variant, false)
        : this.createFishMaterial(variant)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.userData.variantIndex = variantIndex
      instancedMesh.userData.renderPath = sourceMesh ? 'school' : 'procedural'
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      
      // 個体差のある色を設定
      const colors = new Float32Array(actualCount * 3)
      const useSubtleInstanceTint = !!schoolAsset || !!variant.baseColorTextureId
      for (let i = 0; i < actualCount; i++) {
        const color = new THREE.Color()
        if (useSubtleInstanceTint) {
          const brightness = 0.9 + (Math.random() * 0.08)
          color.setRGB(brightness, brightness, brightness)
        } else {
          const hue = Math.random() * 0.1 - 0.05
          const saturation = 0.8 + Math.random() * 0.2
          const lightness = 0.5 + Math.random() * 0.3
          const hslTarget = { h: 0, s: 0, l: 0 }
          color.setHSL(
            (variant.primaryColor.getHSL(hslTarget).h + hue) % 1,
            saturation,
            lightness
          )
        }
        
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }
      
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
      this.instancedMeshes.push(instancedMesh)
      this.group.add(instancedMesh)
    })

    this.baseInstanceCounts = this.instancedMeshes.map(mesh => mesh.count)
    this.createHeroFishMeshes(counts)
  }

  private createHeroFishMeshes(counts: number[]): void {
    this.heroAssignments.clear()

    const candidates: Array<{
      boidIndex: number
      variantIndex: number
      priority: number
      slotIndex: number
    }> = []

    let boidStartIndex = 0
    counts.forEach((count, variantIndex) => {
      const normalizedCount = Math.max(0, count ?? 0)
      if (normalizedCount <= 0) {
        return
      }

      const heroSlots = Math.min(normalizedCount, normalizedCount >= 6 ? 2 : 1)
      for (let slotIndex = 0; slotIndex < heroSlots; slotIndex++) {
        candidates.push({
          boidIndex: boidStartIndex + Math.min(slotIndex * 2, normalizedCount - 1),
          variantIndex,
          priority: normalizedCount - (slotIndex * 1.25),
          slotIndex
        })
      }

      boidStartIndex += normalizedCount
    })

    const placements = [
      { lateralOffset: -1.25, verticalOffset: 0.12, depthOffset: 1.75, scaleMultiplier: 2.4 },
      { lateralOffset: 1.05, verticalOffset: -0.08, depthOffset: 1.42, scaleMultiplier: 2.1 },
      { lateralOffset: 0.18, verticalOffset: 0.32, depthOffset: 1.92, scaleMultiplier: 1.9 }
    ]

    candidates
      .sort((left, right) => right.priority - left.priority)
      .slice(0, placements.length)
      .forEach((candidate, index) => {
        const variant = this.variants[candidate.variantIndex]
        if (!variant) return

        const heroAsset = this.getVisualModel(variant.heroModelId)
        const heroObject = this.createHeroFishObject(variant, heroAsset)
        heroObject.visible = this.currentQuality === 'standard'
        heroObject.userData = {
          ...heroObject.userData,
          role: 'hero-fish',
          variantIndex: candidate.variantIndex
        }

        const placement = placements[index] ?? placements[placements.length - 1]
        const isSlenderVariant = variant.name === 'Neon'
        this.heroAssignments.set(candidate.boidIndex, {
          object: heroObject,
          body: (heroObject.userData.motionNodes as { body?: THREE.Object3D } | undefined)?.body ?? heroObject,
          tail: (heroObject.userData.motionNodes as { tail?: THREE.Object3D | null } | undefined)?.tail ?? null,
          lateralOffset: placement.lateralOffset,
          verticalOffset: placement.verticalOffset,
          depthOffset: placement.depthOffset,
          scaleMultiplier: placement.scaleMultiplier * (isSlenderVariant ? 1.28 : 1)
        })
        this.heroFishMeshes.push(heroObject)
        this.group.add(heroObject)
      })
  }

  private createHeroFishObject(
    variant: FishVariant,
    heroAsset: LoadedModelAsset | null
  ): THREE.Object3D {
    const sourceMesh = heroAsset?.sourceMesh ?? null
    if (sourceMesh) {
      const heroMesh = new THREE.Mesh(
        sourceMesh.geometry,
        this.createHeroFishMaterial(sourceMesh.material, variant)
      )
      heroMesh.castShadow = true
      heroMesh.receiveShadow = true
      return this.wrapHeroMotionObject(heroMesh, variant)
    }

    if (heroAsset?.scene) {
      const heroGroup = heroAsset.scene.clone(true)
      heroGroup.traverse((object) => {
        const mesh = object as THREE.Mesh
        const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
        if (!(mesh instanceof THREE.Mesh)) return

        if (Array.isArray(material)) {
          mesh.material = material.map((entry) => this.createHeroFishMaterial(entry, variant))
        } else if (material instanceof THREE.Material) {
          mesh.material = this.createHeroFishMaterial(material, variant)
        }

        mesh.castShadow = true
        mesh.receiveShadow = true
      })

      return this.wrapHeroMotionObject(heroGroup, variant)
    }

    const heroMaterial = this.createFishMaterial(variant).clone()
    heroMaterial.envMapIntensity = Math.min(1.08, (heroMaterial.envMapIntensity ?? 0.68) + 0.12)
    heroMaterial.clearcoat = Math.min(1, (heroMaterial.clearcoat ?? 0.72) + 0.08)
    heroMaterial.emissive.set(0x000000)
    heroMaterial.emissiveIntensity = 0

    const heroMesh = new THREE.Mesh(this.createDetailedFishGeometry(variant), heroMaterial)
    heroMesh.castShadow = true
    heroMesh.receiveShadow = true
    return this.wrapHeroMotionObject(heroMesh, variant)
  }

  private wrapHeroMotionObject(body: THREE.Object3D, variant: FishVariant): THREE.Group {
    const root = new THREE.Group()
    root.add(body)
    const tail = this.findHeroTailTarget(body, variant)
    root.userData.motionNodes = {
      body,
      tail,
      bodyRotation: body.rotation.clone(),
      tailRotation: tail?.rotation.clone() ?? null
    }
    return root
  }

  private findHeroTailTarget(root: THREE.Object3D, variant: FishVariant): THREE.Object3D | null {
    let namedTail: THREE.Object3D | null = null
    const forwardAxis = new THREE.Vector3(
      ...(variant.modelForwardAxis?.hero ?? DEFAULT_FORWARD_AXIS)
    ).normalize()
    let fallbackTail: THREE.Object3D | null = null
    let fallbackTailAftness = Number.NEGATIVE_INFINITY

    root.traverse((object) => {
      if (object === root) return

      const lowerName = object.name.toLowerCase()
      if (!namedTail && /tail|caudal|rear/.test(lowerName)) {
        namedTail = object
      }

      const aftness = -object.position.dot(forwardAxis)
      if (aftness > fallbackTailAftness) {
        fallbackTail = object
        fallbackTailAftness = aftness
      }
    })

    if (namedTail) return namedTail
    if (fallbackTail && fallbackTailAftness > 0.2) {
      return fallbackTail
    }

    return null
  }

  private createHeroFishMaterial(
    baseMaterial: THREE.Material,
    variant: FishVariant
  ): THREE.MeshPhysicalMaterial {
    const heroMaterial = this.createFishAssetMaterial(baseMaterial, variant, true)
    heroMaterial.envMapIntensity = Math.min(1.12, (heroMaterial.envMapIntensity ?? 0.95) + 0.12)
    heroMaterial.clearcoat = Math.min(1, (heroMaterial.clearcoat ?? 0.84) + 0.08)
    heroMaterial.emissive.set(0x000000)
    heroMaterial.emissiveIntensity = 0
    return heroMaterial
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
    this.boidVariantIndices = this.buildBoidVariantIndices(countsPerVariant)
    this.initializeRandomness()
    this.createDetailedFishMeshes(countsPerVariant)
  }

  private ensureHeadingState(): void {
    const count = Number.isFinite(this.fishCount) ? this.fishCount : this.boids?.boids?.length ?? 0

    if (!this.smoothedQuaternions || this.smoothedQuaternions.length !== count) {
      this.smoothedQuaternions = Array.from({ length: count }, () => new THREE.Quaternion())
    }

    if (!this.previousVelocities || this.previousVelocities.length !== count) {
      this.previousVelocities = Array.from({ length: count }, () => new THREE.Vector3())
    }

    if (!this.headingInitialized || this.headingInitialized.length !== count) {
      this.headingInitialized = Array.from({ length: count }, () => false)
    }
  }

  private shouldTrigger(ratePerSecond: number, deltaTime: number): boolean {
    if (deltaTime <= 0 || ratePerSecond <= 0) {
      return false
    }

    return Math.random() < Math.min(1, ratePerSecond * deltaTime)
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
      if ((texture.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) return
      texture.dispose()
      disposed.add(texture)
    })
  }

  private getVisualTexture(id?: string): THREE.Texture | null {
    if (!id) return null
    return this.visualAssets?.textures?.[id] ?? null
  }

  private getVisualModel(id?: string): LoadedModelAsset | null {
    if (!id) return null
    return this.visualAssets?.models[id] ?? null
  }

  private getGenericFishDetailTexture(kind: 'normal' | 'roughness'): THREE.Texture | null {
    return this.getVisualTexture(kind === 'normal' ? 'fish-scale-normal' : 'fish-scale-roughness')
  }

  private createFishAssetMaterial(
    baseMaterial: THREE.Material,
    variant: FishVariant,
    hero: boolean
  ): THREE.MeshPhysicalMaterial {
    const texturedMaterial = baseMaterial as THREE.MeshStandardMaterial & {
      clearcoat?: number
      clearcoatRoughness?: number
      envMapIntensity?: number
      alphaMap?: THREE.Texture | null
    }
    const resolvedMap =
      texturedMaterial.map ??
      this.getVisualTexture(variant.baseColorTextureId) ??
      this.getVisualTexture(variant.patternTextureId)
    const resolvedAlphaMap = texturedMaterial.alphaMap ?? this.getVisualTexture(variant.alphaTextureId)
    const resolvedNormalMap =
      texturedMaterial.normalMap ??
      this.getVisualTexture(variant.normalTextureId) ??
      this.getGenericFishDetailTexture('normal')
    const resolvedRoughnessMap =
      texturedMaterial.roughnessMap ??
      this.getVisualTexture(variant.roughnessTextureId) ??
      this.getGenericFishDetailTexture('roughness')
    const resolvedAlphaTest = Math.max(texturedMaterial.alphaTest ?? 0, resolvedAlphaMap ? 0.05 : 0)
    const transparent = hero
      ? texturedMaterial.transparent || !!resolvedAlphaMap
      : texturedMaterial.transparent

    return new THREE.MeshPhysicalMaterial({
      map: resolvedMap,
      alphaMap: resolvedAlphaMap,
      normalMap: resolvedNormalMap,
      normalScale: new THREE.Vector2(hero ? 0.4 : 0.3, hero ? 0.24 : 0.18),
      roughnessMap: resolvedRoughnessMap,
      color: texturedMaterial.color?.clone() ?? new THREE.Color(0xffffff),
      metalness: typeof texturedMaterial.metalness === 'number' ? texturedMaterial.metalness : 0.04,
      roughness: hero ? 0.24 : 0.38,
      clearcoat: Math.max(hero ? 0.84 : 0.64, texturedMaterial.clearcoat ?? 0),
      clearcoatRoughness: Math.min(0.28, texturedMaterial.clearcoatRoughness ?? 0.2),
      reflectivity: 0.9,
      envMapIntensity: hero
        ? 0.95
        : Math.min(0.78, Math.max(0.62, texturedMaterial.envMapIntensity ?? 0)),
      transparent,
      alphaTest: resolvedAlphaTest,
      side: texturedMaterial.side ?? THREE.FrontSide
    })
  }

  private clearMeshes(): void {
    const heroFishMeshes = this.heroFishMeshes ?? []
    this.instancedMeshes.forEach((mesh) => {
      this.group.remove(mesh)
      if (!(mesh.geometry.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) {
        mesh.geometry.dispose()
      }
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

    heroFishMeshes.forEach((object) => {
      this.group.remove(object)
      object.traverse((child) => {
        const mesh = child as THREE.Mesh
        const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
        if (!(mesh instanceof THREE.Mesh)) return

        if (!(mesh.geometry.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) {
          mesh.geometry.dispose()
        }

        if (Array.isArray(material)) {
          material.forEach((entry) => {
            this.disposeMaterialTextures(entry)
            entry.dispose()
          })
          return
        }

        if (material instanceof THREE.Material) {
          this.disposeMaterialTextures(material)
          material.dispose()
        }
      })
    })
    this.heroFishMeshes = []
    this.heroAssignments?.clear()
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

  private createEmergencyFishTexture(variant: FishVariant): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      return texture
    }

    const width = canvas.width
    const height = canvas.height
    const dorsalColor = variant.primaryColor.clone().multiplyScalar(0.58)
    const midColor = variant.primaryColor.clone().lerp(variant.secondaryColor, 0.28)
    const bellyColor = variant.secondaryColor.clone().lerp(new THREE.Color('#f5f6ea'), 0.52)

    ctx.clearRect(0, 0, width, height)
    const baseGradient = ctx.createLinearGradient(0, 0, 0, height)
    baseGradient.addColorStop(0, dorsalColor.getStyle())
    baseGradient.addColorStop(0.42, midColor.getStyle())
    baseGradient.addColorStop(1, bellyColor.getStyle())
    ctx.fillStyle = baseGradient
    ctx.fillRect(0, 0, width, height)

    ctx.globalAlpha = 0.18
    for (let i = -height; i < width; i += 22) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + height * 0.42, height)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const bodyGradient = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.9)
    bodyGradient.addColorStop(0, variant.primaryColor.clone().multiplyScalar(0.92).getStyle())
    bodyGradient.addColorStop(0.55, variant.primaryColor.clone().lerp(variant.secondaryColor, 0.18).getStyle())
    bodyGradient.addColorStop(1, variant.secondaryColor.clone().lerp(new THREE.Color('#fff8e8'), 0.6).getStyle())
    ctx.fillStyle = bodyGradient
    ctx.fillRect(width * 0.06, height * 0.14, width * 0.88, height * 0.72)

    const species = variant.name.toLowerCase()
    if (species === 'neon') {
      ctx.fillStyle = 'rgba(18, 224, 255, 0.9)'
      ctx.fillRect(width * 0.08, height * 0.42, width * 0.68, height * 0.09)
      ctx.fillStyle = 'rgba(255, 82, 162, 0.72)'
      ctx.fillRect(width * 0.44, height * 0.5, width * 0.34, height * 0.12)
      const tailGradient = ctx.createLinearGradient(width * 0.72, 0, width * 0.94, 0)
      tailGradient.addColorStop(0, 'rgba(93, 157, 255, 0.18)')
      tailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)')
      ctx.fillStyle = tailGradient
      ctx.fillRect(width * 0.72, height * 0.28, width * 0.2, height * 0.38)
    } else if (species === 'angelfish') {
      ctx.fillStyle = 'rgba(36, 44, 64, 0.55)'
      ;[0.22, 0.38, 0.56].forEach((offset) => {
        ctx.fillRect(width * offset, height * 0.16, width * 0.05, height * 0.72)
      })
      ctx.fillStyle = 'rgba(245, 250, 255, 0.26)'
      ctx.fillRect(width * 0.18, height * 0.04, width * 0.16, height * 0.16)
      ctx.fillRect(width * 0.26, height * 0.8, width * 0.18, height * 0.14)
    } else if (species === 'goldfish') {
      const warmGradient = ctx.createLinearGradient(width * 0.08, 0, width * 0.86, 0)
      warmGradient.addColorStop(0, 'rgba(255, 213, 143, 0.92)')
      warmGradient.addColorStop(0.45, 'rgba(255, 155, 74, 0.84)')
      warmGradient.addColorStop(1, 'rgba(255, 108, 46, 0.72)')
      ctx.fillStyle = warmGradient
      ctx.fillRect(width * 0.08, height * 0.2, width * 0.82, height * 0.58)
      ctx.fillStyle = 'rgba(255, 244, 221, 0.38)'
      ctx.fillRect(width * 0.1, height * 0.28, width * 0.18, height * 0.22)
      ctx.fillStyle = 'rgba(255, 246, 231, 0.28)'
      ctx.fillRect(width * 0.76, height * 0.18, width * 0.14, height * 0.5)
    } else {
      ctx.fillStyle = 'rgba(43, 54, 80, 0.5)'
      ctx.fillRect(width * 0.13, height * 0.33, width * 0.2, height * 0.06)
      ctx.fillStyle = 'rgba(255, 229, 148, 0.72)'
      ctx.fillRect(width * 0.08, height * 0.48, width * 0.54, height * 0.14)
      ctx.fillStyle = 'rgba(255, 249, 235, 0.3)'
      ctx.fillRect(width * 0.74, height * 0.22, width * 0.16, height * 0.42)
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.fillRect(width * 0.16, height * 0.22, width * 0.44, height * 0.07)
    ctx.fillStyle = 'rgba(23, 28, 40, 0.78)'
    ctx.beginPath()
    ctx.arc(width * 0.16, height * 0.48, height * 0.055, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.arc(width * 0.145, height * 0.46, height * 0.018, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }
  
  private createFishMaterial(variant: FishVariant): THREE.MeshPhysicalMaterial {
    const speciesBaseColorTexture = this.getVisualTexture(variant.baseColorTextureId)
    const speciesNormalTexture = this.getVisualTexture(variant.normalTextureId)
    const speciesRoughnessTexture = this.getVisualTexture(variant.roughnessTextureId)
    const speciesAlphaTexture = this.getVisualTexture(variant.alphaTextureId)
    const legacyPatternTexture = this.getVisualTexture(variant.patternTextureId)
    const resolvedMap = speciesBaseColorTexture ?? legacyPatternTexture
    if (resolvedMap) {
      const alphaTest = speciesAlphaTexture ? 0.05 : 0
      const materialOptions: THREE.MeshPhysicalMaterialParameters = {
        map: resolvedMap,
        normalMap: speciesNormalTexture,
        roughnessMap: speciesRoughnessTexture,
        alphaMap: speciesAlphaTexture,
        color: 0xffffff,
        metalness: 0.04,
        roughness: 0.28,
        clearcoat: 0.82,
        clearcoatRoughness: 0.18,
        reflectivity: 0.9,
        envMapIntensity: 0.7,
        transparent: false,
        alphaTest,
        side: THREE.FrontSide
      }
      if (speciesNormalTexture) {
        materialOptions.normalScale = new THREE.Vector2(0.3, 0.18)
      }
      return new THREE.MeshPhysicalMaterial(materialOptions)
    }

    const texture = this.createEmergencyFishTexture(variant)
    
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      metalness: 0.04,
      roughness: 0.42,
      clearcoat: 0.58,
      clearcoatRoughness: 0.24,
      reflectivity: 0.9,
      envMapIntensity: 0.46,
      transparent: false,
      side: THREE.FrontSide
    })
  }
  
  update(deltaTime: number, elapsedTime: number): void {
    this.updateWanderTargets(elapsedTime)
    const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
    const behavior = this.behaviorProfile ?? DEFAULT_BEHAVIOR_PROFILE
    const boundsSize = this.tempBoundsSize ?? new THREE.Vector3()
    const depthForce = this.tempDepthForce ?? new THREE.Vector3()
    const horizontalDirection = this.tempHorizontalDirection ?? new THREE.Vector3()
    const horizontalPreviousDirection = this.tempHorizontalPreviousDirection ?? new THREE.Vector3()
    const safeDeltaTime = Math.max(0, deltaTime)
    bounds.getSize(boundsSize)
    this.tempBoundsSize = boundsSize
    this.tempDepthForce = depthForce
    this.tempHorizontalDirection = horizontalDirection
    this.tempHorizontalPreviousDirection = horizontalPreviousDirection
    this.ensureHeadingState()

    this.boids.boids.forEach((boid, index) => {
      if (index >= this.wanderTargets.length) return

      const variant = this.variants[this.getBoidVariantIndex(index)] ?? this.variants[0]
      if (!variant) return

      const locomotion = this.getLocomotionProfile(variant)
      const moodCruiseStrength = behavior.schoolMood === 'alert'
        ? 1.04
        : behavior.schoolMood === 'feeding'
          ? 0.94
          : 0.88
      const wanderStrength = (0.18 + locomotion.curiosityRate * 0.16) * moodCruiseStrength
      const jitterScale = locomotion.turnNoise * (0.035 + behavior.turnBias * 0.04)
      const curiosityRate = locomotion.curiosityRate * (0.014 + behavior.turnBias * 0.028)
      const suddenTurnRate = locomotion.suddenTurnRate * (0.7 + behavior.turnBias * 0.4)
      const turnNoiseScale = locomotion.turnNoise * (0.05 + behavior.turnBias * 0.06)
      const depthRange = boundsSize.y * (0.08 + behavior.depthVariance * 0.18 + locomotion.depthBobAmount * 0.04)
      const depthForceScale = 0.45 + behavior.depthVariance * 0.9 + locomotion.depthBobAmount * 0.5

      this.tempWanderForce.copy(this.wanderTargets[index]).sub(boid.position)
      if (this.tempWanderForce.lengthSq() > 0) {
        const distanceScale = Math.min(1.22, 0.5 + (this.tempWanderForce.length() / Math.max(boundsSize.x, 1)))
        this.tempWanderForce.normalize().multiplyScalar(wanderStrength * this.speedMultipliers[index] * distanceScale)
      }

      this.tempJitter.set(
        (Math.random() - 0.5) * jitterScale,
        (Math.random() - 0.5) * jitterScale * 0.28,
        (Math.random() - 0.5) * jitterScale * 0.18
      )

      this.tempNoiseForce.set(
        Math.sin(elapsedTime * (0.18 + locomotion.tailBeatFreq * 0.16) + this.randomOffsets[index]) * turnNoiseScale,
        Math.sin(elapsedTime * (0.14 + locomotion.depthBobAmount * 0.5) + this.randomOffsets[index] * 1.6) * turnNoiseScale * 0.28,
        Math.sin(elapsedTime * (0.12 + locomotion.boundaryArcRadius * 0.26) + this.randomOffsets[index] * 2.4) * turnNoiseScale * 0.22
      )

      const desiredY = bounds.max.y -
        (behavior.preferredDepth * boundsSize.y) +
        (Math.sin(elapsedTime * (0.3 + locomotion.depthBobAmount) + this.randomOffsets[index]) * depthRange)
      depthForce.set(0, desiredY - boid.position.y, 0).multiplyScalar(depthForceScale)

      if (this.shouldTrigger(curiosityRate, safeDeltaTime)) {
        this.tempCuriosityForce.set(
          (Math.random() - 0.5) * (0.24 + locomotion.curiosityRate * 0.22),
          (Math.random() - 0.5) * (0.1 + locomotion.depthBobAmount * 0.16),
          (Math.random() - 0.5) * (0.1 + locomotion.turnNoise * 0.18)
        )
        boid.acceleration.add(this.tempCuriosityForce)
      }

      if (this.shouldTrigger(suddenTurnRate, safeDeltaTime)) {
        this.tempSuddenTurn.set(
          (Math.random() - 0.5) * (0.16 + locomotion.yawResponsiveness * 0.18),
          (Math.random() - 0.5) * (0.08 + locomotion.depthBobAmount * 0.12),
          (Math.random() - 0.5) * (0.08 + locomotion.turnNoise * 0.14)
        )
        boid.acceleration.add(this.tempSuddenTurn)
      }

      boid.acceleration
        .add(this.tempWanderForce)
        .add(this.tempJitter)
        .add(this.tempNoiseForce)
        .add(depthForce)
    })

    this.boids.update(safeDeltaTime)

    let boidIndex = 0

    this.instancedMeshes.forEach((mesh, meshIndex) => {
      const heroAssignments = this.heroAssignments ?? new Map()
      const variantIndex =
        typeof mesh.userData.variantIndex === 'number' ? mesh.userData.variantIndex : meshIndex
      const variant = this.variants[variantIndex] ?? this.variants[meshIndex]
      if (!variant) return

      const renderPath = mesh.userData.renderPath === 'school' ? 'school' : 'procedural'
      const locomotion = this.getLocomotionProfile(variant)
      const headingFollowRate = 2.4 + locomotion.yawResponsiveness * 2.2 + behavior.avoidWalls * 1.1
      const instanceCount = mesh.count

      for (let i = 0; i < instanceCount && boidIndex < this.boids.boids.length; i++, boidIndex++) {
        const boid = this.boids.boids[boidIndex]
        const randomOffset = this.randomOffsets[boidIndex] ?? 0
        const swimPhase = this.swimPhases[boidIndex] ?? 0
        const speedMult = this.speedMultipliers[boidIndex] ?? 1
        const smoothedQuaternion = this.smoothedQuaternions[boidIndex]
        const previousVelocity = this.previousVelocities[boidIndex]

        this.dummy.position.copy(boid.position)
        this.tempDirection.copy(boid.velocity)

        let climbAngle = 0
        let bank = 0
        if (this.tempDirection.lengthSq() > 0) {
          this.tempDirection.normalize()
          const targetQuaternion = this.resolveHeadingQuaternion(variant, renderPath, this.tempDirection)

          if (!this.headingInitialized[boidIndex]) {
            smoothedQuaternion.copy(targetQuaternion)
            this.headingInitialized[boidIndex] = true
          } else {
            smoothedQuaternion.slerp(targetQuaternion, 1 - Math.exp(-headingFollowRate * safeDeltaTime))
          }

          this.dummy.setRotationFromQuaternion(smoothedQuaternion)

          horizontalDirection.copy(this.tempDirection).setY(0)
          horizontalPreviousDirection.copy(previousVelocity).setY(0)
          let yawChange = 0
          if (horizontalDirection.lengthSq() > 0 && horizontalPreviousDirection.lengthSq() > 0) {
            horizontalDirection.normalize()
            horizontalPreviousDirection.normalize()
            yawChange = Math.atan2(
              (horizontalPreviousDirection.x * horizontalDirection.z) -
                (horizontalPreviousDirection.z * horizontalDirection.x),
              horizontalPreviousDirection.dot(horizontalDirection)
            )
          }

          const horizontalSpeed = Math.sqrt(
            (this.tempDirection.x * this.tempDirection.x) + (this.tempDirection.z * this.tempDirection.z)
          )
          climbAngle = Math.atan2(this.tempDirection.y, Math.max(horizontalSpeed, 0.0001))
          bank = THREE.MathUtils.clamp(
            -yawChange * (0.55 + locomotion.bankAmount * 0.75),
            -locomotion.bankAmount,
            locomotion.bankAmount
          )
          this.dummy.rotation.x += climbAngle * (0.18 + locomotion.yawResponsiveness * 0.06)
          this.dummy.rotation.z += bank
          previousVelocity.copy(boid.velocity)
        }

        const swimFreq = locomotion.tailBeatFreq * speedMult * (0.92 + Math.sin(randomOffset) * 0.18)
        const bodySway = Math.sin(elapsedTime * swimFreq + swimPhase) * locomotion.bodyWiggleAmount * 0.07
        const microPitch = Math.sin(elapsedTime * (swimFreq * 0.52) + swimPhase * 0.7) * locomotion.bodyWiggleAmount * 0.02
        const tailWave = Math.sin(elapsedTime * (swimFreq * 1.35) + swimPhase * 1.35) * locomotion.bodyWiggleAmount * 0.24
        this.dummy.rotation.z += bodySway
        this.dummy.rotation.x += microPitch

        const floatWave = Math.sin(elapsedTime * (0.52 + locomotion.depthBobAmount * 0.38) + randomOffset) *
          (0.004 + behavior.depthVariance * 0.008 + locomotion.depthBobAmount * 0.006) *
          speedMult
        this.dummy.position.y += floatWave

        const sideDrift = Math.sin(elapsedTime * (0.36 + locomotion.turnNoise * 0.24) + randomOffset * 2) *
          locomotion.bodyWiggleAmount *
          0.0025
        this.dummy.position.x += sideDrift

        const breathingSpeed = 0.32 + locomotion.tailBeatFreq * 0.06 + Math.sin(randomOffset * 4) * 0.08
        const breathing = Math.sin(elapsedTime * breathingSpeed + swimPhase) * 0.012 + 1.0
        const scale = variant.scale * breathing * (0.98 + Math.sin(randomOffset * 7) * 0.04)
        this.dummy.scale.set(scale, scale, scale)

        const heroAssignment = heroAssignments.get(boidIndex)
        if (heroAssignment && heroAssignment.object.visible) {
          heroAssignment.object.position.copy(this.dummy.position)
          heroAssignment.object.position.x += heroAssignment.lateralOffset
          heroAssignment.object.position.y += heroAssignment.verticalOffset
          heroAssignment.object.position.z += heroAssignment.depthOffset
          if (this.tempDirection.lengthSq() > 0) {
            const heroQuaternion = this.resolveHeadingQuaternion(variant, 'hero', this.tempDirection)
            heroAssignment.object.quaternion.copy(heroQuaternion)
            heroAssignment.object.rotation.x += climbAngle * (0.18 + locomotion.yawResponsiveness * 0.06)
            heroAssignment.object.rotation.z += bank
          } else {
            heroAssignment.object.quaternion.copy(this.dummy.quaternion)
          }
          this.applyHeroLocalMotion(heroAssignment.object, bodySway, microPitch, tailWave)
          heroAssignment.object.scale.setScalar(scale * heroAssignment.scaleMultiplier)
          heroAssignment.object.updateMatrixWorld()
          this.dummy.scale.setScalar(0.0001)
        }

        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }

      mesh.instanceMatrix.needsUpdate = true
    })
  }

  private applyHeroLocalMotion(
    heroObject: THREE.Object3D,
    bodySway: number,
    bodyPitch: number,
    tailWave: number
  ): void {
    const motionNodes = heroObject.userData.motionNodes as {
      body?: THREE.Object3D
      tail?: THREE.Object3D | null
      bodyRotation?: THREE.Euler
      tailRotation?: THREE.Euler | null
    } | undefined
    const body = motionNodes?.body
    if (!body) return

    body.rotation.copy(motionNodes?.bodyRotation ?? new THREE.Euler())

    const tail = motionNodes?.tail ?? null
    if (tail) {
      tail.rotation.copy(motionNodes?.tailRotation ?? new THREE.Euler())
      body.rotation.z += bodySway * 0.55
      body.rotation.x += bodyPitch * 0.85
      tail.rotation.y += tailWave
      tail.rotation.z += bodySway * 0.4
      return
    }

    body.rotation.z += (bodySway * 0.7) + (tailWave * 0.12)
    body.rotation.x += bodyPitch
  }

  getVisibleFishCount(): number {
    return this.instancedMeshes.reduce((count, mesh) => count + mesh.count, 0)
  }

  getHeroFocusPoint(): THREE.Vector3 | null {
    const heroFishMeshes = this.heroFishMeshes ?? []
    const visibleHero = heroFishMeshes.find((object) => object.visible)
    return visibleHero ? visibleHero.position.clone() : null
  }
  
  setMotionEnabled(enabled: boolean): void {
    if (!enabled) {
      for (const boid of this.boids.boids) {
        boid.velocity.multiplyScalar(0)
        boid.acceleration.multiplyScalar(0)
      }
    }
  }

  setQuality(quality: QualityLevel): void {
    this.currentQuality = quality
    const heroFishMeshes = this.heroFishMeshes ?? []
    const qualityScale = quality === 'simple' ? 0.5 : 1
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

    heroFishMeshes.forEach((object) => {
      object.visible = quality === 'standard'
    })
  }
}
