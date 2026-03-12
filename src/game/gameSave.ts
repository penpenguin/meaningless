import { migrateProfileState } from '../utils/profileSchema'
import { migrateSettingsState } from '../utils/settingsSchema'
import { migrateTankState } from '../utils/tankSchema'
import {
  DEFAULT_TANK_NAME,
  GRID_COLUMNS,
  GRID_ROWS,
  STARTER_DECOR_ID,
  STARTER_FISH_ID
} from './catalog'
import { getStarterDecorContentIds, getStarterFishContentIds } from '../content/registry'
import { refreshTankProgression, simulateGameSave } from './simulation'
import type { GameAppState, GameSave, Lane } from './types'
import type { QualityLevel } from '../types/settings'

export const CURRENT_GAME_SCHEMA_VERSION = 1

const migrateQuality = (value: unknown, fallback: QualityLevel): QualityLevel => {
  if (value === 'simple' || value === 'standard') return value
  if (value === 'low') return 'simple'
  if (value === 'medium' || value === 'high') return 'standard'
  return fallback
}

const createDefaultProfile = () => ({
  currency: {
    coins: 12,
    pendingCoins: 0
  },
  unlockedFishIds: getStarterFishContentIds(),
  unlockedDecorIds: getStarterDecorContentIds(),
  stats: {
    totalEarnedCoins: 0,
    totalOfflineSeconds: 0,
    totalMaintenanceActions: 0,
    totalViewedSeconds: 0
  },
  preferences: {
    soundEnabled: true,
    motionEnabled: true,
    quality: 'simple' as const,
    hudVisible: true,
    photoModeEnabled: false
  }
})

const getLaneFromPreferredDepth = (preferredDepth: unknown): Lane => {
  if (typeof preferredDepth !== 'number' || !Number.isFinite(preferredDepth)) return 'middle'
  if (preferredDepth <= 0.33) return 'top'
  if (preferredDepth >= 0.67) return 'bottom'
  return 'middle'
}

const createDefaultTank = () => refreshTankProgression({
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
  rareFish: [],
  decor: [],
  progression: {
    comfort: 0,
    waterQuality: 100,
    incomePerMinute: 0,
    lastCollectedAt: null
  }
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
      currency: {
        coins: migratedProfile?.currency.pearls ?? fallbackState.profile.currency.coins,
        pendingCoins: 0
      },
      unlockedFishIds: Array.from(new Set([
        ...fallbackState.profile.unlockedFishIds,
        ...(migratedProfile?.unlockedSpeciesIds ?? [])
      ])),
      preferences: {
        soundEnabled: migratedSettings?.soundEnabled ??
          (typeof legacyAutoSaveSettings?.soundEnabled === 'boolean'
            ? legacyAutoSaveSettings.soundEnabled
            : fallbackState.profile.preferences.soundEnabled),
        motionEnabled: migratedSettings?.motionEnabled ??
          (typeof legacyAutoSaveSettings?.motionEnabled === 'boolean'
            ? legacyAutoSaveSettings.motionEnabled
            : fallbackState.profile.preferences.motionEnabled),
        quality: migrateQuality(migratedSettings?.quality, fallbackState.profile.preferences.quality),
        hudVisible: fallbackState.profile.preferences.hudVisible,
        photoModeEnabled: fallbackState.profile.preferences.photoModeEnabled
      },
      stats: {
        ...fallbackState.profile.stats,
        totalViewedSeconds: migratedProfile?.stats?.totalViewSeconds ?? fallbackState.profile.stats.totalViewedSeconds
      }
    },
    tanks: [refreshTankProgression({
      ...tank,
      fishSchools,
      decor: fallbackState.profile.unlockedDecorIds.includes(STARTER_DECOR_ID) ? [] : tank.decor
    })],
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

  const tanks = value.tanks
    .filter(isRecord)
    .map((tank, index) => {
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
      const decor = Array.isArray(tank.decor)
        ? tank.decor.filter(isRecord).map((placement, placementIndex) => ({
            id: typeof placement.id === 'string' ? placement.id : `decor-${index}-${placementIndex}`,
            decorId: typeof placement.decorId === 'string' ? placement.decorId : STARTER_DECOR_ID,
            x: typeof placement.x === 'number' ? Math.max(0, Math.floor(placement.x)) : 0,
            y: typeof placement.y === 'number' ? Math.max(0, Math.floor(placement.y)) : 0
          }))
        : []
      const progression = isRecord(tank.progression) ? tank.progression : {}

      return refreshTankProgression({
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
        rareFish: [],
        decor,
        progression: {
          comfort: typeof progression.comfort === 'number' ? Math.max(0, Math.floor(progression.comfort)) : 0,
          waterQuality: typeof progression.waterQuality === 'number' ? Math.max(0, Math.min(100, Math.floor(progression.waterQuality))) : 100,
          incomePerMinute: typeof progression.incomePerMinute === 'number' ? Math.max(1, Math.floor(progression.incomePerMinute)) : 1,
          lastCollectedAt: typeof progression.lastCollectedAt === 'string' ? progression.lastCollectedAt : null
        }
      })
    })

  const activeTankId = typeof value.activeTankId === 'string' && tanks.some((tank) => tank.id === value.activeTankId)
    ? value.activeTankId
    : tanks[0].id

  return {
    schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
    lastSimulatedAt: typeof value.lastSimulatedAt === 'string' ? value.lastSimulatedAt : nowIso,
    profile: {
      currency: {
        coins: isRecord(profileSource.currency) && typeof profileSource.currency.coins === 'number'
          ? Math.max(0, Math.floor(profileSource.currency.coins))
          : fallback.profile.currency.coins,
        pendingCoins: isRecord(profileSource.currency) && typeof profileSource.currency.pendingCoins === 'number'
          ? Math.max(0, profileSource.currency.pendingCoins)
          : fallback.profile.currency.pendingCoins
      },
      unlockedFishIds: Array.from(new Set([
        ...fallback.profile.unlockedFishIds,
        ...(Array.isArray(profileSource.unlockedFishIds)
          ? profileSource.unlockedFishIds.filter((entry): entry is string => typeof entry === 'string')
          : [])
      ])),
      unlockedDecorIds: Array.from(new Set([
        ...fallback.profile.unlockedDecorIds,
        ...(Array.isArray(profileSource.unlockedDecorIds)
          ? profileSource.unlockedDecorIds.filter((entry): entry is string => typeof entry === 'string')
          : [])
      ])),
      stats: {
        totalEarnedCoins: isRecord(profileSource.stats) && typeof profileSource.stats.totalEarnedCoins === 'number'
          ? Math.max(0, Math.floor(profileSource.stats.totalEarnedCoins))
          : fallback.profile.stats.totalEarnedCoins,
        totalOfflineSeconds: isRecord(profileSource.stats) && typeof profileSource.stats.totalOfflineSeconds === 'number'
          ? Math.max(0, Math.floor(profileSource.stats.totalOfflineSeconds))
          : fallback.profile.stats.totalOfflineSeconds,
        totalMaintenanceActions: isRecord(profileSource.stats) && typeof profileSource.stats.totalMaintenanceActions === 'number'
          ? Math.max(0, Math.floor(profileSource.stats.totalMaintenanceActions))
          : fallback.profile.stats.totalMaintenanceActions,
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
        quality: migrateQuality(preferencesSource.quality, fallback.profile.preferences.quality),
        hudVisible: typeof preferencesSource.hudVisible === 'boolean'
          ? preferencesSource.hudVisible
          : fallback.profile.preferences.hudVisible,
        photoModeEnabled: typeof preferencesSource.photoModeEnabled === 'boolean'
          ? preferencesSource.photoModeEnabled
          : fallback.profile.preferences.photoModeEnabled
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
      selectedDecorId: simulated.save.profile.unlockedDecorIds[0] ?? null,
      lastOfflineResult: simulated.offlineResult
    }
  }
}
