import type { AppState, UiState } from '../../types/app'
import type { ProfileState } from '../../types/profile'
import type { SettingsState } from '../../types/settings'
import type { TankState } from '../../types/tank'
import { createDefaultProfileState, migrateProfileState } from '../../utils/profileSchema'
import { createDefaultSettingsState, migrateSettingsState } from '../../utils/settingsSchema'
import { createDefaultTankState, migrateTankState } from '../../utils/tankSchema'

export const createDefaultUiState = (): UiState => ({
  mode: 'view'
})

export const createDefaultAppState = (): AppState => ({
  tank: createDefaultTankState(),
  profile: createDefaultProfileState(),
  settings: createDefaultSettingsState(),
  ui: createDefaultUiState()
})

export const createAppStateFromPersisted = (options: {
  tank?: TankState | null
  profile?: ProfileState | null
  settings?: SettingsState | null
  ui?: Partial<UiState>
}): AppState => {
  const defaults = createDefaultAppState()
  return {
    tank: options.tank ? migrateTankState(options.tank) : defaults.tank,
    profile: options.profile ? migrateProfileState(options.profile) : defaults.profile,
    settings: options.settings ? migrateSettingsState(options.settings) : defaults.settings,
    ui: {
      ...defaults.ui,
      ...(options.ui ?? {})
    }
  }
}
