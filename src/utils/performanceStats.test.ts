import { describe, expect, it } from 'vitest'
import {
  createEmptySpanTimingStats,
  measurePerformanceSpan,
  readRendererDebugStats
} from './performanceStats'

describe('readRendererDebugStats', () => {
  it('normalizes renderer render and memory counters', () => {
    expect(readRendererDebugStats({
      render: {
        calls: 12.8,
        triangles: 3456.9
      },
      memory: {
        geometries: 18.4,
        textures: 27.9
      }
    })).toEqual({
      drawCalls: 12,
      triangles: 3456,
      geometries: 18,
      textures: 27
    })
  })

  it('falls back to zero when renderer info is unavailable in tests', () => {
    expect(readRendererDebugStats(undefined)).toEqual({
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0
    })
  })
})

describe('measurePerformanceSpan', () => {
  it('records count, last duration, and running average while emitting performance measures', () => {
    const marks: string[] = []
    const measures: string[] = []
    const nowValues = [10, 16, 20, 30]
    const timing = createEmptySpanTimingStats()
    const performanceLike = {
      now: () => nowValues.shift() ?? 30,
      mark: (name: string) => marks.push(name),
      measure: (name: string, startMark: string, endMark: string) => {
        measures.push(`${name}:${startMark}:${endMark}`)
      },
      clearMarks: () => undefined
    }

    const result = measurePerformanceSpan(
      timing,
      {
        name: 'aquarium:test-span',
        startMark: 'aquarium:test-span:start',
        endMark: 'aquarium:test-span:end',
        performance: performanceLike
      },
      () => 'measured'
    )
    measurePerformanceSpan(
      timing,
      {
        name: 'aquarium:test-span',
        startMark: 'aquarium:test-span:start',
        endMark: 'aquarium:test-span:end',
        performance: performanceLike
      },
      () => undefined
    )

    expect(result).toBe('measured')
    expect(timing).toEqual({
      count: 2,
      lastMs: 10,
      averageMs: 8
    })
    expect(marks).toEqual([
      'aquarium:test-span:start',
      'aquarium:test-span:end',
      'aquarium:test-span:start',
      'aquarium:test-span:end'
    ])
    expect(measures).toEqual([
      'aquarium:test-span:aquarium:test-span:start:aquarium:test-span:end',
      'aquarium:test-span:aquarium:test-span:start:aquarium:test-span:end'
    ])
  })
})
