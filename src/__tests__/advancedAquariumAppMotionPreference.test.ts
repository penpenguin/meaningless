import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

let lastSetMotionEnabled: ReturnType<typeof vi.fn> | null = null

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled: ReturnType<typeof vi.fn>
      setAdvancedEffects: ReturnType<typeof vi.fn>
      setWaterQuality: ReturnType<typeof vi.fn>
      applyTheme: ReturnType<typeof vi.fn>
      applyFishGroups: ReturnType<typeof vi.fn>
      start: ReturnType<typeof vi.fn>
      dispose: ReturnType<typeof vi.fn>
      getPerformanceStats: ReturnType<typeof vi.fn>

      constructor() {
        this.setMotionEnabled = vi.fn()
        this.setAdvancedEffects = vi.fn()
        this.setWaterQuality = vi.fn()
        this.applyTheme = vi.fn()
        this.applyFishGroups = vi.fn()
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
      dispose = vi.fn()
    }
  }
})

vi.mock('../components/EditorOverlay', () => {
  return {
    createEditorOverlay: () => document.createElement('div')
  }
})

vi.mock('../utils/autosave', () => {
  return {
    setupAutosaveOnEditEnd: () => () => {}
  }
})

vi.mock('lottie-web', () => {
  return {
    default: {
      loadAnimation: vi.fn()
    }
  }
})

vi.mock('tweakpane', () => {
  return {
    Pane: class {
      addFolder() {
        return {
          addBinding: () => ({
            on: vi.fn()
          })
        }
      }
      refresh() {}
      dispose() {}
    }
  }
})

describe('AdvancedAquariumApp reduced motion startup', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="tweakpane-container"></div>
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

  it('keeps motion disabled when prefers-reduced-motion matches', async () => {
    vi.useFakeTimers()
    const app = new AdvancedAquariumApp()

    await vi.advanceTimersByTimeAsync(1000)

    expect(lastSetMotionEnabled).not.toBeNull()
    const calls = lastSetMotionEnabled?.mock.calls ?? []
    expect(calls.some(([value]) => value === true)).toBe(false)
    expect(calls.some(([value]) => value === false)).toBe(true)

    app.dispose()
  })
})
