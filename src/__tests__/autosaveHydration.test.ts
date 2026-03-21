import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FishGroup } from '../types/aquarium'
import type { ProfileState } from '../types/profile'
import type { SettingsState } from '../types/settings'
import type { TankState } from '../types/tank'
import { AdvancedAquariumApp } from '../AdvancedAquariumApp'

let lastApplyFishGroups: ReturnType<typeof vi.fn> | null = null
let lastSetMotionEnabled: ReturnType<typeof vi.fn> | null = null
let lastSetAudioEnabled: ReturnType<typeof vi.fn> | null = null

let persistedTank: TankState | null = null
let persistedProfile: ProfileState | null = null
let persistedSettings: SettingsState | null = null
let legacyAutoSave: {
  updatedAt: string
  state: {
    schemaVersion: number
    theme: TankState['theme']
    fishGroups: FishGroup[]
    settings: {
      soundEnabled: boolean
      motionEnabled: boolean
    }
  }
} | null = null

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
      playBubbleSound = vi.fn()
      dispose = vi.fn()

      constructor() {
        lastSetAudioEnabled = this.setEnabled
      }
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
    loadTankState: () => persistedTank,
    saveTankState: vi.fn()
  }
})

vi.mock('../utils/profileStorage', () => {
  return {
    loadProfileState: () => persistedProfile,
    saveProfileState: vi.fn()
  }
})

vi.mock('../utils/settingsStorage', () => {
  return {
    loadSettingsState: () => persistedSettings,
    saveSettingsState: vi.fn()
  }
})

vi.mock('../utils/storage', () => {
  return {
    getAutoSave: () => legacyAutoSave
  }
})

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('storage hydration on startup', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="loading-screen"></div>
      <div id="lottie-bubbles"></div>
    `
    lastApplyFishGroups = null
    lastSetMotionEnabled = null
    lastSetAudioEnabled = null

    persistedTank = null
    persistedProfile = null
    persistedSettings = null
    legacyAutoSave = null

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

  it('hydrates from legacy autosave when split slices are missing', async () => {
    vi.useFakeTimers()
    legacyAutoSave = {
      updatedAt: new Date().toISOString(),
      state: {
        schemaVersion: 1,
        theme: {
          glassFrameStrength: 0.6,
          waterTint: '#0e3d4e',
          fogDensity: 0.4,
          particleDensity: 0.4,
          waveStrength: 0.7,
          waveSpeed: 0.8,
          layoutStyle: 'planted'
        },
        fishGroups: [{ speciesId: 'clownfish', count: 3 }],
        settings: {
          soundEnabled: true,
          motionEnabled: false
        }
      }
    }

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    expect(lastApplyFishGroups).not.toBeNull()
    const fishCalls = lastApplyFishGroups?.mock.calls ?? []
    expect(
      fishCalls.some(
        ([groups]) => Array.isArray(groups) && groups[0]?.speciesId === 'clownfish'
      )
    ).toBe(true)

    const motionCalls = lastSetMotionEnabled?.mock.calls ?? []
    const audioCalls = lastSetAudioEnabled?.mock.calls ?? []
    expect(motionCalls.some(([value]) => value === false)).toBe(true)
    expect(audioCalls.some(([value]) => value === true)).toBe(true)

    app.dispose()
  })

  it('prefers split storage over legacy autosave when both exist', async () => {
    vi.useFakeTimers()

    persistedTank = {
      schemaVersion: 1,
      theme: {
        glassFrameStrength: 0.6,
        waterTint: '#0e3d4e',
        fogDensity: 0.4,
        particleDensity: 0.4,
        waveStrength: 0.7,
        waveSpeed: 0.8,
        layoutStyle: 'planted'
      },
      fishGroups: [{ speciesId: 'angelfish', count: 2 }]
    }
    persistedSettings = {
      schemaVersion: 1,
      soundEnabled: false,
      motionEnabled: true,
      quality: 'standard'
    }
    legacyAutoSave = {
      updatedAt: new Date().toISOString(),
      state: {
        schemaVersion: 1,
        theme: persistedTank.theme,
        fishGroups: [{ speciesId: 'clownfish', count: 9 }],
        settings: {
          soundEnabled: true,
          motionEnabled: false
        }
      }
    }

    const app = new AdvancedAquariumApp()
    await flushMicrotasks()

    const fishCalls = lastApplyFishGroups?.mock.calls ?? []
    expect(
      fishCalls.some(
        ([groups]) => Array.isArray(groups) && groups[0]?.speciesId === 'angelfish'
      )
    ).toBe(true)
    expect(
      fishCalls.some(
        ([groups]) => Array.isArray(groups) && groups[0]?.speciesId === 'clownfish'
      )
    ).toBe(false)

    const motionCalls = lastSetMotionEnabled?.mock.calls ?? []
    const audioCalls = lastSetAudioEnabled?.mock.calls ?? []
    expect(motionCalls.some(([value]) => value === true)).toBe(true)
    expect(audioCalls.some(([value]) => value === false)).toBe(true)

    app.dispose()
  })
})
