import * as THREE from 'three'

interface BubbleSound {
  id: string
  position: THREE.Vector3
  panner: PannerNode
  source: AudioBufferSourceNode
  gain: GainNode
  startTime: number
  duration: number
}

export class SpatialAudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bubbleBuffer: AudioBuffer | null = null
  private activeBubbleSounds: Map<string, BubbleSound> = new Map()
  private enabled = true
  private volume = 0.3
  
  constructor() {
    this.initializeAudio()
  }

  private async initializeAudio(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = this.volume
      this.masterGain.connect(this.audioContext.destination)
      
      // Generate bubble sound buffer
      this.bubbleBuffer = await this.generateBubbleSound()
      
      // Handle audio context state
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', this.resumeAudioContext, { once: true })
        document.addEventListener('touchstart', this.resumeAudioContext, { once: true })
      }
    } catch (error) {
      console.warn('Spatial audio initialization failed:', error)
      this.enabled = false
    }
  }

  private resumeAudioContext = async (): Promise<void> => {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  private async generateBubbleSound(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const sampleRate = this.audioContext.sampleRate
    const duration = 0.3 // 300ms bubble sound
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)
    
    // Generate procedural bubble sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      
      // Bubble pop frequency profile (starts high, drops quickly)
      const frequency = 800 * Math.exp(-progress * 8) + 200 * Math.exp(-progress * 4)
      
      // Generate sine wave with frequency modulation
      let sample = Math.sin(2 * Math.PI * frequency * t)
      
      // Add slight noise for texture
      sample += (Math.random() - 0.5) * 0.1 * Math.exp(-progress * 5)
      
      // Apply envelope (quick attack, exponential decay)
      const envelope = Math.exp(-progress * 6) * (1 - Math.exp(-progress * 20))
      
      // Add slight reverb-like echo
      if (i > sampleRate * 0.05) {
        const echoIndex = Math.floor(i - sampleRate * 0.05)
        sample += data[echoIndex] * 0.2 * envelope
      }
      
      data[i] = sample * envelope * 0.3
    }
    
    return buffer
  }

  playBubbleSound(position: THREE.Vector3, size: number = 1.0, camera: THREE.Camera): string | null {
    if (!this.enabled || !this.audioContext || !this.masterGain || !this.bubbleBuffer) {
      return null
    }

    try {
      const bubbleId = `bubble_${Date.now()}_${Math.random()}`
      
      // Create audio nodes
      const source = this.audioContext.createBufferSource()
      const panner = this.audioContext.createPanner()
      const gain = this.audioContext.createGain()
      
      // Configure panner for 3D audio
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'exponential'
      panner.refDistance = 1
      panner.maxDistance = 15
      panner.rolloffFactor = 2
      panner.coneInnerAngle = 360
      panner.coneOuterAngle = 0
      panner.coneOuterGain = 0.3
      
      // Set spatial position
      this.updateSpatialPosition(panner, position, camera)
      
      // Configure source
      source.buffer = this.bubbleBuffer
      
      // Vary pitch based on bubble size
      const pitchVariation = 0.8 + (Math.random() * 0.4) // Random pitch variation
      const sizeFactor = Math.max(0.5, Math.min(2.0, 1 / size)) // Smaller bubbles = higher pitch
      source.playbackRate.value = pitchVariation * sizeFactor
      
      // Configure gain based on size and distance
      const distance = position.distanceTo(camera.position)
      const distanceAttenuation = Math.max(0.1, 1 / (1 + distance * 0.3))
      const sizeGain = Math.min(1.0, size * 0.5 + 0.2)
      gain.gain.value = sizeGain * distanceAttenuation * this.volume
      
      // Connect audio graph
      source.connect(gain)
      gain.connect(panner)
      panner.connect(this.masterGain)
      
      // Store bubble sound
      const bubbleSound: BubbleSound = {
        id: bubbleId,
        position: position.clone(),
        panner,
        source,
        gain,
        startTime: this.audioContext.currentTime,
        duration: this.bubbleBuffer.duration / source.playbackRate.value
      }
      
      this.activeBubbleSounds.set(bubbleId, bubbleSound)
      
      // Clean up when sound ends
      source.onended = () => {
        this.activeBubbleSounds.delete(bubbleId)
      }
      
      // Start playing
      source.start()
      
      return bubbleId
    } catch (error) {
      console.warn('Failed to play bubble sound:', error)
      return null
    }
  }

  private updateSpatialPosition(panner: PannerNode, position: THREE.Vector3, _camera: THREE.Camera): void {
    if (!this.audioContext) return
    
    // Convert world position to audio listener space
    const audioPosition = position.clone()
    
    // Set position
    if (panner.positionX) {
      panner.positionX.setValueAtTime(audioPosition.x, this.audioContext.currentTime)
      panner.positionY.setValueAtTime(audioPosition.y, this.audioContext.currentTime)
      panner.positionZ.setValueAtTime(audioPosition.z, this.audioContext.currentTime)
    } else {
      // Fallback for older browsers
      panner.setPosition(audioPosition.x, audioPosition.y, audioPosition.z)
    }
  }

  updateListenerPosition(camera: THREE.Camera): void {
    if (!this.audioContext || !this.audioContext.listener) return
    
    const position = camera.position
    const matrix = camera.matrixWorld
    
    // Extract forward and up vectors from camera matrix
    const forward = new THREE.Vector3(0, 0, -1).transformDirection(matrix)
    const up = new THREE.Vector3(0, 1, 0).transformDirection(matrix)
    
    try {
      if (this.audioContext.listener.positionX) {
        // Modern Web Audio API
        this.audioContext.listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime)
        this.audioContext.listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime)
        this.audioContext.listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime)
        
        this.audioContext.listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime)
        this.audioContext.listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime)
        this.audioContext.listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime)
        
        this.audioContext.listener.upX.setValueAtTime(up.x, this.audioContext.currentTime)
        this.audioContext.listener.upY.setValueAtTime(up.y, this.audioContext.currentTime)
        this.audioContext.listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime)
      } else {
        // Fallback for older browsers
        this.audioContext.listener.setPosition(position.x, position.y, position.z)
        this.audioContext.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z)
      }
    } catch (error) {
      console.warn('Failed to update audio listener position:', error)
    }
  }

  playBubbleTrail(positions: THREE.Vector3[], camera: THREE.Camera): void {
    // Play multiple bubble sounds for a trail effect
    positions.forEach((position, index) => {
      setTimeout(() => {
        const size = 0.5 + Math.random() * 0.5
        this.playBubbleSound(position, size, camera)
      }, index * 50) // Stagger the sounds
    })
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      // Stop all active bubble sounds
      this.activeBubbleSounds.forEach(bubble => {
        bubble.source.stop()
      })
      this.activeBubbleSounds.clear()
    }
  }

  dispose(): void {
    this.setEnabled(false)
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.masterGain = null
    this.bubbleBuffer = null
  }
}