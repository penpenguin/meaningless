import { describe, expect, it } from 'vitest'
import {
  NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS,
  PLANTED_PLANT_CLUSTER_DEFINITIONS,
  resolvePlantClusterDefinitions,
  resolveSampledPlantPlacements
} from './aquascapePlants'

const positionKey = (x: number, z: number): string => `${x.toFixed(3)}:${z.toFixed(3)}`

describe('aquascape plant layout data', () => {
  it('exports planted and nature-showcase plant zones as authored layout presets', () => {
    expect(PLANTED_PLANT_CLUSTER_DEFINITIONS.map((zone) => zone.id)).toEqual([
      'front-left',
      'left-rear',
      'left-shoulder',
      'front-center',
      'mid-right-backfill',
      'right-rear'
    ])
    expect(NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS.map((zone) => zone.id)).toEqual([
      'left-rear',
      'left-mid-broadleaf',
      'center-left-fern-mass',
      'right-mid-crypt',
      'right-rear',
      'left-foot'
    ])
  })

  it('resolves cloned zone definitions so sampling callers cannot mutate presets', () => {
    const zones = resolvePlantClusterDefinitions('nature-showcase')
    zones[0]!.x = 99
    zones[0]!.scale.x = 99

    expect(NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS[0]!.x).toBe(-0.356)
    expect(NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS[0]!.scale.x).toBeCloseTo(0.8)
    expect(resolvePlantClusterDefinitions('nature-showcase')[0]!.x).toBe(-0.356)
  })

  it('keeps sampled plant placement deterministic and layout-specific', () => {
    const plantedA = resolveSampledPlantPlacements('planted', 0x1144aa22)
    const plantedARepeat = resolveSampledPlantPlacements('planted', 0x1144aa22)
    const showcase = resolveSampledPlantPlacements('nature-showcase', 0x1144aa22)

    expect(plantedA.map((placement) => positionKey(placement.x, placement.z))).toEqual(
      plantedARepeat.map((placement) => positionKey(placement.x, placement.z))
    )
    expect(new Set(showcase.map((placement) => placement.zoneId))).toEqual(new Set([
      'left-rear',
      'left-mid-broadleaf',
      'center-left-fern-mass',
      'right-mid-crypt',
      'right-rear',
      'left-foot'
    ]))
    expect(showcase.map((placement) => positionKey(placement.x, placement.z))).not.toEqual(
      plantedA.map((placement) => positionKey(placement.x, placement.z))
    )
  })
})
