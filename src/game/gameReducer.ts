import { getFishContent } from '../content/registry'
import { simulateGameSave } from './simulation'
import type { GameAction, GameAppState, GameSave, GameTank } from './types'

const withActiveTank = (game: GameSave, updater: (tank: GameTank) => GameTank): GameSave => {
  const tanks = game.tanks.map((tank) => {
    if (tank.id !== game.activeTankId) return tank
    return updater(tank)
  })
  return {
    ...game,
    tanks
  }
}

const getElapsedSeconds = (previousIso: string, nextIso: string): number => {
  const previousTime = Date.parse(previousIso)
  const nextTime = Date.parse(nextIso)
  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime)) return 0
  return Math.max(0, Math.floor((nextTime - previousTime) / 1000))
}

const updateUiState = (
  state: GameAppState,
  updater: (ui: GameAppState['ui']) => GameAppState['ui']
): GameAppState => {
  return {
    ...state,
    ui: updater(state.ui)
  }
}

const updatePreferences = (
  state: GameAppState,
  updater: (preferences: GameAppState['game']['profile']['preferences']) => GameAppState['game']['profile']['preferences']
): GameAppState => {
  return {
    ...state,
    game: {
      ...state.game,
      profile: {
        ...state.game.profile,
        preferences: updater(state.game.profile.preferences)
      }
    }
  }
}

const updateGameState = (
  state: GameAppState,
  updater: (game: GameSave) => GameSave
): GameAppState => {
  return {
    ...state,
    game: updater(state.game)
  }
}

const handleTick = (state: GameAppState, nowIso: string): GameAppState => {
  const viewedSeconds = getElapsedSeconds(state.game.lastSimulatedAt, nowIso)
  const simulated = simulateGameSave({
    save: state.game,
    nowIso
  })

  return {
    ...state,
    game: {
      ...simulated.save,
      profile: {
        ...simulated.save.profile,
        stats: {
          ...simulated.save.profile.stats,
          totalOfflineSeconds: state.game.profile.stats.totalOfflineSeconds,
          totalViewedSeconds: state.game.profile.stats.totalViewedSeconds + viewedSeconds
        }
      }
    },
    ui: {
      ...state.ui,
      lastOfflineResult: state.ui.lastOfflineResult
    }
  }
}

const handleSetFishCount = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/SET_FISH_COUNT' }>['payload']
): GameAppState => {
  const fish = getFishContent(payload.speciesId)
  if (!fish) return state

  const normalizedCount = Math.max(0, Math.floor(payload.count))
  const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
  if (!activeTank) return state
  const current = activeTank.fishSchools.find((school) => school.speciesId === fish.speciesId)

  const nextGame = withActiveTank(state.game, (tank) => {
    const remaining = tank.fishSchools.filter((school) => school.speciesId !== fish.speciesId)
    if (normalizedCount <= 0) {
      return {
        ...tank,
        fishSchools: remaining
      }
    }

    return {
      ...tank,
      fishSchools: [
        ...remaining,
        {
          id: current?.id ?? `school-${fish.speciesId}`,
          speciesId: fish.speciesId,
          count: normalizedCount,
          lane: current?.lane ?? fish.gameplay.preferredLane
        }
      ]
    }
  })

  return updateGameState(state, () => nextGame)
}

const handleSetFishLane = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/SET_FISH_LANE' }>['payload']
): GameAppState => {
  const nextGame = withActiveTank(state.game, (tank) => ({
    ...tank,
    fishSchools: tank.fishSchools.map((school) =>
      school.speciesId === payload.speciesId
        ? { ...school, lane: payload.lane }
        : school
    )
  }))

  return updateGameState(state, () => nextGame)
}

export const gameReducer = (state: GameAppState, action: GameAction): GameAppState => {
  switch (action.type) {
    case 'UI/SET_MODE':
      return updateUiState(state, (ui) => ({
        ...ui,
        mode: action.payload.mode
      }))
    case 'GAME/CLEAR_OFFLINE_RESULT':
      return updateUiState(state, (ui) => ({
        ...ui,
        lastOfflineResult: null
      }))
    case 'GAME/TICK':
      return handleTick(state, action.payload.nowIso)
    case 'GAME/SET_FISH_COUNT':
      return handleSetFishCount(state, action.payload)
    case 'GAME/SET_FISH_LANE':
      return handleSetFishLane(state, action.payload)
    case 'SETTINGS/SET_SOUND':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        soundEnabled: action.payload.enabled
      }))
    case 'SETTINGS/SET_MOTION':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        motionEnabled: action.payload.enabled
      }))
    case 'SETTINGS/SET_PHOTO_MODE':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        photoMode: {
          ...preferences.photoMode,
          enabled: action.payload.enabled
        }
      }))
    case 'SETTINGS/SET_PHOTO_FOLLOW_MODE':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        photoMode: {
          ...preferences.photoMode,
          followMode: action.payload.followMode
        }
      }))
    default:
      return state
  }
}
