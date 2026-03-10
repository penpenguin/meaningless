import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore } from './createGameStore'
import { createHydratedGameAppState } from './gameSave'

describe('createGameStore', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances coins with passive income on tick', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T00:00:00.000Z'))
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' }),
      tickIntervalMs: 1000
    })
    const initialCoins = store.getState().game.profile.currency.coins

    await vi.advanceTimersByTimeAsync(60_000)

    expect(store.getState().game.profile.currency.coins).toBeGreaterThan(initialCoins)
    store.destroy()
  })

  it('spends coins to unlock species and improve income by changing layout', () => {
    const seeded = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    const store = createGameStore({
      initialState: {
        ...seeded,
        game: {
          ...seeded.game,
          profile: {
            ...seeded.game.profile,
            currency: {
              ...seeded.game.profile.currency,
              coins: 80
            }
          }
        }
      }
    })

    store.dispatch({ type: 'GAME/UNLOCK_FISH', payload: { speciesId: 'clownfish' } })
    store.dispatch({ type: 'GAME/SET_FISH_COUNT', payload: { speciesId: 'clownfish', count: 4 } })
    store.dispatch({ type: 'GAME/UNLOCK_DECOR', payload: { decorId: 'coral' } })
    store.dispatch({ type: 'GAME/PLACE_DECOR', payload: { decorId: 'coral', x: 2, y: 2 } })

    const state = store.getState()
    expect(state.game.profile.unlockedFishIds).toContain('clownfish')
    expect(state.game.profile.unlockedDecorIds).toContain('coral')
    expect(state.game.tanks[0]?.progression.incomePerMinute).toBeGreaterThan(1)

    store.destroy()
  })

  it('requires observation time before unlocking watch-based species', () => {
    const seeded = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: {
        ...seeded,
        game: {
          ...seeded.game,
          profile: {
            ...seeded.game.profile,
            currency: {
              ...seeded.game.profile.currency,
              coins: 80
            }
          }
        }
      }
    })

    store.dispatch({ type: 'GAME/UNLOCK_FISH', payload: { speciesId: 'angelfish' } })
    expect(store.getState().game.profile.unlockedFishIds).not.toContain('angelfish')

    store.dispatch({
      type: 'GAME/TICK',
      payload: {
        nowIso: '2026-03-08T00:15:00.000Z'
      }
    })
    store.dispatch({ type: 'GAME/UNLOCK_FISH', payload: { speciesId: 'angelfish' } })

    expect(store.getState().game.profile.unlockedFishIds).toContain('angelfish')
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

  it('cleans the active tank and resets water quality', () => {
    const store = createGameStore({
      initialState: createHydratedGameAppState({
        save: {
          ...createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' }).game,
          lastSimulatedAt: '2026-03-08T00:00:00.000Z'
        },
        nowIso: '2026-03-08T04:00:00.000Z'
      })
    })

    const before = store.getState().game.tanks[0]?.progression.waterQuality ?? 100
    store.dispatch({ type: 'GAME/CLEAN_TANK' })
    const after = store.getState().game.tanks[0]?.progression.waterQuality ?? 0

    expect(before).toBeLessThan(100)
    expect(after).toBe(100)

    store.destroy()
  })

  it('persists HUD visibility through settings actions', () => {
    const store = createGameStore({
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    })

    expect(store.getState().game.profile.preferences.hudVisible).toBe(true)

    store.dispatch({ type: 'SETTINGS/SET_HUD_VISIBILITY', payload: { visible: false } })
    expect(store.getState().game.profile.preferences.hudVisible).toBe(false)

    store.dispatch({ type: 'SETTINGS/SET_HUD_VISIBILITY', payload: { visible: true } })
    expect(store.getState().game.profile.preferences.hudVisible).toBe(true)

    store.destroy()
  })
})
