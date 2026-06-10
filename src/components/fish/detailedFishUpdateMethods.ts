/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BoidsSystem } from '../../utils/fish/Boids'
import { getFishContent, getFishContentList } from '../../content/registry'
import { resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors, resolveSubstratePlantAnchors } from '../aquascape/Aquascaping'
import { createFishSafeBounds, resolveFishAxisExtents } from '../../utils/layout/sceneBounds'
import { DEFAULT_BEHAVIOR_PROFILE } from './detailedFishBehaviorProfile'
import { DEFAULT_ORIENTATION_CORRECTION, FISH_SAFE_PADDING_BY_PATH, LOCOMOTION_PROFILES, createFishVariants as createFishVariantDefinitions, resolveDefaultFishCount as resolveDefaultFishCountRule, resolveHeroAccentDepthMultiplier as resolveHeroAccentDepthMultiplierRule, resolveHeroAccentScaleMultiplier as resolveHeroAccentScaleMultiplierRule, resolveHeroPlacements as resolveHeroPlacementRules, resolveHeroPriorityMultiplier as resolveHeroPriorityMultiplierRule, resolveLocomotionProfile, resolvePreferredDepthBand, resolvePreferredLateralLane } from './fishPresentation'

export function update(this: any, deltaTime: number, elapsedTime: number): void {
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

    this.schoolUpdateDeltaTime = ((this.schoolUpdateDeltaTime as number | undefined) ?? 0) + safeDeltaTime
    const schoolUpdateInterval = this.currentQuality === 'simple' ? 2 : 1
    const schoolUpdateFrame = (this.schoolUpdateFrame as number | undefined) ?? 0
    const shouldUpdateSchoolMotion = schoolUpdateFrame % schoolUpdateInterval === 0
    this.schoolUpdateFrame = schoolUpdateFrame + 1

    if (shouldUpdateSchoolMotion) {
      const schoolDeltaTime = this.schoolUpdateDeltaTime
      this.schoolUpdateDeltaTime = 0
      this.applyBehaviorForces(bounds, boundsSize, behavior, elapsedTime, schoolDeltaTime)
      this.boids.update(schoolDeltaTime)
      this.syncInstancedMeshes(bounds, behavior, elapsedTime, schoolDeltaTime)
    }
    this.updateHeroAnimations(safeDeltaTime)
  }

export function applyBehaviorForces(this: any, bounds: THREE.Box3, boundsSize: THREE.Vector3, behavior: BehaviorProfile, elapsedTime: number, safeDeltaTime: number): void {
    const depthForce = this.tempDepthForce ?? new THREE.Vector3()
    const interestForce = this.tempInterestForce ?? new THREE.Vector3()

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
  }

export function syncInstancedMeshes(this: any, bounds: THREE.Box3, behavior: BehaviorProfile, elapsedTime: number, safeDeltaTime: number): void {
    const horizontalDirection = this.tempHorizontalDirection ?? new THREE.Vector3()
    const horizontalPreviousDirection = this.tempHorizontalPreviousDirection ?? new THREE.Vector3()
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
          const targetQuaternion = this.resolveRenderQuaternion(variant, renderPath, this.tempDirection)

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
            const heroQuaternion = this.resolveRenderQuaternion(variant, 'hero', this.tempDirection)
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

export function applyHeroLocalMotion(this: any, heroObject: THREE.Object3D, bodySway: number, bodyPitch: number, tailWave: number): void {
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

export function getVisibleFishCount(this: any): number {
    return this.instancedMeshes.reduce((count, mesh) => count + mesh.count, 0)
  }

export function getHeroFocusPoint(this: any): THREE.Vector3 | null {
    const heroFishMeshes = this.heroFishMeshes ?? []
    const visibleHero = heroFishMeshes.find((object) => object.visible)
    return visibleHero ? visibleHero.position.clone() : null
  }

export function setMotionEnabled(this: any, enabled: boolean): void {
    if (!enabled) {
      for (const boid of this.boids.boids) {
        boid.velocity.multiplyScalar(0)
        boid.acceleration.multiplyScalar(0)
      }
    }
  }

export function setQuality(this: any, quality: QualityLevel): void {
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
      object.visible = this.shouldShowHeroFishOnQuality(object, quality)
    })
  }

export function shouldShowHeroFishOnQuality(this: any, heroObject: THREE.Object3D, quality: QualityLevel): boolean {
    return quality === 'standard' || heroObject.userData.hasAuthoredHeroAnimation === true
  }
