import { describe, expect, it, vi } from 'vitest'
import { createDefaultState } from '../utils/stateSchema'
import { createSceneStateApplier } from '../utils/sceneStateApplier'

describe('createSceneStateApplier', () => {
  it('skips applyFishGroups when groups are unchanged', () => {
    const state = createDefaultState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn().mockReturnValue(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }
    const settings = { motion: false, sound: false }

    const applySceneState = createSceneStateApplier({ scene, audioManager, settings })

    applySceneState(state)

    const nextState = {
      ...state,
      theme: {
        ...state.theme,
        fogDensity: state.theme.fogDensity + 0.1
      }
    }

    applySceneState(nextState)

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(1)
    expect(scene.applyTheme).toHaveBeenCalledTimes(2)
  })

  it('applies fish groups when they change', () => {
    const state = createDefaultState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn().mockReturnValue(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }
    const settings = { motion: false, sound: false }

    const applySceneState = createSceneStateApplier({ scene, audioManager, settings })

    applySceneState(state)

    applySceneState({
      ...state,
      fishGroups: [...state.fishGroups, { speciesId: 'test-fish', count: 1 }]
    })

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(2)
  })

  it('retries fish groups when the scene is not ready', () => {
    const state = createDefaultState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }
    const settings = { motion: false, sound: false }

    const applySceneState = createSceneStateApplier({ scene, audioManager, settings })

    applySceneState(state)

    applySceneState({
      ...state,
      theme: {
        ...state.theme,
        fogDensity: state.theme.fogDensity + 0.05
      }
    })

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(2)
  })
})
