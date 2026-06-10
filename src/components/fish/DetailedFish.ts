import * as THREE from 'three'
import { BoidsSystem } from '../../utils/fish/Boids'
import type { AquascapeLayoutStyle, FishGroup, Tuning } from '../../types/aquarium'
import type { VisualAssetBundle } from '../../assets/visualAssets'
import type { QualityLevel } from '../../types/settings'
import type { FishRenderExtents } from '../../utils/layout/sceneBounds'
import { resolveRuntimeLayoutSeed } from '../aquascape/Aquascaping'
import { DEFAULT_BEHAVIOR_PROFILE, type BehaviorProfile } from './detailedFishBehaviorProfile'
import type { FishVariant, GaitState, PreferredDepthBand, PreferredLateralLane } from './fishPresentation'
import {
  resolveDefaultFishCount,
  applyTuning,
  setFishGroups,
  createFishVariants,
  resolveVariantCounts,
  buildBoidVariantIndices,
  getBoidVariantIndex,
  getLocomotionProfile,
  getLegacyOrientationCorrection,
  getOrientationCorrection,
  getModelForwardAxis,
  resolveHeadingQuaternion,
  resolveRenderQuaternion,
  resolveSilhouette,
  resolveBoundsExtentsFromModel,
  resolveProceduralFishSafeExtents,
  resolveFishSafeExtents,
  clampPositionToFishSafeBounds,
  ensureMotionStateArrays,
  randomRange,
  scheduleNextRetargetTime,
  scheduleNextStateChangeTime,
  pickPreferredDepthBand,
  pickPreferredLateralLane,
  pickInitialGaitState,
  chooseNextGaitState,
  resolvePreferredDepthY,
  resolvePreferredLaneX,
  buildHabitatInterestPoints
} from './detailedFishBehaviorSetupMethods'
import {
  pickInterestPoint,
  resolveWanderTarget,
  transitionGaitState,
  resolveGaitDynamics,
  updatePerFishBoidTuning,
  applyVariantLocomotionTuning,
  initializeRandomness,
  updateWanderTargets,
  applyInstancedTailMotionAttributes,
  patchInstancedFishMaterial
} from './detailedFishMotionMethods'
import {
  createDetailedFishMeshes,
  createHeroFishMeshes,
  createHeroFishObject,
  installHeroAnimation,
  updateHeroAnimations,
  wrapHeroMotionObject,
  resolveHeroTailPivotDistance,
  findHeroTailTarget,
  createHeroFishMaterial,
  resolveBehaviorProfile,
  applyBehaviorProfile,
  rebuildFishSystem,
  ensureHeadingState,
  shouldTrigger,
  disposeMaterialTextures,
  getVisualTexture,
  getVisualModel,
  getGenericFishDetailTexture,
  resolveFishMaterialResponse
} from './detailedFishMeshMethods'
import {
  resolveHeroPlacements,
  resolveHeroPriorityMultiplier,
  hasAuthoredHeroAsset,
  resolveHeroAccentScaleMultiplier,
  resolveHeroAccentDepthMultiplier,
  createFishAssetMaterial,
  clearMeshes,
  mapGroupsToVariantCounts,
  resolveVariantIndex,
  safeVariantIndex,
  createDetailedFishGeometry,
  createEmergencyFishTexture,
  createFishMaterial
} from './detailedFishAssetMethods'
import {
  update,
  applyBehaviorForces,
  syncInstancedMeshes,
  applyHeroLocalMotion,
  getVisibleFishCount,
  getHeroFocusPoint,
  setMotionEnabled,
  setQuality,
  shouldShowHeroFishOnQuality
} from './detailedFishUpdateMethods'

type HabitatInterestPoint = {
  kind: 'hardscape' | 'plant' | 'open-lane'
  position: THREE.Vector3
  preferredDepthBands: PreferredDepthBand[]
  preferredLateralLanes: PreferredLateralLane[]
  weight: number
}


export class DetailedFishSystem {
  declare public resolveDefaultFishCount: (isMobile: boolean) => number
  declare public createFishVariants: () => FishVariant[]
  declare public resolveVariantCounts: () => number[]
  declare public buildBoidVariantIndices: (variantCounts: number[]) => number[]
  declare public initializeRandomness: () => void
  declare public createDetailedFishMeshes: (variantCounts?: number[]) => void
  declare public applyVariantLocomotionTuning: () => void
  declare public applyTuning: (tuning: Partial<Tuning>) => void
  declare public setFishGroups: (groups: FishGroup[]) => void
  declare public update: (deltaTime: number, elapsedTime: number) => void
  declare public getVisibleFishCount: () => number
  declare public getHeroFocusPoint: () => THREE.Vector3 | null
  declare public setMotionEnabled: (enabled: boolean) => void
  declare public setQuality: (quality: QualityLevel) => void

  public group: THREE.Group
  public instancedMeshes: THREE.InstancedMesh[] = []
  public heroFishMeshes: THREE.Object3D[] = []
  public boids: BoidsSystem
  public fishCount: number
  public bounds: THREE.Box3
  public dummy = new THREE.Object3D()
  public variants: FishVariant[]
  public randomOffsets: Float32Array = new Float32Array()
  public swimPhases: Float32Array = new Float32Array()
  public speedMultipliers: Float32Array = new Float32Array()
  public wanderTargets: THREE.Vector3[] = []
  public nextRetargetTimes: Float32Array = new Float32Array()
  public nextStateChangeTimes: Float32Array = new Float32Array()
  public stateCooldowns: Float32Array = new Float32Array()
  public gaitStates: GaitState[] = []
  public preferredDepthBands: PreferredDepthBand[] = []
  public preferredLateralLanes: PreferredLateralLane[] = []
  public interestSeeds: Float32Array = new Float32Array()
  public motionTailCadenceOffsets: Float32Array = new Float32Array()
  public motionAmplitudeOffsets: Float32Array = new Float32Array()
  public motionPauseBiases: Float32Array = new Float32Array()
  public motionDartBiases: Float32Array = new Float32Array()
  public motionTurnBiasOffsets: Float32Array = new Float32Array()
  public activeInterestPoints: Array<HabitatInterestPoint | null> = []
  public habitatInterestPoints: HabitatInterestPoint[] = []
  public baseInstanceCounts: number[] = []
  public tempWanderForce = new THREE.Vector3()
  public tempJitter = new THREE.Vector3()
  public tempNoiseForce = new THREE.Vector3()
  public tempInterestForce = new THREE.Vector3()
  public tempDirection = new THREE.Vector3()
  public tempSuddenTurn = new THREE.Vector3()
  public tempCuriosityForce = new THREE.Vector3()
  public tempForwardAxis = new THREE.Vector3(1, 0, 0)
  public tempQuaternion = new THREE.Quaternion()
  public tempCorrectionQuaternion = new THREE.Quaternion()
  public tempRenderQuaternion = new THREE.Quaternion()
  public tempHorizontalDirection = new THREE.Vector3()
  public tempHorizontalPreviousDirection = new THREE.Vector3()
  public tempCurrentPos = new THREE.Vector3()
  public tempWanderDirection = new THREE.Vector3()
  public tempWanderTarget = new THREE.Vector3()
  public tempDepthForce = new THREE.Vector3()
  public tempBoundsSize = new THREE.Vector3()
  public instancedTailMotionUniforms: Array<{ value: number }> = []
  public smoothedQuaternions: THREE.Quaternion[] = []
  public previousVelocities: THREE.Vector3[] = []
  public headingInitialized: boolean[] = []
  public behaviorProfile: BehaviorProfile = { ...DEFAULT_BEHAVIOR_PROFILE }
  public currentQuality: QualityLevel = 'standard'
  public schoolUpdateFrame = 0
  public schoolUpdateDeltaTime = 0
  public visualAssets: VisualAssetBundle | null
  public layoutStyle: AquascapeLayoutStyle
  public layoutSeed: number
  public boidVariantIndices: number[] = []
  public heroAssignments = new Map<number, {
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
}

Object.assign(DetailedFishSystem.prototype, {
  resolveDefaultFishCount,
  applyTuning,
  setFishGroups,
  createFishVariants,
  resolveVariantCounts,
  buildBoidVariantIndices,
  getBoidVariantIndex,
  getLocomotionProfile,
  getLegacyOrientationCorrection,
  getOrientationCorrection,
  getModelForwardAxis,
  resolveHeadingQuaternion,
  resolveRenderQuaternion,
  resolveSilhouette,
  resolveBoundsExtentsFromModel,
  resolveProceduralFishSafeExtents,
  resolveFishSafeExtents,
  clampPositionToFishSafeBounds,
  ensureMotionStateArrays,
  randomRange,
  scheduleNextRetargetTime,
  scheduleNextStateChangeTime,
  pickPreferredDepthBand,
  pickPreferredLateralLane,
  pickInitialGaitState,
  chooseNextGaitState,
  resolvePreferredDepthY,
  resolvePreferredLaneX,
  buildHabitatInterestPoints,
  pickInterestPoint,
  resolveWanderTarget,
  transitionGaitState,
  resolveGaitDynamics,
  updatePerFishBoidTuning,
  applyVariantLocomotionTuning,
  initializeRandomness,
  updateWanderTargets,
  applyInstancedTailMotionAttributes,
  patchInstancedFishMaterial,
  createDetailedFishMeshes,
  createHeroFishMeshes,
  createHeroFishObject,
  installHeroAnimation,
  updateHeroAnimations,
  wrapHeroMotionObject,
  resolveHeroTailPivotDistance,
  findHeroTailTarget,
  createHeroFishMaterial,
  resolveBehaviorProfile,
  applyBehaviorProfile,
  rebuildFishSystem,
  ensureHeadingState,
  shouldTrigger,
  disposeMaterialTextures,
  getVisualTexture,
  getVisualModel,
  getGenericFishDetailTexture,
  resolveFishMaterialResponse,
  resolveHeroPlacements,
  resolveHeroPriorityMultiplier,
  hasAuthoredHeroAsset,
  resolveHeroAccentScaleMultiplier,
  resolveHeroAccentDepthMultiplier,
  createFishAssetMaterial,
  clearMeshes,
  mapGroupsToVariantCounts,
  resolveVariantIndex,
  safeVariantIndex,
  createDetailedFishGeometry,
  createEmergencyFishTexture,
  createFishMaterial,
  update,
  applyBehaviorForces,
  syncInstancedMeshes,
  applyHeroLocalMotion,
  getVisibleFishCount,
  getHeroFocusPoint,
  setMotionEnabled,
  setQuality,
  shouldShowHeroFishOnQuality
})
