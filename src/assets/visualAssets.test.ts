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
})

describe('public aquarium asset urls', () => {
  it('resolves public asset urls through BASE_URL without hardcoding a leading slash', () => {
    expect(resolvePublicAssetUrl('assets/aquarium/fish-neon-school.glb', '/meaningless/')).toBe(
      '/meaningless/assets/aquarium/fish-neon-school.glb'
    )

    const manifest = createAquariumAssetManifest('/meaningless/')

    expect(manifest.textures[0]?.url.startsWith('/meaningless/assets/aquarium/')).toBe(true)
    expect(manifest.models[0]?.url.startsWith('/meaningless/assets/aquarium/')).toBe(true)
    expect(manifest.environment[0]?.url).toBe('/meaningless/assets/aquarium/aquarium-hdri.hdr')
  })
})
