import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { loadVisualAssets, type AssetManifest } from './visualAssets'

describe('loadVisualAssets', () => {
  it('loads textures by id and falls back to null when a texture fails', async () => {
    const textureLoader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes('missing')) {
          throw new Error('missing texture')
        }
        return new THREE.Texture()
      })
    }

    const manifest: AssetManifest = {
      textures: [
        { id: 'leaf-diffuse', url: '/assets/aquarium/leaf-diffuse.svg', usageTag: 'plant', lod: 'high' },
        { id: 'missing-texture', url: '/assets/aquarium/missing.svg', usageTag: 'fish', lod: 'medium' }
      ],
      models: []
    }

    const assets = await loadVisualAssets(manifest, { textureLoader })

    expect(textureLoader.loadAsync).toHaveBeenCalledTimes(2)
    expect(assets.textures['leaf-diffuse']).toBeInstanceOf(THREE.Texture)
    expect(assets.textures['missing-texture']).toBeNull()
  })
})
