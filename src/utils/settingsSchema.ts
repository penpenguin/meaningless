import type { SettingsState } from '../types/settings'

export const CURRENT_SETTINGS_SCHEMA_VERSION = 1

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const isQuality = (value: unknown): value is SettingsState['quality'] =>
  value === 'low' || value === 'medium' || value === 'high'

export const createDefaultSettingsState = (): SettingsState => ({
  schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
  soundEnabled: false,
  motionEnabled: true,
  quality: 'high'
})

export const migrateSettingsState = (value: unknown): SettingsState => {
  if (!isObject(value)) return createDefaultSettingsState()
  const defaults = createDefaultSettingsState()

  const soundEnabled = isBoolean(value.soundEnabled) ? value.soundEnabled : defaults.soundEnabled
  const motionEnabled = isBoolean(value.motionEnabled) ? value.motionEnabled : defaults.motionEnabled
  const quality = isQuality(value.quality) ? value.quality : defaults.quality

  return {
    schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    soundEnabled,
    motionEnabled,
    quality
  }
}
