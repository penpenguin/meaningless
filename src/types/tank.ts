import type { FishGroup, Theme } from './aquarium'

export type TankState = {
  schemaVersion: number
  theme: Theme
  fishGroups: FishGroup[]
}
