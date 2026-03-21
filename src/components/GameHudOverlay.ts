import type { GameStore } from '../game/createGameStore'
import type { FishContentDefinition } from '../content/types'
import { getDecorContent, getDecorContentList, getFishContentList } from '../content/registry'
import {
  getDecorCellLabel,
  getDecorLibrarySummary,
  getDecorPlacementAssetById,
  getDecorPlacementAssetGroups
} from '../content/decorVisuals'
import type { GameAppState, GameUiMode } from '../game/types'
import { createAquariumRenderModel } from '../game/renderModel'
import type { QualityLevel } from '../types/settings'
import {
  getObservedSeconds,
  getRemainingObservationSeconds,
  getRequiredObservationSeconds
} from '../game/unlocks'

type GameHudOverlayOptions = {
  store: GameStore
}

type GameHudOverlayHandle = {
  element: HTMLDivElement
  dispose: () => void
}

type HudPanelHandle = {
  element: HTMLDivElement
  render: (state: GameAppState) => void
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

type BehaviorCopy = {
  value: string
  meta: string
}

type ObservationMilestone = {
  label: string
  remainingSeconds: number
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
        title: 'Build the habitat',
        body: 'Unlock species and decor that support the depth balance you want before switching to Layout.',
        hint: 'Hideouts matter more once schools start crowding the same lane.'
      }
    case 'layout':
      return {
        title: 'Shape the water column',
        body: 'Spread schools across depths, then place hideouts where fish cluster to keep the tank readable.',
        hint: 'Lane chips shift fish depth instantly, and Eraser clears the selected cell.'
      }
    case 'progress':
      return {
        title: 'Read the tank',
        body: 'Track which changes are calming the fish and which ones are only raising maintenance pressure.',
        hint: 'A steadier tank should improve both mood and passive income.'
      }
    case 'settings':
      return {
        title: 'Tune the view',
        body: 'Use tactile toggles for sound and motion, then balance fidelity with the quality chips.',
        hint: 'Press Escape anytime to jump back to Tank.'
      }
    case 'tank':
    default:
      return {
        title: 'Observe first',
        body: 'Watch how fish settle, then use Unlock and Layout to spread schools across depths before adding more stock.',
        hint: 'Crowded lanes create alert behavior, while calm schools are easier to read.'
      }
  }
}

const getBehaviorCopy = (state: GameAppState): BehaviorCopy => {
  const renderModel = createAquariumRenderModel(state)
  const moods = renderModel.fishGroups.map((group) => group.tuning?.schoolMood)

  if (moods.includes('alert')) {
    return {
      value: 'Alert',
      meta: 'Fish are clustering low'
    }
  }

  if (moods.includes('feeding')) {
    return {
      value: 'Surface active',
      meta: 'Healthy schools are skimming high'
    }
  }

  return {
    value: 'Settled',
    meta: 'Fish are holding formation'
  }
}

const formatDurationShort = (seconds: number): string => {
  const normalized = Math.max(0, Math.floor(seconds))
  if (normalized >= 3600) {
    const hours = Math.floor(normalized / 3600)
    const minutes = Math.floor((normalized % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (normalized >= 60) {
    return `${Math.floor(normalized / 60)}m`
  }

  return `${normalized}s`
}

const getObservationProgressCopy = (state: GameAppState, fish: FishContentDefinition): string | null => {
  const requiredSeconds = getRequiredObservationSeconds(fish)
  if (requiredSeconds <= 0) return null

  const observedSeconds = Math.min(getObservedSeconds(state.game), requiredSeconds)
  return `Observe ${formatDurationShort(observedSeconds)} / ${formatDurationShort(requiredSeconds)}`
}

const getNextObservationMilestone = (state: GameAppState): ObservationMilestone | null => {
  const lockedFish = getFishContentList()
    .filter((fish) => !state.game.profile.unlockedFishIds.includes(fish.speciesId))
    .map((fish) => ({
      label: fish.displayName,
      remainingSeconds: getRemainingObservationSeconds(state.game, fish)
    }))
    .filter((fish) => fish.remainingSeconds > 0)
    .sort((left, right) => left.remainingSeconds - right.remainingSeconds)

  return lockedFish[0] ?? null
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
    .map((fish) => ({
      label: fish.displayName,
      cost: fish.gameplay.unlockCost,
      remainingObservationSeconds: getRemainingObservationSeconds(state.game, fish)
    }))
  const lockedDecor = getDecorContentList()
    .filter((decor) => !state.game.profile.unlockedDecorIds.includes(decor.decorId))
    .map((decor) => ({
      label: decor.displayName,
      cost: decor.gameplay.unlockCost,
      remainingObservationSeconds: 0
    }))

  const nextUnlock = [...lockedFish, ...lockedDecor]
    .sort((left, right) => {
      const observationRank = Number(left.remainingObservationSeconds > 0) - Number(right.remainingObservationSeconds > 0)
      if (observationRank !== 0) return observationRank
      if (left.cost !== right.cost) return left.cost - right.cost
      return left.remainingObservationSeconds - right.remainingObservationSeconds
    })[0]

  if (!nextUnlock) {
    return 'Next unlock: everything is already in the tank kit.'
  }

  const coinsNeeded = Math.max(0, nextUnlock.cost - coins)
  if (nextUnlock.remainingObservationSeconds > 0) {
    return coinsNeeded === 0
      ? `Next unlock: ${nextUnlock.label} after ${formatDurationShort(nextUnlock.remainingObservationSeconds)} of observing.`
      : `Next unlock: ${nextUnlock.label} after ${formatDurationShort(nextUnlock.remainingObservationSeconds)} and ${coinsNeeded} coins.`
  }

  return coinsNeeded === 0
    ? `Next unlock: ${nextUnlock.label} is ready now.`
    : `Next unlock: ${nextUnlock.label} in ${coinsNeeded} coins.`
}

const createTankPanel = (store: GameStore): HudPanelHandle => {
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
    const behavior = getBehaviorCopy(state)

    lead.textContent = `${tank.name} · ${tank.decor.length} decor placed`
    summary.innerHTML = ''
    ;[
      { label: 'Income', value: `${tank.progression.incomePerMinute}/min`, meta: 'Active tank' },
      { label: 'Comfort', value: String(tank.progression.comfort), meta: 'Drives unlocks' },
      { label: 'Water', value: String(tank.progression.waterQuality), meta: 'Keep it clear' },
      { label: 'Behavior', value: behavior.value, meta: behavior.meta },
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

  return {
    element: panel,
    render
  }
}

const createShopPanel = (store: GameStore): HudPanelHandle => {
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
      const observationProgress = getObservationProgressCopy(state, fish)
      const statLine = observationProgress
        ? `${observationProgress} · Unlock ${fish.gameplay.unlockCost} / +${fish.gameplay.baseIncomePerMinute.toFixed(2)} each`
        : `Unlock ${fish.gameplay.unlockCost} / +${fish.gameplay.baseIncomePerMinute.toFixed(2)} each`
      info.innerHTML = `<strong>${fish.displayName}</strong><div class="hud-item-meta">${fish.description}</div><div class="hud-item-meta">${statLine}</div>`
      row.appendChild(info)

      const action = document.createElement('button')
      action.type = 'button'
      action.className = 'hud-action-button'
      const unlocked = state.game.profile.unlockedFishIds.includes(fish.speciesId)
      const remainingObservationSeconds = getRemainingObservationSeconds(state.game, fish)
      if (unlocked) {
        action.textContent = 'Unlocked'
        action.disabled = true
      } else if (remainingObservationSeconds > 0) {
        action.textContent = `Observe ${formatDurationShort(remainingObservationSeconds)}`
        action.disabled = true
      } else {
        action.textContent = `Unlock ${fish.gameplay.unlockCost}`
        action.disabled = state.game.profile.currency.coins < fish.gameplay.unlockCost
      }
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

  return {
    element: panel,
    render
  }
}

const createLayoutPanel = (store: GameStore): HudPanelHandle => {
  const panel = document.createElement('div')
  panel.className = 'hud-panel hud-panel--layout hud-layout-panel'
  panel.dataset.panel = 'layout'
  let selectedDecorAssetId: string | null = null

  panel.appendChild(createPanelHeader('Layout', 'Blueprint'))

  const status = document.createElement('div')
  status.className = 'hud-layout-status'
  panel.appendChild(status)

  panel.appendChild(createSectionLabel('Fish schools'))

  const fishSection = document.createElement('div')
  fishSection.className = 'hud-list'
  panel.appendChild(fishSection)

  panel.appendChild(createSectionLabel('Placement Library'))

  const decorSummary = document.createElement('div')
  decorSummary.className = 'hud-decor-summary'
  panel.appendChild(decorSummary)

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
    const decorLibrary = getDecorContentList()
    const placementGroups = getDecorPlacementAssetGroups(decorLibrary)
    const fallbackSelectedAssetId = state.ui.selectedDecorId
      ? placementGroups
          .find((group) => group.decorId === state.ui.selectedDecorId)
          ?.assets[0]
          ?.assetId ?? null
      : null
    const effectiveSelectedAssetId = state.ui.selectedDecorId === null
      ? null
      : selectedDecorAssetId ?? fallbackSelectedAssetId
    const selectedAssetCandidate = getDecorPlacementAssetById(effectiveSelectedAssetId, decorLibrary)
    const selectedAsset = selectedAssetCandidate?.decorId === state.ui.selectedDecorId
      ? selectedAssetCandidate
      : getDecorPlacementAssetById(fallbackSelectedAssetId, decorLibrary)
    const selectedDecor = state.ui.selectedDecorId
      ? getDecorContent(state.ui.selectedDecorId)
      : null

    status.textContent = selectedAsset && selectedDecor
      ? `Tool: ${selectedAsset.displayName} · ${selectedDecor.displayName} family · click blueprint cells to place it`
      : 'Tool: Eraser · click blueprint cells to clear the tank'

    const decorLibrarySummary = getDecorLibrarySummary(decorLibrary)
    decorSummary.textContent = `${decorLibrarySummary.modelCount} placeable assets · ${placementGroups.length} families · ${decorLibrarySummary.textureCount} shared textures`

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
      selectedDecorAssetId = null
      store.dispatch({ type: 'UI/SELECT_DECOR', payload: { decorId: null } })
    })
    palette.appendChild(eraser)

    placementGroups.forEach((group) => {
      const familySection = document.createElement('section')
      familySection.className = 'hud-decor-family'
      familySection.dataset.decorFamily = group.family

      const familyHeader = document.createElement('div')
      familyHeader.className = 'hud-decor-family-header'
      familyHeader.innerHTML = `<strong class="hud-decor-family-title">${group.title}</strong><span class="hud-decor-family-meta">${group.assets.length} assets · ${group.sharedTextureCount} shared textures</span>`
      familySection.appendChild(familyHeader)

      const familyGrid = document.createElement('div')
      familyGrid.className = 'hud-decor-family-grid'
      const isUnlocked = state.game.profile.unlockedDecorIds.includes(group.decorId)

      group.assets.forEach((asset) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.decorAsset = asset.assetId
        button.className = `hud-action-button hud-decor-tool ${effectiveSelectedAssetId === asset.assetId ? 'is-active' : ''}`.trim()
        button.innerHTML = `<strong class="hud-decor-tool-label">${asset.displayName}</strong><span class="hud-decor-tool-status">${isUnlocked ? 'Ready' : 'Locked'}</span>`
        button.disabled = !isUnlocked
        button.addEventListener('click', () => {
          if (!isUnlocked) return
          selectedDecorAssetId = asset.assetId
          store.dispatch({ type: 'UI/SELECT_DECOR', payload: { decorId: asset.decorId } })
        })
        familyGrid.appendChild(button)
      })
      familySection.appendChild(familyGrid)
      palette.appendChild(familySection)
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
        cell.textContent = decor ? getDecorCellLabel(getDecorContent(decor.decorId)) : '·'
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

  return {
    element: panel,
    render
  }
}

const createProgressPanel = (): HudPanelHandle => {
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
    const nextObservationMilestone = getNextObservationMilestone(state)

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
        label: 'Observation',
        value: formatDurationShort(state.game.profile.stats.totalViewedSeconds),
        meta: nextObservationMilestone
          ? `${formatDurationShort(nextObservationMilestone.remainingSeconds)} to ${nextObservationMilestone.label}`
          : 'All sight-gated fish ready'
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

  return {
    element: panel,
    render
  }
}

const createSettingsPanel = (store: GameStore): HudPanelHandle => {
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

  const photoModeRow = document.createElement('div')
  photoModeRow.className = 'hud-setting-row'
  const photoModeCopy = document.createElement('div')
  photoModeCopy.className = 'hud-setting-copy'
  photoModeCopy.innerHTML = '<strong class="hud-setting-label">Photo Mode</strong><div class="hud-setting-meta">Hide the HUD and shift into a slower showcase framing</div>'
  const photoModeButton = document.createElement('button')
  photoModeButton.type = 'button'
  photoModeButton.className = 'hud-toggle-button'
  photoModeButton.addEventListener('click', () => {
    const enabled = !store.getState().game.profile.preferences.photoModeEnabled
    store.dispatch({ type: 'SETTINGS/SET_PHOTO_MODE', payload: { enabled } })
  })
  photoModeRow.appendChild(photoModeCopy)
  photoModeRow.appendChild(photoModeButton)
  panel.appendChild(photoModeRow)

  const qualityLabel = createSectionLabel('Visual quality')
  panel.appendChild(qualityLabel)

  const qualitySegmented = document.createElement('div')
  qualitySegmented.className = 'hud-segmented'
  const qualityButtons: HTMLButtonElement[] = []
  const qualityOptions: Array<{ label: string; value: QualityLevel }> = [
    { label: '簡易', value: 'simple' },
    { label: '標準', value: 'standard' }
  ]
  qualityOptions.forEach((quality) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = quality.label
    button.addEventListener('click', () => {
      store.dispatch({
        type: 'SETTINGS/SET_QUALITY',
        payload: { quality: quality.value }
      })
    })
    qualityButtons.push(button)
    qualitySegmented.appendChild(button)
  })
  panel.appendChild(qualitySegmented)

  const settingsHint = document.createElement('div')
  settingsHint.className = 'hud-progress-callout'
  settingsHint.textContent = '簡易でも shadow と texture は維持しつつ、描画負荷の高い演出だけを抑えます。'
  panel.appendChild(settingsHint)

  const render = (state: GameAppState): void => {
    const soundEnabled = state.game.profile.preferences.soundEnabled
    const motionEnabled = state.game.profile.preferences.motionEnabled
    const photoModeEnabled = state.game.profile.preferences.photoModeEnabled
    const quality = state.game.profile.preferences.quality

    soundButton.textContent = soundEnabled ? 'On' : 'Off'
    soundButton.classList.toggle('is-on', soundEnabled)
    soundButton.setAttribute('aria-pressed', String(soundEnabled))

    motionButton.textContent = motionEnabled ? 'On' : 'Off'
    motionButton.classList.toggle('is-on', motionEnabled)
    motionButton.setAttribute('aria-pressed', String(motionEnabled))

    photoModeButton.textContent = photoModeEnabled ? 'On' : 'Off'
    photoModeButton.classList.toggle('is-on', photoModeEnabled)
    photoModeButton.setAttribute('aria-pressed', String(photoModeEnabled))

    qualityButtons.forEach((button, index) => {
      const value = qualityOptions[index]?.value
      const isActive = value === quality
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  return {
    element: panel,
    render
  }
}

export const createGameHudOverlay = ({ store }: GameHudOverlayOptions): GameHudOverlayHandle => {
  const root = document.createElement('div')
  root.className = 'hud-overlay'
  root.dataset.visible = 'true'

  const revealTab = document.createElement('button')
  revealTab.type = 'button'
  revealTab.className = 'hud-reveal-tab'
  revealTab.dataset.action = 'show-hud'
  revealTab.textContent = 'Show HUD'
  revealTab.hidden = true
  revealTab.addEventListener('click', () => {
    const { photoModeEnabled } = store.getState().game.profile.preferences
    if (photoModeEnabled) {
      store.dispatch({ type: 'SETTINGS/SET_PHOTO_MODE', payload: { enabled: false } })
      return
    }
    store.dispatch({ type: 'SETTINGS/SET_HUD_VISIBILITY', payload: { visible: true } })
  })

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

  const hideHudButton = document.createElement('button')
  hideHudButton.type = 'button'
  hideHudButton.dataset.action = 'hide-hud'
  hideHudButton.textContent = 'Hide HUD'
  hideHudButton.addEventListener('click', () => {
    store.dispatch({ type: 'SETTINGS/SET_HUD_VISIBILITY', payload: { visible: false } })
  })
  buttons.appendChild(hideHudButton)
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
  const progressPanel = createProgressPanel()
  const settingsPanel = createSettingsPanel(store)

  const panels: Array<{ mode: GameUiMode; panel: HudPanelHandle }> = [
    { mode: 'tank', panel: tankPanel },
    { mode: 'shop', panel: shopPanel },
    { mode: 'layout', panel: layoutPanel },
    { mode: 'progress', panel: progressPanel },
    { mode: 'settings', panel: settingsPanel }
  ]

  panelContainer.appendChild(guide)
  panels.forEach(({ panel }) => panelContainer.appendChild(panel.element))

  rail.appendChild(topBar)
  rail.appendChild(panelContainer)
  root.appendChild(rail)
  root.appendChild(revealTab)

  const applyMode = (mode: GameUiMode): void => {
    panels.forEach(({ mode: panelMode, panel }) => {
      const isActive = panelMode === mode
      panel.element.hidden = !isActive
      panel.element.classList.toggle('is-active', isActive)
    })

    modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  const applyVisibility = (visible: boolean): void => {
    root.dataset.visible = visible ? 'true' : 'false'
    rail.hidden = !visible
    revealTab.hidden = visible
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
    revealTab.textContent = state.game.profile.preferences.photoModeEnabled ? 'Exit Photo Mode' : 'Show HUD'
    panels.forEach(({ panel }) => panel.render(state))
    applyMode(state.ui.mode)
    applyVisibility(state.game.profile.preferences.hudVisible)
  }

  const unsubscribe = store.subscribe(({ state }) => renderOverlay(state))
  renderOverlay(store.getState())

  return {
    element: root,
    dispose: () => {
      unsubscribe()
      root.remove()
    }
  }
}
