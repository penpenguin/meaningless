import type { Theme } from '../types/aquarium'
import type { AquariumStore } from '../utils/aquariumStore'

type ThemeEditorOptions = {
  store: AquariumStore
  onThemeChange?: (theme: Theme) => void
}

const createRangeControl = (
  label: string,
  testId: string,
  value: number,
  onChange: (next: number) => void
): HTMLDivElement => {
  const wrapper = document.createElement('div')
  wrapper.className = 'editor-control'

  const labelEl = document.createElement('label')
  labelEl.textContent = label

  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '1'
  input.step = '0.01'
  input.value = String(value)
  input.dataset.testid = testId
  input.addEventListener('input', () => {
    onChange(Number(input.value))
  })

  wrapper.appendChild(labelEl)
  wrapper.appendChild(input)
  return wrapper
}

export const createThemeEditorPanel = ({ store, onThemeChange }: ThemeEditorOptions): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'editor-panel-section'
  panel.dataset.testid = 'theme-panel'

  const title = document.createElement('h3')
  title.textContent = 'Theme'
  panel.appendChild(title)

  const colorWrapper = document.createElement('div')
  colorWrapper.className = 'editor-control'
  const colorLabel = document.createElement('label')
  colorLabel.textContent = 'Water Tint'
  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.value = store.getState().theme.waterTint
  colorInput.dataset.testid = 'theme-waterTint'
  colorInput.addEventListener('input', () => {
    store.updateTheme({ waterTint: colorInput.value })
    onThemeChange?.(store.getState().theme)
  })
  colorWrapper.appendChild(colorLabel)
  colorWrapper.appendChild(colorInput)
  panel.appendChild(colorWrapper)

  const updateAndNotify = (partial: Partial<Theme>): void => {
    store.updateTheme(partial)
    onThemeChange?.(store.getState().theme)
  }

  panel.appendChild(
    createRangeControl('Fog', 'theme-fogDensity', store.getState().theme.fogDensity, (value) =>
      updateAndNotify({ fogDensity: value })
    )
  )
  panel.appendChild(
    createRangeControl('Particles', 'theme-particleDensity', store.getState().theme.particleDensity, (value) =>
      updateAndNotify({ particleDensity: value })
    )
  )
  panel.appendChild(
    createRangeControl('Wave Strength', 'theme-waveStrength', store.getState().theme.waveStrength, (value) =>
      updateAndNotify({ waveStrength: value })
    )
  )
  panel.appendChild(
    createRangeControl('Wave Speed', 'theme-waveSpeed', store.getState().theme.waveSpeed, (value) =>
      updateAndNotify({ waveSpeed: value })
    )
  )
  panel.appendChild(
    createRangeControl(
      'Frame Strength',
      'theme-glassFrameStrength',
      store.getState().theme.glassFrameStrength,
      (value) => updateAndNotify({ glassFrameStrength: value })
    )
  )

  return panel
}
