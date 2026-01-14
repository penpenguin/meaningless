import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

let lastScene: {
  setMotionEnabled: ReturnType<typeof vi.fn>
} | null = null

vi.mock('../components/AdvancedScene', () => {
  return {
    AdvancedAquariumScene: class {
      setMotionEnabled = vi.fn()
      setAdvancedEffects = vi.fn()
      setWaterQuality = vi.fn()
      applyTheme = vi.fn()
      applyFishGroups = vi.fn()
      start = vi.fn()
      dispose = vi.fn()
      getPerformanceStats = vi.fn(() => ({
        fps: 60,
        frameTime: 16,
        fishVisible: 0,
        drawCalls: 0
      }))

      constructor() {
        lastScene = this
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
    lastScene = null
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })) as typeof window.matchMedia
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps motion disabled when prefers-reduced-motion matches', async () => {
    vi.useFakeTimers()
    const app = new AdvancedAquariumApp()

    await vi.advanceTimersByTimeAsync(1000)

    expect(lastScene).not.toBeNull()
    const calls = lastScene?.setMotionEnabled.mock.calls ?? []
    expect(calls.some(([value]) => value === true)).toBe(false)
    expect(calls.some(([value]) => value === false)).toBe(true)

    app.dispose()
  })
})
