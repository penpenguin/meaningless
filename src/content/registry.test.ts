import { describe, expect, it } from 'vitest'
import {
  createContentRegistry,
  getDecorContent,
  getFishContent,
  getStarterDecorContentIds,
  getStarterFishContentIds
} from './registry'
import type { FishContentDefinition } from './types'

describe('content registry', () => {
  it('keeps gameplay and render data in a single fish definition', () => {
    const clownfish = getFishContent('clownfish')

    expect(clownfish).toMatchObject({
      speciesId: 'clownfish',
      displayName: 'クマノミ',
      gameplay: {
        unlockCost: 18,
        preferredLane: 'middle'
      },
      render: {
        archetype: 'Tropical'
      }
    })
  })

  it('derives starter content ids from registered entries', () => {
    expect(getStarterFishContentIds()).toEqual(['neon-tetra'])
    expect(getStarterDecorContentIds()).toEqual(['plant'])
  })

  it('keeps decor definitions aligned with the shipped freshwater asset families', () => {
    expect(getDecorContent('plant')).toMatchObject({
      displayName: 'Plant Cluster',
      visual: {
        assetFamily: 'plant',
        shortLabel: 'PL'
      }
    })

    expect(getDecorContent('coral')).toMatchObject({
      displayName: 'Driftwood Branch',
      visual: {
        assetFamily: 'driftwood',
        shortLabel: 'DW'
      }
    })

    expect(getDecorContent('cave')).toMatchObject({
      displayName: 'River Rock',
      visual: {
        assetFamily: 'rock',
        shortLabel: 'RK'
      }
    })
  })

  it('rejects duplicate fish ids while building a registry', () => {
    const duplicateFish: FishContentDefinition[] = [
      {
        type: 'fish',
        speciesId: 'test-fish',
        displayName: 'Test Fish',
        description: 'First entry',
        visualRef: 'sprites/test-fish.png',
        size: 1,
        colorVariants: ['#ffffff'],
        unlock: {
          type: 'starter'
        },
        render: {
          archetype: 'Neon'
        },
        gameplay: {
          unlockCost: 0,
          purchaseCostPerFish: 1,
          baseIncomePerMinute: 0.2,
          preferredLane: 'middle',
          pollutionPerFish: 0.2
        }
      },
      {
        type: 'fish',
        speciesId: 'test-fish',
        displayName: 'Duplicate Fish',
        description: 'Second entry',
        visualRef: 'sprites/test-fish-2.png',
        size: 1.1,
        colorVariants: ['#000000'],
        unlock: {
          type: 'cost',
          costPearls: 1
        },
        render: {
          archetype: 'Tropical'
        },
        gameplay: {
          unlockCost: 1,
          purchaseCostPerFish: 1,
          baseIncomePerMinute: 0.3,
          preferredLane: 'top',
          pollutionPerFish: 0.3
        }
      }
    ]

    expect(() => createContentRegistry({ fish: duplicateFish, decor: [] })).toThrow('Duplicate fish content id: test-fish')
  })
})
