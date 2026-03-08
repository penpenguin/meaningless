import { createAppStore, type AppStore } from './app/store/createAppStore'
import { createAudioEffect } from './app/store/effects/audioEffect'
import { createPersistenceEffect } from './app/store/effects/persistenceEffect'
import { createToastEffect } from './app/store/effects/toastEffect'
import { createAppStateFromPersisted } from './app/state/defaultAppState'
import { AdvancedAquariumScene } from './components/AdvancedScene'
import { AudioManager } from './components/AudioManager'
import { createHudOverlay } from './components/HudOverlay'
import { hideLoadingOverlay, showBubbleLoadingAnimation } from './utils/loadingScreen'
import { loadProfileState, saveProfileState } from './utils/profileStorage'
import { loadSettingsState, saveSettingsState } from './utils/settingsStorage'
import { createSceneStateApplier } from './utils/sceneStateApplier'
import { getAutoSave } from './utils/storage'
import { loadTankState, saveTankState } from './utils/tankStorage'
import { showToast } from './components/Toast'
import type { SettingsState } from './types/settings'
import type { TankState } from './types/tank'

export class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private store: AppStore
  private overlay: HTMLDivElement | null = null
  private storeUnsubscribe: (() => void) | null = null
  private performanceMonitor: ReturnType<typeof setInterval> | null = null
  private motionMediaQuery: MediaQueryList
  private motionMediaHandler: ((event: MediaQueryListEvent) => void) | null = null
  private keyHandler: ((event: KeyboardEvent) => void) | null = null
  private lastAppliedQuality: SettingsState['quality'] | null = null
  private advancedEffectsEnabled = true
  private stats = {
    fps: 0,
    frameTime: 0,
    fishVisible: 0,
    drawCalls: 0
  }

  constructor() {
    const persistedTank = loadTankState()
    const persistedProfile = loadProfileState()
    const persistedSettings = loadSettingsState()
    const legacyAutoSave =
      !persistedTank || !persistedSettings
        ? getAutoSave()
        : null
    const legacyState = legacyAutoSave?.state
    const fallbackTank: TankState | null = legacyState
      ? {
          schemaVersion: 1,
          theme: legacyState.theme,
          fishGroups: legacyState.fishGroups
        }
      : null
    const fallbackSettings = legacyState
      ? {
          schemaVersion: 1,
          soundEnabled: legacyState.settings.soundEnabled,
          motionEnabled: legacyState.settings.motionEnabled,
          quality: 'high' as const
        }
      : null

    this.audioManager = new AudioManager()
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.store = createAppStore({
      initialState: createAppStateFromPersisted({
        tank: persistedTank ?? fallbackTank,
        profile: persistedProfile,
        settings: persistedSettings ?? fallbackSettings
      }),
      effects: [
        createPersistenceEffect({
          saveTank: saveTankState,
          saveProfile: saveProfileState,
          saveSettings: saveSettingsState
        }),
        createAudioEffect({
          playUnlockSound: () => this.audioManager.playBubbleSound()
        }),
        createToastEffect({
          showToast
        })
      ]
    })

    if (!persistedSettings && !fallbackSettings && this.motionMediaQuery.matches) {
      this.store.dispatch({
        type: 'SETTINGS/SET_MOTION',
        payload: { enabled: false }
      })
    }

    this.init()
  }

  private async init(): Promise<void> {
    this.showLoadingScreen()
    await this.loadAssets()

    const container = document.getElementById('canvas-container')
    if (!container) return

    this.scene = new AdvancedAquariumScene(container)
    this.setupHudOverlay()
    this.setupStoreBinding()
    this.setupEventListeners()
    this.startPerformanceMonitoring()
    this.scene.start()
    this.hideLoadingScreen()
  }

  private showLoadingScreen(): void {
    showBubbleLoadingAnimation()
  }

  private hideLoadingScreen(): void {
    hideLoadingOverlay()
  }

  private async loadAssets(): Promise<void> {
    await Promise.resolve()
  }

  private setupHudOverlay(): void {
    if (this.overlay) {
      this.overlay.remove()
    }
    this.overlay = createHudOverlay({ store: this.store })
    document.body.appendChild(this.overlay)
  }

  private applyQualitySettings(quality: SettingsState['quality']): void {
    if (!this.scene) return
    if (this.lastAppliedQuality === quality) return
    this.lastAppliedQuality = quality
    this.scene.setWaterQuality(quality)
  }

  private setupStoreBinding(): void {
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe()
      this.storeUnsubscribe = null
    }
    const scene = this.scene
    if (!scene) return
    const applySceneState = createSceneStateApplier({
      scene,
      audioManager: this.audioManager
    })

    this.storeUnsubscribe = this.store.subscribe(({ state }) => {
      applySceneState(state)
      this.applyQualitySettings(state.settings.quality)
      scene.setAdvancedEffects(this.advancedEffectsEnabled)
    })
  }

  private setupEventListeners(): void {
    this.motionMediaHandler = (event) => {
      if (!event.matches) return
      this.store.dispatch({
        type: 'SETTINGS/SET_MOTION',
        payload: { enabled: false }
      })
    }
    this.motionMediaQuery.addEventListener('change', this.motionMediaHandler)

    this.keyHandler = (event) => {
      if (event.key !== 'Escape') return
      this.store.dispatch({
        type: 'UI/SET_MODE',
        payload: { mode: 'view' }
      })
    }
    window.addEventListener('keydown', this.keyHandler)
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      if (!this.scene) return
      const stats = this.scene.getPerformanceStats()
      this.stats.fps = stats.fps
      this.stats.frameTime = Number(stats.frameTime.toFixed(1))
      this.stats.fishVisible = stats.fishVisible
      this.stats.drawCalls = stats.drawCalls

      if (stats.fps < 30 && stats.fps > 0) {
        this.autoOptimizePerformance()
      }
    }, 1000)
  }

  private autoOptimizePerformance(): void {
    if (!this.scene) return
    if (this.advancedEffectsEnabled) {
      this.advancedEffectsEnabled = false
      this.scene.setAdvancedEffects(false)
      return
    }

    const quality = this.store.getState().settings.quality
    if (quality === 'high') {
      this.store.dispatch({
        type: 'SETTINGS/SET_QUALITY',
        payload: { quality: 'medium' }
      })
      return
    }

    if (quality === 'medium') {
      this.store.dispatch({
        type: 'SETTINGS/SET_QUALITY',
        payload: { quality: 'low' }
      })
    }
  }

  dispose(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor)
      this.performanceMonitor = null
    }

    if (this.motionMediaHandler) {
      this.motionMediaQuery.removeEventListener('change', this.motionMediaHandler)
      this.motionMediaHandler = null
    }

    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler)
      this.keyHandler = null
    }

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe()
      this.storeUnsubscribe = null
    }

    this.store.destroy()

    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }

    if (this.scene) {
      this.scene.dispose()
      this.scene = null
    }

    this.audioManager.dispose()
  }
}
