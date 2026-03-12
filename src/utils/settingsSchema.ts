import type { SettingsState } from '../types/settings'

export const CURRENT_SETTINGS_SCHEMA_VERSION = 1

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const isQuality = (value: unknown): value is SettingsState['quality'] =>
  value === 'simple' || value === 'standard'

const migrateQuality = (value: unknown, fallback: SettingsState['quality']): SettingsState['quality'] => {
  if (value === 'simple' || value === 'standard') return value
  if (value === 'low') return 'simple'
  if (value === 'medium' || value === 'high') return 'standard'
  return fallback
}

export const createDefaultSettingsState = (): SettingsState => ({
  schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
  soundEnabled: false,
  motionEnabled: true,
  quality: 'simple'
})

export const migrateSettingsState = (value: unknown): SettingsState => {
  if (!isObject(value)) return createDefaultSettingsState()
  const defaults = createDefaultSettingsState()

  const soundEnabled = isBoolean(value.soundEnabled) ? value.soundEnabled : defaults.soundEnabled
  const motionEnabled = isBoolean(value.motionEnabled) ? value.motionEnabled : defaults.motionEnabled
  const quality = isQuality(value.quality) ? value.quality : migrateQuality(value.quality, defaults.quality)

  return {
    schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    soundEnabled,
    motionEnabled,
    quality
  }
}
