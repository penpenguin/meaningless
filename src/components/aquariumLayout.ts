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

type AquariumCameraFitRatios = Readonly<{
  x: number
  y: number
  widthCoverage: number
}>

type AquariumCameraFitOptions = Readonly<{
  aspect: number
  fov: number
  target: THREE.Vector3
  x: number
  y: number
  widthCoverage: number
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

export const AQUARIUM_FRONT_GLASS_THICKNESS = 0.06

const standardAspectRatio = 16 / 9
const cameraFitIterations = 24
const minFrontGlassCameraClearance = 0.6

const standardCameraFitRatios = {
  x: 0,
  y: 1 / AQUARIUM_TANK_DIMENSIONS.height,
  widthCoverage: 0.82
} as const satisfies AquariumCameraFitRatios

const standardTargetRatios = {
  y: -0.7 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 0.45 / AQUARIUM_TANK_DIMENSIONS.depth
} as const

const photoCameraFitRatios = {
  x: -2.1 / AQUARIUM_TANK_DIMENSIONS.width,
  y: 1.85 / AQUARIUM_TANK_DIMENSIONS.height,
  widthCoverage: 0.855
} as const satisfies AquariumCameraFitRatios

const photoTargetRatios = {
  x: 0.81 / AQUARIUM_TANK_DIMENSIONS.width,
  y: -0.35 / AQUARIUM_TANK_DIMENSIONS.height,
  z: 0.15 / AQUARIUM_TANK_DIMENSIONS.depth
} as const

export const AQUARIUM_CAMERA_FRAMING = {
  standardFov: 47,
  standardAspect: standardAspectRatio,
  defaultWidthCoverage: standardCameraFitRatios.widthCoverage,
  photoWidthCoverage: photoCameraFitRatios.widthCoverage
} as const

export const AQUARIUM_DEPTH_LAYER_ANCHORS = {
  backdrop: {
    x: 0,
    y: -0.08,
    z: -0.5 + (0.08 / AQUARIUM_TANK_DIMENSIONS.depth)
  },
  backdropOverlay: {
    x: 0,
    y: -0.09,
    z: -0.5 + (0.16 / AQUARIUM_TANK_DIMENSIONS.depth)
  },
  midground: {
    x: 0,
    y: -0.09,
    z: -0.22
  },
  foregroundShadow: {
    x: 0,
    y: 0.03,
    z: 0.26
  }
} as const satisfies Record<
  'backdrop' | 'backdropOverlay' | 'midground' | 'foregroundShadow',
  TankRelativeAnchor
>

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

const resolveProjectedFrontGlassCoverage = (
  camera: THREE.PerspectiveCamera,
  dimensions: AquariumTankDimensions
): number => {
  const frontGlassZ = (dimensions.depth / 2) + AQUARIUM_FRONT_GLASS_THICKNESS
  const leftEdge = new THREE.Vector3(-dimensions.width / 2, 0, frontGlassZ).project(camera)
  const rightEdge = new THREE.Vector3(dimensions.width / 2, 0, frontGlassZ).project(camera)
  return Math.abs(rightEdge.x - leftEdge.x) / 2
}

const resolveFitDrivenCameraPosition = (
  dimensions: AquariumTankDimensions,
  options: AquariumCameraFitOptions
): THREE.Vector3 => {
  const safeAspect = Math.max(options.aspect, 0.1)
  const widthCoverage = THREE.MathUtils.clamp(options.widthCoverage, 0.1, 0.98)
  const positionX = dimensions.width * options.x
  const positionY = dimensions.height * options.y
  const frontGlassZ = (dimensions.depth / 2) + AQUARIUM_FRONT_GLASS_THICKNESS
  const verticalFovRadians = THREE.MathUtils.degToRad(options.fov)
  const horizontalFovRadians = 2 * Math.atan(Math.tan(verticalFovRadians / 2) * safeAspect)
  const estimatedDistance =
    dimensions.width / (widthCoverage * 2 * Math.tan(horizontalFovRadians / 2))
  const camera = new THREE.PerspectiveCamera(options.fov, safeAspect, 0.1, 1000)

  const getCoverage = (positionZ: number): number => {
    camera.position.set(positionX, positionY, positionZ)
    camera.lookAt(options.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    return resolveProjectedFrontGlassCoverage(camera, dimensions)
  }

  let nearZ = frontGlassZ + Math.max(minFrontGlassCameraClearance, dimensions.depth * 0.06)
  let nearCoverage = getCoverage(nearZ)

  for (let contraction = 0; contraction < 8 && nearCoverage < widthCoverage; contraction += 1) {
    nearZ = frontGlassZ + Math.max((nearZ - frontGlassZ) * 0.7, 0.15)
    nearCoverage = getCoverage(nearZ)
  }

  let farZ = frontGlassZ + Math.max(estimatedDistance * 1.35, dimensions.width)
  let farCoverage = getCoverage(farZ)

  for (let expansion = 0; expansion < 8 && farCoverage > widthCoverage; expansion += 1) {
    farZ = frontGlassZ + ((farZ - frontGlassZ) * 1.35)
    farCoverage = getCoverage(farZ)
  }

  for (let iteration = 0; iteration < cameraFitIterations; iteration += 1) {
    const midZ = (nearZ + farZ) / 2
    const coverage = getCoverage(midZ)

    if (coverage > widthCoverage) {
      nearZ = midZ
    } else {
      farZ = midZ
    }
  }

  return new THREE.Vector3(positionX, positionY, farZ)
}

export const resolveDefaultControlsTarget = (
  dimensions: AquariumTankDimensions
): THREE.Vector3 => (
  new THREE.Vector3(
    0,
    dimensions.height * standardTargetRatios.y,
    dimensions.depth * standardTargetRatios.z
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

export const resolveDefaultCameraPosition = (
  dimensions: AquariumTankDimensions,
  fov = AQUARIUM_CAMERA_FRAMING.standardFov,
  aspect = AQUARIUM_CAMERA_FRAMING.standardAspect
): THREE.Vector3 => (
  resolveFitDrivenCameraPosition(dimensions, {
    aspect,
    fov,
    target: resolveDefaultControlsTarget(dimensions),
    ...standardCameraFitRatios
  })
)

export const resolvePhotoModeCameraPosition = (
  dimensions: AquariumTankDimensions,
  fov = AQUARIUM_CAMERA_FRAMING.standardFov,
  aspect = AQUARIUM_CAMERA_FRAMING.standardAspect
): THREE.Vector3 => (
  resolveFitDrivenCameraPosition(dimensions, {
    aspect,
    fov,
    target: resolvePhotoModeControlsTarget(dimensions),
    ...photoCameraFitRatios
  })
)
