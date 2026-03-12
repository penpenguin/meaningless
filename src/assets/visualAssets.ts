import * as THREE from 'three'

export type AssetUsageTag = 'plant' | 'rock' | 'wood' | 'fish' | 'water' | 'glass' | 'backdrop'
export type AssetLod = 'low' | 'medium' | 'high'

export type ManifestTextureEntry = {
  id: string
  url: string
  usageTag: AssetUsageTag
  lod: AssetLod
  colorSpace?: 'srgb' | 'linear'
}

export type ManifestModelEntry = {
  id: string
  url: string
  usageTag: AssetUsageTag
  lod: AssetLod
}

export type AssetManifest = {
  textures: ManifestTextureEntry[]
  models: ManifestModelEntry[]
}

export type VisualAssetBundle = {
  manifest: AssetManifest
  textures: Record<string, THREE.Texture | null>
  models: Record<string, string | null>
}

const configureTexture = (texture: THREE.Texture, entry: ManifestTextureEntry): THREE.Texture => {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = entry.colorSpace === 'linear' ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.userData.sharedAsset = true
  texture.needsUpdate = true
  return texture
}

export const aquariumAssetManifest: AssetManifest = {
  textures: [
    { id: 'leaf-diffuse', url: '/assets/aquarium/leaf-diffuse.svg', usageTag: 'plant', lod: 'high' },
    { id: 'leaf-alpha', url: '/assets/aquarium/leaf-alpha.svg', usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-normal', url: '/assets/aquarium/leaf-normal.svg', usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-roughness', url: '/assets/aquarium/leaf-roughness.svg', usageTag: 'plant', lod: 'medium', colorSpace: 'linear' },
    { id: 'rock-diffuse', url: '/assets/aquarium/rock-diffuse.svg', usageTag: 'rock', lod: 'high' },
    { id: 'rock-normal', url: '/assets/aquarium/rock-normal.svg', usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
    { id: 'rock-roughness', url: '/assets/aquarium/rock-roughness.svg', usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
    { id: 'driftwood-diffuse', url: '/assets/aquarium/driftwood-diffuse.svg', usageTag: 'wood', lod: 'high' },
    { id: 'driftwood-normal', url: '/assets/aquarium/driftwood-normal.svg', usageTag: 'wood', lod: 'high', colorSpace: 'linear' },
    { id: 'driftwood-roughness', url: '/assets/aquarium/driftwood-roughness.svg', usageTag: 'wood', lod: 'medium', colorSpace: 'linear' },
    { id: 'backdrop-depth', url: '/assets/aquarium/backdrop-depth.svg', usageTag: 'backdrop', lod: 'high' },
    { id: 'fish-tropical', url: '/assets/aquarium/fish-tropical.svg', usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish', url: '/assets/aquarium/fish-angelfish.svg', usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon', url: '/assets/aquarium/fish-neon.svg', usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish', url: '/assets/aquarium/fish-goldfish.svg', usageTag: 'fish', lod: 'high' },
    { id: 'fish-scale-normal', url: '/assets/aquarium/fish-scale-normal.svg', usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-scale-roughness', url: '/assets/aquarium/fish-scale-roughness.svg', usageTag: 'fish', lod: 'medium', colorSpace: 'linear' }
  ],
  models: []
}

export const loadVisualAssets = async (
  manifest: AssetManifest = aquariumAssetManifest,
  options: {
    textureLoader?: Pick<THREE.TextureLoader, 'loadAsync'>
  } = {}
): Promise<VisualAssetBundle> => {
  const textureLoader = options.textureLoader ?? new THREE.TextureLoader()
  const textureEntries = await Promise.all(
    manifest.textures.map(async (entry) => {
      try {
        const texture = await textureLoader.loadAsync(entry.url)
        return [entry.id, configureTexture(texture, entry)] as const
      } catch {
        return [entry.id, null] as const
      }
    })
  )

  return {
    manifest,
    textures: Object.fromEntries(textureEntries),
    models: Object.fromEntries(manifest.models.map((entry) => [entry.id, entry.url]))
  }
}
