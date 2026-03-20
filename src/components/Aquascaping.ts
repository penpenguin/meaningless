import * as THREE from 'three'
import type { LoadedModelAsset, VisualAssetBundle } from '../assets/visualAssets'
import type { AquascapeLayoutStyle, Theme } from '../types/aquarium'

type PlantLayer = 'foreground' | 'background' | 'midground'
type PlantType =
  | 'ribbon-seaweed'
  | 'sword-leaf'
  | 'fan-leaf'
  | 'javafern-large'
  | 'javafern-narrow'
  | 'anubias-nana-clump'
  | 'anubias-petite-clump'
  | 'crypt-brown'
  | 'stem-green-bush'
  | 'vallisneria-tall'
  | 'hygrophila-rear'
type PlantRenderRole = 'hero' | 'repeated'
type PlantClusterKind = 'core' | 'satellite' | 'offshoot'
type PlantMassRole =
  | 'branch-crotch'
  | 'front-left-edge'
  | 'front-left'
  | 'left-rear'
  | 'left-shoulder'
  | 'left-foot'
  | 'driftwood-backfill'
  | 'mid-right-backfill'
  | 'right-rear'
  | 'rock-crevice'
  | 'root-flare'
  | 'front-center'
  | 'front-right'
  | 'front-right-edge'

type PlantMixEntry = {
  plantType: PlantType
  weight: number
}

type PlantRadiusBand = [number, number]

type PlantClusterDefinition = {
  id: string
  x: number
  z: number
  layer: PlantLayer
  massRole: PlantMassRole
  plantType: PlantType
  baseHeight: number
  spreadX: number
  spreadZ: number
  hueBase: number
  rotationY: number
  scale: THREE.Vector3
  heightMin: number
  heightMax: number
  coreCount: number
  satelliteCount: number
  offshootCount: number
  coreRadius: PlantRadiusBand
  satelliteRadius: PlantRadiusBand
  offshootRadius: PlantRadiusBand
  minDistance: number
  depthLaneCount: number
  plantMix?: PlantMixEntry[]
  assetIds?: string[]
}

type PlantScatterDefinition = Pick<
  PlantClusterDefinition,
  'x' | 'z' | 'layer' | 'plantType' | 'baseHeight' | 'spreadX' | 'spreadZ' | 'hueBase'
>

type SampledPlantPlacement = {
  id: string
  zoneId: string
  massRole: PlantMassRole
  layer: PlantLayer
  plantType: PlantType
  clusterKind: PlantClusterKind
  x: number
  z: number
  baseHeight: number
  hueBase: number
  rotationY: number
  tiltX: number
  tiltZ: number
  depthLane: number
  scale: THREE.Vector3
  assetIds?: string[]
}

type AquascapingOptions = {
  layoutStyle?: AquascapeLayoutStyle
}

type DriftwoodTubeDefinition = {
  radius: number
  points: THREE.Vector3[]
  tubularSegments: number
  radialSegments: number
  ellipseAspect: number
  tipScale: number
  flare: number
  twist: number
  barkAmplitude: number
}

type DriftwoodSecondaryAssetDefinition = {
  id: 'driftwood-secondary-a' | 'driftwood-secondary-b' | 'driftwood-secondary-c'
  position: THREE.Vector3
  rotation: THREE.Euler
  sizeRatio: THREE.Vector3
  buryAmount: number
  pieceRole: 'bridge' | 'counter-fork' | 'uplift-fork'
}

type RockClusterShape = 'icosahedron' | 'octahedron' | 'dodecahedron'

type RockClusterPieceDefinition = {
  geometry: RockClusterShape
  radius: number
  detail: number
  offset: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  color: string
  seed: number
  role: 'support-rock-piece' | 'support-rock-chip' | 'support-rock-pebble'
}

type SupportRockClusterElementRole = 'support-rock' | 'support-rock-chip' | 'support-rock-scatter'

type SupportRockClusterElementDefinition = {
  role: SupportRockClusterElementRole
  assetIds: string[]
  offset: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  burialRatio: number
  fallbackPieceDefinitions?: RockClusterPieceDefinition[]
  fallbackPebbleSeed?: number
  fallbackPebbleColors?: string[]
}

type SupportRockClusterDefinition = {
  side: 'left' | 'right'
  position: THREE.Vector3
  elements: SupportRockClusterElementDefinition[]
}

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

export type SubstratePlantAnchor = {
  id: string
  x: number
  z: number
  layer: 'foreground' | 'background' | 'midground'
  radiusX: number
  radiusZ: number
  moundHeight: number
  scoopDepth: number
  scoopBiasX: number
  scoopBiasZ: number
}

type PlantSilhouetteFamily = 'ribbon' | 'strap' | 'broad'
type HardscapePlantHost = 'driftwood' | 'rock'

export type HardscapePlantAnchor = {
  id: string
  host: HardscapePlantHost
  massRole: PlantMassRole
  layer: PlantLayer
  plantType: Exclude<PlantType, 'ribbon-seaweed'>
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  height: number
  hueBase: number
  assetIds?: string[]
}

const getPlantSilhouetteFamily = (plantType: PlantType): PlantSilhouetteFamily => {
  switch (plantType) {
    case 'ribbon-seaweed':
    case 'vallisneria-tall':
      return 'ribbon'
    case 'sword-leaf':
    case 'javafern-narrow':
    case 'crypt-brown':
    case 'stem-green-bush':
    case 'hygrophila-rear':
      return 'strap'
    case 'fan-leaf':
    case 'javafern-large':
    case 'anubias-nana-clump':
    case 'anubias-petite-clump':
      return 'broad'
  }
}

const cloneHardscapePlantAnchor = (anchor: HardscapePlantAnchor): HardscapePlantAnchor => ({
  ...anchor,
  position: anchor.position.clone(),
  rotation: anchor.rotation.clone(),
  scale: anchor.scale.clone(),
  assetIds: anchor.assetIds ? [...anchor.assetIds] : undefined
})

export const plantClusterDefinitions: PlantClusterDefinition[] = [
  {
    id: 'front-left',
    x: -0.26,
    z: 0.18,
    layer: 'foreground',
    massRole: 'front-left',
    plantType: 'anubias-petite-clump',
    baseHeight: 1.18,
    spreadX: 0.18,
    spreadZ: 0.12,
    hueBase: 0.27,
    rotationY: -0.18,
    scale: new THREE.Vector3(0.62, 0.58, 0.68),
    heightMin: 0.82,
    heightMax: 1.24,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.02, 0.1],
    satelliteRadius: [0.12, 0.3],
    offshootRadius: [0.3, 0.5],
    minDistance: 0.052,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'anubias-petite-clump', weight: 0.76 },
      { plantType: 'anubias-nana-clump', weight: 0.24 }
    ],
    assetIds: ['plant-anubias-petite-clump', 'plant-anubias-nana-clump']
  },
  {
    id: 'left-rear',
    x: -0.34,
    z: -0.25,
    layer: 'background',
    massRole: 'left-rear',
    plantType: 'vallisneria-tall',
    baseHeight: 10.18,
    spreadX: 0.38,
    spreadZ: 0.26,
    hueBase: 0.245,
    rotationY: -0.34,
    scale: new THREE.Vector3(1.18, 2.68, 1.06),
    heightMin: 9.24,
    heightMax: 10.92,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.04, 0.18],
    satelliteRadius: [0.22, 0.58],
    offshootRadius: [0.54, 0.94],
    minDistance: 0.064,
    depthLaneCount: 4,
    plantMix: [
      { plantType: 'vallisneria-tall', weight: 0.66 },
      { plantType: 'hygrophila-rear', weight: 0.1 },
      { plantType: 'stem-green-bush', weight: 0.24 }
    ],
    assetIds: ['plant-vallisneria-tall', 'plant-stem-green-bush', 'plant-hygrophila-rear']
  },
  {
    id: 'left-shoulder',
    x: -0.2,
    z: -0.04,
    layer: 'midground',
    massRole: 'left-shoulder',
    plantType: 'javafern-large',
    baseHeight: 4.92,
    spreadX: 0.24,
    spreadZ: 0.18,
    hueBase: 0.29,
    rotationY: -0.12,
    scale: new THREE.Vector3(0.96, 1.14, 1),
    heightMin: 3.86,
    heightMax: 5.42,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.16, 0.38],
    offshootRadius: [0.36, 0.66],
    minDistance: 0.058,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'javafern-large', weight: 0.54 },
      { plantType: 'javafern-narrow', weight: 0.2 },
      { plantType: 'anubias-nana-clump', weight: 0.26 }
    ],
    assetIds: ['plant-javafern-large', 'plant-javafern-narrow', 'plant-anubias-nana-clump']
  },
  {
    id: 'front-center',
    x: -0.02,
    z: 0.02,
    layer: 'midground',
    massRole: 'front-center',
    plantType: 'javafern-large',
    baseHeight: 4.12,
    spreadX: 0.22,
    spreadZ: 0.16,
    hueBase: 0.305,
    rotationY: 0.06,
    scale: new THREE.Vector3(0.86, 0.98, 0.88),
    heightMin: 3.34,
    heightMax: 4.84,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 1,
    coreRadius: [0.03, 0.16],
    satelliteRadius: [0.16, 0.34],
    offshootRadius: [0.3, 0.54],
    minDistance: 0.056,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'javafern-large', weight: 0.42 },
      { plantType: 'javafern-narrow', weight: 0.32 },
      { plantType: 'anubias-nana-clump', weight: 0.26 }
    ],
    assetIds: ['plant-javafern-large', 'plant-javafern-narrow', 'plant-anubias-nana-clump']
  },
  {
    id: 'mid-right-backfill',
    x: 0.18,
    z: -0.08,
    layer: 'midground',
    massRole: 'mid-right-backfill',
    plantType: 'crypt-brown',
    baseHeight: 4.08,
    spreadX: 0.2,
    spreadZ: 0.16,
    hueBase: 0.072,
    rotationY: 0.2,
    scale: new THREE.Vector3(0.86, 1.04, 0.8),
    heightMin: 2.84,
    heightMax: 5.42,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.14, 0.34],
    offshootRadius: [0.28, 0.5],
    minDistance: 0.056,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'crypt-brown', weight: 0.74 },
      { plantType: 'anubias-nana-clump', weight: 0.26 }
    ],
    assetIds: ['plant-crypt-brown', 'plant-anubias-nana-clump']
  },
  {
    id: 'right-rear',
    x: 0.28,
    z: -0.18,
    layer: 'background',
    massRole: 'right-rear',
    plantType: 'crypt-brown',
    baseHeight: 6.12,
    spreadX: 0.2,
    spreadZ: 0.16,
    hueBase: 0.065,
    rotationY: 0.24,
    scale: new THREE.Vector3(0.82, 1.28, 0.8),
    heightMin: 4.96,
    heightMax: 6.82,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.14, 0.3],
    offshootRadius: [0.28, 0.48],
    minDistance: 0.062,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'crypt-brown', weight: 0.78 },
      { plantType: 'anubias-nana-clump', weight: 0.22 }
    ],
    assetIds: ['plant-crypt-brown', 'plant-anubias-nana-clump']
  }
]

const natureShowcasePlantClusterDefinitions: PlantClusterDefinition[] = [
  {
    id: 'left-rear',
    x: -0.37,
    z: -0.22,
    layer: 'background',
    massRole: 'left-rear',
    plantType: 'vallisneria-tall',
    baseHeight: 7.62,
    spreadX: 0.24,
    spreadZ: 0.18,
    hueBase: 0.244,
    rotationY: -0.4,
    scale: new THREE.Vector3(0.94, 1.86, 0.9),
    heightMin: 6.84,
    heightMax: 8.18,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 1,
    coreRadius: [0.03, 0.16],
    satelliteRadius: [0.16, 0.36],
    offshootRadius: [0.34, 0.62],
    minDistance: 0.062,
    depthLaneCount: 4,
    plantMix: [
      { plantType: 'vallisneria-tall', weight: 0.54 },
      { plantType: 'stem-green-bush', weight: 0.46 }
    ],
    assetIds: ['plant-vallisneria-tall', 'plant-stem-green-bush']
  },
  {
    id: 'left-shoulder',
    x: -0.26,
    z: -0.04,
    layer: 'midground',
    massRole: 'left-shoulder',
    plantType: 'javafern-large',
    baseHeight: 5.82,
    spreadX: 0.24,
    spreadZ: 0.18,
    hueBase: 0.284,
    rotationY: -0.28,
    scale: new THREE.Vector3(0.96, 1.18, 0.9),
    heightMin: 4.84,
    heightMax: 6.26,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.16, 0.36],
    offshootRadius: [0.3, 0.54],
    minDistance: 0.058,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'javafern-large', weight: 0.38 },
      { plantType: 'javafern-narrow', weight: 0.3 },
      { plantType: 'anubias-nana-clump', weight: 0.32 }
    ],
    assetIds: ['plant-javafern-large', 'plant-javafern-narrow', 'plant-anubias-nana-clump']
  },
  {
    id: 'left-foot',
    x: -0.16,
    z: 0.14,
    layer: 'foreground',
    massRole: 'left-foot',
    plantType: 'anubias-petite-clump',
    baseHeight: 1.34,
    spreadX: 0.12,
    spreadZ: 0.08,
    hueBase: 0.258,
    rotationY: -0.06,
    scale: new THREE.Vector3(0.58, 0.54, 0.56),
    heightMin: 0.92,
    heightMax: 1.42,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.02, 0.08],
    satelliteRadius: [0.1, 0.2],
    offshootRadius: [0.24, 0.36],
    minDistance: 0.05,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'anubias-petite-clump', weight: 0.72 },
      { plantType: 'anubias-nana-clump', weight: 0.28 }
    ],
    assetIds: ['plant-anubias-petite-clump', 'plant-anubias-nana-clump']
  },
  {
    id: 'front-center',
    x: -0.04,
    z: 0.1,
    layer: 'foreground',
    massRole: 'front-center',
    plantType: 'anubias-petite-clump',
    baseHeight: 1.18,
    spreadX: 0.1,
    spreadZ: 0.08,
    hueBase: 0.262,
    rotationY: 0.08,
    scale: new THREE.Vector3(0.54, 0.5, 0.52),
    heightMin: 0.82,
    heightMax: 1.24,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.02, 0.07],
    satelliteRadius: [0.08, 0.16],
    offshootRadius: [0.18, 0.28],
    minDistance: 0.048,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'anubias-petite-clump', weight: 0.74 },
      { plantType: 'anubias-nana-clump', weight: 0.26 }
    ],
    assetIds: ['plant-anubias-petite-clump', 'plant-anubias-nana-clump']
  },
  {
    id: 'mid-right-backfill',
    x: 0.08,
    z: -0.02,
    layer: 'midground',
    massRole: 'mid-right-backfill',
    plantType: 'crypt-brown',
    baseHeight: 3.42,
    spreadX: 0.14,
    spreadZ: 0.12,
    hueBase: 0.07,
    rotationY: 0.16,
    scale: new THREE.Vector3(0.66, 0.8, 0.64),
    heightMin: 2.72,
    heightMax: 4.08,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.14, 0.26],
    offshootRadius: [0.26, 0.38],
    minDistance: 0.056,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'crypt-brown', weight: 0.76 },
      { plantType: 'anubias-nana-clump', weight: 0.24 }
    ],
    assetIds: ['plant-crypt-brown', 'plant-anubias-nana-clump']
  },
  {
    id: 'right-rear',
    x: 0.12,
    z: -0.16,
    layer: 'background',
    massRole: 'right-rear',
    plantType: 'crypt-brown',
    baseHeight: 4.46,
    spreadX: 0.12,
    spreadZ: 0.12,
    hueBase: 0.068,
    rotationY: 0.22,
    scale: new THREE.Vector3(0.66, 0.96, 0.64),
    heightMin: 3.84,
    heightMax: 5.04,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.12, 0.26],
    offshootRadius: [0.24, 0.34],
    minDistance: 0.058,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'crypt-brown', weight: 0.8 },
      { plantType: 'anubias-nana-clump', weight: 0.2 }
    ],
    assetIds: ['plant-crypt-brown', 'plant-anubias-nana-clump']
  }
]

const plantedPlacementSeed = 0x53a9d2f1
const plantedPlacementBounds = {
  minX: -0.46,
  maxX: 0.46,
  minZ: -0.42,
  maxZ: 0.24
}

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state += 0x6D2B79F5
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const hashSeed = (seed: number, input: string): number => {
  let hashed = seed >>> 0

  for (let index = 0; index < input.length; index += 1) {
    hashed = Math.imul(hashed ^ input.charCodeAt(index), 16777619)
  }

  return hashed >>> 0
}

const clampNormalizedPlantX = (value: number): number => (
  THREE.MathUtils.clamp(value, plantedPlacementBounds.minX, plantedPlacementBounds.maxX)
)

const clampNormalizedPlantZ = (value: number): number => (
  THREE.MathUtils.clamp(value, plantedPlacementBounds.minZ, plantedPlacementBounds.maxZ)
)

const sampleRange = (rng: () => number, min: number, max: number): number => (
  min + ((max - min) * rng())
)

const sampleRadiusInBand = (
  rng: () => number,
  band: PlantRadiusBand
): number => Math.sqrt(sampleRange(rng, band[0] ** 2, band[1] ** 2))

const resolveZoneDefinitionSet = (
  layoutStyle: AquascapeLayoutStyle = 'planted'
): PlantClusterDefinition[] => (
  layoutStyle === 'nature-showcase'
    ? natureShowcasePlantClusterDefinitions
    : plantClusterDefinitions
)

const getPlacementHueOffset = (plantType: PlantType): number => {
  switch (plantType) {
    case 'ribbon-seaweed':
      return -0.018
    case 'vallisneria-tall':
      return -0.02
    case 'stem-green-bush':
    case 'hygrophila-rear':
      return -0.004
    case 'javafern-large':
      return -0.012
    case 'javafern-narrow':
      return -0.016
    case 'anubias-nana-clump':
      return -0.01
    case 'anubias-petite-clump':
      return -0.014
    case 'crypt-brown':
      return 0.055
    case 'fan-leaf':
      return 0.008
    case 'sword-leaf':
      return -0.006
  }
}

const pickPlantTypeFromMix = (
  zone: PlantClusterDefinition,
  rng: () => number,
  clusterKind: PlantClusterKind,
  index: number
): PlantType => {
  if (zone.layer === 'foreground' || !zone.plantMix?.length) {
    return zone.plantType
  }

  if (clusterKind === 'core') {
    return zone.plantType
  }

  if (clusterKind === 'offshoot' && zone.plantMix.length > 1) {
    return zone.plantMix[zone.plantMix.length - 1]!.plantType
  }

  if (clusterKind === 'satellite' && zone.plantMix.length > 1 && index % 2 === 1) {
    return zone.plantMix[zone.plantMix.length - 1]!.plantType
  }

  const weightedMix = clusterKind === 'offshoot' && zone.plantMix.length > 1
    ? zone.plantMix.map((entry, entryIndex) => ({
      plantType: entry.plantType,
      weight: entry.weight * (entryIndex === 0 ? 0.58 : 1.42)
    }))
    : clusterKind === 'satellite' && zone.plantMix.length > 1
      ? zone.plantMix.map((entry, entryIndex) => ({
        plantType: entry.plantType,
        weight: entry.weight * (entryIndex === 0 ? 0.82 : 1.18)
      }))
      : zone.plantMix

  const totalWeight = weightedMix.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = rng() * totalWeight

  for (const entry of weightedMix) {
    cursor -= entry.weight
    if (cursor <= 0) {
      return entry.plantType
    }
  }

  return weightedMix[weightedMix.length - 1]!.plantType
}

const createPlacementScale = (
  zone: PlantClusterDefinition,
  rng: () => number,
  clusterKind: PlantClusterKind
): THREE.Vector3 => {
  const scaleBand = clusterKind === 'core'
    ? { x: [0.94, 1.08], y: [0.96, 1.08], z: [0.92, 1.06] }
    : clusterKind === 'satellite'
      ? { x: [0.82, 0.98], y: [0.78, 0.94], z: [0.82, 0.98] }
      : { x: [0.68, 0.86], y: [0.64, 0.82], z: [0.7, 0.88] }

  return zone.scale.clone().multiply(
    new THREE.Vector3(
      sampleRange(rng, scaleBand.x[0], scaleBand.x[1]),
      sampleRange(rng, scaleBand.y[0], scaleBand.y[1]),
      sampleRange(rng, scaleBand.z[0], scaleBand.z[1])
    )
  )
}

const createZonePlacement = (
  zone: PlantClusterDefinition,
  clusterKind: PlantClusterKind,
  index: number,
  existingPlacements: SampledPlantPlacement[],
  corePlacements: SampledPlantPlacement[],
  rng: () => number
): SampledPlantPlacement | null => {
  const laneCount = Math.max(zone.depthLaneCount, 1)
  const laneMidpoint = (laneCount - 1) / 2
  const laneSpacing = zone.layer === 'background' ? 0.03 : zone.layer === 'midground' ? 0.024 : 0.019
  const depthLane = clusterKind === 'core'
    ? THREE.MathUtils.clamp(
      Math.round(laneMidpoint + sampleRange(rng, -0.75, 0.75)),
      0,
      laneCount - 1
    )
    : Math.floor(rng() * laneCount)
  const laneOffset = (depthLane - laneMidpoint) * laneSpacing
  const radiusBand = clusterKind === 'core'
    ? zone.coreRadius
    : clusterKind === 'satellite'
      ? zone.satelliteRadius
      : zone.offshootRadius

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const sampledCore = corePlacements.length > 0
      ? corePlacements[Math.floor(rng() * corePlacements.length)]!
      : null
    const usesCoreOrigin = sampledCore !== null && (clusterKind === 'satellite' || (clusterKind === 'offshoot' && rng() < 0.68))
    const baseX = usesCoreOrigin ? sampledCore!.x : zone.x
    const baseZ = usesCoreOrigin ? sampledCore!.z : zone.z
    const angle = sampleRange(rng, -Math.PI, Math.PI) + (zone.rotationY * 0.22)
    const radial = sampleRadiusInBand(rng, radiusBand)
    const radiusX = zone.spreadX * radial
    const radiusZ = zone.spreadZ * radial
    const driftMagnitude = clusterKind === 'core'
      ? sampleRange(rng, -0.02, 0.035)
      : clusterKind === 'satellite'
        ? sampleRange(rng, -0.015, 0.065)
        : sampleRange(rng, 0.04, 0.14)
    const driftAngle = zone.rotationY + sampleRange(rng, -0.55, 0.55)
    const directionalDriftX = Math.sin(driftAngle) * driftMagnitude
    const directionalDriftZ = Math.cos(driftAngle) * driftMagnitude
    const x = clampNormalizedPlantX(
      baseX
        + (Math.cos(angle) * radiusX)
        + directionalDriftX
        + sampleRange(rng, -zone.spreadX * 0.06, zone.spreadX * 0.06)
    )
    const z = clampNormalizedPlantZ(
      baseZ
        + (Math.sin(angle) * radiusZ)
        + laneOffset
        + directionalDriftZ
        + sampleRange(rng, -zone.spreadZ * 0.06, zone.spreadZ * 0.06)
    )
    const tooClose = existingPlacements.some((placement) =>
      Math.hypot(placement.x - x, placement.z - z) < zone.minDistance
    )

    if (tooClose) {
      continue
    }

    const heightBias = clusterKind === 'core'
      ? sampleRange(rng, 0.76, 0.98)
      : clusterKind === 'satellite'
        ? sampleRange(rng, 0.38, 0.8)
        : sampleRange(rng, 0.14, 0.52)
    const plantType = pickPlantTypeFromMix(zone, rng, clusterKind, index)
    const hueOffset = getPlacementHueOffset(plantType)
    const laneRotationBias = (depthLane - laneMidpoint) * 0.08
    const tiltSpreadX = zone.layer === 'background' ? 0.12 : zone.layer === 'midground' ? 0.1 : 0.08
    const tiltSpreadZ = zone.layer === 'background' ? 0.16 : zone.layer === 'midground' ? 0.14 : 0.1
    const tiltX = sampleRange(rng, -tiltSpreadX, tiltSpreadX)
      + (clusterKind === 'offshoot' ? sampleRange(rng, -0.05, 0.06) : 0)
    const tiltZ = sampleRange(rng, -tiltSpreadZ, tiltSpreadZ)
      + (Math.cos(angle) * 0.025)

    return {
      id: `${zone.id}-${clusterKind}-${index + 1}`,
      zoneId: zone.id,
      massRole: zone.massRole,
      layer: zone.layer,
      plantType,
      clusterKind,
      x,
      z,
      baseHeight: THREE.MathUtils.lerp(zone.heightMin, zone.heightMax, heightBias),
      hueBase: zone.hueBase + hueOffset + sampleRange(rng, -0.016, 0.026),
      rotationY: zone.rotationY + sampleRange(rng, -0.48, 0.48) + laneRotationBias,
      tiltX,
      tiltZ,
      depthLane,
      scale: createPlacementScale(zone, rng, clusterKind),
      assetIds: clusterKind === 'core' && zone.layer !== 'foreground' ? zone.assetIds : undefined
    }
  }

  return null
}

const sampleZonePlacements = (
  zone: PlantClusterDefinition,
  seed: number
): SampledPlantPlacement[] => {
  const rng = createSeededRandom(hashSeed(seed, zone.id))
  const placements: SampledPlantPlacement[] = []
  const corePlacements: SampledPlantPlacement[] = []

  ;([
    { clusterKind: 'core' as const, count: zone.coreCount },
    { clusterKind: 'satellite' as const, count: zone.satelliteCount },
    { clusterKind: 'offshoot' as const, count: zone.offshootCount }
  ]).forEach(({ clusterKind, count }) => {
    for (let index = 0; index < count; index += 1) {
      const placement = createZonePlacement(
        zone,
        clusterKind,
        index,
        placements,
        corePlacements,
        rng
      )

      if (!placement) {
        continue
      }

      placements.push(placement)
      if (clusterKind === 'core') {
        corePlacements.push(placement)
      }
    }
  })

  return placements
}

export const resolveSampledPlantPlacements = (
  layoutStyle: AquascapeLayoutStyle = 'planted',
  seed: number = plantedPlacementSeed
): SampledPlantPlacement[] => {
  const layoutSeed = hashSeed(seed, layoutStyle)
  return resolveZoneDefinitionSet(layoutStyle).flatMap((zone) =>
    sampleZonePlacements(zone, layoutSeed)
  )
}

const createSubstratePlantAnchor = (
  placement: SampledPlantPlacement,
  index: number,
  placements: SampledPlantPlacement[]
): SubstratePlantAnchor => {
  const layerRadius = placement.layer === 'background'
    ? { x: 0.03, z: 0.028, mound: 0.015, scoop: 0.008, bias: 0.015 }
    : placement.layer === 'midground'
      ? { x: 0.03, z: 0.028, mound: 0.017, scoop: 0.009, bias: 0.016 }
      : { x: 0.022, z: 0.022, mound: 0.012, scoop: 0.008, bias: 0.013 }
  const speciesMultiplier = placement.plantType === 'anubias-petite-clump'
    ? 0.74
    : placement.plantType === 'anubias-nana-clump'
      ? 0.82
      : placement.plantType === 'crypt-brown'
        ? 0.94
        : placement.plantType === 'vallisneria-tall'
          ? 0.86
          : 1
  const clusterMultiplier = placement.clusterKind === 'core'
    ? 1.08
    : placement.clusterKind === 'satellite'
      ? 0.9
      : 0.74
  const localDensity = placements.filter((candidate) =>
    candidate.zoneId === placement.zoneId
      && candidate.id !== placement.id
      && Math.hypot(candidate.x - placement.x, candidate.z - placement.z) < (placement.layer === 'background' ? 0.14 : 0.11)
  ).length
  const densityMultiplier = 1 + (Math.min(localDensity, 4) * 0.08)
  const scoopLead = layerRadius.bias * clusterMultiplier
  const laneBias = (placement.depthLane - 1) * (placement.layer === 'background' ? 0.004 : 0.0025)
  const leanBiasX = placement.tiltZ * 0.11
  const leanBiasZ = placement.tiltX * 0.12

  return {
    id: placement.id || `plant-placement-${index + 1}`,
    x: placement.x,
    z: placement.z,
    layer: placement.layer,
    radiusX: layerRadius.x * speciesMultiplier * clusterMultiplier * densityMultiplier * THREE.MathUtils.clamp(placement.scale.x, 0.72, 1.18),
    radiusZ: layerRadius.z * speciesMultiplier * clusterMultiplier * densityMultiplier * THREE.MathUtils.clamp(placement.scale.z, 0.72, 1.14),
    moundHeight: layerRadius.mound * speciesMultiplier * clusterMultiplier * densityMultiplier * THREE.MathUtils.clamp(placement.scale.y * 0.62, 0.74, 1.18),
    scoopDepth: layerRadius.scoop * clusterMultiplier * (1 + Math.min(localDensity, 3) * 0.1 + ((Math.abs(placement.tiltX) + Math.abs(placement.tiltZ)) * 0.6)),
    scoopBiasX: (Math.sin(placement.rotationY) * scoopLead) + leanBiasX,
    scoopBiasZ: (Math.cos(placement.rotationY) * scoopLead) + (placement.layer === 'foreground' ? 0.008 : 0.004) + leanBiasZ + laneBias
  }
}

const marineSeaweedClusterDefinitions: PlantScatterDefinition[] = [
  { x: -0.34, z: 0.2, layer: 'foreground', plantType: 'fan-leaf', baseHeight: 2.45, spreadX: 0.72, spreadZ: 0.52, hueBase: 0.24 },
  { x: -0.3, z: -0.18, layer: 'background', plantType: 'sword-leaf', baseHeight: 5.2, spreadX: 0.66, spreadZ: 0.44, hueBase: 0.22 },
  { x: -0.18, z: -0.02, layer: 'midground', plantType: 'fan-leaf', baseHeight: 3.35, spreadX: 0.68, spreadZ: 0.5, hueBase: 0.25 },
  { x: 0.02, z: -0.24, layer: 'background', plantType: 'fan-leaf', baseHeight: 5.05, spreadX: 0.58, spreadZ: 0.42, hueBase: 0.31 },
  { x: 0.08, z: 0.24, layer: 'foreground', plantType: 'sword-leaf', baseHeight: 2.55, spreadX: 0.7, spreadZ: 0.54, hueBase: 0.3 },
  { x: 0.24, z: -0.02, layer: 'midground', plantType: 'ribbon-seaweed', baseHeight: 3.25, spreadX: 0.68, spreadZ: 0.48, hueBase: 0.28 },
  { x: 0.32, z: -0.16, layer: 'background', plantType: 'fan-leaf', baseHeight: 5.6, spreadX: 0.62, spreadZ: 0.46, hueBase: 0.37 },
  { x: -0.08, z: -0.12, layer: 'background', plantType: 'ribbon-seaweed', baseHeight: 4.9, spreadX: 0.6, spreadZ: 0.42, hueBase: 0.18 }
]

export const substrateHardscapeAnchors: SubstrateHardscapeAnchor[] = [
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

const natureShowcaseSubstrateHardscapeAnchors: SubstrateHardscapeAnchor[] = [
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

const plantedHardscapePlantAnchors: HardscapePlantAnchor[] = [
  {
    id: 'driftwood-branch-crotch-left',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-1.28, 0.96, 0.64),
    rotation: new THREE.Euler(-0.18, -0.18, 0.12),
    scale: new THREE.Vector3(0.22, 0.22, 0.22),
    height: 1.28,
    hueBase: 0.27,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'driftwood-root-flare-pocket',
    host: 'driftwood',
    massRole: 'root-flare',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-0.82, 0.58, -0.2),
    rotation: new THREE.Euler(-0.26, 0.2, 0.1),
    scale: new THREE.Vector3(0.28, 0.28, 0.28),
    height: 1.42,
    hueBase: 0.255,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'driftwood-branch-crotch-upper',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'javafern-narrow',
    position: new THREE.Vector3(0.34, 1.9, 0.82),
    rotation: new THREE.Euler(-0.22, 0.5, -0.04),
    scale: new THREE.Vector3(0.28, 0.28, 0.28),
    height: 1.92,
    hueBase: 0.292,
    assetIds: ['plant-javafern-narrow']
  },
  {
    id: 'driftwood-branch-crotch-right',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'javafern-large',
    position: new THREE.Vector3(1.18, 2.18, 0.24),
    rotation: new THREE.Euler(-0.2, -0.28, 0.08),
    scale: new THREE.Vector3(0.3, 0.3, 0.3),
    height: 2.08,
    hueBase: 0.304,
    assetIds: ['plant-javafern-large']
  },
  {
    id: 'driftwood-branch-crotch-rear',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'anubias-nana-clump',
    position: new THREE.Vector3(-0.24, 1.46, -0.12),
    rotation: new THREE.Euler(-0.16, -0.14, 0.08),
    scale: new THREE.Vector3(0.24, 0.24, 0.24),
    height: 1.58,
    hueBase: 0.266,
    assetIds: ['plant-anubias-nana-clump']
  },
  {
    id: 'rock-crevice-left',
    host: 'rock',
    massRole: 'rock-crevice',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-0.22, 0.44, 0.18),
    rotation: new THREE.Euler(-0.2, 0.18, 0.22),
    scale: new THREE.Vector3(0.24, 0.24, 0.24),
    height: 1.24,
    hueBase: 0.262,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'rock-crevice-center',
    host: 'rock',
    massRole: 'rock-crevice',
    layer: 'midground',
    plantType: 'javafern-narrow',
    position: new THREE.Vector3(0.54, 0.56, 0.02),
    rotation: new THREE.Euler(-0.18, -0.24, 0.16),
    scale: new THREE.Vector3(0.22, 0.22, 0.22),
    height: 1.66,
    hueBase: 0.286,
    assetIds: ['plant-javafern-narrow']
  }
]

const natureShowcaseHardscapePlantAnchors: HardscapePlantAnchor[] = [
  {
    id: 'driftwood-branch-crotch-left',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-1.68, 0.76, 0.66),
    rotation: new THREE.Euler(-0.24, -0.24, 0.16),
    scale: new THREE.Vector3(0.22, 0.22, 0.22),
    height: 1.22,
    hueBase: 0.268,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'driftwood-root-flare-pocket',
    host: 'driftwood',
    massRole: 'root-flare',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-1.18, 0.52, -0.06),
    rotation: new THREE.Euler(-0.28, 0.3, 0.1),
    scale: new THREE.Vector3(0.3, 0.3, 0.3),
    height: 1.42,
    hueBase: 0.252,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'driftwood-branch-crotch-upper',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'javafern-narrow',
    position: new THREE.Vector3(0.42, 2.06, 0.72),
    rotation: new THREE.Euler(-0.26, 0.56, -0.06),
    scale: new THREE.Vector3(0.26, 0.26, 0.26),
    height: 1.92,
    hueBase: 0.294,
    assetIds: ['plant-javafern-narrow']
  },
  {
    id: 'driftwood-branch-crotch-right',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'javafern-large',
    position: new THREE.Vector3(1.52, 2.34, 0.3),
    rotation: new THREE.Euler(-0.22, -0.32, 0.06),
    scale: new THREE.Vector3(0.24, 0.24, 0.24),
    height: 1.98,
    hueBase: 0.286,
    assetIds: ['plant-javafern-large']
  },
  {
    id: 'driftwood-branch-crotch-rear',
    host: 'driftwood',
    massRole: 'branch-crotch',
    layer: 'midground',
    plantType: 'anubias-nana-clump',
    position: new THREE.Vector3(-0.82, 1.54, -0.04),
    rotation: new THREE.Euler(-0.18, -0.14, 0.08),
    scale: new THREE.Vector3(0.22, 0.22, 0.22),
    height: 1.52,
    hueBase: 0.262,
    assetIds: ['plant-anubias-nana-clump']
  },
  {
    id: 'rock-crevice-left',
    host: 'rock',
    massRole: 'rock-crevice',
    layer: 'midground',
    plantType: 'anubias-petite-clump',
    position: new THREE.Vector3(-0.38, 0.34, 0.24),
    rotation: new THREE.Euler(-0.24, 0.18, 0.18),
    scale: new THREE.Vector3(0.22, 0.22, 0.22),
    height: 1.18,
    hueBase: 0.258,
    assetIds: ['plant-anubias-petite-clump']
  },
  {
    id: 'rock-crevice-center',
    host: 'rock',
    massRole: 'rock-crevice',
    layer: 'midground',
    plantType: 'javafern-narrow',
    position: new THREE.Vector3(0.12, 0.46, -0.04),
    rotation: new THREE.Euler(-0.2, -0.26, 0.12),
    scale: new THREE.Vector3(0.2, 0.2, 0.2),
    height: 1.52,
    hueBase: 0.282,
    assetIds: ['plant-javafern-narrow']
  },
  {
    id: 'rock-crevice-front',
    host: 'rock',
    massRole: 'rock-crevice',
    layer: 'midground',
    plantType: 'anubias-nana-clump',
    position: new THREE.Vector3(-0.04, 0.28, 0.26),
    rotation: new THREE.Euler(-0.18, 0.08, 0.14),
    scale: new THREE.Vector3(0.18, 0.18, 0.18),
    height: 1.18,
    hueBase: 0.256,
    assetIds: ['plant-anubias-nana-clump']
  }
]

export const resolveSubstrateHardscapeAnchors = (
  layoutStyle: AquascapeLayoutStyle = 'planted'
): SubstrateHardscapeAnchor[] => (
  layoutStyle === 'nature-showcase'
    ? natureShowcaseSubstrateHardscapeAnchors
    : substrateHardscapeAnchors
)

export const resolveSubstratePlantAnchors = (
  layoutStyle: AquascapeLayoutStyle = 'planted',
  seed: number = plantedPlacementSeed
): SubstratePlantAnchor[] => {
  const placements = resolveSampledPlantPlacements(layoutStyle, seed)
  return placements.map((placement, index, placementSet) =>
    createSubstratePlantAnchor(placement, index, placementSet)
  )
}

export const resolveHardscapePlantAnchors = (
  layoutStyle: AquascapeLayoutStyle = 'planted'
): HardscapePlantAnchor[] => (
  layoutStyle === 'nature-showcase'
    ? natureShowcaseHardscapePlantAnchors
    : plantedHardscapePlantAnchors
).map(cloneHardscapePlantAnchor)

export class AquascapingSystem {
  private group: THREE.Group
  private plants: THREE.Group[] = []
  private decorations: THREE.Group[] = []
  private time = 0
  private visualAssets: VisualAssetBundle | null
  private layoutStyle: AquascapeLayoutStyle
  
  constructor(
    scene: THREE.Scene,
    bounds: THREE.Box3,
    visualAssets: VisualAssetBundle | null = null,
    themeOrOptions: Theme | AquascapingOptions = { layoutStyle: 'planted' }
  ) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    this.layoutStyle = themeOrOptions.layoutStyle ?? 'planted'
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    if (this.layoutStyle === 'marine') {
      this.createCorals(bounds)
    } else {
      this.createFreshwaterAccents(bounds)
    }
    this.createRocks(bounds)
    this.createHeroDriftwood(bounds)
    this.createHeroRockRidge(bounds)
    this.createHeroCanopy(bounds)
    this.createDriftwoodBurialDetails(bounds)
    this.createHardscapeTransitionDetails(bounds)
    this.createHardscapeShadow(bounds)
    this.createSandDetails(bounds)
  }
  
  private createSeaweed(bounds: THREE.Box3): void {
    if (this.layoutStyle === 'planted') {
      this.createPlantedMasses(bounds)
      return
    }

    if (this.layoutStyle === 'nature-showcase') {
      this.createNatureShowcasePlanting(bounds)
      return
    }

    this.createMarineSeaweed(bounds)
  }

  private createMarineSeaweed(bounds: THREE.Box3): void {
    const seaweedCount = 24
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < seaweedCount; i++) {
      const seaweedGroup = new THREE.Group()
      const cluster = marineSeaweedClusterDefinitions[i % marineSeaweedClusterDefinitions.length]
      
      const x = THREE.MathUtils.clamp(
        cluster.x * size.x + (Math.random() - 0.5) * cluster.spreadX,
        bounds.min.x + 0.45,
        bounds.max.x - 0.45
      )
      const z = THREE.MathUtils.clamp(
        cluster.z * size.z + (Math.random() - 0.5) * cluster.spreadZ,
        bounds.min.z + 0.35,
        bounds.max.z - 0.35
      )
      const y = bounds.min.y + 0.42  // 砂層の高さに合わせる
      
      seaweedGroup.position.set(x, y, z)
      seaweedGroup.userData = {
        layer: cluster.layer,
        plantType: cluster.plantType
      }
      
      const height = cluster.baseHeight + Math.random() * (
        cluster.layer === 'background'
          ? 1.6
          : cluster.layer === 'midground'
            ? 1.2
            : 0.68
      )
      const hue = cluster.hueBase + Math.random() * 0.04

      this.populatePlantCluster(seaweedGroup, cluster, height, hue)

      if (cluster.plantType === 'ribbon-seaweed' && cluster.layer === 'background') {
        seaweedGroup.scale.set(0.92, 1.18, 0.94)
      } else if (cluster.plantType === 'ribbon-seaweed' && cluster.layer === 'foreground') {
        seaweedGroup.scale.set(1.14, 0.96, 1.14)
      } else if (cluster.plantType === 'sword-leaf') {
        seaweedGroup.scale.set(
          cluster.layer === 'foreground' ? 1.1 : 0.98,
          cluster.layer === 'background' ? 1.18 : cluster.layer === 'midground' ? 1.04 : 0.98,
          cluster.layer === 'foreground' ? 1.08 : 0.96
        )
      } else {
        seaweedGroup.scale.set(
          cluster.layer === 'foreground' ? 1.16 : 1,
          cluster.layer === 'background' ? 1.12 : 0.98,
          cluster.layer === 'foreground' ? 1.14 : 0.98
        )
      }
      seaweedGroup.rotation.y = (Math.random() - 0.5) * 0.45
      
      this.plants.push(seaweedGroup)
      this.group.add(seaweedGroup)
    }
  }

  private createPlantedMasses(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const substrateY = bounds.min.y + 0.42
    const placements = resolveSampledPlantPlacements('planted')

    placements.forEach((placement) => {
      const x = THREE.MathUtils.clamp(
        placement.x * size.x,
        bounds.min.x + 0.34,
        bounds.max.x - 0.34
      )
      const z = THREE.MathUtils.clamp(
        placement.z * size.z,
        bounds.min.z + 0.28,
        bounds.max.z - 0.28
      )
      const height = placement.baseHeight
      const hue = placement.hueBase
      const userData = {
        role: 'planted-mass',
        massRole: placement.massRole,
        anchorId: placement.id,
        zoneId: placement.zoneId,
        clusterKind: placement.clusterKind,
        depthLane: placement.depthLane,
        layer: placement.layer,
        plantType: placement.plantType
      }

      const assetMass = placement.layer !== 'foreground'
        ? this.cloneFirstAvailableVisualModelGroup(placement.assetIds ?? [], userData)
        : null
      const massGroup = assetMass ?? new THREE.Group()
      massGroup.position.set(x, substrateY, z)
      massGroup.rotation.set(placement.tiltX, placement.rotationY, placement.tiltZ)
      massGroup.scale.copy(placement.scale)

      if (assetMass) {
        this.addPlantMassFiller(
          massGroup,
          placement.layer,
          height * (placement.layer === 'background' ? 0.94 : 0.86),
          hue,
          placement.plantType,
          placement.layer !== 'foreground'
        )
      } else {
        massGroup.userData = userData
        this.addPlantMassFiller(
          massGroup,
          placement.layer,
          height,
          hue,
          placement.plantType,
          placement.layer === 'background'
        )
      }

      this.plants.push(massGroup)
      this.group.add(massGroup)
    })
  }

  private createNatureShowcasePlanting(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const substrateY = bounds.min.y + 0.42
    const placements = resolveSampledPlantPlacements('nature-showcase')

    placements.forEach((placement) => {
      const x = THREE.MathUtils.clamp(
        placement.x * size.x,
        bounds.min.x + 0.34,
        bounds.max.x - 0.34
      )
      const z = THREE.MathUtils.clamp(
        placement.z * size.z,
        bounds.min.z + 0.28,
        bounds.max.z - 0.28
      )
      const userData = {
        role: 'planted-mass',
        massRole: placement.massRole,
        anchorId: placement.id,
        zoneId: placement.zoneId,
        clusterKind: placement.clusterKind,
        depthLane: placement.depthLane,
        layer: placement.layer,
        plantType: placement.plantType
      }
      const assetMass = placement.layer !== 'foreground'
        ? this.cloneFirstAvailableVisualModelGroup(placement.assetIds ?? [], userData)
        : null
      const massGroup = assetMass ?? new THREE.Group()
      massGroup.position.set(x, substrateY, z)
      massGroup.rotation.set(placement.tiltX, placement.rotationY, placement.tiltZ)
      massGroup.scale.copy(placement.scale)

      if (assetMass) {
        this.addPlantMassFiller(
          massGroup,
          placement.layer,
          placement.baseHeight * (placement.layer === 'background' ? 0.9 : 0.84),
          placement.hueBase,
          placement.plantType,
          placement.layer !== 'foreground'
        )
      } else {
        massGroup.userData = userData
        this.addPlantMassFiller(
          massGroup,
          placement.layer,
          placement.baseHeight,
          placement.hueBase,
          placement.plantType,
          placement.layer === 'background'
        )
      }

      this.plants.push(massGroup)
      this.group.add(massGroup)
    })
  }

  private createFreshwaterAccents(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const accentDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          position: new THREE.Vector3(center.x - size.x * 0.18, bounds.min.y + 1.44, center.z - size.z * 0.04),
          rotationY: -0.42,
          scale: new THREE.Vector3(0.74, 0.74, 0.74),
          hue: 0.23,
          tint: '#566b49',
          blend: 0.26
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.02, bounds.min.y + 1.18, center.z + size.z * 0.08),
          rotationY: 0.08,
          scale: new THREE.Vector3(0.56, 0.56, 0.56),
          hue: 0.21,
          tint: '#64704c',
          blend: 0.24
        }
      ]
      : [
        {
          position: new THREE.Vector3(center.x - size.x * 0.05, bounds.min.y + 1.58, center.z - size.z * 0.08),
          rotationY: -0.32,
          scale: new THREE.Vector3(0.66, 0.66, 0.66),
          hue: 0.22,
          tint: '#63774f',
          blend: 0.24
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.08, bounds.min.y + 1.34, center.z - size.z * 0.16),
          rotationY: 0.24,
          scale: new THREE.Vector3(0.58, 0.58, 0.58),
          hue: 0.19,
          tint: '#6d684f',
          blend: 0.28
        }
      ]

    accentDefinitions.forEach((definition) => {
      const epiphyteCluster = this.createEpiphyteCluster('anubias-nana-clump', definition.hue)
      epiphyteCluster.position.copy(definition.position)
      epiphyteCluster.rotation.y = definition.rotationY
      epiphyteCluster.scale.copy(definition.scale)
      epiphyteCluster.userData = {
        role: 'freshwater-accent',
        accentType: 'epiphyte',
        layer: 'midground',
        plantType: 'fan-leaf'
      }

      this.toneAccentGroup(epiphyteCluster, definition.tint, definition.blend)
      this.plants.push(epiphyteCluster)
      this.decorations.push(epiphyteCluster)
      this.group.add(epiphyteCluster)
    })
  }

  private toneAccentGroup(group: THREE.Group, tintHex: string, blend: number): void {
    const tint = new THREE.Color(tintHex)

    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]

      materials.forEach((material) => {
        const stylableMaterial = material as THREE.MeshPhysicalMaterial & { clearcoat?: number; roughness?: number }
        if ('color' in stylableMaterial && stylableMaterial.color instanceof THREE.Color) {
          stylableMaterial.color.lerp(tint, blend)
        }
        if (typeof stylableMaterial.roughness === 'number') {
          stylableMaterial.roughness = Math.min(1, stylableMaterial.roughness + 0.08)
        }
        if (typeof stylableMaterial.clearcoat === 'number') {
          stylableMaterial.clearcoat = Math.max(0, stylableMaterial.clearcoat - 0.03)
        }
      })
    })
  }

  private populatePlantCluster(
    seaweedGroup: THREE.Group,
    cluster: Pick<PlantClusterDefinition, 'plantType' | 'layer'>,
    height: number,
    hue: number
  ): void {
    switch (getPlantSilhouetteFamily(cluster.plantType)) {
      case 'ribbon':
        this.createRibbonSeaweed(seaweedGroup, cluster.layer, height, hue)
        return
      case 'strap':
        this.createSwordLeafPlant(
          seaweedGroup,
          cluster.layer,
          height,
          hue,
          cluster.plantType as Exclude<PlantType, 'ribbon-seaweed'>
        )
        return
      case 'broad':
        this.createFanLeafPlant(
          seaweedGroup,
          cluster.layer,
          height,
          hue,
          cluster.plantType as Exclude<PlantType, 'ribbon-seaweed'>
        )
        return
    }
  }

  private resolveCompanionPlantType(plantType: PlantType): PlantType | null {
    switch (plantType) {
      case 'ribbon-seaweed':
        return null
      case 'vallisneria-tall':
        return 'stem-green-bush'
      case 'stem-green-bush':
      case 'hygrophila-rear':
        return 'vallisneria-tall'
      case 'javafern-large':
        return 'anubias-nana-clump'
      case 'javafern-narrow':
        return 'anubias-petite-clump'
      case 'anubias-nana-clump':
        return 'javafern-large'
      case 'anubias-petite-clump':
        return 'javafern-narrow'
      case 'crypt-brown':
        return 'anubias-nana-clump'
      case 'fan-leaf':
        return 'sword-leaf'
      case 'sword-leaf':
        return 'fan-leaf'
    }
  }

  private addPlantMassFiller(
    plantGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number,
    plantType: PlantType,
    includeCompanion: boolean
  ): void {
    this.populatePlantCluster(plantGroup, { layer, plantType }, height, hue)

    if (!includeCompanion || plantType === 'ribbon-seaweed') {
      return
    }

    const companionType = this.resolveCompanionPlantType(plantType)
    if (!companionType) {
      return
    }

    this.populatePlantCluster(
      plantGroup,
      { layer, plantType: companionType },
      height * 0.78,
      hue + (companionType === 'fan-leaf' ? 0.03 : -0.015)
    )
  }

  private createRibbonSeaweed(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number
  ): void {
    const frondCount = layer === 'background' ? 12 : 13
    const laneCount = layer === 'background' ? 4 : 5
    const material = this.createSeaweedMaterial(hue, layer)

    for (let j = 0; j < frondCount; j++) {
      const frondHeight = height * (0.72 + Math.random() * 0.28)
      const frondWidth = 0.16 + frondHeight * 0.08 + Math.random() * 0.06
      const bend = (Math.random() - 0.5) * 0.2 + (j - (frondCount - 1) / 2) * 0.04
      const geometry = this.createSeaweedFrondGeometry(frondWidth, frondHeight, bend)
      const frond = new THREE.Mesh(geometry, material)
      const spread = j - (frondCount - 1) / 2
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * 0.085
      
      frond.position.set(
        spread * 0.058 + (Math.random() - 0.5) * 0.04,
        frondHeight / 2,
        laneOffset + spread * 0.014 + (Math.random() - 0.5) * 0.03
      )
      frond.rotation.y = spread * 0.2 + laneOffset * 1.6 + (depthLane % 2 === 0 ? -0.18 : 0.18) + (Math.random() - 0.5) * 0.18
      frond.rotation.z = -0.14 + spread * 0.045 + (Math.random() - 0.5) * 0.1
      frond.rotation.x = laneOffset * 0.36 + (Math.random() - 0.5) * 0.05
      frond.castShadow = true
      frond.receiveShadow = true
      frond.userData = {
        role: 'frond',
        depthLane,
        originalRotation: frond.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.05 + Math.random() * 0.05
      }
      
      seaweedGroup.add(frond)
    }
  }

  private createSwordLeafPlant(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number,
    plantType: Exclude<PlantType, 'ribbon-seaweed'> = 'sword-leaf'
  ): void {
    const leafCount = plantType === 'vallisneria-tall'
      ? layer === 'background' ? 13 : 12
      : plantType === 'stem-green-bush' || plantType === 'hygrophila-rear'
        ? layer === 'background' ? 18 : 16
        : plantType === 'crypt-brown'
          ? layer === 'background' ? 15 : 13
          : plantType === 'javafern-narrow'
            ? layer === 'background' ? 14 : 13
            : layer === 'background' ? 16 : 15
    const laneCount = layer === 'background' ? 5 : 5
    const material = this.createLeafMaterial(hue, layer, plantType)

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = plantType === 'vallisneria-tall'
        ? height * (0.88 + Math.random() * 0.22)
        : plantType === 'stem-green-bush' || plantType === 'hygrophila-rear'
          ? height * (0.56 + Math.random() * 0.16)
          : plantType === 'crypt-brown'
            ? height * (0.62 + Math.random() * 0.18)
            : plantType === 'javafern-narrow'
              ? height * (0.58 + Math.random() * 0.18)
              : height * (0.78 + Math.random() * 0.22)
      const leafWidth = plantType === 'vallisneria-tall'
        ? 0.14 + Math.random() * 0.04
        : plantType === 'stem-green-bush' || plantType === 'hygrophila-rear'
          ? 0.16 + Math.random() * 0.05
          : plantType === 'crypt-brown'
            ? 0.22 + Math.random() * 0.06
            : plantType === 'javafern-narrow'
              ? 0.18 + Math.random() * 0.05
              : 0.24 + Math.random() * 0.08
      const bend = (Math.random() - 0.5) * (plantType === 'vallisneria-tall' ? 0.26 : 0.14) + (j - (leafCount - 1) / 2) * 0.035
      const geometry = this.createSwordLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2
      const pairSign = spread === 0 ? 0 : Math.sign(spread)
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * (plantType === 'stem-green-bush' || plantType === 'hygrophila-rear' ? 0.074 : 0.088)

      leaf.position.set(
        spread * (plantType === 'vallisneria-tall' ? 0.04 : 0.054) + pairSign * 0.016 + (Math.random() - 0.5) * 0.03,
        0,
        laneOffset + spread * (plantType === 'crypt-brown' ? 0.022 : 0.016) + (Math.random() - 0.5) * 0.03
      )
      leaf.rotation.y = spread * 0.2 + laneOffset * 2.2 + (depthLane % 2 === 0 ? -0.2 : 0.24) + (Math.random() - 0.5) * 0.14
      leaf.rotation.z = (plantType === 'vallisneria-tall' ? -0.06 : -0.12) + spread * 0.03 + laneOffset * 0.1 + (Math.random() - 0.5) * 0.06
      leaf.rotation.x = laneOffset * 0.38 + (Math.random() - 0.5) * 0.05
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        depthLane,
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.04 + Math.random() * 0.03
      }

      seaweedGroup.add(leaf)
    }
  }

  private createFanLeafPlant(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number,
    plantType: Exclude<PlantType, 'ribbon-seaweed'> = 'fan-leaf'
  ): void {
    const leafCount = plantType === 'anubias-petite-clump'
      ? layer === 'background' ? 9 : 8
      : plantType === 'anubias-nana-clump'
        ? layer === 'background' ? 11 : 10
        : plantType === 'javafern-large'
          ? layer === 'background' ? 13 : 12
          : layer === 'background' ? 14 : 12
    const laneCount = layer === 'background' ? 5 : 4
    const material = this.createLeafMaterial(hue, layer, plantType)

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = plantType === 'anubias-petite-clump'
        ? height * (0.28 + Math.random() * 0.1)
        : plantType === 'anubias-nana-clump'
          ? height * (0.36 + Math.random() * 0.12)
          : plantType === 'javafern-large'
            ? height * (0.54 + Math.random() * 0.14)
            : height * (0.48 + Math.random() * 0.16)
      const leafWidth = plantType === 'anubias-petite-clump'
        ? 0.26 + Math.random() * 0.08
        : plantType === 'anubias-nana-clump'
          ? 0.34 + Math.random() * 0.12
          : plantType === 'javafern-large'
            ? 0.5 + Math.random() * 0.14
            : 0.52 + Math.random() * 0.18
      const bend = (Math.random() - 0.5) * (plantType === 'javafern-large' ? 0.14 : 0.18) + (j - (leafCount - 1) / 2) * 0.06
      const geometry = this.createFanLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2
      const pairSign = spread === 0 ? 0 : Math.sign(spread)
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * 0.09

      leaf.position.set(
        spread * 0.044 + pairSign * 0.014 + (Math.random() - 0.5) * 0.028,
        0,
        laneOffset + spread * 0.028 + (Math.random() - 0.5) * 0.032
      )
      leaf.rotation.y = spread * 0.26 + laneOffset * 2.3 + (depthLane % 2 === 0 ? -0.22 : 0.24) + (Math.random() - 0.5) * 0.12
      leaf.rotation.z = -0.24 + pairSign * 0.03 + laneOffset * 0.06 + (Math.random() - 0.5) * 0.08
      leaf.rotation.x = spread * 0.04 + laneOffset * 0.28 + (Math.random() - 0.5) * 0.04
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        depthLane,
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.025 + Math.random() * 0.025
      }

      seaweedGroup.add(leaf)
    }
  }

  private createSeaweedFrondGeometry(width: number, height: number, bend: number): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(width, height, 5, 12)
    const positionAttribute = geometry.getAttribute('position')
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = (y + height / 2) / height
      const taper = THREE.MathUtils.lerp(1, 0.18, progress)
      const curvedX = Math.sin(progress * Math.PI * 0.9) * bend * height
      const depth = Math.sin(progress * Math.PI) * width * 0.08
      const droop = progress * progress * height * 0.08
      
      positionAttribute.setX(i, x * taper + curvedX)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth)
    }
    
    geometry.computeVertexNormals()
    
    return geometry
  }

  private createSwordLeafGeometry(width: number, height: number, bend: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(-width * 0.16, height * 0.16, -width * 0.3, height * 0.5, 0, height)
    shape.bezierCurveTo(width * 0.3, height * 0.5, width * 0.16, height * 0.16, 0, 0)

    const geometry = new THREE.ShapeGeometry(shape, 10)
    const positionAttribute = geometry.getAttribute('position')

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = y / height
      const side = x === 0 ? 0 : Math.sign(x)
      const curl = Math.sin(progress * Math.PI * 0.85) * bend * height
      const depth = Math.sin(progress * Math.PI) * width * 0.14
      const droop = progress * progress * height * 0.04

      positionAttribute.setX(i, x + curl)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth * side)
    }

    geometry.computeVertexNormals()

    return geometry
  }

  private createFanLeafGeometry(width: number, height: number, bend: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(-width * 0.18, height * 0.14, -width * 0.58, height * 0.4, -width * 0.2, height * 0.96)
    shape.quadraticCurveTo(0, height * 1.08, width * 0.2, height * 0.96)
    shape.bezierCurveTo(width * 0.58, height * 0.4, width * 0.18, height * 0.14, 0, 0)

    const geometry = new THREE.ShapeGeometry(shape, 12)
    const positionAttribute = geometry.getAttribute('position')

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = y / height
      const side = x === 0 ? 0 : Math.sign(x)
      const curl = Math.sin(progress * Math.PI * 0.9) * bend * height
      const depth = Math.sin(progress * Math.PI * 1.1) * width * 0.1
      const droop = progress * progress * height * 0.06

      positionAttribute.setX(i, x + curl)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth * side)
    }

    geometry.computeVertexNormals()

    return geometry
  }

  private createSeaweedMaterial(
    hue: number,
    layer: PlantLayer
  ): THREE.MeshPhysicalMaterial {
    const seaweedTexture = this.createSeaweedTexture(hue)
    const normalMap = this.createSeaweedNormalMap()
    const roughnessMap = this.createSeaweedRoughnessMap()
    const profile = this.getPlantMaterialProfile(layer, 'ribbon-seaweed')
    
    const material = new THREE.MeshPhysicalMaterial({
      map: seaweedTexture,
      alphaMap: seaweedTexture,
      normalMap,
      roughnessMap,
      color: new THREE.Color('#ffffff'),
      metalness: 0,
      roughness: profile.roughness,
      transmission: profile.transmission,
      thickness: profile.thickness,
      transparent: profile.transparent,
      opacity: profile.opacity,
      alphaTest: profile.alphaTest,
      side: THREE.DoubleSide,
      envMapIntensity: profile.envMapIntensity,
      clearcoat: profile.clearcoat,
      clearcoatRoughness: profile.clearcoatRoughness
    })
    material.shadowSide = THREE.DoubleSide
    return material
  }

  private getPlantMaterialProfile(
    layer: PlantLayer,
    plantType: PlantType,
    role: PlantRenderRole = 'repeated'
  ): {
    roughness: number
    transmission: number
    thickness: number
    transparent: boolean
    opacity: number
    alphaTest: number
    envMapIntensity: number
    clearcoat: number
    clearcoatRoughness: number
  } {
    const silhouetteFamily = getPlantSilhouetteFamily(plantType)
    const alphaTestBase = silhouetteFamily === 'ribbon'
      ? 0.34
      : silhouetteFamily === 'broad'
        ? 0.2
        : 0.16
    const alphaTest = layer === 'background'
      ? alphaTestBase + 0.04
      : role === 'hero'
        ? Math.max(0.12, alphaTestBase - 0.02)
        : alphaTestBase

    if (silhouetteFamily === 'ribbon') {
      return {
        roughness: plantType === 'vallisneria-tall'
          ? (layer === 'background' ? 0.86 : 0.8)
          : layer === 'background' ? 0.88 : 0.82,
        transmission: 0,
        thickness: 0.008,
        transparent: false,
        opacity: 1,
        alphaTest,
        envMapIntensity: 0.06,
        clearcoat: 0.02,
        clearcoatRoughness: 0.94
      }
    }

    return {
      roughness: silhouetteFamily === 'broad'
        ? layer === 'background' ? 0.78 : 0.72
        : layer === 'background' ? 0.84 : 0.78,
      transmission: role === 'hero' ? (layer === 'background' ? 0.012 : 0.01) : 0,
      thickness: role === 'hero'
        ? silhouetteFamily === 'broad' ? 0.02 : 0.016
        : 0.01,
      transparent: false,
      opacity: 1,
      alphaTest,
      envMapIntensity: role === 'hero' ? 0.1 : 0.06,
      clearcoat: role === 'hero'
        ? silhouetteFamily === 'broad' ? 0.05 : 0.035
        : 0.02,
      clearcoatRoughness: role === 'hero' ? 0.88 : 0.94
    }
  }

  private getPlantTint(
    layer: PlantLayer,
    plantType: PlantType,
    role: PlantRenderRole = 'repeated'
  ): THREE.Color {
    const hue = (() => {
      switch (plantType) {
        case 'ribbon-seaweed':
          return 0.235
        case 'vallisneria-tall':
          return 0.255
        case 'stem-green-bush':
        case 'hygrophila-rear':
          return 0.272
        case 'javafern-large':
          return 0.288
        case 'javafern-narrow':
          return 0.276
        case 'anubias-nana-clump':
          return 0.262
        case 'anubias-petite-clump':
          return 0.268
        case 'crypt-brown':
          return 0.064
        case 'fan-leaf':
          return 0.278
        case 'sword-leaf':
          return 0.268
      }
    })()
    const saturation = (() => {
      switch (plantType) {
        case 'crypt-brown':
          return 0.34
        case 'stem-green-bush':
        case 'hygrophila-rear':
        case 'vallisneria-tall':
          return 0.38
        case 'anubias-nana-clump':
        case 'anubias-petite-clump':
          return 0.28
        case 'javafern-large':
        case 'javafern-narrow':
          return 0.32
        case 'ribbon-seaweed':
          return 0.39
        case 'fan-leaf':
          return 0.34
        case 'sword-leaf':
          return 0.32
      }
    })()
    const backgroundLightness = (() => {
      switch (plantType) {
        case 'crypt-brown':
          return role === 'hero' ? 0.41 : 0.39
        case 'anubias-nana-clump':
        case 'anubias-petite-clump':
          return role === 'hero' ? 0.45 : 0.42
        case 'javafern-large':
        case 'javafern-narrow':
          return role === 'hero' ? 0.46 : 0.43
        case 'stem-green-bush':
        case 'hygrophila-rear':
          return role === 'hero' ? 0.49 : 0.46
        case 'vallisneria-tall':
          return role === 'hero' ? 0.47 : 0.44
        case 'ribbon-seaweed':
          return role === 'hero' ? 0.42 : 0.4
        case 'fan-leaf':
          return role === 'hero' ? 0.47 : 0.44
        case 'sword-leaf':
          return role === 'hero' ? 0.46 : 0.43
      }
    })()
    const lightness = layer === 'background'
      ? backgroundLightness
      : layer === 'midground'
        ? role === 'hero'
          ? plantType === 'crypt-brown' ? 0.38 : 0.4
          : plantType === 'crypt-brown' ? 0.34 : 0.36
        : role === 'hero'
          ? plantType === 'anubias-petite-clump' ? 0.38 : 0.4
          : plantType === 'anubias-petite-clump' ? 0.34 : 0.36

    return new THREE.Color().setHSL(hue, saturation, lightness)
  }

  private getPlantRenderRole(userData: Record<string, unknown> = {}): PlantRenderRole {
    return userData.role === 'hero-canopy' ? 'hero' : 'repeated'
  }

  private tonePlantColor(
    color: THREE.Color,
    layer: PlantLayer,
    plantType: PlantType,
    role: PlantRenderRole
  ): THREE.Color {
    const tint = this.getPlantTint(layer, plantType, role)
    const toned = tint.clone().lerp(color, role === 'hero' ? 0.26 : 0.34)
    const tintHsl = { h: 0, s: 0, l: 0 }
    const tonedHsl = { h: 0, s: 0, l: 0 }
    tint.getHSL(tintHsl)
    toned.getHSL(tonedHsl)

    const lightnessFloor = layer === 'background'
      ? role === 'hero' ? 0.38 : 0.37
      : layer === 'midground'
        ? 0.32
        : 0.3
    const saturationFloor = getPlantSilhouetteFamily(plantType) === 'ribbon' ? 0.2 : 0.18

    if (tonedHsl.l < lightnessFloor || tonedHsl.s < saturationFloor) {
      toned.setHSL(
        tintHsl.h,
        Math.max(tonedHsl.s, saturationFloor),
        Math.max(tonedHsl.l, lightnessFloor)
      )
    }

    return toned
  }

  private getVisualTexture(id: string): THREE.Texture | null {
    return this.visualAssets?.textures[id] ?? null
  }

  private getVisualModel(id?: string): LoadedModelAsset | null {
    if (!id) return null
    return this.visualAssets?.models[id] ?? null
  }

  private cloneFirstAvailableVisualModelGroup(
    ids: string[],
    userData: Record<string, unknown>
  ): THREE.Group | null {
    for (const id of ids) {
      const clone = this.cloneVisualModelGroup(id, userData)
      if (clone) {
        return clone
      }
    }

    return null
  }

  private cloneVisualModelGroup(
    id: string,
    userData: Record<string, unknown>
  ): THREE.Group | null {
    const model = this.getVisualModel(id)
    if (!model) return null

    const clone = model.scene.clone(true)
    clone.userData = {
      ...clone.userData,
      ...userData,
      assetId: id
    }

    clone.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh)) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => this.createAssetBackedMaterial(id, material, clone.userData))
      } else if (mesh.material instanceof THREE.Material) {
        mesh.material = this.createAssetBackedMaterial(id, mesh.material, clone.userData)
      }
      this.ensureAoUv2(mesh)
      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    return clone
  }

  private createAssetBackedMaterial(
    id: string,
    material: THREE.Material,
    userData: Record<string, unknown> = {}
  ): THREE.Material {
    if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
      return this.createReplacementAssetMaterial(id, material, userData)
    }

    const baseMaterial = material.clone() as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial & {
      envMapIntensity?: number
      clearcoat?: number
      clearcoatRoughness?: number
      transmission?: number
      thickness?: number
      shadowSide?: THREE.Side
    }

    if (id.startsWith('plant-')) {
      const layer = (userData.layer as PlantLayer | undefined) ?? 'background'
      const plantType = (userData.plantType as PlantType | undefined) ?? 'sword-leaf'
      const role = this.getPlantRenderRole(userData)
      const profile = this.getPlantMaterialProfile(layer, plantType, role)
      baseMaterial.map = baseMaterial.map ?? this.getVisualTexture('leaf-diffuse')
      baseMaterial.alphaMap = baseMaterial.alphaMap ?? this.getVisualTexture('leaf-alpha')
      baseMaterial.normalMap = baseMaterial.normalMap ?? this.getVisualTexture('leaf-normal')
      if (baseMaterial.normalMap) {
        baseMaterial.normalScale = new THREE.Vector2(0.34, 0.34)
      }
      baseMaterial.roughnessMap = baseMaterial.roughnessMap ?? this.getVisualTexture('leaf-roughness')
      baseMaterial.color = this.tonePlantColor(
        baseMaterial.color?.clone() ?? new THREE.Color('#4d8150'),
        layer,
        plantType,
        role
      )
      baseMaterial.metalness = 0
      baseMaterial.roughness = typeof baseMaterial.roughness === 'number'
        ? Math.max(baseMaterial.roughness, profile.roughness)
        : profile.roughness
      baseMaterial.transparent = false
      baseMaterial.opacity = profile.opacity
      baseMaterial.alphaTest = Math.max(baseMaterial.alphaTest ?? 0, baseMaterial.alphaMap ? profile.alphaTest : 0)
      baseMaterial.side = THREE.DoubleSide
      baseMaterial.envMapIntensity = Math.min(baseMaterial.envMapIntensity ?? profile.envMapIntensity, profile.envMapIntensity)
      if (baseMaterial instanceof THREE.MeshPhysicalMaterial) {
        baseMaterial.transmission = role === 'hero'
          ? Math.min(Math.max(baseMaterial.transmission ?? 0, profile.transmission), 0.015)
          : 0
        baseMaterial.thickness = role === 'hero'
          ? Math.max(baseMaterial.thickness ?? 0, profile.thickness)
          : profile.thickness
        baseMaterial.clearcoat = Math.min(baseMaterial.clearcoat ?? profile.clearcoat, profile.clearcoat)
        baseMaterial.clearcoatRoughness = Math.max(baseMaterial.clearcoatRoughness ?? profile.clearcoatRoughness, profile.clearcoatRoughness)
      }
      baseMaterial.shadowSide = THREE.DoubleSide
      return baseMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.tuneDriftwoodMaterial(baseMaterial)
    }

    if (id.startsWith('rock-')) {
      return this.tuneRockMaterial(baseMaterial, userData)
    }

    return baseMaterial
  }

  private createReplacementAssetMaterial(
    id: string,
    material: THREE.Material,
    userData: Record<string, unknown> = {}
  ): THREE.Material {
    const baseMaterial = material as THREE.MeshStandardMaterial

    if (id.startsWith('plant-')) {
      const layer = (userData.layer as PlantLayer | undefined) ?? 'background'
      const plantType = (userData.plantType as PlantType | undefined) ?? 'sword-leaf'
      const role = this.getPlantRenderRole(userData)
      const profile = this.getPlantMaterialProfile(layer, plantType, role)
      const plantMaterial = new THREE.MeshPhysicalMaterial({
        map: this.getVisualTexture('leaf-diffuse'),
        alphaMap: this.getVisualTexture('leaf-alpha'),
        normalMap: this.getVisualTexture('leaf-normal'),
        normalScale: new THREE.Vector2(0.34, 0.34),
        roughnessMap: this.getVisualTexture('leaf-roughness'),
        color: this.tonePlantColor(
          baseMaterial.color?.clone() ?? new THREE.Color('#4d8150'),
          layer,
          plantType,
          role
        ),
        metalness: 0,
        roughness: profile.roughness,
        transmission: profile.transmission,
        thickness: profile.thickness,
        transparent: profile.transparent,
        opacity: profile.opacity,
        alphaTest: profile.alphaTest,
        side: THREE.DoubleSide,
        envMapIntensity: profile.envMapIntensity,
        clearcoat: profile.clearcoat,
        clearcoatRoughness: profile.clearcoatRoughness
      })
      plantMaterial.shadowSide = THREE.DoubleSide
      return plantMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.createDriftwoodReplacementMaterial(material)
    }

    if (id.startsWith('rock-')) {
      return this.createRockReplacementMaterial(material, userData)
    }

    return material.clone()
  }

  private tuneDriftwoodMaterial<T extends THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(material: T): T {
    material.map = material.map ?? this.getVisualTexture('driftwood-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('driftwood-normal')
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(1.24, 0.74)
    }
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('driftwood-roughness')
    material.aoMap = material.aoMap
      ?? this.getVisualTexture('driftwood-bark-ao')
      ?? this.getVisualTexture('driftwood-ao')
    material.aoMapIntensity = material.aoMap
      ? THREE.MathUtils.clamp(material.aoMapIntensity ?? 0.64, 0.6, 0.76)
      : 0
    const driftwoodColor = material.color?.clone() ?? new THREE.Color('#6f5641')
    const driftwoodHsl = { h: 0, s: 0, l: 0 }
    driftwoodColor.getHSL(driftwoodHsl)
    if (driftwoodHsl.l < 0.35) {
      driftwoodColor.setHSL(
        driftwoodHsl.h,
        THREE.MathUtils.clamp(driftwoodHsl.s * 0.78 + 0.025, 0.1, 0.24),
        0.4
      )
    }
    material.color = driftwoodColor
    material.emissive = material.emissive ?? new THREE.Color('#000000')
    material.emissive.lerp(new THREE.Color('#5f4328'), 0.28)
    material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.18)
    material.roughness = typeof material.roughness === 'number'
      ? Math.max(material.roughness, material.roughnessMap ? 0.9 : 0.94)
      : material.roughnessMap ? 0.91 : 0.95
    material.metalness = typeof material.metalness === 'number'
      ? Math.min(material.metalness, 0.03)
      : 0.02
    material.envMapIntensity = THREE.MathUtils.clamp(material.envMapIntensity ?? 0.05, 0.02, 0.08)

    const cavityMask = this.getVisualTexture('driftwood-bark-cavity-mask')
    if (cavityMask) {
      this.installDriftwoodCavityShading(material, cavityMask)
    }

    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = Math.min(material.clearcoat ?? 0, 0.03)
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness ?? 0.94, 0.94)
    }

    return material
  }

  private installDriftwoodCavityShading(
    material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    cavityMask: THREE.Texture
  ): void {
    const cavityStrength = 0.18
    const ridgeLift = 0.13
    material.userData = {
      ...material.userData,
      driftwoodCavityMask: cavityMask,
      driftwoodCavityStrength: cavityStrength,
      driftwoodRidgeLift: ridgeLift
    }

    const previousOnBeforeCompile = material.onBeforeCompile.bind(material)
    const previousProgramCacheKey = typeof material.customProgramCacheKey === 'function'
      ? material.customProgramCacheKey.bind(material)
      : null

    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile(shader, renderer)
      shader.uniforms.uDriftwoodCavityMask = { value: cavityMask }
      shader.uniforms.uDriftwoodCavityStrength = { value: cavityStrength }
      shader.uniforms.uDriftwoodRidgeLift = { value: ridgeLift }
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <aomap_pars_fragment>',
          `#include <aomap_pars_fragment>
uniform sampler2D uDriftwoodCavityMask;
uniform float uDriftwoodCavityStrength;
uniform float uDriftwoodRidgeLift;`
        )
        .replace(
          '#include <aomap_fragment>',
          `#include <aomap_fragment>
#ifdef USE_AOMAP
  float driftwoodCavity = texture2D(uDriftwoodCavityMask, vAoMapUv).r;
  float driftwoodUnderside = smoothstep(-0.32, 0.46, normal.y);
  float driftwoodRidge = (1.0 - driftwoodCavity) * driftwoodUnderside;
  reflectedLight.indirectDiffuse *= 1.0 - driftwoodCavity * uDriftwoodCavityStrength;
  reflectedLight.directDiffuse *= 1.0 - driftwoodCavity * (uDriftwoodCavityStrength * 0.58);
  diffuseColor.rgb += vec3(uDriftwoodRidgeLift * driftwoodRidge);
#endif`
        )
    }
    material.customProgramCacheKey = () => `${previousProgramCacheKey ? previousProgramCacheKey() : 'standard'}-driftwood-cavity`
    material.needsUpdate = true
  }

  private createDriftwoodReplacementMaterial(material: THREE.Material): THREE.MeshPhysicalMaterial {
    const sourceMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      color?: THREE.Color
      roughness?: number
      metalness?: number
      envMapIntensity?: number
      transparent?: boolean
      opacity?: number
      side?: THREE.Side
      alphaTest?: number
      depthWrite?: boolean
    }

    const driftwoodMaterial = new THREE.MeshPhysicalMaterial({
      map: sourceMaterial.map ?? this.getVisualTexture('driftwood-diffuse'),
      normalMap: sourceMaterial.normalMap ?? this.getVisualTexture('driftwood-normal'),
      roughnessMap: sourceMaterial.roughnessMap ?? this.getVisualTexture('driftwood-roughness'),
      aoMap: sourceMaterial.aoMap ?? this.getVisualTexture('driftwood-ao'),
      color: sourceMaterial.color?.clone() ?? new THREE.Color('#6f5641'),
      roughness: typeof sourceMaterial.roughness === 'number' ? sourceMaterial.roughness : 0.94,
      metalness: typeof sourceMaterial.metalness === 'number' ? sourceMaterial.metalness : 0.02,
      transparent: sourceMaterial.transparent ?? false,
      opacity: sourceMaterial.opacity ?? 1,
      side: sourceMaterial.side ?? THREE.FrontSide,
      alphaTest: sourceMaterial.alphaTest ?? 0,
      depthWrite: sourceMaterial.depthWrite ?? true,
      envMapIntensity: typeof sourceMaterial.envMapIntensity === 'number' ? sourceMaterial.envMapIntensity : 0.07,
      clearcoat: 0,
      clearcoatRoughness: 1
    })
    driftwoodMaterial.name = material.name
    driftwoodMaterial.userData = { ...material.userData }

    return this.tuneDriftwoodMaterial(driftwoodMaterial)
  }

  private tuneRockMaterial<T extends THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(
    material: T,
    userData: Record<string, unknown> = {}
  ): T {
    material.map = material.map ?? this.getVisualTexture('rock-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('rock-normal')
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(0.54, 0.54)
    }
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('rock-roughness')

    const role = userData.role
    const isSupportRock = role === 'support-rock'
      || role === 'support-rock-piece'
      || role === 'support-rock-chip'
      || role === 'support-rock-pebble'
      || role === 'support-rock-scatter'
    const isHeroRidge = role === 'hero-rock-ridge'
      || role === 'ridge-rock'
      || role === 'ridge-slate'
      || role === 'ridge-rubble'
    const lightnessFloor = isSupportRock ? 0.42 : isHeroRidge ? 0.41 : 0.38
    const color = material.color?.clone() ?? new THREE.Color('#8a8378')
    const liftedHsl = { h: 0, s: 0, l: 0 }
    color.getHSL(liftedHsl)
    if (liftedHsl.l < lightnessFloor) {
      color.setHSL(
        liftedHsl.h,
        THREE.MathUtils.clamp(
          liftedHsl.s * 0.92 + (isSupportRock ? 0.04 : isHeroRidge ? 0.03 : 0.02),
          0.12,
          isSupportRock ? 0.34 : isHeroRidge ? 0.32 : 0.28
        ),
        lightnessFloor
      )
    }
    material.color = color
    material.metalness = typeof material.metalness === 'number'
      ? Math.min(material.metalness, 0.03)
      : 0.02
    material.roughness = typeof material.roughness === 'number'
      ? Math.max(material.roughness, material.roughnessMap ? 0.82 : 0.88)
      : material.roughnessMap ? 0.86 : 0.92
    material.envMapIntensity = THREE.MathUtils.clamp(material.envMapIntensity ?? 0.06, 0.02, 0.1)

    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = Math.min(material.clearcoat ?? 0, 0.02)
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness ?? 0.94, 0.94)
    }

    return material
  }

  private createRockReplacementMaterial(
    material: THREE.Material,
    userData: Record<string, unknown> = {}
  ): THREE.MeshPhysicalMaterial {
    const sourceMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      color?: THREE.Color
      roughness?: number
      metalness?: number
      envMapIntensity?: number
      transparent?: boolean
      opacity?: number
      side?: THREE.Side
      alphaTest?: number
      depthWrite?: boolean
    }

    const rockMaterial = new THREE.MeshPhysicalMaterial({
      map: sourceMaterial.map ?? this.getVisualTexture('rock-diffuse'),
      normalMap: sourceMaterial.normalMap ?? this.getVisualTexture('rock-normal'),
      roughnessMap: sourceMaterial.roughnessMap ?? this.getVisualTexture('rock-roughness'),
      aoMap: sourceMaterial.aoMap ?? null,
      color: sourceMaterial.color?.clone() ?? new THREE.Color('#8a8378'),
      roughness: typeof sourceMaterial.roughness === 'number' ? sourceMaterial.roughness : 0.88,
      metalness: typeof sourceMaterial.metalness === 'number' ? sourceMaterial.metalness : 0.02,
      transparent: sourceMaterial.transparent ?? false,
      opacity: sourceMaterial.opacity ?? 1,
      side: sourceMaterial.side ?? THREE.FrontSide,
      alphaTest: sourceMaterial.alphaTest ?? 0,
      depthWrite: sourceMaterial.depthWrite ?? true,
      envMapIntensity: typeof sourceMaterial.envMapIntensity === 'number' ? sourceMaterial.envMapIntensity : 0.06,
      clearcoat: 0,
      clearcoatRoughness: 1
    })
    rockMaterial.name = material.name
    rockMaterial.userData = { ...material.userData }

    return this.tuneRockMaterial(rockMaterial, userData)
  }

  private createLeafMaterial(
    hue: number,
    layer: PlantLayer,
    plantType: Exclude<PlantType, 'ribbon-seaweed'>,
    role: PlantRenderRole = 'repeated'
  ): THREE.MeshPhysicalMaterial {
    const profile = this.getPlantMaterialProfile(layer, plantType, role)
    const silhouetteFamily = getPlantSilhouetteFamily(plantType)
    const useSolidBackgroundLeaf = layer === 'background' && role === 'repeated' && silhouetteFamily !== 'ribbon'
    const hueSaturation = plantType === 'crypt-brown'
      ? 0.28
      : silhouetteFamily === 'broad'
        ? 0.3
        : 0.26
    const hueLightness = layer === 'background'
      ? plantType === 'crypt-brown' ? 0.37 : 0.39
      : silhouetteFamily === 'broad'
        ? 0.35
        : plantType === 'crypt-brown' ? 0.31 : 0.33
    const color = this.getPlantTint(layer, plantType, role).lerp(
      new THREE.Color().setHSL(
        hue,
        hueSaturation,
        hueLightness
      ),
      role === 'hero' ? 0.34 : 0.22
    )

    const material = new THREE.MeshPhysicalMaterial({
      map: useSolidBackgroundLeaf ? null : this.getVisualTexture('leaf-diffuse'),
      alphaMap: useSolidBackgroundLeaf ? null : this.getVisualTexture('leaf-alpha'),
      normalMap: this.getVisualTexture('leaf-normal'),
      normalScale: new THREE.Vector2(
        silhouetteFamily === 'broad' ? 0.42 : 0.34,
        silhouetteFamily === 'broad' ? 0.42 : 0.34
      ),
      roughnessMap: this.getVisualTexture('leaf-roughness'),
      color,
      metalness: 0,
      roughness: profile.roughness,
      transmission: profile.transmission,
      thickness: profile.thickness,
      transparent: profile.transparent,
      opacity: profile.opacity,
      alphaTest: useSolidBackgroundLeaf ? 0 : profile.alphaTest,
      side: THREE.DoubleSide,
      envMapIntensity: profile.envMapIntensity,
      clearcoat: profile.clearcoat,
      clearcoatRoughness: profile.clearcoatRoughness
    })
    material.shadowSide = THREE.DoubleSide
    return material
  }

  private createHeroDriftwood(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const driftwoodGroup = new THREE.Group()
    if (this.layoutStyle === 'nature-showcase') {
      driftwoodGroup.position.set(
        center.x - size.x * 0.164,
        bounds.min.y + 0.94,
        center.z - size.z * 0.02
      )
      driftwoodGroup.rotation.set(-0.08, -0.58, 0.22)
      driftwoodGroup.scale.set(1.74, 1.38, 1.18)
    } else {
      driftwoodGroup.position.set(
        center.x + size.x * 0.056,
        bounds.min.y + 1.18,
        center.z + size.z * 0.12
      )
      driftwoodGroup.rotation.set(-0.01, -0.14, 0.2)
      driftwoodGroup.scale.set(1.72, 1.58, 1.34)
    }
    driftwoodGroup.userData = {
      role: 'hero-driftwood'
    }

    const driftwoodMaterial = this.createDriftwoodMaterial()
    driftwoodGroup.add(this.createHeroDriftwoodTrunk(driftwoodMaterial))

    const driftwoodAsset = this.cloneVisualModelGroup('driftwood-hero', {
      role: 'driftwood-asset-core'
    })
    if (driftwoodAsset) {
      driftwoodGroup.userData = {
        ...driftwoodGroup.userData,
        assetId: 'driftwood-hero'
      }
      this.fitHeroDriftwoodAssetCore(driftwoodAsset, size)
      driftwoodGroup.add(driftwoodAsset)
    }

    this.createHeroDriftwoodSecondaryAssets(size).forEach((branch) => {
      driftwoodGroup.add(branch)
    })

    driftwoodGroup.add(this.createHeroDriftwoodRootFlare(driftwoodMaterial))

    this.createHeroDriftwoodBranchAttachments(driftwoodMaterial).forEach((branch) => {
      driftwoodGroup.add(branch)
    })

    this.createHeroDriftwoodRoots(driftwoodMaterial).forEach((root) => {
      driftwoodGroup.add(root)
    })

    this.createHeroDriftwoodBrokenStubs(driftwoodMaterial).forEach((stub) => {
      driftwoodGroup.add(stub)
    })

    this.createHeroDriftwoodMossPatches().forEach((patch) => {
      driftwoodGroup.add(patch)
    })

    this.createHeroDriftwoodFineTwigs(driftwoodMaterial).forEach((twig) => {
      driftwoodGroup.add(twig)
    })

    this.createHeroDriftwoodRootBases(driftwoodMaterial).forEach((rootBase) => {
      driftwoodGroup.add(rootBase)
    })

    driftwoodGroup.add(this.createHeroDriftwoodLocalShadow())
    driftwoodGroup.add(this.createHeroDriftwoodLocalFill())
    driftwoodGroup.add(this.createHeroDriftwoodLocalRim())

    this.attachHardscapePlants(driftwoodGroup, 'driftwood')

    this.decorations.push(driftwoodGroup)
    this.group.add(driftwoodGroup)
  }

  private createHeroDriftwoodTrunk(material: THREE.Material): THREE.Mesh {
    const trunk = this.createDriftwoodTubeMesh({
      radius: 0.4,
      points: [
        new THREE.Vector3(-2.18, -0.08, 0.72),
        new THREE.Vector3(-1.12, 0.92, 0.54),
        new THREE.Vector3(0.26, 1.84, 0.18),
        new THREE.Vector3(2.1, 2.54, -0.22),
        new THREE.Vector3(4.08, 2.96, -1.02)
      ],
      tubularSegments: 50,
      radialSegments: 9,
      ellipseAspect: 1.56,
      tipScale: 0.5,
      flare: 0.6,
      twist: 0.66,
      barkAmplitude: 0.13
    }, material, 'driftwood-trunk')
    trunk.position.set(0.08, 0.22, 0.16)
    trunk.rotation.set(-0.02, 0.06, -0.08)
    trunk.scale.set(1.7, 1.36, 1.22)
    return trunk
  }

  private createHeroDriftwoodBranchAttachments(material: THREE.Material): THREE.Mesh[] {
    const branchDefinitions: DriftwoodTubeDefinition[] = this.layoutStyle === 'nature-showcase'
      ? [
        {
          radius: 0.108,
          points: [
            new THREE.Vector3(0.86, 1.76, 0.26),
            new THREE.Vector3(3.42, 3.14, 1.02),
            new THREE.Vector3(6.84, 4.28, 1.58)
          ],
          tubularSegments: 30,
          radialSegments: 7,
          ellipseAspect: 1.24,
          tipScale: 0.4,
          flare: 0.28,
          twist: 0.82,
          barkAmplitude: 0.12
        },
        {
          radius: 0.092,
          points: [
            new THREE.Vector3(-0.44, 1.22, 0.1),
            new THREE.Vector3(0.46, 2.08, -0.26),
            new THREE.Vector3(2.12, 3.18, -0.64)
          ],
          tubularSegments: 28,
          radialSegments: 7,
          ellipseAspect: 1.2,
          tipScale: 0.42,
          flare: 0.24,
          twist: 0.88,
          barkAmplitude: 0.11
        },
        {
          radius: 0.08,
          points: [
            new THREE.Vector3(-0.82, 1.14, -0.1),
            new THREE.Vector3(-0.18, 2.32, -0.72),
            new THREE.Vector3(0.88, 3.22, -1.32)
          ],
          tubularSegments: 28,
          radialSegments: 7,
          ellipseAspect: 1.18,
          tipScale: 0.38,
          flare: 0.22,
          twist: 0.94,
          barkAmplitude: 0.12
        },
        {
          radius: 0.076,
          points: [
            new THREE.Vector3(-1.08, 0.98, 0.18),
            new THREE.Vector3(-1.82, 1.92, -0.34),
            new THREE.Vector3(-2.74, 2.84, -0.9)
          ],
          tubularSegments: 26,
          radialSegments: 7,
          ellipseAspect: 1.16,
          tipScale: 0.36,
          flare: 0.2,
          twist: 0.9,
          barkAmplitude: 0.11
        }
      ]
      : [
        {
          radius: 0.104,
          points: [
            new THREE.Vector3(0.62, 1.84, 0.24),
            new THREE.Vector3(1.88, 3.14, 1.16),
            new THREE.Vector3(3.96, 4.02, 1.88)
          ],
          tubularSegments: 30,
          radialSegments: 7,
          ellipseAspect: 1.22,
          tipScale: 0.4,
          flare: 0.26,
          twist: 0.84,
          barkAmplitude: 0.12
        },
        {
          radius: 0.088,
          points: [
            new THREE.Vector3(-0.18, 1.64, -0.02),
            new THREE.Vector3(-0.96, 2.36, -0.58),
            new THREE.Vector3(-1.72, 3.02, -0.94)
          ],
          tubularSegments: 28,
          radialSegments: 7,
          ellipseAspect: 1.24,
          tipScale: 0.4,
          flare: 0.22,
          twist: 0.96,
          barkAmplitude: 0.12
        }
      ]

    return branchDefinitions.map((definition) => this.createDriftwoodTubeMesh(
      definition,
      material,
      'driftwood-branch-attachment'
    ))
  }

  private createHeroDriftwoodRoots(material: THREE.Material): THREE.Mesh[] {
    const rootDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.024,
        points: [
          new THREE.Vector3(-1.62, 0.42, 0.32),
          new THREE.Vector3(-1.5, -0.16, 0.18),
          new THREE.Vector3(-1.42, -0.54, 0.02)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.2,
        tipScale: 0.6,
        flare: 0.46,
        twist: 0.46,
        barkAmplitude: 0.11
      },
      {
        radius: 0.02,
        points: [
          new THREE.Vector3(-1.18, 0.36, 0.28),
          new THREE.Vector3(-1.02, -0.22, 0.14),
          new THREE.Vector3(-0.82, -0.44, 0.04)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.16,
        tipScale: 0.56,
        flare: 0.4,
        twist: 0.4,
        barkAmplitude: 0.1
      },
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(-0.22, 0.22, -0.02),
          new THREE.Vector3(0.12, -0.2, -0.18),
          new THREE.Vector3(0.56, -0.34, -0.42)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.14,
        tipScale: 0.52,
        flare: 0.34,
        twist: 0.34,
        barkAmplitude: 0.1
      }
    ]

    return rootDefinitions.map((definition) => this.createDriftwoodTubeMesh(definition, material, 'driftwood-root'))
  }

  private createHeroDriftwoodBrokenStubs(material: THREE.Material): THREE.Mesh[] {
    const brokenStubDefinitions = [
      {
        position: new THREE.Vector3(-0.1, 1.72, 0.16),
        rotation: new THREE.Euler(0.58, -0.28, 0.42),
        scale: new THREE.Vector3(0.12, 0.22, 0.1)
      },
      {
        position: new THREE.Vector3(0.92, 1.98, -0.18),
        rotation: new THREE.Euler(-0.32, 0.54, -0.18),
        scale: new THREE.Vector3(0.1, 0.18, 0.08)
      }
    ]

    return brokenStubDefinitions.map((definition) => {
      const stub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.04, 0.34, 7),
        material
      )
      stub.position.copy(definition.position)
      stub.rotation.copy(definition.rotation)
      stub.scale.copy(definition.scale)
      stub.castShadow = true
      stub.receiveShadow = true
      stub.userData = {
        role: 'driftwood-broken-stub'
      }
      return stub
    })
  }

  private createHeroDriftwoodMossPatches(): THREE.Mesh[] {
    const mossMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#556844'),
      roughness: 1,
      metalness: 0
    })
    const patchDefinitions = [
      {
        position: new THREE.Vector3(-0.94, 1.14, 0.62),
        rotation: new THREE.Euler(-0.3, 0.12, 0.16),
        scale: new THREE.Vector3(0.52, 0.08, 0.32),
        color: '#5d7247'
      },
      {
        position: new THREE.Vector3(0.52, 2.08, 0.92),
        rotation: new THREE.Euler(-0.34, 0.48, -0.06),
        scale: new THREE.Vector3(0.42, 0.08, 0.26),
        color: '#64784c'
      },
      {
        position: new THREE.Vector3(-0.62, 2.18, -0.28),
        rotation: new THREE.Euler(-0.24, -0.18, 0.1),
        scale: new THREE.Vector3(0.34, 0.07, 0.22),
        color: '#5b7046'
      }
    ]

    return patchDefinitions.map((definition) => {
      const patch = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 18, 12),
        mossMaterial.clone()
      )
      ;(patch.material as THREE.MeshStandardMaterial).color = new THREE.Color(definition.color)
      patch.position.copy(definition.position)
      patch.rotation.copy(definition.rotation)
      patch.scale.copy(definition.scale)
      patch.castShadow = true
      patch.receiveShadow = true
      patch.userData = {
        role: 'driftwood-moss-patch'
      }
      return patch
    })
  }

  private createHeroDriftwoodFineTwigs(material: THREE.Material): THREE.Mesh[] {
    const twigDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(1.74, 2.86, 1.08),
          new THREE.Vector3(2.38, 3.2, 1.36),
          new THREE.Vector3(3.12, 3.42, 1.52)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.14,
        tipScale: 0.28,
        flare: 0.12,
        twist: 0.68,
        barkAmplitude: 0.08
      },
      {
        radius: 0.014,
        points: [
          new THREE.Vector3(-0.84, 2.36, -0.56),
          new THREE.Vector3(-1.38, 2.64, -0.82),
          new THREE.Vector3(-1.96, 2.92, -1.04)
        ],
        tubularSegments: 16,
        radialSegments: 5,
        ellipseAspect: 1.12,
        tipScale: 0.24,
        flare: 0.1,
        twist: 0.74,
        barkAmplitude: 0.08
      },
      {
        radius: 0.016,
        points: [
          new THREE.Vector3(2.22, 2.54, -0.18),
          new THREE.Vector3(2.86, 2.72, -0.36),
          new THREE.Vector3(3.42, 2.86, -0.52)
        ],
        tubularSegments: 16,
        radialSegments: 5,
        ellipseAspect: 1.1,
        tipScale: 0.22,
        flare: 0.1,
        twist: 0.62,
        barkAmplitude: 0.08
      }
    ]

    return twigDefinitions.map((definition) => this.createDriftwoodTubeMesh(
      definition,
      material,
      'driftwood-fine-twig'
    ))
  }

  private createHeroDriftwoodRootBases(material: THREE.Material): THREE.Mesh[] {
    const rootBaseDefinitions = [
      {
        position: new THREE.Vector3(-2.18, -0.12, 0.74),
        rotation: new THREE.Euler(-0.24, 0.34, 0.1),
        scale: new THREE.Vector3(0.98, 0.22, 0.58)
      },
      {
        position: new THREE.Vector3(-1.42, -0.08, 0.36),
        rotation: new THREE.Euler(-0.18, 0.26, -0.04),
        scale: new THREE.Vector3(0.7, 0.18, 0.42)
      },
      {
        position: new THREE.Vector3(-2.46, -0.06, 0.92),
        rotation: new THREE.Euler(-0.28, 0.42, 0.2),
        scale: new THREE.Vector3(1.08, 0.24, 0.66)
      }
    ]

    return rootBaseDefinitions.map((definition) => {
      const rootBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 18, 12),
        material
      )
      rootBase.position.copy(definition.position)
      rootBase.rotation.copy(definition.rotation)
      rootBase.scale.copy(definition.scale)
      rootBase.castShadow = true
      rootBase.receiveShadow = true
      rootBase.userData = {
        role: 'driftwood-root-base'
      }
      return rootBase
    })
  }

  private createHeroDriftwoodRootFlare(material: THREE.Material): THREE.Mesh {
    const rootFlare = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 12),
      material
    )
    rootFlare.position.set(-2.04, -0.08, 0.58)
    rootFlare.scale.set(2.92, 1.08, 1.92)
    rootFlare.rotation.set(-0.26, 0.36, 0.1)
    rootFlare.castShadow = true
    rootFlare.receiveShadow = true
    rootFlare.userData = {
      role: 'driftwood-root-flare'
    }
    return rootFlare
  }

  private createHeroDriftwoodLocalShadow(): THREE.Mesh {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.08),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#102026'),
        transparent: true,
        opacity: 0.08,
        depthWrite: false
      })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(0.14, 0.08, 0.6)
    shadow.userData = {
      role: 'driftwood-local-shadow'
    }
    return shadow
  }

  private createHeroDriftwoodLocalFill(): THREE.PointLight {
    const fill = new THREE.PointLight('#f4ebd8', 3.4, 9.6, 1.8)
    fill.position.set(0.42, 0.76, 2.34)
    fill.userData = {
      role: 'driftwood-local-fill'
    }
    return fill
  }

  private createHeroDriftwoodLocalRim(): THREE.PointLight {
    const rim = new THREE.PointLight('#adc0b8', 1.04, 6.1, 1.8)
    rim.position.set(-1.18, 1.96, -1.08)
    rim.userData = {
      role: 'driftwood-local-rim'
    }
    return rim
  }

  private fitHeroDriftwoodAssetCore(asset: THREE.Group, tankSize: THREE.Vector3): void {
    asset.rotation.set(-0.24, 0.42, -0.08)

    const sourceBounds = new THREE.Box3().setFromObject(asset)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    const targetSize = new THREE.Vector3(
      tankSize.x * 0.312,
      tankSize.y * 0.35,
      tankSize.z * 0.244
    )

    asset.scale.set(
      targetSize.x / Math.max(sourceSize.x, 0.001),
      targetSize.y / Math.max(sourceSize.y, 0.001),
      targetSize.z / Math.max(sourceSize.z, 0.001)
    )

    const fittedBounds = new THREE.Box3().setFromObject(asset)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    asset.position.set(
      1.16 - fittedCenter.x,
      0.58 - fittedBounds.min.y,
      0.42 - fittedCenter.z
    )
  }

  private createHeroDriftwoodSecondaryAssets(tankSize: THREE.Vector3): THREE.Group[] {
    const definitions: DriftwoodSecondaryAssetDefinition[] = this.layoutStyle === 'nature-showcase'
      ? [
        {
          id: 'driftwood-secondary-a',
          position: new THREE.Vector3(-0.54, 1.06, 0.34),
          rotation: new THREE.Euler(-0.56, 0.48, 0.52),
          sizeRatio: new THREE.Vector3(0.13, 0.14, 0.1),
          buryAmount: 0.24,
          pieceRole: 'bridge'
        },
        {
          id: 'driftwood-secondary-b',
          position: new THREE.Vector3(2.24, 2.34, 0.58),
          rotation: new THREE.Euler(-0.28, 0.98, -0.08),
          sizeRatio: new THREE.Vector3(0.16, 0.17, 0.1),
          buryAmount: 0.08,
          pieceRole: 'counter-fork'
        },
        {
          id: 'driftwood-secondary-c',
          position: new THREE.Vector3(1.68, 3.18, -0.38),
          rotation: new THREE.Euler(0.22, 1.24, 0.74),
          sizeRatio: new THREE.Vector3(0.11, 0.13, 0.08),
          buryAmount: 0.03,
          pieceRole: 'uplift-fork'
        }
      ]
      : [
        {
          id: 'driftwood-secondary-a',
          position: new THREE.Vector3(-0.38, 1.18, 0.16),
          rotation: new THREE.Euler(-0.34, 0.34, 0.52),
          sizeRatio: new THREE.Vector3(0.13, 0.14, 0.09),
          buryAmount: 0.16,
          pieceRole: 'bridge'
        },
        {
          id: 'driftwood-secondary-b',
          position: new THREE.Vector3(2.22, 1.94, 0.64),
          rotation: new THREE.Euler(-0.44, 0.86, -0.24),
          sizeRatio: new THREE.Vector3(0.18, 0.16, 0.12),
          buryAmount: 0.05,
          pieceRole: 'counter-fork'
        },
        {
          id: 'driftwood-secondary-c',
          position: new THREE.Vector3(1.24, 2.58, -0.96),
          rotation: new THREE.Euler(0.04, 1.14, 0.46),
          sizeRatio: new THREE.Vector3(0.11, 0.12, 0.08),
          buryAmount: 0.02,
          pieceRole: 'uplift-fork'
        }
      ]

    return definitions.flatMap((definition) => {
      const branch = this.cloneVisualModelGroup(definition.id, {
        role: 'driftwood-secondary-branch',
        branchRole: definition.pieceRole,
        buryAmount: definition.buryAmount
      })
      if (!branch) {
        return []
      }
      this.fitHeroDriftwoodSecondaryAsset(branch, definition, tankSize)
      return [branch]
    })
  }

  private fitHeroDriftwoodSecondaryAsset(
    asset: THREE.Group,
    definition: DriftwoodSecondaryAssetDefinition,
    tankSize: THREE.Vector3
  ): void {
    asset.rotation.copy(definition.rotation)

    const sourceBounds = new THREE.Box3().setFromObject(asset)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    const targetSize = new THREE.Vector3(
      tankSize.x * definition.sizeRatio.x,
      tankSize.y * definition.sizeRatio.y,
      tankSize.z * definition.sizeRatio.z
    )

    asset.scale.set(
      targetSize.x / Math.max(sourceSize.x, 0.001),
      targetSize.y / Math.max(sourceSize.y, 0.001),
      targetSize.z / Math.max(sourceSize.z, 0.001)
    )

    const fittedBounds = new THREE.Box3().setFromObject(asset)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    const fittedHeight = Math.max(fittedBounds.max.y - fittedBounds.min.y, 0.001)
    asset.position.set(
      definition.position.x - fittedCenter.x,
      definition.position.y - fittedBounds.min.y - fittedHeight * definition.buryAmount,
      definition.position.z - fittedCenter.z
    )
  }

  private createHeroRockRidge(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const ridgeGroup = new THREE.Group()
    if (this.layoutStyle === 'nature-showcase') {
      ridgeGroup.position.set(
        center.x - size.x * 0.248,
        bounds.min.y + 0.4,
        center.z + size.z * 0.018
      )
      ridgeGroup.rotation.set(-0.08, 0.42, 0.08)
    } else {
      ridgeGroup.position.set(
        center.x + size.x * 0.182,
        bounds.min.y + 0.58,
        center.z - size.z * 0.112
      )
      ridgeGroup.rotation.y = -0.28
    }
    ridgeGroup.userData = {
      role: 'hero-rock-ridge'
    }

    const ridgeAsset = this.cloneVisualModelGroup('rock-ridge-hero', {
      role: 'hero-rock-ridge'
    })
    if (ridgeAsset) {
      ridgeAsset.position.copy(ridgeGroup.position)
      ridgeAsset.rotation.copy(ridgeGroup.rotation)
      ridgeAsset.scale.set(
        this.layoutStyle === 'nature-showcase' ? 0.82 : 1.18,
        this.layoutStyle === 'nature-showcase' ? 0.74 : 1.12,
        this.layoutStyle === 'nature-showcase' ? 0.88 : 1.18
      )
      this.attachHardscapePlants(ridgeAsset, 'rock')
      this.decorations.push(ridgeAsset)
      this.group.add(ridgeAsset)
      return
    }

    const ridgeRockDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          geometry: new THREE.DodecahedronGeometry(0.96, 0),
          position: new THREE.Vector3(-0.84, -0.08, 0.28),
          rotation: new THREE.Euler(0.18, 0.2, 0.24),
          scale: new THREE.Vector3(1.68, 0.46, 1.1),
          color: '#4d4742'
        },
        {
          geometry: new THREE.IcosahedronGeometry(0.58, 0),
          position: new THREE.Vector3(-0.02, 0.02, 0.02),
          rotation: new THREE.Euler(-0.1, 0.26, -0.12),
          scale: new THREE.Vector3(1.28, 0.54, 0.94),
          color: '#5a534d'
        },
        {
          geometry: new THREE.OctahedronGeometry(0.48, 0),
          position: new THREE.Vector3(0.78, 0.02, -0.14),
          rotation: new THREE.Euler(0.14, -0.24, 0.12),
          scale: new THREE.Vector3(1.14, 0.5, 1.02),
          color: '#3f3b37'
        }
      ]
      : [
      {
        geometry: new THREE.DodecahedronGeometry(0.92, 0),
        position: new THREE.Vector3(-1.05, 0.04, 0.46),
        rotation: new THREE.Euler(0.18, -0.22, 0.34),
        scale: new THREE.Vector3(1.7, 0.56, 1.08),
        color: '#70685b'
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.68, 0),
        position: new THREE.Vector3(0.18, 0.18, 0.08),
        rotation: new THREE.Euler(-0.14, 0.32, -0.18),
        scale: new THREE.Vector3(1.38, 0.74, 1.04),
        color: '#867c6a'
      },
      {
        geometry: new THREE.OctahedronGeometry(0.6, 0),
        position: new THREE.Vector3(1.18, 0.12, -0.34),
        rotation: new THREE.Euler(0.28, -0.34, 0.12),
        scale: new THREE.Vector3(1.24, 0.68, 1.28),
        color: '#625b4f'
      }
      ]
    ridgeRockDefinitions.forEach((definition) => {
      const rock = new THREE.Mesh(
        definition.geometry,
        this.createRockMaterial(definition.color, { role: 'hero-rock-ridge' })
      )
      rock.position.copy(definition.position)
      rock.rotation.copy(definition.rotation)
      rock.scale.copy(definition.scale)
      rock.castShadow = true
      rock.receiveShadow = true
      rock.userData = {
        role: 'ridge-rock'
      }
      ridgeGroup.add(rock)
    })

    const ridgeSlateDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          position: new THREE.Vector3(-0.22, 0.2, 0.16),
          rotation: new THREE.Euler(-0.18, 0.16, 0.32),
          scale: new THREE.Vector3(1.34, 0.08, 0.34),
          color: '#686156'
        },
        {
          position: new THREE.Vector3(0.42, 0.24, -0.02),
          rotation: new THREE.Euler(0.08, -0.26, 0.2),
          scale: new THREE.Vector3(1.3, 0.07, 0.3),
          color: '#575048'
        }
      ]
      : [
      {
        position: new THREE.Vector3(-0.36, 0.54, 0.24),
        rotation: new THREE.Euler(-0.18, 0.12, 0.42),
        scale: new THREE.Vector3(1.24, 0.08, 0.38),
        color: '#8d8473'
      },
      {
        position: new THREE.Vector3(0.58, 0.64, -0.12),
        rotation: new THREE.Euler(0.12, -0.34, 0.24),
        scale: new THREE.Vector3(1.42, 0.07, 0.32),
        color: '#70695e'
      },
      {
        position: new THREE.Vector3(1.42, 0.46, -0.48),
        rotation: new THREE.Euler(0.22, 0.28, 0.36),
        scale: new THREE.Vector3(1.02, 0.08, 0.28),
        color: '#9b927f'
      }
      ]
    ridgeSlateDefinitions.forEach((definition) => {
      const slate = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.16, 0.34),
        this.createRockMaterial(definition.color, { role: 'hero-rock-ridge' })
      )
      slate.position.copy(definition.position)
      slate.rotation.copy(definition.rotation)
      slate.scale.copy(definition.scale)
      slate.castShadow = true
      slate.receiveShadow = true
      slate.userData = {
        role: 'ridge-slate'
      }
      ridgeGroup.add(slate)
    })

    const ridgeRubbleDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        { position: new THREE.Vector3(-1.02, -0.12, 0.52), scale: 0.22, color: '#48433e' },
        { position: new THREE.Vector3(-0.36, -0.14, 0.58), scale: 0.18, color: '#60584e' },
        { position: new THREE.Vector3(0.12, -0.12, 0.34), scale: 0.18, color: '#49453f' },
        { position: new THREE.Vector3(0.62, -0.14, 0.1), scale: 0.16, color: '#6c6358' },
        { position: new THREE.Vector3(-0.56, -0.1, -0.12), scale: 0.16, color: '#544e48' }
      ]
      : [
      { position: new THREE.Vector3(-1.36, -0.06, 0.74), scale: 0.24, color: '#7a7264' },
      { position: new THREE.Vector3(-0.54, -0.12, 0.88), scale: 0.18, color: '#93886f' },
      { position: new THREE.Vector3(0.38, -0.08, 0.54), scale: 0.22, color: '#665f55' },
      { position: new THREE.Vector3(1.04, -0.1, -0.68), scale: 0.2, color: '#847a67' },
      { position: new THREE.Vector3(1.56, -0.06, -0.12), scale: 0.16, color: '#a09681' }
      ]
    ridgeRubbleDefinitions.forEach((definition, index) => {
      const rubbleGeometry = index % 2 === 0
        ? new THREE.DodecahedronGeometry(definition.scale, 0)
        : new THREE.IcosahedronGeometry(definition.scale, 0)
      const rubble = new THREE.Mesh(
        rubbleGeometry,
        this.createRockMaterial(definition.color, { role: 'hero-rock-ridge' })
      )
      rubble.position.copy(definition.position)
      rubble.rotation.set(
        0.14 + index * 0.05,
        -0.22 + index * 0.08,
        0.18 - index * 0.03
      )
      rubble.castShadow = true
      rubble.receiveShadow = true
      rubble.userData = {
        role: 'ridge-rubble'
      }
      ridgeGroup.add(rubble)
    })

    this.attachHardscapePlants(ridgeGroup, 'rock')
    this.decorations.push(ridgeGroup)
    this.group.add(ridgeGroup)
  }

  private createHeroCanopy(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const canopyDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          position: new THREE.Vector3(center.x - size.x * 0.34, bounds.min.y + 0.42, center.z - size.z * 0.22),
          rotationY: -0.46,
          scale: new THREE.Vector3(1.08, 2.1, 1.02),
          assetId: 'plant-vallisneria-tall',
          plantType: 'vallisneria-tall' as const,
          height: 8.8,
          hue: 0.24
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.2, bounds.min.y + 0.42, center.z - size.z * 0.18),
          rotationY: -0.2,
          scale: new THREE.Vector3(0.98, 1.72, 0.94),
          assetId: 'plant-stem-green-bush',
          plantType: 'stem-green-bush' as const,
          height: 7.4,
          hue: 0.27
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.06, bounds.min.y + 0.42, center.z - size.z * 0.12),
          rotationY: 0.08,
          scale: new THREE.Vector3(0.88, 1.46, 0.84),
          assetId: 'plant-javafern-large',
          plantType: 'javafern-large' as const,
          height: 6.6,
          hue: 0.29
        }
      ]
      : [
        {
          position: new THREE.Vector3(center.x - size.x * 0.25, bounds.min.y + 0.42, center.z - size.z * 0.2),
          rotationY: -0.42,
          scale: new THREE.Vector3(1.14, 2.22, 1.08),
          assetId: 'plant-vallisneria-tall',
          plantType: 'vallisneria-tall' as const,
          height: 9.4,
          hue: 0.24
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.1, bounds.min.y + 0.42, center.z - size.z * 0.26),
          rotationY: -0.16,
          scale: new THREE.Vector3(1.06, 1.94, 1.02),
          assetId: 'plant-stem-green-bush',
          plantType: 'stem-green-bush' as const,
          height: 8.2,
          hue: 0.27
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.02, bounds.min.y + 0.42, center.z - size.z * 0.32),
          rotationY: -0.02,
          scale: new THREE.Vector3(1.18, 2.12, 1.16),
          assetId: 'plant-javafern-large',
          plantType: 'javafern-large' as const,
          height: 9.1,
          hue: 0.29
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.12, bounds.min.y + 0.42, center.z - size.z * 0.24),
          rotationY: 0.16,
          scale: new THREE.Vector3(1.02, 1.9, 0.96),
          assetId: 'plant-hygrophila-rear',
          plantType: 'hygrophila-rear' as const,
          height: 7.9,
          hue: 0.274
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.28, bounds.min.y + 0.42, center.z - size.z * 0.21),
          rotationY: 0.3,
          scale: new THREE.Vector3(0.98, 2.08, 0.86),
          assetId: 'plant-stem-green-bush',
          plantType: 'stem-green-bush' as const,
          height: 8.8,
          hue: 0.282
        }
      ]
    canopyDefinitions.forEach((definition) => {
      const assetCanopy = this.cloneVisualModelGroup(definition.assetId, {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.plantType
      })
      if (assetCanopy) {
        this.addPlantMassFiller(
          assetCanopy,
          'background',
          definition.height * 0.92,
          definition.hue,
          definition.plantType,
          true
        )
        assetCanopy.position.copy(definition.position)
        assetCanopy.rotation.y = definition.rotationY
        assetCanopy.scale.copy(definition.scale)
        this.plants.push(assetCanopy)
        this.group.add(assetCanopy)
        return
      }

      const canopyGroup = new THREE.Group()
      canopyGroup.position.copy(definition.position)
      canopyGroup.rotation.y = definition.rotationY
      canopyGroup.scale.copy(definition.scale)
      canopyGroup.userData = {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.plantType
      }

      this.addPlantMassFiller(canopyGroup, 'background', definition.height, definition.hue, definition.plantType, true)

      this.plants.push(canopyGroup)
      this.group.add(canopyGroup)
    })
  }

  private attachHardscapePlants(
    parentGroup: THREE.Group,
    host: HardscapePlantHost
  ): void {
    const anchors = resolveHardscapePlantAnchors(this.layoutStyle).filter((anchor) => anchor.host === host)

    anchors.forEach((anchor) => {
      const userData = {
        role: 'epiphyte-cluster',
        massRole: anchor.massRole,
        layer: anchor.layer,
        plantType: anchor.plantType,
        anchorId: anchor.id
      }
      const assetCluster = this.cloneFirstAvailableVisualModelGroup(anchor.assetIds ?? [], userData)
      const cluster = assetCluster ?? this.createEpiphyteCluster(anchor.plantType, anchor.hueBase, anchor.layer)

      if (assetCluster) {
        this.addPlantMassFiller(cluster, anchor.layer, anchor.height, anchor.hueBase, anchor.plantType, false)
      }

      cluster.userData = {
        ...cluster.userData,
        ...userData
      }
      cluster.position.copy(anchor.position)
      cluster.rotation.copy(anchor.rotation)
      cluster.scale.copy(anchor.scale)
      parentGroup.add(cluster)
      this.plants.push(cluster)
    })
  }

  private createEpiphyteCluster(
    plantType: Exclude<PlantType, 'ribbon-seaweed'>,
    hue: number,
    layer: PlantLayer = 'midground'
  ): THREE.Group {
    const cluster = new THREE.Group()
    cluster.userData = {
      role: 'epiphyte-cluster',
      layer,
      plantType
    }
    const baseHeight = plantType === 'anubias-petite-clump'
      ? 1.18
      : plantType === 'anubias-nana-clump'
        ? 1.54
        : plantType === 'javafern-large'
          ? 2.12
          : 1.78
    this.populatePlantCluster(cluster, { plantType, layer }, baseHeight, hue)
    cluster.scale.multiplyScalar(
      plantType === 'anubias-petite-clump'
        ? 0.22
        : plantType === 'anubias-nana-clump'
          ? 0.24
          : plantType === 'javafern-large'
            ? 0.28
            : 0.24
    )
    cluster.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return
      }
      child.userData = {
        ...child.userData,
        role: 'epiphyte-leaf'
      }
    })

    return cluster
  }

  private createDriftwoodTubeMesh(
    definition: DriftwoodTubeDefinition,
    material: THREE.Material,
    role: 'driftwood-trunk' | 'driftwood-branch-attachment' | 'driftwood-root' | 'driftwood-fine-twig'
  ): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(definition.points)
    const geometry = new THREE.TubeGeometry(
      curve,
      definition.tubularSegments,
      definition.radius,
      definition.radialSegments,
      false
    )

    this.deformDriftwoodTubeGeometry(geometry, curve, definition)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      role,
      crossSectionAspect: definition.ellipseAspect,
      baseRadius: definition.radius * (1 + definition.flare * 0.35),
      tipRadius: definition.radius * definition.tipScale
    }
    return mesh
  }

  private deformDriftwoodTubeGeometry(
    geometry: THREE.TubeGeometry,
    curve: THREE.CatmullRomCurve3,
    definition: DriftwoodTubeDefinition
  ): void {
    const position = geometry.getAttribute('position')
    const normals = (geometry as THREE.TubeGeometry & {
      normals: THREE.Vector3[]
      binormals: THREE.Vector3[]
    }).normals
    const binormals = (geometry as THREE.TubeGeometry & {
      normals: THREE.Vector3[]
      binormals: THREE.Vector3[]
    }).binormals
    const ringSize = definition.radialSegments + 1
    const ringCenter = new THREE.Vector3()
    const radialOffset = new THREE.Vector3()
    const tangentNormal = new THREE.Vector3()
    const tangentBinormal = new THREE.Vector3()
    const nextVertex = new THREE.Vector3()

    for (let i = 0; i <= definition.tubularSegments; i++) {
      const t = i / definition.tubularSegments
      ringCenter.copy(curve.getPointAt(t))
      tangentNormal.copy(normals[i] ?? normals[normals.length - 1] ?? new THREE.Vector3(1, 0, 0))
      tangentBinormal.copy(binormals[i] ?? binormals[binormals.length - 1] ?? new THREE.Vector3(0, 0, 1))
      const ringTwist = definition.twist * t + Math.sin(t * 9.5) * 0.08
      const radiusBase = THREE.MathUtils.lerp(
        definition.radius * (1 + definition.flare * Math.pow(1 - t, 1.8)),
        definition.radius * definition.tipScale,
        Math.pow(t, 0.82)
      )

      for (let j = 0; j < ringSize; j++) {
        const index = i * ringSize + j
        nextVertex.fromBufferAttribute(position, index)
        radialOffset.copy(nextVertex).sub(ringCenter)

        const normalComponent = radialOffset.dot(tangentNormal)
        const binormalComponent = radialOffset.dot(tangentBinormal)
        const angle = Math.atan2(binormalComponent, normalComponent)
        const barkNoise = (
          Math.sin(t * 26 + angle * 6.2)
          + Math.sin(t * 48 - angle * 10.4) * 0.55
        ) * definition.barkAmplitude
        const knotBand = Math.max(
          Math.exp(-Math.pow((t - 0.22) / 0.08, 2)) * 0.12,
          Math.exp(-Math.pow((t - 0.58) / 0.1, 2)) * 0.16
        ) * Math.max(0, Math.cos(angle - 0.5))
        const rotatedAngle = angle + ringTwist
        const ellipseNormal = Math.cos(rotatedAngle) * definition.ellipseAspect
        const ellipseBinormal = Math.sin(rotatedAngle) / definition.ellipseAspect
        const radius = radiusBase * (1 + barkNoise + knotBand)

        nextVertex.copy(ringCenter)
        nextVertex.addScaledVector(tangentNormal, radius * ellipseNormal)
        nextVertex.addScaledVector(tangentBinormal, radius * ellipseBinormal)
        position.setXYZ(index, nextVertex.x, nextVertex.y, nextVertex.z)
      }
    }

    position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  private createDriftwoodMaterial(): THREE.MeshPhysicalMaterial {
    return this.createDriftwoodReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6f5641')
    }))
  }

  private createDriftwoodBurialDetails(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const driftwoodGroup = this.group.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-driftwood'
    )
    if (!driftwoodGroup) return

    const burialShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x * 0.23, size.z * 0.18),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#102026'),
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
    )
    burialShadow.rotation.x = -Math.PI / 2
    burialShadow.position.set(-1.86, 0.02, 0.7)
    burialShadow.userData = {
      role: 'driftwood-burial-shadow'
    }
    driftwoodGroup.add(burialShadow)

    const burialLip = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 20, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#b09a7d'),
        roughness: 0.98,
        metalness: 0
      })
    )
    burialLip.position.set(-2.02, 0.14, 0.66)
    burialLip.scale.set(1.96, 0.22, 1.14)
    burialLip.rotation.set(-0.18, 0.3, 0.12)
    burialLip.receiveShadow = true
    burialLip.userData = {
      role: 'driftwood-burial-lip'
    }
    driftwoodGroup.add(burialLip)

    const moundDefinitions = [
      {
        offset: new THREE.Vector3(-2.18, 0.14, 0.72),
        scale: new THREE.Vector3(1.12, 0.24, 0.6),
        color: '#9b896e'
      },
      {
        offset: new THREE.Vector3(-1.54, 0.1, 0.56),
        scale: new THREE.Vector3(0.82, 0.16, 0.46),
        color: '#85745b'
      },
      {
        offset: new THREE.Vector3(-1.92, 0.12, 0.38),
        scale: new THREE.Vector3(0.64, 0.14, 0.34),
        color: '#85745b'
      },
      {
        offset: new THREE.Vector3(-1.18, 0.08, 0.28),
        scale: new THREE.Vector3(0.58, 0.12, 0.3),
        color: '#85745b'
      }
    ]
    moundDefinitions.forEach((definition) => {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 18, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(definition.color),
          roughness: 0.98,
          metalness: 0
        })
      )
      mound.position.copy(definition.offset)
      mound.scale.copy(definition.scale)
      mound.receiveShadow = true
      mound.userData = {
        role: 'driftwood-detritus-mound'
      }
      driftwoodGroup.add(mound)
    })
  }

  private ensureAoUv2(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const needsAoUv = materials.some(
      (material) => material instanceof THREE.MeshStandardMaterial && Boolean(material.aoMap)
    )
    if (!needsAoUv) return

    const geometry = mesh.geometry
    const uv = geometry.getAttribute('uv')
    if (!uv || geometry.getAttribute('uv2')) return

    const nextGeometry = geometry.userData.sharedAsset ? geometry.clone() : geometry
    nextGeometry.setAttribute('uv2', uv.clone())
    mesh.geometry = nextGeometry
  }

  private createRockMaterial(color: string, userData: Record<string, unknown> = {}): THREE.MeshPhysicalMaterial {
    return this.createRockReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color(color)
    }), userData)
  }

  private createRockClusterMesh(pieceDefinition: RockClusterPieceDefinition): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.createDeformedRockGeometry(
        pieceDefinition.geometry,
        pieceDefinition.radius,
        pieceDefinition.detail,
        pieceDefinition.seed
      ),
      this.createRockMaterial(pieceDefinition.color, { role: pieceDefinition.role })
    )
    mesh.position.copy(pieceDefinition.offset)
    mesh.rotation.copy(pieceDefinition.rotation)
    mesh.scale.copy(pieceDefinition.scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      role: pieceDefinition.role,
      clusterSeed: pieceDefinition.seed
    }
    return mesh
  }

  private createDeformedRockGeometry(
    shape: RockClusterShape,
    radius: number,
    detail: number,
    seed: number
  ): THREE.BufferGeometry {
    const geometry = shape === 'icosahedron'
      ? new THREE.IcosahedronGeometry(radius, detail)
      : shape === 'octahedron'
        ? new THREE.OctahedronGeometry(radius, detail)
        : new THREE.DodecahedronGeometry(radius, detail)
    const positionAttribute = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    const normal = new THREE.Vector3()
    const chipDirection = new THREE.Vector3(
      Math.sin(seed * 2.1) * 0.74,
      -0.84 + Math.cos(seed * 1.3) * 0.12,
      Math.cos(seed * 1.7) * 0.68
    ).normalize()
    const shearX = Math.sin(seed * 1.9) * 0.22
    const shearZ = Math.cos(seed * 2.3) * 0.18

    for (let index = 0; index < positionAttribute.count; index++) {
      vertex.fromBufferAttribute(positionAttribute, index)
      normal.copy(vertex).normalize()

      const normalizedX = vertex.x / Math.max(radius, 0.001)
      const normalizedY = vertex.y / Math.max(radius, 0.001)
      const normalizedZ = vertex.z / Math.max(radius, 0.001)
      const layeredNoise = (
        Math.sin(normalizedX * 4.8 + seed * 1.6) * 0.09
        + Math.cos(normalizedY * 6.1 - seed * 0.8) * 0.06
        + Math.sin(normalizedZ * 5.4 + seed * 2.2) * 0.05
      )
      const stratum = Math.sin((normalizedX + normalizedZ) * 4.2 + seed * 1.4) * 0.03
      const chip = Math.max(0, normal.dot(chipDirection) - 0.38) * 0.28
      const originalY = vertex.y

      vertex.multiplyScalar(1 + layeredNoise + stratum - chip)
      vertex.x += originalY * shearX
      vertex.z += originalY * shearZ
      vertex.y = originalY < 0 ? vertex.y * 0.68 : vertex.y * 0.9
      if (originalY < radius * -0.28) {
        vertex.y -= radius * 0.08
      }

      positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }

    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }

  private createFallbackSupportRockGroup(
    role: 'hero-rock' | 'support-rock' | 'support-rock-chip',
    pieceDefinitions: RockClusterPieceDefinition[]
  ): THREE.Group {
    const rockGroup = new THREE.Group()
    rockGroup.userData = {
      role
    }

    pieceDefinitions.forEach((pieceDefinition) => {
      rockGroup.add(this.createRockClusterMesh(pieceDefinition))
    })

    return rockGroup
  }

  private sinkObjectIntoSubstrate(
    object: THREE.Object3D,
    surfaceY: number,
    burialRatio: number
  ): void {
    object.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(object)
    const height = Math.max(bounds.max.y - bounds.min.y, 0.001)
    const targetBottomY = surfaceY - height * burialRatio
    object.position.y += targetBottomY - bounds.min.y
  }

  private createSupportRockCluster(
    definition: SupportRockClusterDefinition,
    surfaceY: number
  ): THREE.Group {
    const clusterGroup = new THREE.Group()
    clusterGroup.position.copy(definition.position)
    clusterGroup.userData = {
      role: 'support-rock-cluster',
      side: definition.side
    }

    definition.elements.forEach((element) => {
      const clusterElement = element.role === 'support-rock-scatter'
        ? this.cloneFirstAvailableVisualModelGroup(element.assetIds, { role: element.role })
          ?? this.createFallbackPebbleCluster(
            element.fallbackPebbleSeed ?? 0,
            element.fallbackPebbleColors ?? ['#867d70', '#968c7d', '#756c60']
          )
        : this.cloneFirstAvailableVisualModelGroup(element.assetIds, { role: element.role })
          ?? this.createFallbackSupportRockGroup(element.role, element.fallbackPieceDefinitions ?? [])

      clusterElement.position.set(element.offset.x, 0, element.offset.z)
      clusterElement.rotation.copy(element.rotation)
      clusterElement.scale.copy(element.scale)
      clusterGroup.add(clusterElement)
      this.sinkObjectIntoSubstrate(clusterElement, surfaceY, element.burialRatio)
    })

    return clusterGroup
  }

  private createFallbackPebbleCluster(seed: number, colors: string[]): THREE.Group {
    const pebbleGroup = new THREE.Group()
    pebbleGroup.userData = {
      role: 'support-rock-scatter'
    }

    ;[
      {
        geometry: 'dodecahedron' as const,
        radius: 0.22,
        detail: 1,
        offset: new THREE.Vector3(0, 0.16, 0),
        rotation: new THREE.Euler(0.12, -0.18, 0.06),
        scale: new THREE.Vector3(1.18, 0.64, 0.92),
        color: colors[0] ?? '#867d70',
        seed: seed + 0.1
      },
      {
        geometry: 'icosahedron' as const,
        radius: 0.16,
        detail: 1,
        offset: new THREE.Vector3(0.26, 0.08, -0.08),
        rotation: new THREE.Euler(-0.08, 0.3, -0.12),
        scale: new THREE.Vector3(0.92, 0.54, 0.84),
        color: colors[1] ?? '#968c7d',
        seed: seed + 0.5
      },
      {
        geometry: 'octahedron' as const,
        radius: 0.12,
        detail: 1,
        offset: new THREE.Vector3(-0.22, 0.06, 0.12),
        rotation: new THREE.Euler(0.1, -0.24, 0.08),
        scale: new THREE.Vector3(0.86, 0.48, 0.78),
        color: colors[2] ?? '#756c60',
        seed: seed + 0.9
      },
      {
        geometry: 'dodecahedron' as const,
        radius: 0.1,
        detail: 1,
        offset: new THREE.Vector3(0.08, 0.03, 0.18),
        rotation: new THREE.Euler(0.06, 0.18, 0.04),
        scale: new THREE.Vector3(0.78, 0.42, 0.72),
        color: colors[0] ?? '#867d70',
        seed: seed + 1.4
      }
    ].forEach((definition) => {
      pebbleGroup.add(this.createRockClusterMesh({
        ...definition,
        role: 'support-rock-pebble'
      }))
    })

    return pebbleGroup
  }
  
  private createCorals(bounds: THREE.Box3): void {
    const coralCount = 8
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < coralCount; i++) {
      const coralGroup = new THREE.Group()
      coralGroup.userData = {
        role: 'marine-accent',
        accentType: 'coral'
      }
      
      const x = (Math.random() - 0.5) * size.x * 0.6
      const z = (Math.random() - 0.5) * size.z * 0.6
      const y = bounds.min.y + 0.42  // 砂層の高さに合わせる
      
      coralGroup.position.set(x, y, z)
      
      // Branch coral structure
      const branchCount = 3 + Math.floor(Math.random() * 4)
      
      for (let j = 0; j < branchCount; j++) {
        const branchHeight = 0.5 + Math.random() * 1.5
        const branchRadius = 0.05 + Math.random() * 0.03
        
        const geometry = new THREE.ConeGeometry(
          branchRadius * 2,
          branchHeight,
          6
        )
        
        const coralColors = [
          new THREE.Color(0xff6b47),
          new THREE.Color(0xff8c69),
          new THREE.Color(0xffa500),
          new THREE.Color(0xff69b4)
        ]
        
        const material = new THREE.MeshPhysicalMaterial({
          color: coralColors[Math.floor(Math.random() * coralColors.length)],
          metalness: 0,
          roughness: 0.9,
          clearcoat: 0.3,
          clearcoatRoughness: 0.8
        })
        
        const branch = new THREE.Mesh(geometry, material)
        branch.position.y = branchHeight / 2
        branch.rotation.x = (Math.random() - 0.5) * 0.5
        branch.rotation.z = (Math.random() - 0.5) * 0.5
        branch.rotation.y = (j / branchCount) * Math.PI * 2 + Math.random() * 0.5
        branch.castShadow = true
        branch.receiveShadow = true
        
        coralGroup.add(branch)
      }
      
      this.decorations.push(coralGroup)
      this.group.add(coralGroup)
    }
  }
  
  private createRocks(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    const surfaceY = bounds.min.y + 0.42

    if (this.layoutStyle === 'nature-showcase') {
      const heroRockPlacement = {
        role: 'hero-rock' as const,
        assetIds: ['rock-lava-base-cluster-a', 'rock-support-c', 'rock-support-a'],
        position: new THREE.Vector3(center.x - size.x * 0.284, surfaceY - 0.18, center.z - size.z * 0.018),
        rotation: new THREE.Euler(-0.18, 0.56, -0.04),
        scale: new THREE.Vector3(1.28, 1.14, 1.18),
        pieceDefinitions: [
          {
            geometry: 'dodecahedron' as const,
            radius: 0.94,
            detail: 1,
            offset: new THREE.Vector3(-0.08, 0.44, 0.02),
            rotation: new THREE.Euler(0.16, 0.24, 0.14),
            scale: new THREE.Vector3(1.52, 0.82, 1.24),
            color: '#4c4640',
            seed: 9.1,
            role: 'support-rock-piece' as const
          },
          {
            geometry: 'icosahedron' as const,
            radius: 0.44,
            detail: 1,
            offset: new THREE.Vector3(0.56, 0.16, -0.14),
            rotation: new THREE.Euler(-0.08, 0.18, -0.1),
            scale: new THREE.Vector3(1, 0.52, 0.88),
            color: '#60594f',
            seed: 9.6,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'octahedron' as const,
            radius: 0.3,
            detail: 1,
            offset: new THREE.Vector3(-0.54, 0.12, 0.3),
            rotation: new THREE.Euler(0.14, -0.26, 0.08),
            scale: new THREE.Vector3(0.96, 0.46, 0.84),
            color: '#3f3b37',
            seed: 10.1,
            role: 'support-rock-chip' as const
          }
        ]
      }

      const heroRock = this.cloneFirstAvailableVisualModelGroup(heroRockPlacement.assetIds, {
        role: heroRockPlacement.role
      }) ?? this.createFallbackSupportRockGroup(heroRockPlacement.role, heroRockPlacement.pieceDefinitions)
      heroRock.position.copy(heroRockPlacement.position)
      heroRock.rotation.copy(heroRockPlacement.rotation)
      heroRock.scale.copy(heroRockPlacement.scale)
      this.decorations.push(heroRock)
      this.group.add(heroRock)

      const leftMoundClusters: SupportRockClusterDefinition[] = [
        {
          side: 'left',
          position: new THREE.Vector3(center.x - size.x * 0.38, surfaceY, center.z - size.z * 0.08),
          elements: [
            {
              role: 'support-rock',
              assetIds: ['rock-lava-base-cluster-a', 'rock-support-c'],
              offset: new THREE.Vector3(0, 0, 0),
              rotation: new THREE.Euler(0.06, 0.58, -0.04),
              scale: new THREE.Vector3(1.04, 0.96, 1),
              burialRatio: 0.16,
              fallbackPieceDefinitions: heroRockPlacement.pieceDefinitions
            },
            {
              role: 'support-rock-chip',
              assetIds: ['rock-lava-base-cluster-b', 'rock-support-a'],
              offset: new THREE.Vector3(0.84, 0, 0.08),
              rotation: new THREE.Euler(-0.08, 0.2, -0.08),
              scale: new THREE.Vector3(0.58, 0.52, 0.56),
              burialRatio: 0.16,
              fallbackPieceDefinitions: [
                {
                  geometry: 'icosahedron',
                  radius: 0.34,
                  detail: 1,
                  offset: new THREE.Vector3(0, 0.22, 0),
                  rotation: new THREE.Euler(0.04, 0.18, -0.06),
                  scale: new THREE.Vector3(1, 0.54, 0.8),
                  color: '#75695b',
                  seed: 10.7,
                  role: 'support-rock-chip'
                }
              ]
            },
            {
              role: 'support-rock-scatter',
              assetIds: ['rock-lava-transition-chips', 'rock-pebble-cluster'],
              offset: new THREE.Vector3(-0.48, 0, 0.34),
              rotation: new THREE.Euler(0.02, -0.16, 0.02),
              scale: new THREE.Vector3(0.68, 0.62, 0.66),
              burialRatio: 0.18,
              fallbackPebbleSeed: 11.2,
              fallbackPebbleColors: ['#655c52', '#7d7264', '#534d46']
            }
          ]
        },
        {
          side: 'left',
          position: new THREE.Vector3(center.x - size.x * 0.28, surfaceY, center.z + size.z * 0.02),
          elements: [
            {
              role: 'support-rock',
              assetIds: ['rock-lava-base-cluster-b', 'rock-support-b'],
              offset: new THREE.Vector3(0.02, 0, 0),
              rotation: new THREE.Euler(-0.12, 0.18, 0.08),
              scale: new THREE.Vector3(0.96, 0.82, 0.94),
              burialRatio: 0.16,
              fallbackPieceDefinitions: [
                {
                  geometry: 'dodecahedron',
                  radius: 0.72,
                  detail: 1,
                  offset: new THREE.Vector3(0, 0.42, 0),
                  rotation: new THREE.Euler(-0.08, 0.2, 0.08),
                  scale: new THREE.Vector3(1.22, 0.68, 1.04),
                  color: '#6a6256',
                  seed: 11.8,
                  role: 'support-rock-piece'
                },
                {
                  geometry: 'octahedron',
                  radius: 0.22,
                  detail: 1,
                  offset: new THREE.Vector3(-0.38, 0.12, 0.18),
                  rotation: new THREE.Euler(0.08, -0.22, 0.08),
                  scale: new THREE.Vector3(0.88, 0.46, 0.76),
                  color: '#827766',
                  seed: 12.2,
                  role: 'support-rock-chip'
                }
              ]
            },
            {
              role: 'support-rock-scatter',
              assetIds: ['rock-lava-transition-chips', 'rock-pebble-cluster'],
              offset: new THREE.Vector3(0.58, 0, 0.28),
              rotation: new THREE.Euler(-0.02, 0.12, 0.04),
              scale: new THREE.Vector3(0.58, 0.52, 0.56),
              burialRatio: 0.16,
              fallbackPebbleSeed: 12.9,
              fallbackPebbleColors: ['#73685c', '#564f49', '#8a7d6e']
            }
          ]
        },
        {
          side: 'left',
          position: new THREE.Vector3(center.x - size.x * 0.18, surfaceY, center.z - size.z * 0.12),
          elements: [
            {
              role: 'support-rock',
              assetIds: ['rock-lava-base-cluster-b', 'rock-support-c'],
              offset: new THREE.Vector3(-0.08, 0, 0.04),
              rotation: new THREE.Euler(-0.1, -0.18, 0.1),
              scale: new THREE.Vector3(0.7, 0.64, 0.68),
              burialRatio: 0.16,
              fallbackPieceDefinitions: [
                {
                  geometry: 'dodecahedron',
                  radius: 0.48,
                  detail: 1,
                  offset: new THREE.Vector3(0, 0.28, 0),
                  rotation: new THREE.Euler(0.04, -0.16, 0.08),
                  scale: new THREE.Vector3(1.14, 0.58, 0.9),
                  color: '#524c45',
                  seed: 13.1,
                  role: 'support-rock-piece'
                }
              ]
            },
            {
              role: 'support-rock-chip',
              assetIds: ['rock-support-a', 'rock-support-b'],
              offset: new THREE.Vector3(0.54, 0, 0.16),
              rotation: new THREE.Euler(-0.04, -0.18, 0.08),
              scale: new THREE.Vector3(0.56, 0.5, 0.5),
              burialRatio: 0.14,
              fallbackPieceDefinitions: [
                {
                  geometry: 'dodecahedron',
                  radius: 0.32,
                  detail: 1,
                  offset: new THREE.Vector3(0, 0.2, 0),
                  rotation: new THREE.Euler(0.06, -0.14, 0.1),
                  scale: new THREE.Vector3(0.94, 0.56, 0.8),
                  color: '#70675b',
                  seed: 13.4,
                  role: 'support-rock-chip'
                }
              ]
            },
            {
              role: 'support-rock-scatter',
              assetIds: ['rock-lava-transition-chips', 'rock-pebble-cluster'],
              offset: new THREE.Vector3(0.8, 0, 0.34),
              rotation: new THREE.Euler(0.04, -0.08, 0.02),
              scale: new THREE.Vector3(0.56, 0.52, 0.54),
              burialRatio: 0.16,
              fallbackPebbleSeed: 13.9,
              fallbackPebbleColors: ['#6b6258', '#8d806f', '#4f4a45']
            }
          ]
        },
        {
          side: 'left',
          position: new THREE.Vector3(center.x - size.x * 0.08, surfaceY, center.z + size.z * 0.12),
          elements: [
            {
              role: 'support-rock-scatter',
              assetIds: ['rock-lava-transition-chips', 'rock-pebble-cluster'],
              offset: new THREE.Vector3(0, 0, 0),
              rotation: new THREE.Euler(0.04, -0.06, 0.02),
              scale: new THREE.Vector3(0.62, 0.58, 0.6),
              burialRatio: 0.18,
              fallbackPebbleSeed: 14.3,
              fallbackPebbleColors: ['#554f49', '#73685d', '#8d7f6d']
            },
            {
              role: 'support-rock-chip',
              assetIds: ['rock-support-a', 'rock-support-b'],
              offset: new THREE.Vector3(-0.34, 0, -0.2),
              rotation: new THREE.Euler(0.04, 0.08, -0.02),
              scale: new THREE.Vector3(0.46, 0.42, 0.44),
              burialRatio: 0.18,
              fallbackPieceDefinitions: [
                {
                  geometry: 'octahedron',
                  radius: 0.24,
                  detail: 1,
                  offset: new THREE.Vector3(0, 0.14, 0),
                  rotation: new THREE.Euler(0.1, 0.16, -0.04),
                  scale: new THREE.Vector3(0.92, 0.46, 0.74),
                  color: '#675d52',
                  seed: 14.8,
                  role: 'support-rock-chip'
                }
              ]
            }
          ]
        }
      ]

      leftMoundClusters.forEach((placement) => {
        const cluster = this.createSupportRockCluster(placement, surfaceY)
        this.decorations.push(cluster)
        this.group.add(cluster)
      })
      return
    }

    const heroRockPlacement = {
      role: 'hero-rock' as const,
      assetIds: ['rock-support-c', 'rock-support-a'],
      position: new THREE.Vector3(center.x - size.x * 0.05, surfaceY - 0.08, center.z + size.z * 0.07),
      rotation: new THREE.Euler(-0.08, -0.26, 0.04),
      scale: new THREE.Vector3(0.82, 0.76, 0.84),
      pieceDefinitions: [
        {
          geometry: 'dodecahedron' as const,
          radius: 0.7,
          detail: 1,
          offset: new THREE.Vector3(0, 0.5, 0),
          rotation: new THREE.Euler(0.12, -0.2, 0.1),
          scale: new THREE.Vector3(1.26, 0.72, 1.02),
          color: '#8e8679',
          seed: 0.4,
          role: 'support-rock-piece' as const
        },
        {
          geometry: 'icosahedron' as const,
          radius: 0.32,
          detail: 1,
          offset: new THREE.Vector3(0.44, 0.18, -0.18),
          rotation: new THREE.Euler(-0.08, 0.32, -0.06),
          scale: new THREE.Vector3(0.92, 0.56, 0.84),
          color: '#9b907d',
          seed: 1.1,
          role: 'support-rock-chip' as const
        },
        {
          geometry: 'octahedron' as const,
          radius: 0.22,
          detail: 1,
          offset: new THREE.Vector3(-0.38, 0.14, 0.2),
          rotation: new THREE.Euler(0.1, -0.28, 0.08),
          scale: new THREE.Vector3(0.88, 0.52, 0.78),
          color: '#72695e',
          seed: 1.6,
          role: 'support-rock-chip' as const
        }
      ],
      pebblePosition: new THREE.Vector3(center.x - size.x * 0.14, surfaceY - 0.1, center.z + size.z * 0.16),
      pebbleRotation: new THREE.Euler(0.04, 0.28, -0.02),
      pebbleScale: new THREE.Vector3(0.56, 0.56, 0.56),
      pebbleSeed: 2.4,
      pebbleColors: ['#877d6c', '#9a907c', '#72685d']
    }

    const heroRock = this.cloneFirstAvailableVisualModelGroup(heroRockPlacement.assetIds, {
      role: heroRockPlacement.role
    }) ?? this.createFallbackSupportRockGroup(heroRockPlacement.role, heroRockPlacement.pieceDefinitions)
    heroRock.position.copy(heroRockPlacement.position)
    heroRock.rotation.copy(heroRockPlacement.rotation)
    heroRock.scale.copy(heroRockPlacement.scale)
    this.decorations.push(heroRock)
    this.group.add(heroRock)

    const heroPebbleCluster = this.cloneFirstAvailableVisualModelGroup(['rock-pebble-cluster'], {
      role: 'support-rock-scatter'
    }) ?? this.createFallbackPebbleCluster(heroRockPlacement.pebbleSeed, heroRockPlacement.pebbleColors)
    heroPebbleCluster.position.copy(heroRockPlacement.pebblePosition)
    heroPebbleCluster.rotation.copy(heroRockPlacement.pebbleRotation)
    heroPebbleCluster.scale.copy(heroRockPlacement.pebbleScale)
    this.decorations.push(heroPebbleCluster)
    this.group.add(heroPebbleCluster)

    const supportClusterPlacements: SupportRockClusterDefinition[] = [
      {
        side: 'left',
        position: new THREE.Vector3(center.x - size.x * 0.36, surfaceY, center.z + size.z * 0.21),
        elements: [
          {
            role: 'support-rock',
            assetIds: ['rock-support-a', 'rock-support-b'],
            offset: new THREE.Vector3(0, 0, 0.08),
            rotation: new THREE.Euler(0.04, 0.56, -0.06),
            scale: new THREE.Vector3(0.9, 0.82, 0.88),
            burialRatio: 0.1,
            fallbackPieceDefinitions: [
              {
                geometry: 'icosahedron',
                radius: 0.8,
                detail: 1,
                offset: new THREE.Vector3(0, 0.5, 0),
                rotation: new THREE.Euler(0.08, 0.24, -0.06),
                scale: new THREE.Vector3(1.28, 0.72, 0.94),
                color: '#887e70',
                seed: 3.1,
                role: 'support-rock-piece'
              },
              {
                geometry: 'dodecahedron',
                radius: 0.28,
                detail: 1,
                offset: new THREE.Vector3(0.42, 0.14, -0.18),
                rotation: new THREE.Euler(-0.06, 0.28, -0.1),
                scale: new THREE.Vector3(0.92, 0.52, 0.8),
                color: '#9b8f7c',
                seed: 3.6,
                role: 'support-rock-chip'
              }
            ]
          },
          {
            role: 'support-rock-chip',
            assetIds: ['rock-support-b'],
            offset: new THREE.Vector3(0.86, 0, -0.18),
            rotation: new THREE.Euler(-0.1, 0.18, -0.14),
            scale: new THREE.Vector3(0.52, 0.46, 0.5),
            burialRatio: 0.08,
            fallbackPieceDefinitions: [
              {
                geometry: 'dodecahedron',
                radius: 0.34,
                detail: 1,
                offset: new THREE.Vector3(0, 0.22, 0),
                rotation: new THREE.Euler(0.04, 0.18, -0.08),
                scale: new THREE.Vector3(1.04, 0.58, 0.88),
                color: '#7c7367',
                seed: 4.1,
                role: 'support-rock-chip'
              },
              {
                geometry: 'octahedron',
                radius: 0.18,
                detail: 1,
                offset: new THREE.Vector3(-0.24, 0.08, 0.18),
                rotation: new THREE.Euler(0.12, -0.24, 0.06),
                scale: new THREE.Vector3(0.86, 0.44, 0.74),
                color: '#9c907c',
                seed: 4.6,
                role: 'support-rock-pebble'
              }
            ]
          },
          {
            role: 'support-rock-scatter',
            assetIds: ['rock-pebble-cluster'],
            offset: new THREE.Vector3(-0.34, 0, 0.42),
            rotation: new THREE.Euler(0.02, -0.18, 0.02),
            scale: new THREE.Vector3(0.58, 0.52, 0.54),
            burialRatio: 0.11,
            fallbackPebbleSeed: 5.2,
            fallbackPebbleColors: ['#8a7e6c', '#a0937f', '#70675d']
          }
        ]
      },
      {
        side: 'right',
        position: new THREE.Vector3(center.x + size.x * 0.38, surfaceY, center.z + size.z * 0.18),
        elements: [
          {
            role: 'support-rock',
            assetIds: ['rock-support-b', 'rock-support-c'],
            offset: new THREE.Vector3(0.04, 0, 0.02),
            rotation: new THREE.Euler(-0.08, -0.46, 0.08),
            scale: new THREE.Vector3(0.88, 0.8, 0.92),
            burialRatio: 0.09,
            fallbackPieceDefinitions: [
              {
                geometry: 'dodecahedron',
                radius: 0.74,
                detail: 1,
                offset: new THREE.Vector3(0, 0.48, 0),
                rotation: new THREE.Euler(-0.1, -0.22, 0.06),
                scale: new THREE.Vector3(1.2, 0.68, 1.04),
                color: '#8f8474',
                seed: 6.1,
                role: 'support-rock-piece'
              },
              {
                geometry: 'icosahedron',
                radius: 0.24,
                detail: 1,
                offset: new THREE.Vector3(-0.36, 0.14, -0.12),
                rotation: new THREE.Euler(0.06, -0.28, 0.12),
                scale: new THREE.Vector3(0.9, 0.5, 0.78),
                color: '#766c61',
                seed: 6.5,
                role: 'support-rock-chip'
              }
            ]
          },
          {
            role: 'support-rock-chip',
            assetIds: ['rock-support-c'],
            offset: new THREE.Vector3(-0.82, 0, -0.16),
            rotation: new THREE.Euler(0.06, -0.24, 0.14),
            scale: new THREE.Vector3(0.54, 0.44, 0.5),
            burialRatio: 0.07,
            fallbackPieceDefinitions: [
              {
                geometry: 'icosahedron',
                radius: 0.32,
                detail: 1,
                offset: new THREE.Vector3(0, 0.2, 0),
                rotation: new THREE.Euler(-0.08, -0.18, 0.1),
                scale: new THREE.Vector3(1, 0.56, 0.84),
                color: '#9d917d',
                seed: 7.1,
                role: 'support-rock-chip'
              },
              {
                geometry: 'octahedron',
                radius: 0.16,
                detail: 1,
                offset: new THREE.Vector3(0.22, 0.08, 0.14),
                rotation: new THREE.Euler(0.1, 0.22, -0.06),
                scale: new THREE.Vector3(0.82, 0.42, 0.7),
                color: '#867b6d',
                seed: 7.6,
                role: 'support-rock-pebble'
              }
            ]
          },
          {
            role: 'support-rock-scatter',
            assetIds: ['rock-pebble-cluster'],
            offset: new THREE.Vector3(0.46, 0, 0.38),
            rotation: new THREE.Euler(-0.04, 0.2, 0.04),
            scale: new THREE.Vector3(0.56, 0.5, 0.54),
            burialRatio: 0.12,
            fallbackPebbleSeed: 8.1,
            fallbackPebbleColors: ['#938674', '#7c7165', '#a19684']
          }
        ]
      }
    ]

    supportClusterPlacements.forEach((placement) => {
      const cluster = this.createSupportRockCluster(placement, surfaceY)
      this.decorations.push(cluster)
      this.group.add(cluster)
    })
  }

  private createHardscapeShadow(bounds: THREE.Box3): void {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    let shadowTexture: THREE.Texture | null = null

    if (ctx && typeof ctx.createRadialGradient === 'function') {
      const gradient = ctx.createRadialGradient(128, 128, 18, 128, 128, 112)
      gradient.addColorStop(0, 'rgba(7, 17, 20, 0.64)')
      gradient.addColorStop(0.52, 'rgba(7, 17, 20, 0.2)')
      gradient.addColorStop(1, 'rgba(7, 17, 20, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      shadowTexture = new THREE.CanvasTexture(canvas)
      shadowTexture.colorSpace = THREE.SRGBColorSpace
    }

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 3.8),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: new THREE.Color('#122329'),
        transparent: true,
        opacity: 0.34,
        depthWrite: false
      })
    )
    shadow.rotation.x = -Math.PI / 2
    if (this.layoutStyle === 'nature-showcase') {
      shadow.position.set(-1.48, bounds.min.y + 0.02, -0.04)
      shadow.scale.set(1.12, 1, 0.92)
    } else {
      shadow.position.set(0.94, bounds.min.y + 0.02, -0.16)
    }
    shadow.userData = {
      role: 'hero-hardscape-shadow'
    }
    this.group.add(shadow)
  }

  private createHardscapeTransitionDetails(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const hardscapeAnchors = resolveSubstrateHardscapeAnchors(this.layoutStyle)
    const ridgeAnchor = hardscapeAnchors.find((anchor) => anchor.id === 'ridge-rock-hero')

    const berm = new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 28, 18),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#9f8b70'),
        roughness: 0.97,
        metalness: 0,
        transparent: true,
        opacity: 0.94
      })
    )
    if (this.layoutStyle === 'nature-showcase') {
      berm.scale.set(2.36, 0.34, 1.28)
      berm.position.set(
        (ridgeAnchor?.x ?? -0.18) * size.x + 0.74,
        bounds.min.y + 0.24,
        (ridgeAnchor?.z ?? -0.02) * size.z + 0.86
      )
    } else {
      berm.scale.set(2.2, 0.38, 1.18)
      berm.position.set(
        (ridgeAnchor?.x ?? 0.12) * size.x + 0.18,
        bounds.min.y + 0.26,
        (ridgeAnchor?.z ?? -0.04) * size.z + 0.18
      )
    }
    berm.receiveShadow = true
    berm.userData = {
      role: 'hardscape-transition-berm'
    }
    this.group.add(berm)

    const pebbleDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        { offset: new THREE.Vector3(-1.42, 0.02, 0.2), scale: 0.18, color: '#625a50' },
        { offset: new THREE.Vector3(-0.96, 0.04, 0.34), scale: 0.16, color: '#7c7266' },
        { offset: new THREE.Vector3(-0.42, 0.03, 0.52), scale: 0.14, color: '#6d6459' },
        { offset: new THREE.Vector3(0.08, 0.02, 0.74), scale: 0.15, color: '#8f816f' },
        { offset: new THREE.Vector3(0.44, 0.02, 0.92), scale: 0.12, color: '#7c705f' }
      ]
      : [
        { offset: new THREE.Vector3(-1.48, 0.02, 0.92), scale: 0.18, color: '#8a7c68' },
        { offset: new THREE.Vector3(-0.86, 0.05, 0.62), scale: 0.14, color: '#9a8b75' },
        { offset: new THREE.Vector3(-0.08, 0.03, 0.46), scale: 0.16, color: '#756959' },
        { offset: new THREE.Vector3(0.74, 0.04, 0.1), scale: 0.13, color: '#a09076' },
        { offset: new THREE.Vector3(1.34, 0.02, -0.34), scale: 0.17, color: '#6c6255' },
        { offset: new THREE.Vector3(1.82, 0.03, -0.8), scale: 0.12, color: '#91826e' }
      ]
    pebbleDefinitions.forEach((definition, index) => {
      const pebble = new THREE.Mesh(
        index % 2 === 0
          ? new THREE.DodecahedronGeometry(definition.scale, 0)
          : new THREE.IcosahedronGeometry(definition.scale, 0),
        this.createRockMaterial(definition.color)
      )
      pebble.position.set(
        berm.position.x + definition.offset.x,
        bounds.min.y + 0.08 + definition.offset.y,
        berm.position.z + definition.offset.z
      )
      pebble.rotation.set(
        0.14 + index * 0.05,
        -0.3 + index * 0.08,
        0.08 + index * 0.04
      )
      pebble.castShadow = true
      pebble.receiveShadow = true
      pebble.userData = {
        role: 'hardscape-transition-pebble'
      }
      this.group.add(pebble)
    })
  }

  private createSandDetails(bounds: THREE.Box3): void {
    const rippleGeometry = new THREE.PlaneGeometry(1, 0.1, 10, 1)
    const rippleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8d5b8,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.3
    })
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const rippleSeed = createSeededRandom(this.layoutStyle === 'nature-showcase' ? 7421 : 3611)
    const rippleCount = this.layoutStyle === 'nature-showcase' ? 14 : 20

    for (let i = 0; i < rippleCount; i++) {
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
      ripple.rotation.x = -Math.PI / 2
      ripple.rotation.z = rippleSeed() * Math.PI

      const x = this.layoutStyle === 'nature-showcase'
        ? size.x * (0.08 + rippleSeed() * 0.34)
        : (rippleSeed() - 0.5) * size.x * 0.9
      const z = this.layoutStyle === 'nature-showcase'
        ? size.z * (0.04 + rippleSeed() * 0.26)
        : (rippleSeed() - 0.5) * size.z * 0.9

      ripple.position.set(
        x,
        bounds.min.y + 0.01,
        z
      )

      const scale = this.layoutStyle === 'nature-showcase'
        ? 0.72 + rippleSeed() * 1.36
        : 0.5 + rippleSeed() * 2
      ripple.scale.set(scale, 1, scale)
      ripple.userData = {
        role: 'sand-ripple'
      }
      
      this.group.add(ripple)
    }
  }
  
  update(elapsedTime: number): void {
    this.time = elapsedTime
    
    // Animate plant swaying
    this.plants.forEach((plant) => {
      plant.children.forEach((segment, segmentIndex) => {
        if (segment.userData.originalRotation !== undefined) {
          const swayOffset = segment.userData.swayOffset || 0
          const swayAmplitude = segment.userData.swayAmplitude || 0.1
          
          const sway = Math.sin(this.time * 0.8 + swayOffset + segmentIndex * 0.3) * swayAmplitude
          segment.rotation.z = segment.userData.originalRotation + sway
          
          // Add slight x-axis movement
          segment.rotation.x = Math.sin(this.time * 0.5 + swayOffset) * 0.05
        }
      })
    })
  }
  
  private createSeaweedTexture(hue: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const baseColor = new THREE.Color().setHSL(hue, 0.5, 0.4)
    const shadowColor = baseColor.clone().lerp(new THREE.Color('#113826'), 0.28)
    const highlightColor = baseColor.clone().lerp(new THREE.Color('#d7ffd9'), 0.18)
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const leftBase = canvas.width * 0.18
    const rightBase = canvas.width * 0.82

    const gradient = ctx.createLinearGradient(0, tipY, 0, baseY)
    gradient.addColorStop(0, highlightColor.getStyle())
    gradient.addColorStop(0.42, baseColor.getStyle())
    gradient.addColorStop(1, shadowColor.getStyle())

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(leftBase, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(rightBase, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = shadowColor.clone().multiplyScalar(0.98).getStyle()
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.globalCompositeOperation = 'overlay'
    ctx.strokeStyle = 'rgba(223, 255, 214, 0.32)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < 5; i++) {
      const startY = canvas.height * (0.18 + i * 0.14)
      const offset = (i - 2) * 12
      ctx.strokeStyle = `rgba(16, 68, 39, ${0.12 + i * 0.015})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 34, midX + offset * 1.5, startY + 82)
      ctx.stroke()
    }
    
    ctx.globalCompositeOperation = 'source-over'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    
    return texture
  }
  
  private createSeaweedNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = '#8080ff'
    ctx.fill()

    ctx.strokeStyle = '#6f6fff'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.strokeStyle = '#9494ff'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const startY = canvas.height * (0.22 + i * 0.16)
      const offset = (i - 1.5) * 16
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 28, midX + offset * 1.4, startY + 72)
      ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }
  
  private createSeaweedRoughnessMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const roughnessGradient = ctx.createLinearGradient(0, tipY, 0, baseY)

    roughnessGradient.addColorStop(0, '#666666')
    roughnessGradient.addColorStop(0.55, '#8d8d8d')
    roughnessGradient.addColorStop(1, '#b8b8b8')

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = roughnessGradient
    ctx.fill()

    ctx.strokeStyle = '#565656'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }

  setMotionEnabled(enabled: boolean): void {
    // Plants can still sway slightly even when motion is reduced
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        if (!enabled && segment.userData.originalRotation !== undefined) {
          segment.rotation.z = segment.userData.originalRotation
          segment.rotation.x = 0
        }
      })
    })
  }
}
