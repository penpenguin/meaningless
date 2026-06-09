export type PerformanceTuningOptions = {
  postProcessingEnabled: boolean
  screenSpaceHazeEnabled: boolean
  shadowMapSize: number | null
}

export type PerformanceTuningEnv = Record<string, string | undefined>

export const DEFAULT_PERFORMANCE_TUNING: PerformanceTuningOptions = {
  postProcessingEnabled: true,
  screenSpaceHazeEnabled: true,
  shadowMapSize: null
}

const parseBooleanSwitch = (value: string | null, fallback: boolean): boolean => {
  if (value === '0' || value === 'false') return false
  if (value === '1' || value === 'true') return true
  return fallback
}

const parseShadowMapSize = (value: string | null): number | null => {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  return parsed >= 512 && parsed <= 4096 ? parsed : null
}

export const resolvePerformanceTuningOptions = (search: string): PerformanceTuningOptions => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  return {
    postProcessingEnabled: parseBooleanSwitch(params.get('perfPost'), DEFAULT_PERFORMANCE_TUNING.postProcessingEnabled),
    screenSpaceHazeEnabled: parseBooleanSwitch(params.get('perfHaze'), DEFAULT_PERFORMANCE_TUNING.screenSpaceHazeEnabled),
    shadowMapSize: parseShadowMapSize(params.get('perfShadow'))
  }
}

export const appendPerformanceTuningQuery = (
  url: string,
  env: PerformanceTuningEnv
): string => {
  const measurementUrl = new URL(url)
  if (env.AQUARIUM_PERFORMANCE_POST_PROCESSING === '0') {
    measurementUrl.searchParams.set('perfPost', '0')
  }
  if (env.AQUARIUM_PERFORMANCE_HAZE === '0') {
    measurementUrl.searchParams.set('perfHaze', '0')
  }
  const shadowMapSize = parseShadowMapSize(env.AQUARIUM_PERFORMANCE_SHADOW_MAP_SIZE ?? null)
  if (shadowMapSize !== null) {
    measurementUrl.searchParams.set('perfShadow', String(shadowMapSize))
  }
  return measurementUrl.toString()
}
