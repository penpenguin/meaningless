import { getDecorContent, getFishContent } from '../content/registry'
import { laneForGridRow } from './catalog'
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
  hideoutScore: number
} => {
  const adjacentPairs = getAdjacentPairs(tank.decor)
  let comfortBonus = adjacentPairs * 2
  let hideoutScore = 0

  tank.decor.forEach((placement) => {
    const decor = getDecorContent(placement.decorId)
    if (!decor) return

    comfortBonus += decor.gameplay.comfortBonus
    hideoutScore += decor.gameplay.hideoutScore ?? 0

    const supportedLane = laneForGridRow(placement.y, tank.layout.rows)
    const hasMatchingSchool = tank.fishSchools.some((school) => {
      if (decor.gameplay.laneAffinity === 'any') return true
      return school.lane === decor.gameplay.laneAffinity || school.lane === supportedLane
    })
    if (hasMatchingSchool) {
      comfortBonus += decor.gameplay.adjacencyBonus
    }
  })

  return { comfortBonus, hideoutScore }
}

const getFishStats = (tank: GameTank): {
  totalFish: number
  baseIncomePerMinute: number
  laneHarmonyBonus: number
  uniqueSpecies: number
} => {
  const uniqueSpecies = new Set(tank.fishSchools.map((school) => school.speciesId)).size

  return tank.fishSchools.reduce((stats, school) => {
    const fish = getFishContent(school.speciesId)
    if (!fish) return stats

    const isPreferredLane = fish.gameplay.preferredLane === school.lane
    return {
      totalFish: stats.totalFish + school.count,
      baseIncomePerMinute: stats.baseIncomePerMinute + (fish.gameplay.baseIncomePerMinute * school.count),
      laneHarmonyBonus: stats.laneHarmonyBonus + (isPreferredLane ? 6 : 1),
      uniqueSpecies
    }
  }, {
    totalFish: 0,
    baseIncomePerMinute: 0,
    laneHarmonyBonus: 0,
    uniqueSpecies
  })
}

const getLaneImbalancePenalty = (tank: GameTank, totalFish: number): number => {
  if (totalFish < 15) return 0

  const laneCounts = tank.fishSchools.reduce<Record<'top' | 'middle' | 'bottom', number>>((counts, school) => {
    counts[school.lane] += school.count
    return counts
  }, {
    top: 0,
    middle: 0,
    bottom: 0
  })
  const idealPerLane = totalFish / 3

  return Object.values(laneCounts)
    .reduce((penalty, count) => penalty + Math.max(0, count - idealPerLane), 0) * 1.4
}

export const calculateTankEconomy = (tank: GameTank): {
  comfort: number
  incomePerMinute: number
} => {
  const fishStats = getFishStats(tank)
  const decorStats = getDecorStats(tank)
  const crowdingPenalty = Math.max(0, fishStats.totalFish - 18) * 2
  const laneImbalancePenalty = getLaneImbalancePenalty(tank, fishStats.totalFish)
  const hideoutRelief = Math.min(
    crowdingPenalty,
    decorStats.hideoutScore * (1 + Math.max(0, fishStats.totalFish - 10) / 10)
  )
  const comfort = clamp(
    Math.round(
      38 +
        (fishStats.uniqueSpecies * 6) +
        fishStats.laneHarmonyBonus +
        decorStats.comfortBonus -
        crowdingPenalty -
        laneImbalancePenalty +
        hideoutRelief
    ),
    0,
    100
  )

  const comfortMultiplier = 0.7 + (comfort / 200)
  const incomePerMinute = Math.max(
    1,
    Math.round(fishStats.baseIncomePerMinute * comfortMultiplier)
  )

  return {
    comfort,
    incomePerMinute
  }
}

type SimulatedTank = {
  tank: GameTank
  summary: OfflineTankSummary
}

const simulateTank = (tank: GameTank): SimulatedTank => {
  const projectedEconomy = calculateTankEconomy(tank)

  return {
    tank: {
      ...tank,
      progression: {
        ...tank.progression,
        comfort: projectedEconomy.comfort,
        incomePerMinute: projectedEconomy.incomePerMinute
      }
    },
    summary: {
      tankId: tank.id
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
      incomePerMinute: economy.incomePerMinute
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

  const tankResults = options.save.tanks.map((tank) => simulateTank(tank))

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
      tanks: tankResults.map((result) => result.tank)
    },
    offlineResult: {
      simulatedSeconds,
      tankSummaries: tankResults.map((result) => result.summary)
    }
  }
}
