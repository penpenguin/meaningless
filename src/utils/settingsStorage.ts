import type { SettingsState } from '../types/settings'
import { migrateSettingsState } from './settingsSchema'

export const SETTINGS_KEY = 'aquarium:settings'

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const loadSettingsState = (): SettingsState | null => {
  const parsed = safeParse<unknown>(localStorage.getItem(SETTINGS_KEY))
  if (!parsed) return null
  return migrateSettingsState(parsed)
}

export const saveSettingsState = (state: SettingsState): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state))
}
