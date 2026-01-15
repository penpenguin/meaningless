import type { AquariumState, FishGroup, Settings, Theme, Tuning } from '../types/aquarium'
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

const validateTuning = (value: unknown): value is Tuning => {
  if (!isObject(value)) return false
  return (
    isNumber(value.speed) &&
    isNumber(value.cohesion) &&
    isNumber(value.separation) &&
    isNumber(value.alignment) &&
    isNumber(value.avoidWalls) &&
    isNumber(value.preferredDepth)
  )
}

const validateFishGroup = (value: unknown): value is FishGroup => {
  if (!isObject(value)) return false
  if (!isString(value.speciesId) || !isNumber(value.count)) return false
  if (value.count < 1) return false
  if (value.tuning !== undefined && !validateTuning(value.tuning)) return false
  return true
}

type PartialState = {
  theme?: Partial<Theme>
  fishGroups?: FishGroup[]
  settings?: Partial<Settings>
}

const coerceTheme = (value: unknown): Partial<Theme> | undefined => {
  if (!isObject(value)) return undefined
  const theme: Partial<Theme> = {}
  if (isNumber(value.glassFrameStrength)) theme.glassFrameStrength = value.glassFrameStrength
  if (isString(value.waterTint)) theme.waterTint = value.waterTint
  if (isNumber(value.fogDensity)) theme.fogDensity = value.fogDensity
  if (isNumber(value.particleDensity)) theme.particleDensity = value.particleDensity
  if (isNumber(value.waveStrength)) theme.waveStrength = value.waveStrength
  if (isNumber(value.waveSpeed)) theme.waveSpeed = value.waveSpeed
  return Object.keys(theme).length > 0 ? theme : undefined
}

const coerceSettings = (value: unknown): Partial<Settings> | undefined => {
  if (!isObject(value)) return undefined
  const settings: Partial<Settings> = {}
  if (isBoolean(value.soundEnabled)) settings.soundEnabled = value.soundEnabled
  if (isBoolean(value.motionEnabled)) settings.motionEnabled = value.motionEnabled
  return Object.keys(settings).length > 0 ? settings : undefined
}

const coerceFishGroups = (value: unknown): FishGroup[] | undefined => {
  if (!Array.isArray(value)) return undefined
  if (value.length === 0) return []
  const groups: FishGroup[] = []
  for (const entry of value) {
    if (!isObject(entry)) return undefined
    if (!isString(entry.speciesId) || !isNumber(entry.count)) return undefined
    if (entry.count < 1) return undefined
    const group: FishGroup = {
      speciesId: entry.speciesId,
      count: entry.count
    }
    if (entry.tuning !== undefined && validateTuning(entry.tuning)) {
      group.tuning = entry.tuning
    }
    groups.push(group)
  }
  return groups
}

const hasSchemaVersion = (value: unknown): value is { schemaVersion: number } => {
  return isObject(value) && isNumber(value.schemaVersion)
}

export const validateState = (value: unknown): value is AquariumState => {
  if (!isObject(value)) return false
  if (!isNumber(value.schemaVersion)) return false
  if (!validateTheme(value.theme)) return false
  if (!Array.isArray(value.fishGroups) || !value.fishGroups.every(validateFishGroup)) return false
  if (!validateSettings(value.settings)) return false
  return true
}

const mergeWithDefaults = (partial: PartialState): AquariumState => {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: {
      ...defaultTheme,
      ...(partial.theme ?? {})
    },
    fishGroups: partial.fishGroups ?? getDefaultFishGroups(),
    settings: {
      ...defaultSettings,
      ...(partial.settings ?? {})
    }
  }
}

export const migrateState = (value: unknown): AquariumState => {
  if (!hasSchemaVersion(value)) {
    return createDefaultState()
  }

  if (value.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return createDefaultState()
  }

  if (value.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const payload = value as Record<string, unknown>
    return mergeWithDefaults({
      theme: coerceTheme(payload.theme),
      fishGroups: coerceFishGroups(payload.fishGroups),
      settings: coerceSettings(payload.settings)
    })
  }

  if (!validateState(value)) {
    const payload = value as Record<string, unknown>
    const fishGroups = coerceFishGroups(payload.fishGroups)
    if (
      fishGroups &&
      validateTheme(payload.theme) &&
      validateSettings(payload.settings)
    ) {
      return mergeWithDefaults({
        theme: payload.theme as Theme,
        fishGroups,
        settings: payload.settings as Settings
      })
    }
    return createDefaultState()
  }

  return mergeWithDefaults(value)
}
