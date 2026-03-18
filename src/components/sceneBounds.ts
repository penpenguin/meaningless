import * as THREE from 'three'
import {
  AQUARIUM_OPEN_WATER_MARGINS,
  AQUARIUM_TANK_DIMENSIONS,
  type AquariumTankDimensions
} from './aquariumLayout'

export type FishRenderExtents = Readonly<{
  noseExtent: number
  tailExtent: number
  halfBodyWidth: number
  halfBodyHeight: number
}>

export type FishAxisExtents = Readonly<{
  leftExtent: number
  rightExtent: number
  bottomExtent: number
  topExtent: number
  backExtent: number
  frontExtent: number
}>

const TANK_UP = new THREE.Vector3(0, 1, 0)
const FALLBACK_CROSS = new THREE.Vector3(0, 0, 1)

const resolveAxisExtent = (
  normal: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  up: THREE.Vector3,
  extents: FishRenderExtents
): number => {
  const forwardDot = normal.dot(forward)
  const forwardExtent = forwardDot >= 0
    ? forwardDot * extents.noseExtent
    : -forwardDot * extents.tailExtent

  return forwardExtent +
    (Math.abs(normal.dot(right)) * extents.halfBodyWidth) +
    (Math.abs(normal.dot(up)) * extents.halfBodyHeight)
}

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

export const resolveFishAxisExtents = (
  extents: FishRenderExtents,
  heading: THREE.Vector3
): FishAxisExtents => {
  const forward = heading.clone()
  if (forward.lengthSq() === 0) {
    forward.set(1, 0, 0)
  } else {
    forward.normalize()
  }

  const right = new THREE.Vector3().crossVectors(forward, TANK_UP)
  if (right.lengthSq() === 0) {
    right.crossVectors(forward, FALLBACK_CROSS)
  }
  right.normalize()

  const up = new THREE.Vector3().crossVectors(right, forward).normalize()

  return {
    leftExtent: resolveAxisExtent(new THREE.Vector3(-1, 0, 0), forward, right, up, extents),
    rightExtent: resolveAxisExtent(new THREE.Vector3(1, 0, 0), forward, right, up, extents),
    bottomExtent: resolveAxisExtent(new THREE.Vector3(0, -1, 0), forward, right, up, extents),
    topExtent: resolveAxisExtent(new THREE.Vector3(0, 1, 0), forward, right, up, extents),
    backExtent: resolveAxisExtent(new THREE.Vector3(0, 0, -1), forward, right, up, extents),
    frontExtent: resolveAxisExtent(new THREE.Vector3(0, 0, 1), forward, right, up, extents)
  }
}

export const createFishSafeBounds = (
  openWaterBounds: THREE.Box3,
  axisExtents: FishAxisExtents
): THREE.Box3 => new THREE.Box3(
  new THREE.Vector3(
    openWaterBounds.min.x + axisExtents.leftExtent,
    openWaterBounds.min.y + axisExtents.bottomExtent,
    openWaterBounds.min.z + axisExtents.backExtent
  ),
  new THREE.Vector3(
    openWaterBounds.max.x - axisExtents.rightExtent,
    openWaterBounds.max.y - axisExtents.topExtent,
    openWaterBounds.max.z - axisExtents.frontExtent
  )
)
