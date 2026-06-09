export type RendererInfoLike = {
  render?: {
    calls?: number
    triangles?: number
  }
  memory?: {
    geometries?: number
    textures?: number
  }
}

export type RendererDebugStats = {
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
}

export type AssetLoadTimingStats = {
  totalMs: number
  texturesMs: number
  modelsMs: number
  environmentMs: number
}

export type SpanTimingStats = {
  count: number
  lastMs: number
  averageMs: number
}

export type PerformanceLike = {
  now?: () => number
  mark?: (name: string) => void
  measure?: (name: string, startMark: string, endMark: string) => void
  clearMarks?: (name?: string) => void
}

export type PerformanceStats = RendererDebugStats & {
  fps: number
  frameTime: number
  fishVisible: number
  assetLoadTotalMs: number
  assetLoadTexturesMs: number
  assetLoadModelsMs: number
  assetLoadEnvironmentMs: number
  fishUpdateCount: number
  fishUpdateLastMs: number
  fishUpdateAverageMs: number
  waterMotionUpdateCount: number
  waterMotionUpdateLastMs: number
  waterMotionUpdateAverageMs: number
  godRaysDepthRenderCount: number
  godRaysDepthRenderLastMs: number
  godRaysDepthRenderAverageMs: number
}

const toCounter = (value: unknown): number => {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0
}

export const readRendererDebugStats = (rendererInfo: RendererInfoLike | undefined): RendererDebugStats => ({
  drawCalls: toCounter(rendererInfo?.render?.calls),
  triangles: toCounter(rendererInfo?.render?.triangles),
  geometries: toCounter(rendererInfo?.memory?.geometries),
  textures: toCounter(rendererInfo?.memory?.textures)
})

export const createEmptyPerformanceStats = (): PerformanceStats => ({
  fps: 0,
  frameTime: 0,
  fishVisible: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  assetLoadTotalMs: 0,
  assetLoadTexturesMs: 0,
  assetLoadModelsMs: 0,
  assetLoadEnvironmentMs: 0,
  fishUpdateCount: 0,
  fishUpdateLastMs: 0,
  fishUpdateAverageMs: 0,
  waterMotionUpdateCount: 0,
  waterMotionUpdateLastMs: 0,
  waterMotionUpdateAverageMs: 0,
  godRaysDepthRenderCount: 0,
  godRaysDepthRenderLastMs: 0,
  godRaysDepthRenderAverageMs: 0
})

export const applyAssetLoadTimings = (
  stats: PerformanceStats,
  timings: AssetLoadTimingStats | undefined
): void => {
  stats.assetLoadTotalMs = toCounter(timings?.totalMs)
  stats.assetLoadTexturesMs = toCounter(timings?.texturesMs)
  stats.assetLoadModelsMs = toCounter(timings?.modelsMs)
  stats.assetLoadEnvironmentMs = toCounter(timings?.environmentMs)
}

export const createEmptySpanTimingStats = (): SpanTimingStats => ({
  count: 0,
  lastMs: 0,
  averageMs: 0
})

export const recordSpanTiming = (stats: SpanTimingStats, durationMs: number): void => {
  const safeDuration = typeof durationMs === 'number' && Number.isFinite(durationMs)
    ? Math.max(0, durationMs)
    : 0
  const nextCount = stats.count + 1
  stats.lastMs = safeDuration
  stats.averageMs = ((stats.averageMs * stats.count) + safeDuration) / nextCount
  stats.count = nextCount
}

const defaultPerformance = (): PerformanceLike | undefined => (
  typeof performance === 'undefined' ? undefined : performance
)

export const measurePerformanceSpan = <T>(
  stats: SpanTimingStats,
  options: {
    name: string
    startMark: string
    endMark: string
    performance?: PerformanceLike
  },
  run: () => T
): T => {
  const performanceLike = options.performance ?? defaultPerformance()
  const now = performanceLike?.now?.bind(performanceLike) ?? (() => 0)
  performanceLike?.mark?.(options.startMark)
  const start = now()

  try {
    return run()
  } finally {
    const duration = now() - start
    recordSpanTiming(stats, duration)
    performanceLike?.mark?.(options.endMark)
    performanceLike?.measure?.(options.name, options.startMark, options.endMark)
    performanceLike?.clearMarks?.(options.startMark)
    performanceLike?.clearMarks?.(options.endMark)
  }
}
