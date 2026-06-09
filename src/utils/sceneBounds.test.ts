import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  createFishSafeBounds,
  createOpenWaterBounds,
  resolveFishAxisExtents
} from './sceneBounds'
import {
  AQUARIUM_OPEN_WATER_MARGINS,
  AQUARIUM_TANK_DIMENSIONS
} from './aquariumLayout'

describe('createOpenWaterBounds', () => {
  it('derives bounds from the shared tank dimensions and explicit clearances', () => {
    const bounds = createOpenWaterBounds(AQUARIUM_TANK_DIMENSIONS)
    const frontAspect = AQUARIUM_TANK_DIMENSIONS.width / AQUARIUM_TANK_DIMENSIONS.height
    const openWaterSize = bounds.getSize(bounds.max.clone().sub(bounds.min))

    expect(bounds.min.x).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.width / 2) + AQUARIUM_OPEN_WATER_MARGINS.glassSide)
    expect(bounds.max.x).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.width / 2) - AQUARIUM_OPEN_WATER_MARGINS.glassSide)
    expect(bounds.min.y).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.height / 2) + AQUARIUM_OPEN_WATER_MARGINS.substrateClearance)
    expect(bounds.max.y).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.height / 2) - AQUARIUM_OPEN_WATER_MARGINS.topClearance)
    expect(bounds.min.z).toBeCloseTo(-(AQUARIUM_TANK_DIMENSIONS.depth / 2) + AQUARIUM_OPEN_WATER_MARGINS.frontBack)
    expect(bounds.max.z).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.depth / 2) - AQUARIUM_OPEN_WATER_MARGINS.frontBack)
    expect(frontAspect).toBeGreaterThan(1.55)
    expect(frontAspect).toBeLessThan(1.65)
    expect(openWaterSize.x).toBeGreaterThan(openWaterSize.y)
    expect(openWaterSize.y).toBeGreaterThan(openWaterSize.z)
  })
})

describe('createFishSafeBounds', () => {
  it('shrinks open-water bounds using render extents projected onto the tank axes', () => {
    const openWaterBounds = createOpenWaterBounds(AQUARIUM_TANK_DIMENSIONS)
    const axisExtents = resolveFishAxisExtents(
      {
        noseExtent: 1.2,
        tailExtent: 0.8,
        halfBodyWidth: 0.4,
        halfBodyHeight: 0.6
      },
      new THREE.Vector3(0, 0, 1)
    )
    const safeBounds = createFishSafeBounds(openWaterBounds, axisExtents)

    expect(safeBounds.min.x).toBeCloseTo(openWaterBounds.min.x + 0.4)
    expect(safeBounds.max.x).toBeCloseTo(openWaterBounds.max.x - 0.4)
    expect(safeBounds.min.y).toBeCloseTo(openWaterBounds.min.y + 0.6)
    expect(safeBounds.max.y).toBeCloseTo(openWaterBounds.max.y - 0.6)
    expect(safeBounds.min.z).toBeCloseTo(openWaterBounds.min.z + 0.8)
    expect(safeBounds.max.z).toBeCloseTo(openWaterBounds.max.z - 1.2)
  })
})
