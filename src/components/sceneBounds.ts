import * as THREE from 'three'
import {
  AQUARIUM_OPEN_WATER_MARGINS,
  AQUARIUM_TANK_DIMENSIONS,
  type AquariumTankDimensions
} from './aquariumLayout'

export const createOpenWaterBounds = (
  dimensions: AquariumTankDimensions = AQUARIUM_TANK_DIMENSIONS
): THREE.Box3 => {
  const halfWidth = dimensions.width / 2
  const halfHeight = dimensions.height / 2
  const halfDepth = dimensions.depth / 2

  return new THREE.Box3(
    new THREE.Vector3(
      -halfWidth + AQUARIUM_OPEN_WATER_MARGINS.glassSide,
      -halfHeight + AQUARIUM_OPEN_WATER_MARGINS.substrateClearance,
      -halfDepth + AQUARIUM_OPEN_WATER_MARGINS.frontBack
    ),
    new THREE.Vector3(
      halfWidth - AQUARIUM_OPEN_WATER_MARGINS.glassSide,
      halfHeight - AQUARIUM_OPEN_WATER_MARGINS.topClearance,
      halfDepth - AQUARIUM_OPEN_WATER_MARGINS.frontBack
    )
  )
}
