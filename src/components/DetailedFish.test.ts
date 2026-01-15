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

describe('DetailedFishSystem variant mapping', () => {
  test('uses mesh variant index when variants are skipped', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      variants: Array<{ name: string; primaryColor: THREE.Color; secondaryColor: THREE.Color; scale: number; speed: number }>
      boids: { boids: Array<{ position: THREE.Vector3; velocity: THREE.Vector3; acceleration: THREE.Vector3 }>; update: () => void }
      wanderTargets: THREE.Vector3[]
      speedMultipliers: Float32Array
      randomOffsets: Float32Array
      swimPhases: Float32Array
      dummy: THREE.Object3D
      tempWanderForce: THREE.Vector3
      tempJitter: THREE.Vector3
      tempNoiseForce: THREE.Vector3
      tempDirection: THREE.Vector3
      tempTurnNoise: THREE.Vector3
      tempSuddenTurn: THREE.Vector3
      tempCuriosityForce: THREE.Vector3
      tempForward: THREE.Vector3
      tempQuaternion: THREE.Quaternion
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1
    )
    mesh.userData.variantIndex = 1

    internals.instancedMeshes = [mesh]
    internals.variants = [
      {
        name: 'Small',
        primaryColor: new THREE.Color('#000000'),
        secondaryColor: new THREE.Color('#000000'),
        scale: 0.1,
        speed: 0.1
      },
      {
        name: 'Large',
        primaryColor: new THREE.Color('#ffffff'),
        secondaryColor: new THREE.Color('#ffffff'),
        scale: 2,
        speed: 2
      }
    ]
    internals.boids = {
      boids: [
        {
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          acceleration: new THREE.Vector3()
        }
      ],
      update: () => {}
    }
    internals.wanderTargets = []
    internals.speedMultipliers = new Float32Array([1])
    internals.randomOffsets = new Float32Array([0])
    internals.swimPhases = new Float32Array([0])
    internals.dummy = new THREE.Object3D()
    internals.tempWanderForce = new THREE.Vector3()
    internals.tempJitter = new THREE.Vector3()
    internals.tempNoiseForce = new THREE.Vector3()
    internals.tempDirection = new THREE.Vector3()
    internals.tempTurnNoise = new THREE.Vector3()
    internals.tempSuddenTurn = new THREE.Vector3()
    internals.tempCuriosityForce = new THREE.Vector3()
    internals.tempForward = new THREE.Vector3(-1, 0, 0)
    internals.tempQuaternion = new THREE.Quaternion()
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)

    update(0, 0)

    const matrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, matrix)
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    matrix.decompose(position, quaternion, scale)

    expect(scale.x).toBeCloseTo(1.96, 2)
  })
})

describe('DetailedFishSystem fish group application', () => {
  test('setFishGroups rebuilds meshes based on group counts', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    const system = new DetailedFishSystem(scene, bounds)

    system.setFishGroups([
      { speciesId: 'neon-tetra', count: 3 },
      { speciesId: 'clownfish', count: 2 }
    ])

    const internals = system as unknown as {
      fishCount: number
      instancedMeshes: Array<{ count: number }>
    }

    const counts = internals.instancedMeshes.map((mesh) => mesh.count).sort((a, b) => a - b)
    expect(internals.fishCount).toBe(5)
    expect(counts).toEqual([2, 3])
  })
})
