import type { GameAction, GameUiMode } from '../game/types'
import type { QualityLevel } from '../types/settings'

export type GuideContent = {
  title: string
  body: string
  hint: string
}

type SettingsPreferences = {
  soundEnabled: boolean
  motionEnabled: boolean
  photoModeEnabled: boolean
  quality: QualityLevel
}

type SettingsToggleKey = 'sound' | 'motion' | 'photoMode'

type ToggleViewModel = {
  text: 'On' | 'Off'
  pressed: boolean
}

export const HUD_QUALITY_OPTIONS: Array<{ label: string; value: QualityLevel }> = [
  { label: '簡易', value: 'simple' },
  { label: '標準', value: 'standard' }
]

export const getGuideContent = (mode: GameUiMode): GuideContent => {
  switch (mode) {
    case 'shop':
      return {
        title: 'Build the habitat',
        body: 'Unlock species and decor, then switch to Layout when you want to rebalance where schools gather.',
        hint: 'A few well-chosen species usually reads better than stacking every lane at once.'
      }
    case 'layout':
      return {
        title: 'Shape the water column',
        body: 'Adjust fish counts and lane balance so each school occupies a clearer slice of the tank.',
        hint: 'Lane chips shift fish depth instantly, so use them before adding more fish.'
      }
    case 'progress':
      return {
        title: 'Read the tank',
        body: 'Track which changes are calming the fish and improving passive income.',
        hint: 'A steadier tank should improve both mood and passive income.'
      }
    case 'settings':
      return {
        title: 'Tune the view',
        body: 'Use tactile toggles for sound and motion, then balance fidelity with the quality chips.',
        hint: 'Press Escape anytime to jump back to Tank.'
      }
    case 'tank':
    default:
      return {
        title: 'Observe first',
        body: 'Watch how fish settle, then use Unlock and Layout to spread schools across depths before adding more stock.',
        hint: 'Crowded lanes create alert behavior, while calm schools are easier to read.'
      }
  }
}

export const formatDurationShort = (seconds: number): string => {
  const normalized = Math.max(0, Math.floor(seconds))
  if (normalized >= 3600) {
    const hours = Math.floor(normalized / 3600)
    const minutes = Math.floor((normalized % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (normalized >= 60) {
    return `${Math.floor(normalized / 60)}m`
  }

  return `${normalized}s`
}

const resolveToggle = (enabled: boolean): ToggleViewModel => ({
  text: enabled ? 'On' : 'Off',
  pressed: enabled
})

export const resolveSettingsViewModel = (preferences: SettingsPreferences) => ({
  sound: resolveToggle(preferences.soundEnabled),
  motion: resolveToggle(preferences.motionEnabled),
  photoMode: resolveToggle(preferences.photoModeEnabled),
  qualityOptions: HUD_QUALITY_OPTIONS.map((option) => ({
    ...option,
    active: option.value === preferences.quality
  }))
})

export const createModeAction = (mode: GameUiMode): GameAction => ({
  type: 'UI/SET_MODE',
  payload: { mode }
})

export const createQualityAction = (quality: QualityLevel): GameAction => ({
  type: 'SETTINGS/SET_QUALITY',
  payload: { quality }
})

export const createHudVisibilityAction = (visible: boolean): GameAction => ({
  type: 'SETTINGS/SET_HUD_VISIBILITY',
  payload: { visible }
})

export const createSettingsToggleAction = (
  key: SettingsToggleKey,
  preferences: SettingsPreferences
): GameAction => {
  switch (key) {
    case 'sound':
      return {
        type: 'SETTINGS/SET_SOUND',
        payload: { enabled: !preferences.soundEnabled }
      }
    case 'motion':
      return {
        type: 'SETTINGS/SET_MOTION',
        payload: { enabled: !preferences.motionEnabled }
      }
    case 'photoMode':
      return {
        type: 'SETTINGS/SET_PHOTO_MODE',
        payload: { enabled: !preferences.photoModeEnabled }
      }
  }
}
