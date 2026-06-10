/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BoidsSystem } from '../../utils/fish/Boids'
import { getFishContent, getFishContentList } from '../../content/registry'
import { resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors, resolveSubstratePlantAnchors } from '../aquascape/Aquascaping'
import { createFishSafeBounds, resolveFishAxisExtents } from '../../utils/layout/sceneBounds'
import { DEFAULT_ORIENTATION_CORRECTION, FISH_SAFE_PADDING_BY_PATH, LOCOMOTION_PROFILES, createFishVariants as createFishVariantDefinitions, resolveDefaultFishCount as resolveDefaultFishCountRule, resolveHeroAccentDepthMultiplier as resolveHeroAccentDepthMultiplierRule, resolveHeroAccentScaleMultiplier as resolveHeroAccentScaleMultiplierRule, resolveHeroPlacements as resolveHeroPlacementRules, resolveHeroPriorityMultiplier as resolveHeroPriorityMultiplierRule, resolveLocomotionProfile, resolvePreferredDepthBand, resolvePreferredLateralLane } from './fishPresentation'
import { clampCrawlerSubstrateY, resolveCrawlerSubstrateY } from './detailedFishSubstrate'

export function pickInterestPoint(this: any, index: number): HabitatInterestPoint | null {
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

export function resolveWanderTarget(this: any, index: number, profile: LocomotionProfile, boidPosition: THREE.Vector3, bounds: THREE.Box3, boundsSize: THREE.Vector3): THREE.Vector3 {
    const wanderDirection = this.tempWanderDirection ?? new THREE.Vector3()
    const wanderTarget = this.tempWanderTarget ?? new THREE.Vector3()
    this.tempWanderDirection = wanderDirection
    this.tempWanderTarget = wanderTarget
    const isCrawler = profile.movementMode === 'crawl'
    const substrateY = resolveCrawlerSubstrateY(bounds, boundsSize)
    const gaitState = this.gaitStates[index] ?? 'cruise'
    const laneX = this.resolvePreferredLaneX(index, bounds, boundsSize)
    const depthY = this.resolvePreferredDepthY(index, bounds, boundsSize)
    const interestPoint = gaitState === 'inspect' || gaitState === 'hover' || Math.random() < profile.inspectCuriosity * 0.22
      ? this.pickInterestPoint(index)
      : null
    this.activeInterestPoints[index] = interestPoint

    const anchor = interestPoint?.position ?? new THREE.Vector3(
      laneX,
      isCrawler ? substrateY : depthY,
      THREE.MathUtils.lerp(
        bounds.min.z + (boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.3 : 0.26)),
        bounds.max.z - (boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.42 : 0.28)),
        0.5 + ((this.interestSeeds[index] ?? 0.5) - 0.5) * (this.layoutStyle === 'nature-showcase' ? 0.62 : 0.8)
      )
    )
    const lateralSpread = isCrawler
      ? boundsSize.x * 0.026
      : gaitState === 'glide'
        ? boundsSize.x * (this.layoutStyle === 'nature-showcase' ? 0.13 : 0.18)
        : gaitState === 'hover'
          ? boundsSize.x * 0.04
          : boundsSize.x * (this.layoutStyle === 'nature-showcase' ? 0.08 : 0.12)
    const verticalSpread = isCrawler
      ? boundsSize.y * 0.006
      : gaitState === 'hover'
      ? boundsSize.y * 0.03
      : boundsSize.y * (this.layoutStyle === 'nature-showcase' ? 0.07 : 0.08)
    const depthSpread = isCrawler
      ? boundsSize.z * 0.018
      : gaitState === 'inspect'
        ? boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.03 : 0.05)
        : boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.04 : 0.08)

    wanderDirection.set(
      (Math.random() - 0.5) * 2,
      isCrawler ? 0 : (Math.random() - 0.5) * 0.9,
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
    if (isCrawler) {
      wanderTarget.y = clampCrawlerSubstrateY(
        substrateY,
        bounds,
        boundsSize
      )
    } else {
      wanderTarget.y = THREE.MathUtils.clamp(
        wanderTarget.y,
        bounds.min.y + boundsSize.y * 0.18,
        bounds.max.y - boundsSize.y * 0.16
      )
    }
    wanderTarget.z = THREE.MathUtils.clamp(
      wanderTarget.z,
      bounds.min.z + boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.24 : 0.2),
      bounds.max.z - boundsSize.z * (this.layoutStyle === 'nature-showcase' ? 0.32 : 0.2)
    )

    return wanderTarget.clone()
  }

export function transitionGaitState(this: any, index: number, elapsedTime: number, profile: LocomotionProfile): void {
    const nextState = this.chooseNextGaitState(index, profile)
    this.gaitStates[index] = nextState
    this.stateCooldowns[index] = elapsedTime + 0.9 + profile.turnStartLag + (Math.random() * 1.1)
    this.nextStateChangeTimes[index] = this.scheduleNextStateChangeTime(profile, nextState, elapsedTime)
    this.nextRetargetTimes[index] = Math.min(
      this.nextRetargetTimes[index] || Number.POSITIVE_INFINITY,
      this.scheduleNextRetargetTime(profile, nextState, elapsedTime)
    )
  }

export function resolveGaitDynamics(this: any, gaitState: GaitState, profile: LocomotionProfile) {
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
          tailAmplitudeMultiplier: 0.78,
          tailCadenceMultiplier: 0.94,
          bodyMotionScale: 1.12,
          impulseScale: 0.52,
          pauseScale: 1.12,
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
          tailAmplitudeMultiplier: 0.36,
          tailCadenceMultiplier: 0.62,
          bodyMotionScale: 0.66,
          impulseScale: 0.24,
          pauseScale: 1.28,
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
          tailAmplitudeMultiplier: 1.14,
          tailCadenceMultiplier: 1.42,
          bodyMotionScale: 0.54,
          impulseScale: 1.55,
          pauseScale: 0.62,
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
          tailAmplitudeMultiplier: 0.22,
          tailCadenceMultiplier: 0.48,
          bodyMotionScale: 1.22,
          impulseScale: 0.14,
          pauseScale: 1.55,
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
          tailAmplitudeMultiplier: 1,
          tailCadenceMultiplier: 1,
          bodyMotionScale: 0.82,
          impulseScale: 1,
          pauseScale: 1,
          bankScale: 1,
          headingResponseScale: 1,
          floatScale: 0.92
        }
    }
  }

export function updatePerFishBoidTuning(this: any, index: number, profile: LocomotionProfile, gaitState: GaitState, bounds: THREE.Box3, boundsSize: THREE.Vector3, behavior?: BehaviorProfile): void {
    if (!this.boids || typeof (this.boids as unknown as { setBoidTuning?: unknown }).setBoidTuning !== 'function') {
      return
    }
    const dynamics = this.resolveGaitDynamics(gaitState, profile)
    const isCrawler = profile.movementMode === 'crawl'
    const substrateY = resolveCrawlerSubstrateY(bounds, boundsSize)
    const preferredDepthY = isCrawler
      ? substrateY
      : behavior
      ? THREE.MathUtils.lerp(
        this.resolvePreferredDepthY(index, bounds, boundsSize),
        bounds.max.y - (behavior.preferredDepth * boundsSize.y),
        0.58
      )
      : this.resolvePreferredDepthY(index, bounds, boundsSize)
    this.boids.setBoidTuning(index, {
      activeSpeedMultiplier: dynamics.speedMultiplier * (isCrawler ? 0.42 : 1),
      preferredLateralX: this.resolvePreferredLaneX(index, bounds, boundsSize),
      preferredDepthY,
      lanePull: profile.lanePull * dynamics.lanePullMultiplier,
      depthPull: profile.depthPull * dynamics.depthPullMultiplier * (isCrawler ? 1.6 : 1),
      drag: isCrawler ? Math.max(dynamics.drag, 1.1) : dynamics.drag
    })
  }

export function applyVariantLocomotionTuning(this: any): void {
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
      const isCrawler = profile.movementMode === 'crawl'
      const substrateY = resolveCrawlerSubstrateY(bounds, boundsSize)
      const renderPath = this.getVisualModel(variant.schoolModelId)?.sourceMesh ? 'school' : 'procedural'
      this.boids.setBoidTuning(index, {
        cruiseSpeed: profile.cruiseSpeed,
        yawResponsiveness: profile.yawResponsiveness,
        cruiseBias: profile.cruiseBias,
        turnNoise: profile.turnNoise,
        boundaryArcRadius: profile.boundaryArcRadius,
        fishSafeExtents: this.resolveFishSafeExtents(variant, renderPath),
        preferredLateralX: this.resolvePreferredLaneX(index, bounds, boundsSize),
        preferredDepthY: isCrawler ? substrateY : this.resolvePreferredDepthY(index, bounds, boundsSize),
        lanePull: profile.lanePull,
        depthPull: profile.depthPull * (isCrawler ? 1.6 : 1),
        activeSpeedMultiplier: isCrawler ? 0.42 : 1,
        drag: isCrawler ? 1.1 : 0.06,
        steeringWeights: profile.steeringWeights
      })
    })
  }

export function initializeRandomness(this: any): void {
    // Create arrays for individual fish randomness
    this.randomOffsets = new Float32Array(this.fishCount)
    this.swimPhases = new Float32Array(this.fishCount)
    this.speedMultipliers = new Float32Array(this.fishCount)
    this.nextRetargetTimes = new Float32Array(this.fishCount)
    this.nextStateChangeTimes = new Float32Array(this.fishCount)
    this.stateCooldowns = new Float32Array(this.fishCount)
    this.interestSeeds = new Float32Array(this.fishCount)
    this.motionTailCadenceOffsets = new Float32Array(this.fishCount)
    this.motionAmplitudeOffsets = new Float32Array(this.fishCount)
    this.motionPauseBiases = new Float32Array(this.fishCount)
    this.motionDartBiases = new Float32Array(this.fishCount)
    this.motionTurnBiasOffsets = new Float32Array(this.fishCount)
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
      this.motionTailCadenceOffsets[i] = THREE.MathUtils.lerp(
        profile.movementMode === 'crawl' ? 0.92 : 0.86,
        profile.movementMode === 'crawl' ? 1.14 : 1.16,
        Math.random()
      )
      this.motionAmplitudeOffsets[i] = THREE.MathUtils.lerp(
        profile.movementMode === 'crawl' ? 0.9 : 0.82,
        profile.movementMode === 'crawl' ? 1.1 : 1.22,
        Math.random()
      )
      this.motionPauseBiases[i] = Math.random()
      this.motionDartBiases[i] = Math.random()
      this.motionTurnBiasOffsets[i] = THREE.MathUtils.lerp(-1, 1, Math.random())
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

export function updateWanderTargets(this: any, elapsedTime: number): void {
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

export function applyInstancedTailMotionAttributes(this: any, geometry: THREE.BufferGeometry, variant: FishVariant, boidStartIndex: number, instanceCount: number): void {
    const profile = this.getLocomotionProfile(variant)
    const phaseOffsets = new Float32Array(instanceCount)
    const tailAmplitudes = new Float32Array(instanceCount)
    const tailFrequencies = new Float32Array(instanceCount)
    const walkAmplitudes = new Float32Array(instanceCount)
    const walkFrequencies = new Float32Array(instanceCount)

    for (let i = 0; i < instanceCount; i++) {
      const boidIndex = boidStartIndex + i
      const phase = this.swimPhases?.[boidIndex] ?? 0
      const cadence = this.speedMultipliers?.[boidIndex] ?? 1
      const offset = this.randomOffsets?.[boidIndex] ?? 0
      const isCrawler = profile.movementMode === 'crawl'
      const gaitState = this.gaitStates?.[boidIndex] ?? 'cruise'
      const dynamics = this.resolveGaitDynamics(gaitState, profile)
      const cadenceOffset = this.motionTailCadenceOffsets?.[boidIndex] ?? 1
      const amplitudeOffset = this.motionAmplitudeOffsets?.[boidIndex] ?? 1
      phaseOffsets[i] = phase
      tailAmplitudes[i] = isCrawler
        ? (0.002 + profile.bodyWiggleAmount * 0.012) * (0.82 + (Math.sin(offset * 1.7) * 0.18)) * amplitudeOffset
        : (
          0.03 +
          (profile.bodyWiggleAmount * 0.05) +
          (Math.max(0, 1 - profile.yawResponsiveness) * 0.008)
        ) * (0.78 + (Math.sin(offset * 1.7) * 0.22)) * dynamics.tailAmplitudeMultiplier * amplitudeOffset
      tailFrequencies[i] = Math.max(
        0.45,
        profile.tailBeatFreq * cadence * dynamics.tailCadenceMultiplier * cadenceOffset * (0.84 + Math.cos(offset * 1.3) * 0.16)
      )
      walkAmplitudes[i] = isCrawler
        ? (0.038 + profile.curiosityRate * 0.01) * (0.86 + Math.sin(offset * 1.1) * 0.14) * amplitudeOffset
        : 0
      walkFrequencies[i] = isCrawler
        ? Math.max(1.05, (1.34 + profile.cruiseSpeed * 0.55) * cadence * cadenceOffset * (0.9 + Math.cos(offset * 1.4) * 0.1))
        : 0
    }

    geometry.setAttribute('instancePhaseOffset', new THREE.InstancedBufferAttribute(phaseOffsets, 1))
    geometry.setAttribute('instanceTailAmplitude', new THREE.InstancedBufferAttribute(tailAmplitudes, 1))
    geometry.setAttribute('instanceTailFrequency', new THREE.InstancedBufferAttribute(tailFrequencies, 1))
    geometry.setAttribute('instanceWalkAmplitude', new THREE.InstancedBufferAttribute(walkAmplitudes, 1))
    geometry.setAttribute('instanceWalkFrequency', new THREE.InstancedBufferAttribute(walkFrequencies, 1))
  }

export function patchInstancedFishMaterial(this: any, material: THREE.MeshPhysicalMaterial, geometry: THREE.BufferGeometry, variant: FishVariant, renderPath: Exclude<FishRenderPath, 'hero'>): void {
    if (!this.instancedTailMotionUniforms) {
      this.instancedTailMotionUniforms = []
    }
    const profile = this.getLocomotionProfile(variant)
    const isCrawler = profile.movementMode === 'crawl'
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
attribute float instanceWalkAmplitude;
attribute float instanceWalkFrequency;
uniform float uFishMotionTime;
uniform vec3 uFishForwardAxis;
uniform vec2 uFishForwardRange;`
        )
        .replace(
          '#include <begin_vertex>',
          isCrawler
            ? `vec3 transformed = vec3(position);
vec3 fishForwardAxis = normalize(uFishForwardAxis);
vec3 fishSideAxis = normalize(cross(vec3(0.0, 1.0, 0.0), fishForwardAxis));
if (length(fishSideAxis) < 0.0001) {
  fishSideAxis = vec3(0.0, 0.0, 1.0);
}
vec3 fishUpAxis = normalize(cross(fishForwardAxis, fishSideAxis));
float forwardProjection = dot(transformed, fishForwardAxis);
float normalizedForward = clamp((forwardProjection - uFishForwardRange.x) / max(0.0001, uFishForwardRange.y - uFishForwardRange.x), 0.0, 1.0);
float upProjection = dot(transformed, fishUpAxis);
float sideProjection = dot(transformed, fishSideAxis);
float undersideMask = 1.0 - smoothstep(-0.05, 0.12, upProjection);
float midBodyMask = smoothstep(0.12, 0.32, normalizedForward) * (1.0 - smoothstep(0.86, 0.98, normalizedForward));
float sideMask = smoothstep(0.012, 0.08, abs(sideProjection));
float sidePhase = sideProjection < 0.0 ? 3.14159265 : 0.0;
float crawlFootWave = sin((uFishMotionTime * instanceWalkFrequency) + instancePhaseOffset + sidePhase + normalizedForward * 18.0) * instanceWalkAmplitude;
float crawlStepLift = abs(crawlFootWave) * undersideMask * midBodyMask * sideMask;
float bodySettle = sin((uFishMotionTime * instanceWalkFrequency * 0.5) + instancePhaseOffset) * instanceWalkAmplitude * 0.18;
transformed += fishSideAxis * crawlFootWave * undersideMask * midBodyMask * sideMask;
transformed += fishForwardAxis * crawlStepLift * 0.18;
transformed += fishUpAxis * (crawlStepLift * 0.34 + bodySettle * midBodyMask);`
            : `vec3 transformed = vec3(position);
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

    material.customProgramCacheKey = () => `${renderPath}-${isCrawler ? 'instanced-crawler-walk-motion' : 'instanced-tail-motion'}`
    material.needsUpdate = true
  }
