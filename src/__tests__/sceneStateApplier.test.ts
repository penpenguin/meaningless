import { describe, expect, it, vi } from 'vitest'
import { createDefaultAppState } from '../app/state/defaultAppState'
import { createSceneStateApplier } from '../utils/sceneStateApplier'

describe('createSceneStateApplier', () => {
  it('skips applyTheme when only profile changes', () => {
    const state = createDefaultAppState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn().mockReturnValue(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }

    const applySceneState = createSceneStateApplier({ scene, audioManager })

    applySceneState(state)

    applySceneState({
      ...state,
      profile: {
        ...state.profile,
        stats: {
          ...state.profile.stats,
          totalViewSeconds: state.profile.stats.totalViewSeconds + 1
        }
      }
    })

    expect(scene.applyTheme).toHaveBeenCalledTimes(1)
    expect(scene.applyFishGroups).toHaveBeenCalledTimes(1)
  })

  it('skips applyFishGroups when groups are unchanged', () => {
    const state = createDefaultAppState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn().mockReturnValue(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }

    const applySceneState = createSceneStateApplier({ scene, audioManager })

    applySceneState(state)

    const nextState = {
      ...state,
      tank: {
        ...state.tank,
        theme: {
          ...state.tank.theme,
          fogDensity: state.tank.theme.fogDensity + 0.1
        }
      }
    }

    applySceneState(nextState)

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(1)
    expect(scene.applyTheme).toHaveBeenCalledTimes(2)
  })

  it('applies fish groups when they change', () => {
    const state = createDefaultAppState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn().mockReturnValue(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }

    const applySceneState = createSceneStateApplier({ scene, audioManager })

    applySceneState(state)

    applySceneState({
      ...state,
      tank: {
        ...state.tank,
        fishGroups: [...state.tank.fishGroups, { speciesId: 'clownfish', count: 1 }]
      }
    })

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(2)
  })

  it('retries fish groups when the scene is not ready', () => {
    const state = createDefaultAppState()
    const scene = {
      applyTheme: vi.fn(),
      applyFishGroups: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
      setMotionEnabled: vi.fn()
    }
    const audioManager = { setEnabled: vi.fn() }

    const applySceneState = createSceneStateApplier({ scene, audioManager })

    applySceneState(state)

    applySceneState({
      ...state,
      tank: {
        ...state.tank,
        theme: {
          ...state.tank.theme,
          fogDensity: state.tank.theme.fogDensity + 0.05
        }
      }
    })

    expect(scene.applyFishGroups).toHaveBeenCalledTimes(2)
  })
})
