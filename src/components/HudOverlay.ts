import type { AppState, UiMode } from '../types/app'
import type { AppStore } from '../app/store/createAppStore'
import { getSpeciesList } from '../utils/speciesCatalog'
import { canUnlockSpecies, isUnlockedSpecies } from '../app/store/selectors/unlockRules'
import { showToast } from './Toast'

type HudOverlayOptions = {
  store: AppStore
}

const createModeButton = (
  label: string,
  mode: UiMode,
  store: AppStore
): HTMLButtonElement => {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.dataset.mode = mode
  button.addEventListener('click', () => {
    store.dispatch({ type: 'UI/SET_MODE', payload: { mode } })
  })
  return button
}

const formatUnlockCondition = (state: AppState, speciesId: string): string => {
  const species = getSpeciesList().find((entry) => entry.speciesId === speciesId)
  if (!species) return 'Unknown'
  const unlock = species.unlock
  if (unlock.type === 'starter') return 'Starter'
  if (unlock.type === 'cost') return `${unlock.costPearls ?? 0} pearls`
  if (unlock.type === 'watchTime') return `${Math.ceil((unlock.requiredViewSeconds ?? 0) / 60)} min watch`
  const cost = `${unlock.costPearls ?? 0} pearls`
  const watch = `${Math.ceil((unlock.requiredViewSeconds ?? 0) / 60)} min watch`
  if (canUnlockSpecies(state, species)) {
    return `${cost} + ${watch}`
  }
  return `${cost} + ${watch}`
}

const getGroupCount = (state: AppState, speciesId: string): number => {
  return state.tank.fishGroups.find((group) => group.speciesId === speciesId)?.count ?? 0
}

const createCollectionPanel = (store: AppStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'collection'

  const title = document.createElement('h3')
  title.textContent = 'Collection'
  panel.appendChild(title)

  const list = document.createElement('div')
  list.className = 'hud-list'
  panel.appendChild(list)

  const render = (state: AppState): void => {
    list.innerHTML = ''
    getSpeciesList().forEach((species) => {
      const row = document.createElement('div')
      row.className = 'hud-list-item'

      const label = document.createElement('div')
      label.className = 'hud-item-label'
      label.textContent = species.displayName
      row.appendChild(label)

      const meta = document.createElement('div')
      meta.className = 'hud-item-meta'
      const unlocked = isUnlockedSpecies(state, species.speciesId)
      meta.textContent = unlocked
        ? 'Unlocked'
        : formatUnlockCondition(state, species.speciesId)
      row.appendChild(meta)

      const action = document.createElement('button')
      action.type = 'button'
      action.textContent = unlocked ? 'Unlocked' : 'Unlock'
      action.disabled = unlocked
      action.addEventListener('click', () => {
        if (!canUnlockSpecies(store.getState(), species)) {
          showToast('Unlock conditions are not met yet', 'error')
          return
        }
        store.dispatch({
          type: 'PROFILE/UNLOCK_SPECIES',
          payload: {
            speciesId: species.speciesId,
            costPearls: species.unlock.costPearls ?? 0
          }
        })
      })
      row.appendChild(action)

      list.appendChild(row)
    })
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())

  return panel
}

const createDecoratePanel = (store: AppStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'decorate'

  const title = document.createElement('h3')
  title.textContent = 'Decorate'
  panel.appendChild(title)

  const list = document.createElement('div')
  list.className = 'hud-list'
  panel.appendChild(list)

  const render = (state: AppState): void => {
    list.innerHTML = ''
    getSpeciesList()
      .filter((species) => isUnlockedSpecies(state, species.speciesId))
      .forEach((species) => {
        const row = document.createElement('div')
        row.className = 'hud-list-item'

        const label = document.createElement('span')
        label.textContent = species.displayName
        row.appendChild(label)

        const controls = document.createElement('div')
        controls.className = 'hud-inline-controls'

        const minusButton = document.createElement('button')
        minusButton.type = 'button'
        minusButton.textContent = '-'
        minusButton.addEventListener('click', () => {
          const current = getGroupCount(store.getState(), species.speciesId)
          store.dispatch({
            type: 'TANK/SET_FISH_COUNT',
            payload: {
              speciesId: species.speciesId,
              count: Math.max(0, current - 1)
            }
          })
        })
        controls.appendChild(minusButton)

        const count = document.createElement('span')
        count.textContent = String(getGroupCount(state, species.speciesId))
        controls.appendChild(count)

        const plusButton = document.createElement('button')
        plusButton.type = 'button'
        plusButton.textContent = '+'
        plusButton.addEventListener('click', () => {
          const current = getGroupCount(store.getState(), species.speciesId)
          store.dispatch({
            type: 'TANK/SET_FISH_COUNT',
            payload: {
              speciesId: species.speciesId,
              count: current + 1
            }
          })
        })
        controls.appendChild(plusButton)

        row.appendChild(controls)
        list.appendChild(row)
      })
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())

  return panel
}

const createSettingsPanel = (store: AppStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'settings'

  const title = document.createElement('h3')
  title.textContent = 'Settings'
  panel.appendChild(title)

  const soundRow = document.createElement('label')
  soundRow.className = 'hud-toggle'
  const soundInput = document.createElement('input')
  soundInput.type = 'checkbox'
  soundInput.addEventListener('change', () => {
    store.dispatch({
      type: 'SETTINGS/SET_SOUND',
      payload: { enabled: soundInput.checked }
    })
  })
  soundRow.appendChild(soundInput)
  soundRow.appendChild(document.createTextNode(' Sound'))
  panel.appendChild(soundRow)

  const motionRow = document.createElement('label')
  motionRow.className = 'hud-toggle'
  const motionInput = document.createElement('input')
  motionInput.type = 'checkbox'
  motionInput.addEventListener('change', () => {
    store.dispatch({
      type: 'SETTINGS/SET_MOTION',
      payload: { enabled: motionInput.checked }
    })
  })
  motionRow.appendChild(motionInput)
  motionRow.appendChild(document.createTextNode(' Motion'))
  panel.appendChild(motionRow)

  store.subscribe(({ state }) => {
    soundInput.checked = state.settings.soundEnabled
    motionInput.checked = state.settings.motionEnabled
  })

  const initial = store.getState()
  soundInput.checked = initial.settings.soundEnabled
  motionInput.checked = initial.settings.motionEnabled

  return panel
}

export const createHudOverlay = ({ store }: HudOverlayOptions): HTMLDivElement => {
  const root = document.createElement('div')
  root.className = 'hud-overlay'

  const topBar = document.createElement('div')
  topBar.className = 'hud-topbar'

  const pearls = document.createElement('div')
  pearls.className = 'hud-pearls'
  topBar.appendChild(pearls)

  const buttons = document.createElement('div')
  buttons.className = 'hud-buttons'
  buttons.appendChild(createModeButton('View', 'view', store))
  buttons.appendChild(createModeButton('Collection', 'collection', store))
  buttons.appendChild(createModeButton('Decorate', 'decorate', store))
  buttons.appendChild(createModeButton('Settings', 'settings', store))
  topBar.appendChild(buttons)

  const panelContainer = document.createElement('div')
  panelContainer.className = 'hud-panel-container'
  const collectionPanel = createCollectionPanel(store)
  const decoratePanel = createDecoratePanel(store)
  const settingsPanel = createSettingsPanel(store)
  panelContainer.appendChild(collectionPanel)
  panelContainer.appendChild(decoratePanel)
  panelContainer.appendChild(settingsPanel)

  root.appendChild(topBar)
  root.appendChild(panelContainer)

  const applyMode = (mode: UiMode): void => {
    collectionPanel.style.display = mode === 'collection' ? 'flex' : 'none'
    decoratePanel.style.display = mode === 'decorate' ? 'flex' : 'none'
    settingsPanel.style.display = mode === 'settings' ? 'flex' : 'none'
  }

  store.subscribe(({ state }) => {
    pearls.textContent = `Pearls: ${state.profile.currency.pearls}`
    applyMode(state.ui.mode)
  })
  const initial = store.getState()
  pearls.textContent = `Pearls: ${initial.profile.currency.pearls}`
  applyMode(initial.ui.mode)

  return root
}
