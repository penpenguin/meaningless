import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

let lastSetMotionEnabled: ReturnType<typeof vi.fn> | null = null

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled: ReturnType<typeof vi.fn>
      setPhotoMode: ReturnType<typeof vi.fn>
      setAdvancedEffects: ReturnType<typeof vi.fn>
      setWaterQuality: ReturnType<typeof vi.fn>
      applyTheme: ReturnType<typeof vi.fn>
      applyFishGroups: ReturnType<typeof vi.fn>
      start: ReturnType<typeof vi.fn>
      dispose: ReturnType<typeof vi.fn>
      getPerformanceStats: ReturnType<typeof vi.fn>

      constructor() {
        this.setMotionEnabled = vi.fn()
        this.setPhotoMode = vi.fn()
        this.setAdvancedEffects = vi.fn()
        this.setWaterQuality = vi.fn()
        this.applyTheme = vi.fn()
        this.applyFishGroups = vi.fn(() => true)
        this.start = vi.fn()
        this.dispose = vi.fn()
        this.getPerformanceStats = vi.fn(() => ({
          fps: 60,
          frameTime: 16,
          fishVisible: 0,
          drawCalls: 0
        }))
        lastSetMotionEnabled = this.setMotionEnabled
      }
    }
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

vi.mock('../components/GameHudOverlay', () => {
  return {
    createGameHudOverlay: () => {
      const overlay = document.createElement('div')
      overlay.className = 'hud-overlay'
      return {
        element: overlay,
        dispose: vi.fn()
      }
    }
  }
})

vi.mock('../assets/visualAssets', () => {
  return {
    aquariumAssetManifest: { textures: [], models: [] },
    loadVisualAssets: vi.fn(async () => ({
      manifest: { textures: [], models: [] },
      textures: {},
      models: {}
    }))
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

describe('AdvancedAquariumApp reduced motion startup', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="loading-screen"></div>
      <div id="lottie-bubbles"></div>
    `
    lastSetMotionEnabled = null
    const mediaQueryList = {
      matches: true,
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
  })

  it('keeps motion disabled when prefers-reduced-motion matches on first launch', async () => {
    vi.useFakeTimers()
    const app = new AdvancedAquariumApp()

    await flushMicrotasks()

    expect(lastSetMotionEnabled).not.toBeNull()
    const calls = lastSetMotionEnabled?.mock.calls ?? []
    expect(calls.some(([value]) => value === true)).toBe(false)
    expect(calls.some(([value]) => value === false)).toBe(true)

    app.dispose()
  })
})
