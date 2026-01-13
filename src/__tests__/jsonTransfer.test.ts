import { describe, expect, it } from 'vitest'
import { createState } from './fixtures/aquariumState'
import { exportState, importState } from '../utils/serialization'


describe('json export/import', () => {
  it('round-trips valid state', () => {
    const state = createState()
    const json = exportState(state)
    const imported = importState(json)

    expect(imported).not.toBeNull()
    expect(imported?.theme.waterTint).toBe(state.theme.waterTint)
    expect(imported?.fishGroups).toHaveLength(state.fishGroups.length)
  })
})
