import type { AppState } from '../../../types/app'
import type { Species } from '../../../types/aquarium'

export const isUnlockedSpecies = (state: AppState, speciesId: string): boolean => {
  return state.profile.unlockedSpeciesIds.includes(speciesId)
}

export const canUnlockSpecies = (state: AppState, species: Species): boolean => {
  if (isUnlockedSpecies(state, species.speciesId)) return false

  const pearls = state.profile.currency.pearls
  const viewed = state.profile.stats.totalViewSeconds
  const { unlock } = species

  if (unlock.type === 'starter') return true
  if (unlock.type === 'cost') {
    return pearls >= (unlock.costPearls ?? 0)
  }
  if (unlock.type === 'watchTime') {
    return viewed >= (unlock.requiredViewSeconds ?? 0)
  }
  if (unlock.type === 'costAndWatchTime') {
    return pearls >= (unlock.costPearls ?? 0) && viewed >= (unlock.requiredViewSeconds ?? 0)
  }
  return false
}
