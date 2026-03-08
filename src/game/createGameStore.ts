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
  onGameStateChange?: (game: GameSave) => void
}

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

export const createGameStore = (options: CreateGameStoreOptions = {}): GameStore => {
  let state = options.initialState ?? createHydratedGameAppState()
  const listeners = new Set<(snapshot: GameSnapshot) => void>()
  const tickIntervalMs = options.tickIntervalMs ?? 1000

  const notify = (action: GameAction | null): void => {
    listeners.forEach((listener) => listener({ state, action }))
  }

  const dispatch = (action: GameAction): void => {
    const nextState = gameReducer(state, action)
    if (nextState === state) return

    const previousGame = state.game
    state = nextState
    notify(action)

    if (previousGame !== state.game) {
      options.onGameStateChange?.(state.game)
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
  }

  return {
    getState: () => state,
    dispatch,
    subscribe,
    destroy
  }
}
