import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BoidsSystem } from '../utils/Boids'
import type { AquascapeLayoutStyle, FishGroup, SchoolMood, Tuning } from '../types/aquarium'
import { getFishContent, getFishContentList } from '../content/registry'
import type { LoadedModelAsset, VisualAssetBundle } from '../assets/visualAssets'
import type { QualityLevel } from '../types/settings'
import {
  resolveRuntimeLayoutSeed,
  resolveSubstrateHardscapeAnchors,
  resolveSubstratePlantAnchors
} from './Aquascaping'
import {
  createFishSafeBounds,
  resolveFishAxisExtents,
  type FishRenderExtents
} from './sceneBounds'

type AxisTuple = [number, number, number]
type QuaternionTuple = [number, number, number, number]

type OrientationCorrection = {
  modelForwardAxis?: AxisTuple
  correctionQuaternion?: QuaternionTuple
}

type GaitState = 'cruise' | 'inspect' | 'glide' | 'burst' | 'hover'
type PreferredDepthBand = 'upper' | 'mid' | 'hardscape-near'
type PreferredLateralLane = 'left' | 'center' | 'right'

type HabitatInterestPoint = {
  kind: 'hardscape' | 'plant' | 'open-lane'
  position: THREE.Vector3
  preferredDepthBands: PreferredDepthBand[]
  preferredLateralLanes: PreferredLateralLane[]
  weight: number
}

interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
  locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
  proceduralForwardAxis?: AxisTuple
  schoolForwardAxis?: AxisTuple
  heroForwardAxis?: AxisTuple
  proceduralCorrectionQuaternion?: QuaternionTuple
  schoolCorrectionQuaternion?: QuaternionTuple
  heroCorrectionQuaternion?: QuaternionTuple
  modelForwardAxis?: {
    procedural: AxisTuple
    school: AxisTuple
    hero: AxisTuple
  }
  orientationCorrection?: {
    procedural?: OrientationCorrection
    schoolGLB?: OrientationCorrection
    heroGLB?: OrientationCorrection
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
type FishSafePadding = {
  nose: number
  tail: number
  width: number
  height: number
}

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
  burstMultiplier: number
  glideFactor: number
  hoverDrag: number
  inspectCuriosity: number
  turnStartLag: number
  lanePull: number
  depthPull: number
  interestWeight: number
  retargetIntervalRange: [number, number]
  stateDurationRange: [number, number]
  stateWeights: Record<GaitState, number>
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
const ANGELFISH_GLB_CORRECTION: QuaternionTuple = [-0.70710678, 0, 0, 0.70710678]
const DEFAULT_ORIENTATION_CORRECTION: Required<OrientationCorrection> = {
  modelForwardAxis: DEFAULT_FORWARD_AXIS,
  correctionQuaternion: [0, 0, 0, 1]
}
const FISH_SAFE_PADDING_BY_PATH: Record<FishRenderPath, FishSafePadding> = {
  procedural: {
    nose: 0.12,
    tail: 0.14,
    width: 0.08,
    height: 0.1
  },
  school: {
    nose: 0.14,
    tail: 0.16,
    width: 0.09,
    height: 0.11
  },
  hero: {
    nose: 0.16,
    tail: 0.18,
    width: 0.1,
    height: 0.12
  }
}

const LOCOMOTION_PROFILES: Record<NonNullable<FishVariant['locomotionProfileId']>, LocomotionProfile> = {
  'calm-cruiser': {
    cruiseSpeed: 0.96,
    yawResponsiveness: 0.76,
    bankAmount: 0.24,
    tailBeatFreq: 1.18,
    bodyWiggleAmount: 0.22,
    curiosityRate: 0.32,
    depthBobAmount: 0.24,
    boundaryArcRadius: 1.08,
    cruiseBias: 0.86,
    turnNoise: 0.09,
    suddenTurnRate: 0.0048,
    burstMultiplier: 1.08,
    glideFactor: 0.82,
    hoverDrag: 0.92,
    inspectCuriosity: 0.42,
    turnStartLag: 0.12,
    lanePull: 0.3,
    depthPull: 0.28,
    interestWeight: 0.13,
    retargetIntervalRange: [6.4, 11.8],
    stateDurationRange: [5.8, 10.6],
    stateWeights: {
      cruise: 0.62,
      inspect: 0.08,
      glide: 0.2,
      burst: 0.03,
      hover: 0.07
    },
    steeringWeights: {
      alignment: 0.96,
      cohesion: 1.04,
      separation: 0.92
    }
  },
  'disk-glider': {
    cruiseSpeed: 0.82,
    yawResponsiveness: 0.54,
    bankAmount: 0.18,
    tailBeatFreq: 0.76,
    bodyWiggleAmount: 0.16,
    curiosityRate: 0.28,
    depthBobAmount: 0.2,
    boundaryArcRadius: 1.14,
    cruiseBias: 0.62,
    turnNoise: 0.05,
    suddenTurnRate: 0.003,
    burstMultiplier: 1.06,
    glideFactor: 0.72,
    hoverDrag: 1.04,
    inspectCuriosity: 0.36,
    turnStartLag: 0.16,
    lanePull: 0.22,
    depthPull: 0.26,
    interestWeight: 0.12,
    retargetIntervalRange: [7.2, 12.6],
    stateDurationRange: [6.8, 11.6],
    stateWeights: {
      cruise: 0.36,
      inspect: 0.08,
      glide: 0.34,
      burst: 0.02,
      hover: 0.2
    },
    steeringWeights: {
      alignment: 0.86,
      cohesion: 1.1,
      separation: 0.9
    }
  },
  'slender-darter': {
    cruiseSpeed: 1.28,
    yawResponsiveness: 1.24,
    bankAmount: 0.46,
    tailBeatFreq: 2.74,
    bodyWiggleAmount: 0.14,
    curiosityRate: 0.86,
    depthBobAmount: 0.16,
    boundaryArcRadius: 0.46,
    cruiseBias: 1.02,
    turnNoise: 0.26,
    suddenTurnRate: 0.014,
    burstMultiplier: 1.22,
    glideFactor: 0.9,
    hoverDrag: 0.62,
    inspectCuriosity: 0.66,
    turnStartLag: 0.04,
    lanePull: 0.46,
    depthPull: 0.24,
    interestWeight: 0.16,
    retargetIntervalRange: [4.2, 7.1],
    stateDurationRange: [4.2, 6.4],
    stateWeights: {
      cruise: 0.56,
      inspect: 0.12,
      glide: 0.06,
      burst: 0.2,
      hover: 0.06
    },
    steeringWeights: {
      alignment: 1.14,
      cohesion: 0.82,
      separation: 1.1
    }
  },
  'goldfish-wobble': {
    cruiseSpeed: 0.92,
    yawResponsiveness: 0.68,
    bankAmount: 0.28,
    tailBeatFreq: 1.54,
    bodyWiggleAmount: 0.62,
    curiosityRate: 0.54,
    depthBobAmount: 0.58,
    boundaryArcRadius: 0.94,
    cruiseBias: 0.68,
    turnNoise: 0.18,
    suddenTurnRate: 0.008,
    burstMultiplier: 1.08,
    glideFactor: 0.84,
    hoverDrag: 1.08,
    inspectCuriosity: 0.56,
    turnStartLag: 0.24,
    lanePull: 0.2,
    depthPull: 0.38,
    interestWeight: 0.18,
    retargetIntervalRange: [5.1, 9.8],
    stateDurationRange: [4.8, 8.8],
    stateWeights: {
      cruise: 0.32,
      inspect: 0.22,
      glide: 0.1,
      burst: 0.05,
      hover: 0.31
    },
    steeringWeights: {
      alignment: 0.88,
      cohesion: 0.98,
      separation: 0.88
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
  private nextRetargetTimes: Float32Array = new Float32Array()
  private nextStateChangeTimes: Float32Array = new Float32Array()
  private stateCooldowns: Float32Array = new Float32Array()
  private gaitStates: GaitState[] = []
  private preferredDepthBands: PreferredDepthBand[] = []
  private preferredLateralLanes: PreferredLateralLane[] = []
  private interestSeeds: Float32Array = new Float32Array()
  private activeInterestPoints: Array<HabitatInterestPoint | null> = []
  private habitatInterestPoints: HabitatInterestPoint[] = []
  private baseInstanceCounts: number[] = []
  private tempWanderForce = new THREE.Vector3()
  private tempJitter = new THREE.Vector3()
  private tempNoiseForce = new THREE.Vector3()
  private tempInterestForce = new THREE.Vector3()
  private tempDirection = new THREE.Vector3()
  private tempSuddenTurn = new THREE.Vector3()
  private tempCuriosityForce = new THREE.Vector3()
  private tempForwardAxis = new THREE.Vector3(1, 0, 0)
  private tempQuaternion = new THREE.Quaternion()
  private tempCorrectionQuaternion = new THREE.Quaternion()
  private tempHorizontalDirection = new THREE.Vector3()
  private tempHorizontalPreviousDirection = new THREE.Vector3()
  private tempCurrentPos = new THREE.Vector3()
  private tempWanderDirection = new THREE.Vector3()
  private tempWanderTarget = new THREE.Vector3()
  private tempDepthForce = new THREE.Vector3()
  private tempBoundsSize = new THREE.Vector3()
  private instancedTailMotionUniforms: Array<{ value: number }> = []
  private smoothedQuaternions: THREE.Quaternion[] = []
  private previousVelocities: THREE.Vector3[] = []
  private headingInitialized: boolean[] = []
  private behaviorProfile: BehaviorProfile = { ...DEFAULT_BEHAVIOR_PROFILE }
  private currentQuality: QualityLevel = 'standard'
  private visualAssets: VisualAssetBundle | null
  private layoutStyle: AquascapeLayoutStyle
  private layoutSeed: number
  private boidVariantIndices: number[] = []
  private heroAssignments = new Map<number, {
    object: THREE.Object3D
    body: THREE.Object3D
    tail: THREE.Object3D | null
    lateralOffset: number
    verticalOffset: number
    depthOffset: number
    scaleMultiplier: number
    fishSafeExtents: FishRenderExtents
  }>()
  
  constructor(
    scene: THREE.Scene,
    bounds: THREE.Box3,
    visualAssets: VisualAssetBundle | null = null,
    options: { layoutStyle?: AquascapeLayoutStyle; layoutSeed?: number } = {}
  ) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    this.layoutStyle = options.layoutStyle ?? 'planted'
    this.layoutSeed = resolveRuntimeLayoutSeed(scene, this.layoutStyle, options.layoutSeed)
    scene.add(this.group)

    this.bounds = bounds
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.fishCount = this.resolveDefaultFishCount(isMobile)
    
    this.variants = this.createFishVariants()
    this.boids = new BoidsSystem(this.fishCount, bounds)
    const initialCounts = this.resolveVariantCounts()
    this.boidVariantIndices = this.buildBoidVariantIndices(initialCounts)
    
    // Initialize randomness arrays
    this.initializeRandomness()
    
    this.createDetailedFishMeshes(initialCounts)
    this.applyVariantLocomotionTuning()
  }

  private resolveDefaultFishCount(isMobile: boolean): number {
    if (this.layoutStyle === 'nature-showcase') {
      return isMobile ? 14 : 24
    }

    return isMobile ? 25 : 66
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
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
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
        primaryColor: new THREE.Color(0xd9d6c8),
        secondaryColor: new THREE.Color(0x807a69),
        scale: 0.66,
        speed: 0.8,
        locomotionProfileId: 'disk-glider',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        schoolCorrectionQuaternion: ANGELFISH_GLB_CORRECTION,
        heroCorrectionQuaternion: ANGELFISH_GLB_CORRECTION,
        patternTextureId: 'fish-angelfish',
        baseColorTextureId: 'fish-angelfish-basecolor',
        normalTextureId: 'fish-angelfish-normal',
        roughnessTextureId: 'fish-angelfish-roughness',
        alphaTextureId: 'fish-angelfish-alpha',
        schoolModelId: 'fish-angelfish-school',
        heroModelId: 'fish-angelfish-hero',
        silhouette: {
          bodyLength: 1.08,
          bodyHeight: 0.64,
          bodyThickness: 0.2,
          noseLength: 0.2,
          tailLength: 0.34,
          tailHeight: 0.54,
          dorsalHeight: 0.98,
          ventralHeight: 1.02,
          pectoralLength: 0.22,
          topFullness: 0.92,
          bellyFullness: 0.9
        }
      },
      {
        name: 'Butterflyfish',
        primaryColor: new THREE.Color(0xf2cf63),
        secondaryColor: new THREE.Color(0xf6eed1),
        scale: 0.62,
        speed: 0.82,
        locomotionProfileId: 'disk-glider',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-butterflyfish',
        baseColorTextureId: 'fish-butterflyfish-basecolor',
        normalTextureId: 'fish-butterflyfish-normal',
        roughnessTextureId: 'fish-butterflyfish-roughness',
        alphaTextureId: 'fish-butterflyfish-alpha',
        schoolModelId: 'fish-butterflyfish-school',
        heroModelId: 'fish-butterflyfish-hero',
        silhouette: {
          bodyLength: 1.12,
          bodyHeight: 0.66,
          bodyThickness: 0.2,
          noseLength: 0.18,
          tailLength: 0.3,
          tailHeight: 0.44,
          dorsalHeight: 0.52,
          ventralHeight: 0.44,
          pectoralLength: 0.24,
          topFullness: 0.94,
          bellyFullness: 0.9
        }
      },
      {
        name: 'Neon',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.35,
        speed: 1.5,
        locomotionProfileId: 'slender-darter',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
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
        primaryColor: new THREE.Color(0xf6b03a),
        secondaryColor: new THREE.Color(0xffdb9b),
        scale: 0.58,
        speed: 0.9,
        locomotionProfileId: 'goldfish-wobble',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-goldfish-school',
        heroModelId: 'fish-goldfish-hero',
        silhouette: {
          bodyLength: 1.28,
          bodyHeight: 0.52,
          bodyThickness: 0.35,
          noseLength: 0.22,
          tailLength: 0.6,
          tailHeight: 0.7,
          dorsalHeight: 0.4,
          ventralHeight: 0.28,
          pectoralLength: 0.28,
          topFullness: 0.82,
          bellyFullness: 1.02
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

  private getLegacyOrientationCorrection(
    variant: FishVariant,
    renderPath: FishRenderPath
  ): OrientationCorrection | undefined {
    return renderPath === 'school'
      ? variant.orientationCorrection?.schoolGLB
      : renderPath === 'hero'
        ? variant.orientationCorrection?.heroGLB
        : variant.orientationCorrection?.procedural
  }

  private getOrientationCorrection(
    variant: FishVariant,
    renderPath: FishRenderPath
  ): Required<OrientationCorrection> {
    const legacyCorrection = this.getLegacyOrientationCorrection(variant, renderPath)
    const forwardAxis = renderPath === 'school'
      ? variant.schoolForwardAxis
      : renderPath === 'hero'
        ? variant.heroForwardAxis
        : variant.proceduralForwardAxis
    const correctionQuaternion = renderPath === 'school'
      ? variant.schoolCorrectionQuaternion
      : renderPath === 'hero'
        ? variant.heroCorrectionQuaternion
        : variant.proceduralCorrectionQuaternion
    const legacyForwardAxis = renderPath === 'school'
      ? variant.modelForwardAxis?.school
      : renderPath === 'hero'
        ? variant.modelForwardAxis?.hero
        : variant.modelForwardAxis?.procedural

    return {
      modelForwardAxis: forwardAxis ??
        legacyCorrection?.modelForwardAxis ??
        legacyForwardAxis ??
        DEFAULT_ORIENTATION_CORRECTION.modelForwardAxis,
      correctionQuaternion: correctionQuaternion ??
        legacyCorrection?.correctionQuaternion ??
        DEFAULT_ORIENTATION_CORRECTION.correctionQuaternion
    }
  }

  private getModelForwardAxis(variant: FishVariant, renderPath: FishRenderPath): THREE.Vector3 {
    const correction = this.getOrientationCorrection(variant, renderPath)
    const axis = correction.modelForwardAxis
    const forwardAxis = this.tempForwardAxis ?? new THREE.Vector3()
    const correctionQuaternion = this.tempCorrectionQuaternion ?? new THREE.Quaternion()
    this.tempForwardAxis = forwardAxis
    this.tempCorrectionQuaternion = correctionQuaternion
    forwardAxis.set(axis[0], axis[1], axis[2]).normalize()

    if (correction.correctionQuaternion) {
      correctionQuaternion.set(
        correction.correctionQuaternion[0],
        correction.correctionQuaternion[1],
        correction.correctionQuaternion[2],
        correction.correctionQuaternion[3]
      )
      forwardAxis.applyQuaternion(correctionQuaternion)
    }

    return forwardAxis.normalize()
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

  private resolveSilhouette(variant: FishVariant): Required<NonNullable<FishVariant['silhouette']>> {
    return {
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
  }

  private resolveBoundsExtentsFromModel(
    bounds: THREE.Box3,
    variant: FishVariant,
    renderPath: FishRenderPath,
    scaleMultiplier: number
  ): FishRenderExtents {
    const scale = variant.scale * scaleMultiplier
    const size = bounds.getSize(new THREE.Vector3()).multiplyScalar(scale)
    const forwardAxis = this.getModelForwardAxis(variant, renderPath).clone().normalize()
    const rightAxis = new THREE.Vector3().crossVectors(forwardAxis, new THREE.Vector3(0, 1, 0))
    if (rightAxis.lengthSq() === 0) {
      rightAxis.crossVectors(forwardAxis, new THREE.Vector3(0, 0, 1))
    }
    rightAxis.normalize()
    const upAxis = new THREE.Vector3().crossVectors(rightAxis, forwardAxis).normalize()
    const corners = [
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
    ]

    let noseExtent = 0
    let tailExtent = 0
    let halfBodyWidth = 0
    let halfBodyHeight = 0

    for (const corner of corners) {
      const scaledCorner = corner.multiplyScalar(scale)
      noseExtent = Math.max(noseExtent, scaledCorner.dot(forwardAxis))
      tailExtent = Math.max(tailExtent, -scaledCorner.dot(forwardAxis))
      halfBodyWidth = Math.max(halfBodyWidth, Math.abs(scaledCorner.dot(rightAxis)))
      halfBodyHeight = Math.max(halfBodyHeight, Math.abs(scaledCorner.dot(upAxis)))
    }

    const padding = FISH_SAFE_PADDING_BY_PATH[renderPath]
    const referenceLength = Math.max(size.x, size.y, size.z)
    const nosePadding = Math.max(0.04, referenceLength * padding.nose)
    const tailPadding = Math.max(0.04, referenceLength * padding.tail)
    const widthPadding = Math.max(0.03, referenceLength * padding.width)
    const heightPadding = Math.max(0.03, referenceLength * padding.height)

    return {
      noseExtent: Math.max(0.04, noseExtent + nosePadding),
      tailExtent: Math.max(0.04, tailExtent + tailPadding),
      halfBodyWidth: Math.max(0.03, halfBodyWidth + widthPadding),
      halfBodyHeight: Math.max(0.03, halfBodyHeight + heightPadding)
    }
  }

  private resolveProceduralFishSafeExtents(variant: FishVariant, scaleMultiplier: number): FishRenderExtents {
    const silhouette = this.resolveSilhouette(variant)
    const scale = variant.scale * scaleMultiplier
    const padding = FISH_SAFE_PADDING_BY_PATH.procedural
    const referenceLength = (silhouette.bodyLength + silhouette.noseLength + silhouette.tailLength) * scale
    const noseExtent = (((silhouette.bodyLength * 0.5) + silhouette.noseLength) * scale) + Math.max(0.04, referenceLength * padding.nose)
    const tailExtent = (((silhouette.bodyLength * 0.5) + silhouette.tailLength) * scale) + Math.max(0.04, referenceLength * padding.tail)
    const halfBodyHeight = Math.max(
      silhouette.bodyHeight,
      silhouette.tailHeight * 0.56,
      (silhouette.bodyHeight * 0.42) + (silhouette.dorsalHeight * 0.56),
      (silhouette.bodyHeight * 0.34) + (silhouette.ventralHeight * 0.46)
    ) * scale
    const halfBodyWidth = Math.max(
      (silhouette.bodyThickness * 0.5) + 0.03,
      (silhouette.bodyThickness * 0.4) + (silhouette.pectoralLength * 0.18)
    ) * scale

    return {
      noseExtent: Math.max(0.04, noseExtent),
      tailExtent: Math.max(0.04, tailExtent),
      halfBodyWidth: Math.max(0.03, halfBodyWidth + Math.max(0.03, referenceLength * padding.width)),
      halfBodyHeight: Math.max(0.03, halfBodyHeight + Math.max(0.03, referenceLength * padding.height))
    }
  }

  private resolveFishSafeExtents(
    variant: FishVariant,
    renderPath: FishRenderPath,
    scaleMultiplier: number = 1.04
  ): FishRenderExtents {
    if (renderPath === 'hero') {
      const heroAsset = this.getVisualModel(variant.heroModelId)
      const heroRenderable = heroAsset?.sourceMesh ?? heroAsset?.scene ?? null
      if (heroRenderable) {
        const bounds = new THREE.Box3().setFromObject(heroRenderable)
        if (!bounds.isEmpty()) {
          return this.resolveBoundsExtentsFromModel(bounds, variant, renderPath, scaleMultiplier)
        }
      }
      return this.resolveProceduralFishSafeExtents(variant, scaleMultiplier)
    }

    if (renderPath === 'school') {
      const schoolAsset = this.getVisualModel(variant.schoolModelId)
      const sourceMesh = schoolAsset?.sourceMesh ?? null
      if (sourceMesh) {
        const bounds = new THREE.Box3().setFromObject(sourceMesh)
        if (!bounds.isEmpty()) {
          return this.resolveBoundsExtentsFromModel(bounds, variant, renderPath, scaleMultiplier)
        }
      }
    }

    return this.resolveProceduralFishSafeExtents(variant, scaleMultiplier)
  }

  private clampPositionToFishSafeBounds(
    position: THREE.Vector3,
    bounds: THREE.Box3,
    extents: FishRenderExtents,
    direction: THREE.Vector3
  ): void {
    const heading = direction.lengthSq() > 0 ? direction.clone().normalize() : new THREE.Vector3(1, 0, 0)
    const safeBounds = createFishSafeBounds(bounds, resolveFishAxisExtents(extents, heading))
    const boundsCenter = bounds.getCenter(new THREE.Vector3())
    const normalizedMin = new THREE.Vector3(
      safeBounds.min.x <= safeBounds.max.x ? safeBounds.min.x : boundsCenter.x,
      safeBounds.min.y <= safeBounds.max.y ? safeBounds.min.y : boundsCenter.y,
      safeBounds.min.z <= safeBounds.max.z ? safeBounds.min.z : boundsCenter.z
    )
    const normalizedMax = new THREE.Vector3(
      safeBounds.min.x <= safeBounds.max.x ? safeBounds.max.x : boundsCenter.x,
      safeBounds.min.y <= safeBounds.max.y ? safeBounds.max.y : boundsCenter.y,
      safeBounds.min.z <= safeBounds.max.z ? safeBounds.max.z : boundsCenter.z
    )
    position.clamp(normalizedMin, normalizedMax)
    position.z = THREE.MathUtils.clamp(
      position.z,
      bounds.min.z + extents.tailExtent,
      bounds.max.z - extents.noseExtent
    )
  }

  private ensureMotionStateArrays(): void {
    const count = Number.isFinite(this.fishCount) ? this.fishCount : this.boids?.boids?.length ?? 0
    if (!this.nextRetargetTimes || this.nextRetargetTimes.length !== count) {
      this.nextRetargetTimes = new Float32Array(count)
    }
    if (!this.nextStateChangeTimes || this.nextStateChangeTimes.length !== count) {
      this.nextStateChangeTimes = new Float32Array(count)
    }
    if (!this.stateCooldowns || this.stateCooldowns.length !== count) {
      this.stateCooldowns = new Float32Array(count)
    }
    if (!this.interestSeeds || this.interestSeeds.length !== count) {
      this.interestSeeds = new Float32Array(count)
    }
    if (!this.gaitStates || this.gaitStates.length !== count) {
      this.gaitStates = Array.from({ length: count }, () => 'cruise')
    }
    if (!this.preferredDepthBands || this.preferredDepthBands.length !== count) {
      this.preferredDepthBands = Array.from({ length: count }, () => 'mid')
    }
    if (!this.preferredLateralLanes || this.preferredLateralLanes.length !== count) {
      this.preferredLateralLanes = Array.from({ length: count }, () => 'center')
    }
    if (!this.activeInterestPoints || this.activeInterestPoints.length !== count) {
      this.activeInterestPoints = Array.from({ length: count }, () => null)
    }
    if (!this.habitatInterestPoints || this.habitatInterestPoints.length === 0) {
      this.habitatInterestPoints = this.buildHabitatInterestPoints(
        this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
      )
    }
  }

  private randomRange(min: number, max: number): number {
    return min + ((max - min) * Math.random())
  }

  private scheduleNextRetargetTime(
    profile: LocomotionProfile,
    gaitState: GaitState,
    elapsedTime: number
  ): number {
    const base = this.randomRange(profile.retargetIntervalRange[0], profile.retargetIntervalRange[1])
    const gaitScale = gaitState === 'glide'
      ? 1.18
      : gaitState === 'inspect'
        ? 0.86
        : gaitState === 'burst'
          ? 0.82
          : gaitState === 'hover'
            ? 1.08
            : 0.9

    return elapsedTime + THREE.MathUtils.clamp(base * gaitScale, 4, 14)
  }

  private scheduleNextStateChangeTime(
    profile: LocomotionProfile,
    gaitState: GaitState,
    elapsedTime: number
  ): number {
    const base = this.randomRange(profile.stateDurationRange[0], profile.stateDurationRange[1])
    const gaitScale = gaitState === 'glide'
      ? 1.22
      : gaitState === 'inspect'
        ? 0.92
      : gaitState === 'burst'
        ? 0.64
        : gaitState === 'hover'
          ? 1.12
          : 1

    return elapsedTime + (base * gaitScale)
  }

  private pickPreferredDepthBand(profile: LocomotionProfile): PreferredDepthBand {
    const roll = Math.random()
    if (this.layoutStyle === 'nature-showcase') {
      if (profile.boundaryArcRadius > 0.96) {
        if (roll < 0.24) return 'upper'
        if (roll < 0.82) return 'mid'
        return 'hardscape-near'
      }

      if (profile.cruiseSpeed > 1.1) {
        if (roll < 0.32) return 'upper'
        if (roll < 0.92) return 'mid'
        return 'hardscape-near'
      }

      if (roll < 0.22) return 'upper'
      if (roll < 0.84) return 'mid'
      return 'hardscape-near'
    }

    if (profile.boundaryArcRadius > 0.96) {
      if (roll < 0.36) return 'hardscape-near'
      if (roll < 0.72) return 'mid'
      return 'upper'
    }

    if (profile.cruiseSpeed > 1.1) {
      if (roll < 0.38) return 'upper'
      if (roll < 0.78) return 'mid'
      return 'hardscape-near'
    }

    if (roll < 0.28) return 'upper'
    if (roll < 0.72) return 'mid'
    return 'hardscape-near'
  }

  private pickPreferredLateralLane(): PreferredLateralLane {
    const roll = Math.random()
    if (this.layoutStyle === 'nature-showcase') {
      if (roll < 0.24) return 'left'
      if (roll < 0.68) return 'center'
      return 'right'
    }

    if (roll < 0.33) return 'left'
    if (roll < 0.66) return 'center'
    return 'right'
  }

  private pickInitialGaitState(profile: LocomotionProfile): GaitState {
    const entries = Object.entries(profile.stateWeights) as Array<[GaitState, number]>
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
    if (total <= 0) return 'cruise'

    let remaining = Math.random() * total
    for (const [state, weight] of entries) {
      remaining -= weight
      if (remaining <= 0) {
        return state
      }
    }

    return 'cruise'
  }

  private chooseNextGaitState(index: number, profile: LocomotionProfile): GaitState {
    const current = this.gaitStates[index] ?? 'cruise'
    const entries = (Object.entries(profile.stateWeights) as Array<[GaitState, number]>)
      .map(([state, weight]) => [state, state === current ? weight * 0.1 : weight] as const)
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
    if (total <= 0) {
      return current
    }

    let remaining = Math.random() * total
    for (const [state, weight] of entries) {
      remaining -= weight
      if (remaining <= 0) {
        return state
      }
    }

    return current
  }

  private resolvePreferredDepthY(
    index: number,
    bounds: THREE.Box3,
    boundsSize: THREE.Vector3
  ): number {
    const band = this.preferredDepthBands[index] ?? 'mid'
    if (this.layoutStyle === 'nature-showcase') {
      if (band === 'upper') {
        return bounds.min.y + (boundsSize.y * 0.66)
      }
      if (band === 'hardscape-near') {
        return bounds.min.y + (boundsSize.y * 0.34)
      }
      return bounds.min.y + (boundsSize.y * 0.56)
    }

    if (band === 'upper') {
      return bounds.min.y + (boundsSize.y * 0.68)
    }
    if (band === 'hardscape-near') {
      return bounds.min.y + (boundsSize.y * 0.28)
    }
    return bounds.min.y + (boundsSize.y * 0.52)
  }

  private resolvePreferredLaneX(
    index: number,
    bounds: THREE.Box3,
    boundsSize: THREE.Vector3
  ): number {
    const lane = this.preferredLateralLanes[index] ?? 'center'
    if (this.layoutStyle === 'nature-showcase') {
      if (lane === 'left') {
        return bounds.min.x + (boundsSize.x * 0.27)
      }
      if (lane === 'right') {
        return bounds.max.x - (boundsSize.x * 0.2)
      }
      return bounds.min.x + (boundsSize.x * 0.5)
    }

    if (lane === 'left') {
      return bounds.min.x + (boundsSize.x * 0.28)
    }
    if (lane === 'right') {
      return bounds.max.x - (boundsSize.x * 0.28)
    }
    return bounds.min.x + (boundsSize.x * 0.5)
  }

  private buildHabitatInterestPoints(bounds: THREE.Box3): HabitatInterestPoint[] {
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const projectX = (value: number): number => center.x + (value * size.x)
    const projectZ = (value: number): number => center.z + (value * size.z)
    const showcaseLayout = this.layoutStyle === 'nature-showcase'
    const hardscapeY = bounds.min.y + (size.y * (showcaseLayout ? 0.34 : 0.28))
    const upperLaneY = bounds.min.y + (size.y * (showcaseLayout ? 0.68 : 0.66))
    const midLaneY = bounds.min.y + (size.y * (showcaseLayout ? 0.56 : 0.52))

    const hardscapePoints = resolveSubstrateHardscapeAnchors(this.layoutStyle).map((anchor) => ({
      kind: 'hardscape' as const,
      position: new THREE.Vector3(
        projectX(anchor.x),
        hardscapeY + (anchor.rimHeight * size.y * 0.08),
        projectZ(anchor.z + (showcaseLayout ? -0.04 : 0))
      ),
        preferredDepthBands: ['hardscape-near', 'mid'] as PreferredDepthBand[],
        preferredLateralLanes: anchor.x < -0.08
          ? ['left', 'center'] as PreferredLateralLane[]
          : anchor.x > 0.08
            ? ['right', 'center'] as PreferredLateralLane[]
            : ['center'] as PreferredLateralLane[],
        weight: showcaseLayout
          ? anchor.id === 'driftwood-root-flare'
            ? 0.28
            : anchor.x < -0.08
              ? 0.18
              : 0.13
          : anchor.id === 'driftwood-root-flare'
            ? 0.3
            : 0.18
      }))

    const plantPoints = resolveSubstratePlantAnchors(this.layoutStyle, this.layoutSeed)
      .filter((anchor) => anchor.layer !== 'foreground' || Math.abs(anchor.x) < 0.32)
      .map((anchor) => ({
        kind: 'plant' as const,
        position: new THREE.Vector3(
          projectX(anchor.x),
          anchor.layer === 'background'
            ? upperLaneY
            : anchor.layer === 'midground'
              ? midLaneY
              : bounds.min.y + (size.y * 0.4),
          projectZ(anchor.z + (anchor.layer === 'background'
            ? (showcaseLayout ? 0.04 : 0.09)
            : showcaseLayout
              ? 0.02
              : 0.06))
        ),
        preferredDepthBands: anchor.layer === 'background'
          ? ['upper', 'mid'] as PreferredDepthBand[]
          : anchor.layer === 'midground'
            ? ['mid', 'hardscape-near'] as PreferredDepthBand[]
            : ['hardscape-near'] as PreferredDepthBand[],
        preferredLateralLanes: anchor.x < -0.08
          ? ['left', 'center'] as PreferredLateralLane[]
          : anchor.x > 0.08
            ? ['right', 'center'] as PreferredLateralLane[]
            : ['center'] as PreferredLateralLane[],
        weight: showcaseLayout
          ? anchor.layer === 'background'
            ? 0.16
            : 0.12
          : anchor.layer === 'background'
            ? 0.22
            : 0.17
      }))

    const openLanePoints: HabitatInterestPoint[] = showcaseLayout
      ? [
        {
          kind: 'open-lane',
          position: new THREE.Vector3(center.x - (size.x * 0.12), midLaneY, center.z - (size.z * 0.08)),
          preferredDepthBands: ['mid', 'upper'] as PreferredDepthBand[],
          preferredLateralLanes: ['left', 'center'] as PreferredLateralLane[],
          weight: 0.16
        },
        {
          kind: 'open-lane',
          position: new THREE.Vector3(center.x, midLaneY + (size.y * 0.02), center.z - (size.z * 0.01)),
          preferredDepthBands: ['mid', 'upper'] as PreferredDepthBand[],
          preferredLateralLanes: ['center', 'right'] as PreferredLateralLane[],
          weight: 0.2
        },
        {
          kind: 'open-lane',
          position: new THREE.Vector3(center.x + (size.x * 0.24), upperLaneY - (size.y * 0.02), center.z + (size.z * 0.08)),
          preferredDepthBands: ['upper', 'mid'] as PreferredDepthBand[],
          preferredLateralLanes: ['right', 'center'] as PreferredLateralLane[],
          weight: 0.19
        }
      ]
      : [
        {
          kind: 'open-lane',
          position: new THREE.Vector3(center.x - (size.x * 0.18), midLaneY, center.z + (size.z * 0.04)),
          preferredDepthBands: ['mid', 'upper'] as PreferredDepthBand[],
          preferredLateralLanes: ['left', 'center'] as PreferredLateralLane[],
          weight: 0.14
        },
        {
          kind: 'open-lane',
          position: new THREE.Vector3(center.x + (size.x * 0.18), upperLaneY, center.z - (size.z * 0.08)),
          preferredDepthBands: ['upper', 'mid'] as PreferredDepthBand[],
          preferredLateralLanes: ['right', 'center'] as PreferredLateralLane[],
          weight: 0.14
        }
      ]

    return [...hardscapePoints, ...plantPoints, ...openLanePoints]
  }

  private pickInterestPoint(index: number): HabitatInterestPoint | null {
    const points = this.habitatInterestPoints ?? []
    if (points.length === 0) {
      return null
    }

    const preferredBand = this.preferredDepthBands[index] ?? 'mid'
    const preferredLane = this.preferredLateralLanes[index] ?? 'center'
    const gaitState = this.gaitStates[index] ?? 'cruise'
    const seed = this.interestSeeds[index] ?? 0.5
    let bestPoint: HabitatInterestPoint | null = null
    let bestScore = Number.NEGATIVE_INFINITY

    points.forEach((point, pointIndex) => {
      const depthScore = point.preferredDepthBands.includes(preferredBand) ? 0.16 : 0.02
      const laneScore = point.preferredLateralLanes.includes(preferredLane) ? 0.12 : 0.03
      const gaitScore = gaitState === 'inspect'
        ? point.kind === 'plant' || point.kind === 'hardscape'
          ? 0.18
          : 0.08
        : gaitState === 'glide'
          ? point.kind === 'open-lane'
            ? 0.16
            : 0.04
          : 0.1
      const noise = Math.sin((seed + pointIndex) * 13.37) * 0.04
      const score = point.weight + depthScore + laneScore + gaitScore + noise

      if (score > bestScore) {
        bestScore = score
        bestPoint = point
      }
    })

    return bestPoint
  }

  private resolveWanderTarget(
    index: number,
    profile: LocomotionProfile,
    boidPosition: THREE.Vector3,
    bounds: THREE.Box3,
    boundsSize: THREE.Vector3
  ): THREE.Vector3 {
    const wanderDirection = this.tempWanderDirection ?? new THREE.Vector3()
    const wanderTarget = this.tempWanderTarget ?? new THREE.Vector3()
    this.tempWanderDirection = wanderDirection
    this.tempWanderTarget = wanderTarget
    const gaitState = this.gaitStates[index] ?? 'cruise'
    const laneX = this.resolvePreferredLaneX(index, bounds, boundsSize)
    const depthY = this.resolvePreferredDepthY(index, bounds, boundsSize)
    const interestPoint = gaitState === 'inspect' || gaitState === 'hover' || Math.random() < profile.inspectCuriosity * 0.22
      ? this.pickInterestPoint(index)
      : null
    this.activeInterestPoints[index] = interestPoint

    const anchor = interestPoint?.position ?? new THREE.Vector3(
      laneX,
      depthY,
      THREE.MathUtils.lerp(
        bounds.min.z + (boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.3 : 0.26)),
        bounds.max.z - (boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.42 : 0.28)),
        0.5 + ((this.interestSeeds[index] ?? 0.5) - 0.5) * (this.layoutStyle === 'nature-showcase' ? 0.62 : 0.8)
      )
    )
    const lateralSpread = gaitState === 'glide'
      ? boundsSize.x * (this.layoutStyle === 'nature-showcase' ? 0.13 : 0.18)
      : gaitState === 'hover'
        ? boundsSize.x * 0.04
        : boundsSize.x * (this.layoutStyle === 'nature-showcase' ? 0.08 : 0.12)
    const verticalSpread = gaitState === 'hover'
      ? boundsSize.y * 0.03
      : boundsSize.y * (this.layoutStyle === 'nature-showcase' ? 0.07 : 0.08)
    const depthSpread = gaitState === 'inspect'
      ? boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.03 : 0.05)
      : boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.04 : 0.08)

    wanderDirection.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 0.8
    ).normalize()

    wanderTarget.copy(anchor)
      .addScaledVector(new THREE.Vector3(1, 0, 0), wanderDirection.x * lateralSpread)
      .addScaledVector(new THREE.Vector3(0, 1, 0), wanderDirection.y * verticalSpread)
      .addScaledVector(new THREE.Vector3(0, 0, 1), wanderDirection.z * depthSpread)

    if (gaitState === 'hover') {
      wanderTarget.lerp(boidPosition, 0.6)
    }

    wanderTarget.x = THREE.MathUtils.clamp(
      wanderTarget.x,
      bounds.min.x + boundsSize.x * 0.08,
      bounds.max.x - boundsSize.x * 0.08
    )
    wanderTarget.y = THREE.MathUtils.clamp(
      wanderTarget.y,
      bounds.min.y + boundsSize.y * 0.18,
      bounds.max.y - boundsSize.y * 0.16
    )
    wanderTarget.z = THREE.MathUtils.clamp(
      wanderTarget.z,
      bounds.min.z + boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.24 : 0.2),
      bounds.max.z - boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.32 : 0.2)
    )

    return wanderTarget.clone()
  }

  private transitionGaitState(index: number, elapsedTime: number, profile: LocomotionProfile): void {
    const nextState = this.chooseNextGaitState(index, profile)
    this.gaitStates[index] = nextState
    this.stateCooldowns[index] = elapsedTime + 0.9 + profile.turnStartLag + (Math.random() * 1.1)
    this.nextStateChangeTimes[index] = this.scheduleNextStateChangeTime(profile, nextState, elapsedTime)
    this.nextRetargetTimes[index] = Math.min(
      this.nextRetargetTimes[index] || Number.POSITIVE_INFINITY,
      this.scheduleNextRetargetTime(profile, nextState, elapsedTime)
    )
  }

  private resolveGaitDynamics(gaitState: GaitState, profile: LocomotionProfile) {
    switch (gaitState) {
      case 'inspect':
        return {
          wanderScale: 0.72,
          jitterScale: 0.55,
          curiosityScale: 1.1,
          suddenTurnScale: 0.28,
          turnNoiseScale: 0.52,
          depthBobScale: 1.16,
          interestForceWeight: profile.interestWeight * 1.4,
          speedMultiplier: 0.82,
          drag: 0.2,
          lanePullMultiplier: 0.62,
          depthPullMultiplier: 0.82,
          tailBeatMultiplier: 0.92,
          bodyMotionScale: 1.12,
          bankScale: 0.74,
          headingResponseScale: 0.88,
          floatScale: 1.12
        }
      case 'glide':
        return {
          wanderScale: 0.58,
          jitterScale: 0.22,
          curiosityScale: 0.18,
          suddenTurnScale: 0.08,
          turnNoiseScale: 0.34,
          depthBobScale: 0.72,
          interestForceWeight: profile.interestWeight * 0.32,
          speedMultiplier: profile.glideFactor,
          drag: 0.34,
          lanePullMultiplier: 0.96,
          depthPullMultiplier: 0.92,
          tailBeatMultiplier: 0.74,
          bodyMotionScale: 0.66,
          bankScale: 0.6,
          headingResponseScale: 0.7,
          floatScale: 0.74
        }
      case 'burst':
        return {
          wanderScale: 1.28,
          jitterScale: 1.06,
          curiosityScale: 0.42,
          suddenTurnScale: 1.18,
          turnNoiseScale: 0.88,
          depthBobScale: 0.52,
          interestForceWeight: profile.interestWeight * 0.18,
          speedMultiplier: profile.burstMultiplier,
          drag: 0.08,
          lanePullMultiplier: 0.44,
          depthPullMultiplier: 0.58,
          tailBeatMultiplier: 1.24,
          bodyMotionScale: 0.54,
          bankScale: 1.08,
          headingResponseScale: 1.18,
          floatScale: 0.52
        }
      case 'hover':
        return {
          wanderScale: 0.34,
          jitterScale: 0.16,
          curiosityScale: 0.12,
          suddenTurnScale: 0.04,
          turnNoiseScale: 0.28,
          depthBobScale: 1.24,
          interestForceWeight: profile.interestWeight * 0.88,
          speedMultiplier: 0.72,
          drag: profile.hoverDrag,
          lanePullMultiplier: 0.88,
          depthPullMultiplier: 1.18,
          tailBeatMultiplier: 0.86,
          bodyMotionScale: 1.22,
          bankScale: 0.42,
          headingResponseScale: 0.64,
          floatScale: 1.24
        }
      case 'cruise':
      default:
        return {
          wanderScale: 1,
          jitterScale: 0.88,
          curiosityScale: 0.72,
          suddenTurnScale: 0.62,
          turnNoiseScale: 0.76,
          depthBobScale: 0.94,
          interestForceWeight: profile.interestWeight * 0.5,
          speedMultiplier: 1,
          drag: 0.06,
          lanePullMultiplier: 1,
          depthPullMultiplier: 1,
          tailBeatMultiplier: 1,
          bodyMotionScale: 0.82,
          bankScale: 1,
          headingResponseScale: 1,
          floatScale: 0.92
        }
    }
  }

  private updatePerFishBoidTuning(
    index: number,
    profile: LocomotionProfile,
    gaitState: GaitState,
    bounds: THREE.Box3,
    boundsSize: THREE.Vector3,
    behavior?: BehaviorProfile
  ): void {
    if (!this.boids || typeof (this.boids as unknown as { setBoidTuning?: unknown }).setBoidTuning !== 'function') {
      return
    }
    const dynamics = this.resolveGaitDynamics(gaitState, profile)
    const preferredDepthY = behavior
      ? THREE.MathUtils.lerp(
        this.resolvePreferredDepthY(index, bounds, boundsSize),
        bounds.max.y - (behavior.preferredDepth * boundsSize.y),
        0.58
      )
      : this.resolvePreferredDepthY(index, bounds, boundsSize)
    this.boids.setBoidTuning(index, {
      activeSpeedMultiplier: dynamics.speedMultiplier,
      preferredLateralX: this.resolvePreferredLaneX(index, bounds, boundsSize),
      preferredDepthY,
      lanePull: profile.lanePull * dynamics.lanePullMultiplier,
      depthPull: profile.depthPull * dynamics.depthPullMultiplier,
      drag: dynamics.drag
    })
  }

  private applyVariantLocomotionTuning(): void {
    if (!this.boids || typeof (this.boids as unknown as { setBoidTuning?: unknown }).setBoidTuning !== 'function') {
      return
    }
    this.ensureMotionStateArrays()
    const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
    const boundsSize = bounds.getSize(this.tempBoundsSize ?? new THREE.Vector3())
    this.tempBoundsSize = boundsSize

    this.boids.boids.forEach((_boid, index) => {
      const variant = this.variants[this.getBoidVariantIndex(index)] ?? this.variants[0]
      if (!variant) return

      const profile = this.getLocomotionProfile(variant)
      const renderPath = this.getVisualModel(variant.schoolModelId)?.sourceMesh ? 'school' : 'procedural'
      this.boids.setBoidTuning(index, {
        cruiseSpeed: profile.cruiseSpeed,
        yawResponsiveness: profile.yawResponsiveness,
        cruiseBias: profile.cruiseBias,
        turnNoise: profile.turnNoise,
        boundaryArcRadius: profile.boundaryArcRadius,
        fishSafeExtents: this.resolveFishSafeExtents(variant, renderPath),
        preferredLateralX: this.resolvePreferredLaneX(index, bounds, boundsSize),
        preferredDepthY: this.resolvePreferredDepthY(index, bounds, boundsSize),
        lanePull: profile.lanePull,
        depthPull: profile.depthPull,
        drag: 0.06,
        steeringWeights: profile.steeringWeights
      })
    })
  }
  
  private initializeRandomness(): void {
    // Create arrays for individual fish randomness
    this.randomOffsets = new Float32Array(this.fishCount)
    this.swimPhases = new Float32Array(this.fishCount)
    this.speedMultipliers = new Float32Array(this.fishCount)
    this.nextRetargetTimes = new Float32Array(this.fishCount)
    this.nextStateChangeTimes = new Float32Array(this.fishCount)
    this.stateCooldowns = new Float32Array(this.fishCount)
    this.interestSeeds = new Float32Array(this.fishCount)
    this.gaitStates = Array.from({ length: this.fishCount }, () => 'cruise')
    this.preferredDepthBands = Array.from({ length: this.fishCount }, () => 'mid')
    this.preferredLateralLanes = Array.from({ length: this.fishCount }, () => 'center')
    this.activeInterestPoints = Array.from({ length: this.fishCount }, () => null)
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
    this.habitatInterestPoints = this.buildHabitatInterestPoints(bounds)
    
    for (let i = 0; i < this.fishCount; i++) {
      const variant = this.variants?.[this.getBoidVariantIndex(i)] ?? this.variants?.[0]
      const profile = variant ? this.getLocomotionProfile(variant) : LOCOMOTION_PROFILES['calm-cruiser']

      // Random offset for animations (0 to 2π)
      this.randomOffsets[i] = Math.random() * Math.PI * 2
      
      // Random swim phase for different timing
      this.swimPhases[i] = Math.random() * Math.PI * 2

      this.preferredDepthBands[i] = this.pickPreferredDepthBand(profile)
      this.preferredLateralLanes[i] = this.pickPreferredLateralLane()
      this.gaitStates[i] = this.pickInitialGaitState(profile)
      this.interestSeeds[i] = Math.random()
      this.stateCooldowns[i] = Math.random() * (0.8 + profile.turnStartLag)
      
      // Variant-aware cadence spread keeps schools from sharing one rhythm.
      const minSpeed = THREE.MathUtils.clamp(
        0.76 + ((profile.cruiseSpeed - 1) * 0.16) - (profile.turnStartLag * 0.08),
        0.72,
        0.98
      )
      const maxSpeed = THREE.MathUtils.clamp(
        minSpeed + 0.24 + (profile.turnNoise * 0.16) + (profile.bodyWiggleAmount * 0.04),
        minSpeed + 0.18,
        1.28
      )
      this.speedMultipliers[i] = THREE.MathUtils.lerp(minSpeed, maxSpeed, Math.random())

      this.nextRetargetTimes[i] = this.scheduleNextRetargetTime(profile, this.gaitStates[i], 0)
      this.nextStateChangeTimes[i] = this.scheduleNextStateChangeTime(profile, this.gaitStates[i], 0)
      if (this.nextStateChangeTimes[i] <= this.nextRetargetTimes[i]) {
        this.nextStateChangeTimes[i] = this.nextRetargetTimes[i] + 0.4 + Math.random()
      }

      const initialTarget = this.resolveWanderTarget(
        i,
        profile,
        new THREE.Vector3(
          THREE.MathUtils.lerp(xMin, xMax, Math.random()),
          THREE.MathUtils.lerp(yMin, yMax, Math.random()),
          THREE.MathUtils.lerp(zMin, zMax, Math.random())
        ),
        bounds,
        boundsSize
      )
      this.wanderTargets.push(initialTarget)
    }
  }

  private updateWanderTargets(elapsedTime: number): void {
    this.ensureMotionStateArrays()
    const bounds = this.bounds ?? new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))
    const boundsSize = this.tempBoundsSize ?? new THREE.Vector3()
    bounds.getSize(boundsSize)
    this.tempBoundsSize = boundsSize

    for (let index = 0; index < this.fishCount; index++) {
      const variant = this.variants?.[this.getBoidVariantIndex(index)] ?? this.variants?.[0]
      if (!variant) {
        continue
      }

      const profile = this.getLocomotionProfile(variant)
      if (elapsedTime >= (this.nextStateChangeTimes[index] ?? 0) && elapsedTime >= (this.stateCooldowns[index] ?? 0)) {
        this.transitionGaitState(index, elapsedTime, profile)
      }

      if (elapsedTime < (this.nextRetargetTimes[index] ?? 0)) {
        continue
      }

      const boid = this.boids?.boids?.[index]
      this.tempCurrentPos.copy(boid?.position ?? new THREE.Vector3())
      if (!this.wanderTargets[index]) {
        this.wanderTargets[index] = new THREE.Vector3()
      }

      this.wanderTargets[index].copy(
        this.resolveWanderTarget(index, profile, this.tempCurrentPos, bounds, boundsSize)
      )
      this.nextRetargetTimes[index] = this.scheduleNextRetargetTime(profile, this.gaitStates[index] ?? 'cruise', elapsedTime)
    }
  }

  private applyInstancedTailMotionAttributes(
    geometry: THREE.BufferGeometry,
    variant: FishVariant,
    boidStartIndex: number,
    instanceCount: number
  ): void {
    const profile = this.getLocomotionProfile(variant)
    const phaseOffsets = new Float32Array(instanceCount)
    const tailAmplitudes = new Float32Array(instanceCount)
    const tailFrequencies = new Float32Array(instanceCount)

    for (let i = 0; i < instanceCount; i++) {
      const boidIndex = boidStartIndex + i
      const phase = this.swimPhases?.[boidIndex] ?? 0
      const cadence = this.speedMultipliers?.[boidIndex] ?? 1
      const offset = this.randomOffsets?.[boidIndex] ?? 0
      phaseOffsets[i] = phase
      tailAmplitudes[i] = (
        0.03 +
        (profile.bodyWiggleAmount * 0.05) +
        (Math.max(0, 1 - profile.yawResponsiveness) * 0.008)
      ) * (0.78 + (Math.sin(offset * 1.7) * 0.22))
      tailFrequencies[i] = Math.max(
        0.45,
        profile.tailBeatFreq * cadence * (0.84 + Math.cos(offset * 1.3) * 0.16)
      )
    }

    geometry.setAttribute('instancePhaseOffset', new THREE.InstancedBufferAttribute(phaseOffsets, 1))
    geometry.setAttribute('instanceTailAmplitude', new THREE.InstancedBufferAttribute(tailAmplitudes, 1))
    geometry.setAttribute('instanceTailFrequency', new THREE.InstancedBufferAttribute(tailFrequencies, 1))
  }

  private patchInstancedFishMaterial(
    material: THREE.MeshPhysicalMaterial,
    geometry: THREE.BufferGeometry,
    variant: FishVariant,
    renderPath: Exclude<FishRenderPath, 'hero'>
  ): void {
    if (!this.instancedTailMotionUniforms) {
      this.instancedTailMotionUniforms = []
    }
    const forwardAxis = this.getModelForwardAxis(variant, renderPath).clone()
    const positionAttribute = geometry.getAttribute('position')
    let minProjection = 0
    let maxProjection = 0

    if (positionAttribute instanceof THREE.BufferAttribute) {
      minProjection = Number.POSITIVE_INFINITY
      maxProjection = Number.NEGATIVE_INFINITY
      for (let i = 0; i < positionAttribute.count; i++) {
        const projection = (
          (positionAttribute.getX(i) * forwardAxis.x) +
          (positionAttribute.getY(i) * forwardAxis.y) +
          (positionAttribute.getZ(i) * forwardAxis.z)
        )
        minProjection = Math.min(minProjection, projection)
        maxProjection = Math.max(maxProjection, projection)
      }
      if (!Number.isFinite(minProjection) || !Number.isFinite(maxProjection)) {
        minProjection = -0.5
        maxProjection = 0.5
      }
    }

    const motionTimeUniform = { value: 0 }
    this.instancedTailMotionUniforms.push(motionTimeUniform)
    const previousOnBeforeCompile = material.onBeforeCompile.bind(material)

    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile(shader, renderer)
      shader.uniforms.uFishMotionTime = motionTimeUniform
      shader.uniforms.uFishForwardAxis = { value: forwardAxis }
      shader.uniforms.uFishForwardRange = { value: new THREE.Vector2(minProjection, maxProjection) }
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute float instancePhaseOffset;
attribute float instanceTailAmplitude;
attribute float instanceTailFrequency;
uniform float uFishMotionTime;
uniform vec3 uFishForwardAxis;
uniform vec2 uFishForwardRange;`
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
vec3 fishForwardAxis = normalize(uFishForwardAxis);
vec3 fishSideAxis = normalize(cross(vec3(0.0, 1.0, 0.0), fishForwardAxis));
if (length(fishSideAxis) < 0.0001) {
  fishSideAxis = vec3(0.0, 0.0, 1.0);
}
float forwardProjection = dot(transformed, fishForwardAxis);
float tailRegion = mix(uFishForwardRange.x, uFishForwardRange.y, 0.48);
float rearMask = 1.0 - smoothstep(tailRegion, uFishForwardRange.y, forwardProjection);
float tailMask = smoothstep(0.0, 1.0, rearMask);
float bodyMask = smoothstep(0.24, 1.0, rearMask);
float tailWave = sin((uFishMotionTime * instanceTailFrequency) + instancePhaseOffset) * instanceTailAmplitude;
float rearBodyWave = sin((uFishMotionTime * instanceTailFrequency * 0.58) + instancePhaseOffset + 0.7) * instanceTailAmplitude;
transformed += fishSideAxis * tailWave * tailMask;
transformed += fishSideAxis * rearBodyWave * bodyMask * 0.42;
transformed += fishForwardAxis * (-abs(tailWave) * tailMask * 0.14);
transformed.y += sin((uFishMotionTime * instanceTailFrequency * 0.45) + instancePhaseOffset) * instanceTailAmplitude * bodyMask * 0.28;`
        )
    }

    material.customProgramCacheKey = () => `${renderPath}-instanced-tail-motion`
    material.needsUpdate = true
  }
  
  private createDetailedFishMeshes(countsPerVariant?: number[]): void {
    const counts = this.resolveVariantCounts(countsPerVariant)
    this.boidVariantIndices = this.buildBoidVariantIndices(counts)
    this.instancedTailMotionUniforms = []
    let boidStartIndex = 0

    this.variants.forEach((variant, variantIndex) => {
      const actualCount = counts[variantIndex] ?? 0
      if (actualCount <= 0) return
      
      const schoolAsset = this.getVisualModel(variant.schoolModelId)
      const sourceMesh = schoolAsset?.sourceMesh ?? null
      const fishGeometry = sourceMesh?.geometry.clone() ?? this.createDetailedFishGeometry(variant)
      const fishMaterial = sourceMesh
        ? this.createFishAssetMaterial(sourceMesh.material, variant, false)
        : this.createFishMaterial(variant)
      const renderPath = sourceMesh ? 'school' : 'procedural'
      fishGeometry.userData = {
        ...fishGeometry.userData,
        sharedAsset: false
      }
      this.applyInstancedTailMotionAttributes(fishGeometry, variant, boidStartIndex, actualCount)
      this.patchInstancedFishMaterial(fishMaterial, fishGeometry, variant, renderPath)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.userData.variantIndex = variantIndex
      instancedMesh.userData.renderPath = renderPath
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
      boidStartIndex += actualCount
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
        const variant = this.variants[variantIndex]
        const priorityMultiplier = this.resolveHeroPriorityMultiplier(variant)
        candidates.push({
          boidIndex: boidStartIndex + Math.min(slotIndex * 2, normalizedCount - 1),
          variantIndex,
          priority: (normalizedCount - (slotIndex * 1.25)) * priorityMultiplier,
          slotIndex
        })
      }

      boidStartIndex += normalizedCount
    })

    const placements = this.resolveHeroPlacements()

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
        const accentPlacementScale = this.resolveHeroAccentScaleMultiplier(variant)
        const accentDepthScale = this.resolveHeroAccentDepthMultiplier(variant)
        const heroScaleMultiplier = Math.min(
          1.98,
          placement.scaleMultiplier * accentPlacementScale * (isSlenderVariant ? 1.18 : 1)
        )
        this.heroAssignments.set(candidate.boidIndex, {
          object: heroObject,
          body: (heroObject.userData.motionNodes as { body?: THREE.Object3D } | undefined)?.body ?? heroObject,
          tail: (heroObject.userData.motionNodes as { tail?: THREE.Object3D | null } | undefined)?.tail ?? null,
          lateralOffset: placement.lateralOffset,
          verticalOffset: placement.verticalOffset,
          depthOffset: placement.depthOffset * accentDepthScale,
          scaleMultiplier: heroScaleMultiplier,
          fishSafeExtents: this.resolveFishSafeExtents(variant, 'hero', heroScaleMultiplier * 1.04)
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
    const forwardAxis = this.getModelForwardAxis(variant, 'hero').clone().normalize()
    let tail = this.findHeroTailTarget(body, variant)

    if (tail) {
      root.add(body)
    } else {
      const tailPivot = new THREE.Group()
      const tailPivotDistance = this.resolveHeroTailPivotDistance(body, forwardAxis)
      tailPivot.name = 'HeroTailPivot'
      tailPivot.position.copy(forwardAxis).multiplyScalar(-tailPivotDistance)
      body.position.addScaledVector(forwardAxis, tailPivotDistance)
      tailPivot.add(body)
      root.add(tailPivot)
      tail = tailPivot
    }

    root.userData.motionNodes = {
      body,
      tail,
      bodyRotation: body.rotation.clone(),
      tailRotation: tail?.rotation.clone() ?? null,
      bodyPosition: body.position.clone(),
      tailPosition: tail?.position.clone() ?? null,
      tailMode: tail?.name === 'HeroTailPivot' ? 'pivot' : tail ? 'node' : 'none'
    }
    return root
  }

  private resolveHeroTailPivotDistance(body: THREE.Object3D, forwardAxis: THREE.Vector3): number {
    body.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(body)
    if (bounds.isEmpty()) {
      return 0.18
    }

    const size = bounds.getSize(new THREE.Vector3())
    const projectedLength =
      (Math.abs(forwardAxis.x) * size.x) +
      (Math.abs(forwardAxis.y) * size.y) +
      (Math.abs(forwardAxis.z) * size.z)

    return THREE.MathUtils.clamp(projectedLength * 0.32, 0.12, 0.9)
  }

  private findHeroTailTarget(root: THREE.Object3D, variant: FishVariant): THREE.Object3D | null {
    let namedTail: THREE.Object3D | null = null
    const forwardAxis = this.getModelForwardAxis(variant, 'hero').clone()
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

  private resolveFishMaterialResponse(
    variant: FishVariant,
    hero: boolean
  ): {
    metalness: number
    roughness: number
    clearcoat: number
    clearcoatRoughness: number
    reflectivity: number
    envMapIntensity: number
    normalScale: THREE.Vector2
  } {
    const showcaseAccent = this.layoutStyle === 'nature-showcase'

    if (variant.name === 'Butterflyfish') {
      if (showcaseAccent) {
        return hero
          ? {
              metalness: 0.01,
              roughness: 0.6,
              clearcoat: 0.52,
              clearcoatRoughness: 0.54,
              reflectivity: 0.58,
              envMapIntensity: 0.52,
              normalScale: new THREE.Vector2(0.22, 0.14)
            }
          : {
              metalness: 0.01,
              roughness: 0.6,
              clearcoat: 0.36,
              clearcoatRoughness: 0.5,
              reflectivity: 0.54,
              envMapIntensity: 0.4,
              normalScale: new THREE.Vector2(0.18, 0.11)
            }
      }

      return hero
        ? {
            metalness: 0.01,
            roughness: 0.5,
            clearcoat: 0.72,
            clearcoatRoughness: 0.42,
            reflectivity: 0.7,
            envMapIntensity: 0.76,
            normalScale: new THREE.Vector2(0.24, 0.16)
          }
        : {
            metalness: 0.01,
            roughness: 0.52,
            clearcoat: 0.48,
            clearcoatRoughness: 0.4,
            reflectivity: 0.66,
            envMapIntensity: 0.56,
            normalScale: new THREE.Vector2(0.2, 0.12)
          }
    }

    if (variant.name === 'Goldfish') {
      if (showcaseAccent) {
        return hero
          ? {
              metalness: 0.03,
              roughness: 0.56,
              clearcoat: 0.56,
              clearcoatRoughness: 0.46,
              reflectivity: 0.62,
              envMapIntensity: 0.54,
              normalScale: new THREE.Vector2(0.26, 0.18)
            }
          : {
              metalness: 0.03,
              roughness: 0.6,
              clearcoat: 0.38,
              clearcoatRoughness: 0.44,
              reflectivity: 0.58,
              envMapIntensity: 0.42,
              normalScale: new THREE.Vector2(0.22, 0.14)
            }
      }

      return hero
        ? {
            metalness: 0.03,
            roughness: 0.4,
            clearcoat: 0.74,
            clearcoatRoughness: 0.34,
            reflectivity: 0.76,
            envMapIntensity: 0.78,
            normalScale: new THREE.Vector2(0.3, 0.2)
          }
        : {
            metalness: 0.03,
            roughness: 0.5,
            clearcoat: 0.52,
            clearcoatRoughness: 0.32,
            reflectivity: 0.76,
            envMapIntensity: 0.6,
            normalScale: new THREE.Vector2(0.24, 0.16)
          }
    }

    return hero
      ? {
          metalness: 0.04,
          roughness: 0.24,
          clearcoat: 0.84,
          clearcoatRoughness: 0.2,
          reflectivity: 0.9,
          envMapIntensity: 0.95,
          normalScale: new THREE.Vector2(0.4, 0.24)
        }
      : {
          metalness: 0.04,
          roughness: 0.38,
          clearcoat: 0.64,
          clearcoatRoughness: 0.2,
          reflectivity: 0.9,
          envMapIntensity: 0.78,
          normalScale: new THREE.Vector2(0.3, 0.18)
        }
  }

  private resolveHeroPlacements(): Array<{
    lateralOffset: number
    verticalOffset: number
    depthOffset: number
    scaleMultiplier: number
  }> {
    if (this.layoutStyle === 'nature-showcase') {
      return [
        { lateralOffset: -0.58, verticalOffset: 0.08, depthOffset: 0.9, scaleMultiplier: 1.24 },
        { lateralOffset: 0.34, verticalOffset: 0.05, depthOffset: 0.84, scaleMultiplier: 1.14 },
        { lateralOffset: 0, verticalOffset: 0.18, depthOffset: 0.88, scaleMultiplier: 1.06 }
      ]
    }

    return [
      { lateralOffset: -0.92, verticalOffset: 0.08, depthOffset: 1.3, scaleMultiplier: 1.78 },
      { lateralOffset: 0.82, verticalOffset: -0.05, depthOffset: 1.18, scaleMultiplier: 1.66 },
      { lateralOffset: 0.14, verticalOffset: 0.22, depthOffset: 1.34, scaleMultiplier: 1.54 }
    ]
  }

  private resolveHeroPriorityMultiplier(variant?: FishVariant): number {
    if (!variant) {
      return 1
    }

    if (variant.name !== 'Goldfish' && variant.name !== 'Butterflyfish') {
      return 1
    }

    if (this.layoutStyle === 'nature-showcase') {
      return 0.38
    }

    if (this.layoutStyle === 'planted') {
      return 0.84
    }

    return 1
  }

  private resolveHeroAccentScaleMultiplier(variant: FishVariant): number {
    if (variant.name !== 'Goldfish' && variant.name !== 'Butterflyfish') {
      return 1
    }

    if (this.layoutStyle === 'nature-showcase') {
      return 0.62
    }

    if (this.layoutStyle === 'planted') {
      return 0.92
    }

    return 1
  }

  private resolveHeroAccentDepthMultiplier(variant: FishVariant): number {
    if (variant.name !== 'Goldfish' && variant.name !== 'Butterflyfish') {
      return 1
    }

    if (this.layoutStyle === 'nature-showcase') {
      return 0.58
    }

    if (this.layoutStyle === 'planted') {
      return 0.9
    }

    return 1
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
    const materialResponse = this.resolveFishMaterialResponse(variant, hero)
    const resolvedAlphaTest = Math.max(texturedMaterial.alphaTest ?? 0, resolvedAlphaMap ? 0.05 : 0)
    const transparent = hero
      ? texturedMaterial.transparent || !!resolvedAlphaMap
      : texturedMaterial.transparent

    return new THREE.MeshPhysicalMaterial({
      map: resolvedMap,
      alphaMap: resolvedAlphaMap,
      normalMap: resolvedNormalMap,
      normalScale: materialResponse.normalScale,
      roughnessMap: resolvedRoughnessMap,
      color: texturedMaterial.color?.clone() ?? new THREE.Color(0xffffff),
      metalness: typeof texturedMaterial.metalness === 'number' ? texturedMaterial.metalness : materialResponse.metalness,
      roughness: materialResponse.roughness,
      clearcoat: Math.max(materialResponse.clearcoat, texturedMaterial.clearcoat ?? 0),
      clearcoatRoughness: Math.min(materialResponse.clearcoatRoughness, texturedMaterial.clearcoatRoughness ?? materialResponse.clearcoatRoughness),
      reflectivity: materialResponse.reflectivity,
      envMapIntensity: hero
        ? materialResponse.envMapIntensity
        : Math.min(materialResponse.envMapIntensity, Math.max(0.52, texturedMaterial.envMapIntensity ?? materialResponse.envMapIntensity)),
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
    this.instancedTailMotionUniforms = []
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
    if (archetype === 'Butterflyfish') return this.safeVariantIndex('butterflyfish')
    if (archetype === 'Goldfish') return this.safeVariantIndex('goldfish')
    return this.safeVariantIndex('neon')
  }

  private safeVariantIndex(name: string): number {
    const index = this.variants.findIndex((variant) => variant.name.toLowerCase() === name)
    return index >= 0 ? index : 0
  }
  
  private createDetailedFishGeometry(variant: FishVariant): THREE.BufferGeometry {
    const silhouette = this.resolveSilhouette(variant)

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
    const materialResponse = this.resolveFishMaterialResponse(variant, false)
    if (resolvedMap) {
      const alphaTest = speciesAlphaTexture ? 0.05 : 0
      const materialOptions: THREE.MeshPhysicalMaterialParameters = {
        map: resolvedMap,
        normalMap: speciesNormalTexture,
        roughnessMap: speciesRoughnessTexture,
        alphaMap: speciesAlphaTexture,
        color: 0xffffff,
        metalness: materialResponse.metalness,
        roughness: materialResponse.roughness,
        clearcoat: materialResponse.clearcoat,
        clearcoatRoughness: materialResponse.clearcoatRoughness,
        reflectivity: materialResponse.reflectivity,
        envMapIntensity: materialResponse.envMapIntensity,
        transparent: false,
        alphaTest,
        side: THREE.FrontSide
      }
      if (speciesNormalTexture) {
        materialOptions.normalScale = materialResponse.normalScale
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
    const interestForce = this.tempInterestForce ?? new THREE.Vector3()
    this.tempInterestForce = interestForce
    this.ensureHeadingState()
    this.ensureMotionStateArrays()
    ;(this.instancedTailMotionUniforms ?? []).forEach((uniform) => {
      uniform.value = elapsedTime
    })

    this.boids.boids.forEach((boid, index) => {
      if (index >= this.wanderTargets.length) return

      const variant = this.variants[this.getBoidVariantIndex(index)] ?? this.variants[0]
      if (!variant) return

      const locomotion = this.getLocomotionProfile(variant)
      const gaitState = this.gaitStates[index] ?? 'cruise'
      const dynamics = this.resolveGaitDynamics(gaitState, locomotion)
      this.updatePerFishBoidTuning(index, locomotion, gaitState, bounds, boundsSize, behavior)
      const moodCruiseStrength = behavior.schoolMood === 'alert'
        ? 1.04
        : behavior.schoolMood === 'feeding'
          ? 0.94
          : 0.88
      const wanderStrength = (0.18 + locomotion.curiosityRate * 0.16) * moodCruiseStrength * dynamics.wanderScale
      const jitterScale = locomotion.turnNoise * (0.035 + behavior.turnBias * 0.04) * dynamics.jitterScale
      const curiosityRate = locomotion.curiosityRate * (0.014 + behavior.turnBias * 0.028) * dynamics.curiosityScale
      const suddenTurnRate = locomotion.suddenTurnRate * (0.7 + behavior.turnBias * 0.4) * dynamics.suddenTurnScale
      const turnNoiseScale = locomotion.turnNoise * (0.05 + behavior.turnBias * 0.06) * dynamics.turnNoiseScale
      const depthRange = boundsSize.y * (0.08 + behavior.depthVariance * 0.18 + locomotion.depthBobAmount * 0.04) * dynamics.depthBobScale
      const depthForceScale = (0.45 + behavior.depthVariance * 0.9 + locomotion.depthBobAmount * 0.5) * dynamics.depthPullMultiplier

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

      const desiredDepthCenter = THREE.MathUtils.lerp(
        this.resolvePreferredDepthY(index, bounds, boundsSize),
        bounds.max.y - (behavior.preferredDepth * boundsSize.y),
        0.58
      )
      const desiredY = desiredDepthCenter +
        (Math.sin(elapsedTime * (0.3 + locomotion.depthBobAmount) + this.randomOffsets[index]) * depthRange)
      depthForce.set(0, desiredY - boid.position.y, 0).multiplyScalar(depthForceScale)

      const activeInterestPoint = this.activeInterestPoints[index]
      interestForce.set(0, 0, 0)
      if (activeInterestPoint) {
        interestForce.copy(activeInterestPoint.position).sub(boid.position)
        if (interestForce.lengthSq() > 0) {
          interestForce.normalize().multiplyScalar(dynamics.interestForceWeight)
        }
      }

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
        .add(interestForce)
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
      const instanceCount = mesh.count

      for (let i = 0; i < instanceCount && boidIndex < this.boids.boids.length; i++, boidIndex++) {
        const boid = this.boids.boids[boidIndex]
        const randomOffset = this.randomOffsets[boidIndex] ?? 0
        const swimPhase = this.swimPhases[boidIndex] ?? 0
        const speedMult = this.speedMultipliers[boidIndex] ?? 1
        const gaitState = this.gaitStates[boidIndex] ?? 'cruise'
        const dynamics = this.resolveGaitDynamics(gaitState, locomotion)
        const headingFollowRate = (
          2.4 +
          (locomotion.yawResponsiveness * 2.2) +
          (behavior.avoidWalls * 1.1)
        ) * dynamics.headingResponseScale * (1 - locomotion.turnStartLag * 0.45)
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
            -yawChange * (0.55 + locomotion.bankAmount * 0.75) * dynamics.bankScale,
            -locomotion.bankAmount,
            locomotion.bankAmount
          )
          this.dummy.rotation.x += climbAngle * (0.18 + locomotion.yawResponsiveness * 0.06)
          this.dummy.rotation.z += bank
          previousVelocity.copy(boid.velocity)
        }

        const swimFreq = locomotion.tailBeatFreq * speedMult * dynamics.tailBeatMultiplier * (0.92 + Math.sin(randomOffset) * 0.18)
        const bodySway = Math.sin(elapsedTime * swimFreq + swimPhase) * locomotion.bodyWiggleAmount * 0.045 * dynamics.bodyMotionScale
        const microPitch = Math.sin(elapsedTime * (swimFreq * 0.52) + swimPhase * 0.7) * locomotion.bodyWiggleAmount * 0.014 * dynamics.bodyMotionScale
        const tailWave = Math.sin(elapsedTime * (swimFreq * 1.35) + swimPhase * 1.35) * locomotion.bodyWiggleAmount * 0.28 * dynamics.tailBeatMultiplier
        this.dummy.rotation.x += microPitch * 0.35

        const floatWave = Math.sin(elapsedTime * (0.52 + locomotion.depthBobAmount * 0.38) + randomOffset) *
          (0.004 + behavior.depthVariance * 0.008 + locomotion.depthBobAmount * 0.006) *
          speedMult *
          dynamics.floatScale
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
          this.clampPositionToFishSafeBounds(
            heroAssignment.object.position,
            bounds,
            heroAssignment.fishSafeExtents,
            this.tempDirection.lengthSq() > 0 ? this.tempDirection : previousVelocity
          )
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
      bodyPosition?: THREE.Vector3
      tailPosition?: THREE.Vector3 | null
      tailMode?: 'pivot' | 'node' | 'none'
    } | undefined
    const body = motionNodes?.body
    if (!body) return

    body.position.copy(motionNodes?.bodyPosition ?? body.position)
    body.rotation.copy(motionNodes?.bodyRotation ?? new THREE.Euler())

    const tail = motionNodes?.tail ?? null
    if (tail) {
      tail.position.copy(motionNodes?.tailPosition ?? tail.position)
      tail.rotation.copy(motionNodes?.tailRotation ?? new THREE.Euler())
      if (motionNodes?.tailMode === 'pivot') {
        body.rotation.z += bodySway * 0.28
        body.rotation.x += bodyPitch * 0.72
        tail.rotation.y += tailWave * 1.1
        tail.rotation.z += bodySway * 0.2
        return
      }

      body.rotation.z += bodySway * 0.42
      body.rotation.x += bodyPitch * 0.82
      tail.rotation.y += tailWave * 1.14
      tail.rotation.z += bodySway * 0.34
      return
    }

    body.rotation.z += bodySway * 0.54
    body.rotation.x += bodyPitch * 0.92
    body.rotation.y += tailWave * 0.2
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
