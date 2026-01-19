import * as THREE from 'three'

const materialTextureKeys = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'anisotropyMap'
] as const

type MaterialWithMaps = THREE.Material & {
  [K in (typeof materialTextureKeys)[number]]?: THREE.Texture | null
}

const collectTexture = (value: unknown, textures: Set<THREE.Texture>): void => {
  if (!value) return
  if (value instanceof THREE.Texture) {
    textures.add(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTexture(entry, textures))
  }
}

const collectMaterialTextures = (material: THREE.Material, textures: Set<THREE.Texture>): void => {
  const texturedMaterial = material as MaterialWithMaps
  materialTextureKeys.forEach((key) => {
    collectTexture(texturedMaterial[key], textures)
  })

  const shaderMaterial = material as THREE.ShaderMaterial
  if ('uniforms' in shaderMaterial && shaderMaterial.uniforms) {
    Object.values(shaderMaterial.uniforms).forEach((uniform) => {
      if (!uniform || typeof uniform !== 'object' || !('value' in uniform)) return
      collectTexture((uniform as { value?: unknown }).value, textures)
    })
  }
}

export const disposeSceneResources = (scene: THREE.Scene): void => {
  const textures = new Set<THREE.Texture>()
  const materials = new Set<THREE.Material>()

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    if ('geometry' in mesh && mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose()
    }

    const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
    if (Array.isArray(material)) {
      material.forEach((entry) => materials.add(entry))
    } else if (material) {
      materials.add(material)
    }
  })

  materials.forEach((material) => {
    collectMaterialTextures(material, textures)
    material.dispose()
  })

  collectTexture(scene.background, textures)
  collectTexture(scene.environment, textures)
  if (scene.background instanceof THREE.Texture) {
    scene.background = null
  }
  if (scene.environment instanceof THREE.Texture) {
    scene.environment = null
  }

  textures.forEach((texture) => texture.dispose())

  scene.clear()
}
