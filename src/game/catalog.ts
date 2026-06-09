import {
  getFishContent,
  getFishContentList,
  getStarterFishContentIds
} from '../content/registry'
import type { Lane } from './types'

export type FishDefinition = {
  speciesId: string
  displayName: string
  unlockCost: number
  purchaseCostPerFish: number
  preferredLane: Lane
}

const toFishDefinition = (speciesId: string): FishDefinition | null => {
  const fish = getFishContent(speciesId)
  if (!fish) return null

  return {
    speciesId: fish.speciesId,
    displayName: fish.displayName,
    unlockCost: fish.gameplay.unlockCost,
    purchaseCostPerFish: fish.gameplay.purchaseCostPerFish,
    preferredLane: fish.gameplay.preferredLane
  }
}

export const GRID_COLUMNS = 5
export const GRID_ROWS = 5
export const DEFAULT_TANK_NAME = 'Front Tank'

const starterFishIds = getStarterFishContentIds()

if (starterFishIds.length === 0) {
  throw new Error('At least one starter fish must be registered')
}

export const STARTER_FISH_ID = starterFishIds[0]

export const getFishCatalog = (): FishDefinition[] => getFishContentList()
  .map((fish) => toFishDefinition(fish.speciesId))
  .filter((entry): entry is FishDefinition => entry !== null)

export const getFishDefinition = (speciesId: string): FishDefinition | null => toFishDefinition(speciesId)

export const getStarterFishIds = (): string[] => getStarterFishContentIds()

export const laneForGridRow = (row: number, rows = GRID_ROWS): Lane => {
  if (row <= Math.floor(rows / 3) - 1) return 'top'
  if (row >= Math.ceil((rows * 2) / 3)) return 'bottom'
  return 'middle'
}
