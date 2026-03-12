import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

const hoisted = vi.hoisted(() => ({
  mockedAssets: {
    manifest: { textures: [], models: [] },
    textures: {},
    models: {}
  },
  loadVisualAssets: vi.fn(async () => ({
    manifest: { textures: [], models: [] },
    textures: {},
    models: {}
  })),
  lastSceneAssets: null as unknown
}))

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled = vi.fn()
      setPhotoMode = vi.fn()
      setAdvancedEffects = vi.fn()
      setWaterQuality = vi.fn()
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

      constructor(_container?: HTMLElement, assets?: unknown) {
        hoisted.lastSceneAssets = assets ?? null
      }
    }
  }
})

vi.mock('../assets/visualAssets', () => {
  return {
    aquariumAssetManifest: { textures: [], models: [] },
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

  it('renders game HUD overlay with coins indicator', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(document.querySelector('.hud-overlay')).not.toBeNull()
    expect(document.querySelector('.editor-overlay')).toBeNull()

    const pearlsLabel = document.querySelector('.hud-pearls')
    expect(pearlsLabel?.textContent).toContain('Coins:')
    expect(document.querySelector('[data-mode="tank"]')?.textContent).toBe('Tank')

    app.dispose()
  })

  it('forwards photo mode state to the scene', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)
    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    const settingsButton = document.querySelector('[data-mode="settings"]') as HTMLButtonElement
    settingsButton.click()

    const toggles = Array.from(document.querySelectorAll('.hud-toggle-button')) as HTMLButtonElement[]
    const photoModeButton = toggles[2]
    photoModeButton?.click()

    const scene = (app as unknown as { scene: { setPhotoMode: ReturnType<typeof vi.fn> } | null }).scene
    expect(scene?.setPhotoMode).toHaveBeenCalledWith(true)

    app.dispose()
  })

  it('passes preloaded visual assets into the scene constructor', async () => {
    vi.useFakeTimers()
    hoisted.loadVisualAssets.mockResolvedValue(hoisted.mockedAssets)

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(hoisted.loadVisualAssets).toHaveBeenCalledTimes(1)
    expect(hoisted.lastSceneAssets).toBe(hoisted.mockedAssets)

    app.dispose()
  })
})
