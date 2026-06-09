import { chromium as defaultChromium } from 'playwright'
import { promises as defaultFs } from 'node:fs'

const defaultUrl = 'http://127.0.0.1:5173/meaningless/'
const defaultOutputPath = '/tmp/meaningless-aquarium-performance.json'
const defaultDurationMs = 30_000

/**
 * @typedef {{
 *   launch: (options: { headless: boolean }) => Promise<{
 *     newPage: (options: { viewport: { width: number, height: number } }) => Promise<any>,
 *     close: () => Promise<unknown> | unknown
 *   }>
 * }} PerformanceChromium
 *
 * @typedef {{
 *   writeFile: (path: string, data: string) => Promise<unknown> | unknown
 * }} PerformanceFs
 *
 * @typedef {{
 *   chromium?: PerformanceChromium,
 *   fs?: PerformanceFs,
 *   url?: string,
 *   outputPath?: string,
 *   durationMs?: number,
 *   width?: number,
 *   height?: number,
 *   headless?: boolean
 * }} MeasureAquariumPerformanceOptions
 */

/**
 * @param {unknown} value
 * @returns {number}
 */
const toFiniteNumber = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? value : 0
)

/**
 * @param {number} value
 * @returns {number}
 */
const roundOneDecimal = (value) => Math.round(value * 10) / 10

/**
 * @param {number[]} sortedValues
 * @param {number} percentileRank
 * @returns {number}
 */
const percentile = (sortedValues, percentileRank) => {
  if (sortedValues.length === 0) return 0
  const index = Math.max(0, Math.ceil(sortedValues.length * percentileRank) - 1)
  return sortedValues[Math.min(sortedValues.length - 1, index)]
}

/**
 * @param {string | undefined} value
 * @returns {number | null}
 */
const parseShadowMapSize = (value) => {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  return parsed >= 512 && parsed <= 4096 ? parsed : null
}

/**
 * @param {string} url
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export const resolveMeasurementUrl = (url, env = process.env) => {
  const measurementUrl = new URL(url)
  if (env.AQUARIUM_PERFORMANCE_POST_PROCESSING === '0') {
    measurementUrl.searchParams.set('perfPost', '0')
  }
  if (env.AQUARIUM_PERFORMANCE_HAZE === '0') {
    measurementUrl.searchParams.set('perfHaze', '0')
  }
  const shadowMapSize = parseShadowMapSize(env.AQUARIUM_PERFORMANCE_SHADOW_MAP_SIZE)
  if (shadowMapSize !== null) {
    measurementUrl.searchParams.set('perfShadow', String(shadowMapSize))
  }
  return measurementUrl.toString()
}

/**
 * @param {unknown[]} frameTimes
 * @returns {{
 *   sampleCount: number,
 *   averageMs: number,
 *   minMs: number,
 *   p50Ms: number,
 *   p95Ms: number,
 *   maxMs: number
 * }}
 */
export const summarizeFrameTimes = (frameTimes) => {
  const samples = frameTimes
    .map(toFiniteNumber)
    .filter((value) => value >= 0)
    .sort((a, b) => a - b)

  if (samples.length === 0) {
    return {
      sampleCount: 0,
      averageMs: 0,
      minMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0
    }
  }

  const total = samples.reduce((sum, value) => sum + value, 0)

  return {
    sampleCount: samples.length,
    averageMs: roundOneDecimal(total / samples.length),
    minMs: roundOneDecimal(samples[0]),
    p50Ms: roundOneDecimal(percentile(samples, 0.5)),
    p95Ms: roundOneDecimal(percentile(samples, 0.95)),
    maxMs: roundOneDecimal(samples[samples.length - 1])
  }
}

/**
 * @param {unknown} stats
 */
const normalizeAppStats = (stats) => {
  const source = stats && typeof stats === 'object'
    ? /** @type {Record<string, unknown>} */ (stats)
    : {}

  return {
    fps: toFiniteNumber(source.fps),
    frameTime: toFiniteNumber(source.frameTime),
    drawCalls: toFiniteNumber(source.drawCalls),
    triangles: toFiniteNumber(source.triangles),
    geometries: toFiniteNumber(source.geometries),
    textures: toFiniteNumber(source.textures),
    fishVisible: toFiniteNumber(source.fishVisible),
    assetLoadTotalMs: toFiniteNumber(source.assetLoadTotalMs),
    assetLoadTexturesMs: toFiniteNumber(source.assetLoadTexturesMs),
    assetLoadModelsMs: toFiniteNumber(source.assetLoadModelsMs),
    assetLoadEnvironmentMs: toFiniteNumber(source.assetLoadEnvironmentMs),
    fishUpdateCount: toFiniteNumber(source.fishUpdateCount),
    fishUpdateLastMs: toFiniteNumber(source.fishUpdateLastMs),
    fishUpdateAverageMs: toFiniteNumber(source.fishUpdateAverageMs),
    waterMotionUpdateCount: toFiniteNumber(source.waterMotionUpdateCount),
    waterMotionUpdateLastMs: toFiniteNumber(source.waterMotionUpdateLastMs),
    waterMotionUpdateAverageMs: toFiniteNumber(source.waterMotionUpdateAverageMs),
    godRaysDepthRenderCount: toFiniteNumber(source.godRaysDepthRenderCount),
    godRaysDepthRenderLastMs: toFiniteNumber(source.godRaysDepthRenderLastMs),
    godRaysDepthRenderAverageMs: toFiniteNumber(source.godRaysDepthRenderAverageMs)
  }
}

/**
 * @param {{ evaluate: (fn: (sampleDurationMs: number) => Promise<{ frameTimes: number[], appStats: unknown }>, durationMs: number) => Promise<{ frameTimes: number[], appStats: unknown }> }} page
 * @param {number} durationMs
 */
const collectFrameSamples = async (page, durationMs) => page.evaluate(async (sampleDurationMs) => {
  /** @type {number[]} */
  const frameTimes = []
  const sampleStart = performance.now()
  /** @type {number | null} */
  let previousFrameTime = null

  await new Promise(/** @param {(value: unknown) => void} resolve */ (resolve) => {
    /** @param {number} now */
    const tick = (now) => {
      if (previousFrameTime !== null) {
        frameTimes.push(now - previousFrameTime)
      }
      previousFrameTime = now

      if (now - sampleStart >= sampleDurationMs) {
        resolve(null)
        return
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })

  const debugWindow = /** @type {Window & { __aquariumPerformanceStats?: () => unknown }} */ (window)

  return {
    frameTimes,
    appStats: typeof debugWindow.__aquariumPerformanceStats === 'function'
      ? debugWindow.__aquariumPerformanceStats()
      : null
  }
}, durationMs)

/**
 * @param {MeasureAquariumPerformanceOptions} [options]
 */
export const measureAquariumPerformance = async ({
  chromium = defaultChromium,
  fs = defaultFs,
  url = resolveMeasurementUrl(defaultUrl),
  outputPath = defaultOutputPath,
  durationMs = defaultDurationMs,
  width = 1368,
  height = 768,
  headless = false
} = {}) => {
  const browser = await chromium.launch({ headless })

  try {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const sample = await collectFrameSamples(page, durationMs)
    const result = {
      url,
      durationMs,
      viewport: { width, height },
      headless,
      frameTime: summarizeFrameTimes(sample.frameTimes),
      appStats: normalizeAppStats(sample.appStats)
    }

    await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    return result
  } finally {
    await browser.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = process.argv[2] ?? process.env.AQUARIUM_PERFORMANCE_OUTPUT ?? defaultOutputPath
  const url = resolveMeasurementUrl(process.env.AQUARIUM_PERFORMANCE_URL ?? defaultUrl)
  const durationMs = Number(process.env.AQUARIUM_PERFORMANCE_DURATION_MS ?? defaultDurationMs)
  const headless = process.env.AQUARIUM_PERFORMANCE_HEADLESS === '1'

  measureAquariumPerformance({ outputPath, url, durationMs, headless })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2))
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
