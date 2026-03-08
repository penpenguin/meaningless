import type { AppStoreEffect, EffectActionContext } from './types'

type AudioEffectOptions = {
  playUnlockSound: () => void
}

export const createAudioEffect = (options: AudioEffectOptions): AppStoreEffect => {
  const onAction = ({ action }: EffectActionContext): void => {
    if (action.type === 'PROFILE/UNLOCK_SPECIES') {
      options.playUnlockSound()
    }
  }

  return {
    onAction,
    destroy: () => {}
  }
}
