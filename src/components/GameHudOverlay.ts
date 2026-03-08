import type { GameStore } from '../game/createGameStore'
import { getDecorCatalog, getFishCatalog } from '../game/catalog'
import type { GameAppState, GameUiMode } from '../game/types'

type GameHudOverlayOptions = {
  store: GameStore
}

type GuideContent = {
  title: string
  body: string
  hint: string
}

const createModeButton = (
  label: string,
  mode: GameUiMode,
  store: GameStore
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

const getActiveTank = (state: GameAppState) => {
  return state.game.tanks.find((tank) => tank.id === state.game.activeTankId) ?? state.game.tanks[0]
}

const getMaintenanceCost = (state: GameAppState): number => {
  const tank = getActiveTank(state)
  const totalFish = tank.fishSchools.reduce((total, school) => total + school.count, 0)
  return Math.max(4, Math.ceil(totalFish / 4))
}

const getGuideContent = (state: GameAppState): GuideContent => {
  switch (state.ui.mode) {
    case 'shop':
      return {
        title: 'Spend coins',
        body: 'Unlock fish and decor here, then switch to Layout to place them in the tank.',
        hint: 'New unlocks appear in Layout immediately.'
      }
    case 'layout':
      return {
        title: 'Place and tune',
        body: 'Use + and - to size each school, choose a decor tool, then click a grid cell to place it.',
        hint: 'Select Eraser to clear a grid cell.'
      }
    case 'progress':
      return {
        title: 'Check growth',
        body: 'Track total coins, offline gains, and how much the active tank earns per minute.',
        hint: 'Use this view to see whether layout changes are paying off.'
      }
    case 'settings':
      return {
        title: 'Adjust comfort',
        body: 'Toggle sound and motion here, or lower quality if the scene starts feeling heavy.',
        hint: 'Press Escape anytime to jump back to Tank.'
      }
    case 'tank':
    default:
      return {
        title: 'Start here',
        body: 'Watch water quality, spend coins in Unlock, and use Layout to grow fish schools or place decor.',
        hint: 'Press Escape anytime to jump back to Tank.'
      }
  }
}

const createTankPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'tank'

  const title = document.createElement('h3')
  title.textContent = 'Tank'
  panel.appendChild(title)

  const summary = document.createElement('div')
  summary.className = 'hud-summary'
  panel.appendChild(summary)

  const maintenanceButton = document.createElement('button')
  maintenanceButton.type = 'button'
  maintenanceButton.textContent = 'Perform Maintenance'
  maintenanceButton.addEventListener('click', () => {
    store.dispatch({ type: 'GAME/CLEAN_TANK' })
  })
  panel.appendChild(maintenanceButton)

  const offlineCard = document.createElement('div')
  offlineCard.className = 'hud-offline-card'
  const offlineText = document.createElement('div')
  const dismissButton = document.createElement('button')
  dismissButton.type = 'button'
  dismissButton.textContent = 'Dismiss'
  dismissButton.addEventListener('click', () => {
    store.dispatch({ type: 'GAME/CLEAR_OFFLINE_RESULT' })
  })
  offlineCard.appendChild(offlineText)
  offlineCard.appendChild(dismissButton)
  panel.appendChild(offlineCard)

  const render = (state: GameAppState): void => {
    const tank = getActiveTank(state)
    const maintenanceCost = getMaintenanceCost(state)
    summary.innerHTML = ''
    ;[
      `Tank: ${tank.name}`,
      `Income: ${tank.progression.incomePerMinute}/min`,
      `Comfort: ${tank.progression.comfort}`,
      `Water: ${tank.progression.waterQuality}`,
      `Decor: ${tank.decor.length}`
    ].forEach((entry) => {
      const row = document.createElement('div')
      row.className = 'hud-summary-row'
      row.textContent = entry
      summary.appendChild(row)
    })
    maintenanceButton.textContent = `Restore Water (${maintenanceCost} coins)`
    maintenanceButton.disabled = state.game.profile.currency.coins < maintenanceCost

    if (state.ui.lastOfflineResult) {
      offlineCard.style.display = 'flex'
      offlineText.textContent = `Offline +${state.ui.lastOfflineResult.earnedCoins} in ${Math.floor(state.ui.lastOfflineResult.simulatedSeconds / 60)}m`
    } else {
      offlineCard.style.display = 'none'
    }
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())
  return panel
}

const createShopPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'shop'

  const title = document.createElement('h3')
  title.textContent = 'Unlock'
  panel.appendChild(title)

  const fishList = document.createElement('div')
  fishList.className = 'hud-list'
  panel.appendChild(fishList)

  const decorList = document.createElement('div')
  decorList.className = 'hud-list'
  panel.appendChild(decorList)

  const render = (state: GameAppState): void => {
    fishList.innerHTML = ''
    decorList.innerHTML = ''

    getFishCatalog().forEach((fish) => {
      const row = document.createElement('div')
      row.className = 'hud-list-item'

      const info = document.createElement('div')
      info.innerHTML = `<strong>${fish.displayName}</strong><div class="hud-item-meta">Unlock ${fish.unlockCost} / +${fish.baseIncomePerMinute.toFixed(2)} each</div>`
      row.appendChild(info)

      const action = document.createElement('button')
      const unlocked = state.game.profile.unlockedFishIds.includes(fish.speciesId)
      action.textContent = unlocked ? 'Unlocked' : `Unlock ${fish.unlockCost}`
      action.disabled = unlocked || state.game.profile.currency.coins < fish.unlockCost
      action.addEventListener('click', () => {
        store.dispatch({ type: 'GAME/UNLOCK_FISH', payload: { speciesId: fish.speciesId } })
      })
      row.appendChild(action)
      fishList.appendChild(row)
    })

    getDecorCatalog().forEach((decor) => {
      const row = document.createElement('div')
      row.className = 'hud-list-item'

      const info = document.createElement('div')
      info.innerHTML = `<strong>${decor.displayName}</strong><div class="hud-item-meta">Unlock ${decor.unlockCost} / Comfort +${decor.comfortBonus}</div>`
      row.appendChild(info)

      const action = document.createElement('button')
      const unlocked = state.game.profile.unlockedDecorIds.includes(decor.decorId)
      action.textContent = unlocked ? 'Unlocked' : `Unlock ${decor.unlockCost}`
      action.disabled = unlocked || state.game.profile.currency.coins < decor.unlockCost
      action.addEventListener('click', () => {
        store.dispatch({ type: 'GAME/UNLOCK_DECOR', payload: { decorId: decor.decorId } })
      })
      row.appendChild(action)
      decorList.appendChild(row)
    })
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())
  return panel
}

const createLayoutPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel hud-layout-panel'
  panel.dataset.panel = 'layout'

  const title = document.createElement('h3')
  title.textContent = 'Layout'
  panel.appendChild(title)

  const fishSection = document.createElement('div')
  fishSection.className = 'hud-list'
  panel.appendChild(fishSection)

  const palette = document.createElement('div')
  palette.className = 'hud-decor-palette'
  panel.appendChild(palette)

  const board = document.createElement('div')
  board.className = 'hud-board'
  panel.appendChild(board)

  const render = (state: GameAppState): void => {
    const tank = getActiveTank(state)
    fishSection.innerHTML = ''
    palette.innerHTML = ''
    board.innerHTML = ''

    getFishCatalog()
      .filter((fish) => state.game.profile.unlockedFishIds.includes(fish.speciesId))
      .forEach((fish) => {
        const school = tank.fishSchools.find((entry) => entry.speciesId === fish.speciesId)
        const row = document.createElement('div')
        row.className = 'hud-list-item'

        const label = document.createElement('div')
        label.innerHTML = `<strong>${fish.displayName}</strong><div class="hud-item-meta">${school?.lane ?? fish.preferredLane} lane</div>`
        row.appendChild(label)

        const controls = document.createElement('div')
        controls.className = 'hud-inline-controls'

        const minusButton = document.createElement('button')
        minusButton.type = 'button'
        minusButton.textContent = '-'
        minusButton.addEventListener('click', () => {
          store.dispatch({
            type: 'GAME/SET_FISH_COUNT',
            payload: {
              speciesId: fish.speciesId,
              count: Math.max(0, (school?.count ?? 0) - 1)
            }
          })
        })
        controls.appendChild(minusButton)

        const count = document.createElement('span')
        count.textContent = String(school?.count ?? 0)
        controls.appendChild(count)

        const plusButton = document.createElement('button')
        plusButton.type = 'button'
        plusButton.textContent = '+'
        plusButton.addEventListener('click', () => {
          store.dispatch({
            type: 'GAME/SET_FISH_COUNT',
            payload: {
              speciesId: fish.speciesId,
              count: (school?.count ?? 0) + 1
            }
          })
        })
        controls.appendChild(plusButton)

        const laneSelect = document.createElement('select')
        ;['top', 'middle', 'bottom'].forEach((lane) => {
          const option = document.createElement('option')
          option.value = lane
          option.textContent = lane
          option.selected = (school?.lane ?? fish.preferredLane) === lane
          laneSelect.appendChild(option)
        })
        laneSelect.addEventListener('change', () => {
          store.dispatch({
            type: 'GAME/SET_FISH_LANE',
            payload: {
              speciesId: fish.speciesId,
              lane: laneSelect.value as 'top' | 'middle' | 'bottom'
            }
          })
        })
        controls.appendChild(laneSelect)

        row.appendChild(controls)
        fishSection.appendChild(row)
      })

    const eraser = document.createElement('button')
    eraser.type = 'button'
    eraser.textContent = 'Eraser'
    eraser.className = state.ui.selectedDecorId === null ? 'is-active' : ''
    eraser.addEventListener('click', () => {
      store.dispatch({ type: 'UI/SELECT_DECOR', payload: { decorId: null } })
    })
    palette.appendChild(eraser)

    getDecorCatalog()
      .filter((decor) => state.game.profile.unlockedDecorIds.includes(decor.decorId))
      .forEach((decor) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = decor.displayName
        button.className = state.ui.selectedDecorId === decor.decorId ? 'is-active' : ''
        button.addEventListener('click', () => {
          store.dispatch({ type: 'UI/SELECT_DECOR', payload: { decorId: decor.decorId } })
        })
        palette.appendChild(button)
      })

    Array.from({ length: tank.layout.rows }).forEach((_, y) => {
      Array.from({ length: tank.layout.columns }).forEach((__, x) => {
        const cell = document.createElement('button')
        cell.type = 'button'
        cell.className = 'hud-grid-cell'
        const decor = tank.decor.find((item) => item.x === x && item.y === y)
        cell.textContent = decor ? decor.decorId.slice(0, 2).toUpperCase() : '·'
        cell.addEventListener('click', () => {
          if (state.ui.selectedDecorId) {
            store.dispatch({
              type: 'GAME/PLACE_DECOR',
              payload: {
                decorId: state.ui.selectedDecorId,
                x,
                y
              }
            })
            return
          }
          store.dispatch({ type: 'GAME/REMOVE_DECOR', payload: { x, y } })
        })
        board.appendChild(cell)
      })
    })
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())
  return panel
}

const createProgressPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel'
  panel.dataset.panel = 'progress'

  const title = document.createElement('h3')
  title.textContent = 'Progress'
  panel.appendChild(title)

  const summary = document.createElement('div')
  summary.className = 'hud-summary'
  panel.appendChild(summary)

  const render = (state: GameAppState): void => {
    const tank = getActiveTank(state)
    summary.innerHTML = ''
    ;[
      `Total coins earned: ${state.game.profile.stats.totalEarnedCoins}`,
      `Offline simulated: ${state.game.profile.stats.totalOfflineSeconds}s`,
      `Maintenance actions: ${state.game.profile.stats.totalMaintenanceActions}`,
      `Unlocked fish: ${state.game.profile.unlockedFishIds.length}`,
      `Unlocked decor: ${state.game.profile.unlockedDecorIds.length}`,
      `Active tank income: ${tank.progression.incomePerMinute}/min`
    ].forEach((entry) => {
      const row = document.createElement('div')
      row.className = 'hud-summary-row'
      row.textContent = entry
      summary.appendChild(row)
    })
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())
  return panel
}

const createSettingsPanel = (store: GameStore): HTMLDivElement => {
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
    store.dispatch({ type: 'SETTINGS/SET_SOUND', payload: { enabled: soundInput.checked } })
  })
  soundRow.appendChild(soundInput)
  soundRow.appendChild(document.createTextNode(' Sound'))
  panel.appendChild(soundRow)

  const motionRow = document.createElement('label')
  motionRow.className = 'hud-toggle'
  const motionInput = document.createElement('input')
  motionInput.type = 'checkbox'
  motionInput.addEventListener('change', () => {
    store.dispatch({ type: 'SETTINGS/SET_MOTION', payload: { enabled: motionInput.checked } })
  })
  motionRow.appendChild(motionInput)
  motionRow.appendChild(document.createTextNode(' Motion'))
  panel.appendChild(motionRow)

  const qualitySelect = document.createElement('select')
  ;['low', 'medium', 'high'].forEach((quality) => {
    const option = document.createElement('option')
    option.value = quality
    option.textContent = quality
    qualitySelect.appendChild(option)
  })
  qualitySelect.addEventListener('change', () => {
    store.dispatch({
      type: 'SETTINGS/SET_QUALITY',
      payload: { quality: qualitySelect.value as 'low' | 'medium' | 'high' }
    })
  })
  panel.appendChild(qualitySelect)

  store.subscribe(({ state }) => {
    soundInput.checked = state.game.profile.preferences.soundEnabled
    motionInput.checked = state.game.profile.preferences.motionEnabled
    qualitySelect.value = state.game.profile.preferences.quality
  })

  return panel
}

export const createGameHudOverlay = ({ store }: GameHudOverlayOptions): HTMLDivElement => {
  const root = document.createElement('div')
  root.className = 'hud-overlay'

  const topBar = document.createElement('div')
  topBar.className = 'hud-topbar'

  const currency = document.createElement('div')
  currency.className = 'hud-pearls hud-currency'
  topBar.appendChild(currency)

  const secondary = document.createElement('div')
  secondary.className = 'hud-secondary-stats'
  topBar.appendChild(secondary)

  const buttons = document.createElement('div')
  buttons.className = 'hud-buttons'
  const modeButtons = [
    createModeButton('Tank', 'tank', store),
    createModeButton('Unlock', 'shop', store),
    createModeButton('Layout', 'layout', store),
    createModeButton('Progress', 'progress', store),
    createModeButton('Settings', 'settings', store)
  ]
  modeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', 'false')
    buttons.appendChild(button)
  })
  topBar.appendChild(buttons)

  const panelContainer = document.createElement('div')
  panelContainer.className = 'hud-panel-container'
  const guide = document.createElement('div')
  guide.className = 'hud-guide'
  const guideTitle = document.createElement('div')
  guideTitle.className = 'hud-guide-title'
  const guideBody = document.createElement('div')
  guideBody.className = 'hud-guide-body'
  const guideHint = document.createElement('div')
  guideHint.className = 'hud-guide-hint'
  guide.appendChild(guideTitle)
  guide.appendChild(guideBody)
  guide.appendChild(guideHint)
  const tankPanel = createTankPanel(store)
  const shopPanel = createShopPanel(store)
  const layoutPanel = createLayoutPanel(store)
  const progressPanel = createProgressPanel(store)
  const settingsPanel = createSettingsPanel(store)
  panelContainer.appendChild(guide)
  panelContainer.appendChild(tankPanel)
  panelContainer.appendChild(shopPanel)
  panelContainer.appendChild(layoutPanel)
  panelContainer.appendChild(progressPanel)
  panelContainer.appendChild(settingsPanel)

  root.appendChild(topBar)
  root.appendChild(panelContainer)

  const applyMode = (mode: GameUiMode): void => {
    tankPanel.style.display = mode === 'tank' ? 'flex' : 'none'
    shopPanel.style.display = mode === 'shop' ? 'flex' : 'none'
    layoutPanel.style.display = mode === 'layout' ? 'flex' : 'none'
    progressPanel.style.display = mode === 'progress' ? 'flex' : 'none'
    settingsPanel.style.display = mode === 'settings' ? 'flex' : 'none'
    modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  store.subscribe(({ state }) => {
    const tank = getActiveTank(state)
    const guideContent = getGuideContent(state)
    currency.textContent = `Coins: ${state.game.profile.currency.coins}`
    secondary.textContent = `Income ${tank.progression.incomePerMinute}/min • Comfort ${tank.progression.comfort} • Water ${tank.progression.waterQuality}`
    guideTitle.textContent = guideContent.title
    guideBody.textContent = guideContent.body
    guideHint.textContent = guideContent.hint
    applyMode(state.ui.mode)
  })

  const initial = store.getState()
  const initialTank = getActiveTank(initial)
  const initialGuide = getGuideContent(initial)
  currency.textContent = `Coins: ${initial.game.profile.currency.coins}`
  secondary.textContent = `Income ${initialTank.progression.incomePerMinute}/min • Comfort ${initialTank.progression.comfort} • Water ${initialTank.progression.waterQuality}`
  guideTitle.textContent = initialGuide.title
  guideBody.textContent = initialGuide.body
  guideHint.textContent = initialGuide.hint
  applyMode(initial.ui.mode)

  return root
}
