import { describe, expect, it } from 'vitest'
import { createOpenWaterBounds } from './sceneBounds'
import {
  AQUARIUM_OPEN_WATER_MARGINS,
  AQUARIUM_TANK_DIMENSIONS
} from './aquariumLayout'

describe('createOpenWaterBounds', () => {
  it('derives bounds from the shared tank dimensions and explicit clearances', () => {
    const bounds = createOpenWaterBounds(AQUARIUM_TANK_DIMENSIONS)

    expect(bounds.min.x).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.width / 2) + AQUARIUM_OPEN_WATER_MARGINS.glassSide)
    expect(bounds.max.x).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.width / 2) - AQUARIUM_OPEN_WATER_MARGINS.glassSide)
    expect(bounds.min.y).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.height / 2) + AQUARIUM_OPEN_WATER_MARGINS.substrateClearance)
    expect(bounds.max.y).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.height / 2) - AQUARIUM_OPEN_WATER_MARGINS.topClearance)
    expect(bounds.min.z).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.depth / 2) + AQUARIUM_OPEN_WATER_MARGINS.frontBack)
    expect(bounds.max.z).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.depth / 2) - AQUARIUM_OPEN_WATER_MARGINS.frontBack)
  })
})
