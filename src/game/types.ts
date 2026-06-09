export type Lane = 'top' | 'middle' | 'bottom'
export type PhotoModeFollowMode = 'fish' | 'mouse'

export type FishSchool = {
  id: string
  speciesId: string
  count: number
  lane: Lane
}

export type RareFishInstance = {
  id: string
  speciesId: string
  lane: Lane
  nickname?: string
}

export type TankLayout = {
  shape: 'square'
  columns: number
  rows: number
}

export type GameTank = {
  id: string
  name: string
  layout: TankLayout
  fishSchools: FishSchool[]
  rareFish: RareFishInstance[]
}

export type GameProfile = {
  stats: {
    totalOfflineSeconds: number
    totalViewedSeconds: number
  }
  preferences: {
    soundEnabled: boolean
    motionEnabled: boolean
    photoMode: {
      enabled: boolean
      followMode: PhotoModeFollowMode
    }
  }
}

export type GameSave = {
  schemaVersion: number
  lastSimulatedAt: string
  profile: GameProfile
  tanks: GameTank[]
  activeTankId: string
}

export type OfflineTankSummary = {
  tankId: string
}

export type OfflineSimulationResult = {
  simulatedSeconds: number
  tankSummaries: OfflineTankSummary[]
}

export type GameUiMode = 'tank' | 'shop' | 'layout' | 'progress' | 'settings'

export type GameUiState = {
  mode: GameUiMode
  lastOfflineResult: OfflineSimulationResult | null
}

export type GameAppState = {
  game: GameSave
  ui: GameUiState
}

export type GameAction =
  | { type: 'UI/SET_MODE'; payload: { mode: GameUiMode } }
  | { type: 'GAME/TICK'; payload: { nowIso: string } }
  | { type: 'GAME/CLEAR_OFFLINE_RESULT' }
  | { type: 'GAME/SET_FISH_COUNT'; payload: { speciesId: string; count: number } }
  | { type: 'GAME/SET_FISH_LANE'; payload: { speciesId: string; lane: Lane } }
  | { type: 'SETTINGS/SET_SOUND'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_MOTION'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_PHOTO_MODE'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_PHOTO_FOLLOW_MODE'; payload: { followMode: PhotoModeFollowMode } }
