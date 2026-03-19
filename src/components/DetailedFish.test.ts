import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import { DetailedFishSystem } from './DetailedFish'

const createHeroSingleMeshScene = (): THREE.Group => {
  const scene = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: new THREE.Texture() })
  )
  body.name = 'HeroBody'
  scene.add(body)
  return scene
}

const createHeroMultiMeshScene = (): THREE.Group => {
  const scene = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.9, 4, 8),
    new THREE.MeshStandardMaterial({ color: '#ffffff', map: new THREE.Texture() })
  )
  body.name = 'BodyCore'
  scene.add(body)
  const tail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.4),
    new THREE.MeshStandardMaterial({ color: '#ffccdd', transparent: true })
  )
  tail.name = 'TailFin'
  tail.position.x = -0.72
  scene.add(tail)
  return scene
}

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

describe('DetailedFishSystem locomotion profiles', () => {
  test('createFishVariants maps archetypes to locomotion profiles and per-asset orientation corrections', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createFishVariants } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        locomotionProfileId?: string
        proceduralForwardAxis?: [number, number, number]
        schoolForwardAxis?: [number, number, number]
        heroForwardAxis?: [number, number, number]
        proceduralCorrectionQuaternion?: [number, number, number, number]
        schoolCorrectionQuaternion?: [number, number, number, number]
        heroCorrectionQuaternion?: [number, number, number, number]
      }>
    }

    const variants = createFishVariants.bind(instance)()
    const tropical = variants.find((variant) => variant.name === 'Tropical')
    const angelfish = variants.find((variant) => variant.name === 'Angelfish')
    const neon = variants.find((variant) => variant.name === 'Neon')
    const goldfish = variants.find((variant) => variant.name === 'Goldfish')

    expect(tropical?.locomotionProfileId).toBe('calm-cruiser')
    expect(angelfish?.locomotionProfileId).toBe('disk-glider')
    expect(neon?.locomotionProfileId).toBe('slender-darter')
    expect(goldfish?.locomotionProfileId).toBe('goldfish-wobble')

    expect(tropical?.proceduralForwardAxis).toEqual([1, 0, 0])
    expect(tropical?.schoolForwardAxis).toEqual([1, 0, 0])
    expect(tropical?.heroForwardAxis).toEqual([1, 0, 0])
    expect(tropical?.proceduralCorrectionQuaternion).toBeUndefined()
    expect(tropical?.schoolCorrectionQuaternion).toBeUndefined()
    expect(tropical?.heroCorrectionQuaternion).toBeUndefined()
  })

  test('resolveHeadingQuaternion aligns corrected per-asset forward axes with velocity', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { resolveHeadingQuaternion } = DetailedFishSystem.prototype as unknown as {
      resolveHeadingQuaternion: (
        variant: {
          proceduralForwardAxis?: [number, number, number]
          schoolForwardAxis?: [number, number, number]
          heroForwardAxis?: [number, number, number]
          proceduralCorrectionQuaternion?: [number, number, number, number]
          schoolCorrectionQuaternion?: [number, number, number, number]
          heroCorrectionQuaternion?: [number, number, number, number]
        },
        renderPath: 'procedural' | 'school' | 'hero',
        direction: THREE.Vector3
      ) => THREE.Quaternion
    }

    const variant = {
      proceduralForwardAxis: [0, 0, 1] as [number, number, number],
      schoolForwardAxis: [0, 0, 1] as [number, number, number],
      heroForwardAxis: [1, 0, 0] as [number, number, number],
      proceduralCorrectionQuaternion: [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)] as [number, number, number, number],
      schoolCorrectionQuaternion: [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)] as [number, number, number, number]
    }

    const proceduralQuaternion = resolveHeadingQuaternion.bind(instance)(
      variant,
      'procedural',
      new THREE.Vector3(1, 0, 0)
    ).clone()
    const schoolQuaternion = resolveHeadingQuaternion.bind(instance)(
      variant,
      'school',
      new THREE.Vector3(1, 0, 0)
    ).clone()
    const heroQuaternion = resolveHeadingQuaternion.bind(instance)(
      variant,
      'hero',
      new THREE.Vector3(0, 0, -1)
    ).clone()

    const proceduralForward = new THREE.Vector3(...variant.proceduralForwardAxis)
      .applyQuaternion(new THREE.Quaternion(...variant.proceduralCorrectionQuaternion))
      .applyQuaternion(proceduralQuaternion)
      .normalize()
    const schoolForward = new THREE.Vector3(...variant.schoolForwardAxis)
      .applyQuaternion(new THREE.Quaternion(...variant.schoolCorrectionQuaternion))
      .applyQuaternion(schoolQuaternion)
      .normalize()
    const heroForward = new THREE.Vector3(...variant.heroForwardAxis)
      .applyQuaternion(heroQuaternion)
      .normalize()

    expect(proceduralForward.angleTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(1e-5)
    expect(schoolForward.angleTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(1e-5)
    expect(heroForward.angleTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(1e-5)
  })

  test('resolveFishSafeExtents keeps procedural extents at world-scaled geometry size', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createFishVariants, createDetailedFishGeometry, resolveFishSafeExtents } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        silhouette?: {
          bodyLength?: number
          bodyHeight?: number
          bodyThickness?: number
          noseLength?: number
          tailLength?: number
          tailHeight?: number
          dorsalHeight?: number
          ventralHeight?: number
          pectoralLength?: number
          topFullness?: number
          bellyFullness?: number
        }
      }>
      createDetailedFishGeometry: (variant: {
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
      }) => THREE.BufferGeometry
      resolveFishSafeExtents: (variant: {
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
      }, renderPath: 'procedural' | 'school' | 'hero', scaleMultiplier?: number) => {
        noseExtent: number
        tailExtent: number
        halfBodyWidth: number
        halfBodyHeight: number
      }
    }

    const neon = createFishVariants.bind(instance)().find((variant) => variant.name === 'Neon')
    expect(neon).toBeDefined()

    const geometry = createDetailedFishGeometry.bind(instance)(neon!)
    const geometryBounds = new THREE.Box3().setFromObject(new THREE.Mesh(geometry))
    const extents = resolveFishSafeExtents.bind(instance)(neon!, 'procedural')

    expect(extents.noseExtent).toBeGreaterThanOrEqual((geometryBounds.max.x * neon!.scale) - 0.0001)
    expect(extents.tailExtent).toBeGreaterThanOrEqual((Math.abs(geometryBounds.min.x) * neon!.scale) - 0.0001)
    expect(extents.halfBodyWidth).toBeGreaterThanOrEqual((Math.max(Math.abs(geometryBounds.min.z), geometryBounds.max.z) * neon!.scale) - 0.0001)
  })

  test('resolveBoundsExtentsFromModel projects corrected forward axes across the full bounds volume', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { resolveBoundsExtentsFromModel } = DetailedFishSystem.prototype as unknown as {
      resolveBoundsExtentsFromModel: (
        bounds: THREE.Box3,
        variant: {
          scale: number
          speed: number
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          schoolForwardAxis?: [number, number, number]
          schoolCorrectionQuaternion?: [number, number, number, number]
        },
        renderPath: 'procedural' | 'school' | 'hero',
        scaleMultiplier: number
      ) => {
        noseExtent: number
        tailExtent: number
        halfBodyWidth: number
        halfBodyHeight: number
      }
    }

    const variant = {
      scale: 0.6,
      speed: 1,
      primaryColor: new THREE.Color(0xffffff),
      secondaryColor: new THREE.Color(0xffffff),
      schoolForwardAxis: [0, 0, 1] as [number, number, number],
      schoolCorrectionQuaternion: [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)] as [number, number, number, number]
    }
    const bounds = new THREE.Box3(
      new THREE.Vector3(-0.15, -0.2, -1.4),
      new THREE.Vector3(0.35, 0.25, 1.6)
    )

    const extents = resolveBoundsExtentsFromModel.bind(instance)(bounds, variant, 'school', 1)
    const forward = new THREE.Vector3(...variant.schoolForwardAxis)
      .applyQuaternion(new THREE.Quaternion(...variant.schoolCorrectionQuaternion))
      .normalize()

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
    const rawProjectedNoseExtent = Math.max(...corners.map((corner) => corner.dot(forward))) * variant.scale
    const rawProjectedTailExtent = Math.max(...corners.map((corner) => -corner.dot(forward))) * variant.scale

    expect(extents.noseExtent).toBeGreaterThan(rawProjectedNoseExtent)
    expect(extents.tailExtent).toBeGreaterThan(rawProjectedTailExtent)
  })

  test('locomotion profiles keep distinct yaw responsiveness, tail beat, and cruise speed by variant', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createFishVariants, getLocomotionProfile } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
      }>
      getLocomotionProfile: (variant: {
        locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
      }) => {
        cruiseSpeed: number
        yawResponsiveness: number
        tailBeatFreq: number
        bodyWiggleAmount: number
        turnStartLag: number
      }
    }

    const variants = createFishVariants.bind(instance)()
    const diskGlider = getLocomotionProfile.bind(instance)(variants.find((variant) => variant.name === 'Angelfish')!)
    const slenderDarter = getLocomotionProfile.bind(instance)(variants.find((variant) => variant.name === 'Neon')!)
    const goldfishWobble = getLocomotionProfile.bind(instance)(variants.find((variant) => variant.name === 'Goldfish')!)
    const calmCruiser = getLocomotionProfile.bind(instance)(variants.find((variant) => variant.name === 'Tropical')!)

    expect(slenderDarter.cruiseSpeed).toBeGreaterThan(calmCruiser.cruiseSpeed)
    expect(slenderDarter.tailBeatFreq).toBeGreaterThan(diskGlider.tailBeatFreq)
    expect(diskGlider.yawResponsiveness).toBeLessThan(slenderDarter.yawResponsiveness)
    expect(goldfishWobble.bodyWiggleAmount).toBeGreaterThan(calmCruiser.bodyWiggleAmount)
    expect(goldfishWobble.turnStartLag).toBeGreaterThan(diskGlider.turnStartLag)
  })

  test('applyVariantLocomotionTuning passes fish-safe extents to boids', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const setBoidTuning = vi.fn()

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
        silhouette?: {
          bodyLength?: number
          bodyHeight?: number
          bodyThickness?: number
          noseLength?: number
          tailLength?: number
          dorsalHeight?: number
          ventralHeight?: number
        }
      }>
      boidVariantIndices: number[]
      boids: {
        boids: unknown[]
        setBoidTuning: (index: number, tuning: unknown) => void
      }
      visualAssets: null
    }).variants = [{
      name: 'Neon',
      scale: 0.35,
      speed: 1.5,
      locomotionProfileId: 'slender-darter',
      silhouette: {
        bodyLength: 1.82,
        bodyHeight: 0.18,
        bodyThickness: 0.15,
        noseLength: 0.3,
        tailLength: 0.36,
        dorsalHeight: 0.12,
        ventralHeight: 0.06
      }
    }]
    ;(instance as unknown as {
      boidVariantIndices: number[]
      boids: {
        boids: unknown[]
        setBoidTuning: (index: number, tuning: unknown) => void
      }
      visualAssets: null
    }).boidVariantIndices = [0]
    ;(instance as unknown as {
      boids: {
        boids: unknown[]
        setBoidTuning: (index: number, tuning: unknown) => void
      }
      visualAssets: null
    }).boids = {
      boids: [{}],
      setBoidTuning
    }
    ;(instance as unknown as {
      visualAssets: null
    }).visualAssets = null

    const applyVariantLocomotionTuning = (DetailedFishSystem.prototype as unknown as {
      applyVariantLocomotionTuning: () => void
    }).applyVariantLocomotionTuning.bind(instance)

    applyVariantLocomotionTuning()

    expect(setBoidTuning).toHaveBeenCalledTimes(1)
    expect(setBoidTuning).toHaveBeenCalledWith(0, expect.objectContaining({
      fishSafeExtents: expect.objectContaining({
        noseExtent: expect.any(Number),
        tailExtent: expect.any(Number),
        halfBodyWidth: expect.any(Number),
        halfBodyHeight: expect.any(Number)
      })
    }))

    const tuning = setBoidTuning.mock.calls[0]?.[1] as {
      fishSafeExtents: {
        noseExtent: number
        tailExtent: number
        halfBodyWidth: number
        halfBodyHeight: number
      }
    }
    expect(tuning.fishSafeExtents.noseExtent).toBeGreaterThan(tuning.fishSafeExtents.halfBodyWidth)
    expect(tuning.fishSafeExtents.tailExtent).toBeGreaterThan(0)
    expect(tuning.fishSafeExtents.halfBodyHeight).toBeGreaterThan(0)
  })
})

describe('DetailedFishSystem premium materials', () => {
  test('uses species textures for createFishMaterial before the legacy pattern fallback when available', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const tropicalLegacyPattern = new THREE.Texture()
    const tropicalTexture = new THREE.Texture()
    const tropicalNormal = new THREE.Texture()
    const tropicalRoughness = new THREE.Texture()
    const tropicalAlpha = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical': tropicalLegacyPattern,
        'fish-tropical-basecolor': tropicalTexture,
        'fish-tropical-normal': tropicalNormal,
        'fish-tropical-roughness': tropicalRoughness,
        'fish-tropical-alpha': tropicalAlpha
      }
    }

    const { createFishVariants, createFishMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        patternTextureId?: string
        baseColorTextureId?: string
        normalTextureId?: string
        roughnessTextureId?: string
        alphaTextureId?: string
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
    expect(material.map).not.toBe(tropicalLegacyPattern)
    expect(material.normalMap).toBe(tropicalNormal)
    expect(material.roughnessMap).toBe(tropicalRoughness)
    expect(material.alphaMap).toBe(tropicalAlpha)
    expect(material.alphaTest).toBeCloseTo(0.05)
  })

  test('uses the emergency texture path only when species textures are unavailable', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const emergencyTexture = new THREE.CanvasTexture(document.createElement('canvas'))
    const createEmergencyFishTexture = vi.fn(() => emergencyTexture)
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
      createEmergencyFishTexture: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.CanvasTexture
    }).visualAssets = {
      textures: {}
    }
    ;(instance as unknown as {
      createEmergencyFishTexture: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.CanvasTexture
    }).createEmergencyFishTexture = createEmergencyFishTexture

    const { createFishVariants, createFishMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        patternTextureId?: string
        baseColorTextureId?: string
        normalTextureId?: string
        roughnessTextureId?: string
        alphaTextureId?: string
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

    expect(createEmergencyFishTexture).toHaveBeenCalledWith(tropical)
    expect(material.map).toBe(emergencyTexture)
    expect(material.normalMap).toBeNull()
    expect(material.roughnessMap).toBeNull()
    expect(material.alphaMap).toBeNull()
  })

  test('uses the legacy pattern fallback before the emergency texture path', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const tropicalLegacyPattern = new THREE.Texture()
    const createEmergencyFishTexture = vi.fn(() => new THREE.CanvasTexture(document.createElement('canvas')))
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
      createEmergencyFishTexture: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.CanvasTexture
    }).visualAssets = {
      textures: {
        'fish-tropical': tropicalLegacyPattern
      }
    }
    ;(instance as unknown as {
      createEmergencyFishTexture: (variant: {
        name: string
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        scale: number
        speed: number
      }) => THREE.CanvasTexture
    }).createEmergencyFishTexture = createEmergencyFishTexture

    const { createFishVariants, createFishMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        patternTextureId?: string
        baseColorTextureId?: string
        normalTextureId?: string
        roughnessTextureId?: string
        alphaTextureId?: string
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

    expect(material.map).toBe(tropicalLegacyPattern)
    expect(createEmergencyFishTexture).not.toHaveBeenCalled()
  })

  test('preserves authored base material maps before consulting shared species textures', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const authoredMap = new THREE.Texture()
    const authoredAlpha = new THREE.Texture()
    const tropicalFallbackMap = new THREE.Texture()
    const tropicalFallbackNormal = new THREE.Texture()
    const tropicalFallbackRoughness = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical-basecolor': tropicalFallbackMap,
        'fish-tropical-normal': tropicalFallbackNormal,
        'fish-tropical-roughness': tropicalFallbackRoughness
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        map: authoredMap,
        alphaMap: authoredAlpha,
        roughness: 0.52
      }),
      {
        primaryColor: new THREE.Color('#ff8844'),
        secondaryColor: new THREE.Color('#ffee88'),
        scale: 1,
        speed: 1,
        baseColorTextureId: 'fish-tropical-basecolor',
        normalTextureId: 'fish-tropical-normal',
        roughnessTextureId: 'fish-tropical-roughness'
      },
      false
    )

    expect(material.map).toBe(authoredMap)
    expect(material.alphaMap).toBe(authoredAlpha)
    expect(material.normalMap).toBe(tropicalFallbackNormal)
    expect(material.roughnessMap).toBe(tropicalFallbackRoughness)
  })

  test('uses legacy pattern textures only as the final diffuse fallback for asset-backed fish materials', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const legacyPattern = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical': legacyPattern
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          patternTextureId?: string
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        color: '#ffffff'
      }),
      {
        primaryColor: new THREE.Color('#ff8844'),
        secondaryColor: new THREE.Color('#ffee88'),
        scale: 1,
        speed: 1,
        patternTextureId: 'fish-tropical',
        baseColorTextureId: 'fish-tropical-basecolor'
      },
      false
    )

    expect(material.map).toBe(legacyPattern)
  })

  test('falls back to generic fish-scale maps after species-specific normal and roughness textures are unavailable', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const genericNormal = new THREE.Texture()
    const genericRoughness = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-scale-normal': genericNormal,
        'fish-scale-roughness': genericRoughness
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          patternTextureId?: string
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        color: '#ffffff'
      }),
      {
        primaryColor: new THREE.Color('#ff8844'),
        secondaryColor: new THREE.Color('#ffee88'),
        scale: 1,
        speed: 1,
        normalTextureId: 'fish-tropical-normal',
        roughnessTextureId: 'fish-tropical-roughness'
      },
      false
    )

    expect(material.normalMap).toBe(genericNormal)
    expect(material.roughnessMap).toBe(genericRoughness)
  })

  test('uses variant alpha texture fallback for school fish without forcing transparent blending', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const tropicalFallbackAlpha = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical-alpha': tropicalFallbackAlpha
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        color: '#ffffff'
      }),
      {
        primaryColor: new THREE.Color('#ff8844'),
        secondaryColor: new THREE.Color('#ffee88'),
        scale: 1,
        speed: 1,
        alphaTextureId: 'fish-tropical-alpha'
      },
      false
    )

    expect(material.alphaMap).toBe(tropicalFallbackAlpha)
    expect(material.transparent).toBe(false)
    expect(material.alphaTest).toBeCloseTo(0.05)
  })

  test('preserves authored alpha maps for school fish before consulting variant alpha textures', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const authoredAlpha = new THREE.Texture()
    const tropicalFallbackAlpha = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical-alpha': tropicalFallbackAlpha
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        alphaMap: authoredAlpha
      }),
      {
        primaryColor: new THREE.Color('#ff8844'),
        secondaryColor: new THREE.Color('#ffee88'),
        scale: 1,
        speed: 1,
        alphaTextureId: 'fish-tropical-alpha'
      },
      false
    )

    expect(material.alphaMap).toBe(authoredAlpha)
    expect(material.transparent).toBe(false)
    expect(material.alphaTest).toBeCloseTo(0.05)
    expect(material.roughness).toBeCloseTo(0.38)
    expect(material.clearcoat).toBeCloseTo(0.64)
    expect(material.envMapIntensity).toBeCloseTo(0.78)
  })

  test('keeps hero alpha fallback behavior when authored alpha is absent', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const tropicalFallbackAlpha = new THREE.Texture()

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'fish-tropical-alpha': tropicalFallbackAlpha
      }
    }

    const { createFishAssetMaterial } = DetailedFishSystem.prototype as unknown as {
      createFishAssetMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          baseColorTextureId?: string
          normalTextureId?: string
          roughnessTextureId?: string
          alphaTextureId?: string
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        },
        hero: boolean
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createFishAssetMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({
        color: '#ffffff'
      }),
      {
        primaryColor: new THREE.Color('#44eeff'),
        secondaryColor: new THREE.Color('#ff44aa'),
        scale: 1,
        speed: 1,
        alphaTextureId: 'fish-tropical-alpha'
      },
      true
    )

    expect(material.alphaMap).toBe(tropicalFallbackAlpha)
    expect(material.transparent).toBe(true)
    expect(material.alphaTest).toBeCloseTo(0.05)
    expect(material.roughness).toBeCloseTo(0.24)
    expect(material.clearcoat).toBeCloseTo(0.84)
    expect(material.envMapIntensity).toBeCloseTo(0.95)
  })

  test('hero asset materials do not add emissive brightness', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {}
    }

    const { createHeroFishMaterial } = DetailedFishSystem.prototype as unknown as {
      createHeroFishMaterial: (
        baseMaterial: THREE.Material,
        variant: {
          primaryColor: THREE.Color
          secondaryColor: THREE.Color
          scale: number
          speed: number
        }
      ) => THREE.MeshPhysicalMaterial
    }

    const material = createHeroFishMaterial.bind(instance)(
      new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      {
        primaryColor: new THREE.Color('#44eeff'),
        secondaryColor: new THREE.Color('#ff44aa'),
        scale: 1,
        speed: 1
      }
    )

    expect(material.emissiveIntensity).toBe(0)
    expect(material.emissive.getHex()).toBe(0x000000)
  })
})

describe('DetailedFishSystem asset-backed models', () => {
  test('maps fish archetypes to school and hero model ids', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createFishVariants } = DetailedFishSystem.prototype as unknown as {
      createFishVariants: () => Array<{
        name: string
        patternTextureId?: string
        schoolModelId?: string
        heroModelId?: string
      }>
    }

    const variants = createFishVariants.bind(instance)()

    expect(variants.find((variant) => variant.name === 'Tropical')).toMatchObject({
      patternTextureId: 'fish-tropical',
      schoolModelId: 'fish-tropical-school',
      heroModelId: 'fish-tropical-hero'
    })
    expect(variants.find((variant) => variant.name === 'Angelfish')).toMatchObject({
      patternTextureId: 'fish-angelfish',
      schoolModelId: 'fish-angelfish-school',
      heroModelId: 'fish-angelfish-hero'
    })
    expect(variants.find((variant) => variant.name === 'Neon')).toMatchObject({
      patternTextureId: 'fish-neon',
      schoolModelId: 'fish-neon-school',
      heroModelId: 'fish-neon-hero'
    })
    expect(variants.find((variant) => variant.name === 'Goldfish')).toMatchObject({
      patternTextureId: 'fish-goldfish',
      schoolModelId: 'fish-goldfish-school',
      heroModelId: 'fish-goldfish-hero'
    })
  })

  test('falls back to procedural geometry when a school model is unavailable', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1)
    const fallbackMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff' })
    const geometrySpy = vi.fn(() => fallbackGeometry)
    const materialSpy = vi.fn(() => fallbackMaterial)

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        schoolModelId?: string
      }>
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Mesh[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).variants = [{
      name: 'Neon',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#ffffff'),
      secondaryColor: new THREE.Color('#000000'),
      schoolModelId: 'fish-neon-school'
    }]
    ;(instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Mesh[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).instancedMeshes = []
    ;(instance as unknown as {
      heroFishMeshes: THREE.Mesh[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).heroFishMeshes = []
    ;(instance as unknown as {
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).baseInstanceCounts = []
    ;(instance as unknown as {
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).group = new THREE.Group()
    ;(instance as unknown as {
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).fishCount = 2
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).visualAssets = {
      models: {
        'fish-neon-school': null
      }
    }
    ;(instance as unknown as {
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).createDetailedFishGeometry = geometrySpy
    ;(instance as unknown as {
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
      createHeroFishMeshes: (counts: number[]) => void
    }).createFishMaterial = materialSpy
    ;(instance as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes = vi.fn()

    const createDetailedFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createDetailedFishMeshes: (countsPerVariant?: number[]) => void
    }).createDetailedFishMeshes.bind(instance)

    createDetailedFishMeshes([2])

    const createdMesh = (instance as unknown as { instancedMeshes: THREE.InstancedMesh[] }).instancedMeshes[0]

    expect(geometrySpy).toHaveBeenCalledTimes(1)
    expect(materialSpy).toHaveBeenCalledTimes(1)
    expect(createdMesh.geometry).toBe(fallbackGeometry)
    expect(createdMesh.material).toBe(fallbackMaterial)
  })

  test('keeps school instance colors near-neutral when using authored fish assets', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const sourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', map: new THREE.Texture() })
    )

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        schoolModelId?: string
      }>
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).variants = [{
      name: 'Tropical',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#ff8844'),
      secondaryColor: new THREE.Color('#ffee88'),
      schoolModelId: 'fish-tropical-school'
    }]
    ;(instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).instancedMeshes = []
    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).heroFishMeshes = []
    ;(instance as unknown as {
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).baseInstanceCounts = []
    ;(instance as unknown as {
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).group = new THREE.Group()
    ;(instance as unknown as {
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).fishCount = 2
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      visualAssets: {
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).visualAssets = {
      models: {
        'fish-tropical-school': { sourceMesh }
      }
    }
    ;(instance as unknown as {
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).createDetailedFishGeometry = vi.fn(() => new THREE.BoxGeometry(1, 1, 1))
    ;(instance as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes = vi.fn()

    const createDetailedFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createDetailedFishMeshes: (countsPerVariant?: number[]) => void
    }).createDetailedFishMeshes.bind(instance)

    createDetailedFishMeshes([2])

    const createdMesh = (instance as unknown as { instancedMeshes: THREE.InstancedMesh[] }).instancedMeshes[0]
    const colors = createdMesh.instanceColor?.array ?? new Float32Array()

    expect(colors[0]).toBeGreaterThan(0.85)
    expect(colors[1]).toBeGreaterThan(0.85)
    expect(colors[2]).toBeGreaterThan(0.85)
    expect(Math.abs(colors[0] - colors[1])).toBeLessThan(0.02)
    expect(Math.abs(colors[1] - colors[2])).toBeLessThan(0.02)

    randomSpy.mockRestore()
  })

  test('keeps instanced school meshes when variant alpha fallback is applied to asset-backed fish', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const fallbackAlpha = new THREE.Texture()
    const sourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', map: new THREE.Texture() })
    )

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        alphaTextureId?: string
        schoolModelId?: string
      }>
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).variants = [{
      name: 'Tropical',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#ff8844'),
      secondaryColor: new THREE.Color('#ffee88'),
      alphaTextureId: 'fish-tropical-alpha',
      schoolModelId: 'fish-tropical-school'
    }]
    ;(instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).instancedMeshes = []
    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).heroFishMeshes = []
    ;(instance as unknown as {
      baseInstanceCounts: number[]
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).baseInstanceCounts = []
    ;(instance as unknown as {
      group: THREE.Group
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).group = new THREE.Group()
    ;(instance as unknown as {
      fishCount: number
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).fishCount = 2
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> } | null>
      } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).visualAssets = {
      textures: {
        'fish-tropical-alpha': fallbackAlpha
      },
      models: {
        'fish-tropical-school': { sourceMesh }
      }
    }
    ;(instance as unknown as {
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createHeroFishMeshes: (counts: number[]) => void
    }).createDetailedFishGeometry = vi.fn(() => new THREE.BoxGeometry(1, 1, 1))
    ;(instance as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes = vi.fn()

    const createDetailedFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createDetailedFishMeshes: (countsPerVariant?: number[]) => void
    }).createDetailedFishMeshes.bind(instance)

    createDetailedFishMeshes([2])

    const createdMesh = (instance as unknown as { instancedMeshes: THREE.InstancedMesh[] }).instancedMeshes[0]
    const material = createdMesh.material as THREE.MeshPhysicalMaterial

    expect(createdMesh).toBeInstanceOf(THREE.InstancedMesh)
    expect(material.alphaMap).toBe(fallbackAlpha)
    expect(material.transparent).toBe(false)
    expect(material.alphaTest).toBeCloseTo(0.05)
  })

  test('uses the authored single-mesh hero asset when a source mesh is available', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const heroScene = createHeroSingleMeshScene()
    const sourceMesh = heroScene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        heroModelId?: string
      }>
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).variants = [{
      name: 'Angelfish',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#ffffff'),
      secondaryColor: new THREE.Color('#000000'),
      heroModelId: 'fish-angelfish-hero'
    }]
    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).heroFishMeshes = []
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).group = new THREE.Group()
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).visualAssets = {
      textures: {},
      models: {
        'fish-angelfish-hero': {
          scene: heroScene,
          sourceMesh
        }
      }
    }

    const createHeroFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes.bind(instance)

    createHeroFishMeshes([1])

    const heroObject = (instance as unknown as { heroFishMeshes: THREE.Object3D[] }).heroFishMeshes[0]

    expect(heroObject).toBeInstanceOf(THREE.Group)
    const motionNodes = heroObject.userData.motionNodes as { body?: THREE.Object3D; tail?: THREE.Object3D | null } | undefined
    expect(motionNodes?.body).toBeInstanceOf(THREE.Mesh)
    expect(motionNodes?.tail ?? null).toBeNull()
    expect((motionNodes?.body as THREE.Mesh).geometry).toBe(sourceMesh.geometry)
    expect((((motionNodes?.body as THREE.Mesh).material) as THREE.MeshPhysicalMaterial).map).toBe(sourceMesh.material.map)
  })

  test('uses the authored multi-mesh hero scene when the hero asset has no single source mesh', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const heroScene = createHeroMultiMeshScene()

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        heroModelId?: string
      }>
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).variants = [{
      name: 'Neon',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#44eeff'),
      secondaryColor: new THREE.Color('#ff44aa'),
      heroModelId: 'fish-neon-hero'
    }]
    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).heroFishMeshes = []
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).group = new THREE.Group()
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null } | null>
      } | null
    }).visualAssets = {
      textures: {},
      models: {
        'fish-neon-hero': {
          scene: heroScene,
          sourceMesh: null
        }
      }
    }

    const createHeroFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes.bind(instance)

    createHeroFishMeshes([1])

    const heroObject = (instance as unknown as { heroFishMeshes: THREE.Object3D[] }).heroFishMeshes[0]

    expect(heroObject).toBeInstanceOf(THREE.Group)
    expect(heroObject).not.toBe(heroScene)
    const motionNodes = heroObject.userData.motionNodes as { body?: THREE.Object3D; tail?: THREE.Object3D | null } | undefined
    expect(motionNodes?.body).toBeInstanceOf(THREE.Group)
    expect(motionNodes?.tail?.name).toBe('TailFin')
  })

  test('falls back to the procedural hero fish when the hero asset is missing', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const fallbackGeometry = new THREE.BoxGeometry(1, 0.4, 0.2)
    const fallbackMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffeeaa' })
    const geometrySpy = vi.fn(() => fallbackGeometry)
    const materialSpy = vi.fn(() => fallbackMaterial)

    ;(instance as unknown as {
      variants: Array<{
        name: string
        scale: number
        speed: number
        primaryColor: THREE.Color
        secondaryColor: THREE.Color
        heroModelId?: string
      }>
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: { models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).variants = [{
      name: 'Goldfish',
      scale: 1,
      speed: 1,
      primaryColor: new THREE.Color('#ffaa44'),
      secondaryColor: new THREE.Color('#ff8844'),
      heroModelId: 'fish-goldfish-hero'
    }]
    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: { textures: Record<string, THREE.Texture | null>; models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).heroFishMeshes = []
    ;(instance as unknown as {
      heroAssignments: Map<number, unknown>
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: { textures: Record<string, THREE.Texture | null>; models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).heroAssignments = new Map()
    ;(instance as unknown as {
      group: THREE.Group
      currentQuality: 'simple' | 'standard'
      visualAssets: { textures: Record<string, THREE.Texture | null>; models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).group = new THREE.Group()
    ;(instance as unknown as {
      currentQuality: 'simple' | 'standard'
      visualAssets: { textures: Record<string, THREE.Texture | null>; models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).currentQuality = 'standard'
    ;(instance as unknown as {
      visualAssets: { textures: Record<string, THREE.Texture | null>; models: Record<string, null> } | null
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).visualAssets = {
      textures: {},
      models: {
        'fish-goldfish-hero': null
      }
    }
    ;(instance as unknown as {
      createDetailedFishGeometry: (variant: unknown) => THREE.BufferGeometry
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).createDetailedFishGeometry = geometrySpy
    ;(instance as unknown as {
      createFishMaterial: (variant: unknown) => THREE.MeshPhysicalMaterial
    }).createFishMaterial = materialSpy

    const createHeroFishMeshes = (DetailedFishSystem.prototype as unknown as {
      createHeroFishMeshes: (counts: number[]) => void
    }).createHeroFishMeshes.bind(instance)

    createHeroFishMeshes([1])

    const heroObject = (instance as unknown as { heroFishMeshes: THREE.Object3D[] }).heroFishMeshes[0]

    expect(heroObject).toBeInstanceOf(THREE.Group)
    const motionNodes = heroObject.userData.motionNodes as { body?: THREE.Object3D; tail?: THREE.Object3D | null } | undefined
    expect(motionNodes?.body).toBeInstanceOf(THREE.Mesh)
    expect((motionNodes?.body as THREE.Mesh).geometry).toBe(fallbackGeometry)
    expect((motionNodes?.body as THREE.Mesh).material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(geometrySpy).toHaveBeenCalledTimes(1)
    expect(materialSpy).toHaveBeenCalledTimes(1)
  })
})

describe('DetailedFishSystem wander target timing', () => {
  test('uses a slightly denser default school count on desktop for the wider tank', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-9, -4, -5), new THREE.Vector3(9, 4, 5))
    const system = new DetailedFishSystem(scene, bounds)
    const internals = system as unknown as { fishCount: number }

    expect(internals.fishCount).toBe(66)
  })

  test('initializeRandomness seeds wander targets relative to the tank bounds', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      fishCount: number
      bounds: THREE.Box3
      randomOffsets: Float32Array
      swimPhases: Float32Array
      speedMultipliers: Float32Array
      wanderTargets: THREE.Vector3[]
      nextRetargetTimes: Float32Array
      nextStateChangeTimes: Float32Array
      stateCooldowns: Float32Array
      gaitStates: string[]
      preferredDepthBands: string[]
      preferredLateralLanes: string[]
      interestSeeds: Float32Array
      variants: Array<{
        locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
      }>
      boidVariantIndices: number[]
    }

    internals.fishCount = 1
    internals.bounds = new THREE.Box3(new THREE.Vector3(-6, -4, -3), new THREE.Vector3(6, 4, 3))
    internals.variants = [{ locomotionProfileId: 'calm-cruiser' }]
    internals.boidVariantIndices = [0]

    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.24)
      .mockReturnValueOnce(0.76)
      .mockReturnValueOnce(0.42)
      .mockReturnValueOnce(0.65)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)

    const initializeRandomness = (DetailedFishSystem.prototype as unknown as {
      initializeRandomness: () => void
    }).initializeRandomness.bind(instance)

    initializeRandomness()

    const target = internals.wanderTargets[0]
    expect(target.x).toBeGreaterThanOrEqual(-5.1)
    expect(target.x).toBeLessThanOrEqual(5.1)
    expect(target.y).toBeGreaterThanOrEqual(-2.6)
    expect(target.y).toBeLessThanOrEqual(2.7)
    expect(target.z).toBeGreaterThanOrEqual(-1.6)
    expect(target.z).toBeLessThanOrEqual(1.6)
    expect(internals.nextRetargetTimes[0]).toBeGreaterThan(0)
    expect(internals.nextStateChangeTimes[0]).toBeGreaterThan(internals.nextRetargetTimes[0])
    expect(internals.stateCooldowns[0]).toBeGreaterThanOrEqual(0)
    expect(internals.gaitStates[0]).toBeTypeOf('string')

    randomSpy.mockRestore()
  })

  test('updateWanderTargets uses per-fish retarget clocks instead of one global cadence', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const internals = instance as unknown as {
      fishCount: number
      wanderTargets: THREE.Vector3[]
      nextRetargetTimes: Float32Array
      nextStateChangeTimes: Float32Array
      stateCooldowns: Float32Array
      gaitStates: Array<'cruise' | 'inspect' | 'glide' | 'burst' | 'hover'>
      preferredDepthBands: Array<'upper' | 'mid' | 'hardscape-near'>
      preferredLateralLanes: Array<'left' | 'center' | 'right'>
      interestSeeds: Float32Array
      boids: { boids: Array<{ position: THREE.Vector3 }> }
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
      tempBoundsSize: THREE.Vector3
      bounds: THREE.Box3
      variants: Array<{
        locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
      }>
      boidVariantIndices: number[]
      speedMultipliers: Float32Array
      randomOffsets: Float32Array
      swimPhases: Float32Array
    }

    internals.fishCount = 2
    internals.wanderTargets = Array.from({ length: internals.fishCount }, () => new THREE.Vector3())
    internals.nextRetargetTimes = new Float32Array([5, 10])
    internals.nextStateChangeTimes = new Float32Array([20, 20])
    internals.stateCooldowns = new Float32Array([0, 0])
    internals.gaitStates = ['inspect', 'cruise']
    internals.preferredDepthBands = ['mid', 'upper']
    internals.preferredLateralLanes = ['left', 'right']
    internals.interestSeeds = new Float32Array([0.2, 0.8])
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.tempBoundsSize = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-6, -4, -3), new THREE.Vector3(6, 4, 3))
    internals.variants = [{ locomotionProfileId: 'goldfish-wobble' }]
    internals.boidVariantIndices = [0, 0]
    internals.speedMultipliers = new Float32Array([1, 1])
    internals.randomOffsets = new Float32Array([0.15, 0.85])
    internals.swimPhases = new Float32Array([0.3, 1.1])
    internals.boids = {
      boids: [
        { position: new THREE.Vector3(-1, 0.2, 0.1) },
        { position: new THREE.Vector3(1, 1.1, -0.4) }
      ]
    }

    ;(instance as unknown as {
      pickInterestPoint?: (index: number) => { position: THREE.Vector3 } | null
    }).pickInterestPoint = (index: number) => ({
      position: new THREE.Vector3(index === 0 ? -2.8 : 2.8, index === 0 ? -0.2 : 1.6, index === 0 ? -0.8 : 0.9)
    })

    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.35)
      .mockReturnValueOnce(0.65)
      .mockReturnValueOnce(0.55)
    const updateWanderTargets = (DetailedFishSystem.prototype as unknown as {
      updateWanderTargets: (elapsedTime: number) => void
    }).updateWanderTargets.bind(instance)

    const before = internals.wanderTargets[0].clone()
    const otherBefore = internals.wanderTargets[1].clone()
    updateWanderTargets(6.1)
    expect(internals.wanderTargets[0].distanceTo(before)).toBeGreaterThan(0)
    expect(internals.wanderTargets[1].distanceTo(otherBefore)).toBe(0)
    expect(internals.nextRetargetTimes[0]).toBeGreaterThan(6.1)
    expect(internals.nextRetargetTimes[1]).toBeCloseTo(10)

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

  test('keeps the hero fish nose behind the front safe plane even with a forward depth offset', () => {
    const scene = new THREE.Scene()
    const bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    const system = new DetailedFishSystem(scene, bounds)

    system.setFishGroups([
      { speciesId: 'neon-tetra', count: 8 }
    ])

    const internals = system as unknown as {
      boids: {
        boids: Array<{
          position: THREE.Vector3
          velocity: THREE.Vector3
        }>
      }
      heroAssignments: Map<number, {
        object: THREE.Object3D
        fishSafeExtents: {
          noseExtent: number
          tailExtent: number
          halfBodyWidth: number
          halfBodyHeight: number
        }
      }>
    }

    const heroEntry = Array.from(internals.heroAssignments.entries())[0]
    expect(heroEntry).toBeDefined()

    const [heroBoidIndex, heroAssignment] = heroEntry!
    const heroBoid = internals.boids.boids[heroBoidIndex]
    heroBoid.position.set(-0.2, 0.1, 4.72)
    heroBoid.velocity.set(0, 0, 1.4)

    system.update(0, 0)

    expect(heroAssignment.object.position.z).toBeLessThanOrEqual(bounds.max.z - heroAssignment.fishSafeExtents.noseExtent + 0.0001)
  })
})

describe('DetailedFishSystem photo mode focus', () => {
  test('returns the first visible hero fish object as the focus point', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const hiddenHero = new THREE.Group()
    hiddenHero.visible = false
    hiddenHero.position.set(-2, 1, 3)

    const visibleHero = new THREE.Group()
    visibleHero.visible = true
    visibleHero.position.set(1.5, -0.25, 2.2)

    ;(instance as unknown as {
      heroFishMeshes: THREE.Object3D[]
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
      boids: { boids: Array<{ position: THREE.Vector3; velocity: THREE.Vector3; acceleration: THREE.Vector3 }>; update: (deltaTime: number) => void }
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

    expect(internals.boids.params.maxSpeed).toBeGreaterThan(2.7)
    expect(internals.behaviorProfile.preferredDepth).toBeGreaterThan(0.7)
    expect(internals.behaviorProfile.turnBias).toBeGreaterThan(0.25)
  })

  test('update passes deltaTime through to boids.update', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const boidsUpdate = vi.fn()
    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      boids: { boids: Array<{ position: THREE.Vector3; velocity: THREE.Vector3; acceleration: THREE.Vector3 }>; update: (deltaTime: number) => void }
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
      tempBoundsSize: THREE.Vector3
      bounds: THREE.Box3
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
        schoolMood: 'calm'
        avoidWalls: number
      }
    }

    internals.instancedMeshes = []
    internals.boids = { boids: [], update: boidsUpdate }
    internals.wanderTargets = []
    internals.speedMultipliers = new Float32Array()
    internals.randomOffsets = new Float32Array()
    internals.swimPhases = new Float32Array()
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
    internals.tempBoundsSize = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    internals.behaviorProfile = {
      preferredDepth: 0.5,
      depthVariance: 0.18,
      turnBias: 0.14,
      schoolMood: 'calm',
      avoidWalls: 0.8
    }

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)

    update(0.25, 1)

    expect(boidsUpdate).toHaveBeenCalledWith(0.25)
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
      boids: { boids: typeof boid[]; update: (deltaTime: number) => void }
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
      smoothedQuaternions: THREE.Quaternion[]
      previousVelocities: THREE.Vector3[]
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
      tempDepthForce: THREE.Vector3
      tempBoundsSize: THREE.Vector3
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
    internals.smoothedQuaternions = [new THREE.Quaternion()]
    internals.previousVelocities = [new THREE.Vector3(1, 0, 0)]
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.tempDepthForce = new THREE.Vector3()
    internals.tempBoundsSize = new THREE.Vector3()
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

  test('heading smoothing prevents an oversized single-frame yaw jump', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const boid = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(1, 0, 0),
      acceleration: new THREE.Vector3(),
      maxSpeed: 4,
      maxForce: 2
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1
    )

    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      variants: Array<{ name: string; scale: number; speed: number }>
      boids: { boids: typeof boid[]; update: (deltaTime: number) => void }
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
      smoothedQuaternions: THREE.Quaternion[]
      previousVelocities: THREE.Vector3[]
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
      tempDepthForce: THREE.Vector3
      tempBoundsSize: THREE.Vector3
      bounds: THREE.Box3
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
        schoolMood: 'calm'
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
    internals.smoothedQuaternions = [new THREE.Quaternion()]
    internals.previousVelocities = [new THREE.Vector3(1, 0, 0)]
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.tempDepthForce = new THREE.Vector3()
    internals.tempBoundsSize = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    internals.behaviorProfile = {
      preferredDepth: 0.5,
      depthVariance: 0.18,
      turnBias: 0.14,
      schoolMood: 'calm',
      avoidWalls: 0.8
    }

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    update(1 / 60, 0)

    const beforeMatrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, beforeMatrix)
    const beforeQuaternion = new THREE.Quaternion()
    beforeMatrix.decompose(new THREE.Vector3(), beforeQuaternion, new THREE.Vector3())

    boid.velocity.set(-1, 0, 0)
    update(1 / 60, 1 / 60)

    const afterMatrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, afterMatrix)
    const afterQuaternion = new THREE.Quaternion()
    afterMatrix.decompose(new THREE.Vector3(), afterQuaternion, new THREE.Vector3())

    expect(beforeQuaternion.angleTo(afterQuaternion)).toBeLessThan(1.2)

    randomSpy.mockRestore()
  })

  test('update uses the configured forward axis instead of the legacy hard-coded axis', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const boid = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(1, 0, 0),
      acceleration: new THREE.Vector3(),
      maxSpeed: 4,
      maxForce: 2
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1
    )

    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      variants: Array<{
        name: string
        scale: number
        speed: number
        modelForwardAxis?: {
          procedural: [number, number, number]
          school: [number, number, number]
          hero: [number, number, number]
        }
        locomotionProfileId?: string
      }>
      boids: { boids: typeof boid[]; update: (deltaTime: number) => void }
      boidVariantIndices: number[]
      wanderTargets: THREE.Vector3[]
      speedMultipliers: Float32Array
      randomOffsets: Float32Array
      swimPhases: Float32Array
      dummy: THREE.Object3D
      tempWanderForce: THREE.Vector3
      tempJitter: THREE.Vector3
      tempNoiseForce: THREE.Vector3
      tempDirection: THREE.Vector3
      tempSuddenTurn: THREE.Vector3
      tempCuriosityForce: THREE.Vector3
      tempQuaternion: THREE.Quaternion
      smoothedQuaternions: THREE.Quaternion[]
      previousVelocities: THREE.Vector3[]
      headingInitialized: boolean[]
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
      tempDepthForce: THREE.Vector3
      tempBoundsSize: THREE.Vector3
      tempHorizontalDirection: THREE.Vector3
      tempHorizontalPreviousDirection: THREE.Vector3
      bounds: THREE.Box3
      heroAssignments: Map<number, unknown>
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
        schoolMood: 'calm'
        avoidWalls: number
      }
    }

    internals.instancedMeshes = [mesh]
    internals.variants = [{
      name: 'Neon',
      scale: 0.35,
      speed: 1.2,
      modelForwardAxis: {
        procedural: [1, 0, 0],
        school: [1, 0, 0],
        hero: [1, 0, 0]
      },
      locomotionProfileId: 'slender-darter'
    }]
    internals.boids = { boids: [boid], update: () => {} }
    internals.boidVariantIndices = [0]
    internals.wanderTargets = [new THREE.Vector3(0, 0, 0)]
    internals.speedMultipliers = new Float32Array([1])
    internals.randomOffsets = new Float32Array([0])
    internals.swimPhases = new Float32Array([0])
    internals.dummy = new THREE.Object3D()
    internals.tempWanderForce = new THREE.Vector3()
    internals.tempJitter = new THREE.Vector3()
    internals.tempNoiseForce = new THREE.Vector3()
    internals.tempDirection = new THREE.Vector3()
    internals.tempSuddenTurn = new THREE.Vector3()
    internals.tempCuriosityForce = new THREE.Vector3()
    internals.tempQuaternion = new THREE.Quaternion()
    internals.smoothedQuaternions = [new THREE.Quaternion()]
    internals.previousVelocities = [new THREE.Vector3(1, 0, 0)]
    internals.headingInitialized = [true]
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.tempDepthForce = new THREE.Vector3()
    internals.tempBoundsSize = new THREE.Vector3()
    internals.tempHorizontalDirection = new THREE.Vector3()
    internals.tempHorizontalPreviousDirection = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    internals.heroAssignments = new Map()
    internals.behaviorProfile = {
      preferredDepth: 0.5,
      depthVariance: 0.18,
      turnBias: 0.14,
      schoolMood: 'calm',
      avoidWalls: 0.8
    }

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    update(1 / 60, 0)

    const matrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, matrix)
    const quaternion = new THREE.Quaternion()
    matrix.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3())
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize()

    expect(forward.angleTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(0.12)

    randomSpy.mockRestore()
  })

  test('update keeps root yaw stable when velocity is steady', () => {
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const boid = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(-1, 0, 0),
      acceleration: new THREE.Vector3(),
      maxSpeed: 4,
      maxForce: 2
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      1
    )

    const internals = instance as unknown as {
      instancedMeshes: THREE.InstancedMesh[]
      variants: Array<{
        name: string
        scale: number
        speed: number
        modelForwardAxis?: {
          procedural: [number, number, number]
          school: [number, number, number]
          hero: [number, number, number]
        }
        locomotionProfileId?: string
      }>
      boids: { boids: typeof boid[]; update: (deltaTime: number) => void }
      boidVariantIndices: number[]
      wanderTargets: THREE.Vector3[]
      speedMultipliers: Float32Array
      randomOffsets: Float32Array
      swimPhases: Float32Array
      dummy: THREE.Object3D
      tempWanderForce: THREE.Vector3
      tempJitter: THREE.Vector3
      tempNoiseForce: THREE.Vector3
      tempDirection: THREE.Vector3
      tempSuddenTurn: THREE.Vector3
      tempCuriosityForce: THREE.Vector3
      tempQuaternion: THREE.Quaternion
      smoothedQuaternions: THREE.Quaternion[]
      previousVelocities: THREE.Vector3[]
      headingInitialized: boolean[]
      tempCurrentPos: THREE.Vector3
      tempWanderDirection: THREE.Vector3
      tempWanderTarget: THREE.Vector3
      tempDepthForce: THREE.Vector3
      tempBoundsSize: THREE.Vector3
      tempHorizontalDirection: THREE.Vector3
      tempHorizontalPreviousDirection: THREE.Vector3
      bounds: THREE.Box3
      heroAssignments: Map<number, unknown>
      behaviorProfile: {
        preferredDepth: number
        depthVariance: number
        turnBias: number
        schoolMood: 'calm'
        avoidWalls: number
      }
    }

    internals.instancedMeshes = [mesh]
    internals.variants = [{
      name: 'Goldfish',
      scale: 0.55,
      speed: 0.9,
      modelForwardAxis: {
        procedural: [-1, 0, 0],
        school: [-1, 0, 0],
        hero: [-1, 0, 0]
      },
      locomotionProfileId: 'goldfish-wobble'
    }]
    internals.boids = { boids: [boid], update: () => {} }
    internals.boidVariantIndices = [0]
    internals.wanderTargets = [new THREE.Vector3(0, 0, 0)]
    internals.speedMultipliers = new Float32Array([1])
    internals.randomOffsets = new Float32Array([0.35])
    internals.swimPhases = new Float32Array([0.8])
    internals.dummy = new THREE.Object3D()
    internals.tempWanderForce = new THREE.Vector3()
    internals.tempJitter = new THREE.Vector3()
    internals.tempNoiseForce = new THREE.Vector3()
    internals.tempDirection = new THREE.Vector3()
    internals.tempSuddenTurn = new THREE.Vector3()
    internals.tempCuriosityForce = new THREE.Vector3()
    internals.tempQuaternion = new THREE.Quaternion()
    internals.smoothedQuaternions = [new THREE.Quaternion()]
    internals.previousVelocities = [new THREE.Vector3(-1, 0, 0)]
    internals.headingInitialized = [true]
    internals.tempCurrentPos = new THREE.Vector3()
    internals.tempWanderDirection = new THREE.Vector3()
    internals.tempWanderTarget = new THREE.Vector3()
    internals.tempDepthForce = new THREE.Vector3()
    internals.tempBoundsSize = new THREE.Vector3()
    internals.tempHorizontalDirection = new THREE.Vector3()
    internals.tempHorizontalPreviousDirection = new THREE.Vector3()
    internals.bounds = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    internals.heroAssignments = new Map()
    internals.behaviorProfile = {
      preferredDepth: 0.5,
      depthVariance: 0.18,
      turnBias: 0.14,
      schoolMood: 'calm',
      avoidWalls: 0.8
    }

    const stub = instance as unknown as { updateWanderTargets: (elapsedTime: number) => void }
    stub.updateWanderTargets = () => {}

    const update = (DetailedFishSystem.prototype as unknown as {
      update: (deltaTime: number, elapsedTime: number) => void
    }).update.bind(instance)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    update(1 / 60, 0)
    const firstMatrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, firstMatrix)
    const firstQuaternion = new THREE.Quaternion()
    firstMatrix.decompose(new THREE.Vector3(), firstQuaternion, new THREE.Vector3())
    const firstForward = new THREE.Vector3(-1, 0, 0).applyQuaternion(firstQuaternion).normalize()

    update(1 / 60, 0.9)
    const secondMatrix = new THREE.Matrix4()
    mesh.getMatrixAt(0, secondMatrix)
    const secondQuaternion = new THREE.Quaternion()
    secondMatrix.decompose(new THREE.Vector3(), secondQuaternion, new THREE.Vector3())
    const secondForward = new THREE.Vector3(-1, 0, 0).applyQuaternion(secondQuaternion).normalize()

    expect(firstForward.angleTo(secondForward)).toBeLessThan(0.01)

    randomSpy.mockRestore()
  })
})
