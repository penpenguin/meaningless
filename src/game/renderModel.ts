import type { FishGroup, SchoolMood, Theme } from '../types/aquarium'
import type { GameAppState, GameTank, Lane } from './types'

export type AquariumRenderModel = {
  theme: Theme
  fishGroups: FishGroup[]
}

const laneToPreferredDepth = (lane: Lane): number => {
  if (lane === 'top') return 0.2
  if (lane === 'bottom') return 0.8
  return 0.5
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const getLaneCounts = (tank: GameTank): Record<Lane, number> => {
  return tank.fishSchools.reduce<Record<Lane, number>>((counts, school) => {
    counts[school.lane] += school.count
    return counts
  }, {
    top: 0,
    middle: 0,
    bottom: 0
  })
}

const getSchoolMood = (tank: GameTank, schoolLaneShare: number, school: GameTank['fishSchools'][number]): SchoolMood => {
  const quality = tank.progression.waterQuality
  const comfort = tank.progression.comfort
  const totalFish = tank.fishSchools.reduce((sum, entry) => sum + entry.count, 0)
  const crowding = Math.max(0, totalFish - 18)

  if (quality < 45 || comfort < 35 || crowding >= 7 || (totalFish >= 16 && schoolLaneShare >= 0.72)) {
    return 'alert'
  }

  if (
    school.lane === 'top' &&
    quality >= 78 &&
    comfort >= 60 &&
    crowding <= 2 &&
    (totalFish < 16 || schoolLaneShare <= 0.6)
  ) {
    return 'feeding'
  }

  return 'calm'
}

const getMoodTuning = (mood: SchoolMood, lane: Lane, comfort: number) => {
  const baseDepth = laneToPreferredDepth(lane)
  const comfortOffset = Math.min(0.08, comfort / 1500)

  if (mood === 'alert') {
    return {
      speed: Number((0.66 + (comfort / 260)).toFixed(2)),
      cohesion: 0.72,
      separation: 0.74,
      alignment: 0.64,
      avoidWalls: 0.92,
      preferredDepth: Number(clamp(baseDepth + 0.14, 0.14, 0.88).toFixed(2)),
      depthVariance: 0.08,
      turnBias: 0.32
    }
  }

  if (mood === 'feeding') {
    return {
      speed: Number((0.6 + (comfort / 260)).toFixed(2)),
      cohesion: 0.5,
      separation: 0.58,
      alignment: 0.56,
      avoidWalls: 0.78,
      preferredDepth: Number(clamp(baseDepth - 0.08 - comfortOffset, 0.08, 0.82).toFixed(2)),
      depthVariance: 0.24,
      turnBias: 0.24
    }
  }

  return {
    speed: Number((0.52 + (comfort / 260)).toFixed(2)),
    cohesion: 0.48,
    separation: 0.56,
    alignment: 0.55,
    avoidWalls: 0.82,
    preferredDepth: Number(clamp(baseDepth + (lane === 'bottom' ? 0.02 : 0), 0.12, 0.84).toFixed(2)),
    depthVariance: 0.18,
    turnBias: 0.14
  }
}

const getActiveTank = (state: GameAppState): GameTank => {
  return state.game.tanks.find((tank) => tank.id === state.game.activeTankId) ?? state.game.tanks[0]
}

export const createAquariumRenderModel = (state: GameAppState): AquariumRenderModel => {
  const tank = getActiveTank(state)
  const quality = tank.progression.waterQuality
  const comfort = tank.progression.comfort
  const laneCounts = getLaneCounts(tank)
  const totalFish = Math.max(1, tank.fishSchools.reduce((sum, school) => sum + school.count, 0))
  const fogDensity = Number((0.018 + ((100 - quality) / 1800)).toFixed(3))
  const clarity = quality / 100
  const comfortBlend = Math.min(1, comfort / 100)
  const tint = quality >= 75
    ? '#0b5666'
    : quality >= 45
      ? '#0a4b5a'
      : '#21424d'
  const glassTint = quality >= 75
    ? '#cfe7ee'
    : quality >= 45
      ? '#b6d7de'
      : '#8faeb5'
  const glassReflectionStrength = Number((0.12 + (clarity * 0.28)).toFixed(2))
  const surfaceGlowStrength = Number((0.31 + (clarity * 0.22) + (comfortBlend * 0.09)).toFixed(2))
  const causticsStrength = Number((0.12 + (clarity * 0.27) + (comfortBlend * 0.09)).toFixed(2))

  return {
    theme: {
      glassFrameStrength: 0.78,
      waterTint: tint,
      fogDensity,
      particleDensity: Number((0.24 + (comfort / 250)).toFixed(2)),
      waveStrength: Number((0.42 + (comfort / 280)).toFixed(2)),
      waveSpeed: state.game.profile.preferences.motionEnabled ? 0.72 : 0.24,
      glassTint,
      glassReflectionStrength,
      surfaceGlowStrength,
      causticsStrength
    },
    fishGroups: tank.fishSchools.map((school) => {
      const laneShare = laneCounts[school.lane] / totalFish
      const schoolMood = getSchoolMood(tank, laneShare, school)
      const moodTuning = getMoodTuning(schoolMood, school.lane, comfort)

      return {
        speciesId: school.speciesId,
        count: school.count,
        tuning: {
          ...moodTuning,
          schoolMood
        }
      }
    })
  }
}
