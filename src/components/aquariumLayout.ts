import * as THREE from 'three'

export type AquariumTankDimensions = Readonly<{
  width: number
  height: number
  depth: number
}>

export const AQUARIUM_TANK_DIMENSIONS: AquariumTankDimensions = {
  width: 16.8,
  height: 13.4,
  depth: 11.8
}

export const AQUARIUM_OPEN_WATER_MARGINS = {
  glassSide: 0.6,
  topClearance: 0.58,
  substrateClearance: 0.92,
  frontBack: 0.6
} as const

const standardCameraRatios = {
  y: 1 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 13.4 / AQUARIUM_TANK_DIMENSIONS.width
} as const

const standardTargetRatios = {
  y: -0.7 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 0.45 / AQUARIUM_TANK_DIMENSIONS.depth
} as const

const photoCameraRatios = {
  x: -2.1 / AQUARIUM_TANK_DIMENSIONS.width,
  y: 1.85 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 11.4 / AQUARIUM_TANK_DIMENSIONS.width
} as const

const photoTargetRatios = {
  x: 0.81 / AQUARIUM_TANK_DIMENSIONS.width,
  y: -0.35 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 0.15 / AQUARIUM_TANK_DIMENSIONS.depth
} as const

export const AQUARIUM_CAMERA_FRAMING = {
  standardFov: 47
} as const

export const resolveDefaultCameraPosition = (
  dimensions: AquariumTankDimensions
): THREE.Vector3 => (
  new THREE.Vector3(
    0,
    dimensions.height * standardCameraRatios.y,
    dimensions.width * standardCameraRatios.z
  )
)

export const resolveDefaultControlsTarget = (
  dimensions: AquariumTankDimensions
): THREE.Vector3 => (
  new THREE.Vector3(
    0,
    dimensions.height * standardTargetRatios.y,
    dimensions.depth * standardTargetRatios.z
  )
)

export const resolvePhotoModeCameraPosition = (
  dimensions: AquariumTankDimensions
): THREE.Vector3 => (
  new THREE.Vector3(
    dimensions.width * photoCameraRatios.x,
    dimensions.height * photoCameraRatios.y,
    dimensions.width * photoCameraRatios.z
  )
)

export const resolvePhotoModeControlsTarget = (
  dimensions: AquariumTankDimensions
): THREE.Vector3 => (
  new THREE.Vector3(
    dimensions.width * photoTargetRatios.x,
    dimensions.height * photoTargetRatios.y,
    dimensions.depth * photoTargetRatios.z
  )
)
