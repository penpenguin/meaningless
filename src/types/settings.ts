export type QualityLevel = 'low' | 'medium' | 'high'

export type SettingsState = {
  schemaVersion: number
  soundEnabled: boolean
  motionEnabled: boolean
  quality: QualityLevel
}
