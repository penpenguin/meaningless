import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '../../state/defaultAppState'
import { getSpeciesById } from '../../../utils/speciesCatalog'
import { canUnlockSpecies } from './unlockRules'

describe('unlockRules', () => {
  it('allows starter species without currency', () => {
    const state = createDefaultAppState()
    state.profile.unlockedSpeciesIds = []
    const starter = getSpeciesById('neon-tetra')
    expect(starter).not.toBeNull()
    expect(canUnlockSpecies(state, starter!)).toBe(true)
  })

  it('blocks cost unlock when pearls are insufficient', () => {
    const state = createDefaultAppState()
    const target = getSpeciesById('clownfish')
    expect(target).not.toBeNull()
    expect(canUnlockSpecies(state, target!)).toBe(false)
  })

  it('allows cost unlock when pearls are sufficient', () => {
    const state = createDefaultAppState()
    state.profile.currency.pearls = 99
    const target = getSpeciesById('clownfish')
    expect(target).not.toBeNull()
    expect(canUnlockSpecies(state, target!)).toBe(true)
  })
})
