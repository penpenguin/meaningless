import type { AquariumState } from '../types/aquarium'
import { areFishGroupsEqual } from './fishGroups'

type SceneStateApplierOptions = {
  scene: {
    applyTheme: (theme: AquariumState['theme']) => void
    applyFishGroups: (groups: AquariumState['fishGroups']) => void
    setMotionEnabled: (enabled: boolean) => void
  }
  audioManager: {
    setEnabled: (enabled: boolean) => void
  }
  settings: {
    motion: boolean
    sound: boolean
  }
}

export const createSceneStateApplier = (options: SceneStateApplierOptions) => {
  let lastFishGroups: AquariumState['fishGroups'] | null = null

  return (state: AquariumState): void => {
    options.scene.applyTheme(state.theme)

    if (!lastFishGroups || !areFishGroupsEqual(lastFishGroups, state.fishGroups)) {
      options.scene.applyFishGroups(state.fishGroups)
      lastFishGroups = state.fishGroups
    }

    options.scene.setMotionEnabled(state.settings.motionEnabled)
    options.audioManager.setEnabled(state.settings.soundEnabled)
    options.settings.motion = state.settings.motionEnabled
    options.settings.sound = state.settings.soundEnabled
  }
}
