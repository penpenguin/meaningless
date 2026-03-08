import type { GameSave } from './types'
import { createDefaultGameSave, migrateGameSave, migrateLegacySave } from './gameSave'

export const GAME_SAVE_KEY = 'aquarium:game-save'

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const loadGameSave = (nowIso = new Date().toISOString()): GameSave | null => {
  if (typeof localStorage === 'undefined') return null
  const parsed = safeParse<unknown>(localStorage.getItem(GAME_SAVE_KEY))
  if (!parsed) return null
  return migrateGameSave(parsed, nowIso)
}

export const saveGameSave = (save: GameSave): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save))
}

export const resolveBootGameSave = (options: {
  nowIso?: string
  persistedGameSave?: GameSave | null
  legacyTank?: unknown
  legacyProfile?: unknown
  legacySettings?: unknown
  legacyAutoSave?: { state?: unknown } | null
} = {}): GameSave => {
  const nowIso = options.nowIso ?? new Date().toISOString()
  if (options.persistedGameSave) {
    return migrateGameSave(options.persistedGameSave, nowIso)
  }
  if (options.legacyTank || options.legacyProfile || options.legacySettings || options.legacyAutoSave) {
    return migrateLegacySave({
      nowIso,
      legacyTank: options.legacyTank ?? null,
      legacyProfile: options.legacyProfile ?? null,
      legacySettings: options.legacySettings ?? null,
      legacyAutoSave: options.legacyAutoSave ?? null
    })
  }
  return createDefaultGameSave(nowIso)
}
