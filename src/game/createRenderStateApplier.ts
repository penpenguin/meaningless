import { areFishGroupsEqual } from '../utils/fishGroups'
import type { GameAppState } from './types'
import { createAquariumFishGroups, createAquariumTheme } from './renderModel'

type RenderScene = {
  applyTheme: (theme: ReturnType<typeof createAquariumTheme>) => void
  applyFishGroups: (groups: ReturnType<typeof createAquariumFishGroups>) => boolean
  setMotionEnabled: (enabled: boolean) => void
  setPhotoMode: (enabled: boolean) => void
  setWaterQuality: (quality: GameAppState['game']['profile']['preferences']['quality']) => void
}

type AudioBinding = {
  setEnabled: (enabled: boolean) => void
}

const isSameTheme = (
  left: ReturnType<typeof createAquariumTheme>,
  right: ReturnType<typeof createAquariumTheme>
): boolean => {
  return (
    left.glassFrameStrength === right.glassFrameStrength &&
    left.waterTint === right.waterTint &&
    left.fogDensity === right.fogDensity &&
    left.particleDensity === right.particleDensity &&
    left.waveStrength === right.waveStrength &&
    left.waveSpeed === right.waveSpeed &&
    left.layoutStyle === right.layoutStyle
  )
}

export const createRenderStateApplier = (options: {
  scene: RenderScene
  audioManager: AudioBinding
}) => {
  let lastTheme: ReturnType<typeof createAquariumTheme> | null = null
  let lastFishGroups: ReturnType<typeof createAquariumFishGroups> | null = null

  return (state: GameAppState): void => {
    const theme = createAquariumTheme(state)
    if (!lastTheme || !isSameTheme(lastTheme, theme)) {
      options.scene.applyTheme(theme)
      lastTheme = theme
    }

    const fishGroups = createAquariumFishGroups(state)
    if (!lastFishGroups || !areFishGroupsEqual(lastFishGroups, fishGroups)) {
      const applied = options.scene.applyFishGroups(fishGroups)
      if (applied) {
        lastFishGroups = fishGroups
      }
    }

    options.scene.setMotionEnabled(state.game.profile.preferences.motionEnabled)
    options.scene.setPhotoMode(state.game.profile.preferences.photoModeEnabled)
    options.scene.setWaterQuality(state.game.profile.preferences.quality)
    options.audioManager.setEnabled(state.game.profile.preferences.soundEnabled)
  }
}
