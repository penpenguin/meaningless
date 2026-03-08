import type { TankState } from '../types/tank'
import { migrateTankState } from './tankSchema'

export const TANK_AUTOSAVE_KEY = 'aquarium:tank:autosave'

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const loadTankState = (): TankState | null => {
  const parsed = safeParse<unknown>(localStorage.getItem(TANK_AUTOSAVE_KEY))
  if (!parsed) return null
  return migrateTankState(parsed)
}

export const saveTankState = (state: TankState): void => {
  localStorage.setItem(TANK_AUTOSAVE_KEY, JSON.stringify(state))
}
