import { getFishContent, getFishContentList, getStarterFishContentIds } from '../content/registry'
import type { FishGroup, Species } from '../types/aquarium'

const toSpecies = (speciesId: string): Species | null => {
  const fish = getFishContent(speciesId)
  if (!fish) return null

  return {
    speciesId: fish.speciesId,
    displayName: fish.displayName,
    description: fish.description,
    visualRef: fish.visualRef,
    size: fish.size,
    colorVariants: [...fish.colorVariants],
    unlock: { ...fish.unlock },
    render: { ...fish.render }
  }
}

export const getSpeciesList = (): Species[] => getFishContentList()
  .map((fish) => toSpecies(fish.speciesId))
  .filter((entry): entry is Species => entry !== null)

export const getSpeciesById = (speciesId: string): Species | null => {
  return toSpecies(speciesId)
}

export const getSpeciesOrFallback = (speciesId: string): Species => {
  const found = getSpeciesById(speciesId)
  if (!found) {
    const fallback = getFishContentList()[0]
    if (!fallback) {
      throw new Error('No fish content registered')
    }
    console.warn(`Unknown speciesId: ${speciesId}. Falling back to default.`)
    return toSpecies(fallback.speciesId) as Species
  }
  return found
}

export const getDefaultFishGroups = (): FishGroup[] => {
  const starters = getStarterSpeciesIds()
  if (starters.length === 0) {
    const firstSpecies = getFishContentList()[0]
    if (!firstSpecies) {
      throw new Error('No fish content registered')
    }
    return [{ speciesId: firstSpecies.speciesId, count: 12 }]
  }

  return [
    { speciesId: starters[0], count: 12 }
  ]
}

export const resolveSpeciesId = (speciesId: string): string => {
  return getSpeciesOrFallback(speciesId).speciesId
}

export const getStarterSpeciesIds = (): string[] => getStarterFishContentIds()
