import { describe, expect, it } from 'vitest'
import { simulateGameSave } from './simulation'
import { createDefaultGameSave } from './gameSave'

describe('simulation', () => {
  it('simulates offline observation time with a cap without progression summaries', () => {
    const initial = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const result = simulateGameSave({
      save: initial,
      nowIso: '2026-03-09T00:00:00.000Z'
    })

    expect(result.offlineResult?.simulatedSeconds).toBe(8 * 60 * 60)
    expect(result.save.profile).not.toHaveProperty('currency')
    expect(result.offlineResult?.tankSummaries[0]).toEqual({ tankId: initial.activeTankId })
    expect(result.offlineResult?.tankSummaries[0]).not.toHaveProperty('beforeWaterQuality')
    expect(result.offlineResult?.tankSummaries[0]).not.toHaveProperty('afterWaterQuality')
    expect(result.save.tanks[0]).not.toHaveProperty('progression')
    expect(result.save.lastSimulatedAt).toBe('2026-03-09T00:00:00.000Z')
  })
})
