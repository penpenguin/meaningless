import { describe, expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { Boid, BoidsSystem } from './Boids'
import { createFishSafeBounds, resolveFishAxisExtents } from '../components/sceneBounds'

type BoundaryParams = {
  maxSpeed: number
  maxForce: number
  neighborRadius: number
  alignment: number
  cohesion: number
  separation: number
  lateralCruiseBias?: number
  cruiseWeight?: number
  boundaryMargin?: number
  boundaryLookAhead?: number
  boundaryWeight?: number
  boundaryInwardStrength?: number
  hardBoundaryMultiplier?: number
}

describe('BoidsSystem boundary steering', () => {
  test('boundary steering stays within the maxForce multiple', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-10, -4, -4), new THREE.Vector3(10, 4, 4))
    const system = new BoidsSystem(0, bounds)
    const boid = new Boid(-9.7, 0, 0)
    boid.velocity.set(-0.5, 0, 0)
    boid.maxSpeed = 2
    boid.maxForce = 0.6

    const internals = system as unknown as {
      params: BoundaryParams
    }

    internals.params.boundaryMargin = 2.4
    internals.params.boundaryLookAhead = 1.6
    internals.params.boundaryWeight = 1.8
    internals.params.boundaryInwardStrength = 0.9
    internals.params.hardBoundaryMultiplier = 2.5

    const boundaryForce = (
      BoidsSystem.prototype as unknown as {
        boundaries: (boid: Boid) => THREE.Vector3
      }
    ).boundaries.call(system, boid)

    expect(boundaryForce.length()).toBeLessThanOrEqual(boid.maxForce * internals.params.hardBoundaryMultiplier!)
  })

  test('higher avoidWalls starts turning before the wall sooner', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-20, -4, -5), new THREE.Vector3(20, 4, 5))
    const cautious = new BoidsSystem(0, bounds)
    const daring = new BoidsSystem(0, bounds)

    const cautiousBoid = new Boid(13.4, 0, 0)
    cautiousBoid.velocity.set(1.8, 0, 0)
    cautiousBoid.maxSpeed = 2
    cautiousBoid.maxForce = 0.4
    cautious.boids.push(cautiousBoid)

    const daringBoid = new Boid(13.4, 0, 0)
    daringBoid.velocity.set(1.8, 0, 0)
    daringBoid.maxSpeed = 2
    daringBoid.maxForce = 0.4
    daring.boids.push(daringBoid)

    const cautiousParams = cautious as unknown as { params: BoundaryParams }
    cautiousParams.params.alignment = 0
    cautiousParams.params.cohesion = 0
    cautiousParams.params.separation = 0
    cautiousParams.params.boundaryMargin = 3.8
    cautiousParams.params.boundaryLookAhead = 3.4
    cautiousParams.params.boundaryWeight = 1.8
    cautiousParams.params.boundaryInwardStrength = 0.9
    cautiousParams.params.hardBoundaryMultiplier = 2.5

    const daringParams = daring as unknown as { params: BoundaryParams }
    daringParams.params.alignment = 0
    daringParams.params.cohesion = 0
    daringParams.params.separation = 0
    daringParams.params.boundaryMargin = 1.2
    daringParams.params.boundaryLookAhead = 1.0
    daringParams.params.boundaryWeight = 0.6
    daringParams.params.boundaryInwardStrength = 0.3
    daringParams.params.hardBoundaryMultiplier = 2.5

    for (let i = 0; i < 12; i++) {
      cautious.update(1 / 60)
      daring.update(1 / 60)
    }

    expect(cautiousBoid.velocity.x).toBeLessThan(daringBoid.velocity.x)
    expect(cautiousBoid.position.x).toBeLessThan(daringBoid.position.x)
  })

  test('larger fish-safe extents start steering away from the front glass sooner', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-8, -4, -5), new THREE.Vector3(8, 4, 5))
    const system = new BoidsSystem(2, bounds)

    system.boids[0].position.set(0.5, 0.1, 2.7)
    system.boids[0].velocity.set(0.2, 0, 1.1)
    system.boids[0].maxSpeed = 2
    system.boids[0].maxForce = 0.5

    system.boids[1].position.copy(system.boids[0].position)
    system.boids[1].velocity.copy(system.boids[0].velocity)
    system.boids[1].maxSpeed = 2
    system.boids[1].maxForce = 0.5

    const internals = system as unknown as {
      params: BoundaryParams
      setBoidTuning?: (
        index: number,
        tuning: {
          fishSafeExtents?: {
            noseExtent: number
            tailExtent: number
            halfBodyWidth: number
            halfBodyHeight: number
          }
        }
      ) => void
    }

    internals.params.alignment = 0
    internals.params.cohesion = 0
    internals.params.separation = 0
    internals.params.boundaryMargin = 0.6
    internals.params.boundaryLookAhead = 1.1
    internals.params.boundaryWeight = 1.1
    internals.params.boundaryInwardStrength = 0.8
    internals.params.hardBoundaryMultiplier = 2.5

    internals.setBoidTuning?.(0, {
      fishSafeExtents: {
        noseExtent: 0.35,
        tailExtent: 0.28,
        halfBodyWidth: 0.14,
        halfBodyHeight: 0.12
      }
    })
    internals.setBoidTuning?.(1, {
      fishSafeExtents: {
        noseExtent: 1.1,
        tailExtent: 0.7,
        halfBodyWidth: 0.36,
        halfBodyHeight: 0.26
      }
    })

    const smallForce = (
      BoidsSystem.prototype as unknown as {
        boundaries: (boid: Boid, index: number) => THREE.Vector3
      }
    ).boundaries.call(system, system.boids[0], 0)
    const largeForce = (
      BoidsSystem.prototype as unknown as {
        boundaries: (boid: Boid, index: number) => THREE.Vector3
      }
    ).boundaries.call(system, system.boids[1], 1)

    expect(largeForce.z).toBeLessThan(smallForce.z)
  })

  test('similar simulated seconds stay close between 30fps and 120fps', () => {
    const randomValues = [
      0.11, 0.73, 0.29, 0.64, 0.41, 0.18, 0.87, 0.52, 0.36, 0.95,
      0.22, 0.68, 0.14, 0.79, 0.47, 0.31, 0.58, 0.09, 0.84, 0.26
    ]
    let randomIndex = 0
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = randomValues[randomIndex % randomValues.length]
      randomIndex += 1
      return value
    })

    const bounds = new THREE.Box3(new THREE.Vector3(-24, -6, -8), new THREE.Vector3(24, 6, 8))
    const lowFps = new BoidsSystem(1, bounds)

    randomIndex = 0
    const highFps = new BoidsSystem(1, bounds)

    const systems = [lowFps, highFps]
    for (const system of systems) {
      const params = system as unknown as { params: BoundaryParams }
      params.params.alignment = 0
      params.params.cohesion = 0
      params.params.separation = 0
      params.params.boundaryMargin = 4.2
      params.params.boundaryLookAhead = 3.5
      params.params.boundaryWeight = 1.4
      params.params.boundaryInwardStrength = 0.8
      params.params.hardBoundaryMultiplier = 2.5
      system.boids[0].position.set(6, 1, 1.2)
      system.boids[0].velocity.set(1.1, 0.08, 0.12)
      system.boids[0].maxSpeed = 2
      system.boids[0].maxForce = 0.45
    }

    for (let i = 0; i < 120; i++) {
      lowFps.update(1 / 30)
    }

    for (let i = 0; i < 480; i++) {
      highFps.update(1 / 120)
    }

    expect(lowFps.boids[0].position.distanceTo(highFps.boids[0].position)).toBeLessThan(2.5)
    expect(lowFps.boids[0].velocity.angleTo(highFps.boids[0].velocity)).toBeLessThan(0.35)

    randomSpy.mockRestore()
  })

  test('post-clamp keeps fish-safe front and back bounds without a hard bounce', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -3, -5), new THREE.Vector3(5, 3, 5))
    const system = new BoidsSystem(0, bounds)
    const frontBoid = new Boid(0.2, 0, 4.65)
    const backBoid = new Boid(-0.4, 0, -4.65)
    frontBoid.velocity.set(0.7, 0, 2.4)
    backBoid.velocity.set(-0.6, 0, -2.2)
    frontBoid.maxSpeed = 3
    frontBoid.maxForce = 0.45
    backBoid.maxSpeed = 3
    backBoid.maxForce = 0.45
    system.boids.push(frontBoid, backBoid)

    const internals = system as unknown as {
      params: BoundaryParams
      setBoidTuning?: (
        index: number,
        tuning: {
          fishSafeExtents?: {
            noseExtent: number
            tailExtent: number
            halfBodyWidth: number
            halfBodyHeight: number
          }
        }
      ) => void
    }

    internals.params.alignment = 0
    internals.params.cohesion = 0
    internals.params.separation = 0
    internals.params.boundaryWeight = 0.25
    internals.params.boundaryMargin = 1
    internals.params.boundaryLookAhead = 0.8
    internals.params.cruiseWeight = 0
    internals.setBoidTuning?.(0, {
      fishSafeExtents: {
        noseExtent: 0.9,
        tailExtent: 0.6,
        halfBodyWidth: 0.18,
        halfBodyHeight: 0.16
      }
    })
    internals.setBoidTuning?.(1, {
      fishSafeExtents: {
        noseExtent: 0.9,
        tailExtent: 0.6,
        halfBodyWidth: 0.18,
        halfBodyHeight: 0.16
      }
    })

    system.update(0.4)

    const extents = {
      noseExtent: 0.9,
      tailExtent: 0.6,
      halfBodyWidth: 0.18,
      halfBodyHeight: 0.16
    }
    const frontSafeBounds = createFishSafeBounds(
      bounds,
      resolveFishAxisExtents(extents, frontBoid.velocity.clone().setLength(frontBoid.velocity.length() || 1))
    )
    const backSafeBounds = createFishSafeBounds(
      bounds,
      resolveFishAxisExtents(extents, backBoid.velocity.clone().setLength(backBoid.velocity.length() || 1))
    )

    expect(frontBoid.position.z).toBeLessThanOrEqual(frontSafeBounds.max.z + 0.0001)
    expect(backBoid.position.z).toBeGreaterThanOrEqual(backSafeBounds.min.z - 0.0001)
    expect(frontBoid.velocity.x).toBeGreaterThan(0.2)
    expect(backBoid.velocity.x).toBeLessThan(-0.2)
    expect(frontBoid.velocity.z).toBeLessThanOrEqual(0.001)
    expect(backBoid.velocity.z).toBeGreaterThanOrEqual(-0.001)
  })

  test('fish-safe front bounds hold at both 30fps and 120fps', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-24, -6, -8), new THREE.Vector3(24, 6, 8))
    const lowFps = new BoidsSystem(1, bounds)
    const highFps = new BoidsSystem(1, bounds)
    const systems = [lowFps, highFps]

    for (const system of systems) {
      const internals = system as unknown as {
        params: BoundaryParams
        setBoidTuning?: (
          index: number,
          tuning: {
            fishSafeExtents?: {
              noseExtent: number
              tailExtent: number
              halfBodyWidth: number
              halfBodyHeight: number
            }
          }
        ) => void
      }

      internals.params.alignment = 0
      internals.params.cohesion = 0
      internals.params.separation = 0
      internals.params.boundaryMargin = 3.8
      internals.params.boundaryLookAhead = 2.4
      internals.params.boundaryWeight = 1.1
      internals.params.boundaryInwardStrength = 0.8
      system.boids[0].position.set(1.2, 0.4, 5.8)
      system.boids[0].velocity.set(0.35, 0.02, 1.6)
      system.boids[0].maxSpeed = 2.2
      system.boids[0].maxForce = 0.45
      internals.setBoidTuning?.(0, {
        fishSafeExtents: {
          noseExtent: 1.1,
          tailExtent: 0.72,
          halfBodyWidth: 0.24,
          halfBodyHeight: 0.2
        }
      })
    }

    for (let i = 0; i < 60; i++) {
      lowFps.update(1 / 30)
    }

    for (let i = 0; i < 240; i++) {
      highFps.update(1 / 120)
    }

    const extents = {
      noseExtent: 1.1,
      tailExtent: 0.72,
      halfBodyWidth: 0.24,
      halfBodyHeight: 0.2
    }
    const lowSafeBounds = createFishSafeBounds(
      bounds,
      resolveFishAxisExtents(extents, lowFps.boids[0].velocity.clone().setLength(lowFps.boids[0].velocity.length() || 1))
    )
    const highSafeBounds = createFishSafeBounds(
      bounds,
      resolveFishAxisExtents(extents, highFps.boids[0].velocity.clone().setLength(highFps.boids[0].velocity.length() || 1))
    )

    expect(lowFps.boids[0].position.z).toBeLessThanOrEqual(lowSafeBounds.max.z + 0.0001)
    expect(highFps.boids[0].position.z).toBeLessThanOrEqual(highSafeBounds.max.z + 0.0001)
  })

  test('per-boid tuning supports faster slender cruisers and wider disk boundary arcs', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-12, -4, -4), new THREE.Vector3(12, 4, 4))
    const system = new BoidsSystem(2, bounds)

    const setBoidTuning = (system as unknown as {
      setBoidTuning?: (
        index: number,
        tuning: {
          cruiseSpeed?: number
          cruiseBias?: number
          boundaryArcRadius?: number
          turnNoise?: number
        }
      ) => void
    }).setBoidTuning?.bind(system)
    const resolveBoidRuntimeParams = (BoidsSystem.prototype as unknown as {
      resolveBoidRuntimeParams: (index: number) => {
        maxSpeed: number
        lateralCruiseBias: number
        boundaryArcRadius: number
      }
    }).resolveBoidRuntimeParams.bind(system)

    setBoidTuning?.(0, {
      cruiseSpeed: 1.22,
      cruiseBias: 0.9,
      boundaryArcRadius: 0.28,
      turnNoise: 0.18
    })
    setBoidTuning?.(1, {
      cruiseSpeed: 0.76,
      cruiseBias: 0.58,
      boundaryArcRadius: 0.94,
      turnNoise: 0.06
    })

    const slender = resolveBoidRuntimeParams(0)
    const disk = resolveBoidRuntimeParams(1)

    expect(slender.maxSpeed).toBeGreaterThan(disk.maxSpeed)
    expect(slender.lateralCruiseBias).toBeGreaterThan(disk.lateralCruiseBias)
    expect(disk.boundaryArcRadius).toBeGreaterThan(slender.boundaryArcRadius)
  })

  test('larger boundaryArcRadius bends boundary steering into a wider return arc', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-10, -4, -4), new THREE.Vector3(10, 4, 4))
    const system = new BoidsSystem(2, bounds)
    system.boids[0].position.set(8.6, 0, 0)
    system.boids[0].velocity.set(1.6, 0, 0.02)
    system.boids[0].maxSpeed = 2
    system.boids[0].maxForce = 0.5
    system.boids[1].position.copy(system.boids[0].position)
    system.boids[1].velocity.copy(system.boids[0].velocity)
    system.boids[1].maxSpeed = 2
    system.boids[1].maxForce = 0.5

    const setBoidTuning = (system as unknown as {
      setBoidTuning?: (
        index: number,
        tuning: {
          boundaryArcRadius?: number
        }
      ) => void
    }).setBoidTuning?.bind(system)
    setBoidTuning?.(0, { boundaryArcRadius: 0.22 })
    setBoidTuning?.(1, { boundaryArcRadius: 0.98 })

    const narrowForce = (
      BoidsSystem.prototype as unknown as {
        boundaries: (boid: Boid, index: number) => THREE.Vector3
      }
    ).boundaries.call(system, system.boids[0], 0)
    const wideForce = (
      BoidsSystem.prototype as unknown as {
        boundaries: (boid: Boid, index: number) => THREE.Vector3
      }
    ).boundaries.call(system, system.boids[1], 1)

    expect(Math.abs(wideForce.z)).toBeGreaterThan(Math.abs(narrowForce.z))
    expect(wideForce.x).toBeLessThan(0)
    expect(narrowForce.x).toBeLessThan(0)
  })
})
