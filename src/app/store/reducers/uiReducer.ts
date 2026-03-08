import type { AppAction, UiState } from '../../../types/app'

export const uiReducer = (state: UiState, action: AppAction): UiState => {
  switch (action.type) {
    case 'UI/SET_MODE':
      return {
        ...state,
        mode: action.payload.mode
      }
    default:
      return state
  }
}
