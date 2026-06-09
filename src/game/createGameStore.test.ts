import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore } from './createGameStore'
import { createHydratedGameAppState } from './gameSave'

describe('createGameStore', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances viewed time on tick without tracking currency', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T00:00:00.000Z'))
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' }),
      tickIntervalMs: 1000
    })

    await vi.advanceTimersByTimeAsync(60_000)

    expect(store.getState().game.profile).not.toHaveProperty('currency')
    expect(store.getState().game.profile.stats.totalViewedSeconds).toBe(60)
    store.destroy()
  })

  it('throttles automatic tick persistence to once per minute', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T00:00:00.000Z'))
    const onGameStateChange = vi.fn()
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' }),
      tickIntervalMs: 1000,
      onGameStateChange
    })

    await vi.advanceTimersByTimeAsync(59_000)
    expect(onGameStateChange).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000)
    expect(onGameStateChange).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(59_000)
    expect(onGameStateChange).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(onGameStateChange).toHaveBeenCalledTimes(2)
    store.destroy()
  })

  it('persists direct player actions immediately', () => {
    const onGameStateChange = vi.fn()
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' }),
      onGameStateChange
    })

    store.dispatch({ type: 'SETTINGS/SET_SOUND', payload: { enabled: false } })

    expect(onGameStateChange).toHaveBeenCalledTimes(1)
    store.destroy()
  })

  it('stocks every catalog species without unlocks or coins', () => {
    const seeded = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    const store = createGameStore({
      initialState: seeded
    })

    store.dispatch({ type: 'GAME/SET_FISH_COUNT', payload: { speciesId: 'clownfish', count: 4 } })

    const state = store.getState()
    expect(state.game.profile).not.toHaveProperty('unlockedFishIds')
    expect(state.game.tanks[0]?.progression.incomePerMinute).toBeGreaterThan(1)

    store.destroy()
  })

  it('hydrates ui without decor placement selection state', () => {
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    })

    expect(store.getState().ui).not.toHaveProperty('selectedDecorId')

    store.destroy()
  })

  it('tracks visible observation time without inflating offline totals', () => {
    const seeded = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: seeded
    })

    store.dispatch({
      type: 'GAME/TICK',
      payload: {
        nowIso: '2026-03-08T00:01:00.000Z'
      }
    })

    expect(store.getState().game.profile.stats.totalViewedSeconds).toBe(60)
    expect(store.getState().game.profile.stats.totalOfflineSeconds).toBe(0)
    expect(store.getState().ui.lastOfflineResult).toBeNull()
    store.destroy()
  })

  it('toggles photo mode and switches follow mode independently of HUD visibility', () => {
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    })

    expect(store.getState().game.profile.preferences.photoMode.enabled).toBe(false)
    expect(store.getState().game.profile.preferences.photoMode.followMode).toBe('fish')

    store.dispatch({ type: 'SETTINGS/SET_PHOTO_MODE', payload: { enabled: true } })
    store.dispatch({ type: 'SETTINGS/SET_PHOTO_FOLLOW_MODE', payload: { followMode: 'mouse' } })

    expect(store.getState().game.profile.preferences.photoMode.enabled).toBe(true)
    expect(store.getState().game.profile.preferences.photoMode.followMode).toBe('mouse')

    store.dispatch({ type: 'SETTINGS/SET_PHOTO_MODE', payload: { enabled: false } })

    expect(store.getState().game.profile.preferences.photoMode.enabled).toBe(false)
    expect(store.getState().game.profile.preferences).not.toHaveProperty('hudVisible')

    store.destroy()
  })
})
