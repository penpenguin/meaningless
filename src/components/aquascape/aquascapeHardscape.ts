import type { AquascapeLayoutStyle } from '../../types/aquarium'

export type SubstrateHardscapeAnchor = {
  id: string
  x: number
  z: number
  radiusX: number
  radiusZ: number
  sinkDepth: number
  rimHeight: number
  rimBiasX: number
  rimBiasZ: number
}

export const PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS: readonly SubstrateHardscapeAnchor[] = [
  {
    id: 'driftwood-root-flare',
    x: -0.018,
    z: -0.052,
    radiusX: 0.065,
    radiusZ: 0.06,
    sinkDepth: 0.09,
    rimHeight: 0.042,
    rimBiasX: -0.018,
    rimBiasZ: 0.03
  },
  {
    id: 'ridge-rock-front',
    x: 0.04,
    z: 0.012,
    radiusX: 0.052,
    radiusZ: 0.048,
    sinkDepth: 0.074,
    rimHeight: 0.052,
    rimBiasX: -0.008,
    rimBiasZ: 0.03
  },
  {
    id: 'ridge-rock-hero',
    x: 0.136,
    z: -0.032,
    radiusX: 0.086,
    radiusZ: 0.068,
    sinkDepth: 0.074,
    rimHeight: 0.044,
    rimBiasX: 0.016,
    rimBiasZ: 0.022
  },
  {
    id: 'ridge-rock-tail',
    x: 0.212,
    z: -0.078,
    radiusX: 0.07,
    radiusZ: 0.06,
    sinkDepth: 0.058,
    rimHeight: 0.034,
    rimBiasX: 0.022,
    rimBiasZ: 0.012
  }
]

export const NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS: readonly SubstrateHardscapeAnchor[] = [
  {
    id: 'mound-foundation-left-rear',
    x: -0.336,
    z: -0.1,
    radiusX: 0.104,
    radiusZ: 0.088,
    sinkDepth: 0.114,
    rimHeight: 0.058,
    rimBiasX: 0.018,
    rimBiasZ: 0.034
  },
  {
    id: 'mound-foundation-left-front',
    x: -0.312,
    z: 0.054,
    radiusX: 0.098,
    radiusZ: 0.082,
    sinkDepth: 0.106,
    rimHeight: 0.054,
    rimBiasX: 0.022,
    rimBiasZ: 0.048
  },
  {
    id: 'mound-foundation-core',
    x: -0.238,
    z: -0.018,
    radiusX: 0.12,
    radiusZ: 0.088,
    sinkDepth: 0.116,
    rimHeight: 0.058,
    rimBiasX: 0.038,
    rimBiasZ: 0.026
  },
  {
    id: 'mound-shoulder-root',
    x: -0.162,
    z: -0.128,
    radiusX: 0.094,
    radiusZ: 0.074,
    sinkDepth: 0.09,
    rimHeight: 0.046,
    rimBiasX: 0.048,
    rimBiasZ: 0.018
  },
  {
    id: 'mound-transition-front',
    x: -0.104,
    z: 0.126,
    radiusX: 0.078,
    radiusZ: 0.068,
    sinkDepth: 0.064,
    rimHeight: 0.036,
    rimBiasX: 0.054,
    rimBiasZ: 0.026
  },
  {
    id: 'mound-transition-sand-edge',
    x: 0.018,
    z: 0.154,
    radiusX: 0.07,
    radiusZ: 0.06,
    sinkDepth: 0.042,
    rimHeight: 0.028,
    rimBiasX: 0.058,
    rimBiasZ: 0.02
  }
]

const cloneSubstrateHardscapeAnchor = (
  anchor: SubstrateHardscapeAnchor
): SubstrateHardscapeAnchor => ({ ...anchor })

export const resolveSubstrateHardscapeAnchors = (
  layoutStyle: AquascapeLayoutStyle = 'planted'
): SubstrateHardscapeAnchor[] => (
  layoutStyle === 'nature-showcase'
    ? NATURE_SHOWCASE_SUBSTRATE_HARDSCAPE_ANCHORS
    : PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS
).map(cloneSubstrateHardscapeAnchor)
