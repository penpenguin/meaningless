import type { FishGroup, Species } from '../types/aquarium'

const speciesCatalog: Species[] = [
  {
    speciesId: 'neon-tetra',
    displayName: 'ネオンテトラ',
    description: '小型で群泳する定番の熱帯魚',
    visualRef: 'sprites/neon-tetra.png',
    size: 0.6,
    colorVariants: ['#6ac7d6', '#2fd2ff']
  },
  {
    speciesId: 'clownfish',
    displayName: 'クマノミ',
    description: 'オレンジと白の縞模様が特徴',
    visualRef: 'sprites/clownfish.png',
    size: 0.9,
    colorVariants: ['#ff8a3d', '#ffd5b1']
  }
]

export const getSpeciesList = (): Species[] => [...speciesCatalog]

export const getSpeciesById = (speciesId: string): Species | null => {
  return speciesCatalog.find((species) => species.speciesId === speciesId) ?? null
}

export const getSpeciesOrFallback = (speciesId: string): Species => {
  const found = getSpeciesById(speciesId)
  if (!found) {
    console.warn(`Unknown speciesId: ${speciesId}. Falling back to default.`)
    return speciesCatalog[0]
  }
  return found
}

export const getDefaultFishGroups = (): FishGroup[] => {
  return [
    { speciesId: 'neon-tetra', count: 12 },
    { speciesId: 'clownfish', count: 6 }
  ]
}

export const resolveSpeciesId = (speciesId: string): string => {
  return getSpeciesOrFallback(speciesId).speciesId
}
