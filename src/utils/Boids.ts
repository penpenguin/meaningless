import * as THREE from 'three'

const clamp01 = (value: number): number => THREE.MathUtils.clamp(value, 0, 1)

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

export interface BoidsBehaviorTuning {
  speed: number
  turnBias: number
  avoidWalls: number
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
  private behaviorTuning: BoidsBehaviorTuning = {
    speed: 0.55,
    turnBias: 0.14,
    avoidWalls: 0.8
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

    const baseCruiseSpeed = Math.max(1.8, this.boundsSize.x * 0.24)
    this.params.maxSpeed = baseCruiseSpeed * (0.7 + speedFactor * 0.6)
    this.params.maxForce = Math.max(1, this.params.maxSpeed * (0.42 + turnBias * 0.32))
    this.params.neighborRadius = Math.max(1.8, minSpan * 0.38)
    this.params.boundaryMargin = Math.min(minSpan * (0.14 + avoidWalls * 0.08), minSpan * 0.34)
    this.params.boundaryLookAhead = 0.55 + avoidWalls * 0.35 + Math.max(0, aspectXZ - 1) * 0.08
    this.params.boundaryWeight = 0.45 + avoidWalls * 0.85
    this.params.boundaryInwardStrength = 0.3 + avoidWalls * 0.7
    this.params.hardBoundaryMultiplier = 2.5
    this.params.lateralCruiseBias = THREE.MathUtils.clamp(0.54 + Math.max(0, aspectXZ - 1) * 0.12, 0.54, 0.82)
    this.params.verticalWanderScale = THREE.MathUtils.clamp(0.5 - Math.max(0, aspectXZ - 1) * 0.06, 0.3, 0.5)
    this.params.depthWanderScale = THREE.MathUtils.clamp(0.48 - Math.max(0, aspectXZ - 1) * 0.1, 0.2, 0.48)
    this.params.cruiseWeight = THREE.MathUtils.clamp(0.38 + Math.max(0, aspectXZ - 1) * 0.08, 0.38, 0.62)

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

  private separation(boid: Boid, neighbors: Boid[]): THREE.Vector3 {
    const steer = new THREE.Vector3()

    for (const neighbor of neighbors) {
      const distance = boid.position.distanceTo(neighbor.position)
      if (distance > 0 && distance < this.params.neighborRadius * 0.45) {
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

  private cruise(boid: Boid): THREE.Vector3 {
    const desired = boid.velocity.clone()
    if (desired.lengthSq() === 0) {
      desired.set(1, 0, 0)
    }

    const lateralDirection = Math.sign(desired.x || boid.position.x - this.boundsCenter.x || 1)
    desired.x = lateralDirection * Math.max(Math.abs(desired.x), boid.maxSpeed * this.params.lateralCruiseBias)
    desired.y *= this.params.verticalWanderScale
    desired.z *= this.params.depthWanderScale
    desired.normalize().multiplyScalar(boid.maxSpeed)

    const steer = desired.sub(boid.velocity)
    steer.clampLength(0, boid.maxForce * this.params.cruiseWeight)

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

  private boundaries(boid: Boid): THREE.Vector3 {
    const comfortMargin = this.params.boundaryMargin
    const hardMargin = Math.max(comfortMargin * 0.35, 0.25)
    const predictedPosition = boid.position.clone().addScaledVector(boid.velocity, this.params.boundaryLookAhead)
    const desired = boid.velocity.clone()
    const travelSpeed = Math.max(boid.velocity.length(), boid.maxSpeed * 0.75, 0.001)
    const comfortMin = this.bounds.min.clone().addScalar(comfortMargin)
    const comfortMax = this.bounds.max.clone().subScalar(comfortMargin)
    const hardMin = this.bounds.min.clone().addScalar(hardMargin)
    const hardMax = this.bounds.max.clone().subScalar(hardMargin)
    const lateralDirection = Math.sign(boid.velocity.x || boid.position.x - this.boundsCenter.x || 1)
    const depthDirection = Math.sign(boid.velocity.z || boid.position.z - this.boundsCenter.z || 1)

    const xComfortPressure = this.axisPressure(predictedPosition.x, comfortMin.x, comfortMax.x, comfortMargin)
    const xHardPressure = this.axisPressure(predictedPosition.x, hardMin.x, hardMax.x, hardMargin)
    const yComfortPressure = this.axisPressure(predictedPosition.y, comfortMin.y, comfortMax.y, comfortMargin)
    const yHardPressure = this.axisPressure(predictedPosition.y, hardMin.y, hardMax.y, hardMargin)
    const zComfortPressure = this.axisPressure(predictedPosition.z, comfortMin.z, comfortMax.z, comfortMargin)
    const zHardPressure = this.axisPressure(predictedPosition.z, hardMin.z, hardMax.z, hardMargin)

    const xStrength = Math.abs(xComfortPressure) + Math.abs(xHardPressure) * 1.4
    const yStrength = Math.abs(yComfortPressure) + Math.abs(yHardPressure) * 1.4
    const zStrength = Math.abs(zComfortPressure) + Math.abs(zHardPressure) * 1.4

    if (xStrength > 0) {
      desired.x += travelSpeed * Math.sign(xComfortPressure || xHardPressure) * xStrength * this.params.boundaryInwardStrength
      desired.z += depthDirection * travelSpeed * xStrength * 0.18
    }

    if (yStrength > 0) {
      desired.y += travelSpeed * Math.sign(yComfortPressure || yHardPressure) * yStrength * this.params.boundaryInwardStrength * 0.75
      desired.x += lateralDirection * travelSpeed * yStrength * 0.08
    }

    if (zStrength > 0) {
      desired.z += travelSpeed * Math.sign(zComfortPressure || zHardPressure) * zStrength * this.params.boundaryInwardStrength * 0.65
      desired.x += lateralDirection * travelSpeed * zStrength * (0.28 + this.params.lateralCruiseBias * 0.18)
    }

    if (desired.lengthSq() === 0 || (xStrength === 0 && yStrength === 0 && zStrength === 0)) {
      return new THREE.Vector3()
    }

    desired.normalize().multiplyScalar(boid.maxSpeed)
    const steer = desired.sub(boid.velocity)
    steer.multiplyScalar(this.params.boundaryWeight)
    steer.clampLength(0, boid.maxForce * this.params.hardBoundaryMultiplier)

    return steer
  }

  private getNeighbors(boid: Boid): Boid[] {
    const neighbors: Boid[] = []

    for (const other of this.boids) {
      if (other !== boid) {
        const distance = boid.position.distanceTo(other.position)
        if (distance < this.params.neighborRadius) {
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
    for (const boid of this.boids) {
      const neighbors = this.getNeighbors(boid)

      const alignmentForce = this.alignment(boid, neighbors).multiplyScalar(this.params.alignment)
      const cohesionForce = this.cohesion(boid, neighbors).multiplyScalar(this.params.cohesion)
      const separationForce = this.separation(boid, neighbors).multiplyScalar(this.params.separation)
      const boundaryForce = this.boundaries(boid)
      const cruiseForce = this.cruise(boid)

      boid.applyForce(alignmentForce)
      boid.applyForce(cohesionForce)
      boid.applyForce(separationForce)
      boid.applyForce(boundaryForce)
      boid.applyForce(cruiseForce)

      boid.update(deltaTime)
    }
  }
}
