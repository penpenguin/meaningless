import { describe, expect, it } from 'vitest'
import { createGameStore } from '../game/createGameStore'
import { createDefaultGameSave } from '../game/gameSave'
import { createGameHudOverlay } from './GameHudOverlay'

const mountOverlay = (store: ReturnType<typeof createGameStore>) => {
  const overlayHandle = createGameHudOverlay({ store })
  document.body.appendChild(overlayHandle.element)

  return {
    overlay: overlayHandle.element,
    dispose: overlayHandle.dispose
  }
}

describe('createGameHudOverlay', () => {
  it('surfaces the active mode, maintenance cost, and the next gameplay step', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const tankButton = overlay.querySelector('[data-mode="tank"]') as HTMLButtonElement
      const layoutButton = overlay.querySelector('[data-mode="layout"]') as HTMLButtonElement
      const guide = overlay.querySelector('.hud-guide') as HTMLDivElement

      expect(tankButton.getAttribute('aria-pressed')).toBe('true')
      expect(layoutButton.getAttribute('aria-pressed')).toBe('false')
      expect(overlay.textContent).toContain('Restore Water (4 coins)')
      expect(guide.textContent).toContain('spread schools across depths')
      expect(guide.textContent).toContain('calm schools')
      expect(overlay.textContent).toContain('Behavior')
      expect(overlay.textContent).toContain('Settled')

      layoutButton.click()

      expect(tankButton.getAttribute('aria-pressed')).toBe('false')
      expect(layoutButton.getAttribute('aria-pressed')).toBe('true')
      expect(guide.textContent).toContain('hideouts')
      expect(guide.textContent).toContain('Eraser')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('describes crowded tanks as alert in the tank summary', () => {
    const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
    const tank = save.tanks[0]
    if (!tank) throw new Error('tank missing')

    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: {
        game: {
          ...save,
          tanks: [
            {
              ...tank,
              fishSchools: [
                {
                  ...tank.fishSchools[0],
                  count: 24,
                  lane: 'middle'
                }
              ]
            }
          ]
        },
        ui: {
          mode: 'tank',
          selectedDecorId: null,
          lastOfflineResult: null
        }
      }
    })

    try {
      const { overlay } = mountOverlay(store)

      expect(overlay.textContent).toContain('Behavior')
      expect(overlay.textContent).toContain('Alert')
      expect(overlay.textContent).toContain('Fish are clustering low')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('elevates coins into a hero badge and splits tank vitals into separate chips', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const currencyLabel = overlay.querySelector('.hud-currency-label')
      const currencyValue = overlay.querySelector('.hud-currency-value')
      const statTexts = Array.from(
        overlay.querySelectorAll('.hud-secondary-stat')
      ).map((element) => element.textContent)

      expect(currencyLabel?.textContent).toBe('Coins')
      expect(currencyValue?.textContent).toBe('12')
      expect(statTexts).toEqual([
        'Income 2/min',
        'Comfort 45',
        'Water 100'
      ])
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('turns progress into stat cards with a next milestone callout', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const progressButton = overlay.querySelector('[data-mode="progress"]') as HTMLButtonElement
      progressButton.click()

      const cards = overlay.querySelectorAll('.hud-stat-card')
      const callout = overlay.querySelector('.hud-progress-callout')

      expect(cards.length).toBeGreaterThanOrEqual(4)
      expect(callout?.textContent).toContain('Next unlock')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('shows observation progress and fish descriptions in the unlock panel', () => {
    const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: {
        game: {
          ...save,
          profile: {
            ...save.profile,
            currency: {
              ...save.profile.currency,
              coins: 80
            },
            stats: {
              ...save.profile.stats,
              totalViewedSeconds: 10 * 60
            }
          }
        },
        ui: {
          mode: 'shop',
          selectedDecorId: null,
          lastOfflineResult: null
        }
      }
    })

    try {
      const { overlay } = mountOverlay(store)

      expect(overlay.textContent).toContain('縦長の優雅なシルエット')
      expect(overlay.textContent).toContain('Observe 10m / 15m')
      expect(overlay.textContent).toContain('Observe 5m')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('surfaces the next observation milestone in progress', () => {
    const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: {
        game: {
          ...save,
          profile: {
            ...save.profile,
            stats: {
              ...save.profile.stats,
              totalViewedSeconds: 10 * 60
            }
          }
        },
        ui: {
          mode: 'progress',
          selectedDecorId: null,
          lastOfflineResult: null
        }
      }
    })

    try {
      const { overlay } = mountOverlay(store)

      expect(overlay.textContent).toContain('Observation')
      expect(overlay.textContent).toContain('10m')
      expect(overlay.textContent).toContain('5m to エンゼルフィッシュ')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('uses custom toggle buttons and quality chips in settings', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const settingsButton = overlay.querySelector('[data-mode="settings"]') as HTMLButtonElement
      settingsButton.click()

      const settingsPanel = overlay.querySelector('[data-panel="settings"]') as HTMLDivElement

      expect(settingsPanel.querySelectorAll('input[type="checkbox"]').length).toBe(0)
      expect(settingsPanel.querySelectorAll('select').length).toBe(0)
      expect(settingsPanel.querySelectorAll('.hud-toggle-button').length).toBe(3)
      expect(
        Array.from(settingsPanel.querySelectorAll('.hud-segmented button')).map((button) => button.textContent)
      ).toEqual(['簡易', '標準'])
      expect(settingsPanel.textContent).toContain('Photo Mode')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('shows layout status and lane chips instead of native selects', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const layoutButton = overlay.querySelector('[data-mode="layout"]') as HTMLButtonElement
      layoutButton.click()

      const layoutPanel = overlay.querySelector('[data-panel="layout"]') as HTMLDivElement
      const status = layoutPanel.querySelector('.hud-layout-status')
      const boardCaption = layoutPanel.querySelector('.hud-board-caption')

      expect(layoutPanel.querySelectorAll('select').length).toBe(0)
      expect(layoutPanel.querySelectorAll('.hud-lane-chip').length).toBeGreaterThanOrEqual(3)
      expect(status?.textContent).toContain('Tool')
      expect(boardCaption?.textContent).toContain('blueprint')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('stacks the topbar and panels inside a shared rail to avoid overlap', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const rail = overlay.querySelector('.hud-rail')
      const topbar = overlay.querySelector('.hud-topbar')
      const panelContainer = overlay.querySelector('.hud-panel-container')

      expect(rail).toBeInstanceOf(HTMLDivElement)
      expect(rail?.firstElementChild).toBe(topbar)
      expect(rail?.lastElementChild).toBe(panelContainer)
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('collapses to a fixed reveal tab and restores the previous HUD state', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const layoutButton = overlay.querySelector('[data-mode="layout"]') as HTMLButtonElement
      layoutButton.click()

      const hideButton = overlay.querySelector('[data-action="hide-hud"]') as HTMLButtonElement
      hideButton.click()

      const rail = overlay.querySelector('.hud-rail') as HTMLDivElement
      const revealTab = overlay.querySelector('[data-action="show-hud"]') as HTMLButtonElement

      expect(store.getState().game.profile.preferences.hudVisible).toBe(false)
      expect(rail.hidden).toBe(true)
      expect(revealTab.hidden).toBe(false)

      revealTab.click()

      expect(store.getState().game.profile.preferences.hudVisible).toBe(true)
      expect(rail.hidden).toBe(false)
      expect(revealTab.hidden).toBe(true)
      expect((overlay.querySelector('[data-mode="layout"]') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('renders only the reveal tab when HUD starts hidden', () => {
    const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: {
        game: {
          ...save,
          profile: {
            ...save.profile,
            preferences: {
              ...save.profile.preferences,
              hudVisible: false
            }
          }
        },
        ui: {
          mode: 'tank',
          selectedDecorId: null,
          lastOfflineResult: null
        }
      }
    })

    try {
      const { overlay } = mountOverlay(store)

      const rail = overlay.querySelector('.hud-rail') as HTMLDivElement
      const revealTab = overlay.querySelector('[data-action="show-hud"]') as HTMLButtonElement

      expect(rail.hidden).toBe(true)
      expect(revealTab.hidden).toBe(false)
      expect(revealTab.textContent).toContain('Show HUD')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('uses the reveal tab to exit photo mode and restore the HUD', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const { overlay } = mountOverlay(store)

      const settingsButton = overlay.querySelector('[data-mode="settings"]') as HTMLButtonElement
      settingsButton.click()

      const toggles = Array.from(overlay.querySelectorAll('.hud-toggle-button')) as HTMLButtonElement[]
      const photoModeButton = toggles[2]
      expect(photoModeButton?.textContent).toBe('Off')

      photoModeButton?.click()

      const revealTab = overlay.querySelector('[data-action="show-hud"]') as HTMLButtonElement
      expect(store.getState().game.profile.preferences.photoModeEnabled).toBe(true)
      expect(store.getState().game.profile.preferences.hudVisible).toBe(false)
      expect(revealTab.hidden).toBe(false)
      expect(revealTab.textContent).toContain('Exit Photo Mode')

      revealTab.click()

      expect(store.getState().game.profile.preferences.photoModeEnabled).toBe(false)
      expect(store.getState().game.profile.preferences.hudVisible).toBe(true)
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })

  it('stops reacting to store updates after dispose', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })
    const { overlay, dispose } = mountOverlay(store)

    try {
      const currencyValue = overlay.querySelector('.hud-currency-value')
      expect(currencyValue?.textContent).toBe('12')

      dispose()
      store.dispatch({
        type: 'GAME/UNLOCK_DECOR',
        payload: { decorId: 'coral' }
      })

      expect(currencyValue?.textContent).toBe('12')
    } finally {
      document.body.innerHTML = ''
      store.destroy()
    }
  })
})
