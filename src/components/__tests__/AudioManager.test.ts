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
  static lastInstance: FakeAudioContext | null = null

  sampleRate = 8000
  currentTime = 0
  destination = {}
  state: 'running' | 'suspended' = 'running'
  lastBufferSource: FakeBufferSource | null = null

  constructor() {
    FakeAudioContext.instances++
    FakeAudioContext.lastInstance = this
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
    const source = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    }
    this.lastBufferSource = source
    return source
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

  decodeAudioData = vi.fn(async () => this.createBuffer(2, 1))

  resume = vi.fn(() => {
    this.state = 'running'
  })

  close = vi.fn()
}

describe('AudioManager', () => {
  let originalAudioContext: typeof AudioContext | undefined
  let originalWebkitAudioContext: typeof AudioContext | undefined
  let originalFetch: typeof fetch | undefined

  beforeEach(() => {
    FakeAudioContext.instances = 0
    const audioContext = FakeAudioContext as unknown as typeof AudioContext
    const windowWithAudio = window as typeof window & { webkitAudioContext?: typeof AudioContext }
    originalAudioContext = window.AudioContext
    originalWebkitAudioContext = windowWithAudio.webkitAudioContext

    window.AudioContext = audioContext
    windowWithAudio.webkitAudioContext = audioContext

    originalFetch = window.fetch
    window.fetch = vi.fn(async () => new Response(new ArrayBuffer(1))) as unknown as typeof fetch
  })

  afterEach(() => {
    const windowWithAudio = window as typeof window & { webkitAudioContext?: typeof AudioContext }
    if (originalAudioContext) {
      window.AudioContext = originalAudioContext
    } else {
      Reflect.deleteProperty(window, 'AudioContext')
    }

    if (originalWebkitAudioContext) {
      windowWithAudio.webkitAudioContext = originalWebkitAudioContext
    } else {
      Reflect.deleteProperty(window, 'webkitAudioContext')
    }

    if (originalFetch) {
      window.fetch = originalFetch
    } else {
      Reflect.deleteProperty(window, 'fetch')
    }
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

  it('loads and loops the underwater ambient on enable', async () => {
    const arrayBuffer = new ArrayBuffer(8)
    const response = new Response(arrayBuffer)
    const fetchMock = vi.fn(async () => response)
    window.fetch = fetchMock as unknown as typeof fetch

    const manager = new AudioManager({ underwaterLoopUrl: '/underwater-loop.wav' })
    manager.setEnabled(true)

    await new Promise((resolve) => setTimeout(resolve, 0))

    const audioContext = FakeAudioContext.lastInstance
    expect(fetchMock).toHaveBeenCalledWith('/underwater-loop.wav')
    expect(audioContext?.decodeAudioData).toHaveBeenCalled()
    expect(audioContext?.lastBufferSource?.loop).toBe(true)
    expect(audioContext?.lastBufferSource?.start).toHaveBeenCalled()
  })
})
