import * as THREE from 'three'
import type { AquascapeLayoutStyle } from '../types/aquarium'

export type PlantLayer = 'foreground' | 'background' | 'midground'
export type PlantType =
  | 'ribbon-seaweed'
  | 'sword-leaf'
  | 'amazon-sword'
  | 'fan-leaf'
  | 'javafern-large'
  | 'javafern-narrow'
  | 'anubias-nana-clump'
  | 'anubias-petite-clump'
  | 'crypt-brown'
  | 'stem-green-bush'
  | 'vallisneria-tall'
  | 'hygrophila-rear'
  | 'matsumo'
  | 'willow-moss'
export type PlantRenderRole = 'hero' | 'repeated'
export type PlantClusterKind = 'core' | 'satellite' | 'offshoot'
export type PlantMassRole =
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

export type PlantMixEntry = {
  plantType: PlantType
  weight: number
}

export type PlantRadiusBand = [number, number]

export type PlantClusterDefinition = {
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

export type PlantScatterDefinition = Pick<
  PlantClusterDefinition,
  'x' | 'z' | 'layer' | 'plantType' | 'baseHeight' | 'spreadX' | 'spreadZ' | 'hueBase'
>

export type SampledPlantPlacement = {
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

type PlantSilhouetteFamily = 'ribbon' | 'strap' | 'broad' | 'rosette' | 'moss'

export const getPlantSilhouetteFamily = (plantType: PlantType): PlantSilhouetteFamily => {
  switch (plantType) {
    case 'ribbon-seaweed':
    case 'vallisneria-tall':
      return 'ribbon'
    case 'sword-leaf':
    case 'amazon-sword':
    case 'javafern-narrow':
    case 'stem-green-bush':
    case 'hygrophila-rear':
    case 'matsumo':
      return 'strap'
    case 'willow-moss':
      return 'moss'
    case 'crypt-brown':
      return 'rosette'
    case 'fan-leaf':
    case 'javafern-large':
    case 'anubias-nana-clump':
    case 'anubias-petite-clump':
      return 'broad'
  }
}

export const PLANTED_PLANT_CLUSTER_DEFINITIONS: PlantClusterDefinition[] = [
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

export const NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS: PlantClusterDefinition[] = [
  {
    id: 'left-rear',
    x: -0.356,
    z: -0.24,
    layer: 'background',
    massRole: 'left-rear',
    plantType: 'amazon-sword',
    baseHeight: 6.62,
    spreadX: 0.14,
    spreadZ: 0.14,
    hueBase: 0.264,
    rotationY: -0.36,
    scale: new THREE.Vector3(0.8, 1.24, 0.78),
    heightMin: 5.82,
    heightMax: 7.08,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.16],
    satelliteRadius: [0.12, 0.28],
    offshootRadius: [0.24, 0.42],
    minDistance: 0.058,
    depthLaneCount: 4,
    plantMix: [
      { plantType: 'amazon-sword', weight: 0.26 },
      { plantType: 'stem-green-bush', weight: 0.5 },
      { plantType: 'hygrophila-rear', weight: 0.24 },
      { plantType: 'matsumo', weight: 0.12 }
    ],
    assetIds: ['plant-amazon-sword', 'plant-stem-green-bush', 'plant-hygrophila-rear', 'plant-matsumo', 'plant-willow-moss']
  },
  {
    id: 'left-mid-broadleaf',
    x: -0.26,
    z: 0.02,
    layer: 'midground',
    massRole: 'left-shoulder',
    plantType: 'javafern-large',
    baseHeight: 6.12,
    spreadX: 0.28,
    spreadZ: 0.22,
    hueBase: 0.276,
    rotationY: -0.3,
    scale: new THREE.Vector3(1.02, 1.16, 0.96),
    heightMin: 5.06,
    heightMax: 6.42,
    coreCount: 1,
    satelliteCount: 5,
    offshootCount: 3,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.1, 0.26],
    offshootRadius: [0.18, 0.36],
    minDistance: 0.05,
    depthLaneCount: 4,
    plantMix: [
      { plantType: 'javafern-large', weight: 0.32 },
      { plantType: 'javafern-narrow', weight: 0.26 },
      { plantType: 'anubias-petite-clump', weight: 0.18 },
      { plantType: 'anubias-nana-clump', weight: 0.24 }
    ],
    assetIds: ['plant-javafern-large', 'plant-javafern-narrow', 'plant-anubias-nana-clump', 'plant-anubias-petite-clump']
  },
  {
    id: 'center-left-fern-mass',
    x: -0.14,
    z: -0.02,
    layer: 'midground',
    massRole: 'driftwood-backfill',
    plantType: 'javafern-large',
    baseHeight: 5.18,
    spreadX: 0.28,
    spreadZ: 0.22,
    hueBase: 0.284,
    rotationY: -0.02,
    scale: new THREE.Vector3(0.94, 1.08, 0.9),
    heightMin: 4.12,
    heightMax: 5.62,
    coreCount: 1,
    satelliteCount: 5,
    offshootCount: 3,
    coreRadius: [0.03, 0.11],
    satelliteRadius: [0.08, 0.24],
    offshootRadius: [0.18, 0.36],
    minDistance: 0.042,
    depthLaneCount: 4,
    plantMix: [
      { plantType: 'javafern-large', weight: 0.32 },
      { plantType: 'javafern-narrow', weight: 0.32 },
      { plantType: 'anubias-nana-clump', weight: 0.22 },
      { plantType: 'anubias-petite-clump', weight: 0.14 }
    ],
    assetIds: ['plant-javafern-large', 'plant-javafern-narrow', 'plant-anubias-nana-clump', 'plant-anubias-petite-clump']
  },
  {
    id: 'right-mid-crypt',
    x: 0.08,
    z: -0.02,
    layer: 'midground',
    massRole: 'mid-right-backfill',
    plantType: 'crypt-brown',
    baseHeight: 2.94,
    spreadX: 0.12,
    spreadZ: 0.1,
    hueBase: 0.062,
    rotationY: 0.18,
    scale: new THREE.Vector3(0.58, 0.72, 0.58),
    heightMin: 2.48,
    heightMax: 3.56,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.1, 0.22],
    offshootRadius: [0.2, 0.32],
    minDistance: 0.054,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'crypt-brown', weight: 1 }
    ],
    assetIds: ['plant-crypt-brown']
  },
  {
    id: 'right-rear',
    x: 0.12,
    z: -0.18,
    layer: 'background',
    massRole: 'right-rear',
    plantType: 'crypt-brown',
    baseHeight: 3.92,
    spreadX: 0.1,
    spreadZ: 0.12,
    hueBase: 0.058,
    rotationY: 0.22,
    scale: new THREE.Vector3(0.6, 0.82, 0.6),
    heightMin: 3.24,
    heightMax: 4.44,
    coreCount: 1,
    satelliteCount: 2,
    offshootCount: 1,
    coreRadius: [0.03, 0.12],
    satelliteRadius: [0.12, 0.24],
    offshootRadius: [0.2, 0.34],
    minDistance: 0.056,
    depthLaneCount: 3,
    plantMix: [
      { plantType: 'crypt-brown', weight: 1 }
    ],
    assetIds: ['plant-crypt-brown']
  },
  {
    id: 'left-foot',
    x: -0.22,
    z: 0.14,
    layer: 'foreground',
    massRole: 'left-foot',
    plantType: 'anubias-petite-clump',
    baseHeight: 1.28,
    spreadX: 0.08,
    spreadZ: 0.08,
    hueBase: 0.252,
    rotationY: -0.1,
    scale: new THREE.Vector3(0.54, 0.5, 0.52),
    heightMin: 0.9,
    heightMax: 1.36,
    coreCount: 1,
    satelliteCount: 1,
    offshootCount: 0,
    coreRadius: [0.02, 0.07],
    satelliteRadius: [0.08, 0.16],
    offshootRadius: [0.18, 0.28],
    minDistance: 0.048,
    depthLaneCount: 2,
    plantMix: [
      { plantType: 'anubias-petite-clump', weight: 1 }
    ],
    assetIds: ['plant-anubias-petite-clump']
  }
]

const plantedPlacementSeed = 0x53a9d2f1
const plantedPlacementBounds = {
  minX: -0.46,
  maxX: 0.46,
  minZ: -0.42,
  maxZ: 0.24
}

export const createSeededRandom = (seed: number): (() => number) => {
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

const clonePlantClusterDefinition = (zone: PlantClusterDefinition): PlantClusterDefinition => ({
  ...zone,
  scale: zone.scale.clone(),
  coreRadius: [...zone.coreRadius],
  satelliteRadius: [...zone.satelliteRadius],
  offshootRadius: [...zone.offshootRadius],
  plantMix: zone.plantMix?.map((entry) => ({ ...entry })),
  assetIds: zone.assetIds ? [...zone.assetIds] : undefined
})

export const resolvePlantClusterDefinitions = (
  layoutStyle: AquascapeLayoutStyle = 'planted'
): PlantClusterDefinition[] => (
  layoutStyle === 'nature-showcase'
    ? NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS
    : PLANTED_PLANT_CLUSTER_DEFINITIONS
).map(clonePlantClusterDefinition)

const getPlacementHueOffset = (plantType: PlantType): number => {
  switch (plantType) {
    case 'ribbon-seaweed':
      return -0.018
    case 'vallisneria-tall':
      return -0.02
    case 'stem-green-bush':
    case 'hygrophila-rear':
      return -0.004
    case 'amazon-sword':
      return -0.008
    case 'matsumo':
      return -0.006
    case 'willow-moss':
      return 0.004
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

  if (
    zone.id === 'left-rear'
    && zone.plantMix.some((entry) => entry.plantType === 'amazon-sword')
    && zone.plantMix.some((entry) => entry.plantType === 'stem-green-bush')
    && zone.plantMix.some((entry) => entry.plantType === 'hygrophila-rear')
    && zone.plantMix.some((entry) => entry.plantType === 'matsumo')
  ) {
    if (clusterKind === 'offshoot') {
      return 'matsumo'
    }
    return index % 2 === 0 ? 'stem-green-bush' : 'hygrophila-rear'
  }

  if (
    zone.id === 'left-rear'
    && zone.plantMix.some((entry) => entry.plantType === 'hygrophila-rear')
    && zone.plantMix.some((entry) => entry.plantType === 'matsumo')
  ) {
    return clusterKind === 'offshoot' ? 'matsumo' : 'hygrophila-rear'
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
  return resolvePlantClusterDefinitions(layoutStyle).flatMap((zone) =>
    sampleZonePlacements(zone, layoutSeed)
  )
}

const normalizeLayoutSeed = (seed: number): number => {
  if (!Number.isFinite(seed)) {
    return plantedPlacementSeed
  }

  return (Math.abs(Math.floor(seed)) >>> 0) || plantedPlacementSeed
}

const createRuntimeLayoutSeed = (layoutStyle: AquascapeLayoutStyle): number => {
  const timeSeed = Date.now() >>> 0
  const randomSeed = Math.floor(Math.random() * 0x100000000) >>> 0
  return hashSeed(timeSeed ^ randomSeed, `${layoutStyle}-runtime`)
}

export const resolveRuntimeLayoutSeed = (
  scene: THREE.Scene,
  layoutStyle: AquascapeLayoutStyle = 'planted',
  layoutSeed?: number
): number => {
  const storedSeeds = (scene.userData.aquascapingLayoutSeeds ?? {}) as Partial<Record<AquascapeLayoutStyle, number>>
  const explicitSeed = typeof layoutSeed === 'number' ? normalizeLayoutSeed(layoutSeed) : undefined
  const existingSeed = typeof storedSeeds[layoutStyle] === 'number'
    ? normalizeLayoutSeed(storedSeeds[layoutStyle] as number)
    : undefined
  const resolvedSeed = explicitSeed ?? existingSeed ?? createRuntimeLayoutSeed(layoutStyle)

  scene.userData.aquascapingLayoutSeeds = {
    ...storedSeeds,
    [layoutStyle]: resolvedSeed
  }

  return resolvedSeed
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

export const resolveSubstratePlantAnchors = (
  layoutStyle: AquascapeLayoutStyle = 'planted',
  seed: number = plantedPlacementSeed
): SubstratePlantAnchor[] => {
  const placements = resolveSampledPlantPlacements(layoutStyle, seed)
  return placements.map((placement, index, placementSet) =>
    createSubstratePlantAnchor(placement, index, placementSet)
  )
}
