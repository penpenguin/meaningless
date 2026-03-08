import type { AppAction } from '../../../types/app'
import type { ProfileState } from '../../../types/profile'
import { VIEW_SECONDS_PER_PEARL } from '../../../utils/profileSchema'

export const profileReducer = (state: ProfileState, action: AppAction): ProfileState => {
  switch (action.type) {
    case 'PROFILE/VIEW_TICK': {
      const seconds = Math.max(0, Math.floor(action.payload.seconds))
      if (seconds <= 0) return state

      const pending = state.pendingViewSeconds + seconds
      const earnedPearls = Math.floor(pending / VIEW_SECONDS_PER_PEARL)
      const nextPending = pending % VIEW_SECONDS_PER_PEARL

      return {
        ...state,
        currency: {
          pearls: state.currency.pearls + earnedPearls
        },
        stats: {
          ...state.stats,
          totalViewSeconds: state.stats.totalViewSeconds + seconds,
          totalEarnedPearls: state.stats.totalEarnedPearls + earnedPearls
        },
        pendingViewSeconds: nextPending
      }
    }
    case 'PROFILE/UNLOCK_SPECIES': {
      if (state.unlockedSpeciesIds.includes(action.payload.speciesId)) return state

      return {
        ...state,
        currency: {
          pearls: Math.max(0, state.currency.pearls - action.payload.costPearls)
        },
        unlockedSpeciesIds: [...state.unlockedSpeciesIds, action.payload.speciesId]
      }
    }
    case 'PROFILE/SET_UNLOCKED_SPECIES': {
      return {
        ...state,
        unlockedSpeciesIds: Array.from(new Set(action.payload.speciesIds))
      }
    }
    default:
      return state
  }
}
