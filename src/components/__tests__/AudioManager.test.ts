import { AudioManager } from '../AudioManager'

class FakeGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn()
  }

  connect = vi.fn()
}

type FakeBuffer = {
  numberOfChannels: number
  getChannelData: () => Float32Array
}

type FakeBufferSource = {
  buffer: FakeBuffer | null
  loop: boolean
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

type FakeBiquadFilter = {
  type: string
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> }
  Q: { setValueAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
}

type FakeConvolver = {
  buffer: FakeBuffer | null
  connect: ReturnType<typeof vi.fn>
}

class FakeAudioContext {
  static instances = 0

  sampleRate = 8000
  currentTime = 0
  destination = {}
  state: 'running' | 'suspended' = 'running'

  constructor() {
    FakeAudioContext.instances++
  }

  createGain(): FakeGainNode {
    return new FakeGainNode()
  }

  createBuffer(channels: number, length: number): FakeBuffer {
    return {
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length)
    }
  }

  createBufferSource(): FakeBufferSource {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    }
  }

  createBiquadFilter(): FakeBiquadFilter {
    return {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn()
    }
  }

  createConvolver(): FakeConvolver {
    return {
      buffer: null,
      connect: vi.fn()
    }
  }

  resume = vi.fn(() => {
    this.state = 'running'
  })

  close = vi.fn()
}

describe('AudioManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type GlobalWithAudio = typeof globalThis & { window: any; AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext }

  beforeEach(() => {
    FakeAudioContext.instances = 0
    const audioContext = FakeAudioContext as unknown as typeof AudioContext
    const globalWithAudio = globalThis as GlobalWithAudio
    globalWithAudio.window = { AudioContext: audioContext, webkitAudioContext: audioContext }
    globalWithAudio.AudioContext = audioContext
    globalWithAudio.webkitAudioContext = audioContext
  })

  afterEach(() => {
    const globalWithAudio = globalThis as Partial<GlobalWithAudio>
    Reflect.deleteProperty(globalWithAudio, 'window')
    Reflect.deleteProperty(globalWithAudio, 'AudioContext')
    Reflect.deleteProperty(globalWithAudio, 'webkitAudioContext')
  })

  it('does not create audio context until audio is enabled', () => {
    const manager = new AudioManager()

    expect(FakeAudioContext.instances).toBe(0)

    manager.setEnabled(true)

    expect(FakeAudioContext.instances).toBe(1)
  })

  it('reuses the same audio context across enable toggles', () => {
    const manager = new AudioManager()

    manager.setEnabled(true)
    manager.setEnabled(false)
    manager.setEnabled(true)

    expect(FakeAudioContext.instances).toBe(1)
  })
})
