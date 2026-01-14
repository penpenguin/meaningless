import { Pane } from 'tweakpane'
import { AdvancedAquariumScene } from './components/AdvancedScene'
import { AudioManager } from './components/AudioManager'
import { createEditorOverlay } from './components/EditorOverlay'
import { createAquariumStore } from './utils/aquariumStore'
import { setupAutosaveOnEditEnd } from './utils/autosave'
import { createSceneStateApplier } from './utils/sceneStateApplier'
import { handleReducedMotionPreference } from './utils/motionPreference'
import { getAutoSave } from './utils/storage'
import lottie from 'lottie-web'

type QualityLevel = 'low' | 'medium' | 'high'

type TweakpaneChangeEvent<T> = {
  value: T
}

type TweakpaneBinding<T> = {
  on: (eventName: 'change', handler: (event: TweakpaneChangeEvent<T>) => void) => void
}

type TweakpaneFolder = {
  addBinding: <T extends object, K extends keyof T>(
    target: T,
    key: K,
    params?: {
      label?: string
      options?: Record<string, T[K]>
      readonly?: boolean
    }
  ) => TweakpaneBinding<T[K]>
}

type PaneApi = Pane & {
  addFolder: (params: { title: string; expanded?: boolean }) => TweakpaneFolder
  refresh: () => void
}

export class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private pane: PaneApi | null = null
  private overlay: HTMLDivElement | null = null
  private store = createAquariumStore(getAutoSave()?.state)
  private storeUnsubscribe: (() => void) | null = null
  private autosaveUnsubscribe: (() => void) | null = null
  private settings: {
    motion: boolean
    sound: boolean
    effects: boolean
    quality: QualityLevel
  }
  private stats: {
    fps: number
    frameTime: number
    fishVisible: number
    drawCalls: number
  }
  private performanceMonitor: ReturnType<typeof setInterval> | null = null
  private motionMediaQuery: MediaQueryList
  private motionMediaHandler: ((event: MediaQueryListEvent) => void) | null = null
  private keyHandler: ((event: KeyboardEvent) => void) | null = null

  constructor() {
    this.audioManager = new AudioManager()
    this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.settings = {
      motion: !this.motionMediaQuery.matches,
      sound: false,
      effects: true,
      quality: 'high'
    }
    this.stats = {
      fps: 0,
      frameTime: 0,
      fishVisible: 0,
      drawCalls: 0
    }

    this.store.updateSettings({
      motionEnabled: this.settings.motion,
      soundEnabled: this.settings.sound
    })

    this.init()
  }

  private async init(): Promise<void> {
    this.showLoadingScreen()

    await this.loadAssets()

    const container = document.getElementById('canvas-container')
    if (!container) return

    this.scene = new AdvancedAquariumScene(container)

    this.setupEditorOverlay()
    this.setupPane()
    this.setupEventListeners()
    this.applySettings()
    this.startPerformanceMonitoring()

    this.scene.start()

    setTimeout(() => {
      this.hideLoadingScreen()
    }, 2000)
  }

  private showLoadingScreen(): void {
    const lottieContainer = document.getElementById('lottie-bubbles')
    if (!lottieContainer) return

    const bubbleAnimation = {
      container: lottieContainer,
      renderer: 'svg' as const,
      loop: true,
      autoplay: true,
      animationData: {
        v: "5.5.7",
        fr: 30,
        ip: 0,
        op: 60,
        w: 200,
        h: 200,
        nm: "Bubbles",
        ddd: 0,
        assets: [],
        layers: [{
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Bubble 1",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: {
              a: 1,
              k: [{
                i: { x: 0.5, y: 1 },
                o: { x: 0.5, y: 0 },
                t: 0,
                s: [100, 180, 0],
                to: [0, -30, 0],
                ti: [0, 30, 0]
              }, {
                t: 60,
                s: [100, 20, 0]
              }]
            },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
          },
          ao: 0,
          shapes: [{
            ty: "gr",
            it: [{
              ind: 0,
              ty: "el",
              s: { a: 0, k: [20, 20] },
              p: { a: 0, k: [0, 0] }
            }, {
              ty: "st",
              c: { a: 0, k: [0.42, 0.78, 0.84, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 }
            }, {
              ty: "fl",
              c: { a: 0, k: [0.42, 0.78, 0.84, 0.3] },
              o: { a: 0, k: 30 }
            }, {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }]
          }],
          ip: 0,
          op: 60,
          st: 0
        }]
      }
    }

    lottie.loadAnimation(bubbleAnimation)
  }

  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.style.transition = 'opacity 0.5s'
      loadingScreen.style.opacity = '0'
      setTimeout(() => {
        loadingScreen.style.display = 'none'
      }, 500)
    }
  }

  private async loadAssets(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  private applySettings(): void {
    if (!this.scene) return
    this.scene.setMotionEnabled(this.settings.motion)
    this.audioManager.setEnabled(this.settings.sound)
    this.scene.setAdvancedEffects(this.settings.effects)
    this.scene.setWaterQuality(this.settings.quality)
    this.store.updateSettings({
      motionEnabled: this.settings.motion,
      soundEnabled: this.settings.sound
    })
  }

  private setupPane(): void {
    const container = document.getElementById('tweakpane-container')
    this.pane = new Pane({ container: container ?? undefined }) as PaneApi
    const pane = this.pane

    const settingsFolder = pane.addFolder({ title: 'Settings' })
    settingsFolder.addBinding(this.settings, 'motion', { label: 'Motion' }).on('change', (event: TweakpaneChangeEvent<boolean>) => {
      if (this.scene) {
        this.scene.setMotionEnabled(event.value)
      }
      this.store.updateSettings({ motionEnabled: event.value })
    })
    settingsFolder.addBinding(this.settings, 'sound', { label: 'Sound' }).on('change', (event: TweakpaneChangeEvent<boolean>) => {
      this.audioManager.setEnabled(event.value)
      this.store.updateSettings({ soundEnabled: event.value })
    })
    settingsFolder.addBinding(this.settings, 'effects', { label: 'Effects' }).on('change', (event: TweakpaneChangeEvent<boolean>) => {
      if (this.scene) {
        this.scene.setAdvancedEffects(event.value)
      }
    })
    settingsFolder.addBinding(this.settings, 'quality', {
      label: 'Quality',
      options: { Low: 'low', Medium: 'medium', High: 'high' }
    }).on('change', (event: TweakpaneChangeEvent<QualityLevel>) => {
      if (this.scene) {
        this.scene.setWaterQuality(event.value)
      }

      if (event.value === 'low') {
        this.settings.effects = false
        if (this.scene) {
          this.scene.setAdvancedEffects(false)
        }
        this.pane?.refresh()
      }
    })

    const statsFolder = pane.addFolder({ title: 'Stats', expanded: false })
    statsFolder.addBinding(this.stats, 'fps', { label: 'FPS', readonly: true })
    statsFolder.addBinding(this.stats, 'frameTime', { label: 'Frame Time', readonly: true })
    statsFolder.addBinding(this.stats, 'fishVisible', { label: 'Fish Visible', readonly: true })
    statsFolder.addBinding(this.stats, 'drawCalls', { label: 'Draw Calls', readonly: true })
  }

  private setupEditorOverlay(): void {
    if (this.overlay) {
      this.overlay.remove()
    }

    this.overlay = createEditorOverlay({ store: this.store })
    document.body.appendChild(this.overlay)

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe()
    }
    const scene = this.scene
    if (!scene) return
    const applySceneState = createSceneStateApplier({
      scene,
      audioManager: this.audioManager,
      settings: this.settings
    })
    this.storeUnsubscribe = this.store.subscribe(({ state }) => {
      applySceneState(state)
      this.pane?.refresh()
    })

    if (this.autosaveUnsubscribe) {
      this.autosaveUnsubscribe()
    }
    this.autosaveUnsubscribe = setupAutosaveOnEditEnd(this.store)
  }

  private setupEventListeners(): void {
    this.motionMediaHandler = (event) => {
      handleReducedMotionPreference(this.store, event)
    }

    this.motionMediaQuery.addEventListener('change', this.motionMediaHandler)

    this.keyHandler = (event) => {
      if (event.key === 'Escape') {
        this.store.setMode('view')
      }
    }
    window.addEventListener('keydown', this.keyHandler)
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      if (this.scene) {
        const stats = this.scene.getPerformanceStats()
        this.stats.fps = stats.fps
        this.stats.frameTime = Number(stats.frameTime.toFixed(1))
        this.stats.fishVisible = stats.fishVisible
        this.stats.drawCalls = stats.drawCalls
        this.pane?.refresh()

        // Auto-optimize performance if needed
        if (stats.fps < 30 && stats.fps > 0) {
          this.autoOptimizePerformance()
        }
      }
    }, 1000)
  }

  private autoOptimizePerformance(): void {
    if (!this.scene) return

    // Gradually reduce quality settings
    if (this.settings.effects) {
      this.settings.effects = false
      this.scene.setAdvancedEffects(false)
      this.pane?.refresh()
      console.log('Auto-optimization: Disabled advanced effects')
      return
    }

    if (this.settings.quality === 'high') {
      this.settings.quality = 'medium'
      this.scene.setWaterQuality('medium')
      this.pane?.refresh()
      console.log('Auto-optimization: Reduced water quality to medium')
      return
    }

    if (this.settings.quality === 'medium') {
      this.settings.quality = 'low'
      this.scene.setWaterQuality('low')
      this.pane?.refresh()
      console.log('Auto-optimization: Reduced water quality to low')
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

    if (this.pane) {
      this.pane.dispose()
      this.pane = null
    }

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe()
      this.storeUnsubscribe = null
    }

    if (this.autosaveUnsubscribe) {
      this.autosaveUnsubscribe()
      this.autosaveUnsubscribe = null
    }

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
