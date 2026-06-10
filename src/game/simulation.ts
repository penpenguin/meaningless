import type {
  GameSave,
  OfflineSimulationResult
} from './types'

export const MAX_OFFLINE_SECONDS = 8 * 60 * 60

export const simulateGameSave = (options: {
  save: GameSave
  nowIso: string
  maxOfflineSeconds?: number
}): {
  save: GameSave
  offlineResult: OfflineSimulationResult | null
} => {
  const currentTime = Date.parse(options.nowIso)
  const lastTime = Date.parse(options.save.lastSimulatedAt)
  const elapsedSeconds = Number.isFinite(currentTime) && Number.isFinite(lastTime)
    ? Math.max(0, Math.floor((currentTime - lastTime) / 1000))
    : 0
  const simulatedSeconds = Math.min(elapsedSeconds, options.maxOfflineSeconds ?? MAX_OFFLINE_SECONDS)

  if (simulatedSeconds <= 0) {
    return {
      save: {
        ...options.save,
        lastSimulatedAt: options.nowIso,
        tanks: options.save.tanks
      },
      offlineResult: null
    }
  }

  return {
    save: {
      ...options.save,
      lastSimulatedAt: options.nowIso,
      profile: {
        ...options.save.profile,
        stats: {
          ...options.save.profile.stats,
          totalOfflineSeconds: options.save.profile.stats.totalOfflineSeconds + simulatedSeconds
        }
      },
      tanks: options.save.tanks
    },
    offlineResult: {
      simulatedSeconds,
      tankSummaries: options.save.tanks.map((tank) => ({ tankId: tank.id }))
    }
  }
}
