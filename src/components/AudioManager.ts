export class AudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isEnabled = false
  private waterAmbientCreated = false
  
  constructor() {
    this.setupAudioContext()
    // Don't create water ambient automatically - wait for setEnabled(true)
  }
  
  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime)
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
    }
  }
  
  private createWaterAmbient(): void {
    // Create procedural water sound using Web Audio API
    if (!this.audioContext || !this.masterGain) return
    
    // Brown noise generator for water base
    const bufferSize = this.audioContext.sampleRate * 4
    const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate)
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel)
      let lastOut = 0
      
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        const brown = (lastOut + (0.02 * white)) / 1.02
        lastOut = brown
        channelData[i] = brown * 0.6
      }
    }
    
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    
    // Add filtering for more realistic water sound
    const lowPassFilter = this.audioContext.createBiquadFilter()
    lowPassFilter.type = 'lowpass'
    lowPassFilter.frequency.setValueAtTime(800, this.audioContext.currentTime)
    lowPassFilter.Q.setValueAtTime(1, this.audioContext.currentTime)
    
    const highPassFilter = this.audioContext.createBiquadFilter()
    highPassFilter.type = 'highpass'
    highPassFilter.frequency.setValueAtTime(100, this.audioContext.currentTime)
    
    // Add subtle reverb effect
    const convolver = this.audioContext.createConvolver()
    convolver.buffer = this.createReverbBuffer()
    
    const dryGain = this.audioContext.createGain()
    const wetGain = this.audioContext.createGain()
    
    dryGain.gain.setValueAtTime(0.9, this.audioContext.currentTime)
    wetGain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    
    // Connect the audio graph
    source.connect(lowPassFilter)
    lowPassFilter.connect(highPassFilter)
    
    // Dry signal
    highPassFilter.connect(dryGain)
    dryGain.connect(this.masterGain)
    
    // Wet signal (reverb)
    highPassFilter.connect(convolver)
    convolver.connect(wetGain)
    wetGain.connect(this.masterGain)
    
    // Start the audio source
    source.start(0)
  }
  
  private createReverbBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * 2 // 2 seconds of reverb
    const impulse = this.audioContext.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel)
      
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2)
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.2
      }
    }
    
    return impulse
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (!this.audioContext || !this.masterGain) return
    
    if (enabled) {
      // Create water ambient on first enable
      if (!this.waterAmbientCreated) {
        this.createWaterAmbient()
        this.waterAmbientCreated = true
      }
      
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
      this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioContext.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5)
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