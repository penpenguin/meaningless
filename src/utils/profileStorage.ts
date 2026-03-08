import type { ProfileState } from '../types/profile'
import { migrateProfileState } from './profileSchema'

export const PROFILE_KEY = 'aquarium:profile'

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const loadProfileState = (): ProfileState | null => {
  const parsed = safeParse<unknown>(localStorage.getItem(PROFILE_KEY))
  if (!parsed) return null
  return migrateProfileState(parsed)
}

export const saveProfileState = (state: ProfileState): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(state))
}
