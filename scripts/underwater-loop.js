const MAX_INT16 = 0x7fff

const clampSample = (value) => Math.max(-1, Math.min(1, value))

const createRng = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export const generateUnderwaterLoop = ({ sampleRate, durationSeconds, seed = 1 }) => {
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSeconds))
  const left = new Float32Array(totalSamples)
  const right = new Float32Array(totalSamples)

  const rng = createRng(seed)
  let lowLeft = 0
  let lowRight = 0
  let phase = 0
  const phaseStep = (Math.PI * 2 * 0.18) / sampleRate

  for (let i = 0; i < totalSamples; i++) {
    const whiteLeft = rng() * 2 - 1
    const whiteRight = rng() * 2 - 1

    lowLeft += (whiteLeft - lowLeft) * 0.02
    lowRight += (whiteRight - lowRight) * 0.02

    const drift = Math.sin(phase) * 0.08
    const driftRight = Math.sin(phase + 1.1) * 0.08
    phase += phaseStep

    const sampleLeft = (lowLeft * 0.35) + drift
    const sampleRight = (lowRight * 0.35) + driftRight

    left[i] = clampSample(sampleLeft)
    right[i] = clampSample(sampleRight)
  }

  return { left, right }
}

export const encodeWav = ({ left, right, sampleRate }) => {
  if (left.length !== right.length) {
    throw new Error('Left/right channel lengths must match')
  }

  const numChannels = 2
  const bytesPerSample = 2
  const dataSize = left.length * numChannels * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0, 4, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 4, 'ascii')
  buffer.write('fmt ', 12, 4, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28)
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 4, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)

  let offset = 44
  for (let i = 0; i < left.length; i++) {
    const clampedLeft = clampSample(left[i])
    const clampedRight = clampSample(right[i])
    const leftInt = clampedLeft < 0 ? Math.round(clampedLeft * 0x8000) : Math.round(clampedLeft * MAX_INT16)
    const rightInt = clampedRight < 0 ? Math.round(clampedRight * 0x8000) : Math.round(clampedRight * MAX_INT16)
    buffer.writeInt16LE(leftInt, offset)
    buffer.writeInt16LE(rightInt, offset + 2)
    offset += 4
  }

  return buffer
}
