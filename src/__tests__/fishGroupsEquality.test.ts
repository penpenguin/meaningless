import { describe, expect, it } from 'vitest'
import { areFishGroupsEqual } from '../utils/fishGroups'
import type { FishGroup } from '../types/aquarium'

describe('areFishGroupsEqual', () => {
  it('returns true for identical group values', () => {
    const left: FishGroup[] = [{ speciesId: 'neon-tetra', count: 3 }]
    const right: FishGroup[] = [{ speciesId: 'neon-tetra', count: 3 }]

    expect(areFishGroupsEqual(left, right)).toBe(true)
  })

  it('returns false when counts change', () => {
    const left: FishGroup[] = [{ speciesId: 'neon-tetra', count: 3 }]
    const right: FishGroup[] = [{ speciesId: 'neon-tetra', count: 4 }]

    expect(areFishGroupsEqual(left, right)).toBe(false)
  })

  it('returns false when tuning changes', () => {
    const left: FishGroup[] = [
      {
        speciesId: 'neon-tetra',
        count: 3,
        tuning: {
          speed: 0.2,
          cohesion: 0.3,
          separation: 0.4,
          alignment: 0.5,
          avoidWalls: 0.6,
          preferredDepth: 0.7
        }
      }
    ]
    const right: FishGroup[] = [
      {
        speciesId: 'neon-tetra',
        count: 3,
        tuning: {
          speed: 0.2,
          cohesion: 0.3,
          separation: 0.4,
          alignment: 0.55,
          avoidWalls: 0.6,
          preferredDepth: 0.7
        }
      }
    ]

    expect(areFishGroupsEqual(left, right)).toBe(false)
  })
})
