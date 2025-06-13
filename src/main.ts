import './styles.css'
import { AdvancedAquariumScene } from './components/AdvancedScene'
import { AudioManager } from './components/AudioManager'
import lottie from 'lottie-web'

class AdvancedAquariumApp {
  private scene: AdvancedAquariumScene | null = null
  private audioManager: AudioManager
  private motionToggle: HTMLInputElement
  private soundToggle: HTMLInputElement
  private effectsToggle: HTMLInputElement
  private qualitySelect: HTMLSelectElement
  private statsDisplay: HTMLElement
  private prefersReducedMotion: boolean
  private performanceMonitor: number | null = null  // Used in startPerformanceMonitoring()

  constructor() {
    this.audioManager = new AudioManager()
    this.motionToggle = document.getElementById('motion-toggle') as HTMLInputElement
    this.soundToggle = document.getElementById('sound-toggle') as HTMLInputElement
    this.effectsToggle = document.getElementById('effects-toggle') as HTMLInputElement
    this.qualitySelect = document.getElementById('quality-select') as HTMLSelectElement
    this.statsDisplay = document.getElementById('stats-display') as HTMLElement
    
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    this.init()
  }

  private async init(): Promise<void> {
    this.showLoadingScreen()
    
    await this.loadAssets()
    
    const container = document.getElementById('canvas-container')
    if (!container) return
    
    this.scene = new AdvancedAquariumScene(container)
    
    this.setupEventListeners()
    this.startPerformanceMonitoring()
    
    if (this.prefersReducedMotion) {
      this.motionToggle.checked = false
      this.scene.setMotionEnabled(false)
    }
    
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

  private setupEventListeners(): void {
    this.motionToggle?.addEventListener('change', () => {
      if (this.scene) {
        this.scene.setMotionEnabled(this.motionToggle.checked)
      }
    })
    
    this.soundToggle?.addEventListener('change', () => {
      this.audioManager.setEnabled(this.soundToggle.checked)
    })
    
    this.effectsToggle?.addEventListener('change', () => {
      if (this.scene) {
        this.scene.setAdvancedEffects(this.effectsToggle.checked)
      }
    })
    
    this.qualitySelect?.addEventListener('change', () => {
      if (this.scene) {
        const quality = this.qualitySelect.value as 'low' | 'medium' | 'high'
        this.scene.setWaterQuality(quality)
        
        // Auto-adjust other settings based on quality
        if (quality === 'low') {
          this.effectsToggle.checked = false
          this.scene.setAdvancedEffects(false)
        }
      }
    })
    
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        this.motionToggle.checked = false
        if (this.scene) {
          this.scene.setMotionEnabled(false)
        }
      }
    })
  }
  
  private startPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      if (this.scene && this.statsDisplay) {
        const stats = this.scene.getPerformanceStats()
        this.statsDisplay.innerHTML = `
          <div>FPS: ${stats.fps}</div>
          <div>Frame Time: ${stats.frameTime.toFixed(1)}ms</div>
          <div>Fish Visible: ${stats.fishVisible}</div>
          <div>Draw Calls: ${stats.drawCalls}</div>
        `
        
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
    if (this.effectsToggle.checked) {
      this.effectsToggle.checked = false
      this.scene.setAdvancedEffects(false)
      console.log('Auto-optimization: Disabled advanced effects')
      return
    }
    
    if (this.qualitySelect.value === 'high') {
      this.qualitySelect.value = 'medium'
      this.scene.setWaterQuality('medium')
      console.log('Auto-optimization: Reduced water quality to medium')
      return
    }
    
    if (this.qualitySelect.value === 'medium') {
      this.qualitySelect.value = 'low'
      this.scene.setWaterQuality('low')
      console.log('Auto-optimization: Reduced water quality to low')
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AdvancedAquariumApp()
})