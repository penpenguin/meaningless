export type QualityLevel = 'simple' | 'standard'

export type SettingsState = {
  schemaVersion: number
  soundEnabled: boolean
  motionEnabled: boolean
  quality: QualityLevel
}
