import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export type AssetUsageTag =
  | 'plant'
  | 'rock'
  | 'wood'
  | 'fish'
  | 'water'
  | 'glass'
  | 'backdrop'
  | 'environment'

export type AssetLod = 'low' | 'medium' | 'high'

export type ManifestTextureEntry = {
  id: string
  url: string
  usageTag: Exclude<AssetUsageTag, 'environment'>
  lod: AssetLod
  colorSpace?: 'srgb' | 'linear'
}

export type ManifestModelEntry = {
  id: string
  url: string
  usageTag: Exclude<AssetUsageTag, 'environment'>
  lod: AssetLod
}

export type ManifestEnvironmentEntry = {
  id: string
  url: string
  usageTag: 'environment'
  lod: AssetLod
}

export type AssetManifest = {
  textures: ManifestTextureEntry[]
  models: ManifestModelEntry[]
  environment: ManifestEnvironmentEntry[]
}

export type LoadedModelAsset = {
  scene: THREE.Group
  sourceMesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null
}

export type VisualAssetBundle = {
  manifest: AssetManifest
  textures: Record<string, THREE.Texture | null>
  models: Record<string, LoadedModelAsset | null>
  environment: Record<string, THREE.Texture | null>
}

type TextureLoaderLike = Pick<THREE.TextureLoader, 'loadAsync'>
type GLTFLoaderLike = {
  loadAsync(url: string): Promise<{ scene: THREE.Object3D | THREE.Group }>
}
type HDRILoaderLike = Pick<RGBELoader, 'loadAsync'>

const materialTextureKeys = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'displacementMap',
  'emissiveMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap'
] as const

type MaterialWithMaps = THREE.Material & {
  [K in (typeof materialTextureKeys)[number]]?: THREE.Texture | null
}

const markSharedTexture = (texture: THREE.Texture | null | undefined): void => {
  if (!texture) return
  texture.userData.sharedAsset = true
}

const markSharedMaterial = (material: THREE.Material): void => {
  material.userData.sharedAsset = true
  const texturedMaterial = material as MaterialWithMaps
  materialTextureKeys.forEach((key) => {
    markSharedTexture(texturedMaterial[key] ?? null)
  })
}

const markSharedObjectResources = (root: THREE.Object3D): void => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if ('geometry' in mesh && mesh.geometry) {
      mesh.geometry.userData.sharedAsset = true
    }

    const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
    if (Array.isArray(material)) {
      material.forEach((entry) => markSharedMaterial(entry))
      return
    }
    if (material instanceof THREE.Material) {
      markSharedMaterial(material)
    }
  })
}

const wrapAsGroup = (root: THREE.Object3D | THREE.Group): THREE.Group => {
  if (root instanceof THREE.Group) {
    return root
  }
  const group = new THREE.Group()
  group.add(root)
  return group
}

const extractSingleSourceMesh = (
  root: THREE.Object3D
): THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null => {
  const meshes: Array<THREE.Mesh<THREE.BufferGeometry, THREE.Material>> = []

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
    if (!(mesh instanceof THREE.Mesh) || Array.isArray(material)) return
    if ((mesh as THREE.Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) return
    meshes.push(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>)
  })

  return meshes.length === 1 ? meshes[0] : null
}

const configureTexture = (texture: THREE.Texture, entry: ManifestTextureEntry): THREE.Texture => {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = entry.colorSpace === 'linear' ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.userData.sharedAsset = true
  texture.needsUpdate = true
  return texture
}

const configureEnvironmentTexture = (texture: THREE.Texture): THREE.Texture => {
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.userData.sharedAsset = true
  texture.needsUpdate = true
  return texture
}

const loadModelAsset = async (
  entry: ManifestModelEntry,
  loader: GLTFLoaderLike
): Promise<LoadedModelAsset | null> => {
  try {
    const gltf = await loader.loadAsync(entry.url)
    const scene = wrapAsGroup(gltf.scene)
    markSharedObjectResources(scene)

    const sourceMesh = extractSingleSourceMesh(scene)
    if (entry.id.endsWith('-school') && !sourceMesh) {
      return null
    }

    return {
      scene,
      sourceMesh
    }
  } catch {
    return null
  }
}

export const resolvePublicAssetUrl = (
  assetPath: string,
  baseUrl: string = import.meta.env.BASE_URL ?? '/'
): string => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = assetPath.replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`
}

export const createAquariumAssetManifest = (
  baseUrl: string = import.meta.env.BASE_URL ?? '/'
): AssetManifest => ({
  textures: [
    { id: 'leaf-diffuse', url: resolvePublicAssetUrl('assets/aquarium/leaf-diffuse.svg', baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'leaf-alpha', url: resolvePublicAssetUrl('assets/aquarium/leaf-alpha.svg', baseUrl), usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-normal', url: resolvePublicAssetUrl('assets/aquarium/leaf-normal.svg', baseUrl), usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-roughness', url: resolvePublicAssetUrl('assets/aquarium/leaf-roughness.svg', baseUrl), usageTag: 'plant', lod: 'medium', colorSpace: 'linear' },
    { id: 'rock-diffuse', url: resolvePublicAssetUrl('assets/aquarium/rock-diffuse.svg', baseUrl), usageTag: 'rock', lod: 'high' },
    { id: 'rock-normal', url: resolvePublicAssetUrl('assets/aquarium/rock-normal.svg', baseUrl), usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
    { id: 'rock-roughness', url: resolvePublicAssetUrl('assets/aquarium/rock-roughness.svg', baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
    { id: 'driftwood-diffuse', url: resolvePublicAssetUrl('assets/aquarium/driftwood-diffuse.svg', baseUrl), usageTag: 'wood', lod: 'high' },
    { id: 'driftwood-normal', url: resolvePublicAssetUrl('assets/aquarium/driftwood-normal.svg', baseUrl), usageTag: 'wood', lod: 'high', colorSpace: 'linear' },
    { id: 'driftwood-roughness', url: resolvePublicAssetUrl('assets/aquarium/driftwood-roughness.svg', baseUrl), usageTag: 'wood', lod: 'medium', colorSpace: 'linear' },
    { id: 'backdrop-depth', url: resolvePublicAssetUrl('assets/aquarium/backdrop-depth.svg', baseUrl), usageTag: 'backdrop', lod: 'high' },
    { id: 'fish-tropical', url: resolvePublicAssetUrl('assets/aquarium/fish-tropical.svg', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish', url: resolvePublicAssetUrl('assets/aquarium/fish-angelfish.svg', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon', url: resolvePublicAssetUrl('assets/aquarium/fish-neon.svg', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish', url: resolvePublicAssetUrl('assets/aquarium/fish-goldfish.svg', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-scale-normal', url: resolvePublicAssetUrl('assets/aquarium/fish-scale-normal.svg', baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-scale-roughness', url: resolvePublicAssetUrl('assets/aquarium/fish-scale-roughness.svg', baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'substrate-sand-albedo', url: resolvePublicAssetUrl('assets/aquarium/substrate-sand-albedo.svg', baseUrl), usageTag: 'rock', lod: 'high' },
    { id: 'substrate-sand-normal', url: resolvePublicAssetUrl('assets/aquarium/substrate-sand-normal.svg', baseUrl), usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
    { id: 'substrate-sand-roughness', url: resolvePublicAssetUrl('assets/aquarium/substrate-sand-roughness.svg', baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
    { id: 'substrate-sand-ao', url: resolvePublicAssetUrl('assets/aquarium/substrate-sand-ao.svg', baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' }
  ],
  models: [
    { id: 'fish-tropical-school', url: resolvePublicAssetUrl('assets/aquarium/fish-tropical-school.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-tropical-hero', url: resolvePublicAssetUrl('assets/aquarium/fish-tropical-hero.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish-school', url: resolvePublicAssetUrl('assets/aquarium/fish-angelfish-school.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish-hero', url: resolvePublicAssetUrl('assets/aquarium/fish-angelfish-hero.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon-school', url: resolvePublicAssetUrl('assets/aquarium/fish-neon-school.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon-hero', url: resolvePublicAssetUrl('assets/aquarium/fish-neon-hero.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish-school', url: resolvePublicAssetUrl('assets/aquarium/fish-goldfish-school.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish-hero', url: resolvePublicAssetUrl('assets/aquarium/fish-goldfish-hero.glb', baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'plant-sword-cluster', url: resolvePublicAssetUrl('assets/aquarium/plant-sword-cluster.glb', baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'plant-fan-cluster', url: resolvePublicAssetUrl('assets/aquarium/plant-fan-cluster.glb', baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'driftwood-hero', url: resolvePublicAssetUrl('assets/aquarium/driftwood-hero.glb', baseUrl), usageTag: 'wood', lod: 'high' },
    { id: 'rock-ridge-hero', url: resolvePublicAssetUrl('assets/aquarium/rock-ridge-hero.glb', baseUrl), usageTag: 'rock', lod: 'high' }
  ],
  environment: [
    { id: 'aquarium-hdri', url: resolvePublicAssetUrl('assets/aquarium/aquarium-hdri.hdr', baseUrl), usageTag: 'environment', lod: 'high' }
  ]
})

export const aquariumAssetManifest: AssetManifest = createAquariumAssetManifest()

export const loadVisualAssets = async (
  manifest: AssetManifest = aquariumAssetManifest,
  options: {
    textureLoader?: TextureLoaderLike
    gltfLoader?: GLTFLoaderLike
    hdriLoader?: HDRILoaderLike
  } = {}
): Promise<VisualAssetBundle> => {
  const textureLoader = options.textureLoader ?? new THREE.TextureLoader()
  const gltfLoader = options.gltfLoader ?? new GLTFLoader()
  const hdriLoader = options.hdriLoader ?? new RGBELoader()

  const [textureEntries, modelEntries, environmentEntries] = await Promise.all([
    Promise.all(
      manifest.textures.map(async (entry) => {
        try {
          const texture = await textureLoader.loadAsync(entry.url)
          return [entry.id, configureTexture(texture, entry)] as const
        } catch {
          return [entry.id, null] as const
        }
      })
    ),
    Promise.all(
      manifest.models.map(async (entry) => {
        const model = await loadModelAsset(entry, gltfLoader)
        return [entry.id, model] as const
      })
    ),
    Promise.all(
      manifest.environment.map(async (entry) => {
        try {
          const texture = await hdriLoader.loadAsync(entry.url)
          return [entry.id, configureEnvironmentTexture(texture)] as const
        } catch {
          return [entry.id, null] as const
        }
      })
    )
  ])

  return {
    manifest,
    textures: Object.fromEntries(textureEntries),
    models: Object.fromEntries(modelEntries),
    environment: Object.fromEntries(environmentEntries)
  }
}
