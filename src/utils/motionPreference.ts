import type { AquariumStore } from './aquariumStore'

type ReducedMotionEvent = Pick<MediaQueryListEvent, 'matches'>

export const handleReducedMotionPreference = (
  store: AquariumStore,
  event: ReducedMotionEvent
): void => {
  if (!event.matches) return

  const current = store.getState().settings.motionEnabled
  if (!current) return

  store.updateSettings({ motionEnabled: false })
}
