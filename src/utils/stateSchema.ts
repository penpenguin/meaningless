import type { AquariumState, FishGroup, Settings, Theme } from '../types/aquarium'
import { getDefaultFishGroups } from './speciesCatalog'

export const CURRENT_SCHEMA_VERSION = 1

export const defaultTheme: Theme = {
  glassFrameStrength: 0.6,
  waterTint: '#0e3d4e',
  fogDensity: 0.4,
  particleDensity: 0.4,
  waveStrength: 0.7,
  waveSpeed: 0.8
}

export const defaultSettings: Settings = {
  soundEnabled: false,
  motionEnabled: true
}

export const createDefaultState = (): AquariumState => {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: { ...defaultTheme },
    fishGroups: getDefaultFishGroups(),
    settings: { ...defaultSettings }
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value)
}

const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

const validateTheme = (value: unknown): value is Theme => {
  if (!isObject(value)) return false
  return (
    isNumber(value.glassFrameStrength) &&
    isString(value.waterTint) &&
    isNumber(value.fogDensity) &&
    isNumber(value.particleDensity) &&
    isNumber(value.waveStrength) &&
    isNumber(value.waveSpeed)
  )
}

const validateSettings = (value: unknown): value is Settings => {
  if (!isObject(value)) return false
  return isBoolean(value.soundEnabled) && isBoolean(value.motionEnabled)
}

const validateFishGroup = (value: unknown): value is FishGroup => {
  if (!isObject(value)) return false
  if (!isString(value.speciesId) || !isNumber(value.count)) return false
  if (value.count < 1) return false
  return true
}

export const validateState = (value: unknown): value is AquariumState => {
  if (!isObject(value)) return false
  if (!isNumber(value.schemaVersion)) return false
  if (!validateTheme(value.theme)) return false
  if (!Array.isArray(value.fishGroups) || !value.fishGroups.every(validateFishGroup)) return false
  if (!validateSettings(value.settings)) return false
  return true
}

const mergeWithDefaults = (partial: AquariumState): AquariumState => {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: {
      ...defaultTheme,
      ...partial.theme
    },
    fishGroups: partial.fishGroups.length > 0 ? partial.fishGroups : getDefaultFishGroups(),
    settings: {
      ...defaultSettings,
      ...partial.settings
    }
  }
}

export const migrateState = (value: unknown): AquariumState => {
  if (!validateState(value)) {
    return createDefaultState()
  }

  if (value.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return createDefaultState()
  }

  if (value.schemaVersion < CURRENT_SCHEMA_VERSION) {
    return mergeWithDefaults(value)
  }

  return mergeWithDefaults(value)
}
