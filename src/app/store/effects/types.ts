import type { AppAction, AppState } from '../../../types/app'

export type EffectActionContext = {
  action: AppAction
  prevState: AppState
  nextState: AppState
}

export type AppStoreEffect = {
  onAction: (context: EffectActionContext) => void
  destroy: () => void
}
