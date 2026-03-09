import { describe, expect, it } from 'vitest'
import { createDefaultGameSave } from './gameSave'
import { createAquariumRenderModel } from './renderModel'
import type { GameAppState } from './types'

const createStateWithWaterQuality = (waterQuality: number): GameAppState => {
  const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
  return {
    game: {
      ...save,
      tanks: save.tanks.map((tank, index) =>
        index === 0
          ? {
              ...tank,
              progression: {
                ...tank.progression,
                waterQuality
              }
            }
          : tank
      )
    },
    ui: {
      mode: 'tank',
      selectedDecorId: null,
      lastOfflineResult: null
    }
  }
}

describe('createAquariumRenderModel', () => {
  it('keeps healthy tanks clear enough to read the playfield', () => {
    const renderModel = createAquariumRenderModel(createStateWithWaterQuality(100))

    expect(renderModel.theme.waterTint).toBe('#0b5666')
    expect(renderModel.theme.fogDensity).toBeCloseTo(0.018, 3)
  })

  it('thickens fog gradually as water quality drops', () => {
    const healthy = createAquariumRenderModel(createStateWithWaterQuality(100))
    const dirty = createAquariumRenderModel(createStateWithWaterQuality(35))

    expect(dirty.theme.waterTint).toBe('#21424d')
    expect(dirty.theme.fogDensity).toBeGreaterThan(healthy.theme.fogDensity)
    expect(dirty.theme.fogDensity).toBeCloseTo(0.054, 3)
  })
})
