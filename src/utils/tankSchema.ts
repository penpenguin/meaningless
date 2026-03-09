import type { FishGroup, Theme } from '../types/aquarium'
import type { TankState } from '../types/tank'
import { getDefaultFishGroups } from './speciesCatalog'

export const CURRENT_TANK_SCHEMA_VERSION = 1

export const defaultTankTheme: Theme = {
  glassFrameStrength: 0.6,
  waterTint: '#0e3d4e',
  fogDensity: 0.4,
  particleDensity: 0.4,
  waveStrength: 0.7,
  waveSpeed: 0.8,
  glassTint: '#c3dde3',
  glassReflectionStrength: 0.32,
  surfaceGlowStrength: 0.45,
  causticsStrength: 0.3
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

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

const validateFishGroup = (value: unknown): value is FishGroup => {
  if (!isObject(value)) return false
  return isString(value.speciesId) && isNumber(value.count) && value.count > 0
}

export const createDefaultTankState = (): TankState => ({
  schemaVersion: CURRENT_TANK_SCHEMA_VERSION,
  theme: { ...defaultTankTheme },
  fishGroups: getDefaultFishGroups()
})

export const migrateTankState = (value: unknown): TankState => {
  if (!isObject(value)) return createDefaultTankState()
  const schemaVersion = isNumber(value.schemaVersion) ? value.schemaVersion : 0
  if (schemaVersion > CURRENT_TANK_SCHEMA_VERSION) return createDefaultTankState()

  const theme = validateTheme(value.theme) ? value.theme : defaultTankTheme
  const fishGroups = Array.isArray(value.fishGroups) && value.fishGroups.every(validateFishGroup)
    ? value.fishGroups
    : getDefaultFishGroups()

  return {
    schemaVersion: CURRENT_TANK_SCHEMA_VERSION,
    theme: {
      ...defaultTankTheme,
      ...theme
    },
    fishGroups
  }
}
