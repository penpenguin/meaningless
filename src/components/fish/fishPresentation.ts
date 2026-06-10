import * as THREE from 'three'
import type { AquascapeLayoutStyle } from '../../types/aquarium'

export type AxisTuple = [number, number, number]
export type QuaternionTuple = [number, number, number, number]

export type OrientationCorrection = {
  modelForwardAxis?: AxisTuple
  correctionQuaternion?: QuaternionTuple
}

export type GaitState = 'cruise' | 'inspect' | 'glide' | 'burst' | 'hover'
export type PreferredDepthBand = 'upper' | 'mid' | 'hardscape-near'
export type PreferredLateralLane = 'left' | 'center' | 'right'


export interface FishVariant {
  name: string
  primaryColor: THREE.Color
  secondaryColor: THREE.Color
  scale: number
  speed: number
  locomotionProfileId?: 'disk-glider' | 'slender-darter' | 'goldfish-wobble' | 'calm-cruiser'
  proceduralForwardAxis?: AxisTuple
  schoolForwardAxis?: AxisTuple
  heroForwardAxis?: AxisTuple
  proceduralCorrectionQuaternion?: QuaternionTuple
  schoolCorrectionQuaternion?: QuaternionTuple
  heroCorrectionQuaternion?: QuaternionTuple
  modelForwardAxis?: {
    procedural: AxisTuple
    school: AxisTuple
    hero: AxisTuple
  }
  orientationCorrection?: {
    procedural?: OrientationCorrection
    schoolGLB?: OrientationCorrection
    heroGLB?: OrientationCorrection
  }
  patternTextureId?: string
  baseColorTextureId?: string
  normalTextureId?: string
  roughnessTextureId?: string
  alphaTextureId?: string
  schoolModelId?: string
  heroModelId?: string
  silhouette?: {
    bodyLength?: number
    bodyHeight?: number
    bodyThickness?: number
    noseLength?: number
    tailLength?: number
    tailHeight?: number
    dorsalHeight?: number
    ventralHeight?: number
    pectoralLength?: number
    topFullness?: number
    bellyFullness?: number
  }
}

export type FishRenderPath = 'procedural' | 'school' | 'hero'
export type FishSafePadding = {
  nose: number
  tail: number
  width: number
  height: number
}

export type HeroPlacement = {
  lateralOffset: number
  verticalOffset: number
  depthOffset: number
  scaleMultiplier: number
}

export type LocomotionProfile = {
  cruiseSpeed: number
  yawResponsiveness: number
  bankAmount: number
  tailBeatFreq: number
  bodyWiggleAmount: number
  curiosityRate: number
  depthBobAmount: number
  boundaryArcRadius: number
  cruiseBias: number
  turnNoise: number
  suddenTurnRate: number
  burstMultiplier: number
  glideFactor: number
  hoverDrag: number
  inspectCuriosity: number
  turnStartLag: number
  lanePull: number
  depthPull: number
  interestWeight: number
  retargetIntervalRange: [number, number]
  stateDurationRange: [number, number]
  stateWeights: Record<GaitState, number>
  steeringWeights: {
    alignment: number
    cohesion: number
    separation: number
  }
}


export const DEFAULT_FORWARD_AXIS: [number, number, number] = [1, 0, 0]
export const ANGELFISH_GLB_CORRECTION: QuaternionTuple = [-0.70710678, 0, 0, 0.70710678]
export const DEFAULT_ORIENTATION_CORRECTION: Required<OrientationCorrection> = {
  modelForwardAxis: DEFAULT_FORWARD_AXIS,
  correctionQuaternion: [0, 0, 0, 1]
}
export const FISH_SAFE_PADDING_BY_PATH: Record<FishRenderPath, FishSafePadding> = {
  procedural: {
    nose: 0.12,
    tail: 0.14,
    width: 0.08,
    height: 0.1
  },
  school: {
    nose: 0.14,
    tail: 0.16,
    width: 0.09,
    height: 0.11
  },
  hero: {
    nose: 0.16,
    tail: 0.18,
    width: 0.1,
    height: 0.12
  }
}

export const LOCOMOTION_PROFILES: Record<NonNullable<FishVariant['locomotionProfileId']>, LocomotionProfile> = {
  'calm-cruiser': {
    cruiseSpeed: 0.96,
    yawResponsiveness: 0.76,
    bankAmount: 0.24,
    tailBeatFreq: 1.18,
    bodyWiggleAmount: 0.22,
    curiosityRate: 0.32,
    depthBobAmount: 0.24,
    boundaryArcRadius: 1.08,
    cruiseBias: 0.86,
    turnNoise: 0.09,
    suddenTurnRate: 0.0048,
    burstMultiplier: 1.08,
    glideFactor: 0.82,
    hoverDrag: 0.92,
    inspectCuriosity: 0.42,
    turnStartLag: 0.12,
    lanePull: 0.3,
    depthPull: 0.28,
    interestWeight: 0.13,
    retargetIntervalRange: [6.4, 11.8],
    stateDurationRange: [5.8, 10.6],
    stateWeights: {
      cruise: 0.62,
      inspect: 0.08,
      glide: 0.2,
      burst: 0.03,
      hover: 0.07
    },
    steeringWeights: {
      alignment: 0.96,
      cohesion: 1.04,
      separation: 0.92
    }
  },
  'disk-glider': {
    cruiseSpeed: 0.82,
    yawResponsiveness: 0.54,
    bankAmount: 0.18,
    tailBeatFreq: 0.76,
    bodyWiggleAmount: 0.16,
    curiosityRate: 0.28,
    depthBobAmount: 0.2,
    boundaryArcRadius: 1.14,
    cruiseBias: 0.62,
    turnNoise: 0.05,
    suddenTurnRate: 0.003,
    burstMultiplier: 1.06,
    glideFactor: 0.72,
    hoverDrag: 1.04,
    inspectCuriosity: 0.36,
    turnStartLag: 0.16,
    lanePull: 0.22,
    depthPull: 0.26,
    interestWeight: 0.12,
    retargetIntervalRange: [7.2, 12.6],
    stateDurationRange: [6.8, 11.6],
    stateWeights: {
      cruise: 0.36,
      inspect: 0.08,
      glide: 0.34,
      burst: 0.02,
      hover: 0.2
    },
    steeringWeights: {
      alignment: 0.86,
      cohesion: 1.1,
      separation: 0.9
    }
  },
  'slender-darter': {
    cruiseSpeed: 1.28,
    yawResponsiveness: 1.24,
    bankAmount: 0.46,
    tailBeatFreq: 2.74,
    bodyWiggleAmount: 0.14,
    curiosityRate: 0.86,
    depthBobAmount: 0.16,
    boundaryArcRadius: 0.46,
    cruiseBias: 1.02,
    turnNoise: 0.26,
    suddenTurnRate: 0.014,
    burstMultiplier: 1.22,
    glideFactor: 0.9,
    hoverDrag: 0.62,
    inspectCuriosity: 0.66,
    turnStartLag: 0.04,
    lanePull: 0.46,
    depthPull: 0.24,
    interestWeight: 0.16,
    retargetIntervalRange: [4.2, 7.1],
    stateDurationRange: [4.2, 6.4],
    stateWeights: {
      cruise: 0.56,
      inspect: 0.12,
      glide: 0.06,
      burst: 0.2,
      hover: 0.06
    },
    steeringWeights: {
      alignment: 1.14,
      cohesion: 0.82,
      separation: 1.1
    }
  },
  'goldfish-wobble': {
    cruiseSpeed: 0.92,
    yawResponsiveness: 0.68,
    bankAmount: 0.28,
    tailBeatFreq: 1.54,
    bodyWiggleAmount: 0.62,
    curiosityRate: 0.54,
    depthBobAmount: 0.58,
    boundaryArcRadius: 0.94,
    cruiseBias: 0.68,
    turnNoise: 0.18,
    suddenTurnRate: 0.008,
    burstMultiplier: 1.08,
    glideFactor: 0.84,
    hoverDrag: 1.08,
    inspectCuriosity: 0.56,
    turnStartLag: 0.24,
    lanePull: 0.2,
    depthPull: 0.38,
    interestWeight: 0.18,
    retargetIntervalRange: [5.1, 9.8],
    stateDurationRange: [4.8, 8.8],
    stateWeights: {
      cruise: 0.32,
      inspect: 0.22,
      glide: 0.1,
      burst: 0.05,
      hover: 0.31
    },
    steeringWeights: {
      alignment: 0.88,
      cohesion: 0.98,
      separation: 0.88
    }
  }
}

export const createFishVariants = (): FishVariant[] => [
      {
        name: 'Tropical',
        primaryColor: new THREE.Color(0xff6b35),
        secondaryColor: new THREE.Color(0xffd700),
        scale: 0.5,
        speed: 1.0,
        locomotionProfileId: 'calm-cruiser',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [0, 0, 1],
        heroForwardAxis: [0, 0, 1],
        patternTextureId: 'fish-tropical',
        baseColorTextureId: 'fish-tropical-basecolor',
        normalTextureId: 'fish-tropical-normal',
        roughnessTextureId: 'fish-tropical-roughness',
        alphaTextureId: 'fish-tropical-alpha',
        schoolModelId: 'fish-clownfish-school',
        heroModelId: 'fish-clownfish-hero',
        silhouette: {
          bodyLength: 1.45,
          bodyHeight: 0.38,
          bodyThickness: 0.28,
          noseLength: 0.24,
          tailLength: 0.44,
          tailHeight: 0.42,
          dorsalHeight: 0.28,
          ventralHeight: 0.16,
          pectoralLength: 0.22,
          topFullness: 0.72,
          bellyFullness: 0.8
        }
      },
      {
        name: 'Angelfish',
        primaryColor: new THREE.Color(0xd9d6c8),
        secondaryColor: new THREE.Color(0x807a69),
        scale: 0.66,
        speed: 0.8,
        locomotionProfileId: 'disk-glider',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        schoolCorrectionQuaternion: ANGELFISH_GLB_CORRECTION,
        heroCorrectionQuaternion: ANGELFISH_GLB_CORRECTION,
        patternTextureId: 'fish-angelfish',
        baseColorTextureId: 'fish-angelfish-basecolor',
        normalTextureId: 'fish-angelfish-normal',
        roughnessTextureId: 'fish-angelfish-roughness',
        alphaTextureId: 'fish-angelfish-alpha',
        schoolModelId: 'fish-angelfish-school',
        heroModelId: 'fish-angelfish-hero',
        silhouette: {
          bodyLength: 1.08,
          bodyHeight: 0.64,
          bodyThickness: 0.2,
          noseLength: 0.2,
          tailLength: 0.34,
          tailHeight: 0.54,
          dorsalHeight: 0.98,
          ventralHeight: 1.02,
          pectoralLength: 0.22,
          topFullness: 0.92,
          bellyFullness: 0.9
        }
      },
      {
        name: 'Butterflyfish',
        primaryColor: new THREE.Color(0xf2cf63),
        secondaryColor: new THREE.Color(0xf6eed1),
        scale: 0.62,
        speed: 0.82,
        locomotionProfileId: 'disk-glider',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-butterflyfish',
        baseColorTextureId: 'fish-butterflyfish-basecolor',
        normalTextureId: 'fish-butterflyfish-normal',
        roughnessTextureId: 'fish-butterflyfish-roughness',
        alphaTextureId: 'fish-butterflyfish-alpha',
        schoolModelId: 'fish-butterflyfish-school',
        heroModelId: 'fish-butterflyfish-hero',
        silhouette: {
          bodyLength: 1.12,
          bodyHeight: 0.66,
          bodyThickness: 0.2,
          noseLength: 0.18,
          tailLength: 0.3,
          tailHeight: 0.44,
          dorsalHeight: 0.52,
          ventralHeight: 0.44,
          pectoralLength: 0.24,
          topFullness: 0.94,
          bellyFullness: 0.9
        }
      },
      {
        name: 'Neon',
        primaryColor: new THREE.Color(0x00ffff),
        secondaryColor: new THREE.Color(0xff1493),
        scale: 0.35,
        speed: 1.5,
        locomotionProfileId: 'slender-darter',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-neon',
        baseColorTextureId: 'fish-neon-basecolor',
        normalTextureId: 'fish-neon-normal',
        roughnessTextureId: 'fish-neon-roughness',
        alphaTextureId: 'fish-neon-alpha',
        schoolModelId: 'fish-neon-school',
        heroModelId: 'fish-neon-hero',
        silhouette: {
          bodyLength: 1.82,
          bodyHeight: 0.18,
          bodyThickness: 0.15,
          noseLength: 0.3,
          tailLength: 0.36,
          tailHeight: 0.28,
          dorsalHeight: 0.12,
          ventralHeight: 0.06,
          pectoralLength: 0.14,
          topFullness: 0.56,
          bellyFullness: 0.64
        }
      },
      {
        name: 'Goldfish',
        primaryColor: new THREE.Color(0xf6b03a),
        secondaryColor: new THREE.Color(0xffdb9b),
        scale: 0.58,
        speed: 0.9,
        locomotionProfileId: 'goldfish-wobble',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-goldfish-school',
        heroModelId: 'fish-goldfish-hero',
        silhouette: {
          bodyLength: 1.28,
          bodyHeight: 0.52,
          bodyThickness: 0.35,
          noseLength: 0.22,
          tailLength: 0.6,
          tailHeight: 0.7,
          dorsalHeight: 0.4,
          ventralHeight: 0.28,
          pectoralLength: 0.28,
          topFullness: 0.82,
          bellyFullness: 1.02
        }
      },
      {
        name: 'AbeniPuffer',
        primaryColor: new THREE.Color(0xd8bd6b),
        secondaryColor: new THREE.Color(0x4d5538),
        scale: 0.42,
        speed: 0.72,
        locomotionProfileId: 'goldfish-wobble',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-abeni-puffer-school',
        heroModelId: 'fish-abeni-puffer-hero',
        silhouette: {
          bodyLength: 1.02,
          bodyHeight: 0.48,
          bodyThickness: 0.44,
          noseLength: 0.16,
          tailLength: 0.32,
          tailHeight: 0.34,
          dorsalHeight: 0.18,
          ventralHeight: 0.12,
          pectoralLength: 0.2,
          topFullness: 0.96,
          bellyFullness: 1.08
        }
      },
      {
        name: 'Corydoras',
        primaryColor: new THREE.Color(0xd7c7a0),
        secondaryColor: new THREE.Color(0x4c453c),
        scale: 0.46,
        speed: 0.68,
        locomotionProfileId: 'calm-cruiser',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-corydoras-school',
        heroModelId: 'fish-corydoras-hero',
        silhouette: {
          bodyLength: 1.36,
          bodyHeight: 0.34,
          bodyThickness: 0.3,
          noseLength: 0.22,
          tailLength: 0.34,
          tailHeight: 0.28,
          dorsalHeight: 0.24,
          ventralHeight: 0.1,
          pectoralLength: 0.24,
          topFullness: 0.78,
          bellyFullness: 0.9
        }
      },
      {
        name: 'AfricanLampeye',
        primaryColor: new THREE.Color(0xcfe8d5),
        secondaryColor: new THREE.Color(0xaed6ff),
        scale: 0.34,
        speed: 1.28,
        locomotionProfileId: 'slender-darter',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-neon',
        baseColorTextureId: 'fish-neon-basecolor',
        normalTextureId: 'fish-neon-normal',
        roughnessTextureId: 'fish-neon-roughness',
        alphaTextureId: 'fish-neon-alpha',
        schoolModelId: 'fish-african-lampeye-school',
        heroModelId: 'fish-african-lampeye-hero',
        silhouette: {
          bodyLength: 1.62,
          bodyHeight: 0.2,
          bodyThickness: 0.14,
          noseLength: 0.24,
          tailLength: 0.34,
          tailHeight: 0.26,
          dorsalHeight: 0.1,
          ventralHeight: 0.06,
          pectoralLength: 0.12,
          topFullness: 0.54,
          bellyFullness: 0.62
        }
      },
      {
        name: 'RasboraHeteromorpha',
        primaryColor: new THREE.Color(0xd97832),
        secondaryColor: new THREE.Color(0x2f241f),
        scale: 0.4,
        speed: 1.16,
        locomotionProfileId: 'slender-darter',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-tropical',
        baseColorTextureId: 'fish-tropical-basecolor',
        normalTextureId: 'fish-tropical-normal',
        roughnessTextureId: 'fish-tropical-roughness',
        alphaTextureId: 'fish-tropical-alpha',
        schoolModelId: 'fish-rasbora-heteromorpha-school',
        heroModelId: 'fish-rasbora-heteromorpha-hero',
        silhouette: {
          bodyLength: 1.5,
          bodyHeight: 0.3,
          bodyThickness: 0.18,
          noseLength: 0.24,
          tailLength: 0.34,
          tailHeight: 0.3,
          dorsalHeight: 0.14,
          ventralHeight: 0.08,
          pectoralLength: 0.14,
          topFullness: 0.64,
          bellyFullness: 0.7
        }
      },
      {
        name: 'YamatoShrimp',
        primaryColor: new THREE.Color(0xcab48c),
        secondaryColor: new THREE.Color(0x76684f),
        scale: 0.42,
        speed: 0.76,
        locomotionProfileId: 'calm-cruiser',
        proceduralForwardAxis: [1, 0, 0],
        schoolForwardAxis: [1, 0, 0],
        heroForwardAxis: [1, 0, 0],
        patternTextureId: 'fish-goldfish',
        baseColorTextureId: 'fish-goldfish-basecolor',
        normalTextureId: 'fish-goldfish-normal',
        roughnessTextureId: 'fish-goldfish-roughness',
        alphaTextureId: 'fish-goldfish-alpha',
        schoolModelId: 'fish-yamato-shrimp-school',
        heroModelId: 'fish-yamato-shrimp-hero',
        silhouette: {
          bodyLength: 1.32,
          bodyHeight: 0.18,
          bodyThickness: 0.12,
          noseLength: 0.36,
          tailLength: 0.28,
          tailHeight: 0.18,
          dorsalHeight: 0.04,
          ventralHeight: 0.04,
          pectoralLength: 0.28,
          topFullness: 0.46,
          bellyFullness: 0.54
        }
      }
    ]

export const resolveLocomotionProfile = (
  variant: { locomotionProfileId?: FishVariant['locomotionProfileId'] }
): LocomotionProfile => LOCOMOTION_PROFILES[variant.locomotionProfileId ?? 'calm-cruiser']

export const resolveDefaultFishCount = (
  layoutStyle: AquascapeLayoutStyle = 'planted',
  isMobile: boolean
): number => {
  if (layoutStyle === 'nature-showcase') {
    return isMobile ? 14 : 24
  }

  return isMobile ? 25 : 66
}

export const resolvePreferredDepthBand = (
  layoutStyle: AquascapeLayoutStyle,
  profile: Pick<LocomotionProfile, 'boundaryArcRadius' | 'cruiseSpeed'>,
  roll: number
): PreferredDepthBand => {
  if (layoutStyle === 'nature-showcase') {
    if (profile.boundaryArcRadius > 0.96) {
      if (roll < 0.24) return 'upper'
      if (roll < 0.82) return 'mid'
      return 'hardscape-near'
    }

    if (profile.cruiseSpeed > 1.1) {
      if (roll < 0.32) return 'upper'
      if (roll < 0.92) return 'mid'
      return 'hardscape-near'
    }

    if (roll < 0.22) return 'upper'
    if (roll < 0.84) return 'mid'
    return 'hardscape-near'
  }

  if (profile.boundaryArcRadius > 0.96) {
    if (roll < 0.36) return 'hardscape-near'
    if (roll < 0.72) return 'mid'
    return 'upper'
  }

  if (profile.cruiseSpeed > 1.1) {
    if (roll < 0.38) return 'upper'
    if (roll < 0.78) return 'mid'
    return 'hardscape-near'
  }

  if (roll < 0.28) return 'upper'
  if (roll < 0.72) return 'mid'
  return 'hardscape-near'
}

export const resolvePreferredLateralLane = (
  layoutStyle: AquascapeLayoutStyle,
  roll: number
): PreferredLateralLane => {
  if (layoutStyle === 'nature-showcase') {
    if (roll < 0.24) return 'left'
    if (roll < 0.68) return 'center'
    return 'right'
  }

  if (roll < 0.33) return 'left'
  if (roll < 0.66) return 'center'
  return 'right'
}

export const resolveHeroPlacements = (
  layoutStyle: AquascapeLayoutStyle
): HeroPlacement[] => {
  if (layoutStyle === 'nature-showcase') {
    return [
      { lateralOffset: -0.58, verticalOffset: 0.08, depthOffset: 0.9, scaleMultiplier: 1.24 },
      { lateralOffset: 0.34, verticalOffset: 0.05, depthOffset: 0.84, scaleMultiplier: 1.14 },
      { lateralOffset: 0, verticalOffset: 0.18, depthOffset: 0.88, scaleMultiplier: 1.06 }
    ]
  }

  return [
    { lateralOffset: -0.92, verticalOffset: 0.08, depthOffset: 1.3, scaleMultiplier: 1.78 },
    { lateralOffset: 0.82, verticalOffset: -0.05, depthOffset: 1.18, scaleMultiplier: 1.66 },
    { lateralOffset: 0.14, verticalOffset: 0.22, depthOffset: 1.34, scaleMultiplier: 1.54 }
  ]
}

const isSubduedAccentVariant = (variant?: { name: string }): boolean => (
  variant?.name === 'Goldfish' || variant?.name === 'Butterflyfish'
)

export const resolveHeroPriorityMultiplier = (
  layoutStyle: AquascapeLayoutStyle,
  variant: { name: string } | undefined,
  hasAuthoredHeroAsset: boolean
): number => {
  if (!variant) {
    return 1
  }

  if (hasAuthoredHeroAsset) {
    return 18
  }

  if (!isSubduedAccentVariant(variant)) {
    return 1
  }

  if (layoutStyle === 'nature-showcase') {
    return 0.38
  }

  if (layoutStyle === 'planted') {
    return 0.84
  }

  return 1
}

export const resolveHeroAccentScaleMultiplier = (
  layoutStyle: AquascapeLayoutStyle,
  variant: { name: string }
): number => {
  if (!isSubduedAccentVariant(variant)) {
    return 1
  }

  if (layoutStyle === 'nature-showcase') {
    return 0.62
  }

  if (layoutStyle === 'planted') {
    return 0.92
  }

  return 1
}

export const resolveHeroAccentDepthMultiplier = (
  layoutStyle: AquascapeLayoutStyle,
  variant: { name: string }
): number => {
  if (!isSubduedAccentVariant(variant)) {
    return 1
  }

  if (layoutStyle === 'nature-showcase') {
    return 0.58
  }

  if (layoutStyle === 'planted') {
    return 0.9
  }

  return 1
}
