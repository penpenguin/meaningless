import { describe, expect, it } from 'vitest'
import { createDefaultProfileState } from '../../../utils/profileSchema'
import { profileReducer } from './profileReducer'

describe('profileReducer', () => {
  it('awards one pearl at 300 viewed seconds', () => {
    const initial = createDefaultProfileState()
    const with299 = profileReducer(initial, {
      type: 'PROFILE/VIEW_TICK',
      payload: { seconds: 299 }
    })

    expect(with299.currency.pearls).toBe(initial.currency.pearls)
    expect(with299.stats.totalViewSeconds).toBe(initial.stats.totalViewSeconds + 299)

    const with300 = profileReducer(with299, {
      type: 'PROFILE/VIEW_TICK',
      payload: { seconds: 1 }
    })

    expect(with300.currency.pearls).toBe(initial.currency.pearls + 1)
    expect(with300.pendingViewSeconds).toBe(0)
  })

  it('carries over remaining seconds after conversion', () => {
    const initial = createDefaultProfileState()
    const next = profileReducer(initial, {
      type: 'PROFILE/VIEW_TICK',
      payload: { seconds: 650 }
    })

    expect(next.currency.pearls).toBe(initial.currency.pearls + 2)
    expect(next.pendingViewSeconds).toBe(50)
  })
})
