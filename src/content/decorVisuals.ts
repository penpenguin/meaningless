import { createAquariumAssetManifest, type AssetManifest } from '../assets/visualAssets'
import type { DecorAssetFamily, DecorContentDefinition } from './types'

type DecorVisualSummary = {
  textureCount: number
  modelCount: number
}

export type DecorPlacementAssetEntry = {
  assetId: string
  displayName: string
  decorId: string
  family: DecorAssetFamily
}

export type DecorPlacementAssetGroup = {
  family: DecorAssetFamily
  title: string
  decorId: string
  sharedTextureCount: number
  assets: DecorPlacementAssetEntry[]
}

const texturePrefixesByFamily: Record<DecorAssetFamily, string[]> = {
  plant: ['leaf-'],
  driftwood: ['driftwood-'],
  rock: ['rock-']
}

const modelPrefixesByFamily: Record<DecorAssetFamily, string[]> = {
  plant: ['plant-'],
  driftwood: ['driftwood-'],
  rock: ['rock-']
}

const countEntriesByPrefix = (
  ids: string[],
  prefixes: string[]
): number => ids.filter((id) => prefixes.some((prefix) => id.startsWith(prefix))).length

const familyTitleByFamily: Record<DecorAssetFamily, string> = {
  plant: 'Plants',
  rock: 'Rocks',
  driftwood: 'Wood'
}

const familyOrder: DecorAssetFamily[] = ['plant', 'rock', 'driftwood']

const stripFamilyPrefix = (assetId: string, family: DecorAssetFamily): string => {
  if (family === 'plant') return assetId.replace(/^plant-/, '')
  if (family === 'rock') return assetId.replace(/^rock-/, '')
  return assetId.replace(/^driftwood-/, '')
}

const titleCaseToken = (token: string): string => {
  if (token.length === 1) return token.toUpperCase()
  return token.charAt(0).toUpperCase() + token.slice(1)
}

const prettifyAssetLabel = (assetId: string, family: DecorAssetFamily): string => (
  stripFamilyPrefix(assetId, family)
    .split('-')
    .map((token) => {
      if (token === 'javafern') return 'Javafern'
      if (token === 'anubias') return 'Anubias'
      if (token === 'vallisneria') return 'Vallisneria'
      if (token === 'hygrophila') return 'Hygrophila'
      if (token === 'crypt') return 'Crypt'
      return titleCaseToken(token)
    })
    .join(' ')
)

export const getDecorVisualSummary = (
  decor: DecorContentDefinition,
  manifest: AssetManifest = createAquariumAssetManifest()
): DecorVisualSummary => ({
  textureCount: countEntriesByPrefix(
    manifest.textures.map((entry) => entry.id),
    texturePrefixesByFamily[decor.visual.assetFamily]
  ),
  modelCount: countEntriesByPrefix(
    manifest.models.map((entry) => entry.id),
    modelPrefixesByFamily[decor.visual.assetFamily]
  )
})

export const getDecorLibrarySummary = (
  decorList: DecorContentDefinition[],
  manifest: AssetManifest = createAquariumAssetManifest()
): DecorVisualSummary => {
  const uniqueFamilies = Array.from(new Set(decorList.map((decor) => decor.visual.assetFamily)))

  return uniqueFamilies.reduce<DecorVisualSummary>((summary, family) => ({
    textureCount: summary.textureCount + countEntriesByPrefix(
      manifest.textures.map((entry) => entry.id),
      texturePrefixesByFamily[family]
    ),
    modelCount: summary.modelCount + countEntriesByPrefix(
      manifest.models.map((entry) => entry.id),
      modelPrefixesByFamily[family]
    )
  }), {
    textureCount: 0,
    modelCount: 0
  })
}

export const getDecorPlacementAssetGroups = (
  decorList: DecorContentDefinition[],
  manifest: AssetManifest = createAquariumAssetManifest()
): DecorPlacementAssetGroup[] => familyOrder
  .map((family) => {
    const decor = decorList.find((entry) => entry.visual.assetFamily === family)
    if (!decor) return null

    const assets = manifest.models
      .filter((entry) => modelPrefixesByFamily[family].some((prefix) => entry.id.startsWith(prefix)))
      .map((entry) => ({
        assetId: entry.id,
        displayName: prettifyAssetLabel(entry.id, family),
        decorId: decor.decorId,
        family
      }))

    return {
      family,
      title: familyTitleByFamily[family],
      decorId: decor.decorId,
      sharedTextureCount: countEntriesByPrefix(
        manifest.textures.map((entry) => entry.id),
        texturePrefixesByFamily[family]
      ),
      assets
    }
  })
  .filter((entry): entry is DecorPlacementAssetGroup => entry !== null)

export const getDecorPlacementAssetById = (
  assetId: string | null,
  decorList: DecorContentDefinition[],
  manifest: AssetManifest = createAquariumAssetManifest()
): DecorPlacementAssetEntry | null => {
  if (!assetId) return null
  for (const group of getDecorPlacementAssetGroups(decorList, manifest)) {
    const match = group.assets.find((entry) => entry.assetId === assetId)
    if (match) return match
  }
  return null
}

export const getDecorCellLabel = (decor: DecorContentDefinition | null): string => (
  decor?.visual.shortLabel ?? '·'
)
