import { describe, expect, it } from 'vitest'
import { encodeWav, generateUnderwaterLoop } from '../../scripts/underwater-loop.js'

describe('generateUnderwaterLoop', () => {
  it('produces deterministic stereo buffers with expected length and bounds', () => {
    const sampleRate = 8000
    const durationSeconds = 2
    const seed = 12345

    const first = generateUnderwaterLoop({ sampleRate, durationSeconds, seed })
    const second = generateUnderwaterLoop({ sampleRate, durationSeconds, seed })

    expect(first.left.length).toBe(sampleRate * durationSeconds)
    expect(first.right.length).toBe(sampleRate * durationSeconds)

    for (let i = 0; i < 256; i++) {
      expect(first.left[i]).toBe(second.left[i])
      expect(first.right[i]).toBe(second.right[i])
    }

    let maxAbs = 0
    for (let i = 0; i < first.left.length; i++) {
      const leftValue = Math.abs(first.left[i])
      const rightValue = Math.abs(first.right[i])
      if (leftValue > maxAbs) maxAbs = leftValue
      if (rightValue > maxAbs) maxAbs = rightValue
    }

    expect(maxAbs).toBeLessThanOrEqual(1)
  })
})

describe('encodeWav', () => {
  it('encodes a 16-bit stereo WAV with correct header and length', () => {
    const sampleRate = 44100
    const left = new Float32Array([0, -1, 1, 0.5])
    const right = new Float32Array([0, 1, -1, -0.5])

    const wav = encodeWav({ left, right, sampleRate })

    expect(wav.slice(0, 4).toString('ascii')).toBe('RIFF')
    expect(wav.slice(8, 12).toString('ascii')).toBe('WAVE')
    expect(wav.slice(12, 16).toString('ascii')).toBe('fmt ')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(2)
    expect(wav.readUInt32LE(24)).toBe(sampleRate)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.slice(36, 40).toString('ascii')).toBe('data')

    const expectedDataBytes = left.length * 2 * 2
    expect(wav.readUInt32LE(40)).toBe(expectedDataBytes)
    expect(wav.length).toBe(44 + expectedDataBytes)
  })
})
