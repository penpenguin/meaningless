import { describe, expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { Boid, BoidsSystem } from './Boids'

type BoundaryParams = {
  maxSpeed: number
  maxForce: number
  neighborRadius: number
  alignment: number
  cohesion: number
  separation: number
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
})
