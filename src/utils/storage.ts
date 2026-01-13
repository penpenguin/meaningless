import type { AquariumState, AutoSave, SaveSlot } from '../types/aquarium'
import { migrateState } from './stateSchema'

const SAVE_SLOTS_KEY = 'aquarium:saves'
const AUTOSAVE_KEY = 'aquarium:autosave'

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const write = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value))
}

const readSaveSlots = (): SaveSlot[] => {
  const parsed = safeParse<SaveSlot[]>(localStorage.getItem(SAVE_SLOTS_KEY))
  if (!parsed) return []
  return parsed.map((slot) => ({
    ...slot,
    state: migrateState(slot.state)
  }))
}

export const getSaveSlots = (): SaveSlot[] => readSaveSlots()

export const createSaveSlot = (name: string, state: AquariumState): SaveSlot => {
  const slot: SaveSlot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    savedAt: new Date().toISOString(),
    state: migrateState(state)
  }

  const slots = readSaveSlots()
  write(SAVE_SLOTS_KEY, [slot, ...slots])
  return slot
}

export const updateSaveSlot = (id: string, state: AquariumState): SaveSlot | null => {
  const slots = readSaveSlots()
  const next = slots.map((slot) =>
    slot.id === id
      ? { ...slot, savedAt: new Date().toISOString(), state: migrateState(state) }
      : slot
  )
  const updated = next.find((slot) => slot.id === id) ?? null
  write(SAVE_SLOTS_KEY, next)
  return updated
}

export const deleteSaveSlot = (id: string): void => {
  const slots = readSaveSlots()
  write(SAVE_SLOTS_KEY, slots.filter((slot) => slot.id !== id))
}

export const getSaveSlot = (id: string): SaveSlot | null => {
  const slots = readSaveSlots()
  return slots.find((slot) => slot.id === id) ?? null
}

export const setAutoSave = (state: AquariumState): AutoSave => {
  const autosave: AutoSave = {
    updatedAt: new Date().toISOString(),
    state: migrateState(state)
  }
  write(AUTOSAVE_KEY, autosave)
  return autosave
}

export const getAutoSave = (): AutoSave | null => {
  const parsed = safeParse<AutoSave>(localStorage.getItem(AUTOSAVE_KEY))
  if (!parsed) return null
  return {
    ...parsed,
    state: migrateState(parsed.state)
  }
}
