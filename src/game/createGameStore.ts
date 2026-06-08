import { createHydratedGameAppState } from './gameSave'
import { gameReducer } from './gameReducer'
import type { GameAction, GameAppState, GameSave } from './types'

export type GameSnapshot = {
  state: GameAppState
  action: GameAction | null
}

export type GameStore = {
  getState: () => GameAppState
  dispatch: (action: GameAction) => void
  subscribe: (listener: (snapshot: GameSnapshot) => void) => () => void
  destroy: () => void
}

type CreateGameStoreOptions = {
  initialState?: GameAppState
  tickIntervalMs?: number
  autoSaveIntervalMs?: number
  onGameStateChange?: (game: GameSave) => void
}

const DEFAULT_AUTO_SAVE_INTERVAL_MS = 60_000

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

const getGameSaveTimestampMs = (save: GameSave): number => {
  const timestamp = Date.parse(save.lastSimulatedAt)
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

export const createGameStore = (options: CreateGameStoreOptions = {}): GameStore => {
  let state = options.initialState ?? createHydratedGameAppState()
  const listeners = new Set<(snapshot: GameSnapshot) => void>()
  const tickIntervalMs = options.tickIntervalMs ?? 1000
  const autoSaveIntervalMs = Math.max(0, options.autoSaveIntervalMs ?? DEFAULT_AUTO_SAVE_INTERVAL_MS)
  let lastPersistedGameAtMs = getGameSaveTimestampMs(state.game)
  let hasPendingTickPersistence = false

  const notify = (action: GameAction | null): void => {
    listeners.forEach((listener) => listener({ state, action }))
  }

  const persistGameChange = (action: GameAction): void => {
    if (!options.onGameStateChange) return

    const currentGameAtMs = getGameSaveTimestampMs(state.game)
    if (action.type === 'GAME/TICK' && currentGameAtMs - lastPersistedGameAtMs < autoSaveIntervalMs) {
      hasPendingTickPersistence = true
      return
    }

    lastPersistedGameAtMs = currentGameAtMs
    hasPendingTickPersistence = false
    options.onGameStateChange(state.game)
  }

  const dispatch = (action: GameAction): void => {
    const nextState = gameReducer(state, action)
    if (nextState === state) return

    const previousGame = state.game
    state = nextState
    notify(action)

    if (previousGame !== state.game) {
      persistGameChange(action)
    }
  }

  const interval = setInterval(() => {
    if (!isDocumentVisible()) return
    dispatch({
      type: 'GAME/TICK',
      payload: {
        nowIso: new Date().toISOString()
      }
    })
  }, tickIntervalMs)

  const subscribe = (listener: (snapshot: GameSnapshot) => void): (() => void) => {
    listeners.add(listener)
    listener({ state, action: null })
    return () => {
      listeners.delete(listener)
    }
  }

  const destroy = (): void => {
    clearInterval(interval)
    if (hasPendingTickPersistence) {
      options.onGameStateChange?.(state.game)
    }
  }

  return {
    getState: () => state,
    dispatch,
    subscribe,
    destroy
  }
}
