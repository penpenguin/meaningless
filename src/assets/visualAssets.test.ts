import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  createAquariumAssetManifest,
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

describe('loadVisualAssets', () => {
  it('loads textures, models, and hdri assets by id and falls back to null on failure', async () => {
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('missing')) {
          throw new Error('missing texture')
        }
        return new THREE.Texture()
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
        { id: 'leaf-diffuse', url: '/assets/aquarium/leaf-diffuse.svg', usageTag: 'plant', lod: 'high' },
        { id: 'missing-texture', url: '/assets/aquarium/missing.svg', usageTag: 'fish', lod: 'medium' }
      ],
      models: [
        { id: 'fish-neon-school', url: '/assets/aquarium/fish-neon-school.glb', usageTag: 'fish', lod: 'high' },
        { id: 'missing-model', url: '/assets/aquarium/missing.glb', usageTag: 'fish', lod: 'medium' }
      ],
      environment: [
        { id: 'aquarium-hdri', url: '/assets/aquarium/aquarium-hdri.hdr', usageTag: 'environment', lod: 'high' },
        { id: 'missing-hdri', url: '/assets/aquarium/missing.hdr', usageTag: 'environment', lod: 'medium' }
      ]
    }

    const assets = await loadVisualAssets(manifest, { textureLoader, gltfLoader, hdriLoader })

    expect(textureLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(gltfLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(hdriLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(assets.textures['leaf-diffuse']).toBeInstanceOf(THREE.Texture)
    expect(assets.textures['missing-texture']).toBeNull()
    expect(assets.models['fish-neon-school']?.sourceMesh).toBeInstanceOf(THREE.Mesh)
    expect(assets.models['missing-model']).toBeNull()
    expect(assets.environment['aquarium-hdri']).toBeInstanceOf(THREE.Texture)
    expect(assets.environment['missing-hdri']).toBeNull()
  })

  it('treats invalid school models as unavailable so instancing can fall back safely', async () => {
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: createMultiMeshScene() }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'fish-angelfish-school', url: '/assets/aquarium/fish-angelfish-school.glb', usageTag: 'fish', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['fish-angelfish-school']).toBeNull()
  })

  it('treats multi-mesh hero fish models as valid and preserves the authored scene', async () => {
    const heroScene = createMultiMeshScene()
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: heroScene }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'fish-angelfish-hero', url: '/assets/aquarium/fish-angelfish-hero.glb', usageTag: 'fish', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['fish-angelfish-hero']).not.toBeNull()
    expect(assets.models['fish-angelfish-hero']?.scene).toBe(heroScene)
    expect(assets.models['fish-angelfish-hero']?.sourceMesh).toBeNull()
  })

  it('treats hardscape and plant assets as valid when only the scene is available', async () => {
    const gltfLoader = {
      loadAsync: vi.fn(async () => ({ scene: createMultiMeshScene() }))
    }

    const assets = await loadVisualAssets({
      textures: [],
      models: [
        { id: 'driftwood-hero', url: '/assets/aquarium/driftwood-hero.glb', usageTag: 'wood', lod: 'high' },
        { id: 'plant-fan-cluster', url: '/assets/aquarium/plant-fan-cluster.glb', usageTag: 'plant', lod: 'high' }
      ],
      environment: []
    }, {
      gltfLoader
    })

    expect(assets.models['driftwood-hero']).not.toBeNull()
    expect(assets.models['driftwood-hero']?.sourceMesh).toBeNull()
    expect(assets.models['plant-fan-cluster']).not.toBeNull()
    expect(assets.models['plant-fan-cluster']?.sourceMesh).toBeNull()
  })

  it('returns null for missing authored substrate textures so scene fallback can substitute procedural maps', async () => {
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('substrate-sand-normal.png')) {
          throw new Error('missing authored normal')
        }
        return new THREE.Texture()
      })
    }

    const assets = await loadVisualAssets({
      textures: [
        { id: 'substrate-sand-albedo', url: '/assets/aquarium/substrate-sand-albedo.png', usageTag: 'rock', lod: 'high' },
        { id: 'substrate-sand-normal', url: '/assets/aquarium/substrate-sand-normal.png', usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
        { id: 'substrate-sand-roughness', url: '/assets/aquarium/substrate-sand-roughness.png', usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
        { id: 'substrate-sand-ao', url: '/assets/aquarium/substrate-sand-ao.png', usageTag: 'rock', lod: 'medium', colorSpace: 'linear' }
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
    expect(textureUrls.some((url) => url.endsWith('fish-scale-normal.svg'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('fish-scale-roughness.svg'))).toBe(true)
  })

  it('uses bark png textures for driftwood and exposes ao support for shared fallback maps', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureIds = new Set(manifest.textures.map((entry) => entry.id))
    const textureUrls = manifest.textures.map((entry) => entry.url)

    expect(textureIds.has('driftwood-ao')).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-diffuse.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-normal.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-roughness.svg'))).toBe(false)
    expect(textureUrls.some((url) => url.endsWith('driftwood-diffuse.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-normal.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-roughness.png'))).toBe(true)
    expect(textureUrls.some((url) => url.endsWith('driftwood-ao.png'))).toBe(true)
  })

  it('uses authored png textures for shared leaf, rock, and backdrop assets while preserving stable ids', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(textureUrlsById.get('leaf-diffuse')).toBe('/assets/aquarium/leaf-diffuse.png')
    expect(textureUrlsById.get('leaf-alpha')).toBe('/assets/aquarium/leaf-alpha.png')
    expect(textureUrlsById.get('leaf-normal')).toBe('/assets/aquarium/leaf-normal.png')
    expect(textureUrlsById.get('leaf-roughness')).toBe('/assets/aquarium/leaf-roughness.png')
    expect(textureUrlsById.get('rock-diffuse')).toBe('/assets/aquarium/rock-diffuse.png')
    expect(textureUrlsById.get('rock-normal')).toBe('/assets/aquarium/rock-normal.png')
    expect(textureUrlsById.get('rock-roughness')).toBe('/assets/aquarium/rock-roughness.png')
    expect(textureUrlsById.get('backdrop-depth')).toBe('/assets/aquarium/backdrop-depth.png')

    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-diffuse.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-alpha.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('leaf-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-diffuse.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('rock-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('backdrop-depth.svg'))).toBe(false)
  })

  it('registers authored support rock glbs for the asset-backed aquascape support path', () => {
    const manifest = createAquariumAssetManifest('/')
    const modelUrlsById = new Map(manifest.models.map((entry) => [entry.id, entry.url]))

    expect(modelUrlsById.get('rock-ridge-hero')).toBe('/assets/aquarium/rock-ridge-hero.glb')
    expect(modelUrlsById.get('rock-support-a')).toBe('/assets/aquarium/rock-support-a.glb')
    expect(modelUrlsById.get('rock-support-b')).toBe('/assets/aquarium/rock-support-b.glb')
    expect(modelUrlsById.get('rock-support-c')).toBe('/assets/aquarium/rock-support-c.glb')
    expect(modelUrlsById.get('rock-pebble-cluster')).toBe('/assets/aquarium/rock-pebble-cluster.glb')
  })

  it('uses authored png pbr textures for substrate sand while keeping the stable texture ids', () => {
    const manifest = createAquariumAssetManifest('/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(textureUrlsById.get('substrate-sand-albedo')).toBe('/assets/aquarium/substrate-sand-albedo.png')
    expect(textureUrlsById.get('substrate-sand-normal')).toBe('/assets/aquarium/substrate-sand-normal.png')
    expect(textureUrlsById.get('substrate-sand-roughness')).toBe('/assets/aquarium/substrate-sand-roughness.png')
    expect(textureUrlsById.get('substrate-sand-ao')).toBe('/assets/aquarium/substrate-sand-ao.png')

    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-albedo.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-normal.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-roughness.svg'))).toBe(false)
    expect(Array.from(textureUrlsById.values()).some((url) => url.endsWith('substrate-sand-ao.svg'))).toBe(false)
  })

  it('resolves public asset urls through BASE_URL without hardcoding a leading slash', () => {
    expect(resolvePublicAssetUrl('assets/aquarium/fish-neon-school.glb', '/meaningless/')).toBe(
      '/meaningless/assets/aquarium/fish-neon-school.glb'
    )

    const manifest = createAquariumAssetManifest('/meaningless/')
    const textureUrlsById = new Map(manifest.textures.map((entry) => [entry.id, entry.url]))

    expect(manifest.textures[0]?.url.startsWith('/meaningless/assets/aquarium/')).toBe(true)
    expect(manifest.models[0]?.url.startsWith('/meaningless/assets/aquarium/')).toBe(true)
    expect(manifest.environment[0]?.url).toBe('/meaningless/assets/aquarium/aquarium-hdri.hdr')
    expect(textureUrlsById.get('leaf-diffuse')).toBe('/meaningless/assets/aquarium/leaf-diffuse.png')
    expect(textureUrlsById.get('leaf-alpha')).toBe('/meaningless/assets/aquarium/leaf-alpha.png')
    expect(textureUrlsById.get('leaf-normal')).toBe('/meaningless/assets/aquarium/leaf-normal.png')
    expect(textureUrlsById.get('leaf-roughness')).toBe('/meaningless/assets/aquarium/leaf-roughness.png')
    expect(textureUrlsById.get('rock-diffuse')).toBe('/meaningless/assets/aquarium/rock-diffuse.png')
    expect(textureUrlsById.get('rock-normal')).toBe('/meaningless/assets/aquarium/rock-normal.png')
    expect(textureUrlsById.get('rock-roughness')).toBe('/meaningless/assets/aquarium/rock-roughness.png')
    expect(textureUrlsById.get('backdrop-depth')).toBe('/meaningless/assets/aquarium/backdrop-depth.png')
    expect(textureUrlsById.get('substrate-sand-albedo')).toBe('/meaningless/assets/aquarium/substrate-sand-albedo.png')
    expect(textureUrlsById.get('substrate-sand-normal')).toBe('/meaningless/assets/aquarium/substrate-sand-normal.png')
    expect(textureUrlsById.get('substrate-sand-roughness')).toBe('/meaningless/assets/aquarium/substrate-sand-roughness.png')
    expect(textureUrlsById.get('substrate-sand-ao')).toBe('/meaningless/assets/aquarium/substrate-sand-ao.png')
  })
})
