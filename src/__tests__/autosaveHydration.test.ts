import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FishGroup } from '../types/aquarium'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'
import { createState } from './fixtures/aquariumState'

let lastApplyFishGroups: ReturnType<typeof vi.fn> | null = null
let lastSetMotionEnabled: ReturnType<typeof vi.fn> | null = null
let lastSetAudioEnabled: ReturnType<typeof vi.fn> | null = null

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
        lastApplyFishGroups = this.applyFishGroups
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

      constructor() {
        lastSetAudioEnabled = this.setEnabled
      }
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

describe('autosave hydration on startup', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="tweakpane-container"></div>
      <div id="loading-screen"></div>
      <div id="lottie-bubbles"></div>
    `
    localStorage.clear()
    lastApplyFishGroups = null
    lastSetMotionEnabled = null
    lastSetAudioEnabled = null
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

  it('applies autosaved fish groups when available', async () => {
    vi.useFakeTimers()
    const fishGroups: FishGroup[] = [{ speciesId: 'test-fish', count: 3 }]
    const state = createState({ fishGroups })
    localStorage.setItem(
      'aquarium:autosave',
      JSON.stringify({ updatedAt: new Date().toISOString(), state })
    )

    const app = new AdvancedAquariumApp()

    await vi.advanceTimersByTimeAsync(1000)

    expect(lastApplyFishGroups).not.toBeNull()
    const calls = lastApplyFishGroups?.mock.calls ?? []
    const hasAutosaveGroups = calls.some(
      ([groups]) => Array.isArray(groups) && groups.length === 1 && groups[0].speciesId === 'test-fish'
    )
    expect(hasAutosaveGroups).toBe(true)

    app.dispose()
  })

  it('preserves autosaved settings over defaults', async () => {
    vi.useFakeTimers()
    const state = createState({
      settings: {
        soundEnabled: true,
        motionEnabled: false
      }
    })
    localStorage.setItem(
      'aquarium:autosave',
      JSON.stringify({ updatedAt: new Date().toISOString(), state })
    )

    const app = new AdvancedAquariumApp()

    await vi.advanceTimersByTimeAsync(1000)

    expect(lastSetMotionEnabled).not.toBeNull()
    expect(lastSetAudioEnabled).not.toBeNull()
    const motionCalls = lastSetMotionEnabled?.mock.calls ?? []
    const audioCalls = lastSetAudioEnabled?.mock.calls ?? []
    expect(motionCalls.some(([value]) => value === false)).toBe(true)
    expect(audioCalls.some(([value]) => value === true)).toBe(true)

    app.dispose()
  })
})
