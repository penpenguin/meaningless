import { describe, expect, it, vi } from 'vitest'
import { createAquariumStore } from '../utils/aquariumStore'
import { createThemeEditorPanel } from '../components/ThemeEditorPanel'

const setup = () => {
  const store = createAquariumStore()
  const onThemeChange = vi.fn()
  const panel = createThemeEditorPanel({ store, onThemeChange })
  document.body.innerHTML = ''
  document.body.appendChild(panel)
  return { store, panel, onThemeChange }
}

describe('theme editing', () => {
  it('updates state and notifies theme bridge', () => {
    const { store, panel, onThemeChange } = setup()
    const input = panel.querySelector('[data-testid="theme-fogDensity"]') as HTMLInputElement

    input.value = '0.9'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(store.getState().theme.fogDensity).toBeCloseTo(0.9)
    expect(onThemeChange).toHaveBeenCalled()
  })

  it('reflects theme changes from the store', () => {
    const { store, panel } = setup()
    const nextTheme = {
      ...store.getState().theme,
      waterTint: '#ffffff',
      fogDensity: 0.1,
      particleDensity: 0.2,
      waveStrength: 0.3,
      waveSpeed: 0.4,
      glassFrameStrength: 0.5
    }

    store.setState({
      ...store.getState(),
      theme: nextTheme
    })

    expect((panel.querySelector('[data-testid="theme-waterTint"]') as HTMLInputElement).value).toBe('#ffffff')
    expect((panel.querySelector('[data-testid="theme-fogDensity"]') as HTMLInputElement).value).toBe('0.1')
    expect((panel.querySelector('[data-testid="theme-particleDensity"]') as HTMLInputElement).value).toBe('0.2')
    expect((panel.querySelector('[data-testid="theme-waveStrength"]') as HTMLInputElement).value).toBe('0.3')
    expect((panel.querySelector('[data-testid="theme-waveSpeed"]') as HTMLInputElement).value).toBe('0.4')
    expect((panel.querySelector('[data-testid="theme-glassFrameStrength"]') as HTMLInputElement).value).toBe('0.5')
  })

  it('updates theme without onThemeChange callback', () => {
    const store = createAquariumStore()
    const panel = createThemeEditorPanel({ store })
    document.body.innerHTML = ''
    document.body.appendChild(panel)

    const input = panel.querySelector('[data-testid="theme-waveSpeed"]') as HTMLInputElement
    input.value = '0.25'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(store.getState().theme.waveSpeed).toBeCloseTo(0.25)
  })
})
