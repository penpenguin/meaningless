import { describe, expect, it } from 'vitest'
import { createAquariumStore } from '../utils/aquariumStore'
import { handleReducedMotionPreference } from '../utils/motionPreference'

describe('reduced motion preference', () => {
  it('disables motion in store when prefers-reduced-motion matches', () => {
    const store = createAquariumStore()
    store.updateSettings({ motionEnabled: true })

    handleReducedMotionPreference(store, { matches: true } as MediaQueryListEvent)

    expect(store.getState().settings.motionEnabled).toBe(false)
  })

  it('keeps motion setting when preference does not match', () => {
    const store = createAquariumStore()
    store.updateSettings({ motionEnabled: false })

    handleReducedMotionPreference(store, { matches: false } as MediaQueryListEvent)

    expect(store.getState().settings.motionEnabled).toBe(false)
  })
})
