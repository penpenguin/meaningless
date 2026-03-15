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
  layoutStyle: 'planted',
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
const isLayoutStyle = (value: unknown): value is Theme['layoutStyle'] => value === 'planted' || value === 'marine'

const validateTheme = (value: unknown): value is Theme => {
  if (!isObject(value)) return false
  return (
    isNumber(value.glassFrameStrength) &&
    isString(value.waterTint) &&
    isNumber(value.fogDensity) &&
    isNumber(value.particleDensity) &&
    isNumber(value.waveStrength) &&
    isNumber(value.waveSpeed) &&
    isLayoutStyle(value.layoutStyle)
  )
}

const validateFishGroup = (value: unknown): value is FishGroup => {
  if (!isObject(value)) return false
  return isString(value.speciesId) && isNumber(value.count) && value.count > 0
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
  if (isLayoutStyle(value.layoutStyle)) theme.layoutStyle = value.layoutStyle
  return Object.keys(theme).length > 0 ? theme : undefined
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

  const theme = validateTheme(value.theme) ? value.theme : coerceTheme(value.theme)
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
