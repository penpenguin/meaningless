import * as THREE from 'three'

export type AquariumTankDimensions = Readonly<{
  width: number
  height: number
  depth: number
}>

export type TankRelativeAnchor = Readonly<{
  x: number
  z: number
  y?: number
  topClearance?: number
  bottomClearance?: number
}>

export type TankRelativeOffset = Readonly<{
  x: number
  y: number
  z: number
}>

export type AquariumMainLightRig = Readonly<{
  positions: Readonly<Record<'sun' | 'fill' | 'bounce' | 'rim', TankRelativeOffset>>
  targets: Readonly<Record<'sun' | 'fill' | 'rim', TankRelativeOffset>>
  shadowFrustumRatios: Readonly<{
    left: number
    right: number
    top: number
    bottom: number
  }>
  shadowCameraRange: Readonly<{
    near: number
    far: number
  }>
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

export const MAIN_LIGHT_RIG_ANCHORS = {
  sun: {
    x: 0.15,
    y: 1.03,
    z: 0.37
  },
  fill: {
    x: -0.6,
    y: 0.5,
    z: 0.75
  },
  bounce: {
    x: 0.05,
    y: -0.18,
    z: 0.1
  },
  rim: {
    x: -0.13,
    y: 0.39,
    z: -1.14
  }
} as const satisfies Record<'sun' | 'fill' | 'bounce' | 'rim', TankRelativeOffset>

export const MAIN_LIGHT_TARGET_OFFSETS = {
  sun: {
    x: 0.8 / AQUARIUM_TANK_DIMENSIONS.width,
    y: 0.35 / AQUARIUM_TANK_DIMENSIONS.height,
    z: -0.25 / AQUARIUM_TANK_DIMENSIONS.depth
  },
  fill: {
    x: 0,
    y: 0,
    z: 0
  },
  rim: {
    x: 0,
    y: 0,
    z: 0
  }
} as const satisfies Record<'sun' | 'fill' | 'rim', TankRelativeOffset>

export const PRIMARY_SHADOW_FRUSTUM_RATIOS = {
  left: -11.8 / AQUARIUM_TANK_DIMENSIONS.width,
  right: 11.8 / AQUARIUM_TANK_DIMENSIONS.width,
  top: 10.7 / AQUARIUM_TANK_DIMENSIONS.height,
  bottom: -9.7 / AQUARIUM_TANK_DIMENSIONS.height
} as const

export const PRIMARY_SHADOW_CAMERA_RANGE = {
  near: 0.5,
  far: 44
} as const

export const AQUARIUM_MAIN_LIGHT_RIG: AquariumMainLightRig = {
  positions: MAIN_LIGHT_RIG_ANCHORS,
  targets: MAIN_LIGHT_TARGET_OFFSETS,
  shadowFrustumRatios: PRIMARY_SHADOW_FRUSTUM_RATIOS,
  shadowCameraRange: PRIMARY_SHADOW_CAMERA_RANGE
}

export const resolveTankRelativePosition = (
  dimensions: AquariumTankDimensions,
  anchor: TankRelativeAnchor
): THREE.Vector3 => {
  const { width, height, depth } = dimensions
  const y =
    anchor.topClearance !== undefined
      ? (height / 2) - (height * anchor.topClearance)
      : anchor.bottomClearance !== undefined
        ? (-height / 2) + (height * anchor.bottomClearance)
        : height * (anchor.y ?? 0)

  return new THREE.Vector3(width * anchor.x, y, depth * anchor.z)
}

export const resolveTankRelativeOffset = (
  dimensions: AquariumTankDimensions,
  offset: TankRelativeOffset
): THREE.Vector3 => (
  new THREE.Vector3(
    dimensions.width * offset.x,
    dimensions.height * offset.y,
    dimensions.depth * offset.z
  )
)

export const resolveLightTarget = (
  dimensions: AquariumTankDimensions,
  controlsTarget: THREE.Vector3,
  offset: TankRelativeOffset
): THREE.Vector3 => (
  controlsTarget.clone().add(resolveTankRelativeOffset(dimensions, offset))
)

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
