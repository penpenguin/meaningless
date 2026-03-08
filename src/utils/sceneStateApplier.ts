import type { AppState } from '../types/app'
import { areFishGroupsEqual } from './fishGroups'

type SceneStateApplierOptions = {
  scene: {
    applyTheme: (theme: AppState['tank']['theme']) => void
    applyFishGroups: (groups: AppState['tank']['fishGroups']) => boolean
    setMotionEnabled: (enabled: boolean) => void
  }
  audioManager: {
    setEnabled: (enabled: boolean) => void
  }
}

export const createSceneStateApplier = (options: SceneStateApplierOptions) => {
  let lastTheme: AppState['tank']['theme'] | null = null
  let lastFishGroups: AppState['tank']['fishGroups'] | null = null

  const isSameTheme = (
    left: AppState['tank']['theme'],
    right: AppState['tank']['theme']
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

  return (state: AppState): void => {
    if (!lastTheme || !isSameTheme(lastTheme, state.tank.theme)) {
      options.scene.applyTheme(state.tank.theme)
      lastTheme = state.tank.theme
    }

    if (!lastFishGroups || !areFishGroupsEqual(lastFishGroups, state.tank.fishGroups)) {
      const applied = options.scene.applyFishGroups(state.tank.fishGroups)
      if (applied) {
        lastFishGroups = state.tank.fishGroups
      }
    }

    options.scene.setMotionEnabled(state.settings.motionEnabled)
    options.audioManager.setEnabled(state.settings.soundEnabled)
  }
}
