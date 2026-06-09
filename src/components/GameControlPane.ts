import { Pane } from 'tweakpane'
import type { GameStore } from '../game/createGameStore'
import { getDecorContentList, getFishContentList } from '../content/registry'
import type { GameAppState, Lane, PhotoModeFollowMode } from '../game/types'

type GameControlPaneOptions = {
  store: GameStore
  getPerformanceStats?: () => PerformanceStats
}

type PerformanceStats = {
  fps: number
  frameTime: number
  drawCalls: number
  fishVisible: number
}

type PaneControl = {
  refresh?: () => void
  dispose?: () => void
}

type PaneFolder = {
  addBinding: (
    target: Record<string, unknown>,
    key: string,
    options?: Record<string, unknown>
  ) => PaneControl & {
    on: (eventName: 'change', listener: (event: { value: unknown }) => void) => unknown
  }
  addButton: (options: { title: string }) => PaneControl & {
    on: (eventName: 'click', listener: () => void) => unknown
  }
  addFolder: (options: { title: string }) => PaneFolder
}

type ControlParams = Record<string, boolean | number | string>

const PERFORMANCE_POLL_INTERVAL_MS = 1000

const laneOptions: Record<string, Lane> = {
  Top: 'top',
  Middle: 'middle',
  Bottom: 'bottom'
}

const photoFollowOptions: Record<string, PhotoModeFollowMode> = {
  Fish: 'fish',
  Mouse: 'mouse'
}

const getActiveTank = (state: GameAppState) => {
  return state.game.tanks.find((tank) => tank.id === state.game.activeTankId) ?? state.game.tanks[0]
}

const formatControlLabel = (id: string): string => {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getFishCountKey = (speciesId: string): string => `fishCount:${speciesId}`
const getFishLaneKey = (speciesId: string): string => `fishLane:${speciesId}`

const syncPerformanceStats = (params: ControlParams, stats: PerformanceStats): void => {
  params.fps = Math.round(stats.fps)
  params.frameTime = Number(stats.frameTime.toFixed(1))
  params.drawCalls = Math.max(0, Math.floor(stats.drawCalls))
  params.fishVisible = Math.max(0, Math.floor(stats.fishVisible))
}

const syncParams = (params: ControlParams, state: GameAppState): void => {
  const tank = getActiveTank(state)

  params.sound = state.game.profile.preferences.soundEnabled
  params.motion = state.game.profile.preferences.motionEnabled
  params.photoMode = state.game.profile.preferences.photoMode.enabled
  params.photoFollow = state.game.profile.preferences.photoMode.followMode
  params.comfort = tank.progression.comfort
  params.income = tank.progression.incomePerMinute
  params.fishTotal = tank.fishSchools.reduce((total, school) => total + school.count, 0)
  params.decorTotal = tank.decor.length
  params.observedMinutes = Math.floor(state.game.profile.stats.totalViewedSeconds / 60)

  getFishContentList().forEach((fish) => {
    const school = tank.fishSchools.find((entry) => entry.speciesId === fish.speciesId)
    params[getFishCountKey(fish.speciesId)] = school?.count ?? 0
    params[getFishLaneKey(fish.speciesId)] = school?.lane ?? fish.gameplay.preferredLane
  })
}

export const createGameControlPane = ({ store, getPerformanceStats }: GameControlPaneOptions) => {
  const root = document.createElement('div')
  root.className = 'game-control-pane'

  const pane = new Pane({ title: 'Aquarium HUD' }) as unknown as PaneFolder & PaneControl & { element?: HTMLElement }
  if (pane.element) {
    root.appendChild(pane.element)
  }

  const params: ControlParams = {}
  const controls: PaneControl[] = []
  syncParams(params, store.getState())

  const addControl = (control: PaneControl): void => {
    controls.push(control)
  }

  const tankFolder = pane.addFolder({ title: 'Tank status' })
  addControl(tankFolder.addBinding(params, 'comfort', {
    label: 'Comfort',
    readonly: true
  }))
  addControl(tankFolder.addBinding(params, 'income', {
    label: 'Income/min',
    readonly: true
  }))
  addControl(tankFolder.addBinding(params, 'fishTotal', {
    label: 'Fish',
    readonly: true
  }))
  addControl(tankFolder.addBinding(params, 'decorTotal', {
    label: 'Decor',
    readonly: true
  }))
  addControl(tankFolder.addBinding(params, 'observedMinutes', {
    label: 'Observed min',
    readonly: true
  }))

  const fishFolder = pane.addFolder({ title: 'Fish layout' })
  getFishContentList().forEach((fish) => {
    const label = formatControlLabel(fish.speciesId)
    const countKey = getFishCountKey(fish.speciesId)
    const laneKey = getFishLaneKey(fish.speciesId)

    addControl(fishFolder.addBinding(params, countKey, {
      label: `${label} count`,
      min: 0,
      max: 32,
      step: 1
    }).on('change', (event) => {
      store.dispatch({
        type: 'GAME/SET_FISH_COUNT',
        payload: {
          speciesId: fish.speciesId,
          count: typeof event.value === 'number' ? event.value : Number(event.value)
        }
      })
    }) as PaneControl)

    addControl(fishFolder.addBinding(params, laneKey, {
      label: `${label} lane`,
      options: laneOptions
    }).on('change', (event) => {
      store.dispatch({
        type: 'GAME/SET_FISH_LANE',
        payload: {
          speciesId: fish.speciesId,
          lane: event.value as Lane
        }
      })
    }) as PaneControl)
  })

  const decorFolder = pane.addFolder({ title: 'Decor' })
  getDecorContentList().forEach((decor) => {
    addControl(decorFolder.addBinding({
      [`decor:${decor.decorId}`]: `${decor.displayName} +${decor.gameplay.comfortBonus}`
    }, `decor:${decor.decorId}`, {
      label: formatControlLabel(decor.decorId),
      readonly: true
    }))
  })

  const settingsFolder = pane.addFolder({ title: 'Settings' })
  addControl(settingsFolder.addBinding(params, 'sound', {
    label: 'Sound'
  }).on('change', (event) => {
    store.dispatch({
      type: 'SETTINGS/SET_SOUND',
      payload: { enabled: event.value === true }
    })
  }) as PaneControl)
  addControl(settingsFolder.addBinding(params, 'motion', {
    label: 'Motion'
  }).on('change', (event) => {
    store.dispatch({
      type: 'SETTINGS/SET_MOTION',
      payload: { enabled: event.value === true }
    })
  }) as PaneControl)

  const photoFolder = pane.addFolder({ title: 'Photo mode' })
  addControl(photoFolder.addBinding(params, 'photoMode', {
    label: 'Photo mode'
  }).on('change', (event) => {
    store.dispatch({
      type: 'SETTINGS/SET_PHOTO_MODE',
      payload: { enabled: event.value === true }
    })
  }) as PaneControl)
  addControl(photoFolder.addBinding(params, 'photoFollow', {
    label: 'Photo follow',
    options: photoFollowOptions
  }).on('change', (event) => {
    store.dispatch({
      type: 'SETTINGS/SET_PHOTO_FOLLOW_MODE',
      payload: { followMode: event.value as PhotoModeFollowMode }
    })
  }) as PaneControl)

  if (getPerformanceStats) {
    const debugFolder = pane.addFolder({ title: 'Debug' })
    syncPerformanceStats(params, {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      fishVisible: 0
    })
    addControl(debugFolder.addBinding(params, 'fps', {
      label: 'FPS',
      readonly: true
    }))
    addControl(debugFolder.addBinding(params, 'frameTime', {
      label: 'Frame ms',
      readonly: true
    }))
    addControl(debugFolder.addBinding(params, 'drawCalls', {
      label: 'Draw calls',
      readonly: true
    }))
    addControl(debugFolder.addBinding(params, 'fishVisible', {
      label: 'Fish visible',
      readonly: true
    }))
  }

  const performanceInterval = getPerformanceStats
    ? window.setInterval(() => {
        syncPerformanceStats(params, getPerformanceStats())
        controls.forEach((control) => control.refresh?.())
      }, PERFORMANCE_POLL_INTERVAL_MS)
    : null

  const unsubscribe = store.subscribe(({ state }) => {
    syncParams(params, state)
    controls.forEach((control) => control.refresh?.())
  })

  return {
    element: root,
    dispose: () => {
      unsubscribe()
      if (performanceInterval !== null) {
        window.clearInterval(performanceInterval)
      }
      controls.forEach((control) => control.dispose?.())
      pane.dispose?.()
      root.remove()
    }
  }
}
