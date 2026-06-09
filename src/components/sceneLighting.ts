import type { TankRelativeAnchor } from '../utils/aquariumLayout'

export const SURFACE_CAUSTIC_PHASE_FAMILY = 'surface-caustic'

export const AQUARIUM_LAYERED_LIGHTING_ANCHORS = {
  lightCanopy: {
    x: 0.04,
    topClearance: 0.114,
    z: -0.18
  },
  heroRimLight: {
    x: 0.142,
    y: 0.034,
    z: -0.188
  },
  heroGroundGlow: {
    x: 0.106,
    bottomClearance: 0.058,
    z: -0.1
  },
  heroFrontFill: {
    x: 0.068,
    bottomClearance: 0.132,
    z: 0.126
  },
  nearSurfaceBands: [
    {
      x: -0.312,
      topClearance: 0.202,
      z: -0.06
    },
    {
      x: -0.162,
      topClearance: 0.194,
      z: -0.11
    },
    {
      x: 0.018,
      topClearance: 0.212,
      z: -0.152
    },
    {
      x: 0.182,
      topClearance: 0.192,
      z: -0.198
    },
    {
      x: 0.314,
      topClearance: 0.205,
      z: -0.244
    }
  ],
  midwater: {
    x: 0.028,
    y: 0.082,
    z: -0.172
  }
} as const satisfies Record<string, TankRelativeAnchor | readonly TankRelativeAnchor[]>
