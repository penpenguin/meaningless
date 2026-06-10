import { describe, expect, it } from 'vitest'
import {
  createFishVariants,
  resolveDefaultFishCount,
  resolveHeroAccentDepthMultiplier,
  resolveHeroAccentScaleMultiplier,
  resolveHeroPlacements,
  resolveHeroPriorityMultiplier,
  resolveLocomotionProfile,
  resolvePreferredDepthBand,
  resolvePreferredLateralLane
} from './fishPresentation'

describe('fish presentation rules', () => {
  it('exports species variants with authored locomotion and asset-backed render decisions', () => {
    const variants = createFishVariants()

    expect(variants.map((variant) => variant.name)).toEqual([
      'Tropical',
      'Angelfish',
      'Butterflyfish',
      'Neon',
      'Goldfish',
      'AbeniPuffer',
      'Corydoras',
      'AfricanLampeye',
      'RasboraHeteromorpha',
      'YamatoShrimp'
    ])
    expect(variants.find((variant) => variant.name === 'Neon')).toMatchObject({
      locomotionProfileId: 'slender-darter',
      schoolForwardAxis: [0, 0, 1],
      heroForwardAxis: [0, 0, 1],
      schoolModelId: 'fish-neon-school',
      heroModelId: 'fish-neon-hero'
    })
    expect(variants.find((variant) => variant.name === 'YamatoShrimp')).toMatchObject({
      locomotionProfileId: 'substrate-crawler'
    })
    ;[
      'Tropical',
      'Angelfish',
      'Butterflyfish',
      'Neon',
      'Goldfish',
      'AbeniPuffer',
      'Corydoras',
      'AfricanLampeye',
      'RasboraHeteromorpha',
      'YamatoShrimp'
    ].forEach((name) => {
      expect(variants.find((variant) => variant.name === name)).toMatchObject({
        schoolForwardAxis: [0, 0, 1],
        heroForwardAxis: [0, 0, 1]
      })
      expect(variants.find((variant) => variant.name === name)?.schoolCorrectionQuaternion).toBeUndefined()
      expect(variants.find((variant) => variant.name === name)?.heroCorrectionQuaternion).toBeUndefined()
    })
  })

  it('resolves default school counts by layout and device class', () => {
    expect(resolveDefaultFishCount('planted', false)).toBe(66)
    expect(resolveDefaultFishCount('planted', true)).toBe(25)
    expect(resolveDefaultFishCount('nature-showcase', false)).toBe(24)
    expect(resolveDefaultFishCount('nature-showcase', true)).toBe(14)
  })

  it('keeps locomotion profiles as pure species tuning data', () => {
    const neonProfile = resolveLocomotionProfile({ locomotionProfileId: 'slender-darter' })
    const goldfishProfile = resolveLocomotionProfile({ locomotionProfileId: 'goldfish-wobble' })
    const shrimpProfile = resolveLocomotionProfile({ locomotionProfileId: 'substrate-crawler' })

    expect(neonProfile.cruiseSpeed).toBeGreaterThan(goldfishProfile.cruiseSpeed)
    expect(goldfishProfile.depthBobAmount).toBeGreaterThan(neonProfile.depthBobAmount)
    expect(shrimpProfile.movementMode).toBe('crawl')
    expect(shrimpProfile.cruiseSpeed).toBeLessThan(0.36)
    expect(shrimpProfile.turnNoise).toBeLessThan(0.03)
    expect(shrimpProfile.depthBobAmount).toBeLessThan(neonProfile.depthBobAmount)
  })

  it('exports lane and depth bias rules without depending on boids or meshes', () => {
    const neonProfile = resolveLocomotionProfile({ locomotionProfileId: 'slender-darter' })

    expect(resolvePreferredLateralLane('nature-showcase', 0.2)).toBe('left')
    expect(resolvePreferredLateralLane('nature-showcase', 0.6)).toBe('center')
    expect(resolvePreferredLateralLane('nature-showcase', 0.9)).toBe('right')
    expect(resolvePreferredDepthBand('nature-showcase', neonProfile, 0.24)).toBe('upper')
    expect(resolvePreferredDepthBand('nature-showcase', neonProfile, 0.88)).toBe('mid')
  })

  it('exports hero placement and subdued accent multipliers by layout', () => {
    const goldfish = { name: 'Goldfish' }
    const butterflyfish = { name: 'Butterflyfish' }

    expect(Math.max(...resolveHeroPlacements('nature-showcase').map((placement) => placement.scaleMultiplier)))
      .toBeLessThan(Math.max(...resolveHeroPlacements('planted').map((placement) => placement.scaleMultiplier)))
    expect(resolveHeroPriorityMultiplier('nature-showcase', goldfish, false)).toBeLessThanOrEqual(0.4)
    expect(resolveHeroPriorityMultiplier('nature-showcase', butterflyfish, false)).toBeLessThanOrEqual(0.4)
    expect(resolveHeroPriorityMultiplier('planted', goldfish, false)).toBeGreaterThan(
      resolveHeroPriorityMultiplier('nature-showcase', goldfish, false)
    )
    expect(resolveHeroPriorityMultiplier('nature-showcase', goldfish, true)).toBe(18)
    expect(resolveHeroAccentScaleMultiplier('nature-showcase', goldfish)).toBeLessThanOrEqual(0.62)
    expect(resolveHeroAccentDepthMultiplier('nature-showcase', goldfish)).toBeLessThanOrEqual(0.58)
  })
})
