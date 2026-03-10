import type { FishContentDefinition } from '../content/types'
import type { GameSave } from './types'

export const getObservedSeconds = (save: GameSave): number => save.profile.stats.totalViewedSeconds

export const getRequiredObservationSeconds = (fish: FishContentDefinition): number => {
  return Math.max(0, fish.unlock.requiredViewSeconds ?? 0)
}

export const getRemainingObservationSeconds = (save: GameSave, fish: FishContentDefinition): number => {
  return Math.max(0, getRequiredObservationSeconds(fish) - getObservedSeconds(save))
}

export const isFishUnlockRequirementMet = (save: GameSave, fish: FishContentDefinition): boolean => {
  return getRemainingObservationSeconds(save, fish) === 0
}
