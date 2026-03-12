import { createGameStore, type GameStore } from './game/createGameStore'
import { createHydratedGameAppState } from './game/gameSave'
import { createRenderStateApplier } from './game/createRenderStateApplier'
import { loadGameSave, resolveBootGameSave, saveGameSave } from './game/storage'
import { AdvancedAquariumScene } from './components/AdvancedScene'
import { AudioManager } from './components/AudioManager'
import { createGameHudOverlay } from './components/GameHudOverlay'
import { hideLoadingOverlay, showBubbleLoadingAnimation } from './utils/loadingScreen'
import { loadProfileState } from './utils/profileStorage'
import { loadSettingsState } from './utils/settingsStorage'
import { getAutoSave } from './utils/storage'
import { loadTankState } from './utils/tankStorage'
import { loadVisualAssets, type VisualAssetBundle } from './assets/visualAssets'

export class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private store: GameStore
  private overlay: HTMLDivElement | null = null
  private storeUnsubscribe: (() => void) | null = null
  private performanceMonitor: ReturnType<typeof setInterval> | null = null
  private motionMediaQuery: MediaQueryList
  private motionMediaHandler: ((event: MediaQueryListEvent) => void) | null = null
  private keyHandler: ((event: KeyboardEvent) => void) | null = null
  private lastAppliedQuality: 'low' | 'medium' | 'high' | null = null
  private advancedEffectsEnabled = true
  private visualAssets: VisualAssetBundle | null = null
  private stats = {
    fps: 0,
    frameTime: 0,
    fishVisible: 0,
    drawCalls: 0
  }

  constructor() {
    const nowIso = new Date().toISOString()
    const persistedGameSave = loadGameSave(nowIso)
    const legacyTank = persistedGameSave ? null : loadTankState()
    const legacyProfile = persistedGameSave ? null : loadProfileState()
    const legacySettings = persistedGameSave ? null : loadSettingsState()
    const legacyAutoSave = persistedGameSave ? null : getAutoSave()

    this.audioManager = new AudioManager()
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.store = createGameStore({
      initialState: createHydratedGameAppState({
        save: resolveBootGameSave({
          nowIso,
          persistedGameSave,
          legacyTank,
          legacyProfile,
          legacySettings,
          legacyAutoSave
        }),
        nowIso
      }),
      onGameStateChange: saveGameSave
    })

    if (!persistedGameSave && !legacySettings && this.motionMediaQuery.matches) {
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

    this.scene = new AdvancedAquariumScene(container, this.visualAssets ?? undefined)
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
    this.visualAssets = await loadVisualAssets()
  }

  private setupHudOverlay(): void {
    if (this.overlay) {
      this.overlay.remove()
    }
    this.overlay = createGameHudOverlay({ store: this.store })
    document.body.appendChild(this.overlay)
  }

  private applyQualitySettings(quality: 'low' | 'medium' | 'high'): void {
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
    const applySceneState = createRenderStateApplier({
      scene,
      audioManager: this.audioManager
    })

    this.storeUnsubscribe = this.store.subscribe(({ state }) => {
      applySceneState(state)
      this.applyQualitySettings(state.game.profile.preferences.quality)
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
        payload: { mode: 'tank' }
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

    const quality = this.store.getState().game.profile.preferences.quality
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
