import { describe, expect, it, vi } from 'vitest'
import {
  resolveMeasurementUrl,
  measureAquariumPerformance,
  summarizeFrameTimes
} from '../../scripts/measure-aquarium-performance.mjs'

describe('summarizeFrameTimes', () => {
  it('returns p50 and p95 frame timing summaries in a stable shape', () => {
    expect(summarizeFrameTimes([20, 10, 40, 30])).toEqual({
      sampleCount: 4,
      averageMs: 25,
      minMs: 10,
      p50Ms: 20,
      p95Ms: 40,
      maxMs: 40
    })
  })

  it('uses zero fallback values when no frame samples are captured', () => {
    expect(summarizeFrameTimes([])).toEqual({
      sampleCount: 0,
      averageMs: 0,
      minMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0
    })
  })
})

describe('measureAquariumPerformance', () => {
  it('resolves env-driven A/B switch query params for comparable measurements', () => {
    expect(resolveMeasurementUrl('http://127.0.0.1:5173/meaningless/', {
      AQUARIUM_PERFORMANCE_POST_PROCESSING: '0',
      AQUARIUM_PERFORMANCE_HAZE: '0',
      AQUARIUM_PERFORMANCE_SHADOW_MAP_SIZE: '2048'
    })).toBe('http://127.0.0.1:5173/meaningless/?perfPost=0&perfHaze=0&perfShadow=2048')
  })

  it('captures browser frame samples and app debug stats into one comparable JSON object', async () => {
    const writeFile = vi.fn()
    const page = {
      goto: vi.fn(),
      waitForTimeout: vi.fn(),
      evaluate: vi.fn(async () => ({
        frameTimes: [12, 18, 24, 48],
        appStats: {
          drawCalls: 151,
          triangles: 123_456,
          textures: 41,
          geometries: 80,
          assetLoadTotalMs: 210,
          fishUpdateAverageMs: 2.8,
          waterMotionUpdateAverageMs: 1.8,
          godRaysDepthRenderAverageMs: 4.6
        }
      }))
    }
    const browser = {
      newPage: vi.fn(async () => page),
      close: vi.fn()
    }
    const chromium = {
      launch: vi.fn(async () => browser)
    }

    const result = await measureAquariumPerformance({
      chromium,
      fs: { writeFile },
      url: 'http://127.0.0.1:5175/meaningless/',
      durationMs: 30_000,
      outputPath: '/tmp/perf.json'
    })

    expect(chromium.launch).toHaveBeenCalledWith({ headless: false })
    expect(page.goto).toHaveBeenCalledWith(
      'http://127.0.0.1:5175/meaningless/',
      { waitUntil: 'domcontentloaded' }
    )
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), 30_000)
    expect(result.frameTime.p50Ms).toBe(18)
    expect(result.frameTime.p95Ms).toBe(48)
    expect(result.appStats.drawCalls).toBe(151)
    expect(result.appStats.fishUpdateAverageMs).toBe(2.8)
    expect(result.appStats.waterMotionUpdateAverageMs).toBe(1.8)
    expect(result.appStats.godRaysDepthRenderAverageMs).toBe(4.6)
    expect(writeFile).toHaveBeenCalledWith('/tmp/perf.json', `${JSON.stringify(result, null, 2)}\n`)
    expect(browser.close).toHaveBeenCalled()
  })
})
