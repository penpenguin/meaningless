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

describe('DetailedFishSystem silhouette archetypes', () => {
  test('builds clearly different proportions for tall and slender fish variants', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createFishVariants, createDetailedFishGeometry } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }>
      createDetailedFishGeometry: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.BufferGeometry
    }

    const variants = createFishVariants.bind(instance)()
    const tropical = variants.find((variant) => variant.name === 'Tropical')
    const angelfish = variants.find((variant) => variant.name === 'Angelfish')
    const neon = variants.find((variant) => variant.name === 'Neon')

    expect(tropical).toBeDefined()
    expect(angelfish).toBeDefined()
    expect(neon).toBeDefined()

    const measureAspect = (geometry: THREE.BufferGeometry): number => {
      geometry.computeBoundingBox()
      const size = new THREE.Vector3()
      geometry.boundingBox?.getSize(size)
      return size.y / size.x
    }

    const tropicalAspect = measureAspect(createDetailedFishGeometry.bind(instance)(tropical!))
    const angelfishAspect = measureAspect(createDetailedFishGeometry.bind(instance)(angelfish!))
    const neonAspect = measureAspect(createDetailedFishGeometry.bind(instance)(neon!))

    expect(angelfishAspect).toBeGreaterThan(tropicalAspect * 1.25)
    expect(neonAspect).toBeLessThan(tropicalAspect * 0.85)
  })
})

describe('DetailedFishSystem premium materials', () => {
  test('uses external fish pattern textures when visual assets are available', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const tropicalTexture = new THREE.Texture()
    const fishScaleNormal = new THREE.Texture()
    const fishScaleRoughness = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical': tropicalTexture,
        'fish-scale-normal': fishScaleNormal,
        'fish-scale-roughness': fishScaleRoughness
      }
    }

    const { createFishVariants, createFishMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }>
      createFishMaterial: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.MeshPhysicalMaterial
    }

    const tropical = createFishVariants.bind(instance)().find((variant) => variant.name === 'Tropical')
    if (!tropical) throw new Error('Tropical variant missing')

    const material = createFishMaterial.bind(instance)(tropical)

    expect(material.map).toBe(tropicalTexture)
    expect(material.normalMap).toBe(fishScaleNormal)
    expect(material.roughnessMap).toBe(fishScaleRoughness)
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
  test('setQuality scales instance counts and restores on standard', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      instancedMeshes: Array<{ count: number }>
      baseInstanceCounts: number[]
    }

    internals.instancedMeshes = [{ count: 10 }, { count: 5 }]
    internals.baseInstanceCounts = []

    const setQuality = (DetailedFishSystem.prototype as unknown as {
      setQuality: (quality: 'simple' | 'standard') => void
    }).setQuality.bind(instance)

    setQuality('simple')
    expect(internals.instancedMeshes[0].count).toBe(5)
    expect(internals.instancedMeshes[1].count).toBe(2)

    setQuality('standard')
    expect(internals.instancedMeshes[0].count).toBe(10)
    expect(internals.instancedMeshes[1].count).toBe(5)
  })

  test('setQuality keeps zero-count meshes at zero', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      instancedMeshes: Array<{ count: number }>
      baseInstanceCounts: number[]
    }

    internals.instancedMeshes = [{ count: 0 }, { count: 4 }]
    internals.baseInstanceCounts = []

    const setQuality = (DetailedFishSystem.prototype as unknown as {
      setQuality: (quality: 'simple' | 'standard') => void
    }).setQuality.bind(instance)

    setQuality('simple')
    expect(internals.instancedMeshes[0].count).toBe(0)
    expect(internals.instancedMeshes[1].count).toBe(2)
  })

  test('shows dedicated hero fish only on standard quality', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    const system = new DetailedFishSystem(scene, bounds)

    system.setFishGroups([
      { speciesId: 'neon-tetra', count: 8 }
    ])

    const internals = system as unknown as {
      heroFishMeshes: THREE.Mesh[]
    }

    expect(internals.heroFishMeshes.length).toBeGreaterThan(0)
    expect(internals.heroFishMeshes.every((mesh) => mesh.userData.role === 'hero-fish')).toBe(true)
    expect(internals.heroFishMeshes.every((mesh) => mesh.visible)).toBe(true)

    system.setQuality('simple')
    expect(internals.heroFishMeshes.every((mesh) => mesh.visible === false)).toBe(true)

    system.setQuality('standard')
    expect(internals.heroFishMeshes.every((mesh) => mesh.visible)).toBe(true)
  })
})

describe('DetailedFishSystem photo mode focus', () => {
  test('returns the first visible hero fish as the focus point', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const hiddenHero = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    hiddenHero.visible = false
    hiddenHero.position.set(-2, 1, 3)

    const visibleHero = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    visibleHero.visible = true
    visibleHero.position.set(1.5, -0.25, 2.2)

    ;(instance as unknown as {
      heroFishMeshes: THREE.Mesh[]
    }).heroFishMeshes = [hiddenHero, visibleHero]

    const getHeroFocusPoint = (DetailedFishSystem.prototype as unknown as {
      getHeroFocusPoint: () => THREE.Vector3 | null
    }).getHeroFocusPoint.bind(instance)

    expect(getHeroFocusPoint()).toEqual(new THREE.Vector3(1.5, -0.25, 2.2))
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

  test('resolveVariantIndex follows species archetype mapping', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      variants: Array<{ name: string }>
    }

    internals.variants = [
      { name: 'Tropical' },
      { name: 'Angelfish' },
      { name: 'Neon' },
      { name: 'Goldfish' }
    ]

    const resolveVariantIndex = (DetailedFishSystem.prototype as unknown as {
      resolveVariantIndex: (speciesId: string) => number
    }).resolveVariantIndex.bind(instance)

    expect(resolveVariantIndex('clownfish')).toBe(0)
    expect(resolveVariantIndex('angelfish')).toBe(1)
    expect(resolveVariantIndex('cardinal-tetra')).toBe(2)
    expect(resolveVariantIndex('goldfish')).toBe(3)
  })
})

describe('DetailedFishSystem mesh disposal', () => {
  test('clearMeshes disposes texture maps', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      group: THREE.Group
    }

    internals.group = new THREE.Group()
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const texture = new THREE.Texture()
    const disposeSpy = vi.spyOn(texture, 'dispose')
    const material = new THREE.MeshBasicMaterial({ map: texture })
    const mesh = new THREE.InstancedMesh(geometry, material, 1)

    internals.group.add(mesh)
    internals.instancedMeshes = [mesh]

    const clearMeshes = (DetailedFishSystem.prototype as unknown as {
      clearMeshes: () => void
    }).clearMeshes.bind(instance)

    clearMeshes()

    expect(disposeSpy).toHaveBeenCalledTimes(1)
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

  test('setFishGroups preserves quality scaling', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    const system = new DetailedFishSystem(scene, bounds)

    system.setQuality('simple')
    system.setFishGroups([
      { speciesId: 'neon-tetra', count: 4 },
      { speciesId: 'clownfish', count: 2 }
    ])

    const internals = system as unknown as {
      instancedMeshes: Array<{ count: number }>
    }

    const counts = internals.instancedMeshes.map((mesh) => mesh.count).sort((a, b) => a - b)
    expect(counts).toEqual([1, 2])
  })

  test('setFishGroups weights tuning by school size instead of the first school only', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    const system = new DetailedFishSystem(scene, bounds)

    system.setFishGroups([
      {
        speciesId: 'neon-tetra',
        count: 1,
        tuning: {
          speed: 0.4,
          cohesion: 0.4,
          separation: 0.5,
          alignment: 0.45,
          avoidWalls: 0.75,
          preferredDepth: 0.18,
          schoolMood: 'calm',
          depthVariance: 0.16,
          turnBias: 0.12
        }
      },
      {
        speciesId: 'goldfish',
        count: 9,
        tuning: {
          speed: 0.9,
          cohesion: 0.7,
          separation: 0.8,
          alignment: 0.65,
          avoidWalls: 0.92,
          preferredDepth: 0.78,
          schoolMood: 'alert',
          depthVariance: 0.08,
          turnBias: 0.3
        }
      }
    ])

    const internals = system as unknown as {
      boids: {
        params: {
          maxSpeed: number
          cohesion: number
          separation: number
          alignment: number
        }
      }
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
      }
    }

    expect(internals.boids.params.maxSpeed).toBeCloseTo(0.85, 2)
    expect(internals.behaviorProfile.preferredDepth).toBeGreaterThan(0.7)
    expect(internals.behaviorProfile.turnBias).toBeGreaterThan(0.25)
  })

  test('update biases fish upward or downward based on the active depth profile', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const boid = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0.02, 0, 0),
      acceleration: new THREE.Vector3(),
      maxSpeed: 1,
      maxForce: 1
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1
    )

    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      variants: Array<{ name: string; scale: number; speed: number }>
      boids: { boids: typeof boid[]; update: () => void }
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
      tempDepthForce: THREE.Vector3
      bounds: THREE.Box3
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
        schoolMood: 'feeding' | 'alert'
        avoidWalls: number
      }
    }

    internals.instancedMeshes = [mesh]
    internals.variants = [{ name: 'Neon', scale: 0.35, speed: 1.2 }]
    internals.boids = { boids: [boid], update: () => {} }
    internals.wanderTargets = [new THREE.Vector3(0, 0, 0)]
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
    internals.tempDepthForce = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    internals.behaviorProfile = {
      preferredDepth: 0.12,
      depthVariance: 0.24,
      turnBias: 0.2,
      schoolMood: 'feeding',
      avoidWalls: 0.78
    }
    update(0.016, 0)
    const feedingY = boid.acceleration.y

    boid.acceleration.set(0, 0, 0)
    internals.behaviorProfile = {
      preferredDepth: 0.78,
      depthVariance: 0.08,
      turnBias: 0.3,
      schoolMood: 'alert',
      avoidWalls: 0.92
    }
    update(0.016, 0)
    const alertY = boid.acceleration.y

    expect(feedingY).toBeGreaterThan(0)
    expect(alertY).toBeLessThan(0)

    randomSpy.mockRestore()
  })
})
