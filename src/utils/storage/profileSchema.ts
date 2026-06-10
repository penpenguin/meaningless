import type { ProfileState } from '../../types/profile'

export const CURRENT_PROFILE_SCHEMA_VERSION = 1

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const createDefaultProfileState = (): ProfileState => ({
  schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
  stats: {
    totalViewSeconds: 0
  }
})

export const migrateProfileState = (value: unknown): ProfileState => {
  if (!isObject(value)) return createDefaultProfileState()
  const defaults = createDefaultProfileState()

  const schemaVersion = isNumber(value.schemaVersion) ? value.schemaVersion : 0
  if (schemaVersion > CURRENT_PROFILE_SCHEMA_VERSION) return defaults

  const totalViewSeconds = isObject(value.stats) && isNumber(value.stats.totalViewSeconds)
    ? Math.max(0, Math.floor(value.stats.totalViewSeconds))
    : defaults.stats.totalViewSeconds

  return {
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    stats: {
      totalViewSeconds
    }
  }
}
