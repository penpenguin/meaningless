/** @typedef {'basecolor' | 'normal' | 'roughness' | 'alpha'} FishTextureKind */
/** @typedef {'school' | 'hero'} FishModelKind */

/**
 * @param {...string} segments
 * @returns {string}
 */
const joinPath = (...segments) => segments
  .flatMap((segment) => String(segment).split('/'))
  .filter(Boolean)
  .join('/')

export const ASSET_PUBLIC_ROOT = 'assets'
export const ASSET_PUBLIC_OUTPUT_ROOT = 'public/assets'

/**
 * @param {...string} segments
 * @returns {string}
 */
export const assetPublicPath = (...segments) => joinPath(ASSET_PUBLIC_ROOT, ...segments)

/**
 * @param {...string} segments
 * @returns {string}
 */
export const assetPublicOutputPath = (...segments) => joinPath(ASSET_PUBLIC_OUTPUT_ROOT, ...segments)

/**
 * @param {string} group
 * @param {string} filename
 * @returns {string}
 */
export const textureAssetPath = (group, filename) => assetPublicPath('textures', group, filename)

/**
 * @param {string} group
 * @param {string} filename
 * @returns {string}
 */
export const modelAssetPath = (group, filename) => assetPublicPath('models', group, filename)

/**
 * @param {string} filename
 * @returns {string}
 */
export const environmentAssetPath = (filename) => assetPublicPath('environment', filename)

/**
 * @param {string} fishId
 * @param {FishTextureKind | FishModelKind} kind
 * @returns {string}
 */
export const fishAssetFileName = (fishId, kind) => {
  if (kind === 'school' || kind === 'hero') {
    return `fish-${fishId}-${kind}.glb`
  }

  return `fish-${fishId}-${kind}.png`
}

/**
 * @param {string} fishId
 * @param {FishTextureKind} kind
 * @returns {string}
 */
export const fishTextureAssetPath = (fishId, kind) => textureAssetPath('fish', fishAssetFileName(fishId, kind))

/**
 * @param {string} fishId
 * @param {FishModelKind} kind
 * @returns {string}
 */
export const fishModelAssetPath = (fishId, kind) => modelAssetPath('fish', fishAssetFileName(fishId, kind))
