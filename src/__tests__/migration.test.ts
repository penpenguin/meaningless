import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, createDefaultState, migrateState } from '../utils/stateSchema'
import { importState } from '../utils/serialization'
import { createState } from './fixtures/aquariumState'


describe('migration fallback', () => {
  it('falls back on unknown schema version', () => {
    const payload = JSON.stringify({
      schemaVersion: 999,
      theme: {
        glassFrameStrength: 0.2,
        waterTint: '#ffffff',
        fogDensity: 0.1,
        particleDensity: 0.1,
        waveStrength: 0.1,
        waveSpeed: 0.1
      },
      fishGroups: [],
      settings: { soundEnabled: false, motionEnabled: false }
    })

    const imported = importState(payload)
    const fallback = createDefaultState()

    expect(imported?.schemaVersion).toBe(fallback.schemaVersion)
    expect(imported?.fishGroups.length).toBe(fallback.fishGroups.length)
  })

  it('preserves empty fish groups for valid state', () => {
    const state = createState({ fishGroups: [] })

    const migrated = migrateState(state)

    expect(migrated.fishGroups).toEqual([])
  })

  it('merges defaults for older schema with missing fields', () => {
    const legacy = {
      schemaVersion: 0,
      fishGroups: [{ speciesId: 'neon-tetra', count: 3 }]
    }

    const migrated = migrateState(legacy)
    const defaults = createDefaultState()

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(migrated.fishGroups).toEqual(legacy.fishGroups)
    expect(migrated.theme).toEqual(defaults.theme)
    expect(migrated.settings).toEqual(defaults.settings)
  })

  it('imports older schema payloads without dropping data', () => {
    const legacy = {
      schemaVersion: 0,
      fishGroups: [{ speciesId: 'neon-tetra', count: 3 }]
    }

    const imported = importState(JSON.stringify(legacy))

    expect(imported).not.toBeNull()
    expect(imported?.fishGroups).toEqual(legacy.fishGroups)
  })

  it('strips invalid tuning values on import', () => {
    const defaults = createDefaultState()
    const payload = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      theme: defaults.theme,
      settings: defaults.settings,
      fishGroups: [
        {
          speciesId: 'neon-tetra',
          count: 3,
          tuning: {
            speed: 'fast',
            cohesion: 0.2,
            separation: 0.3,
            alignment: 0.4,
            avoidWalls: 0.5,
            preferredDepth: 0.6
          }
        }
      ]
    })

    const imported = importState(payload)

    expect(imported).not.toBeNull()
    expect(imported?.fishGroups[0]?.tuning).toBeUndefined()
  })
})
