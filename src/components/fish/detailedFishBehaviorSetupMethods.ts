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

export function resolveDefaultFishCount(this: any, isMobile: boolean): number {
    return resolveDefaultFishCountRule(this.layoutStyle, isMobile)
  }

export function applyTuning(this: any, tuning: Partial<Tuning>): void {
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

export function setFishGroups(this: any, groups: FishGroup[]): void {
    const sanitized = groups.filter((group) => group.count > 0)
    const totalCount = sanitized.reduce((sum, group) => sum + group.count, 0)
    const countsPerVariant = this.mapGroupsToVariantCounts(sanitized)

    this.rebuildFishSystem(totalCount, countsPerVariant)
    this.setQuality(this.currentQuality)

    this.applyBehaviorProfile(this.resolveBehaviorProfile(sanitized))
  }

export function createFishVariants(this: any): FishVariant[] {
    return createFishVariantDefinitions()
  }

export function resolveVariantCounts(this: any, countsPerVariant?: number[]): number[] {
    const fallbackCounts = this.variants.map((_variant, index) => {
      const fishPerVariant = Math.ceil(this.fishCount / this.variants.length)
      return Math.max(0, Math.min(fishPerVariant, this.fishCount - index * fishPerVariant))
    })

    return countsPerVariant ?? fallbackCounts
  }

export function buildBoidVariantIndices(this: any, countsPerVariant: number[]): number[] {
    return countsPerVariant.flatMap((count, variantIndex) => Array.from({ length: Math.max(0, count ?? 0) }, () => variantIndex))
  }

export function getBoidVariantIndex(this: any, index: number): number {
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

export function getLocomotionProfile(this: any, variant: FishVariant): LocomotionProfile {
    return resolveLocomotionProfile(variant)
  }

export function getLegacyOrientationCorrection(this: any, variant: FishVariant, renderPath: FishRenderPath): OrientationCorrection | undefined {
    return renderPath === 'school'
      ? variant.orientationCorrection?.schoolGLB
      : renderPath === 'hero'
        ? variant.orientationCorrection?.heroGLB
        : variant.orientationCorrection?.procedural
  }

export function getOrientationCorrection(this: any, variant: FishVariant, renderPath: FishRenderPath): Required<OrientationCorrection> {
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

export function getModelForwardAxis(this: any, variant: FishVariant, renderPath: FishRenderPath): THREE.Vector3 {
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

export function resolveHeadingQuaternion(this: any, variant: FishVariant, renderPath: FishRenderPath, direction: THREE.Vector3): THREE.Quaternion {
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

export function resolveRenderQuaternion(this: any, variant: FishVariant, renderPath: FishRenderPath, direction: THREE.Vector3): THREE.Quaternion {
    const renderQuaternion = this.tempRenderQuaternion ?? new THREE.Quaternion()
    const correctionQuaternion = this.tempCorrectionQuaternion ?? new THREE.Quaternion()
    const correction = this.getOrientationCorrection(variant, renderPath).correctionQuaternion
    this.tempRenderQuaternion = renderQuaternion
    this.tempCorrectionQuaternion = correctionQuaternion

    renderQuaternion.copy(this.resolveHeadingQuaternion(variant, renderPath, direction))
    correctionQuaternion.set(
      correction[0],
      correction[1],
      correction[2],
      correction[3]
    ).normalize()

    return renderQuaternion.multiply(correctionQuaternion)
  }

export function resolveSilhouette(this: any, variant: FishVariant): Required<NonNullable<FishVariant['silhouette']>> {
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

export function resolveBoundsExtentsFromModel(this: any, bounds: THREE.Box3, variant: FishVariant, renderPath: FishRenderPath, scaleMultiplier: number): FishRenderExtents {
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

export function resolveProceduralFishSafeExtents(this: any, variant: FishVariant, scaleMultiplier: number): FishRenderExtents {
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

export function resolveFishSafeExtents(this: any, variant: FishVariant, renderPath: FishRenderPath, scaleMultiplier: number = 1.04): FishRenderExtents {
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

export function clampPositionToFishSafeBounds(this: any, position: THREE.Vector3, bounds: THREE.Box3, extents: FishRenderExtents, direction: THREE.Vector3): void {
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

export function ensureMotionStateArrays(this: any): void {
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
    if (!this.motionTailCadenceOffsets || this.motionTailCadenceOffsets.length !== count) {
      this.motionTailCadenceOffsets = new Float32Array(count).fill(1)
    }
    if (!this.motionAmplitudeOffsets || this.motionAmplitudeOffsets.length !== count) {
      this.motionAmplitudeOffsets = new Float32Array(count).fill(1)
    }
    if (!this.motionPauseBiases || this.motionPauseBiases.length !== count) {
      this.motionPauseBiases = new Float32Array(count).fill(0.5)
    }
    if (!this.motionDartBiases || this.motionDartBiases.length !== count) {
      this.motionDartBiases = new Float32Array(count).fill(0.5)
    }
    if (!this.motionTurnBiasOffsets || this.motionTurnBiasOffsets.length !== count) {
      this.motionTurnBiasOffsets = new Float32Array(count)
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

export function randomRange(this: any, min: number, max: number): number {
    return min + ((max - min) * Math.random())
  }

export function scheduleNextRetargetTime(this: any, profile: LocomotionProfile, gaitState: GaitState, elapsedTime: number): number {
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

export function scheduleNextStateChangeTime(this: any, profile: LocomotionProfile, gaitState: GaitState, elapsedTime: number): number {
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

export function pickPreferredDepthBand(this: any, profile: LocomotionProfile): PreferredDepthBand {
    return resolvePreferredDepthBand(this.layoutStyle, profile, Math.random())
  }

export function pickPreferredLateralLane(this: any): PreferredLateralLane {
    return resolvePreferredLateralLane(this.layoutStyle, Math.random())
  }

export function pickInitialGaitState(this: any, profile: LocomotionProfile): GaitState {
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

export function chooseNextGaitState(this: any, index: number, profile: LocomotionProfile): GaitState {
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

export function resolvePreferredDepthY(this: any, index: number, bounds: THREE.Box3, boundsSize: THREE.Vector3): number {
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

export function resolvePreferredLaneX(this: any, index: number, bounds: THREE.Box3, boundsSize: THREE.Vector3): number {
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

export function buildHabitatInterestPoints(this: any, bounds: THREE.Box3): HabitatInterestPoint[] {
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
