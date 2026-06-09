import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import {
  createAquariumAssetManifest,
  createBootAquariumAssetManifest,
  createDeferredAquariumAssetManifest,
  loadVisualAssets,
  resolvePublicAssetUrl,
  type AssetManifest
} from './visualAssets'

const createSingleMeshScene = (): THREE.Group => {
  const scene = new THREE.Group()
  scene.add(
    new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.6, 4, 8),
      new THREE.MeshStandardMaterial({ color: '#ffffff' })
    )
  )
  return scene
}

const createMultiMeshScene = (): THREE.Group => {
  const scene = new THREE.Group()
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff' })
    )
  )
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#cccccc' })
    )
  )
  return scene
}

const readGlbJson = (relativePath: string): Record<string, unknown> => {
  const buffer = readFileSync(relativePath)
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8')) as Record<string, unknown>
}

const createImageTexture = (): THREE.Texture<HTMLImageElement> => new THREE.Texture(document.createElement('img'))

describe('loadVisualAssets', () => {
  it('loads textures, models, and hdri assets by id and falls back to null on failure', async () => {
    let now = 100
    const performanceMarks: string[] = []
    const performanceMeasures: string[] = []
    const performance = {
      mark: (name: string) => performanceMarks.push(name),
      measure: (name: string, startMark: string, endMark: string) => {
        performanceMeasures.push(`${name}:${startMark}:${endMark}`)
      },
      clearMarks: () => undefined
    }
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('missing')) {
          throw new Error('missing texture')
        }
        return createImageTexture()
      })
    }
    const gltfLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('missing')) {
          throw new Error('missing model')
        }
        return { scene: createSingleMeshScene() }
      })
    }
    const hdriLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('missing')) {
          throw new Error('missing hdri')
        }
        return new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
      })
    }

    const manifest: AssetManifest = {
      textures: [
        { id: 'leaf-diffuse', url: '/assets/textures/plants/leaf-diffuse.svg', usageTag: 'plant', lod: 'high' },
        { id: 'missing-texture', url: '/assets/missing.svg', usageTag: 'fish', lod: 'medium' }
      ],
      models: [
        { id: 'fish-neon-school', url: '/assets/models/fish/fish-neon-school.glb', usageTag: 'fish', lod: 'high' },
        { id: 'missing-model', url: '/assets/missing.glb', usageTag: 'fish', lod: 'medium' }
      ],
      environment: [
        { id: 'aquarium-hdri', url: '/assets/environment/aquarium-hdri.hdr', usageTag: 'environment', lod: 'high' },
        { id: 'missing-hdri', url: '/assets/missing.hdr', usageTag: 'environment', lod: 'medium' }
      ]
    }

    const assets = await loadVisualAssets(manifest, {
      textureLoader,
      gltfLoader,
      hdriLoader,
      now: () => {
        now += 5
        return now
      },
      performance
    })

    expect(textureLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(gltfLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(hdriLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(assets.textures['leaf-diffuse']).toBeInstanceOf(THREE.Texture)
    expect(assets.textures['missing-texture']).toBeNull()
    expect(assets.models['fish-neon-school']?.sourceMesh).toBeInstanceOf(THREE.Mesh)
    expect(assets.models['missing-model']).toBeNull()
    expect(assets.environment['aquarium-hdri']).toBeInstanceOf(THREE.Texture)
    expect(assets.environment['missing-hdri']).toBeNull()
    expect(assets.loadTimings).toEqual(expect.objectContaining({
      totalMs: expect.any(Number),
      texturesMs: expect.any(Number),
      modelsMs: expect.any(Number),
      environmentMs: expect.any(Number)
    }))
    expect(performanceMarks).toContain('aquarium:assets:textures:start')
    expect(performanceMarks).toContain('aquarium:assets:models:start')
    expect(performanceMarks).toContain('aquarium:assets:environment:start')
    expect(performanceMeasures).toContain(
      'aquarium:assets:textures:aquarium:assets:textures:start:aquarium:assets:textures:end'
    )
    expect(performanceMeasures).toContain(
      'aquarium:assets:models:aquarium:assets:models:start:aquarium:assets:models:end'
    )
    expect(performanceMeasures).toContain(
      'aquarium:assets:environment:aquarium:assets:environment:start:aquarium:assets:environment:end'
    )
  })

  it('treats invalid school models as unavailable so instancing can fall back safely', async () => {
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: createMultiMeshScene() }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'fish-angelfish-school', url: '/assets/models/fish/fish-angelfish-school.glb', usageTag: 'fish', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['fish-angelfish-school']).toBeNull()
  })

  it('accepts single skinned school meshes as static instancing sources', async () => {
    const schoolScene = new THREE.Group()
    const skinnedMesh = new THREE.SkinnedMesh(
      new THREE.BoxGeometry(1, 0.4, 0.7),
      new THREE.MeshStandardMaterial()
    )
    schoolScene.add(skinnedMesh)
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: schoolScene, animations: [new THREE.AnimationClip('Swim', 1, [])] }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'fish-clownfish-school', url: '/assets/models/fish/fish-clownfish-school.glb', usageTag: 'fish', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['fish-clownfish-school']).not.toBeNull()
    expect(assets.models['fish-clownfish-school']?.sourceMesh).toBe(skinnedMesh)
  })

  it('treats multi-mesh hero fish models as valid and preserves the authored scene', async () => {
    const heroScene = createMultiMeshScene()
    const animationClip = new THREE.AnimationClip('Swim', 1, [])
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: heroScene, animations: [animationClip] }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'fish-angelfish-hero', url: '/assets/models/fish/fish-angelfish-hero.glb', usageTag: 'fish', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['fish-angelfish-hero']).not.toBeNull()
    expect(assets.models['fish-angelfish-hero']?.scene).toBe(heroScene)
    expect(assets.models['fish-angelfish-hero']?.sourceMesh).toBeNull()
    expect(assets.models['fish-angelfish-hero']?.animations).toEqual([animationClip])
  })

  it('treats hardscape and plant assets as valid when only the scene is available', async () => {
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: createMultiMeshScene() }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'driftwood-hero', url: '/assets/models/driftwood/driftwood-hero.glb', usageTag: 'wood', lod: 'high' },
        { id: 'plant-matsumo', url: '/assets/models/plants/plant-matsumo.glb', usageTag: 'plant', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['driftwood-hero']).not.toBeNull()
    expect(assets.models['driftwood-hero']?.sourceMesh).toBeNull()
    expect(assets.models['plant-matsumo']).not.toBeNull()
    expect(assets.models['plant-matsumo']?.sourceMesh).toBeNull()
  })

  it('returns null for missing authored substrate textures so scene fallback can substitute procedural maps', async () => {
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('substrate-sand-normal.png')) {
          throw new Error('missing authored normal')
        }
        return createImageTexture()
      })
    }

    const assets = await loadVisualAssets({
      textures: [
        { id: 'substrate-sand-albedo', url: '/assets/textures/substrate/substrate-sand-albedo.png', usageTag: 'rock', lod: 'high' },
        { id: 'substrate-sand-normal', url: '/assets/textures/substrate/substrate-sand-normal.png', usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
        { id: 'substrate-sand-roughness', url: '/assets/textures/substrate/substrate-sand-roughness.png', usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
        { id: 'substrate-sand-ao', url: '/assets/textures/substrate/substrate-sand-ao.png', usageTag: 'rock', lod: 'medium', colorSpace: 'linear' }
      ],
      models: [],
      environment: []
    }, {
      textureLoader
    })

    expect(assets.textures['substrate-sand-albedo']).toBeInstanceOf(THREE.Texture)
    expect(assets.textures['substrate-sand-normal']).toBeNull()
    expect(assets.textures['substrate-sand-roughness']).toBeInstanceOf(THREE.Texture)
    expect(assets.textures['substrate-sand-ao']).toBeInstanceOf(THREE.Texture)
  })
})

describe('public aquarium asset urls', () => {
  it('splits startup-critical assets from deferred optional fish assets', () => {
    const bootManifest = createBootAquariumAssetManifest('/')
    const deferredManifest = createDeferredAquariumAssetManifest('/')
    const bootTextureIds = new Set(bootManifest.textures.map((entry) => entry.id))
    const bootModelIds = new Set(bootManifest.models.map((entry) => entry.id))
    const deferredTextureIds = new Set(deferredManifest.textures.map((entry) => entry.id))
    const deferredModelIds = new Set(deferredManifest.models.map((entry) => entry.id))

    expect(bootTextureIds.has('leaf-diffuse')).toBe(true)
    expect(bootTextureIds.has('substrate-sand-normal')).toBe(true)
    expect(bootTextureIds.has('fish-neon-basecolor')).toBe(true)
    expect(bootTextureIds.has('fish-goldfish-basecolor')).toBe(false)
    expect(bootModelIds.has('plant-amazon-sword')).toBe(true)
    expect(bootModelIds.has('driftwood-hero')).toBe(true)
    expect(bootModelIds.has('fish-neon-school')).toBe(true)
    expect(bootModelIds.has('fish-goldfish-hero')).toBe(false)

    expect(deferredTextureIds.has('fish-goldfish-basecolor')).toBe(true)
    expect(deferredTextureIds.has('fish-neon-basecolor')).toBe(false)
    expect(deferredModelIds.has('fish-goldfish-hero')).toBe(true)
    expect(deferredModelIds.has('plant-amazon-sword')).toBe(false)
    expect(bootManifest.environment).toHaveLength(1)
    expect(deferredManifest.environment).toHaveLength(0)
  })

  it('uses authored fish texture atlases instead of fish SVG diffuse assets', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureIds = new Set(manifest.textures.map((entry) => entry.id))
    const textureUrls = manifest.textures.map((entry) => entry.url)

    expect(textureIds.has('fish-neon')).toBe(false)
    expect(textureIds.has('fish-angelfish')).toBe(false)
    expect(textureIds.has('fish-goldfish')).toBe(false)
    expect(textureIds.has('fish-tropical')).toBe(false)

    expect(textureIds.has('fish-neon-basecolor')).toBe(true)
    expect(textureIds.has('fish-neon-normal')).toBe(true)
    expect(textureIds.has('fish-neon-roughness')).toBe(true)
    expect(textureIds.has('fish-neon-alpha')).toBe(true)
    expect(textureIds.has('fish-tropical-basecolor')).toBe(true)
    expect(textureIds.has('fish-tropical-normal')).toBe(true)
    expect(textureIds.has('fish-tropical-roughness')).toBe(true)
    expect(textureIds.has('fish-tropical-alpha')).toBe(true)
    expect(textureIds.has('fish-angelfish-basecolor')).toBe(true)
    expect(textureIds.has('fish-angelfish-normal')).toBe(true)
    expect(textureIds.has('fish-angelfish-roughness')).toBe(true)
    expect(textureIds.has('fish-angelfish-alpha')).toBe(true)
    expect(textureIds.has('fish-butterflyfish-basecolor')).toBe(true)
    expect(textureIds.has('fish-butterflyfish-normal')).toBe(true)
    expect(textureIds.has('fish-butterflyfish-roughness')).toBe(true)
    expect(textureIds.has('fish-butterflyfish-alpha')).toBe(true)
    expect(textureIds.has('fish-goldfish-basecolor')).toBe(true)
    expect(textureIds.has('fish-goldfish-normal')).toBe(true)
    expect(textureIds.has('fish-goldfish-roughness')).toBe(true)
    expect(textureIds.has('fish-goldfish-alpha')).toBe(true)
    expect(textureIds.has('fish-scale-normal')).toBe(true)
    expect(textureIds.has('fish-scale-roughness')).toBe(true)

    expect(textureUrls.some((url) => url.endsWith('fish-neon.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('fish-angelfish.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('fish-goldfish.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('fish-tropical.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('fish-neon-basecolor.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('fish-butterflyfish-basecolor.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('fish-scale-normal.svg'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('fish-scale-roughness.svg'))).toBe(true)
  })

  it('exposes authored fish models including the animated clownfish hero and lightweight school', () => {
    const manifest = createAquariumAssetManifest('/')
    const modelIds = new Set(manifest.models.map((entry) => entry.id))
    const modelUrls = manifest.models.map((entry) => entry.url)

    expect(modelIds.has('fish-clownfish-school')).toBe(true)
    expect(modelIds.has('fish-clownfish-hero')).toBe(true)
    expect(modelIds.has('fish-tropical-school')).toBe(false)
    expect(modelIds.has('fish-tropical-hero')).toBe(false)
    expect(modelIds.has('fish-angelfish-school')).toBe(true)
    expect(modelIds.has('fish-angelfish-hero')).toBe(true)
    expect(modelIds.has('fish-butterflyfish-school')).toBe(true)
    expect(modelIds.has('fish-butterflyfish-hero')).toBe(true)
    expect(modelIds.has('fish-goldfish-school')).toBe(true)
    expect(modelIds.has('fish-goldfish-hero')).toBe(true)
    expect(modelIds.has('fish-abeni-puffer-school')).toBe(true)
    expect(modelIds.has('fish-abeni-puffer-hero')).toBe(true)
    expect(modelIds.has('fish-corydoras-school')).toBe(true)
    expect(modelIds.has('fish-corydoras-hero')).toBe(true)
    expect(modelIds.has('fish-african-lampeye-school')).toBe(true)
    expect(modelIds.has('fish-african-lampeye-hero')).toBe(true)
    expect(modelIds.has('fish-rasbora-heteromorpha-school')).toBe(true)
    expect(modelIds.has('fish-rasbora-heteromorpha-hero')).toBe(true)
    expect(modelIds.has('fish-yamato-shrimp-school')).toBe(true)
    expect(modelIds.has('fish-yamato-shrimp-hero')).toBe(true)
    expect(modelIds.has('plant-amazon-sword')).toBe(true)
    expect(modelIds.has('plant-matsumo')).toBe(true)
    expect(modelIds.has('plant-willow-moss')).toBe(true)
    expect(modelIds.has('plant-hygrophila-rear')).toBe(true)
    expect(modelIds.has('plant-vallisneria-tall')).toBe(true)

    expect(modelUrls.some((url) => url.endsWith('fish-clownfish-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-clownfish-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-tropical-school.glb'))).toBe(false)
    expect(modelUrls.some((url) => url.endsWith('fish-tropical-hero.glb'))).toBe(false)
    expect(modelUrls.some((url) => url.endsWith('fish-butterflyfish-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-butterflyfish-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-abeni-puffer-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-abeni-puffer-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-corydoras-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-corydoras-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-african-lampeye-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-african-lampeye-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-rasbora-heteromorpha-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-rasbora-heteromorpha-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-yamato-shrimp-school.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('fish-yamato-shrimp-hero.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('plant-amazon-sword.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('plant-matsumo.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('plant-willow-moss.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('plant-hygrophila-rear.glb'))).toBe(true)
    expect(modelUrls.some((url) => url.endsWith('plant-vallisneria-tall.glb'))).toBe(true)
  })

  it('does not register removed procedural plant fallback glbs', () => {
    const manifest = createAquariumAssetManifest('/')
    const modelIds = new Set(manifest.models.map((entry) => entry.id))
    const modelUrls = manifest.models.map((entry) => entry.url)
    const removedPlantIds = [
      'plant-anubias-nana-clump',
      'plant-anubias-petite-clump',
      'plant-crypt-brown',
      'plant-fan-cluster',
      'plant-javafern-large',
      'plant-javafern-narrow',
      'plant-stem-green-bush',
      'plant-sword-cluster'
    ]

    removedPlantIds.forEach((id) => {
      expect(modelIds.has(id)).toBe(false)
      expect(modelUrls.some((url) => url.endsWith(`${id}.glb`))).toBe(false)
    })
  })

  it('uses bark png textures for driftwood and exposes ao support for shared fallback maps', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureIds = new Set(manifest.textures.map((entry) => entry.id))
    const textureUrls = manifest.textures.map((entry) => entry.url)
    const modelIds = new Set(manifest.models.map((entry) => entry.id))
    const modelUrls = manifest.models.map((entry) => entry.url)

    expect(textureIds.has('driftwood-ao')).toBe(true)
    expect(textureIds.has('driftwood-bark-ao')).toBe(true)
    expect(textureIds.has('driftwood-bark-cavity-mask')).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-diffuse.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-normal.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-roughness.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-diffuse.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-normal.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-roughness.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-ao.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-bark-ao.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-bark-cavity-mask.png'))).toBe(true)
    expect(modelIds.has('driftwood-secondary-a')).toBe(false)
    expect(modelIds.has('driftwood-secondary-b')).toBe(false)
    expect(modelIds.has('driftwood-secondary-c')).toBe(false)
    expect(modelUrls.some((url) => url.endsWith('driftwood-secondary-a.glb'))).toBe(false)
    expect(modelUrls.some((url) => url.endsWith('driftwood-secondary-b.glb'))).toBe(false)
    expect(modelUrls.some((url) => url.endsWith('driftwood-secondary-c.glb'))).toBe(false)

    const driftwoodHero = readGlbJson('public/assets/models/driftwood/driftwood-hero.glb')
    expect((driftwoodHero.images as unknown[] | undefined)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('uses authored png textures for shared leaf, rock, and backdrop assets while preserving stable ids', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(textureUrlsById.get('leaf-diffuse')).toBe('/assets/textures/plants/leaf-diffuse.png')
    expect(textureUrlsById.get('leaf-alpha')).toBe('/assets/textures/plants/leaf-alpha.png')
    expect(textureUrlsById.get('leaf-normal')).toBe('/assets/textures/plants/leaf-normal.png')
    expect(textureUrlsById.get('leaf-roughness')).toBe('/assets/textures/plants/leaf-roughness.png')
    expect(textureUrlsById.get('rock-diffuse')).toBe('/assets/textures/rocks/rock-diffuse.png')
    expect(textureUrlsById.get('rock-normal')).toBe('/assets/textures/rocks/rock-normal.png')
    expect(textureUrlsById.get('rock-roughness')).toBe('/assets/textures/rocks/rock-roughness.png')
    expect(textureUrlsById.get('backdrop-depth')).toBe('/assets/textures/backdrop/backdrop-depth.png')

    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-diffuse.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-alpha.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-diffuse.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('backdrop-depth.svg'))).toBe(false)
  })

  it('omits removed support rock glbs while keeping the authored hero ridge model', () => {
    const manifest = createAquariumAssetManifest('/')
    const modelUrlsById = new Map(manifest.models.map((entry) => [entry.id, entry.url]))

    expect(modelUrlsById.get('rock-ridge-hero')).toBe('/assets/models/rocks/rock-ridge-hero.glb')
    expect(modelUrlsById.has('rock-support-a')).toBe(false)
    expect(modelUrlsById.has('rock-support-b')).toBe(false)
    expect(modelUrlsById.has('rock-support-c')).toBe(false)
    expect(modelUrlsById.has('rock-pebble-cluster')).toBe(false)

    const rockRidgeHero = readGlbJson('public/assets/models/rocks/rock-ridge-hero.glb')
    expect((rockRidgeHero.images as unknown[] | undefined)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('omits removed nature showcase base-cluster and transition rock glbs', () => {
    const manifest = createAquariumAssetManifest('/')
    const modelUrlsById = new Map(manifest.models.map((entry) => [entry.id, entry.url]))

    expect(modelUrlsById.has('rock-lava-base-cluster-a')).toBe(false)
    expect(modelUrlsById.has('rock-lava-base-cluster-b')).toBe(false)
    expect(modelUrlsById.has('rock-lava-transition-chips')).toBe(false)
  })

  it('uses authored png pbr textures for substrate sand while keeping the stable texture ids', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(textureUrlsById.get('substrate-sand-albedo')).toBe('/assets/textures/substrate/substrate-sand-albedo.png')
    expect(textureUrlsById.get('substrate-sand-normal')).toBe('/assets/textures/substrate/substrate-sand-normal.png')
    expect(textureUrlsById.get('substrate-sand-roughness')).toBe('/assets/textures/substrate/substrate-sand-roughness.png')
    expect(textureUrlsById.get('substrate-sand-ao')).toBe('/assets/textures/substrate/substrate-sand-ao.png')

    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-albedo.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-ao.svg'))).toBe(false)
  })

  it('resolves public asset urls through BASE_URL without hardcoding a leading slash', () => {
    expect(resolvePublicAssetUrl('assets/models/fish/fish-neon-school.glb', '/meaningless/')).toBe(
      '/meaningless/assets/models/fish/fish-neon-school.glb'
    )

    const manifest = createAquariumAssetManifest('/meaningless/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(manifest.textures[0]?.url.startsWith('/meaningless/assets/')).toBe(true)
    expect(manifest.models[0]?.url.startsWith('/meaningless/assets/')).toBe(true)
    expect(manifest.environment[0]?.url).toBe('/meaningless/assets/environment/aquarium-hdri.hdr')
    expect(textureUrlsById.get('leaf-diffuse')).toBe('/meaningless/assets/textures/plants/leaf-diffuse.png')
    expect(textureUrlsById.get('leaf-alpha')).toBe('/meaningless/assets/textures/plants/leaf-alpha.png')
    expect(textureUrlsById.get('leaf-normal')).toBe('/meaningless/assets/textures/plants/leaf-normal.png')
    expect(textureUrlsById.get('leaf-roughness')).toBe('/meaningless/assets/textures/plants/leaf-roughness.png')
    expect(textureUrlsById.get('rock-diffuse')).toBe('/meaningless/assets/textures/rocks/rock-diffuse.png')
    expect(textureUrlsById.get('rock-normal')).toBe('/meaningless/assets/textures/rocks/rock-normal.png')
    expect(textureUrlsById.get('rock-roughness')).toBe('/meaningless/assets/textures/rocks/rock-roughness.png')
    expect(textureUrlsById.get('backdrop-depth')).toBe('/meaningless/assets/textures/backdrop/backdrop-depth.png')
    expect(textureUrlsById.get('substrate-sand-albedo')).toBe('/meaningless/assets/textures/substrate/substrate-sand-albedo.png')
    expect(textureUrlsById.get('substrate-sand-normal')).toBe('/meaningless/assets/textures/substrate/substrate-sand-normal.png')
    expect(textureUrlsById.get('substrate-sand-roughness')).toBe('/meaningless/assets/textures/substrate/substrate-sand-roughness.png')
    expect(textureUrlsById.get('substrate-sand-ao')).toBe('/meaningless/assets/textures/substrate/substrate-sand-ao.png')
    const modelUrlsById = new Map(manifest.models.map((entry) => [entry.id, entry.url]))
    expect(modelUrlsById.has('rock-lava-base-cluster-a')).toBe(false)
    expect(modelUrlsById.has('rock-lava-base-cluster-b')).toBe(false)
    expect(modelUrlsById.has('rock-lava-transition-chips')).toBe(false)
  })
})
