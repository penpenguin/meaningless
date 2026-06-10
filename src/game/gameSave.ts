import { migrateProfileState } from '../utils/storage/profileSchema'
import { migrateSettingsState } from '../utils/storage/settingsSchema'
import { migrateTankState } from '../utils/storage/tankSchema'
import {
  DEFAULT_TANK_NAME,
  GRID_COLUMNS,
  GRID_ROWS,
  STARTER_FISH_ID
} from './catalog'
import { simulateGameSave } from './simulation'
import type { GameAppState, GameSave, GameTank, Lane, PhotoModeFollowMode } from './types'

export const CURRENT_GAME_SCHEMA_VERSION = 5

const createDefaultProfile = () => ({
  stats: {
    totalOfflineSeconds: 0,
    totalViewedSeconds: 0
  },
  preferences: {
    soundEnabled: true,
    motionEnabled: true,
    photoMode: {
      enabled: false,
      followMode: 'fish' as const
    }
  }
})

const getLaneFromPreferredDepth = (preferredDepth: unknown): Lane => {
  if (typeof preferredDepth !== 'number' || !Number.isFinite(preferredDepth)) return 'middle'
  if (preferredDepth <= 0.33) return 'top'
  if (preferredDepth >= 0.67) return 'bottom'
  return 'middle'
}

const createDefaultTank = (): GameTank => ({
  id: 'tank-front-1',
  name: DEFAULT_TANK_NAME,
  layout: {
    shape: 'square',
    columns: GRID_COLUMNS,
    rows: GRID_ROWS
  },
  fishSchools: [
    {
      id: 'school-neon-tetra',
      speciesId: STARTER_FISH_ID,
      count: 8,
      lane: 'middle'
    }
  ],
  rareFish: []
})

export const createDefaultGameSave = (nowIso = new Date().toISOString()): GameSave => {
  const defaultTank = createDefaultTank()
  return {
    schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
    lastSimulatedAt: nowIso,
    profile: createDefaultProfile(),
    tanks: [defaultTank],
    activeTankId: defaultTank.id
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const migratePhotoModeFollowMode = (value: unknown): PhotoModeFollowMode => {
  return value === 'mouse' ? 'mouse' : 'fish'
}

export const migrateLegacySave = (options: {
  nowIso: string
  legacyTank: unknown
  legacyProfile: unknown
  legacySettings: unknown
  legacyAutoSave: { state?: unknown } | null
}): GameSave => {
  const fallbackState = createDefaultGameSave(options.nowIso)
  const legacyAutoSaveState = isRecord(options.legacyAutoSave?.state)
    ? options.legacyAutoSave.state
    : null
  const migratedLegacyTank = options.legacyTank
    ? migrateTankState(options.legacyTank)
    : legacyAutoSaveState
      ? migrateTankState(legacyAutoSaveState)
      : null
  const migratedProfile = options.legacyProfile ? migrateProfileState(options.legacyProfile) : null
  const migratedSettings = options.legacySettings ? migrateSettingsState(options.legacySettings) : null
  const legacyAutoSaveSettings = legacyAutoSaveState && isRecord(legacyAutoSaveState.settings)
    ? legacyAutoSaveState.settings
    : null

  const tank = createDefaultTank()
  const fishSchools = migratedLegacyTank?.fishGroups.map((group) => ({
    id: `legacy-${group.speciesId}`,
    speciesId: group.speciesId,
    count: group.count,
    lane: getLaneFromPreferredDepth(group.tuning?.preferredDepth)
  })) ?? tank.fishSchools

  return {
    ...fallbackState,
    profile: {
      ...fallbackState.profile,
      preferences: {
        soundEnabled: migratedSettings?.soundEnabled ??
          (typeof legacyAutoSaveSettings?.soundEnabled === 'boolean'
            ? legacyAutoSaveSettings.soundEnabled
            : fallbackState.profile.preferences.soundEnabled),
        motionEnabled: migratedSettings?.motionEnabled ??
          (typeof legacyAutoSaveSettings?.motionEnabled === 'boolean'
            ? legacyAutoSaveSettings.motionEnabled
            : fallbackState.profile.preferences.motionEnabled),
        photoMode: fallbackState.profile.preferences.photoMode
      },
      stats: {
        ...fallbackState.profile.stats,
        totalViewedSeconds: migratedProfile?.stats?.totalViewSeconds ?? fallbackState.profile.stats.totalViewedSeconds
      }
    },
    tanks: [{
      ...tank,
      fishSchools
    }],
    activeTankId: tank.id
  }
}

export const migrateGameSave = (value: unknown, nowIso = new Date().toISOString()): GameSave => {
  if (!isRecord(value)) return createDefaultGameSave(nowIso)

  const schemaVersion = typeof value.schemaVersion === 'number' ? value.schemaVersion : 0
  if (schemaVersion > CURRENT_GAME_SCHEMA_VERSION) return createDefaultGameSave(nowIso)
  if (!Array.isArray(value.tanks) || value.tanks.length === 0) return createDefaultGameSave(nowIso)

  const fallback = createDefaultGameSave(nowIso)
  const profileSource = isRecord(value.profile) ? value.profile : {}
  const preferencesSource = isRecord(profileSource.preferences) ? profileSource.preferences : {}

  const tanks: GameTank[] = value.tanks
    .filter(isRecord)
    .map((tank, index): GameTank => {
      const base = fallback.tanks[0]
      const fishSchools = Array.isArray(tank.fishSchools)
        ? tank.fishSchools.filter(isRecord).map((school, schoolIndex) => ({
            id: typeof school.id === 'string' ? school.id : `school-${index}-${schoolIndex}`,
            speciesId: typeof school.speciesId === 'string' ? school.speciesId : base.fishSchools[0].speciesId,
            count: typeof school.count === 'number' ? Math.max(1, Math.floor(school.count)) : 1,
            lane: school.lane === 'top' || school.lane === 'bottom' || school.lane === 'middle'
              ? school.lane as Lane
              : 'middle'
          }))
        : base.fishSchools
      return {
        id: typeof tank.id === 'string' ? tank.id : `tank-${index}`,
        name: typeof tank.name === 'string' ? tank.name : base.name,
        layout: {
          shape: 'square',
          columns: isRecord(tank.layout) && typeof tank.layout.columns === 'number'
            ? Math.max(3, Math.floor(tank.layout.columns))
            : GRID_COLUMNS,
          rows: isRecord(tank.layout) && typeof tank.layout.rows === 'number'
            ? Math.max(3, Math.floor(tank.layout.rows))
            : GRID_ROWS
        },
        fishSchools,
        rareFish: []
      }
    })

  const activeTankId = typeof value.activeTankId === 'string' && tanks.some((tank) => tank.id === value.activeTankId)
    ? value.activeTankId
    : tanks[0].id

  return {
    schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
    lastSimulatedAt: typeof value.lastSimulatedAt === 'string' ? value.lastSimulatedAt : nowIso,
    profile: {
      stats: {
        totalOfflineSeconds: isRecord(profileSource.stats) && typeof profileSource.stats.totalOfflineSeconds === 'number'
          ? Math.max(0, Math.floor(profileSource.stats.totalOfflineSeconds))
          : fallback.profile.stats.totalOfflineSeconds,
        totalViewedSeconds: isRecord(profileSource.stats) && typeof profileSource.stats.totalViewedSeconds === 'number'
          ? Math.max(0, Math.floor(profileSource.stats.totalViewedSeconds))
          : fallback.profile.stats.totalViewedSeconds
      },
      preferences: {
        soundEnabled: typeof preferencesSource.soundEnabled === 'boolean'
          ? preferencesSource.soundEnabled
          : fallback.profile.preferences.soundEnabled,
        motionEnabled: typeof preferencesSource.motionEnabled === 'boolean'
          ? preferencesSource.motionEnabled
          : fallback.profile.preferences.motionEnabled,
        photoMode: {
          enabled: isRecord(preferencesSource.photoMode) && typeof preferencesSource.photoMode.enabled === 'boolean'
            ? preferencesSource.photoMode.enabled
            : typeof preferencesSource.photoModeEnabled === 'boolean'
              ? preferencesSource.photoModeEnabled
              : fallback.profile.preferences.photoMode.enabled,
          followMode: isRecord(preferencesSource.photoMode)
            ? migratePhotoModeFollowMode(preferencesSource.photoMode.followMode)
            : fallback.profile.preferences.photoMode.followMode
        }
      }
    },
    tanks,
    activeTankId
  }
}

export const createHydratedGameAppState = (options: {
  save?: GameSave | null
  nowIso?: string
} = {}): GameAppState => {
  const nowIso = options.nowIso ?? new Date().toISOString()
  const migrated = options.save ? migrateGameSave(options.save, nowIso) : createDefaultGameSave(nowIso)
  const simulated = simulateGameSave({
    save: migrated,
    nowIso
  })

  return {
    game: simulated.save,
    ui: {
      mode: 'tank',
      lastOfflineResult: simulated.offlineResult
    }
  }
}
