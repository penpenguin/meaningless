import type { FishGroup, Theme } from '../types/aquarium'
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

const getActiveTank = (state: GameAppState): GameTank => {
  return state.game.tanks.find((tank) => tank.id === state.game.activeTankId) ?? state.game.tanks[0]
}

export const createAquariumRenderModel = (state: GameAppState): AquariumRenderModel => {
  const tank = getActiveTank(state)
  const quality = tank.progression.waterQuality
  const comfort = tank.progression.comfort
  const tint = quality >= 75
    ? '#0b6171'
    : quality >= 45
      ? '#0c5061'
      : '#264955'

  return {
    theme: {
      glassFrameStrength: 0.78,
      waterTint: tint,
      fogDensity: Number((0.28 + ((100 - quality) / 220)).toFixed(2)),
      particleDensity: Number((0.24 + (comfort / 250)).toFixed(2)),
      waveStrength: Number((0.42 + (comfort / 280)).toFixed(2)),
      waveSpeed: state.game.profile.preferences.motionEnabled ? 0.72 : 0.24
    },
    fishGroups: tank.fishSchools.map((school) => ({
      speciesId: school.speciesId,
      count: school.count,
      tuning: {
        speed: 0.55 + (tank.progression.comfort / 220),
        cohesion: 0.55,
        separation: 0.62,
        alignment: 0.58,
        avoidWalls: 0.8,
        preferredDepth: laneToPreferredDepth(school.lane)
      }
    }))
  }
}
