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
})
