import type { Lane } from '../game/types'
import type { Species, SpeciesUnlockRule } from '../types/aquarium'

export type FishGameplayDefinition = {
  unlockCost: number
  purchaseCostPerFish: number
  baseIncomePerMinute: number
  preferredLane: Lane
  pollutionPerFish: number
}

export type FishContentDefinition = Species & {
  type: 'fish'
  gameplay: FishGameplayDefinition
}

export type DecorGameplayDefinition = {
  unlockCost: number
  comfortBonus: number
  waterQualityBonus: number
  laneAffinity: Lane | 'any'
  adjacencyBonus: number
  hideoutScore?: number
}

export type DecorAssetFamily = 'plant' | 'driftwood' | 'rock'

export type DecorVisualDefinition = {
  assetFamily: DecorAssetFamily
  shortLabel: string
}

export type DecorContentDefinition = {
  type: 'decor'
  decorId: string
  displayName: string
  gameplay: DecorGameplayDefinition
  visual: DecorVisualDefinition
}

export type ContentType = 'fish' | 'decor'

export type ContentDefinitionMap = {
  fish: FishContentDefinition
  decor: DecorContentDefinition
}

export type ContentRegistryInput = {
  fish: FishContentDefinition[]
  decor: DecorContentDefinition[]
}

export type FishContentSeed = Omit<FishContentDefinition, 'type'>
export type DecorContentSeed = Omit<DecorContentDefinition, 'type'>

export const createFishContent = (definition: FishContentSeed): FishContentDefinition => ({
  type: 'fish',
  ...definition
})

export const createDecorContent = (definition: DecorContentSeed): DecorContentDefinition => ({
  type: 'decor',
  ...definition
})

export const isStarterUnlockRule = (unlock: SpeciesUnlockRule): boolean => unlock.type === 'starter'
