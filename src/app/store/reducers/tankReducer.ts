import type { AppAction } from '../../../types/app'
import type { TankState } from '../../../types/tank'

export const tankReducer = (state: TankState, action: AppAction): TankState => {
  switch (action.type) {
    case 'TANK/SET_THEME':
      return {
        ...state,
        theme: {
          ...state.theme,
          ...action.payload.patch
        }
      }
    case 'TANK/SET_FISH_GROUPS':
      return {
        ...state,
        fishGroups: action.payload.groups
      }
    case 'TANK/ADD_FISH': {
      const { speciesId, count } = action.payload
      const normalizedCount = Math.max(1, Math.floor(count))
      const existing = state.fishGroups.find((group) => group.speciesId === speciesId)
      if (!existing) {
        return {
          ...state,
          fishGroups: [...state.fishGroups, { speciesId, count: normalizedCount }]
        }
      }
      return {
        ...state,
        fishGroups: state.fishGroups.map((group) =>
          group.speciesId === speciesId
            ? { ...group, count: group.count + normalizedCount }
            : group
        )
      }
    }
    case 'TANK/SET_FISH_COUNT': {
      const { speciesId, count } = action.payload
      const normalizedCount = Math.max(0, Math.floor(count))
      const found = state.fishGroups.some((group) => group.speciesId === speciesId)
      if (!found && normalizedCount === 0) return state
      if (!found && normalizedCount > 0) {
        return {
          ...state,
          fishGroups: [...state.fishGroups, { speciesId, count: normalizedCount }]
        }
      }
      if (normalizedCount === 0) {
        return {
          ...state,
          fishGroups: state.fishGroups.filter((group) => group.speciesId !== speciesId)
        }
      }
      return {
        ...state,
        fishGroups: state.fishGroups.map((group) =>
          group.speciesId === speciesId ? { ...group, count: normalizedCount } : group
        )
      }
    }
    default:
      return state
  }
}
