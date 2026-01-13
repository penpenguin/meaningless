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
  colorInput.dataset.testid = 'theme-waterTint'
  const updateAndNotify = (partial: Partial<Theme>): void => {
    store.updateTheme(partial)
    onThemeChange?.(store.getState().theme)
  }
  colorInput.addEventListener('input', () => {
    updateAndNotify({ waterTint: colorInput.value })
  })
  colorWrapper.appendChild(colorLabel)
  colorWrapper.appendChild(colorInput)
  panel.appendChild(colorWrapper)

  const fogControl = createRangeControl(
    'Fog',
    'theme-fogDensity',
    store.getState().theme.fogDensity,
    (value) => updateAndNotify({ fogDensity: value })
  )
  const particleControl = createRangeControl(
    'Particles',
    'theme-particleDensity',
    store.getState().theme.particleDensity,
    (value) => updateAndNotify({ particleDensity: value })
  )
  const waveStrengthControl = createRangeControl(
    'Wave Strength',
    'theme-waveStrength',
    store.getState().theme.waveStrength,
    (value) => updateAndNotify({ waveStrength: value })
  )
  const waveSpeedControl = createRangeControl(
    'Wave Speed',
    'theme-waveSpeed',
    store.getState().theme.waveSpeed,
    (value) => updateAndNotify({ waveSpeed: value })
  )
  const frameStrengthControl = createRangeControl(
    'Frame Strength',
    'theme-glassFrameStrength',
    store.getState().theme.glassFrameStrength,
    (value) => updateAndNotify({ glassFrameStrength: value })
  )

  panel.appendChild(fogControl)
  panel.appendChild(particleControl)
  panel.appendChild(waveStrengthControl)
  panel.appendChild(waveSpeedControl)
  panel.appendChild(frameStrengthControl)

  const fogInput = fogControl.querySelector('input') as HTMLInputElement
  const particleInput = particleControl.querySelector('input') as HTMLInputElement
  const waveStrengthInput = waveStrengthControl.querySelector('input') as HTMLInputElement
  const waveSpeedInput = waveSpeedControl.querySelector('input') as HTMLInputElement
  const frameStrengthInput = frameStrengthControl.querySelector('input') as HTMLInputElement

  const syncControls = (theme: Theme): void => {
    colorInput.value = theme.waterTint
    fogInput.value = String(theme.fogDensity)
    particleInput.value = String(theme.particleDensity)
    waveStrengthInput.value = String(theme.waveStrength)
    waveSpeedInput.value = String(theme.waveSpeed)
    frameStrengthInput.value = String(theme.glassFrameStrength)
  }

  store.subscribe(({ state }) => {
    syncControls(state.theme)
  })

  return panel
}
