import * as THREE from 'three'
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
