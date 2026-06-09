import { describe, expect, it } from 'vitest'
import { resolveAdaptiveRenderScale } from './renderScale'

describe('resolveAdaptiveRenderScale', () => {
  it('drops one tier when sustained frame time is above budget', () => {
    expect(resolveAdaptiveRenderScale({
      currentScale: 1,
      averageFrameTimeMs: 36,
      stressedSampleCount: 3,
      stableSampleCount: 0
    })).toBe(0.85)
  })

  it('steps back up after sustained stable frame times', () => {
    expect(resolveAdaptiveRenderScale({
      currentScale: 0.85,
      averageFrameTimeMs: 17,
      stressedSampleCount: 0,
      stableSampleCount: 6
    })).toBe(1)
  })

  it('does not drop below the minimum scale', () => {
    expect(resolveAdaptiveRenderScale({
      currentScale: 0.7,
      averageFrameTimeMs: 42,
      stressedSampleCount: 4,
      stableSampleCount: 0
    })).toBe(0.7)
  })
})
