import { getDecorContent, getFishContent } from '../content/registry'
import { getDecorAt } from './catalog'
import { simulateGameSave, refreshTankProgression } from './simulation'
import { isFishUnlockRequirementMet } from './unlocks'
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

const withProfileCoins = (game: GameSave, coins: number): GameSave => {
  return {
    ...game,
    profile: {
      ...game.profile,
      currency: {
        ...game.profile.currency,
        coins
      }
    }
  }
}

const refreshGame = (game: GameSave): GameSave => {
  return {
    ...game,
    tanks: game.tanks.map(refreshTankProgression)
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

const handleUnlockFish = (state: GameAppState, speciesId: string): GameAppState => {
  const fish = getFishContent(speciesId)
  if (!fish) return state
  if (state.game.profile.unlockedFishIds.includes(fish.speciesId)) return state
  if (!isFishUnlockRequirementMet(state.game, fish)) return state
  if (state.game.profile.currency.coins < fish.gameplay.unlockCost) return state

  const nextCoins = state.game.profile.currency.coins - fish.gameplay.unlockCost
  return updateGameState(state, (game) => ({
    ...withProfileCoins(game, nextCoins),
    profile: {
      ...game.profile,
      currency: {
        ...game.profile.currency,
        coins: nextCoins
      },
      unlockedFishIds: [...game.profile.unlockedFishIds, fish.speciesId]
    }
  }))
}

const handleUnlockDecor = (state: GameAppState, decorId: string): GameAppState => {
  const decor = getDecorContent(decorId)
  if (!decor) return state
  if (state.game.profile.unlockedDecorIds.includes(decor.decorId)) return state
  if (state.game.profile.currency.coins < decor.gameplay.unlockCost) return state

  const nextCoins = state.game.profile.currency.coins - decor.gameplay.unlockCost
  return updateGameState(state, (game) => ({
    ...withProfileCoins(game, nextCoins),
    profile: {
      ...game.profile,
      currency: {
        ...game.profile.currency,
        coins: nextCoins
      },
      unlockedDecorIds: [...game.profile.unlockedDecorIds, decor.decorId]
    }
  }))
}

const handleSetFishCount = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/SET_FISH_COUNT' }>['payload']
): GameAppState => {
  const fish = getFishContent(payload.speciesId)
  if (!fish) return state
  if (!state.game.profile.unlockedFishIds.includes(fish.speciesId)) return state

  const normalizedCount = Math.max(0, Math.floor(payload.count))
  const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
  if (!activeTank) return state
  const current = activeTank.fishSchools.find((school) => school.speciesId === fish.speciesId)
  const currentCount = current?.count ?? 0
  const delta = normalizedCount - currentCount
  const cost = delta > 0 ? delta * fish.gameplay.purchaseCostPerFish : 0
  if (cost > state.game.profile.currency.coins) return state

  const nextGame = withActiveTank(withProfileCoins(state.game, state.game.profile.currency.coins - cost), (tank) => {
    const remaining = tank.fishSchools.filter((school) => school.speciesId !== fish.speciesId)
    if (normalizedCount <= 0) {
      return refreshTankProgression({
        ...tank,
        fishSchools: remaining
      })
    }

    return refreshTankProgression({
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
    })
  })

  return updateGameState(state, () => refreshGame(nextGame))
}

const handleSetFishLane = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/SET_FISH_LANE' }>['payload']
): GameAppState => {
  const nextGame = withActiveTank(state.game, (tank) => refreshTankProgression({
    ...tank,
    fishSchools: tank.fishSchools.map((school) =>
      school.speciesId === payload.speciesId
        ? { ...school, lane: payload.lane }
        : school
    )
  }))

  return updateGameState(state, () => refreshGame(nextGame))
}

const handlePlaceDecor = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/PLACE_DECOR' }>['payload']
): GameAppState => {
  if (!state.game.profile.unlockedDecorIds.includes(payload.decorId)) return state
  const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
  if (!activeTank) return state
  if (
    payload.x < 0 ||
    payload.y < 0 ||
    payload.x >= activeTank.layout.columns ||
    payload.y >= activeTank.layout.rows
  ) {
    return state
  }

  const nextGame = withActiveTank(state.game, (tank) => {
    const existing = getDecorAt(tank, payload.x, payload.y)
    const decor = existing
      ? tank.decor.map((item) =>
          item.id === existing.id
            ? { ...item, decorId: payload.decorId }
            : item
        )
      : [
          ...tank.decor,
          {
            id: `decor-${payload.x}-${payload.y}`,
            decorId: payload.decorId,
            x: payload.x,
            y: payload.y
          }
        ]

    return refreshTankProgression({
      ...tank,
      decor
    })
  })

  return updateGameState(state, () => refreshGame(nextGame))
}

const handleRemoveDecor = (
  state: GameAppState,
  payload: Extract<GameAction, { type: 'GAME/REMOVE_DECOR' }>['payload']
): GameAppState => {
  const nextGame = withActiveTank(state.game, (tank) => refreshTankProgression({
    ...tank,
    decor: tank.decor.filter((item) => item.x !== payload.x || item.y !== payload.y)
  }))

  return updateGameState(state, () => refreshGame(nextGame))
}

const handleCleanTank = (state: GameAppState): GameAppState => {
  const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
  if (!activeTank) return state
  const totalFish = activeTank.fishSchools.reduce((total, school) => total + school.count, 0)
  const maintenanceCost = Math.max(4, Math.ceil(totalFish / 4))
  if (state.game.profile.currency.coins < maintenanceCost) return state

  const nextGame = withActiveTank(withProfileCoins(state.game, state.game.profile.currency.coins - maintenanceCost), (tank) => refreshTankProgression({
    ...tank,
    progression: {
      ...tank.progression,
      waterQuality: 100
    }
  }))

  return updateGameState(state, () => ({
    ...refreshGame(nextGame),
    profile: {
      ...nextGame.profile,
      stats: {
        ...nextGame.profile.stats,
        totalMaintenanceActions: nextGame.profile.stats.totalMaintenanceActions + 1
      }
    }
  }))
}

export const gameReducer = (state: GameAppState, action: GameAction): GameAppState => {
  switch (action.type) {
    case 'UI/SET_MODE':
      return updateUiState(state, (ui) => ({
        ...ui,
        mode: action.payload.mode
      }))
    case 'UI/SELECT_DECOR':
      return updateUiState(state, (ui) => ({
        ...ui,
        selectedDecorId: action.payload.decorId
      }))
    case 'GAME/CLEAR_OFFLINE_RESULT':
      return updateUiState(state, (ui) => ({
        ...ui,
        lastOfflineResult: null
      }))
    case 'GAME/TICK':
      return handleTick(state, action.payload.nowIso)
    case 'GAME/UNLOCK_FISH':
      return handleUnlockFish(state, action.payload.speciesId)
    case 'GAME/UNLOCK_DECOR':
      return handleUnlockDecor(state, action.payload.decorId)
    case 'GAME/SET_FISH_COUNT':
      return handleSetFishCount(state, action.payload)
    case 'GAME/SET_FISH_LANE':
      return handleSetFishLane(state, action.payload)
    case 'GAME/PLACE_DECOR':
      return handlePlaceDecor(state, action.payload)
    case 'GAME/REMOVE_DECOR':
      return handleRemoveDecor(state, action.payload)
    case 'GAME/CLEAN_TANK':
      return handleCleanTank(state)
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
    case 'SETTINGS/SET_QUALITY':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        quality: action.payload.quality
      }))
    case 'SETTINGS/SET_HUD_VISIBILITY':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        hudVisible: action.payload.visible
      }))
    case 'SETTINGS/SET_PHOTO_MODE':
      return updatePreferences(state, (preferences) => ({
        ...preferences,
        photoModeEnabled: action.payload.enabled,
        hudVisible: action.payload.enabled ? false : true
      }))
    default:
      return state
  }
}
