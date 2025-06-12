import './styles.css'
import { AquariumScene } from './components/Scene'
import lottie from 'lottie-web'

class AquariumApp {
  private scene: AquariumScene | null = null
  private audioElement: HTMLAudioElement
  private motionToggle: HTMLInputElement
  private soundToggle: HTMLInputElement
  private prefersReducedMotion: boolean

  constructor() {
    this.audioElement = document.getElementById('water-sound') as HTMLAudioElement
    this.motionToggle = document.getElementById('motion-toggle') as HTMLInputElement
    this.soundToggle = document.getElementById('sound-toggle') as HTMLInputElement
    
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    this.init()
  }

  private async init(): Promise<void> {
    this.showLoadingScreen()
    
    await this.loadAssets()
    
    const container = document.getElementById('canvas-container')
    if (!container) return
    
    this.scene = new AquariumScene(container)
    
    this.setupEventListeners()
    
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
    this.motionToggle.addEventListener('change', () => {
      if (this.scene) {
        this.scene.setMotionEnabled(this.motionToggle.checked)
      }
    })
    
    this.soundToggle.addEventListener('change', () => {
      if (this.soundToggle.checked) {
        this.audioElement.volume = 0.2
        this.audioElement.play().catch(err => {
          console.error('Audio play failed:', err)
          this.soundToggle.checked = false
        })
      } else {
        this.audioElement.pause()
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
}

document.addEventListener('DOMContentLoaded', () => {
  new AquariumApp()
})