import type { Lane } from '../game/types'
import type { Species, SpeciesUnlockRule } from '../types/aquarium'

export type FishGameplayDefinition = {
  unlockCost: number
  purchaseCostPerFish: number
  preferredLane: Lane
}

export type FishContentDefinition = Species & {
  type: 'fish'
  gameplay: FishGameplayDefinition
}

export type ContentType = 'fish'

export type ContentDefinitionMap = {
  fish: FishContentDefinition
}

export type ContentRegistryInput = {
  fish: FishContentDefinition[]
}

export type FishContentSeed = Omit<FishContentDefinition, 'type'>

export const createFishContent = (definition: FishContentSeed): FishContentDefinition => ({
  type: 'fish',
  ...definition
})

export const isStarterUnlockRule = (unlock: SpeciesUnlockRule): boolean => unlock.type === 'starter'
