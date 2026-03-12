import { describe, expect, it } from 'vitest'
import { createDefaultGameSave, createHydratedGameAppState, migrateLegacySave } from './gameSave'

describe('gameSave', () => {
  it('creates a save rooted at schemaVersion, lastSimulatedAt, profile, and tanks', () => {
    const now = '2026-03-08T00:00:00.000Z'
    const save = createDefaultGameSave(now)

    expect(save.schemaVersion).toBe(1)
    expect(save.lastSimulatedAt).toBe(now)
    expect(save.tanks).toHaveLength(1)
    expect(save.activeTankId).toBe(save.tanks[0]?.id)
    expect(save.profile.currency.coins).toBe(12)
    expect(save.profile.preferences.hudVisible).toBe(true)
    expect(save.profile.preferences.photoModeEnabled).toBe(false)
    expect(save.tanks[0]?.fishSchools[0]).toMatchObject({
      speciesId: 'neon-tetra',
      lane: 'middle'
    })
  })

  it('migrates legacy tank/profile/settings into the new game save', () => {
    const migrated = migrateLegacySave({
      nowIso: '2026-03-08T00:00:00.000Z',
      legacyTank: {
        schemaVersion: 1,
        theme: {
          glassFrameStrength: 0.6,
          waterTint: '#0e3d4e',
          fogDensity: 0.4,
          particleDensity: 0.4,
          waveStrength: 0.7,
          waveSpeed: 0.8
        },
        fishGroups: [
          { speciesId: 'clownfish', count: 6 },
          { speciesId: 'angelfish', count: 2, tuning: { preferredDepth: 0.2 } }
        ]
      },
      legacyProfile: {
        schemaVersion: 1,
        currency: { pearls: 23 },
        unlockedSpeciesIds: ['clownfish'],
        stats: {
          totalViewSeconds: 0,
          totalEarnedPearls: 23
        },
        pendingViewSeconds: 0
      },
      legacySettings: {
        schemaVersion: 1,
        soundEnabled: false,
        motionEnabled: true,
        quality: 'medium'
      },
      legacyAutoSave: null
    })

    expect(migrated.profile.currency.coins).toBe(23)
    expect(migrated.profile.unlockedFishIds).toContain('clownfish')
    expect(migrated.profile.preferences.quality).toBe('medium')
    expect(migrated.profile.preferences.hudVisible).toBe(true)
    expect(migrated.profile.preferences.photoModeEnabled).toBe(false)
    expect(migrated.tanks[0]?.fishSchools).toEqual([
      expect.objectContaining({ speciesId: 'clownfish', count: 6, lane: 'middle' }),
      expect.objectContaining({ speciesId: 'angelfish', count: 2, lane: 'top' })
    ])
  })

  it('hydrates offline progress and records the offline summary in ui state', () => {
    const save = createDefaultGameSave('2026-03-08T00:00:00.000Z')
    const hydrated = createHydratedGameAppState({
      save: {
        ...save,
        lastSimulatedAt: '2026-03-08T00:00:00.000Z'
      },
      nowIso: '2026-03-08T02:00:00.000Z'
    })

    expect(hydrated.ui.lastOfflineResult).not.toBeNull()
    expect(hydrated.ui.lastOfflineResult?.simulatedSeconds).toBe(7200)
    expect(hydrated.game.profile.currency.coins).toBeGreaterThan(save.profile.currency.coins)
    expect(hydrated.game.lastSimulatedAt).toBe('2026-03-08T02:00:00.000Z')
  })
})
