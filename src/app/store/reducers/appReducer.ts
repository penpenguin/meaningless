import type { AppAction, AppState } from '../../../types/app'
import { createDefaultAppState, createDefaultUiState } from '../../state/defaultAppState'
import { migrateProfileState } from '../../../utils/profileSchema'
import { migrateSettingsState } from '../../../utils/settingsSchema'
import { migrateTankState } from '../../../utils/tankSchema'
import { profileReducer } from './profileReducer'
import { settingsReducer } from './settingsReducer'
import { tankReducer } from './tankReducer'
import { uiReducer } from './uiReducer'

export const appReducer = (state: AppState, action: AppAction): AppState => {
  if (action.type === 'APP/BOOTSTRAP_LOADED') {
    const defaults = createDefaultAppState()
    return {
      tank: action.payload.tank ? migrateTankState(action.payload.tank) : defaults.tank,
      profile: action.payload.profile ? migrateProfileState(action.payload.profile) : defaults.profile,
      settings: action.payload.settings ? migrateSettingsState(action.payload.settings) : defaults.settings,
      ui: {
        ...createDefaultUiState(),
        ...(action.payload.ui ?? {})
      }
    }
  }

  return {
    tank: tankReducer(state.tank, action),
    profile: profileReducer(state.profile, action),
    settings: settingsReducer(state.settings, action),
    ui: uiReducer(state.ui, action)
  }
}
