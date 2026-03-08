import {
  getDecorDefinition,
  getFishDefinition,
  laneForGridRow
} from './catalog'
import type {
  DecorPlacement,
  GameSave,
  GameTank,
  OfflineSimulationResult,
  OfflineTankSummary
} from './types'

export const MAX_OFFLINE_SECONDS = 8 * 60 * 60

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const getAdjacentPairs = (placements: DecorPlacement[]): number => {
  let pairs = 0
  for (let index = 0; index < placements.length; index += 1) {
    const current = placements[index]
    for (let nextIndex = index + 1; nextIndex < placements.length; nextIndex += 1) {
      const next = placements[nextIndex]
      const distance = Math.abs(current.x - next.x) + Math.abs(current.y - next.y)
      if (distance === 1) pairs += 1
    }
  }
  return pairs
}

const getDecorStats = (tank: GameTank): {
  comfortBonus: number
  waterQualityBonus: number
} => {
  const adjacentPairs = getAdjacentPairs(tank.decor)
  let comfortBonus = adjacentPairs * 2
  let waterQualityBonus = 0

  tank.decor.forEach((placement) => {
    const decor = getDecorDefinition(placement.decorId)
    if (!decor) return

    comfortBonus += decor.comfortBonus
    waterQualityBonus += decor.waterQualityBonus

    const supportedLane = laneForGridRow(placement.y, tank.layout.rows)
    const hasMatchingSchool = tank.fishSchools.some((school) => {
      if (decor.laneAffinity === 'any') return true
      return school.lane === decor.laneAffinity || school.lane === supportedLane
    })
    if (hasMatchingSchool) {
      comfortBonus += decor.adjacencyBonus
    }
  })

  return { comfortBonus, waterQualityBonus }
}

const getFishStats = (tank: GameTank): {
  totalFish: number
  baseIncomePerMinute: number
  laneHarmonyBonus: number
  pollutionPerMinute: number
  uniqueSpecies: number
} => {
  const uniqueSpecies = new Set(tank.fishSchools.map((school) => school.speciesId)).size

  return tank.fishSchools.reduce((stats, school) => {
    const fish = getFishDefinition(school.speciesId)
    if (!fish) return stats

    const isPreferredLane = fish.preferredLane === school.lane
    return {
      totalFish: stats.totalFish + school.count,
      baseIncomePerMinute: stats.baseIncomePerMinute + (fish.baseIncomePerMinute * school.count),
      laneHarmonyBonus: stats.laneHarmonyBonus + (isPreferredLane ? 6 : 1),
      pollutionPerMinute: stats.pollutionPerMinute + (fish.pollutionPerFish * school.count),
      uniqueSpecies
    }
  }, {
    totalFish: 0,
    baseIncomePerMinute: 0,
    laneHarmonyBonus: 0,
    pollutionPerMinute: 0,
    uniqueSpecies
  })
}

export const calculateTankEconomy = (tank: GameTank): {
  comfort: number
  incomePerMinute: number
  waterQualityDeltaPerMinute: number
} => {
  const fishStats = getFishStats(tank)
  const decorStats = getDecorStats(tank)
  const crowdingPenalty = Math.max(0, fishStats.totalFish - 18) * 2
  const comfort = clamp(
    38 +
      (fishStats.uniqueSpecies * 6) +
      fishStats.laneHarmonyBonus +
      decorStats.comfortBonus -
      crowdingPenalty,
    0,
    100
  )

  const waterQuality = clamp(tank.progression.waterQuality, 0, 100)
  const comfortMultiplier = 0.7 + (comfort / 200)
  const waterMultiplier = 0.35 + ((waterQuality / 100) * 0.65)
  const incomePerMinute = Math.max(
    1,
    Math.round(fishStats.baseIncomePerMinute * comfortMultiplier * waterMultiplier)
  )
  const waterQualityDeltaPerMinute = decorStats.waterQualityBonus - fishStats.pollutionPerMinute

  return {
    comfort,
    incomePerMinute,
    waterQualityDeltaPerMinute
  }
}

type SimulatedTank = {
  tank: GameTank
  grossCoins: number
  summary: OfflineTankSummary
}

const simulateTank = (tank: GameTank, simulatedSeconds: number): SimulatedTank => {
  const beforeWaterQuality = clamp(tank.progression.waterQuality, 0, 100)
  const baseEconomy = calculateTankEconomy(tank)
  const minutes = simulatedSeconds / 60
  const afterWaterQuality = clamp(
    Math.round(beforeWaterQuality + (baseEconomy.waterQualityDeltaPerMinute * minutes)),
    0,
    100
  )
  const withAverageWaterQuality: GameTank = {
    ...tank,
    progression: {
      ...tank.progression,
      waterQuality: Math.round((beforeWaterQuality + afterWaterQuality) / 2)
    }
  }
  const projectedEconomy = calculateTankEconomy(withAverageWaterQuality)
  const grossCoins = Math.max(0, (projectedEconomy.incomePerMinute * simulatedSeconds) / 60)

  return {
    tank: {
      ...tank,
      progression: {
        ...tank.progression,
        comfort: projectedEconomy.comfort,
        incomePerMinute: projectedEconomy.incomePerMinute,
        waterQuality: afterWaterQuality
      }
    },
    grossCoins,
    summary: {
      tankId: tank.id,
      earnedCoins: Math.floor(grossCoins),
      beforeWaterQuality,
      afterWaterQuality
    }
  }
}

export const refreshTankProgression = (tank: GameTank): GameTank => {
  const economy = calculateTankEconomy(tank)
  return {
    ...tank,
    progression: {
      ...tank.progression,
      comfort: economy.comfort,
      incomePerMinute: economy.incomePerMinute,
      waterQuality: clamp(tank.progression.waterQuality, 0, 100)
    }
  }
}

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
        tanks: options.save.tanks.map(refreshTankProgression)
      },
      offlineResult: null
    }
  }

  const tankResults = options.save.tanks.map((tank) => simulateTank(tank, simulatedSeconds))
  const grossCoins = tankResults.reduce((total, result) => total + result.grossCoins, 0) + options.save.profile.currency.pendingCoins
  const earnedCoins = Math.floor(grossCoins)
  const pendingCoins = grossCoins - earnedCoins

  return {
    save: {
      ...options.save,
      lastSimulatedAt: options.nowIso,
      profile: {
        ...options.save.profile,
        currency: {
          coins: options.save.profile.currency.coins + earnedCoins,
          pendingCoins
        },
        stats: {
          ...options.save.profile.stats,
          totalEarnedCoins: options.save.profile.stats.totalEarnedCoins + earnedCoins,
          totalOfflineSeconds: options.save.profile.stats.totalOfflineSeconds + simulatedSeconds
        }
      },
      tanks: tankResults.map((result) => result.tank)
    },
    offlineResult: {
      simulatedSeconds,
      earnedCoins,
      tankSummaries: tankResults.map((result) => result.summary)
    }
  }
}
