import * as THREE from 'three'
import type { AquascapeLayoutStyle } from '../../types/aquarium'
import { NATURE_SHOWCASE_PLANT_CLUSTER_DEFINITIONS, PLANTED_PLANT_CLUSTER_DEFINITIONS } from './aquascapePlantDefinitions'
import type {
  PlantClusterDefinition,
  PlantClusterKind,
  PlantRadiusBand,
  PlantType,
  SampledPlantPlacement,
  SubstratePlantAnchor
} from './aquascapePlantTypes'

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
