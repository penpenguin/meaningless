import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled = vi.fn()
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

vi.mock('lottie-web', () => {
  return {
    default: {
      loadAnimation: vi.fn()
    }
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
  })

  it('starts hiding the loading screen immediately after init completes', async () => {
    vi.useFakeTimers()
    const app = new AdvancedAquariumApp()

    const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement
    await flushMicrotasks()

    expect(loadingScreen.style.opacity).toBe('0')

    await vi.advanceTimersByTimeAsync(500)
    expect(loadingScreen.style.display).toBe('none')

    app.dispose()
  })

  it('renders HUD overlay with coins indicator', async () => {
    vi.useFakeTimers()
    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    const pearlsLabel = document.querySelector('.hud-pearls')
    expect(pearlsLabel?.textContent).toContain('Coins:')

    app.dispose()
  })
})
