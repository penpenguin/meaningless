import { describe, expect, it } from 'vitest'
import {
  NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS,
  PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS,
  resolveSubstrateHardscapeAnchors
} from './aquascapeHardscape'

describe('aquascape hardscape layout data', () => {
  it('exports the planted substrate hardscape anchors as authored layout data', () => {
    expect(PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS.map((anchor) => anchor.id)).toEqual([
      'driftwood-root-flare',
      'ridge-rock-front',
      'ridge-rock-hero',
      'ridge-rock-tail'
    ])
    expect(PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS.find((anchor) => anchor.id === 'ridge-rock-hero')).toMatchObject({
      x: 0.136,
      z: -0.032,
      radiusX: 0.086,
      radiusZ: 0.068
    })
  })

  it('exports the nature-showcase mound anchors separately from mesh builders', () => {
    expect(NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS).toHaveLength(6)
    expect(NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS.map((anchor) => anchor.id)).toEqual([
      'mound-foundation-left-rear',
      'mound-foundation-left-front',
      'mound-foundation-core',
      'mound-shoulder-root',
      'mound-transition-front',
      'mound-transition-sand-edge'
    ])
    expect(NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS.every((anchor) => anchor.x < 0.05)).toBe(true)
  })

  it('resolves cloned anchors so callers cannot mutate authored presets', () => {
    const resolved = resolveSubstrateHardscapeAnchors('nature-showcase')
    resolved[0]!.x = 99

    expect(NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS[0]!.x).toBe(-0.336)
    expect(resolveSubstrateHardscapeAnchors('nature-showcase')[0]!.x).toBe(-0.336)
    expect(resolveSubstrateHardscapeAnchors('planted')).toEqual(PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS)
  })
})
