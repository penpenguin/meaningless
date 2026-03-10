import type { QualityLevel } from '../types/settings'

export type Lane = 'top' | 'middle' | 'bottom'

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

export type DecorPlacement = {
  id: string
  decorId: string
  x: number
  y: number
}

export type TankLayout = {
  shape: 'square'
  columns: number
  rows: number
}

export type TankProgression = {
  comfort: number
  waterQuality: number
  incomePerMinute: number
  lastCollectedAt: string | null
}

export type GameTank = {
  id: string
  name: string
  layout: TankLayout
  fishSchools: FishSchool[]
  rareFish: RareFishInstance[]
  decor: DecorPlacement[]
  progression: TankProgression
}

export type GameProfile = {
  currency: {
    coins: number
    pendingCoins: number
  }
  unlockedFishIds: string[]
  unlockedDecorIds: string[]
  stats: {
    totalEarnedCoins: number
    totalOfflineSeconds: number
    totalMaintenanceActions: number
    totalViewedSeconds: number
  }
  preferences: {
    soundEnabled: boolean
    motionEnabled: boolean
    quality: QualityLevel
    hudVisible: boolean
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
  earnedCoins: number
  beforeWaterQuality: number
  afterWaterQuality: number
}

export type OfflineSimulationResult = {
  simulatedSeconds: number
  earnedCoins: number
  tankSummaries: OfflineTankSummary[]
}

export type GameUiMode = 'tank' | 'shop' | 'layout' | 'progress' | 'settings'

export type GameUiState = {
  mode: GameUiMode
  selectedDecorId: string | null
  lastOfflineResult: OfflineSimulationResult | null
}

export type GameAppState = {
  game: GameSave
  ui: GameUiState
}

export type GameAction =
  | { type: 'UI/SET_MODE'; payload: { mode: GameUiMode } }
  | { type: 'UI/SELECT_DECOR'; payload: { decorId: string | null } }
  | { type: 'GAME/TICK'; payload: { nowIso: string } }
  | { type: 'GAME/CLEAR_OFFLINE_RESULT' }
  | { type: 'GAME/UNLOCK_FISH'; payload: { speciesId: string } }
  | { type: 'GAME/UNLOCK_DECOR'; payload: { decorId: string } }
  | { type: 'GAME/SET_FISH_COUNT'; payload: { speciesId: string; count: number } }
  | { type: 'GAME/SET_FISH_LANE'; payload: { speciesId: string; lane: Lane } }
  | { type: 'GAME/PLACE_DECOR'; payload: { decorId: string; x: number; y: number } }
  | { type: 'GAME/REMOVE_DECOR'; payload: { x: number; y: number } }
  | { type: 'GAME/CLEAN_TANK' }
  | { type: 'SETTINGS/SET_SOUND'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_MOTION'; payload: { enabled: boolean } }
  | { type: 'SETTINGS/SET_QUALITY'; payload: { quality: QualityLevel } }
  | { type: 'SETTINGS/SET_HUD_VISIBILITY'; payload: { visible: boolean } }
