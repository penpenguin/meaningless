import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameStore } from '../../game/createGameStore'
import { createHydratedGameAppState } from '../../game/gameSave'
import { createGameControlPane } from './GameControlPane'

const paneMock = vi.hoisted(() => {
  type Binding = {
    key: string
    config?: { label?: string; options?: Record<string, string> }
    listeners: Array<(event: { value: unknown }) => void>
    refresh: ReturnType<typeof vi.fn>
  }
  type Button = {
    title: string
    listeners: Array<() => void>
  }
  const bindings: Binding[] = []
  const buttons: Button[] = []

  class MockFolder {
    element = document.createElement('section')

    constructor(public title: string) {
      this.element.dataset.folder = title
    }

    addBinding(_target: Record<string, unknown>, key: string, config?: Binding['config']) {
      const binding: Binding = { key, config, listeners: [], refresh: vi.fn() }
      bindings.push(binding)
      return {
        on: (_event: 'change', listener: (event: { value: unknown }) => void) => {
          binding.listeners.push(listener)
          return this
        },
        refresh: binding.refresh,
        dispose: vi.fn()
      }
    }

    addButton(options: { title: string }) {
      const button: Button = { title: options.title, listeners: [] }
      buttons.push(button)
      return {
        on: (_event: 'click', listener: () => void) => {
          button.listeners.push(listener)
          return this
        },
        dispose: vi.fn()
      }
    }

    addFolder(options: { title: string }) {
      const folder = new MockFolder(options.title)
      this.element.appendChild(folder.element)
      return folder
    }
  }

  class Pane extends MockFolder {
    constructor(options: { title: string }) {
      super(options.title)
      this.element.className = 'tp-root'
    }

    dispose = vi.fn()
  }

  return {
    bindings,
    buttons,
    Pane,
    reset: () => {
      bindings.length = 0
      buttons.length = 0
    }
  }
})

vi.mock('tweakpane', () => ({
  Pane: paneMock.Pane
}))

describe('createGameControlPane', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    paneMock.reset()
  })

  it('mounts a Tweakpane HUD without coin, income, decor, comfort, or visual quality controls', () => {
    const store = createGameStore({ tickIntervalMs: 60_000 })
    const pane = createGameControlPane({ store })
    document.body.appendChild(pane.element)

    expect(pane.element.className).toContain('game-control-pane')
    expect(pane.element.textContent).not.toContain('Coin')
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Income/min')).toBe(false)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Decor')).toBe(false)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Comfort')).toBe(false)
    expect(pane.element.textContent).not.toContain('Quality')
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Photo follow')).toBe(true)

    pane.dispose()
    store.destroy()
  })

  it('dispatches layout and photo mode changes through pane bindings', () => {
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    })
    const pane = createGameControlPane({ store })

    const clownfishCount = paneMock.bindings.find((binding) => binding.config?.label === 'Clownfish count')
    const photoEnabled = paneMock.bindings.find((binding) => binding.config?.label === 'Photo mode')
    const photoFollow = paneMock.bindings.find((binding) => binding.config?.label === 'Photo follow')

    clownfishCount?.listeners[0]?.({ value: 5 })
    photoEnabled?.listeners[0]?.({ value: true })
    photoFollow?.listeners[0]?.({ value: 'mouse' })

    const state = store.getState()
    expect(state.game.tanks[0]?.fishSchools).toContainEqual(
      expect.objectContaining({ speciesId: 'clownfish', count: 5 })
    )
    expect(state.game.profile.preferences.photoMode).toEqual({
      enabled: true,
      followMode: 'mouse'
    })

    pane.dispose()
    store.destroy()
  })

  it('keeps the photo mode toggle reachable while photo mode is active', () => {
    const store = createGameStore({
      tickIntervalMs: 60_000,
      initialState: createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })
    })
    const pane = createGameControlPane({ store })
    const photoEnabled = paneMock.bindings.find((binding) => binding.config?.label === 'Photo mode')

    photoEnabled?.listeners[0]?.({ value: true })

    expect(store.getState().game.profile.preferences.photoMode.enabled).toBe(true)
    expect(pane.element.hidden).toBe(false)

    photoEnabled?.listeners[0]?.({ value: false })

    expect(store.getState().game.profile.preferences.photoMode.enabled).toBe(false)

    pane.dispose()
    store.destroy()
  })

  it('polls performance stats into a debug folder every second', () => {
    vi.useFakeTimers()
    const store = createGameStore({ tickIntervalMs: 60_000 })
    const getPerformanceStats = vi.fn(() => ({
      fps: 58,
      frameTime: 17.2,
      drawCalls: 121,
      fishVisible: 24,
      triangles: 45_678,
      geometries: 82,
      textures: 37,
      assetLoadTotalMs: 211.4,
      assetLoadTexturesMs: 80.2,
      assetLoadModelsMs: 130.8,
      assetLoadEnvironmentMs: 12.1,
      fishUpdateCount: 10,
      fishUpdateLastMs: 2.2,
      fishUpdateAverageMs: 2.8,
      waterMotionUpdateCount: 10,
      waterMotionUpdateLastMs: 1.4,
      waterMotionUpdateAverageMs: 1.8,
      godRaysDepthRenderCount: 6,
      godRaysDepthRenderLastMs: 4.1,
      godRaysDepthRenderAverageMs: 4.6
    }))
    const pane = createGameControlPane({ store, getPerformanceStats })

    expect(paneMock.bindings.some((binding) => binding.config?.label === 'FPS')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Frame ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Draw calls')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Triangles')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Geometries')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Textures')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Asset load ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Texture load ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Model load ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Environment load ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Fish update avg ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Water update avg ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'God rays depth avg ms')).toBe(true)
    expect(paneMock.bindings.some((binding) => binding.config?.label === 'Fish visible')).toBe(true)

    vi.advanceTimersByTime(1000)

    expect(getPerformanceStats).toHaveBeenCalledTimes(1)
    expect(paneMock.bindings.find((binding) => binding.config?.label === 'FPS')?.refresh).toHaveBeenCalled()

    pane.dispose()
    vi.advanceTimersByTime(1000)

    expect(getPerformanceStats).toHaveBeenCalledTimes(1)
    store.destroy()
    vi.useRealTimers()
  })
})
