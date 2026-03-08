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
})
