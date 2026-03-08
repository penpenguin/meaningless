import type { DecorPlacement, GameTank, Lane } from './types'

export type FishDefinition = {
  speciesId: string
  displayName: string
  unlockCost: number
  purchaseCostPerFish: number
  baseIncomePerMinute: number
  preferredLane: Lane
  pollutionPerFish: number
}

export type DecorDefinition = {
  decorId: string
  displayName: string
  unlockCost: number
  comfortBonus: number
  waterQualityBonus: number
  laneAffinity: Lane | 'any'
  adjacencyBonus: number
}

const fishCatalog: FishDefinition[] = [
  {
    speciesId: 'neon-tetra',
    displayName: 'ネオンテトラ',
    unlockCost: 0,
    purchaseCostPerFish: 1,
    baseIncomePerMinute: 0.22,
    preferredLane: 'top',
    pollutionPerFish: 0.42
  },
  {
    speciesId: 'clownfish',
    displayName: 'クマノミ',
    unlockCost: 18,
    purchaseCostPerFish: 2,
    baseIncomePerMinute: 0.3,
    preferredLane: 'middle',
    pollutionPerFish: 0.5
  },
  {
    speciesId: 'cardinal-tetra',
    displayName: 'カージナルテトラ',
    unlockCost: 22,
    purchaseCostPerFish: 2,
    baseIncomePerMinute: 0.28,
    preferredLane: 'middle',
    pollutionPerFish: 0.48
  },
  {
    speciesId: 'angelfish',
    displayName: 'エンゼルフィッシュ',
    unlockCost: 32,
    purchaseCostPerFish: 3,
    baseIncomePerMinute: 0.38,
    preferredLane: 'top',
    pollutionPerFish: 0.65
  },
  {
    speciesId: 'butterflyfish',
    displayName: 'チョウチョウウオ',
    unlockCost: 40,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.48,
    preferredLane: 'middle',
    pollutionPerFish: 0.7
  },
  {
    speciesId: 'goldfish',
    displayName: 'ゴールドフィッシュ',
    unlockCost: 48,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.55,
    preferredLane: 'bottom',
    pollutionPerFish: 0.8
  }
]

const decorCatalog: DecorDefinition[] = [
  {
    decorId: 'plant',
    displayName: 'Floating Plant',
    unlockCost: 0,
    comfortBonus: 6,
    waterQualityBonus: 0.9,
    laneAffinity: 'top',
    adjacencyBonus: 2
  },
  {
    decorId: 'coral',
    displayName: 'Coral Shelf',
    unlockCost: 16,
    comfortBonus: 8,
    waterQualityBonus: 0.5,
    laneAffinity: 'middle',
    adjacencyBonus: 3
  },
  {
    decorId: 'cave',
    displayName: 'Stone Cave',
    unlockCost: 24,
    comfortBonus: 10,
    waterQualityBonus: 0.2,
    laneAffinity: 'bottom',
    adjacencyBonus: 4
  }
]

export const GRID_COLUMNS = 5
export const GRID_ROWS = 5
export const STARTER_DECOR_ID = 'plant'
export const STARTER_FISH_ID = 'neon-tetra'
export const DEFAULT_TANK_NAME = 'Front Tank'

export const getFishCatalog = (): FishDefinition[] => fishCatalog.map((entry) => ({ ...entry }))
export const getDecorCatalog = (): DecorDefinition[] => decorCatalog.map((entry) => ({ ...entry }))

export const getFishDefinition = (speciesId: string): FishDefinition | null => {
  return fishCatalog.find((entry) => entry.speciesId === speciesId) ?? null
}

export const getDecorDefinition = (decorId: string): DecorDefinition | null => {
  return decorCatalog.find((entry) => entry.decorId === decorId) ?? null
}

export const getStarterFishIds = (): string[] => fishCatalog
  .filter((entry) => entry.unlockCost === 0)
  .map((entry) => entry.speciesId)

export const getStarterDecorIds = (): string[] => decorCatalog
  .filter((entry) => entry.unlockCost === 0)
  .map((entry) => entry.decorId)

export const getDecorAt = (tank: GameTank, x: number, y: number): DecorPlacement | null => {
  return tank.decor.find((item) => item.x === x && item.y === y) ?? null
}

export const laneForGridRow = (row: number, rows = GRID_ROWS): Lane => {
  if (row <= Math.floor(rows / 3) - 1) return 'top'
  if (row >= Math.ceil((rows * 2) / 3)) return 'bottom'
  return 'middle'
}
