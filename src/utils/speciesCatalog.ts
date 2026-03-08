import type { FishGroup, Species } from '../types/aquarium'

const speciesCatalog: Species[] = [
  {
    speciesId: 'neon-tetra',
    displayName: 'ネオンテトラ',
    description: '小型で群泳する定番の熱帯魚',
    visualRef: 'sprites/neon-tetra.png',
    size: 0.6,
    colorVariants: ['#6ac7d6', '#2fd2ff'],
    unlock: {
      type: 'starter'
    },
    render: {
      archetype: 'Neon'
    }
  },
  {
    speciesId: 'clownfish',
    displayName: 'クマノミ',
    description: 'オレンジと白の縞模様が特徴',
    visualRef: 'sprites/clownfish.png',
    size: 0.9,
    colorVariants: ['#ff8a3d', '#ffd5b1'],
    unlock: {
      type: 'cost',
      costPearls: 3
    },
    render: {
      archetype: 'Tropical'
    }
  },
  {
    speciesId: 'cardinal-tetra',
    displayName: 'カージナルテトラ',
    description: '鮮やかな青赤ラインを持つ群泳魚',
    visualRef: 'sprites/cardinal-tetra.png',
    size: 0.65,
    colorVariants: ['#2fd2ff', '#ff4b6e'],
    unlock: {
      type: 'cost',
      costPearls: 2
    },
    render: {
      archetype: 'Neon'
    }
  },
  {
    speciesId: 'angelfish',
    displayName: 'エンゼルフィッシュ',
    description: '縦長の優雅なシルエット',
    visualRef: 'sprites/angelfish.png',
    size: 1.2,
    colorVariants: ['#9dd6ff', '#4b72d9'],
    unlock: {
      type: 'watchTime',
      requiredViewSeconds: 900
    },
    render: {
      archetype: 'Angelfish'
    }
  },
  {
    speciesId: 'butterflyfish',
    displayName: 'チョウチョウウオ',
    description: 'ゆったり泳ぐ縞模様の海水魚',
    visualRef: 'sprites/butterflyfish.png',
    size: 1.1,
    colorVariants: ['#ffd766', '#1f2b59'],
    unlock: {
      type: 'costAndWatchTime',
      costPearls: 4,
      requiredViewSeconds: 1200
    },
    render: {
      archetype: 'Angelfish'
    }
  },
  {
    speciesId: 'goldfish',
    displayName: 'ゴールドフィッシュ',
    description: '丸みのある体型で観賞向けの人気種',
    visualRef: 'sprites/goldfish.png',
    size: 1.0,
    colorVariants: ['#ffc857', '#ff8c42'],
    unlock: {
      type: 'costAndWatchTime',
      costPearls: 5,
      requiredViewSeconds: 1800
    },
    render: {
      archetype: 'Goldfish'
    }
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
  const starters = getStarterSpeciesIds()
  if (starters.length === 0) {
    return [{ speciesId: speciesCatalog[0].speciesId, count: 12 }]
  }
  return [
    { speciesId: starters[0], count: 12 }
  ]
}

export const resolveSpeciesId = (speciesId: string): string => {
  return getSpeciesOrFallback(speciesId).speciesId
}

export const getStarterSpeciesIds = (): string[] => {
  return speciesCatalog
    .filter((species) => species.unlock.type === 'starter')
    .map((species) => species.speciesId)
}
