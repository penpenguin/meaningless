import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultAppState } from '../../state/defaultAppState'
import { createPersistenceEffect } from './persistenceEffect'

describe('persistenceEffect', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces tank/profile/settings persistence', async () => {
    vi.useFakeTimers()
    const saveTank = vi.fn()
    const saveProfile = vi.fn()
    const saveSettings = vi.fn()
    const effect = createPersistenceEffect({
      saveTank,
      saveProfile,
      saveSettings,
      delayMs: 500
    })

    const prev = createDefaultAppState()
    const next = {
      ...prev,
      tank: {
        ...prev.tank,
        fishGroups: [...prev.tank.fishGroups, { speciesId: 'clownfish', count: 1 }]
      }
    }

    effect.onAction({
      action: { type: 'TANK/SET_FISH_COUNT', payload: { speciesId: 'clownfish', count: 1 } },
      prevState: prev,
      nextState: next
    })

    effect.onAction({
      action: { type: 'UI/SET_MODE', payload: { mode: 'collection' } },
      prevState: next,
      nextState: {
        ...next,
        ui: {
          ...next.ui,
          mode: 'collection'
        }
      }
    })

    await vi.advanceTimersByTimeAsync(499)
    expect(saveTank).toHaveBeenCalledTimes(0)
    expect(saveProfile).toHaveBeenCalledTimes(0)
    expect(saveSettings).toHaveBeenCalledTimes(0)

    await vi.advanceTimersByTimeAsync(1)
    expect(saveTank).toHaveBeenCalledTimes(1)
    expect(saveProfile).toHaveBeenCalledTimes(0)
    expect(saveSettings).toHaveBeenCalledTimes(0)

    effect.destroy()
  })
})
