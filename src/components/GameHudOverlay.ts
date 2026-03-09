import type { GameStore } from '../game/createGameStore'
import { getDecorContent, getDecorContentList, getFishContentList } from '../content/registry'
import type { GameAppState, GameUiMode } from '../game/types'

type GameHudOverlayOptions = {
  store: GameStore
}

type GuideContent = {
  title: string
  body: string
  hint: string
}

type StatCardOptions = {
  label: string
  value: string
  meta?: string
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
        body: 'Grow schools, pick a decor tool, and click a blueprint grid cell to position the tank.',
        hint: 'Lane chips change fish depth without leaving the panel, and Eraser clears the selected cell.'
      }
    case 'progress':
      return {
        title: 'Check growth',
        body: 'Track current income, total earnings, and how close you are to the next unlock.',
        hint: 'Use this view to see whether layout changes are paying off.'
      }
    case 'settings':
      return {
        title: 'Adjust comfort',
        body: 'Use tactile toggles for sound and motion, then balance fidelity with the quality chips.',
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

const createStatCard = ({ label, value, meta }: StatCardOptions): HTMLDivElement => {
  const card = document.createElement('div')
  card.className = 'hud-stat-card'

  const cardLabel = document.createElement('div')
  cardLabel.className = 'hud-stat-label'
  cardLabel.textContent = label
  card.appendChild(cardLabel)

  const cardValue = document.createElement('div')
  cardValue.className = 'hud-stat-value'
  cardValue.textContent = value
  card.appendChild(cardValue)

  if (meta) {
    const cardMeta = document.createElement('div')
    cardMeta.className = 'hud-stat-meta'
    cardMeta.textContent = meta
    card.appendChild(cardMeta)
  }

  return card
}

const createPanelHeader = (titleText: string, kickerText: string): HTMLDivElement => {
  const header = document.createElement('div')
  header.className = 'hud-panel-header'

  const kicker = document.createElement('div')
  kicker.className = 'hud-panel-kicker'
  kicker.textContent = kickerText
  header.appendChild(kicker)

  const title = document.createElement('h3')
  title.textContent = titleText
  header.appendChild(title)

  return header
}

const createSectionLabel = (text: string): HTMLDivElement => {
  const label = document.createElement('div')
  label.className = 'hud-section-label'
  label.textContent = text
  return label
}

const getNextUnlockCopy = (state: GameAppState): string => {
  const coins = state.game.profile.currency.coins
  const lockedFish = getFishContentList()
    .filter((fish) => !state.game.profile.unlockedFishIds.includes(fish.speciesId))
    .map((fish) => ({ label: fish.displayName, cost: fish.gameplay.unlockCost }))
  const lockedDecor = getDecorContentList()
    .filter((decor) => !state.game.profile.unlockedDecorIds.includes(decor.decorId))
    .map((decor) => ({ label: decor.displayName, cost: decor.gameplay.unlockCost }))

  const nextUnlock = [...lockedFish, ...lockedDecor]
    .sort((left, right) => left.cost - right.cost)[0]

  if (!nextUnlock) {
    return 'Next unlock: everything is already in the tank kit.'
  }

  const coinsNeeded = Math.max(0, nextUnlock.cost - coins)
  return coinsNeeded === 0
    ? `Next unlock: ${nextUnlock.label} is ready now.`
    : `Next unlock: ${nextUnlock.label} in ${coinsNeeded} coins.`
}

const createTankPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel hud-panel--tank'
  panel.dataset.panel = 'tank'

  panel.appendChild(createPanelHeader('Tank', 'Now Playing'))

  const lead = document.createElement('div')
  lead.className = 'hud-panel-lead'
  panel.appendChild(lead)

  const summary = document.createElement('div')
  summary.className = 'hud-summary hud-summary-grid'
  panel.appendChild(summary)

  const maintenanceButton = document.createElement('button')
  maintenanceButton.type = 'button'
  maintenanceButton.className = 'hud-action-button'
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

    lead.textContent = `${tank.name} · ${tank.decor.length} decor placed`
    summary.innerHTML = ''
    ;[
      { label: 'Income', value: `${tank.progression.incomePerMinute}/min`, meta: 'Active tank' },
      { label: 'Comfort', value: String(tank.progression.comfort), meta: 'Drives unlocks' },
      { label: 'Water', value: String(tank.progression.waterQuality), meta: 'Keep it clear' },
      { label: 'Schools', value: String(tank.fishSchools.reduce((total, school) => total + school.count, 0)), meta: 'Visible fish' }
    ].forEach((card) => {
      summary.appendChild(createStatCard(card))
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
  panel.className = 'hud-panel hud-panel--shop'
  panel.dataset.panel = 'shop'

  panel.appendChild(createPanelHeader('Unlock', 'Expand The Kit'))

  const fishLabel = createSectionLabel('Fish')
  panel.appendChild(fishLabel)

  const fishList = document.createElement('div')
  fishList.className = 'hud-list'
  panel.appendChild(fishList)

  const decorLabel = createSectionLabel('Decor')
  panel.appendChild(decorLabel)

  const decorList = document.createElement('div')
  decorList.className = 'hud-list'
  panel.appendChild(decorList)

  const render = (state: GameAppState): void => {
    fishList.innerHTML = ''
    decorList.innerHTML = ''

    getFishContentList().forEach((fish) => {
      const row = document.createElement('div')
      row.className = 'hud-list-item'

      const info = document.createElement('div')
      info.innerHTML = `<strong>${fish.displayName}</strong><div class="hud-item-meta">Unlock ${fish.gameplay.unlockCost} / +${fish.gameplay.baseIncomePerMinute.toFixed(2)} each</div>`
      row.appendChild(info)

      const action = document.createElement('button')
      action.type = 'button'
      action.className = 'hud-action-button'
      const unlocked = state.game.profile.unlockedFishIds.includes(fish.speciesId)
      action.textContent = unlocked ? 'Unlocked' : `Unlock ${fish.gameplay.unlockCost}`
      action.disabled = unlocked || state.game.profile.currency.coins < fish.gameplay.unlockCost
      action.addEventListener('click', () => {
        store.dispatch({ type: 'GAME/UNLOCK_FISH', payload: { speciesId: fish.speciesId } })
      })
      row.appendChild(action)
      fishList.appendChild(row)
    })

    getDecorContentList().forEach((decor) => {
      const row = document.createElement('div')
      row.className = 'hud-list-item'

      const info = document.createElement('div')
      info.innerHTML = `<strong>${decor.displayName}</strong><div class="hud-item-meta">Unlock ${decor.gameplay.unlockCost} / Comfort +${decor.gameplay.comfortBonus}</div>`
      row.appendChild(info)

      const action = document.createElement('button')
      action.type = 'button'
      action.className = 'hud-action-button'
      const unlocked = state.game.profile.unlockedDecorIds.includes(decor.decorId)
      action.textContent = unlocked ? 'Unlocked' : `Unlock ${decor.gameplay.unlockCost}`
      action.disabled = unlocked || state.game.profile.currency.coins < decor.gameplay.unlockCost
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
  panel.className = 'hud-panel hud-panel--layout hud-layout-panel'
  panel.dataset.panel = 'layout'

  panel.appendChild(createPanelHeader('Layout', 'Blueprint'))

  const status = document.createElement('div')
  status.className = 'hud-layout-status'
  panel.appendChild(status)

  panel.appendChild(createSectionLabel('Fish schools'))

  const fishSection = document.createElement('div')
  fishSection.className = 'hud-list'
  panel.appendChild(fishSection)

  panel.appendChild(createSectionLabel('Decor tools'))

  const palette = document.createElement('div')
  palette.className = 'hud-decor-palette'
  panel.appendChild(palette)

  const boardShell = document.createElement('div')
  boardShell.className = 'hud-board-shell'
  const boardCaption = document.createElement('div')
  boardCaption.className = 'hud-board-caption'
  boardShell.appendChild(boardCaption)

  const board = document.createElement('div')
  board.className = 'hud-board'
  boardShell.appendChild(board)
  panel.appendChild(boardShell)

  const render = (state: GameAppState): void => {
    const tank = getActiveTank(state)
    const selectedDecor = state.ui.selectedDecorId
      ? getDecorContent(state.ui.selectedDecorId)
      : null

    status.textContent = selectedDecor
      ? `Tool: ${selectedDecor.displayName} · click blueprint cells to place it`
      : 'Tool: Eraser · click blueprint cells to clear the tank'

    boardCaption.textContent = `${tank.layout.columns} × ${tank.layout.rows} blueprint · front-left to back-right`
    fishSection.innerHTML = ''
    palette.innerHTML = ''
    board.innerHTML = ''

    getFishContentList()
      .filter((fish) => state.game.profile.unlockedFishIds.includes(fish.speciesId))
      .forEach((fish) => {
        const school = tank.fishSchools.find((entry) => entry.speciesId === fish.speciesId)
        const row = document.createElement('div')
        row.className = 'hud-list-item'

        const label = document.createElement('div')
        label.innerHTML = `<strong>${fish.displayName}</strong><div class="hud-item-meta">${school?.count ?? 0} fish · ${(school?.lane ?? fish.gameplay.preferredLane)} lane</div>`
        row.appendChild(label)

        const controls = document.createElement('div')
        controls.className = 'hud-inline-controls'

        const minusButton = document.createElement('button')
        minusButton.type = 'button'
        minusButton.className = 'hud-inline-button'
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
        count.className = 'hud-counter'
        count.textContent = String(school?.count ?? 0)
        controls.appendChild(count)

        const plusButton = document.createElement('button')
        plusButton.type = 'button'
        plusButton.className = 'hud-inline-button'
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

        const laneSelector = document.createElement('div')
        laneSelector.className = 'hud-lane-selector'
        ;[
          { label: 'Top', value: 'top' },
          { label: 'Mid', value: 'middle' },
          { label: 'Low', value: 'bottom' }
        ].forEach((lane) => {
          const laneButton = document.createElement('button')
          laneButton.type = 'button'
          laneButton.className = 'hud-lane-chip'
          laneButton.textContent = lane.label
          const activeLane = school?.lane ?? fish.gameplay.preferredLane
          laneButton.classList.toggle('is-active', activeLane === lane.value)
          laneButton.addEventListener('click', () => {
            store.dispatch({
              type: 'GAME/SET_FISH_LANE',
              payload: {
                speciesId: fish.speciesId,
                lane: lane.value as 'top' | 'middle' | 'bottom'
              }
            })
          })
          laneSelector.appendChild(laneButton)
        })
        controls.appendChild(laneSelector)

        row.appendChild(controls)
        fishSection.appendChild(row)
      })

    const eraser = document.createElement('button')
    eraser.type = 'button'
    eraser.textContent = 'Eraser'
    eraser.className = `hud-action-button ${state.ui.selectedDecorId === null ? 'is-active' : ''}`.trim()
    eraser.addEventListener('click', () => {
      store.dispatch({ type: 'UI/SELECT_DECOR', payload: { decorId: null } })
    })
    palette.appendChild(eraser)

    getDecorContentList()
      .filter((decor) => state.game.profile.unlockedDecorIds.includes(decor.decorId))
      .forEach((decor) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = decor.displayName
        button.className = `hud-action-button ${state.ui.selectedDecorId === decor.decorId ? 'is-active' : ''}`.trim()
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
        cell.setAttribute('aria-label', `Blueprint ${x + 1},${y + 1}`)

        const decor = tank.decor.find((item) => item.x === x && item.y === y)
        if (decor) {
          cell.classList.add('is-occupied')
        }
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
  panel.className = 'hud-panel hud-panel--progress'
  panel.dataset.panel = 'progress'

  panel.appendChild(createPanelHeader('Progress', 'Pacing'))

  const statGrid = document.createElement('div')
  statGrid.className = 'hud-summary hud-stat-grid'
  panel.appendChild(statGrid)

  const callout = document.createElement('div')
  callout.className = 'hud-progress-callout'
  panel.appendChild(callout)

  const render = (state: GameAppState): void => {
    const tank = getActiveTank(state)

    statGrid.innerHTML = ''
    ;[
      {
        label: 'Current income',
        value: `${tank.progression.incomePerMinute}/min`,
        meta: `${tank.name}`
      },
      {
        label: 'Total coins',
        value: String(state.game.profile.stats.totalEarnedCoins),
        meta: `${state.game.profile.currency.coins} on hand`
      },
      {
        label: 'Unlocked',
        value: `${state.game.profile.unlockedFishIds.length + state.game.profile.unlockedDecorIds.length}`,
        meta: `${state.game.profile.unlockedFishIds.length} fish · ${state.game.profile.unlockedDecorIds.length} decor`
      },
      {
        label: 'Offline gain',
        value: `${Math.floor(state.game.profile.stats.totalOfflineSeconds / 60)}m`,
        meta: `${state.game.profile.stats.totalMaintenanceActions} maintenance actions`
      }
    ].forEach((card) => {
      statGrid.appendChild(createStatCard(card))
    })

    callout.textContent = getNextUnlockCopy(state)
  }

  store.subscribe(({ state }) => render(state))
  render(store.getState())
  return panel
}

const createSettingsPanel = (store: GameStore): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel hud-panel--settings'
  panel.dataset.panel = 'settings'

  panel.appendChild(createPanelHeader('Settings', 'Tuning'))

  const soundRow = document.createElement('div')
  soundRow.className = 'hud-setting-row'
  const soundCopy = document.createElement('div')
  soundCopy.className = 'hud-setting-copy'
  soundCopy.innerHTML = '<strong class="hud-setting-label">Sound</strong><div class="hud-setting-meta">Ambient loops and interaction cues</div>'
  const soundButton = document.createElement('button')
  soundButton.type = 'button'
  soundButton.className = 'hud-toggle-button'
  soundButton.addEventListener('click', () => {
    const enabled = !store.getState().game.profile.preferences.soundEnabled
    store.dispatch({ type: 'SETTINGS/SET_SOUND', payload: { enabled } })
  })
  soundRow.appendChild(soundCopy)
  soundRow.appendChild(soundButton)
  panel.appendChild(soundRow)

  const motionRow = document.createElement('div')
  motionRow.className = 'hud-setting-row'
  const motionCopy = document.createElement('div')
  motionCopy.className = 'hud-setting-copy'
  motionCopy.innerHTML = '<strong class="hud-setting-label">Motion</strong><div class="hud-setting-meta">Fish sway, particles, and water pulse</div>'
  const motionButton = document.createElement('button')
  motionButton.type = 'button'
  motionButton.className = 'hud-toggle-button'
  motionButton.addEventListener('click', () => {
    const enabled = !store.getState().game.profile.preferences.motionEnabled
    store.dispatch({ type: 'SETTINGS/SET_MOTION', payload: { enabled } })
  })
  motionRow.appendChild(motionCopy)
  motionRow.appendChild(motionButton)
  panel.appendChild(motionRow)

  const qualityLabel = createSectionLabel('Visual quality')
  panel.appendChild(qualityLabel)

  const qualitySegmented = document.createElement('div')
  qualitySegmented.className = 'hud-segmented'
  const qualityButtons: HTMLButtonElement[] = []
  ;[
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ].forEach((quality) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = quality.label
    button.addEventListener('click', () => {
      store.dispatch({
        type: 'SETTINGS/SET_QUALITY',
        payload: { quality: quality.value as 'low' | 'medium' | 'high' }
      })
    })
    qualityButtons.push(button)
    qualitySegmented.appendChild(button)
  })
  panel.appendChild(qualitySegmented)

  const settingsHint = document.createElement('div')
  settingsHint.className = 'hud-progress-callout'
  settingsHint.textContent = 'Switch to Low if you want a cleaner HUD over heavier post-processing.'
  panel.appendChild(settingsHint)

  store.subscribe(({ state }) => {
    const soundEnabled = state.game.profile.preferences.soundEnabled
    const motionEnabled = state.game.profile.preferences.motionEnabled
    const quality = state.game.profile.preferences.quality

    soundButton.textContent = soundEnabled ? 'On' : 'Off'
    soundButton.classList.toggle('is-on', soundEnabled)
    soundButton.setAttribute('aria-pressed', String(soundEnabled))

    motionButton.textContent = motionEnabled ? 'On' : 'Off'
    motionButton.classList.toggle('is-on', motionEnabled)
    motionButton.setAttribute('aria-pressed', String(motionEnabled))

    qualityButtons.forEach((button, index) => {
      const value = ['low', 'medium', 'high'][index]
      const isActive = value === quality
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  })

  const initial = store.getState()
  const initialSound = initial.game.profile.preferences.soundEnabled
  const initialMotion = initial.game.profile.preferences.motionEnabled
  soundButton.textContent = initialSound ? 'On' : 'Off'
  soundButton.classList.toggle('is-on', initialSound)
  soundButton.setAttribute('aria-pressed', String(initialSound))
  motionButton.textContent = initialMotion ? 'On' : 'Off'
  motionButton.classList.toggle('is-on', initialMotion)
  motionButton.setAttribute('aria-pressed', String(initialMotion))
  qualityButtons.forEach((button, index) => {
    const isActive = ['low', 'medium', 'high'][index] === initial.game.profile.preferences.quality
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  })
  return panel
}

export const createGameHudOverlay = ({ store }: GameHudOverlayOptions): HTMLDivElement => {
  const root = document.createElement('div')
  root.className = 'hud-overlay'

  const topBar = document.createElement('div')
  topBar.className = 'hud-topbar'

  const currencyCard = document.createElement('div')
  currencyCard.className = 'hud-currency-card hud-pearls'
  const currencyLabel = document.createElement('div')
  currencyLabel.className = 'hud-currency-label'
  currencyLabel.textContent = 'Coins'
  const currencyValue = document.createElement('div')
  currencyValue.className = 'hud-currency-value'
  const currencyCompat = document.createElement('div')
  currencyCompat.className = 'hud-compat-label'
  currencyCard.appendChild(currencyLabel)
  currencyCard.appendChild(currencyValue)
  currencyCard.appendChild(currencyCompat)
  topBar.appendChild(currencyCard)

  const secondary = document.createElement('div')
  secondary.className = 'hud-secondary-stats'
  const incomeChip = document.createElement('div')
  incomeChip.className = 'hud-secondary-stat'
  const comfortChip = document.createElement('div')
  comfortChip.className = 'hud-secondary-stat'
  const waterChip = document.createElement('div')
  waterChip.className = 'hud-secondary-stat'
  secondary.appendChild(incomeChip)
  secondary.appendChild(comfortChip)
  secondary.appendChild(waterChip)
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

  const rail = document.createElement('div')
  rail.className = 'hud-rail'

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

  const panels: Array<{ mode: GameUiMode; element: HTMLDivElement }> = [
    { mode: 'tank', element: tankPanel },
    { mode: 'shop', element: shopPanel },
    { mode: 'layout', element: layoutPanel },
    { mode: 'progress', element: progressPanel },
    { mode: 'settings', element: settingsPanel }
  ]

  panelContainer.appendChild(guide)
  panels.forEach(({ element }) => panelContainer.appendChild(element))

  rail.appendChild(topBar)
  rail.appendChild(panelContainer)
  root.appendChild(rail)

  const applyMode = (mode: GameUiMode): void => {
    panels.forEach(({ mode: panelMode, element }) => {
      const isActive = panelMode === mode
      element.hidden = !isActive
      element.classList.toggle('is-active', isActive)
    })

    modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  const renderOverlay = (state: GameAppState): void => {
    const tank = getActiveTank(state)
    const guideContent = getGuideContent(state)

    currencyValue.textContent = String(state.game.profile.currency.coins)
    currencyCompat.textContent = `Coins: ${state.game.profile.currency.coins}`
    incomeChip.textContent = `Income ${tank.progression.incomePerMinute}/min`
    comfortChip.textContent = `Comfort ${tank.progression.comfort}`
    waterChip.textContent = `Water ${tank.progression.waterQuality}`

    guide.dataset.mode = state.ui.mode
    guideTitle.textContent = guideContent.title
    guideBody.textContent = guideContent.body
    guideHint.textContent = guideContent.hint
    applyMode(state.ui.mode)
  }

  store.subscribe(({ state }) => renderOverlay(state))
  renderOverlay(store.getState())

  return root
}
