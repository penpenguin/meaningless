import { createGameStore, type GameStore } from './game/createGameStore'
import { createHydratedGameAppState } from './game/gameSave'
import { createRenderStateApplier } from './game/createRenderStateApplier'
import { createAquariumRenderModel } from './game/renderModel'
import { loadGameSave, resolveBootGameSave, saveGameSave } from './game/storage'
import { AdvancedAquariumScene } from './components/AdvancedScene'
import { AudioManager } from './components/AudioManager'
import { createGameControlPane } from './components/GameControlPane'
import { hideLoadingOverlay, showBubbleLoadingAnimation } from './utils/loadingScreen'
import { loadProfileState } from './utils/profileStorage'
import { loadSettingsState } from './utils/settingsStorage'
import { getAutoSave } from './utils/storage'
import { loadTankState } from './utils/tankStorage'
import {
  createBootAquariumAssetManifest,
  createDeferredAquariumAssetManifest,
  loadVisualAssets,
  type VisualAssetBundle
} from './assets/visualAssets'
import { createEmptyPerformanceStats, type PerformanceStats } from './utils/performanceStats'
import { resolvePerformanceTuningOptions } from './utils/performanceTuning'
import type { GameAppState } from './game/types'

type ControlPaneHandle = ReturnType<typeof createGameControlPane>
type AquariumDebugWindow = Window & {
  __aquariumPerformanceStats?: () => PerformanceStats
}

export class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private store: GameStore
  private controlPane: ControlPaneHandle | null = null
  private storeUnsubscribe: (() => void) | null = null
  private motionMediaQuery: MediaQueryList
  private motionMediaHandler: ((event: MediaQueryListEvent) => void) | null = null
  private keyHandler: ((event: KeyboardEvent) => void) | null = null
  private visualAssets: VisualAssetBundle | null = null
  private applySceneState: ((state: GameAppState, options?: { forceFishGroups?: boolean }) => void) | null = null

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
    performance.mark('aquarium:app:init:start')
    this.showLoadingScreen()
    await this.loadAssets()

    const container = document.getElementById('canvas-container')
    if (!container) return

    const initialTheme = createAquariumRenderModel(this.store.getState()).theme
    this.scene = new AdvancedAquariumScene(
      container,
      this.visualAssets ?? undefined,
      initialTheme,
      resolvePerformanceTuningOptions(window.location.search)
    )
    this.setupControlPane()
    this.setupStoreBinding()
    this.setupEventListeners()
    this.scene.start()
    this.setupPerformanceDebugHook()
    this.hideLoadingScreen()
    performance.mark('aquarium:loading-overlay:hidden')
    performance.measure(
      'aquarium:app:init-to-overlay-hidden',
      'aquarium:app:init:start',
      'aquarium:loading-overlay:hidden'
    )
  }

  private showLoadingScreen(): void {
    showBubbleLoadingAnimation()
  }

  private hideLoadingScreen(): void {
    hideLoadingOverlay()
  }

  private async loadAssets(): Promise<void> {
    this.visualAssets = await loadVisualAssets(createBootAquariumAssetManifest())
    void this.loadDeferredAssets()
  }

  private async loadDeferredAssets(): Promise<void> {
    const deferredManifest = createDeferredAquariumAssetManifest()
    if (
      deferredManifest.textures.length === 0 &&
      deferredManifest.models.length === 0 &&
      deferredManifest.environment.length === 0
    ) {
      return
    }

    const deferredAssets = await loadVisualAssets(deferredManifest)
    if (!this.visualAssets) return

    this.visualAssets.manifest = {
      textures: [...this.visualAssets.manifest.textures, ...deferredAssets.manifest.textures],
      models: [...this.visualAssets.manifest.models, ...deferredAssets.manifest.models],
      environment: [...this.visualAssets.manifest.environment, ...deferredAssets.manifest.environment]
    }
    Object.assign(this.visualAssets.textures, deferredAssets.textures)
    Object.assign(this.visualAssets.models, deferredAssets.models)
    Object.assign(this.visualAssets.environment, deferredAssets.environment)
    this.applySceneState?.(this.store.getState(), { forceFishGroups: true })
  }

  private setupControlPane(): void {
    if (this.controlPane) {
      this.controlPane.dispose()
    }
    this.controlPane = createGameControlPane({
      store: this.store,
      getPerformanceStats: () => this.scene?.getPerformanceStats() ?? createEmptyPerformanceStats()
    })
    document.body.appendChild(this.controlPane.element)
  }

  private setupPerformanceDebugHook(): void {
    const debugWindow = window as AquariumDebugWindow
    debugWindow.__aquariumPerformanceStats = () => this.scene?.getPerformanceStats() ?? createEmptyPerformanceStats()
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
    this.applySceneState = applySceneState

    this.storeUnsubscribe = this.store.subscribe(({ state }) => {
      applySceneState(state)
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
    this.applySceneState = null

    this.store.destroy()

    if (this.controlPane) {
      this.controlPane.dispose()
      this.controlPane = null
    }

    if (this.scene) {
      this.scene.dispose()
      this.scene = null
    }

    delete (window as AquariumDebugWindow).__aquariumPerformanceStats
    this.audioManager.dispose()
  }
}
