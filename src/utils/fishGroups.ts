import type { FishGroup, Tuning } from '../types/aquarium'

const areTuningEqual = (left?: Tuning, right?: Tuning): boolean => {
  if (left === right) return true
  if (!left || !right) return false
  return (
    left.speed === right.speed &&
    left.cohesion === right.cohesion &&
    left.separation === right.separation &&
    left.alignment === right.alignment &&
    left.avoidWalls === right.avoidWalls &&
    left.preferredDepth === right.preferredDepth &&
    left.schoolMood === right.schoolMood &&
    left.depthVariance === right.depthVariance &&
    left.turnBias === right.turnBias
  )
}

export const areFishGroupsEqual = (left: FishGroup[], right: FishGroup[]): boolean => {
  if (left === right) return true
  if (left.length !== right.length) return false

  for (let index = 0; index < left.length; index += 1) {
    const leftGroup = left[index]
    const rightGroup = right[index]

    if (!leftGroup || !rightGroup) return false
    if (leftGroup.speciesId !== rightGroup.speciesId) return false
    if (leftGroup.count !== rightGroup.count) return false
    if (!areTuningEqual(leftGroup.tuning, rightGroup.tuning)) return false
  }

  return true
}
