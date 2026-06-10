import { describe, expect, it } from 'vitest'
import { createDefaultGameSave } from './gameSave'
import { createAquariumRenderModel } from './renderModel'
import type { GameAppState } from './types'

const createState = (): GameAppState => {
  const save = createDefaultGameSave('2026-03-09T00:00:00.000Z')
  return {
    game: save,
    ui: {
      mode: 'tank',
      lastOfflineResult: null
    }
  }
}

describe('createAquariumRenderModel', () => {
  it('keeps healthy tanks clear enough to read the playfield', () => {
    const renderModel = createAquariumRenderModel(createState())

    expect(renderModel.theme.waterTint).toBe('#0b5666')
    expect(renderModel.theme.fogDensity).toBeCloseTo(0.018, 3)
  })

  it('adds fixed premium water and glass theme values', () => {
    const renderModel = createAquariumRenderModel(createState())

    expect(renderModel.theme.glassTint).toBe('#cfe7ee')
    expect(renderModel.theme.glassReflectionStrength).toBeCloseTo(0.4, 2)
    expect(renderModel.theme.surfaceGlowStrength).toBeCloseTo(0.57, 2)
    expect(renderModel.theme.causticsStrength).toBeCloseTo(0.43, 2)
  })

  it('keeps the planted layout when the active tank theme is planted', () => {
    const renderModel = createAquariumRenderModel(createState())

    expect(renderModel.theme.layoutStyle).toBe('planted')
  })

  it('ignores legacy water quality values when deriving clear-water theme values', () => {
    const clearState = createState()
    const legacyDirtyState = createState()
    const tank = legacyDirtyState.game.tanks[0]
    if (!tank) throw new Error('tank missing')
    legacyDirtyState.game.tanks[0] = ({
      ...tank,
      progression: {
        comfort: 72,
        waterQuality: 12
      }
    } as typeof tank & { progression: { comfort: number; waterQuality: number } })

    const clear = createAquariumRenderModel(clearState)
    const legacyDirty = createAquariumRenderModel(legacyDirtyState)

    expect(legacyDirty.theme.waterTint).toBe(clear.theme.waterTint)
    expect(legacyDirty.theme.fogDensity).toBe(clear.theme.fogDensity)
    expect(legacyDirty.theme.glassReflectionStrength).toBe(clear.theme.glassReflectionStrength)
    expect(legacyDirty.theme.causticsStrength).toBe(clear.theme.causticsStrength)
  })

  it('keeps surface schools calm while preserving top-lane depth', () => {
    const state = createState()
    const tank = state.game.tanks[0]
    if (!tank) throw new Error('tank missing')

    state.game.tanks[0] = {
      ...tank,
      fishSchools: [
        {
          ...tank.fishSchools[0],
          lane: 'top'
        }
      ]
    }

    const renderModel = createAquariumRenderModel(state)
    const feedingSchool = renderModel.fishGroups[0]

    expect(feedingSchool?.tuning?.schoolMood).toBe('calm')
    expect(feedingSchool?.tuning?.preferredDepth).toBeCloseTo(0.2, 2)
    expect(feedingSchool?.tuning?.depthVariance).toBeCloseTo(0.18, 2)
  })

  it('marks stressed schools as alert and keeps them deeper in the tank', () => {
    const state = createState()
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
