import type { AquariumState } from '../types/aquarium'
import { migrateState, validateState } from './stateSchema'

export const exportState = (state: AquariumState): string => {
  return JSON.stringify(state)
}

export const importState = (json: string): AquariumState | null => {
  try {
    const parsed = JSON.parse(json)
    if (!validateState(parsed)) {
      return null
    }
    return migrateState(parsed)
  } catch {
    return null
  }
}
