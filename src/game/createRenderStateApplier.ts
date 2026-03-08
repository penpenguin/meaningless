import { areFishGroupsEqual } from '../utils/fishGroups'
import type { GameAppState } from './types'
import { createAquariumRenderModel } from './renderModel'

type RenderScene = {
  applyTheme: (theme: ReturnType<typeof createAquariumRenderModel>['theme']) => void
  applyFishGroups: (groups: ReturnType<typeof createAquariumRenderModel>['fishGroups']) => boolean
  setMotionEnabled: (enabled: boolean) => void
  setWaterQuality: (quality: GameAppState['game']['profile']['preferences']['quality']) => void
}

type AudioBinding = {
  setEnabled: (enabled: boolean) => void
}

const isSameTheme = (
  left: ReturnType<typeof createAquariumRenderModel>['theme'],
  right: ReturnType<typeof createAquariumRenderModel>['theme']
): boolean => {
  return (
    left.glassFrameStrength === right.glassFrameStrength &&
    left.waterTint === right.waterTint &&
    left.fogDensity === right.fogDensity &&
    left.particleDensity === right.particleDensity &&
    left.waveStrength === right.waveStrength &&
    left.waveSpeed === right.waveSpeed
  )
}

export const createRenderStateApplier = (options: {
  scene: RenderScene
  audioManager: AudioBinding
}) => {
  let lastTheme: ReturnType<typeof createAquariumRenderModel>['theme'] | null = null
  let lastFishGroups: ReturnType<typeof createAquariumRenderModel>['fishGroups'] | null = null

  return (state: GameAppState): void => {
    const renderModel = createAquariumRenderModel(state)
    if (!lastTheme || !isSameTheme(lastTheme, renderModel.theme)) {
      options.scene.applyTheme(renderModel.theme)
      lastTheme = renderModel.theme
    }

    if (!lastFishGroups || !areFishGroupsEqual(lastFishGroups, renderModel.fishGroups)) {
      const applied = options.scene.applyFishGroups(renderModel.fishGroups)
      if (applied) {
        lastFishGroups = renderModel.fishGroups
      }
    }

    options.scene.setMotionEnabled(state.game.profile.preferences.motionEnabled)
    options.scene.setWaterQuality(state.game.profile.preferences.quality)
    options.audioManager.setEnabled(state.game.profile.preferences.soundEnabled)
  }
}
