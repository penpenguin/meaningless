import type { ProfileState } from '../types/profile'
import { getStarterSpeciesIds } from './speciesCatalog'

export const CURRENT_PROFILE_SCHEMA_VERSION = 1
export const VIEW_SECONDS_PER_PEARL = 300

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isString = (value: unknown): value is string => typeof value === 'string'

export const createDefaultProfileState = (): ProfileState => ({
  schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
  currency: {
    pearls: 0
  },
  unlockedSpeciesIds: getStarterSpeciesIds(),
  stats: {
    totalViewSeconds: 0,
    totalEarnedPearls: 0
  },
  pendingViewSeconds: 0
})

export const migrateProfileState = (value: unknown): ProfileState => {
  if (!isObject(value)) return createDefaultProfileState()
  const defaults = createDefaultProfileState()

  const schemaVersion = isNumber(value.schemaVersion) ? value.schemaVersion : 0
  if (schemaVersion > CURRENT_PROFILE_SCHEMA_VERSION) return defaults

  const pearls = isObject(value.currency) && isNumber(value.currency.pearls)
    ? Math.max(0, Math.floor(value.currency.pearls))
    : defaults.currency.pearls

  const unlockedSpeciesIds = Array.isArray(value.unlockedSpeciesIds)
    ? value.unlockedSpeciesIds.filter(isString)
    : defaults.unlockedSpeciesIds

  const totalViewSeconds = isObject(value.stats) && isNumber(value.stats.totalViewSeconds)
    ? Math.max(0, Math.floor(value.stats.totalViewSeconds))
    : defaults.stats.totalViewSeconds
  const totalEarnedPearls = isObject(value.stats) && isNumber(value.stats.totalEarnedPearls)
    ? Math.max(0, Math.floor(value.stats.totalEarnedPearls))
    : defaults.stats.totalEarnedPearls
  const pendingViewSeconds = isNumber(value.pendingViewSeconds)
    ? Math.max(0, Math.floor(value.pendingViewSeconds))
    : defaults.pendingViewSeconds

  return {
    schemaVersion: CURRENT_PROFILE_SCHEMA_VERSION,
    currency: { pearls },
    unlockedSpeciesIds: Array.from(new Set([...defaults.unlockedSpeciesIds, ...unlockedSpeciesIds])),
    stats: {
      totalViewSeconds,
      totalEarnedPearls
    },
    pendingViewSeconds
  }
}
