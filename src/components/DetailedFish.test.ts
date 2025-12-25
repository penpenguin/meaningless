import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import { DetailedFishSystem } from './DetailedFish'

describe('DetailedFishSystem geometry merging', () => {
  test('createDetailedFishGeometry merges mixed index geometries safely', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    type TestVariant = {
      name: string
      primaryColor: THREE.Color
      secondaryColor: THREE.Color
      scale: number
      speed: number
    }

    const variant: TestVariant = {
      name: 'specimen',
      primaryColor: new THREE.Color('#ffffff'),
      secondaryColor: new THREE.Color('#000000'),
      scale: 1,
      speed: 1
    }

    // Bypass constructor side effects; the method does not rely on instance state.
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createDetailedFishGeometry } = DetailedFishSystem.prototype as unknown as {
      createDetailedFishGeometry: (variant: TestVariant) => THREE.BufferGeometry
    }
    const createGeometry = createDetailedFishGeometry.bind(instance)

    const geometry = createGeometry(variant) as THREE.BufferGeometry

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(geometry.index).toBeNull()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('DetailedFishSystem wander target timing', () => {
  test('updates wander targets after 5 seconds when elapsed time is in seconds', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      fishCount: number
      lastWanderUpdate: number
      wanderTargets: THREE.Vector3[]
      boids: { boids: Array<{ position: THREE.Vector3 }> }
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
    }

    internals.fishCount = 10
    internals.lastWanderUpdate = 0
    internals.wanderTargets = Array.from({ length: internals.fishCount }, () => new THREE.Vector3())
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.boids = {
      boids: Array.from({ length: internals.fishCount }, () => ({
        position: new THREE.Vector3()
      }))
    }

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const updateWanderTargets = (DetailedFishSystem.prototype as unknown as {
      updateWanderTargets: (elapsedTime: number) => void
    }).updateWanderTargets.bind(instance)

    updateWanderTargets(4.9)
    expect(internals.lastWanderUpdate).toBe(0)

    const before = internals.wanderTargets[0].clone()
    updateWanderTargets(5.1)
    expect(internals.lastWanderUpdate).toBeCloseTo(5.1)
    expect(internals.wanderTargets[0].distanceTo(before)).toBeGreaterThan(0)

    randomSpy.mockRestore()
  })
})

describe('DetailedFishSystem quality scaling', () => {
  test('setQuality scales instance counts and restores on high', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      instancedMeshes: Array<{ count: number }>
      baseInstanceCounts: number[]
    }

    internals.instancedMeshes = [{ count: 10 }, { count: 5 }]
    internals.baseInstanceCounts = []

    const setQuality = (DetailedFishSystem.prototype as unknown as {
      setQuality: (quality: 'low' | 'medium' | 'high') => void
    }).setQuality.bind(instance)

    setQuality('low')
    expect(internals.instancedMeshes[0].count).toBe(5)
    expect(internals.instancedMeshes[1].count).toBe(2)

    setQuality('high')
    expect(internals.instancedMeshes[0].count).toBe(10)
    expect(internals.instancedMeshes[1].count).toBe(5)
  })
})
