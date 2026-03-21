import { createGameStore, type GameStore } from './game/createGameStore'
import { createHydratedGameAppState } from './game/gameSave'
import { createRenderStateApplier } from './game/createRenderStateApplier'
import { createAquariumRenderModel } from './game/renderModel'
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
import type { QualityLevel } from './types/settings'

type HudOverlayHandle = ReturnType<typeof createGameHudOverlay>

export class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private store: GameStore
  private overlay: HudOverlayHandle | null = null
  private storeUnsubscribe: (() => void) | null = null
  private motionMediaQuery: MediaQueryList
  private motionMediaHandler: ((event: MediaQueryListEvent) => void) | null = null
  private keyHandler: ((event: KeyboardEvent) => void) | null = null
  private lastAppliedQuality: QualityLevel | null = null
  private visualAssets: VisualAssetBundle | null = null

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

    const initialTheme = createAquariumRenderModel(this.store.getState()).theme
    this.scene = new AdvancedAquariumScene(
      container,
      this.visualAssets ?? undefined,
      this.store.getState().game.profile.preferences.quality,
      initialTheme
    )
    this.setupHudOverlay()
    this.setupStoreBinding()
    this.setupEventListeners()
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
      this.overlay.dispose()
    }
    this.overlay = createGameHudOverlay({ store: this.store })
    document.body.appendChild(this.overlay.element)
  }

  private applyQualitySettings(quality: QualityLevel): void {
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

  dispose(): void {
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
      this.overlay.dispose()
      this.overlay = null
    }

    if (this.scene) {
      this.scene.dispose()
      this.scene = null
    }

    this.audioManager.dispose()
  }
}
