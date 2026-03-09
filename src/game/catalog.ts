import {
  getDecorContent,
  getDecorContentList,
  getFishContent,
  getFishContentList,
  getStarterDecorContentIds,
  getStarterFishContentIds
} from '../content/registry'
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

const toFishDefinition = (speciesId: string): FishDefinition | null => {
  const fish = getFishContent(speciesId)
  if (!fish) return null

  return {
    speciesId: fish.speciesId,
    displayName: fish.displayName,
    unlockCost: fish.gameplay.unlockCost,
    purchaseCostPerFish: fish.gameplay.purchaseCostPerFish,
    baseIncomePerMinute: fish.gameplay.baseIncomePerMinute,
    preferredLane: fish.gameplay.preferredLane,
    pollutionPerFish: fish.gameplay.pollutionPerFish
  }
}

const toDecorDefinition = (decorId: string): DecorDefinition | null => {
  const decor = getDecorContent(decorId)
  if (!decor) return null

  return {
    decorId: decor.decorId,
    displayName: decor.displayName,
    unlockCost: decor.gameplay.unlockCost,
    comfortBonus: decor.gameplay.comfortBonus,
    waterQualityBonus: decor.gameplay.waterQualityBonus,
    laneAffinity: decor.gameplay.laneAffinity,
    adjacencyBonus: decor.gameplay.adjacencyBonus
  }
}

export const GRID_COLUMNS = 5
export const GRID_ROWS = 5
export const DEFAULT_TANK_NAME = 'Front Tank'

const starterFishIds = getStarterFishContentIds()
const starterDecorIds = getStarterDecorContentIds()

if (starterFishIds.length === 0) {
  throw new Error('At least one starter fish must be registered')
}

if (starterDecorIds.length === 0) {
  throw new Error('At least one starter decor must be registered')
}

export const STARTER_FISH_ID = starterFishIds[0]
export const STARTER_DECOR_ID = starterDecorIds[0]

export const getFishCatalog = (): FishDefinition[] => getFishContentList()
  .map((fish) => toFishDefinition(fish.speciesId))
  .filter((entry): entry is FishDefinition => entry !== null)

export const getDecorCatalog = (): DecorDefinition[] => getDecorContentList()
  .map((decor) => toDecorDefinition(decor.decorId))
  .filter((entry): entry is DecorDefinition => entry !== null)

export const getFishDefinition = (speciesId: string): FishDefinition | null => toFishDefinition(speciesId)

export const getDecorDefinition = (decorId: string): DecorDefinition | null => toDecorDefinition(decorId)

export const getStarterFishIds = (): string[] => getStarterFishContentIds()

export const getStarterDecorIds = (): string[] => getStarterDecorContentIds()

export const getDecorAt = (tank: GameTank, x: number, y: number): DecorPlacement | null => {
  return tank.decor.find((item) => item.x === x && item.y === y) ?? null
}

export const laneForGridRow = (row: number, rows = GRID_ROWS): Lane => {
  if (row <= Math.floor(rows / 3) - 1) return 'top'
  if (row >= Math.ceil((rows * 2) / 3)) return 'bottom'
  return 'middle'
}
