import { describe, expect, it } from 'vitest'
import { appendPerformanceTuningQuery, resolvePerformanceTuningOptions } from './performanceTuning'

describe('resolvePerformanceTuningOptions', () => {
  it('parses measurement A/B switches from URL search params', () => {
    expect(resolvePerformanceTuningOptions('?perfPost=0&perfHaze=0&perfShadow=2048')).toEqual({
      postProcessingEnabled: false,
      screenSpaceHazeEnabled: false,
      shadowMapSize: 2048
    })
  })

  it('keeps defaults when unsupported values are provided', () => {
    expect(resolvePerformanceTuningOptions('?perfPost=1&perfHaze=1&perfShadow=huge')).toEqual({
      postProcessingEnabled: true,
      screenSpaceHazeEnabled: true,
      shadowMapSize: null
    })
  })
})

describe('appendPerformanceTuningQuery', () => {
  it('adds env-driven switches to the measurement URL without dropping existing params', () => {
    expect(appendPerformanceTuningQuery('http://127.0.0.1:5173/meaningless/?sample=1', {
      AQUARIUM_PERFORMANCE_POST_PROCESSING: '0',
      AQUARIUM_PERFORMANCE_HAZE: '0',
      AQUARIUM_PERFORMANCE_SHADOW_MAP_SIZE: '1024'
    })).toBe('http://127.0.0.1:5173/meaningless/?sample=1&perfPost=0&perfHaze=0&perfShadow=1024')
  })
})
