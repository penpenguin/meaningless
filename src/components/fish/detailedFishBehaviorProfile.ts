import type { SchoolMood } from '../../types/aquarium'

export type BehaviorProfile = {
  speed: number
  cohesion: number
  separation: number
  alignment: number
  avoidWalls: number
  preferredDepth: number
  schoolMood: SchoolMood
  depthVariance: number
  turnBias: number
}

export const DEFAULT_BEHAVIOR_PROFILE: BehaviorProfile = {
  speed: 0.55,
  cohesion: 0.55,
  separation: 0.62,
  alignment: 0.58,
  avoidWalls: 0.8,
  preferredDepth: 0.5,
  schoolMood: 'calm',
  depthVariance: 0.18,
  turnBias: 0.14
}
