import type { AquariumState, ViewMode } from '../types/aquarium'
import type { AquariumStore } from './aquariumStore'
import { setAutoSave } from './storage'

export const setupAutosaveOnEditEnd = (
  store: AquariumStore,
  save: (state: AquariumState) => void = (state) => setAutoSave(state)
): (() => void) => {
  let lastMode: ViewMode = store.getMode()

  return store.subscribe(({ mode, state }) => {
    if (lastMode === 'edit' && mode === 'view') {
      save(state)
    }
    lastMode = mode
  })
}
