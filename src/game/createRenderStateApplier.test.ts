import { describe, expect, it, vi } from 'vitest'
import { createHydratedGameAppState } from './gameSave'
import { createRenderStateApplier } from './createRenderStateApplier'

describe('createRenderStateApplier', () => {
  it('applies theme and fish groups on the first state and keeps ambient toggles in sync', () => {
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn(() => true),
      setMotionEnabled: vi.fn(),
      setPhotoMode: vi.fn(),
      setWaterQuality: vi.fn()
    }
    const audioManager = {
      setEnabled: vi.fn()
    }
    const apply = createRenderStateApplier({ scene, audioManager })
    const state = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })

    apply(state)

    expect(scene.applyTheme).toHaveBeenCalledTimes(1)
    expect(scene.applyFishGroups).toHaveBeenCalledTimes(1)
    expect(scene.setMotionEnabled).toHaveBeenCalledWith(true)
    expect(scene.setPhotoMode).toHaveBeenCalledWith(false)
    expect(scene.setWaterQuality).toHaveBeenCalledWith(state.game.profile.preferences.quality)
    expect(audioManager.setEnabled).toHaveBeenCalledWith(true)
  })

  it('skips reapplying unchanged theme and fish groups for ui-only updates', () => {
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn(() => true),
      setMotionEnabled: vi.fn(),
      setPhotoMode: vi.fn(),
      setWaterQuality: vi.fn()
    }
    const audioManager = {
      setEnabled: vi.fn()
    }
    const apply = createRenderStateApplier({ scene, audioManager })
    const state = createHydratedGameAppState({ nowIso: '2026-03-08T00:00:00.000Z' })

    apply(state)
    apply({
      ...state,
      ui: {
        ...state.ui,
        mode: 'layout'
      }
    })

    expect(scene.applyTheme).toHaveBeenCalledTimes(1)
    expect(scene.applyFishGroups).toHaveBeenCalledTimes(1)
    expect(scene.setMotionEnabled).toHaveBeenCalledTimes(2)
    expect(scene.setPhotoMode).toHaveBeenCalledTimes(2)
    expect(scene.setWaterQuality).toHaveBeenCalledTimes(2)
    expect(audioManager.setEnabled).toHaveBeenCalledTimes(2)
  })
})
