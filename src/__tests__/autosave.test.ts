import { describe, expect, it, vi } from 'vitest'
import { createAquariumStore } from '../utils/aquariumStore'
import { setupAutosaveOnEditEnd } from '../utils/autosave'


describe('autosave on edit end', () => {
  it('saves when mode transitions from edit to view', () => {
    const store = createAquariumStore()
    const saveFn = vi.fn()

    const unsubscribe = setupAutosaveOnEditEnd(store, saveFn)

    store.setMode('edit')
    store.setMode('view')

    expect(saveFn).toHaveBeenCalledTimes(1)

    unsubscribe()
  })
})
