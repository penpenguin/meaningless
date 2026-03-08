import type { AppAction, AppState } from '../../types/app'
import { createDefaultAppState } from '../state/defaultAppState'
import { appReducer } from './reducers/appReducer'
import type { AppStoreEffect } from './effects/types'

export type AppSnapshot = {
  state: AppState
  action: AppAction | null
}

export type AppStore = {
  getState: () => AppState
  dispatch: (action: AppAction) => void
  subscribe: (listener: (snapshot: AppSnapshot) => void) => () => void
  destroy: () => void
}

type CreateAppStoreOptions = {
  initialState?: AppState
  effects?: AppStoreEffect[]
  tickIntervalMs?: number
}

const isDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

export const createAppStore = (options: CreateAppStoreOptions = {}): AppStore => {
  let state = options.initialState ?? createDefaultAppState()
  const listeners = new Set<(snapshot: AppSnapshot) => void>()
  const effects = options.effects ?? []
  const tickIntervalMs = options.tickIntervalMs ?? 1000

  const notify = (action: AppAction | null): void => {
    const snapshot = { state, action }
    listeners.forEach((listener) => listener(snapshot))
  }

  const getState = (): AppState => state

  const dispatch = (action: AppAction): void => {
    const prevState = state
    const nextState = appReducer(state, action)
    const hasChanged =
      prevState.tank !== nextState.tank ||
      prevState.profile !== nextState.profile ||
      prevState.settings !== nextState.settings ||
      prevState.ui !== nextState.ui

    if (!hasChanged) return

    state = nextState
    notify(action)

    effects.forEach((effect) => {
      effect.onAction({
        action,
        prevState,
        nextState
      })
    })
  }

  const interval = setInterval(() => {
    if (!isDocumentVisible()) return
    dispatch({
      type: 'PROFILE/VIEW_TICK',
      payload: { seconds: 1 }
    })
  }, tickIntervalMs)

  const subscribe = (listener: (snapshot: AppSnapshot) => void): (() => void) => {
    listeners.add(listener)
    listener({ state, action: null })
    return () => {
      listeners.delete(listener)
    }
  }

  const destroy = (): void => {
    clearInterval(interval)
    effects.forEach((effect) => effect.destroy())
  }

  return {
    getState,
    dispatch,
    subscribe,
    destroy
  }
}
