export type ViewMode = 'view' | 'edit'

export type Theme = {
  glassFrameStrength: number
  waterTint: string
  fogDensity: number
  particleDensity: number
  waveStrength: number
  waveSpeed: number
  glassTint?: string
  glassReflectionStrength?: number
  surfaceGlowStrength?: number
  causticsStrength?: number
}

export type SchoolMood = 'calm' | 'alert' | 'feeding'

export type Tuning = {
  speed: number
  cohesion: number
  separation: number
  alignment: number
  avoidWalls: number
  preferredDepth: number
  schoolMood?: SchoolMood
  depthVariance?: number
  turnBias?: number
}

export type FishGroup = {
  speciesId: string
  count: number
  tuning?: Tuning
}

export type Settings = {
  soundEnabled: boolean
  motionEnabled: boolean
}

export type AquariumState = {
  schemaVersion: number
  theme: Theme
  fishGroups: FishGroup[]
  settings: Settings
}

export type Species = {
  speciesId: string
  displayName: string
  description: string
  visualRef: string
  size: number
  colorVariants: string[]
  unlock: SpeciesUnlockRule
  render: SpeciesRenderConfig
}

export type SpeciesUnlockRule = {
  type: 'starter' | 'cost' | 'watchTime' | 'costAndWatchTime'
  costPearls?: number
  requiredViewSeconds?: number
}

export type SpeciesArchetype = 'Tropical' | 'Angelfish' | 'Neon' | 'Goldfish'

export type SpeciesRenderConfig = {
  archetype: SpeciesArchetype
}

export type SaveSlot = {
  id: string
  name: string
  savedAt: string
  state: AquariumState
}

export type AutoSave = {
  updatedAt: string
  state: AquariumState
}
