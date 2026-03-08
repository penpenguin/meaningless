import { getSpeciesOrFallback } from '../../../utils/speciesCatalog'
import type { AppStoreEffect, EffectActionContext } from './types'

type ToastEffectOptions = {
  showToast: (message: string, type?: 'info' | 'error') => void
}

export const createToastEffect = (options: ToastEffectOptions): AppStoreEffect => {
  const onAction = ({ action }: EffectActionContext): void => {
    if (action.type !== 'PROFILE/UNLOCK_SPECIES') return
    const species = getSpeciesOrFallback(action.payload.speciesId)
    options.showToast(`${species.displayName} unlocked!`)
  }

  return {
    onAction,
    destroy: () => {}
  }
}
