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

  it('adds premium water and glass theme values for clear tanks', () => {
    const renderModel = createAquariumRenderModel(createStateWithWaterQuality(100))

    expect(renderModel.theme.glassTint).toBe('#cfe7ee')
    expect(renderModel.theme.glassReflectionStrength).toBeCloseTo(0.4, 2)
    expect(renderModel.theme.surfaceGlowStrength).toBeCloseTo(0.57, 2)
    expect(renderModel.theme.causticsStrength).toBeCloseTo(0.43, 2)
  })

  it('defaults the render theme to the planted layout', () => {
    const renderModel = createAquariumRenderModel(createStateWithWaterQuality(100))

    expect(renderModel.theme.layoutStyle).toBe('planted')
  })

  it('thickens fog gradually as water quality drops', () => {
    const healthy = createAquariumRenderModel(createStateWithWaterQuality(100))
    const dirty = createAquariumRenderModel(createStateWithWaterQuality(35))

    expect(dirty.theme.waterTint).toBe('#21424d')
    expect(dirty.theme.fogDensity).toBeGreaterThan(healthy.theme.fogDensity)
    expect(dirty.theme.fogDensity).toBeCloseTo(0.054, 3)
    expect(dirty.theme.glassReflectionStrength!).toBeLessThan(healthy.theme.glassReflectionStrength!)
    expect(dirty.theme.causticsStrength!).toBeLessThan(healthy.theme.causticsStrength!)
  })

  it('marks healthy surface schools as feeding with broader vertical motion', () => {
    const state = createStateWithWaterQuality(100)
    const tank = state.game.tanks[0]
    if (!tank) throw new Error('tank missing')

    state.game.tanks[0] = {
      ...tank,
      fishSchools: [
        {
          ...tank.fishSchools[0],
          lane: 'top'
        }
      ],
      progression: {
        ...tank.progression,
        comfort: 72
      }
    }

    const renderModel = createAquariumRenderModel(state)
    const feedingSchool = renderModel.fishGroups[0]

    expect(feedingSchool?.tuning?.schoolMood).toBe('feeding')
    expect(feedingSchool?.tuning?.preferredDepth).toBeLessThan(0.2)
    expect(feedingSchool?.tuning?.depthVariance).toBeGreaterThan(0.2)
  })

  it('marks stressed schools as alert and keeps them deeper in the tank', () => {
    const state = createStateWithWaterQuality(32)
    const tank = state.game.tanks[0]
    if (!tank) throw new Error('tank missing')

    state.game.tanks[0] = {
      ...tank,
      fishSchools: [
        {
          ...tank.fishSchools[0],
          count: 14,
          lane: 'middle'
        },
        {
          id: 'school-clownfish',
          speciesId: 'clownfish',
          count: 12,
          lane: 'middle'
        }
      ]
    }

    const renderModel = createAquariumRenderModel(state)
    const stressedSchool = renderModel.fishGroups[0]

    expect(stressedSchool?.tuning?.schoolMood).toBe('alert')
    expect(stressedSchool?.tuning?.preferredDepth).toBeGreaterThan(0.5)
    expect(stressedSchool?.tuning?.depthVariance).toBeLessThan(0.12)
    expect(stressedSchool?.tuning?.turnBias).toBeGreaterThan(0.25)
  })
})
