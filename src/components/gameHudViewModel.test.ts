import { describe, expect, it } from 'vitest'
import {
  HUD_QUALITY_OPTIONS,
  createHudVisibilityAction,
  createModeAction,
  createQualityAction,
  createSettingsToggleAction,
  formatDurationShort,
  getGuideContent,
  resolveSettingsViewModel
} from './gameHudViewModel'

describe('game HUD view model', () => {
  it('formats compact durations for HUD copy', () => {
    expect(formatDurationShort(42)).toBe('42s')
    expect(formatDurationShort(10 * 60)).toBe('10m')
    expect(formatDurationShort((2 * 3600) + (15 * 60))).toBe('2h 15m')
  })

  it('resolves mode-specific guide copy without DOM state', () => {
    expect(getGuideContent('tank').body).toContain('spread schools across depths')
    expect(getGuideContent('layout').hint).toContain('Lane chips')
    expect(getGuideContent('settings').title).toBe('Tune the view')
  })

  it('builds settings toggle and quality state for rendering', () => {
    const viewModel = resolveSettingsViewModel({
      soundEnabled: true,
      motionEnabled: false,
      photoModeEnabled: true,
      quality: 'simple'
    })

    expect(viewModel.sound).toEqual({ text: 'On', pressed: true })
    expect(viewModel.motion).toEqual({ text: 'Off', pressed: false })
    expect(viewModel.photoMode).toEqual({ text: 'On', pressed: true })
    expect(HUD_QUALITY_OPTIONS).toEqual([
      { label: '簡易', value: 'simple' },
      { label: '標準', value: 'standard' }
    ])
    expect(viewModel.qualityOptions.map((option) => option.active)).toEqual([true, false])
  })

  it('creates navigation and quality actions without DOM wiring', () => {
    expect(createModeAction('layout')).toEqual({
      type: 'UI/SET_MODE',
      payload: { mode: 'layout' }
    })
    expect(createQualityAction('standard')).toEqual({
      type: 'SETTINGS/SET_QUALITY',
      payload: { quality: 'standard' }
    })
    expect(createHudVisibilityAction(false)).toEqual({
      type: 'SETTINGS/SET_HUD_VISIBILITY',
      payload: { visible: false }
    })
  })

  it('creates settings toggle actions from current preferences', () => {
    const preferences = {
      soundEnabled: true,
      motionEnabled: false,
      photoModeEnabled: true,
      quality: 'simple' as const
    }

    expect(createSettingsToggleAction('sound', preferences)).toEqual({
      type: 'SETTINGS/SET_SOUND',
      payload: { enabled: false }
    })
    expect(createSettingsToggleAction('motion', preferences)).toEqual({
      type: 'SETTINGS/SET_MOTION',
      payload: { enabled: true }
    })
    expect(createSettingsToggleAction('photoMode', preferences)).toEqual({
      type: 'SETTINGS/SET_PHOTO_MODE',
      payload: { enabled: false }
    })
  })
})
