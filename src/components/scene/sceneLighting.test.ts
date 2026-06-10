import { describe, expect, it } from 'vitest'
import {
  AQUARIUM_LAYERED_LIGHTING_ANCHORS,
  SURFACE_CAUSTIC_PHASE_FAMILY
} from './sceneLighting'

describe('scene lighting configuration', () => {
  it('exports tank-relative anchors for the layered freshwater light rig', () => {
    expect(AQUARIUM_LAYERED_LIGHTING_ANCHORS.lightCanopy).toEqual({
      x: 0.04,
      topClearance: 0.114,
      z: -0.18
    })
    expect(AQUARIUM_LAYERED_LIGHTING_ANCHORS.heroGroundGlow).toEqual({
      x: 0.106,
      bottomClearance: 0.058,
      z: -0.1
    })
    expect(AQUARIUM_LAYERED_LIGHTING_ANCHORS.nearSurfaceBands).toHaveLength(5)
    expect(AQUARIUM_LAYERED_LIGHTING_ANCHORS.nearSurfaceBands.map((anchor) => anchor.topClearance)).toEqual([
      0.202,
      0.194,
      0.212,
      0.192,
      0.205
    ])
  })

  it('keeps phase-linked caustic layers on a shared authored family id', () => {
    expect(SURFACE_CAUSTIC_PHASE_FAMILY).toBe('surface-caustic')
  })
})
