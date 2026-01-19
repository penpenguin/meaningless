import type { AquariumState } from '../types/aquarium'
import { migrateState } from './stateSchema'

export const exportState = (state: AquariumState): string => {
  return JSON.stringify(state)
}

export const importState = (json: string): AquariumState | null => {
  try {
    const parsed = JSON.parse(json)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { schemaVersion?: unknown }).schemaVersion !== 'number' ||
      !Number.isFinite((parsed as { schemaVersion: number }).schemaVersion)
    ) {
      return null
    }
    return migrateState(parsed)
  } catch {
    return null
  }
}
