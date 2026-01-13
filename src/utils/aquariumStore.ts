import type { AquariumState, FishGroup, Settings, Theme, ViewMode } from '../types/aquarium'
import { createDefaultState, migrateState } from './stateSchema'

export type AquariumSnapshot = {
  state: AquariumState
  mode: ViewMode
}

export type AquariumListener = (snapshot: AquariumSnapshot) => void

export const createAquariumStore = (initialState?: AquariumState) => {
  let state = initialState ? migrateState(initialState) : createDefaultState()
  let mode: ViewMode = 'view'
  const listeners = new Set<AquariumListener>()

  const notify = (): void => {
    const snapshot = { state, mode }
    listeners.forEach((listener) => listener(snapshot))
  }

  const getState = (): AquariumState => state
  const getMode = (): ViewMode => mode

  const setState = (next: AquariumState): void => {
    state = migrateState(next)
    notify()
  }

  const setMode = (next: ViewMode): void => {
    mode = next
    notify()
  }

  const updateTheme = (partial: Partial<Theme>): void => {
    state = {
      ...state,
      theme: {
        ...state.theme,
        ...partial
      }
    }
    notify()
  }

  const updateSettings = (partial: Partial<Settings>): void => {
    state = {
      ...state,
      settings: {
        ...state.settings,
        ...partial
      }
    }
    notify()
  }

  const setFishGroups = (groups: FishGroup[]): void => {
    state = {
      ...state,
      fishGroups: groups
    }
    notify()
  }

  const addFishGroup = (group: FishGroup): void => {
    state = {
      ...state,
      fishGroups: [...state.fishGroups, group]
    }
    notify()
  }

  const updateFishGroupCount = (speciesId: string, count: number): void => {
    state = {
      ...state,
      fishGroups: state.fishGroups.map((group) =>
        group.speciesId === speciesId ? { ...group, count } : group
      )
    }
    notify()
  }

  const removeFishGroup = (speciesId: string): void => {
    state = {
      ...state,
      fishGroups: state.fishGroups.filter((group) => group.speciesId !== speciesId)
    }
    notify()
  }

  const subscribe = (listener: AquariumListener): (() => void) => {
    listeners.add(listener)
    listener({ state, mode })
    return () => listeners.delete(listener)
  }

  return {
    getState,
    getMode,
    setState,
    setMode,
    updateTheme,
    updateSettings,
    setFishGroups,
    addFishGroup,
    updateFishGroupCount,
    removeFishGroup,
    subscribe
  }
}

export type AquariumStore = ReturnType<typeof createAquariumStore>
