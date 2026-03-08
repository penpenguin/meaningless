import type { AppAction } from '../../../types/app'
import type { SettingsState } from '../../../types/settings'

export const settingsReducer = (state: SettingsState, action: AppAction): SettingsState => {
  switch (action.type) {
    case 'SETTINGS/SET_SOUND':
      return {
        ...state,
        soundEnabled: action.payload.enabled
      }
    case 'SETTINGS/SET_MOTION':
      return {
        ...state,
        motionEnabled: action.payload.enabled
      }
    case 'SETTINGS/SET_QUALITY':
      return {
        ...state,
        quality: action.payload.quality
      }
    default:
      return state
  }
}
