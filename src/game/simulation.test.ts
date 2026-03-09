import { describe, expect, it } from 'vitest'
import { calculateTankEconomy, simulateGameSave } from './simulation'
import { createDefaultGameSave } from './gameSave'

describe('simulation', () => {
  it('rewards stronger placement with higher comfort and income', () => {
    const save = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const tank = save.tanks[0]
    if (!tank) throw new Error('tank missing')

    const baseline = calculateTankEconomy(tank)
    const improved = calculateTankEconomy({
      ...tank,
      fishSchools: [
        { ...tank.fishSchools[0], count: 12, lane: 'top' },
        { id: 'school-clown', speciesId: 'clownfish', count: 6, lane: 'middle' }
      ],
      decor: [
        { id: 'decor-1', decorId: 'plant', x: 0, y: 0 },
        { id: 'decor-2', decorId: 'coral', x: 1, y: 2 },
        { id: 'decor-3', decorId: 'cave', x: 2, y: 4 }
      ]
    })

    expect(improved.comfort).toBeGreaterThan(baseline.comfort)
    expect(improved.incomePerMinute).toBeGreaterThan(baseline.incomePerMinute)
  })

  it('penalizes tanks that cram most fish into a single lane', () => {
    const save = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const tank = save.tanks[0]
    if (!tank) throw new Error('tank missing')

    const balanced = calculateTankEconomy({
      ...tank,
      fishSchools: [
        { ...tank.fishSchools[0], count: 6, lane: 'top' },
        { id: 'school-clownfish', speciesId: 'clownfish', count: 6, lane: 'middle' },
        { id: 'school-goldfish', speciesId: 'goldfish', count: 6, lane: 'bottom' }
      ]
    })
    const cramped = calculateTankEconomy({
      ...tank,
      fishSchools: [
        { ...tank.fishSchools[0], count: 6, lane: 'middle' },
        { id: 'school-clownfish', speciesId: 'clownfish', count: 6, lane: 'middle' },
        { id: 'school-goldfish', speciesId: 'goldfish', count: 6, lane: 'middle' }
      ]
    })

    expect(balanced.comfort).toBeGreaterThan(cramped.comfort)
    expect(balanced.incomePerMinute).toBeGreaterThan(cramped.incomePerMinute)
  })

  it('lets hideouts offset crowding more in packed tanks than in sparse tanks', () => {
    const save = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const tank = save.tanks[0]
    if (!tank) throw new Error('tank missing')

    const sparseTank = {
      ...tank,
      fishSchools: [
        { ...tank.fishSchools[0], count: 10, lane: 'bottom' as const }
      ]
    }
    const crowdedTank = {
      ...tank,
      fishSchools: [
        { ...tank.fishSchools[0], count: 24, lane: 'bottom' as const }
      ]
    }
    const cavePlacement = [{ id: 'decor-cave', decorId: 'cave', x: 1, y: tank.layout.rows - 1 }]

    const sparseBaseline = calculateTankEconomy(sparseTank)
    const sparseWithHideout = calculateTankEconomy({
      ...sparseTank,
      decor: cavePlacement
    })
    const crowdedBaseline = calculateTankEconomy(crowdedTank)
    const crowdedWithHideout = calculateTankEconomy({
      ...crowdedTank,
      decor: cavePlacement
    })

    const sparseGain = sparseWithHideout.comfort - sparseBaseline.comfort
    const crowdedGain = crowdedWithHideout.comfort - crowdedBaseline.comfort

    expect(crowdedGain).toBeGreaterThan(sparseGain)
    expect(crowdedWithHideout.comfort).toBeGreaterThan(crowdedBaseline.comfort)
  })

  it('simulates offline progress with a cap and degrades water quality over time', () => {
    const initial = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const result = simulateGameSave({
      save: initial,
      nowIso: '2026-03-09T00:00:00.000Z'
    })

    expect(result.offlineResult?.simulatedSeconds).toBe(8 * 60 * 60)
    expect(result.save.profile.currency.coins).toBeGreaterThan(initial.profile.currency.coins)
    expect(result.save.tanks[0]?.progression.waterQuality).toBeLessThan(100)
    expect(result.save.lastSimulatedAt).toBe('2026-03-09T00:00:00.000Z')
  })
})
