import type { AquariumState, FishGroup, Theme } from '../../types/aquarium'

export const sampleTheme: Theme = {
  glassFrameStrength: 0.6,
  waterTint: '#0e3d4e',
  fogDensity: 0.4,
  particleDensity: 0.5,
  waveStrength: 0.7,
  waveSpeed: 0.8
}

export const sampleFishGroups: FishGroup[] = [
  { speciesId: 'neon-tetra', count: 12 },
  { speciesId: 'clownfish', count: 6 }
]

export const sampleState: AquariumState = {
  schemaVersion: 1,
  theme: sampleTheme,
  fishGroups: sampleFishGroups,
  settings: {
    soundEnabled: false,
    motionEnabled: true
  }
}

export const createState = (overrides: Partial<AquariumState> = {}): AquariumState => {
  return {
    ...sampleState,
    ...overrides,
    theme: {
      ...sampleState.theme,
      ...overrides.theme
    },
    settings: {
      ...sampleState.settings,
      ...overrides.settings
    }
  }
}
