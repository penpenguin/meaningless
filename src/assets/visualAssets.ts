import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import {
  environmentAssetPath,
  fishModelAssetPath,
  fishTextureAssetPath,
  modelAssetPath,
  textureAssetPath
} from './assetPathConventions.js'
import type { AssetLoadTimingStats, PerformanceLike } from '../utils/performanceStats'

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
  animations?: THREE.AnimationClip[]
}

export type VisualAssetBundle = {
  manifest: AssetManifest
  textures: Record<string, THREE.Texture | null>
  models: Record<string, LoadedModelAsset | null>
  environment: Record<string, THREE.Texture | null>
  loadTimings?: AssetLoadTimingStats
}

type TextureLoaderLike = Pick<THREE.TextureLoader, 'loadAsync'>
type GLTFLoaderLike = {
  loadAsync(url: string): Promise<{ scene: THREE.Object3D | THREE.Group; animations?: THREE.AnimationClip[] }>
}
type HDRILoaderLike = Pick<RGBELoader, 'loadAsync'>
type AssetLoadClock = () => number

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
  root: THREE.Object3D,
  options: { allowSkinnedMesh?: boolean } = {}
): THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null => {
  const meshes: Array<THREE.Mesh<THREE.BufferGeometry, THREE.Material>> = []

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
    if (!(mesh instanceof THREE.Mesh) || Array.isArray(material)) return
    if ((mesh as THREE.Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh && !options.allowSkinnedMesh) return
    meshes.push(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material>)
  })

  return meshes.length === 1 ? meshes[0] : null
}

const requiresSingleSourceMesh = (entryId: string): boolean => entryId.endsWith('-school')

const acceptsSceneWithoutSourceMesh = (entryId: string): boolean => !requiresSingleSourceMesh(entryId)

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

    const sourceMesh = extractSingleSourceMesh(scene, {
      allowSkinnedMesh: requiresSingleSourceMesh(entry.id)
    })
    if (requiresSingleSourceMesh(entry.id) && !sourceMesh) {
      return null
    }
    if (!sourceMesh && !acceptsSceneWithoutSourceMesh(entry.id)) {
      return null
    }

    return {
      scene,
      sourceMesh,
      animations: gltf.animations ?? []
    }
  } catch {
    return null
  }
}

const measureAssetLoad = async <T>(
  now: AssetLoadClock,
  performanceLike: PerformanceLike | undefined,
  label: string,
  load: () => Promise<T>
): Promise<[T, number]> => {
  const startMark = `aquarium:assets:${label}:start`
  const endMark = `aquarium:assets:${label}:end`
  performanceLike?.mark?.(startMark)
  const start = now()
  const result = await load()
  const duration = Math.max(0, now() - start)
  performanceLike?.mark?.(endMark)
  performanceLike?.measure?.(`aquarium:assets:${label}`, startMark, endMark)
  performanceLike?.clearMarks?.(startMark)
  performanceLike?.clearMarks?.(endMark)
  return [result, duration]
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
    { id: 'leaf-diffuse', url: resolvePublicAssetUrl(textureAssetPath('plants', 'leaf-diffuse.png'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'leaf-alpha', url: resolvePublicAssetUrl(textureAssetPath('plants', 'leaf-alpha.png'), baseUrl), usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-normal', url: resolvePublicAssetUrl(textureAssetPath('plants', 'leaf-normal.png'), baseUrl), usageTag: 'plant', lod: 'high', colorSpace: 'linear' },
    { id: 'leaf-roughness', url: resolvePublicAssetUrl(textureAssetPath('plants', 'leaf-roughness.png'), baseUrl), usageTag: 'plant', lod: 'medium', colorSpace: 'linear' },
    { id: 'rock-diffuse', url: resolvePublicAssetUrl(textureAssetPath('rocks', 'rock-diffuse.png'), baseUrl), usageTag: 'rock', lod: 'high' },
    { id: 'rock-normal', url: resolvePublicAssetUrl(textureAssetPath('rocks', 'rock-normal.png'), baseUrl), usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
    { id: 'rock-roughness', url: resolvePublicAssetUrl(textureAssetPath('rocks', 'rock-roughness.png'), baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
    { id: 'driftwood-diffuse', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-diffuse.png'), baseUrl), usageTag: 'wood', lod: 'high' },
    { id: 'driftwood-normal', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-normal.png'), baseUrl), usageTag: 'wood', lod: 'high', colorSpace: 'linear' },
    { id: 'driftwood-roughness', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-roughness.png'), baseUrl), usageTag: 'wood', lod: 'medium', colorSpace: 'linear' },
    { id: 'driftwood-ao', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-ao.png'), baseUrl), usageTag: 'wood', lod: 'medium', colorSpace: 'linear' },
    { id: 'driftwood-bark-ao', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-bark-ao.png'), baseUrl), usageTag: 'wood', lod: 'high', colorSpace: 'linear' },
    { id: 'driftwood-bark-cavity-mask', url: resolvePublicAssetUrl(textureAssetPath('driftwood', 'driftwood-bark-cavity-mask.png'), baseUrl), usageTag: 'wood', lod: 'high', colorSpace: 'linear' },
    { id: 'backdrop-depth', url: resolvePublicAssetUrl(textureAssetPath('backdrop', 'backdrop-depth.png'), baseUrl), usageTag: 'backdrop', lod: 'high' },
    { id: 'fish-tropical-basecolor', url: resolvePublicAssetUrl(fishTextureAssetPath('tropical', 'basecolor'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-tropical-normal', url: resolvePublicAssetUrl(fishTextureAssetPath('tropical', 'normal'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-tropical-roughness', url: resolvePublicAssetUrl(fishTextureAssetPath('tropical', 'roughness'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-tropical-alpha', url: resolvePublicAssetUrl(fishTextureAssetPath('tropical', 'alpha'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-angelfish-basecolor', url: resolvePublicAssetUrl(fishTextureAssetPath('angelfish', 'basecolor'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish-normal', url: resolvePublicAssetUrl(fishTextureAssetPath('angelfish', 'normal'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-angelfish-roughness', url: resolvePublicAssetUrl(fishTextureAssetPath('angelfish', 'roughness'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-angelfish-alpha', url: resolvePublicAssetUrl(fishTextureAssetPath('angelfish', 'alpha'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-butterflyfish-basecolor', url: resolvePublicAssetUrl(fishTextureAssetPath('butterflyfish', 'basecolor'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-butterflyfish-normal', url: resolvePublicAssetUrl(fishTextureAssetPath('butterflyfish', 'normal'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-butterflyfish-roughness', url: resolvePublicAssetUrl(fishTextureAssetPath('butterflyfish', 'roughness'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-butterflyfish-alpha', url: resolvePublicAssetUrl(fishTextureAssetPath('butterflyfish', 'alpha'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-neon-basecolor', url: resolvePublicAssetUrl(fishTextureAssetPath('neon', 'basecolor'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon-normal', url: resolvePublicAssetUrl(fishTextureAssetPath('neon', 'normal'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-neon-roughness', url: resolvePublicAssetUrl(fishTextureAssetPath('neon', 'roughness'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-neon-alpha', url: resolvePublicAssetUrl(fishTextureAssetPath('neon', 'alpha'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-goldfish-basecolor', url: resolvePublicAssetUrl(fishTextureAssetPath('goldfish', 'basecolor'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish-normal', url: resolvePublicAssetUrl(fishTextureAssetPath('goldfish', 'normal'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-goldfish-roughness', url: resolvePublicAssetUrl(fishTextureAssetPath('goldfish', 'roughness'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-goldfish-alpha', url: resolvePublicAssetUrl(fishTextureAssetPath('goldfish', 'alpha'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'fish-scale-normal', url: resolvePublicAssetUrl(textureAssetPath('fish', 'fish-scale-normal.svg'), baseUrl), usageTag: 'fish', lod: 'high', colorSpace: 'linear' },
    { id: 'fish-scale-roughness', url: resolvePublicAssetUrl(textureAssetPath('fish', 'fish-scale-roughness.svg'), baseUrl), usageTag: 'fish', lod: 'medium', colorSpace: 'linear' },
    { id: 'substrate-sand-albedo', url: resolvePublicAssetUrl(textureAssetPath('substrate', 'substrate-sand-albedo.png'), baseUrl), usageTag: 'rock', lod: 'high' },
    { id: 'substrate-sand-normal', url: resolvePublicAssetUrl(textureAssetPath('substrate', 'substrate-sand-normal.png'), baseUrl), usageTag: 'rock', lod: 'high', colorSpace: 'linear' },
    { id: 'substrate-sand-roughness', url: resolvePublicAssetUrl(textureAssetPath('substrate', 'substrate-sand-roughness.png'), baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' },
    { id: 'substrate-sand-ao', url: resolvePublicAssetUrl(textureAssetPath('substrate', 'substrate-sand-ao.png'), baseUrl), usageTag: 'rock', lod: 'medium', colorSpace: 'linear' }
  ],
  models: [
    { id: 'fish-clownfish-school', url: resolvePublicAssetUrl(fishModelAssetPath('clownfish', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-clownfish-hero', url: resolvePublicAssetUrl(fishModelAssetPath('clownfish', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish-school', url: resolvePublicAssetUrl(fishModelAssetPath('angelfish', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-angelfish-hero', url: resolvePublicAssetUrl(fishModelAssetPath('angelfish', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-butterflyfish-school', url: resolvePublicAssetUrl(fishModelAssetPath('butterflyfish', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-butterflyfish-hero', url: resolvePublicAssetUrl(fishModelAssetPath('butterflyfish', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon-school', url: resolvePublicAssetUrl(fishModelAssetPath('neon', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-neon-hero', url: resolvePublicAssetUrl(fishModelAssetPath('neon', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish-school', url: resolvePublicAssetUrl(fishModelAssetPath('goldfish', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-goldfish-hero', url: resolvePublicAssetUrl(fishModelAssetPath('goldfish', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-abeni-puffer-school', url: resolvePublicAssetUrl(fishModelAssetPath('abeni-puffer', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-abeni-puffer-hero', url: resolvePublicAssetUrl(fishModelAssetPath('abeni-puffer', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-corydoras-school', url: resolvePublicAssetUrl(fishModelAssetPath('corydoras', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-corydoras-hero', url: resolvePublicAssetUrl(fishModelAssetPath('corydoras', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-african-lampeye-school', url: resolvePublicAssetUrl(fishModelAssetPath('african-lampeye', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-african-lampeye-hero', url: resolvePublicAssetUrl(fishModelAssetPath('african-lampeye', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-rasbora-heteromorpha-school', url: resolvePublicAssetUrl(fishModelAssetPath('rasbora-heteromorpha', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-rasbora-heteromorpha-hero', url: resolvePublicAssetUrl(fishModelAssetPath('rasbora-heteromorpha', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-yamato-shrimp-school', url: resolvePublicAssetUrl(fishModelAssetPath('yamato-shrimp', 'school'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'fish-yamato-shrimp-hero', url: resolvePublicAssetUrl(fishModelAssetPath('yamato-shrimp', 'hero'), baseUrl), usageTag: 'fish', lod: 'high' },
    { id: 'plant-amazon-sword', url: resolvePublicAssetUrl(modelAssetPath('plants', 'plant-amazon-sword.glb'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'plant-matsumo', url: resolvePublicAssetUrl(modelAssetPath('plants', 'plant-matsumo.glb'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'plant-willow-moss', url: resolvePublicAssetUrl(modelAssetPath('plants', 'plant-willow-moss.glb'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'plant-hygrophila-rear', url: resolvePublicAssetUrl(modelAssetPath('plants', 'plant-hygrophila-rear.glb'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'plant-vallisneria-tall', url: resolvePublicAssetUrl(modelAssetPath('plants', 'plant-vallisneria-tall.glb'), baseUrl), usageTag: 'plant', lod: 'high' },
    { id: 'driftwood-hero', url: resolvePublicAssetUrl(modelAssetPath('driftwood', 'driftwood-hero.glb'), baseUrl), usageTag: 'wood', lod: 'high' },
    { id: 'rock-ridge-hero', url: resolvePublicAssetUrl(modelAssetPath('rocks', 'rock-ridge-hero.glb'), baseUrl), usageTag: 'rock', lod: 'high' }
  ],
  environment: [
    { id: 'aquarium-hdri', url: resolvePublicAssetUrl(environmentAssetPath('aquarium-hdri.hdr'), baseUrl), usageTag: 'environment', lod: 'high' }
  ]
})

const bootFishTextureIds = new Set([
  'fish-neon-basecolor',
  'fish-neon-normal',
  'fish-neon-roughness',
  'fish-neon-alpha',
  'fish-scale-normal',
  'fish-scale-roughness'
])

const bootFishModelIds = new Set([
  'fish-neon-school',
  'fish-neon-hero'
])

const isBootTextureEntry = (entry: ManifestTextureEntry): boolean => (
  entry.usageTag !== 'fish' || bootFishTextureIds.has(entry.id)
)

const isBootModelEntry = (entry: ManifestModelEntry): boolean => (
  entry.usageTag !== 'fish' || bootFishModelIds.has(entry.id)
)

export const createBootAquariumAssetManifest = (
  baseUrl: string = import.meta.env.BASE_URL ?? '/'
): AssetManifest => {
  const manifest = createAquariumAssetManifest(baseUrl)
  return {
    textures: manifest.textures.filter(isBootTextureEntry),
    models: manifest.models.filter(isBootModelEntry),
    environment: manifest.environment
  }
}

export const createDeferredAquariumAssetManifest = (
  baseUrl: string = import.meta.env.BASE_URL ?? '/'
): AssetManifest => {
  const manifest = createAquariumAssetManifest(baseUrl)
  return {
    textures: manifest.textures.filter((entry) => !isBootTextureEntry(entry)),
    models: manifest.models.filter((entry) => !isBootModelEntry(entry)),
    environment: []
  }
}

export const aquariumAssetManifest: AssetManifest = createAquariumAssetManifest()

export const loadVisualAssets = async (
  manifest: AssetManifest = aquariumAssetManifest,
  options: {
    textureLoader?: TextureLoaderLike
    gltfLoader?: GLTFLoaderLike
    hdriLoader?: HDRILoaderLike
    now?: AssetLoadClock
    performance?: PerformanceLike
  } = {}
): Promise<VisualAssetBundle> => {
  const textureLoader = options.textureLoader ?? new THREE.TextureLoader()
  const gltfLoader = options.gltfLoader ?? new GLTFLoader()
  const hdriLoader = options.hdriLoader ?? new RGBELoader()
  const now = options.now ?? (() => performance.now())
  const performanceLike = options.performance ?? (typeof performance === 'undefined' ? undefined : performance)

  const totalStart = now()
  const [
    [textureEntries, texturesMs],
    [modelEntries, modelsMs],
    [environmentEntries, environmentMs]
  ] = await Promise.all([
    measureAssetLoad(
      now,
      performanceLike,
      'textures',
      () => Promise.all(
        manifest.textures.map(async (entry) => {
          try {
            const texture = await textureLoader.loadAsync(entry.url)
            return [entry.id, configureTexture(texture, entry)] as const
          } catch {
            return [entry.id, null] as const
          }
        })
      )
    ),
    measureAssetLoad(
      now,
      performanceLike,
      'models',
      () => Promise.all(
        manifest.models.map(async (entry) => {
          const model = await loadModelAsset(entry, gltfLoader)
          return [entry.id, model] as const
        })
      )
    ),
    measureAssetLoad(
      now,
      performanceLike,
      'environment',
      () => Promise.all(
        manifest.environment.map(async (entry) => {
          try {
            const texture = await hdriLoader.loadAsync(entry.url)
            return [entry.id, configureEnvironmentTexture(texture)] as const
          } catch {
            return [entry.id, null] as const
          }
        })
      )
    )
  ])

  return {
    manifest,
    textures: Object.fromEntries(textureEntries),
    models: Object.fromEntries(modelEntries),
    environment: Object.fromEntries(environmentEntries),
    loadTimings: {
      totalMs: Math.max(0, now() - totalStart),
      texturesMs,
      modelsMs,
      environmentMs
    }
  }
}
