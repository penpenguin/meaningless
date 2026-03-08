import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from './createAppStore'

describe('createAppStore', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds pearls every 300 seconds while visible', async () => {
    vi.useFakeTimers()
    const store = createAppStore({ tickIntervalMs: 1000 })

    await vi.advanceTimersByTimeAsync(299_000)
    expect(store.getState().profile.currency.pearls).toBe(0)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(store.getState().profile.currency.pearls).toBe(1)

    store.destroy()
  })
})
