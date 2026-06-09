import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

const hoisted = vi.hoisted(() => {
  type MockVisualAssets = {
    manifest: { textures: unknown[]; models: unknown[]; environment: unknown[] }
    textures: Record<string, unknown>
    models: Record<string, unknown>
    environment: Record<string, unknown>
  }
  const createEmptyAssets = (): MockVisualAssets => ({
    manifest: { textures: [], models: [], environment: [] },
    textures: {},
    models: {},
    environment: {}
  })
  const mockedAssets = createEmptyAssets()

  return {
    bootManifest: { textures: [{ id: 'boot-texture' }], models: [{ id: 'boot-model' }], environment: [] },
    deferredManifest: { textures: [{ id: 'deferred-texture' }], models: [{ id: 'deferred-model' }], environment: [] },
    mockedAssets,
    loadVisualAssets: vi.fn(async (_manifest?: unknown): Promise<MockVisualAssets> => createEmptyAssets()),
    lastSceneAssets: null as unknown,
    lastSceneOptions: null as unknown,
    lastSceneInstance: null as {
      getPerformanceStats: ReturnType<typeof vi.fn>
    } | null,
    lastPaneStatsProvider: null as null | (() => unknown)
  }
})

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled = vi.fn()
      setPhotoMode = vi.fn()
      setAdvancedEffects = vi.fn()
      applyTheme = vi.fn()
      applyFishGroups = vi.fn(() => true)
      start = vi.fn()
      dispose = vi.fn()
      getPerformanceStats = vi.fn(() => ({
        fps: 60,
        frameTime: 16,
        fishVisible: 0,
        drawCalls: 0
      }))

      constructor(_container?: HTMLElement, assets?: unknown, _theme?: unknown, options?: unknown) {
        hoisted.lastSceneAssets = assets ?? null
        hoisted.lastSceneOptions = options ?? null
        hoisted.lastSceneInstance = this as unknown as {
          getPerformanceStats: ReturnType<typeof vi.fn>
        }
      }
    }
  }
})

vi.mock('../components/GameControlPane', () => {
  return {
    createGameControlPane: ({
      store,
      getPerformanceStats
    }: {
      store: { dispatch: (action: unknown) => void }
      getPerformanceStats?: () => unknown
    }) => {
      hoisted.lastPaneStatsProvider = getPerformanceStats ?? null
      const element = document.createElement('div')
      element.className = 'game-control-pane'
      const photoButton = document.createElement('button')
      photoButton.dataset.action = 'photo-mode'
      photoButton.addEventListener('click', () => {
        store.dispatch({ type: 'SETTINGS/SET_PHOTO_MODE', payload: { enabled: true } })
      })
      element.appendChild(photoButton)
      return {
        element,
        dispose: vi.fn(() => element.remove())
      }
    }
  }
})

vi.mock('../assets/visualAssets', () => {
  return {
    aquariumAssetManifest: { textures: [], models: [], environment: [] },
    createBootAquariumAssetManifest: vi.fn(() => hoisted.bootManifest),
    createDeferredAquariumAssetManifest: vi.fn(() => hoisted.deferredManifest),
    loadVisualAssets: hoisted.loadVisualAssets
  }
})

vi.mock('../components/AudioManager', () => {
  return {
    AudioManager: class {
      setEnabled = vi.fn()
      playBubbleSound = vi.fn()
      dispose = vi.fn()
    }
  }
})

vi.mock('../utils/tankStorage', () => {
  return {
    loadTankState: () => null,
    saveTankState: vi.fn()
  }
})

vi.mock('../utils/profileStorage', () => {
  return {
    loadProfileState: () => null,
    saveProfileState: vi.fn()
  }
})

vi.mock('../utils/settingsStorage', () => {
  return {
    loadSettingsState: () => null,
    saveSettingsState: vi.fn()
  }
})

vi.mock('../utils/storage', () => {
  return {
    getAutoSave: () => null
  }
})

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('AdvancedAquariumApp UX integration', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/meaningless/')
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="loading-screen"></div>
      <div id="lottie-bubbles"></div>
    `
    const mediaQueryList = {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as MediaQueryList
    window.matchMedia = vi.fn(() => mediaQueryList) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    vi.useRealTimers()
    hoisted.loadVisualAssets.mockReset()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    hoisted.lastSceneAssets = null
    hoisted.lastSceneInstance = null
    hoisted.lastPaneStatsProvider = null
  })

  it('starts hiding the loading screen immediately after init completes', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    const app = new AdvancedAquariumApp()

    const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement
    await flushMicrotasks()

    expect(loadingScreen.style.opacity).toBe('0')

    await vi.advanceTimersByTimeAsync(500)
    expect(loadingScreen.style.display).toBe('none')

    app.dispose()
  })

  it('renders the centralized Tweakpane control surface without the legacy HUD', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(document.querySelector('.hud-overlay')).toBeNull()
    expect(document.querySelector('.game-control-pane')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Coins')
    expect(document.body.textContent).not.toContain('Visual quality')

    app.dispose()
  })

  it('forwards photo mode state to the scene', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    const photoModeButton = document.querySelector('[data-action="photo-mode"]') as HTMLButtonElement
    photoModeButton.click()

    const scene = (app as unknown as { scene: { setPhotoMode: ReturnType<typeof vi.fn> } | null }).scene
    expect(scene?.setPhotoMode).toHaveBeenCalledWith({ enabled: true, followMode: 'fish' })

    app.dispose()
  })

  it('passes preloaded visual assets into the scene constructor', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(hoisted.loadVisualAssets).toHaveBeenCalledTimes(2)
    expect(hoisted.loadVisualAssets).toHaveBeenNthCalledWith(1, hoisted.bootManifest)
    expect(hoisted.loadVisualAssets).toHaveBeenNthCalledWith(2, hoisted.deferredManifest)
    expect(hoisted.lastSceneAssets).toBe(hoisted.mockedAssets)

    app.dispose()
  })

  it('loads boot visual assets before constructing the scene and defers optional assets', async () => {
    vi.useFakeTimers()
    const bootTexture = {}
    const deferredTexture = {}
    const bootAssets = {
      manifest: hoisted.bootManifest,
      textures: { boot: bootTexture },
      models: {},
      environment: {}
    }
    const deferredAssets = {
      manifest: hoisted.deferredManifest,
      textures: { deferred: deferredTexture },
      models: { 'fish-goldfish-hero': null },
      environment: {}
    }
    let resolveDeferredAssets: (assets: typeof deferredAssets) => void = () => undefined
    const deferredLoad = new Promise<typeof deferredAssets>((resolve) => {
      resolveDeferredAssets = resolve
    })
    hoisted.loadVisualAssets.mockImplementation((manifest?: unknown) => {
      if (manifest === hoisted.bootManifest) return Promise.resolve(bootAssets)
      if (manifest === hoisted.deferredManifest) return deferredLoad
      return Promise.resolve(hoisted.mockedAssets)
    })

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(hoisted.loadVisualAssets).toHaveBeenNthCalledWith(1, hoisted.bootManifest)
    expect(hoisted.loadVisualAssets).toHaveBeenNthCalledWith(2, hoisted.deferredManifest)
    expect(hoisted.lastSceneAssets).toBe(bootAssets)
    expect((hoisted.lastSceneAssets as typeof bootAssets).textures.boot).toBe(bootTexture)

    resolveDeferredAssets(deferredAssets)
    await flushMicrotasks()

    expect((hoisted.lastSceneAssets as typeof bootAssets & typeof deferredAssets).textures.deferred).toBe(deferredTexture)
    expect((hoisted.lastSceneAssets as typeof bootAssets & typeof deferredAssets).models['fish-goldfish-hero']).toBeNull()

    app.dispose()
  })

  it('passes measurement tuning query switches into the scene constructor', async () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/meaningless/?perfPost=0&perfHaze=0&perfShadow=2048')
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(hoisted.lastSceneOptions).toEqual({
      postProcessingEnabled: false,
      screenSpaceHazeEnabled: false,
      shadowMapSize: 2048
    })

    app.dispose()
  })

  it('passes scene performance stats into the control pane', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(hoisted.lastPaneStatsProvider).not.toBeNull()
    hoisted.lastPaneStatsProvider?.()

    expect(hoisted.lastSceneInstance?.getPerformanceStats).toHaveBeenCalledTimes(1)

    app.dispose()
  })

  it('exposes scene performance stats to tooling and removes the hook on dispose', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    const debugWindow = window as typeof window & {
      __aquariumPerformanceStats?: () => unknown
    }

    expect(debugWindow.__aquariumPerformanceStats?.()).toEqual({
      fps: 60,
      frameTime: 16,
      fishVisible: 0,
      drawCalls: 0
    })

    app.dispose()

    expect(debugWindow.__aquariumPerformanceStats).toBeUndefined()
  })

  it('marks app initialization through loading overlay hidden for browser performance tooling', async () => {
    vi.useFakeTimers()
    const mark = vi.spyOn(performance, 'mark').mockImplementation(() => ({} as PerformanceMark))
    const measure = vi.spyOn(performance, 'measure').mockImplementation(() => ({} as PerformanceMeasure))
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(mark).toHaveBeenCalledWith('aquarium:app:init:start')
    expect(mark).toHaveBeenCalledWith('aquarium:loading-overlay:hidden')
    expect(measure).toHaveBeenCalledWith(
      'aquarium:app:init-to-overlay-hidden',
      'aquarium:app:init:start',
      'aquarium:loading-overlay:hidden'
    )

    app.dispose()
    mark.mockRestore()
    measure.mockRestore()
  })
})
