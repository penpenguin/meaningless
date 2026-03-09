import { describe, expect, it } from 'vitest'
import { createGameStore } from '../game/createGameStore'
import { createGameHudOverlay } from './GameHudOverlay'

describe('createGameHudOverlay', () => {
  it('surfaces the active mode, maintenance cost, and the next gameplay step', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const overlay = createGameHudOverlay({ store })
      document.body.appendChild(overlay)

      const tankButton = overlay.querySelector('[data-mode="tank"]') as HTMLButtonElement
      const layoutButton = overlay.querySelector('[data-mode="layout"]') as HTMLButtonElement
      const guide = overlay.querySelector('.hud-guide') as HTMLDivElement

      expect(tankButton.getAttribute('aria-pressed')).toBe('true')
      expect(layoutButton.getAttribute('aria-pressed')).toBe('false')
      expect(overlay.textContent).toContain('Restore Water (4 coins)')
      expect(guide.textContent).toContain('Unlock')
      expect(guide.textContent).toContain('Layout')

      layoutButton.click()

      expect(tankButton.getAttribute('aria-pressed')).toBe('false')
      expect(layoutButton.getAttribute('aria-pressed')).toBe('true')
      expect(guide.textContent).toContain('grid cell')
      expect(guide.textContent).toContain('Eraser')
    } finally {
      store.destroy()
      document.body.innerHTML = ''
    }
  })

  it('elevates coins into a hero badge and splits tank vitals into separate chips', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const overlay = createGameHudOverlay({ store })
      document.body.appendChild(overlay)

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
      store.destroy()
      document.body.innerHTML = ''
    }
  })

  it('turns progress into stat cards with a next milestone callout', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const overlay = createGameHudOverlay({ store })
      document.body.appendChild(overlay)

      const progressButton = overlay.querySelector('[data-mode="progress"]') as HTMLButtonElement
      progressButton.click()

      const cards = overlay.querySelectorAll('.hud-stat-card')
      const callout = overlay.querySelector('.hud-progress-callout')

      expect(cards.length).toBeGreaterThanOrEqual(4)
      expect(callout?.textContent).toContain('Next unlock')
    } finally {
      store.destroy()
      document.body.innerHTML = ''
    }
  })

  it('uses custom toggle buttons and quality chips in settings', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const overlay = createGameHudOverlay({ store })
      document.body.appendChild(overlay)

      const settingsButton = overlay.querySelector('[data-mode="settings"]') as HTMLButtonElement
      settingsButton.click()

      const settingsPanel = overlay.querySelector('[data-panel="settings"]') as HTMLDivElement

      expect(settingsPanel.querySelectorAll('input[type="checkbox"]').length).toBe(0)
      expect(settingsPanel.querySelectorAll('select').length).toBe(0)
      expect(settingsPanel.querySelectorAll('.hud-toggle-button').length).toBe(2)
      expect(
        Array.from(settingsPanel.querySelectorAll('.hud-segmented button')).map((button) => button.textContent)
      ).toEqual(['Low', 'Medium', 'High'])
    } finally {
      store.destroy()
      document.body.innerHTML = ''
    }
  })

  it('shows layout status and lane chips instead of native selects', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })

    try {
      const overlay = createGameHudOverlay({ store })
      document.body.appendChild(overlay)

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
      store.destroy()
      document.body.innerHTML = ''
    }
  })
})
