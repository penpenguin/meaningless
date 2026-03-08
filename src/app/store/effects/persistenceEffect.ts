import type { AppState } from '../../../types/app'
import type { AppStoreEffect, EffectActionContext } from './types'

type PersistenceEffectOptions = {
  saveTank: (state: AppState['tank']) => void
  saveProfile: (state: AppState['profile']) => void
  saveSettings: (state: AppState['settings']) => void
  delayMs?: number
}

export const createPersistenceEffect = (options: PersistenceEffectOptions): AppStoreEffect => {
  const delayMs = options.delayMs ?? 500
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingTank: AppState['tank'] | null = null
  let pendingProfile: AppState['profile'] | null = null
  let pendingSettings: AppState['settings'] | null = null

  const flush = (): void => {
    if (pendingTank) options.saveTank(pendingTank)
    if (pendingProfile) options.saveProfile(pendingProfile)
    if (pendingSettings) options.saveSettings(pendingSettings)
    pendingTank = null
    pendingProfile = null
    pendingSettings = null
  }

  const onAction = ({ prevState, nextState }: EffectActionContext): void => {
    if (prevState.tank !== nextState.tank) {
      pendingTank = nextState.tank
    }
    if (prevState.profile !== nextState.profile) {
      pendingProfile = nextState.profile
    }
    if (prevState.settings !== nextState.settings) {
      pendingSettings = nextState.settings
    }

    if (!pendingTank && !pendingProfile && !pendingSettings) {
      return
    }

    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      flush()
      timer = null
    }, delayMs)
  }

  const destroy = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    flush()
  }

  return {
    onAction,
    destroy
  }
}
