import type { FishGroup, Theme } from './aquarium'
import type { ProfileState } from './profile'
import type { SettingsState } from './settings'
import type { TankState } from './tank'

export type UiMode = 'view' | 'collection' | 'decorate' | 'settings' | 'debug-edit'

export type UiState = {
  mode: UiMode
}

export type AppState = {
  tank: TankState
  profile: ProfileState
  settings: SettingsState
  ui: UiState
}

export type AppAction =
  | { type: 'APP/BOOTSTRAP_LOADED'; payload: Partial<AppState> }
  | { type: 'UI/SET_MODE'; payload: { mode: UiMode } }
  | { type: 'PROFILE/VIEW_TICK'; payload: { seconds: number } }
  | { type: 'PROFILE/UNLOCK_SPECIES'; payload: { speciesId: string; costPearls: number } }
  | { type: 'TANK/ADD_FISH'; payload: { speciesId: string; count: number } }
  | { type: 'TANK/SET_FISH_COUNT'; payload: { speciesId: string; count: number } }
  | { type: 'TANK/SET_THEME'; payload: { patch: Partial<Theme> } }
  | { type: 'SETTINGS/SET_SOUND'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_MOTION'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_QUALITY'; payload: { quality: SettingsState['quality'] } }
  | { type: 'PROFILE/SET_UNLOCKED_SPECIES'; payload: { speciesIds: string[] } }
  | { type: 'TANK/SET_FISH_GROUPS'; payload: { groups: FishGroup[] } }
