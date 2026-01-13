export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isEnabled = false
  private underwaterLoopUrl: string
  private underwaterLoading: Promise<void> | null = null
  private underwaterSource: AudioBufferSourceNode | null = null
  
  constructor({ underwaterLoopUrl }: { underwaterLoopUrl?: string } = {}) {
    const baseUrl = import.meta.env?.BASE_URL ?? '/'
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this.underwaterLoopUrl = underwaterLoopUrl ?? `${normalizedBaseUrl}underwater-loop.wav`
    // AudioContext の生成は初回有効化まで遅延させる
    // Don't create water ambient automatically - wait for setEnabled(true)
  }
  
  private setupAudioContext(): boolean {
    if (this.audioContext && this.masterGain) return true
    
    try {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioContextConstructor()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime)
      return true
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
      this.audioContext = null
      this.masterGain = null
      return false
    }
  }
  
  private ensureUnderwaterLoop(): void {
    if (!this.audioContext || !this.masterGain || this.underwaterSource || this.underwaterLoading) return
    if (typeof window.fetch !== 'function') return

    const context = this.audioContext
    this.underwaterLoading = window.fetch(this.underwaterLoopUrl)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.underwaterLoading = null
        if (!this.audioContext || !this.masterGain || !this.isEnabled || this.underwaterSource) return

        const source = this.audioContext.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(this.masterGain)
        source.start(0)
        this.underwaterSource = source
      })
      .catch((error) => {
        console.warn('Failed to load underwater loop:', error)
        this.underwaterLoading = null
      })
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (enabled) {
      if (!this.setupAudioContext() || !this.audioContext || !this.masterGain) return
      this.ensureUnderwaterLoop()
      
      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      
      // Fade in
      this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime)
      this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(1.0, this.audioContext.currentTime + 1)
    } else {
      // Fade out
      if (this.audioContext && this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime)
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime)
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5)
      }
    }
  }
  
  public setVolume(volume: number): void {
    if (!this.audioContext || !this.masterGain) return

    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.masterGain.gain.setValueAtTime(clampedVolume * 1.0, this.audioContext.currentTime)
  }
  
  public playBubbleSound(): void {
    if (!this.audioContext || !this.isEnabled) return
    
    // Generate bubble pop sound
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1)
    
    oscillator.connect(gainNode)
    gainNode.connect(this.masterGain!)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }
  
  public playFishSwimSound(): void {
    if (!this.audioContext || !this.isEnabled) return
    
    // Subtle water displacement sound
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime)
    
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime)
    
    gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3)
    
    oscillator.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain!)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }
  
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
