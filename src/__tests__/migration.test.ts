import { describe, expect, it } from 'vitest'
import { createDefaultState } from '../utils/stateSchema'
import { importState } from '../utils/serialization'


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
})
