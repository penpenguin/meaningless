import { beforeEach, describe, expect, it } from 'vitest'
import { createState } from './fixtures/aquariumState'
import { createSaveSlot, deleteSaveSlot, getSaveSlot, getSaveSlots, updateSaveSlot } from '../utils/storage'

beforeEach(() => {
  localStorage.clear()
})

describe('save slots', () => {
  it('creates and retrieves save slots', () => {
    const slot = createSaveSlot('My Tank', createState())
    const slots = getSaveSlots()

    expect(slots).toHaveLength(1)
    expect(slots[0].id).toBe(slot.id)
    expect(getSaveSlot(slot.id)?.name).toBe('My Tank')
  })

  it('updates and deletes save slots', () => {
    const slot = createSaveSlot('A', createState())
    const updated = updateSaveSlot(slot.id, createState({ settings: { soundEnabled: true, motionEnabled: true } }))

    expect(updated?.state.settings.soundEnabled).toBe(true)

    deleteSaveSlot(slot.id)
    expect(getSaveSlots()).toHaveLength(0)
  })
})
