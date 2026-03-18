import * as THREE from 'three'
import {
  createFishSafeBounds,
  resolveFishAxisExtents,
  type FishRenderExtents
} from '../components/sceneBounds'

const clamp01 = (value: number): number => THREE.MathUtils.clamp(value, 0, 1)
const DEFAULT_FISH_SAFE_EXTENTS: FishRenderExtents = {
  noseExtent: 0,
  tailExtent: 0,
  halfBodyWidth: 0,
  halfBodyHeight: 0
}

interface BoidParams {
  alignment: number
  cohesion: number
  separation: number
  maxSpeed: number
  maxForce: number
  neighborRadius: number
  boundaryMargin: number
  boundaryLookAhead: number
  boundaryWeight: number
  boundaryInwardStrength: number
  hardBoundaryMultiplier: number
  lateralCruiseBias: number
  verticalWanderScale: number
  depthWanderScale: number
  cruiseWeight: number
}

type SteeringWeightTuning = {
  alignment?: number
  cohesion?: number
  separation?: number
}

export interface BoidsBehaviorTuning {
  speed: number
  turnBias: number
  avoidWalls: number
  cruiseBias?: number
  turnNoise?: number
  boundaryArcRadius?: number
  yawResponsiveness?: number
}

type BoidTuning = {
  cruiseSpeed?: number
  yawResponsiveness?: number
  cruiseBias?: number
  turnNoise?: number
  boundaryArcRadius?: number
  fishSafeExtents?: FishRenderExtents
  steeringWeights?: SteeringWeightTuning
}

type RuntimeBoidParams = BoidParams & {
  boundaryArcRadius: number
  fishSafeExtents: FishRenderExtents
  frontComfortBias: number
  turnNoise: number
}

export class Boid {
  position: THREE.Vector3
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  maxSpeed: number
  maxForce: number

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 1.2
    )
    this.acceleration = new THREE.Vector3()
    this.maxSpeed = 2.4
    this.maxForce = 1.6
  }

  applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force)
  }

  seek(target: THREE.Vector3): THREE.Vector3 {
    const desired = new THREE.Vector3().subVectors(target, this.position)
    if (desired.lengthSq() === 0) {
      return desired
    }

    desired.normalize()
    desired.multiplyScalar(this.maxSpeed)

    const steer = new THREE.Vector3().subVectors(desired, this.velocity)
    steer.clampLength(0, this.maxForce)

    return steer
  }

  flee(target: THREE.Vector3): THREE.Vector3 {
    const desired = new THREE.Vector3().subVectors(this.position, target)
    if (desired.lengthSq() === 0) {
      return desired
    }

    desired.normalize()
    desired.multiplyScalar(this.maxSpeed)

    const steer = new THREE.Vector3().subVectors(desired, this.velocity)
    steer.clampLength(0, this.maxForce)

    return steer
  }

  update(deltaTime: number): void {
    if (deltaTime <= 0) {
      this.acceleration.set(0, 0, 0)
      return
    }

    this.velocity.addScaledVector(this.acceleration, deltaTime)
    this.velocity.clampLength(0, this.maxSpeed)
    this.position.addScaledVector(this.velocity, deltaTime)
    this.acceleration.multiplyScalar(0)
  }
}

export class BoidsSystem {
  boids: Boid[]
  params: BoidParams
  bounds: THREE.Box3

  private boundsSize = new THREE.Vector3()
  private boundsCenter = new THREE.Vector3()
  private boidTunings: BoidTuning[] = []
  private behaviorTuning: BoidsBehaviorTuning = {
    speed: 0.55,
    turnBias: 0.14,
    avoidWalls: 0.8,
    cruiseBias: 1,
    turnNoise: 0.08,
    boundaryArcRadius: 0.46,
    yawResponsiveness: 1
  }

  constructor(count: number, bounds: THREE.Box3) {
    this.boids = []
    this.bounds = bounds
    this.params = {
      alignment: 0.4,
      cohesion: 0.08,
      separation: 1.5,
      maxSpeed: 3,
      maxForce: 1.8,
      neighborRadius: 3.2,
      boundaryMargin: 1.6,
      boundaryLookAhead: 1.15,
      boundaryWeight: 1.1,
      boundaryInwardStrength: 0.85,
      hardBoundaryMultiplier: 2.5,
      lateralCruiseBias: 0.65,
      verticalWanderScale: 0.42,
      depthWanderScale: 0.34,
      cruiseWeight: 0.48
    }

    this.bounds.getSize(this.boundsSize)
    this.bounds.getCenter(this.boundsCenter)
    this.updateDerivedParams()
    this.boidTunings = Array.from({ length: count }, () => ({}))

    for (let i = 0; i < count; i++) {
      const x = this.boundsCenter.x + (Math.random() - 0.5) * this.boundsSize.x * 0.8
      const y = this.boundsCenter.y + (Math.random() - 0.5) * this.boundsSize.y * 0.8
      const z = this.boundsCenter.z + (Math.random() - 0.5) * this.boundsSize.z * 0.8

      const boid = new Boid(x, y, z)
      boid.maxSpeed = this.params.maxSpeed
      boid.maxForce = this.params.maxForce
      boid.velocity.x = THREE.MathUtils.clamp(boid.velocity.x, -this.params.maxSpeed, this.params.maxSpeed)
      boid.velocity.y = THREE.MathUtils.clamp(boid.velocity.y, -this.params.maxSpeed * 0.45, this.params.maxSpeed * 0.45)
      boid.velocity.z = THREE.MathUtils.clamp(boid.velocity.z, -this.params.maxSpeed * 0.55, this.params.maxSpeed * 0.55)
      this.boids.push(boid)
    }
  }

  private updateDerivedParams(): void {
    this.bounds.getSize(this.boundsSize)
    this.bounds.getCenter(this.boundsCenter)

    const minSpan = Math.max(Math.min(this.boundsSize.x, this.boundsSize.z), 1)
    const aspectXZ = this.boundsSize.x / Math.max(this.boundsSize.z, 1)
    const avoidWalls = THREE.MathUtils.clamp(this.behaviorTuning.avoidWalls, 0.15, 1.4)
    const speedFactor = THREE.MathUtils.clamp(this.behaviorTuning.speed, 0.25, 1.5)
    const turnBias = THREE.MathUtils.clamp(this.behaviorTuning.turnBias, 0.05, 1)
    const cruiseBias = THREE.MathUtils.clamp(this.behaviorTuning.cruiseBias ?? 1, 0.55, 1.2)
    const turnNoise = THREE.MathUtils.clamp(this.behaviorTuning.turnNoise ?? 0.08, 0, 0.45)
    const boundaryArcRadius = THREE.MathUtils.clamp(this.behaviorTuning.boundaryArcRadius ?? 0.46, 0.18, 1.2)
    const yawResponsiveness = THREE.MathUtils.clamp(this.behaviorTuning.yawResponsiveness ?? 1, 0.5, 1.45)

    const baseCruiseSpeed = Math.max(1.8, this.boundsSize.x * 0.24)
    this.params.maxSpeed = baseCruiseSpeed * (0.7 + speedFactor * 0.6)
    this.params.maxForce = Math.max(1, this.params.maxSpeed * (0.4 + turnBias * 0.26 + yawResponsiveness * 0.12))
    this.params.neighborRadius = Math.max(1.8, minSpan * 0.38)
    this.params.boundaryMargin = Math.min(minSpan * (0.12 + avoidWalls * 0.08 + boundaryArcRadius * 0.03), minSpan * 0.34)
    this.params.boundaryLookAhead = 0.5 + avoidWalls * 0.32 + boundaryArcRadius * 0.16 + Math.max(0, aspectXZ - 1) * 0.08
    this.params.boundaryWeight = 0.45 + avoidWalls * 0.85
    this.params.boundaryInwardStrength = 0.3 + avoidWalls * 0.62 + yawResponsiveness * 0.08
    this.params.hardBoundaryMultiplier = 2.5
    this.params.lateralCruiseBias = THREE.MathUtils.clamp(
      (0.54 + Math.max(0, aspectXZ - 1) * 0.12) * cruiseBias,
      0.48,
      0.94
    )
    this.params.verticalWanderScale = THREE.MathUtils.clamp(0.48 - Math.max(0, aspectXZ - 1) * 0.05 + turnNoise * 0.08, 0.28, 0.56)
    this.params.depthWanderScale = THREE.MathUtils.clamp(0.42 - Math.max(0, aspectXZ - 1) * 0.08 + boundaryArcRadius * 0.06, 0.18, 0.56)
    this.params.cruiseWeight = THREE.MathUtils.clamp(0.36 + Math.max(0, aspectXZ - 1) * 0.08 + turnNoise * 0.12, 0.34, 0.68)

    for (const boid of this.boids) {
      boid.maxSpeed = this.params.maxSpeed
      boid.maxForce = this.params.maxForce
    }
  }

  setBehaviorTuning(tuning: Partial<BoidsBehaviorTuning>): void {
    this.behaviorTuning = {
      ...this.behaviorTuning,
      ...tuning
    }

    this.updateDerivedParams()
  }

  setBoidTuning(index: number, tuning: BoidTuning): void {
    if (index < 0) return

    while (this.boidTunings.length <= index) {
      this.boidTunings.push({})
    }

    this.boidTunings[index] = {
      ...this.boidTunings[index],
      ...tuning,
      steeringWeights: {
        ...this.boidTunings[index]?.steeringWeights,
        ...tuning.steeringWeights
      }
    }
  }

  private resolveBoidRuntimeParams(index: number): RuntimeBoidParams {
    const tuning = this.boidTunings[index] ?? {}
    const steeringWeights = tuning.steeringWeights ?? {}
    const cruiseSpeed = THREE.MathUtils.clamp(tuning.cruiseSpeed ?? 1, 0.58, 1.35)
    const yawResponsiveness = THREE.MathUtils.clamp(tuning.yawResponsiveness ?? 1, 0.5, 1.4)
    const cruiseBias = THREE.MathUtils.clamp(tuning.cruiseBias ?? 1, 0.52, 1.18)
    const turnNoise = THREE.MathUtils.clamp(tuning.turnNoise ?? 0.08, 0, 0.4)
    const boundaryArcRadius = THREE.MathUtils.clamp(tuning.boundaryArcRadius ?? 0.46, 0.18, 1.18)
    const fishSafeExtents = tuning.fishSafeExtents ?? DEFAULT_FISH_SAFE_EXTENTS
    const totalLength = fishSafeExtents.noseExtent + fishSafeExtents.tailExtent
    const noseBias = totalLength > 0 ? fishSafeExtents.noseExtent / totalLength : 0.5
    const frontComfortBias = THREE.MathUtils.clamp(1.1 + noseBias * 0.24, 1.1, 1.32)

    return {
      alignment: this.params.alignment * (steeringWeights.alignment ?? 1),
      cohesion: this.params.cohesion * (steeringWeights.cohesion ?? 1),
      separation: this.params.separation * (steeringWeights.separation ?? 1),
      maxSpeed: this.params.maxSpeed * cruiseSpeed,
      maxForce: this.params.maxForce * (0.82 + yawResponsiveness * 0.2 + turnNoise * 0.12),
      neighborRadius: this.params.neighborRadius * (0.92 + boundaryArcRadius * 0.08),
      boundaryMargin: this.params.boundaryMargin * (0.92 + boundaryArcRadius * 0.16),
      boundaryLookAhead: this.params.boundaryLookAhead * (0.84 + boundaryArcRadius * 0.24),
      boundaryWeight: this.params.boundaryWeight * (0.78 + yawResponsiveness * 0.18),
      boundaryInwardStrength: this.params.boundaryInwardStrength * (1.06 - boundaryArcRadius * 0.22),
      hardBoundaryMultiplier: this.params.hardBoundaryMultiplier,
      lateralCruiseBias: THREE.MathUtils.clamp(this.params.lateralCruiseBias * cruiseBias, 0.42, 1.08),
      verticalWanderScale: THREE.MathUtils.clamp(this.params.verticalWanderScale + turnNoise * 0.12, 0.24, 0.64),
      depthWanderScale: THREE.MathUtils.clamp(this.params.depthWanderScale + boundaryArcRadius * 0.08, 0.18, 0.64),
      cruiseWeight: THREE.MathUtils.clamp(this.params.cruiseWeight * (0.84 + cruiseBias * 0.16), 0.24, 0.84),
      boundaryArcRadius,
      fishSafeExtents,
      frontComfortBias,
      turnNoise
    }
  }

  private alignment(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const avgVelocity = new THREE.Vector3()

    if (neighbors.length === 0) return avgVelocity

    for (const neighbor of neighbors) {
      avgVelocity.add(neighbor.velocity)
    }

    avgVelocity.divideScalar(neighbors.length)
    if (avgVelocity.lengthSq() === 0) {
      return avgVelocity
    }

    avgVelocity.normalize()
    avgVelocity.multiplyScalar(boid.maxSpeed)

    const steer = new THREE.Vector3().subVectors(avgVelocity, boid.velocity)
    steer.clampLength(0, boid.maxForce)

    return steer
  }

  private cohesion(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const avgPosition = new THREE.Vector3()

    if (neighbors.length === 0) return avgPosition

    for (const neighbor of neighbors) {
      avgPosition.add(neighbor.position)
    }

    avgPosition.divideScalar(neighbors.length)

    return boid.seek(avgPosition)
  }

  private separation(boid: Boid, neighbors: Boid[], runtime: RuntimeBoidParams): THREE.Vector3 {
    const steer = new THREE.Vector3()

    for (const neighbor of neighbors) {
      const distance = boid.position.distanceTo(neighbor.position)
      if (distance > 0 && distance < runtime.neighborRadius * 0.45) {
        const diff = new THREE.Vector3().subVectors(boid.position, neighbor.position)
        diff.normalize()
        diff.divideScalar(distance)
        steer.add(diff)
      }
    }

    if (neighbors.length > 0) {
      steer.divideScalar(neighbors.length)
    }

    if (steer.lengthSq() > 0) {
      steer.normalize()
      steer.multiplyScalar(boid.maxSpeed)
      steer.sub(boid.velocity)
      steer.clampLength(0, boid.maxForce)
    }

    return steer
  }

  private cruise(boid: Boid, index: number): THREE.Vector3 {
    const runtime = this.resolveBoidRuntimeParams(index)
    const desired = boid.velocity.clone()
    if (desired.lengthSq() === 0) {
      desired.set(1, 0, 0)
    }

    const lateralDirection = Math.sign(desired.x || boid.position.x - this.boundsCenter.x || 1)
    desired.x = lateralDirection * Math.max(Math.abs(desired.x), boid.maxSpeed * runtime.lateralCruiseBias)
    desired.y *= runtime.verticalWanderScale
    desired.z *= runtime.depthWanderScale
    desired.normalize().multiplyScalar(boid.maxSpeed)

    const steer = desired.sub(boid.velocity)
    steer.clampLength(0, boid.maxForce * runtime.cruiseWeight)

    return steer
  }

  private axisPressure(value: number, min: number, max: number, range: number): number {
    if (value < min) {
      return clamp01((min - value) / Math.max(range, 0.001))
    }

    if (value > max) {
      return -clamp01((value - max) / Math.max(range, 0.001))
    }

    return 0
  }

  private resolveHeadingDirection(boid: Boid): THREE.Vector3 {
    const heading = boid.velocity.clone()
    if (heading.lengthSq() > 0) {
      return heading.normalize()
    }

    heading.set(Math.sign(boid.position.x - this.boundsCenter.x || 1), 0, 0)
    return heading.normalize()
  }

  private normalizeInsetRange(min: number, max: number, minInset: number, maxInset: number): [number, number] {
    const insetMin = min + minInset
    const insetMax = max - maxInset
    if (insetMin <= insetMax) {
      return [insetMin, insetMax]
    }

    const midpoint = (min + max) * 0.5
    return [midpoint, midpoint]
  }

  private resolveFishSafeBounds(boid: Boid, runtime: RuntimeBoidParams): THREE.Box3 {
    const safeBounds = createFishSafeBounds(
      this.bounds,
      resolveFishAxisExtents(runtime.fishSafeExtents, this.resolveHeadingDirection(boid))
    )

    const minX = safeBounds.min.x <= safeBounds.max.x ? safeBounds.min.x : this.boundsCenter.x
    const maxX = safeBounds.min.x <= safeBounds.max.x ? safeBounds.max.x : this.boundsCenter.x
    const minY = safeBounds.min.y <= safeBounds.max.y ? safeBounds.min.y : this.boundsCenter.y
    const maxY = safeBounds.min.y <= safeBounds.max.y ? safeBounds.max.y : this.boundsCenter.y
    const minZ = safeBounds.min.z <= safeBounds.max.z ? safeBounds.min.z : this.boundsCenter.z
    const maxZ = safeBounds.min.z <= safeBounds.max.z ? safeBounds.max.z : this.boundsCenter.z

    return new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    )
  }

  private postClamp(boid: Boid, runtime: RuntimeBoidParams): void {
    const safeBounds = this.resolveFishSafeBounds(boid, runtime)
    const originalSpeed = boid.velocity.length()
    const clampEpsilon = 0.0001
    const hitLeft = boid.position.x < safeBounds.min.x
    const hitRight = boid.position.x > safeBounds.max.x
    const hitBottom = boid.position.y < safeBounds.min.y
    const hitTop = boid.position.y > safeBounds.max.y
    const hitBack = boid.position.z < safeBounds.min.z
    const hitFront = boid.position.z > safeBounds.max.z

    if (!(hitLeft || hitRight || hitBottom || hitTop || hitBack || hitFront)) {
      return
    }

    boid.position.clamp(safeBounds.min, safeBounds.max)

    if ((hitLeft || boid.position.x <= safeBounds.min.x + clampEpsilon) && boid.velocity.x < 0) {
      boid.velocity.x = 0
    }
    if ((hitRight || boid.position.x >= safeBounds.max.x - clampEpsilon) && boid.velocity.x > 0) {
      boid.velocity.x = 0
    }
    if ((hitBottom || boid.position.y <= safeBounds.min.y + clampEpsilon) && boid.velocity.y < 0) {
      boid.velocity.y = 0
    }
    if ((hitTop || boid.position.y >= safeBounds.max.y - clampEpsilon) && boid.velocity.y > 0) {
      boid.velocity.y = 0
    }
    if ((hitBack || boid.position.z <= safeBounds.min.z + clampEpsilon) && boid.velocity.z < 0) {
      boid.velocity.z = 0
    }
    if ((hitFront || boid.position.z >= safeBounds.max.z - clampEpsilon) && boid.velocity.z > 0) {
      boid.velocity.z = 0
    }

    if (boid.velocity.lengthSq() > Math.max(0.001, originalSpeed * originalSpeed * 0.04)) {
      return
    }

    const tangentSpeed = Math.max(originalSpeed * 0.42, boid.maxSpeed * 0.18)
    if (hitFront || hitBack) {
      boid.velocity.x += Math.sign(boid.velocity.x || boid.position.x - this.boundsCenter.x || 1) * tangentSpeed
    }
    if (hitLeft || hitRight) {
      boid.velocity.z += Math.sign(boid.velocity.z || boid.position.z - this.boundsCenter.z || 1) * tangentSpeed
    }
    if (hitBottom || hitTop) {
      boid.velocity.x += Math.sign(boid.velocity.x || boid.position.x - this.boundsCenter.x || 1) * tangentSpeed * 0.72
    }
    boid.velocity.clampLength(0, boid.maxSpeed)
  }

  private boundaries(boid: Boid, index: number): THREE.Vector3 {
    const runtime = this.resolveBoidRuntimeParams(index)
    const safeBounds = this.resolveFishSafeBounds(boid, runtime)
    const comfortMargin = runtime.boundaryMargin
    const hardMargin = Math.max(comfortMargin * 0.35, 0.25)
    const predictedPosition = boid.position.clone().addScaledVector(boid.velocity, runtime.boundaryLookAhead)
    const desired = boid.velocity.clone()
    const travelSpeed = Math.max(boid.velocity.length(), boid.maxSpeed * 0.75, 0.001)
    const [xComfortMin, xComfortMax] = this.normalizeInsetRange(
      safeBounds.min.x,
      safeBounds.max.x,
      comfortMargin,
      comfortMargin
    )
    const [yComfortMin, yComfortMax] = this.normalizeInsetRange(
      safeBounds.min.y,
      safeBounds.max.y,
      comfortMargin,
      comfortMargin
    )
    const [zComfortMin, zComfortMax] = this.normalizeInsetRange(
      safeBounds.min.z,
      safeBounds.max.z,
      comfortMargin * 0.92,
      comfortMargin * runtime.frontComfortBias
    )
    const [xHardMin, xHardMax] = this.normalizeInsetRange(
      safeBounds.min.x,
      safeBounds.max.x,
      hardMargin,
      hardMargin
    )
    const [yHardMin, yHardMax] = this.normalizeInsetRange(
      safeBounds.min.y,
      safeBounds.max.y,
      hardMargin,
      hardMargin
    )
    const [zHardMin, zHardMax] = this.normalizeInsetRange(
      safeBounds.min.z,
      safeBounds.max.z,
      hardMargin * 0.92,
      hardMargin * Math.max(1.04, runtime.frontComfortBias - 0.08)
    )
    const lateralDirection = Math.sign(boid.velocity.x || boid.position.x - this.boundsCenter.x || 1)
    const depthDirection = Math.sign(boid.velocity.z || boid.position.z - this.boundsCenter.z || 1)

    const xComfortPressure = this.axisPressure(predictedPosition.x, xComfortMin, xComfortMax, comfortMargin)
    const xHardPressure = this.axisPressure(predictedPosition.x, xHardMin, xHardMax, hardMargin)
    const yComfortPressure = this.axisPressure(predictedPosition.y, yComfortMin, yComfortMax, comfortMargin)
    const yHardPressure = this.axisPressure(predictedPosition.y, yHardMin, yHardMax, hardMargin)
    const zComfortPressure = this.axisPressure(
      predictedPosition.z,
      zComfortMin,
      zComfortMax,
      Math.max(comfortMargin, comfortMargin * runtime.frontComfortBias)
    )
    const zHardPressure = this.axisPressure(
      predictedPosition.z,
      zHardMin,
      zHardMax,
      Math.max(hardMargin, hardMargin * runtime.frontComfortBias)
    )

    const xStrength = Math.abs(xComfortPressure) + Math.abs(xHardPressure) * 1.4
    const yStrength = Math.abs(yComfortPressure) + Math.abs(yHardPressure) * 1.4
    const zStrength = Math.abs(zComfortPressure) + Math.abs(zHardPressure) * 1.4

    if (xStrength > 0) {
      desired.x += travelSpeed *
        Math.sign(xComfortPressure || xHardPressure) *
        xStrength *
        runtime.boundaryInwardStrength *
        (1.04 - runtime.boundaryArcRadius * 0.18)
      desired.z += depthDirection * travelSpeed * xStrength * (0.08 + runtime.boundaryArcRadius * 0.24)
    }

    if (yStrength > 0) {
      desired.y += travelSpeed * Math.sign(yComfortPressure || yHardPressure) * yStrength * runtime.boundaryInwardStrength * 0.75
      desired.x += lateralDirection * travelSpeed * yStrength * 0.08
    }

    if (zStrength > 0) {
      desired.z += travelSpeed * Math.sign(zComfortPressure || zHardPressure) * zStrength * runtime.boundaryInwardStrength * 0.65
      desired.x += lateralDirection * travelSpeed * zStrength * (0.16 + runtime.boundaryArcRadius * 0.22 + runtime.lateralCruiseBias * 0.12)
    }

    if (desired.lengthSq() === 0 || (xStrength === 0 && yStrength === 0 && zStrength === 0)) {
      return new THREE.Vector3()
    }

    desired.normalize().multiplyScalar(boid.maxSpeed)
    const steer = desired.sub(boid.velocity)
    steer.multiplyScalar(runtime.boundaryWeight)
    steer.clampLength(0, boid.maxForce * runtime.hardBoundaryMultiplier)

    return steer
  }

  private getNeighbors(boid: Boid, runtime: RuntimeBoidParams): Boid[] {
    const neighbors: Boid[] = []

    for (const other of this.boids) {
      if (other !== boid) {
        const distance = boid.position.distanceTo(other.position)
        if (distance < runtime.neighborRadius) {
          neighbors.push(other)
        }
      }
    }

    return neighbors
  }

  setSeparation(value: number): void {
    this.params.separation = value
  }

  setAlignment(value: number): void {
    this.params.alignment = value
  }

  setCohesion(value: number): void {
    this.params.cohesion = value
  }

  update(deltaTime: number): void {
    for (let index = 0; index < this.boids.length; index++) {
      const boid = this.boids[index]
      const runtime = this.resolveBoidRuntimeParams(index)
      boid.maxSpeed = runtime.maxSpeed
      boid.maxForce = runtime.maxForce
      const neighbors = this.getNeighbors(boid, runtime)

      const alignmentForce = this.alignment(boid, neighbors).multiplyScalar(runtime.alignment)
      const cohesionForce = this.cohesion(boid, neighbors).multiplyScalar(runtime.cohesion)
      const separationForce = this.separation(boid, neighbors, runtime).multiplyScalar(runtime.separation)
      const boundaryForce = this.boundaries(boid, index)
      const cruiseForce = this.cruise(boid, index)

      boid.applyForce(alignmentForce)
      boid.applyForce(cohesionForce)
      boid.applyForce(separationForce)
      boid.applyForce(boundaryForce)
      boid.applyForce(cruiseForce)

      boid.update(deltaTime)
      this.postClamp(boid, runtime)
    }
  }
}
