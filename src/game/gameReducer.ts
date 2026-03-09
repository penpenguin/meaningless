import { getDecorContent, getFishContent } from '../content/registry'
import { getDecorAt } from './catalog'
import { simulateGameSave, refreshTankProgression } from './simulation'
import type { GameAction, GameAppState, GameSave, GameTank } from './types'

const withActiveTank = (game: GameSave, updater: (tank: GameTank) => GameTank): GameSave => {
  const tanks = game.tanks.map((tank) => {
    if (tank.id !== game.activeTankId) return tank
    return updater(tank)
  })
  return {
    ...game,
    tanks
  }
}

const withProfileCoins = (game: GameSave, coins: number): GameSave => {
  return {
    ...game,
    profile: {
      ...game.profile,
      currency: {
        ...game.profile.currency,
        coins
      }
    }
  }
}

const refreshGame = (game: GameSave): GameSave => {
  return {
    ...game,
    tanks: game.tanks.map(refreshTankProgression)
  }
}

export const gameReducer = (state: GameAppState, action: GameAction): GameAppState => {
  switch (action.type) {
    case 'UI/SET_MODE':
      return {
        ...state,
        ui: {
          ...state.ui,
          mode: action.payload.mode
        }
      }
    case 'UI/SELECT_DECOR':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedDecorId: action.payload.decorId
        }
      }
    case 'GAME/CLEAR_OFFLINE_RESULT':
      return {
        ...state,
        ui: {
          ...state.ui,
          lastOfflineResult: null
        }
      }
    case 'GAME/TICK': {
      const simulated = simulateGameSave({
        save: state.game,
        nowIso: action.payload.nowIso
      })
      return {
        ...state,
        game: simulated.save,
        ui: {
          ...state.ui,
          lastOfflineResult: state.ui.lastOfflineResult ?? simulated.offlineResult
        }
      }
    }
    case 'GAME/UNLOCK_FISH': {
      const fish = getFishContent(action.payload.speciesId)
      if (!fish) return state
      if (state.game.profile.unlockedFishIds.includes(fish.speciesId)) return state
      if (state.game.profile.currency.coins < fish.gameplay.unlockCost) return state

      return {
        ...state,
        game: {
          ...withProfileCoins(state.game, state.game.profile.currency.coins - fish.gameplay.unlockCost),
          profile: {
            ...state.game.profile,
            currency: {
              ...state.game.profile.currency,
              coins: state.game.profile.currency.coins - fish.gameplay.unlockCost
            },
            unlockedFishIds: [...state.game.profile.unlockedFishIds, fish.speciesId]
          }
        }
      }
    }
    case 'GAME/UNLOCK_DECOR': {
      const decor = getDecorContent(action.payload.decorId)
      if (!decor) return state
      if (state.game.profile.unlockedDecorIds.includes(decor.decorId)) return state
      if (state.game.profile.currency.coins < decor.gameplay.unlockCost) return state

      return {
        ...state,
        game: {
          ...withProfileCoins(state.game, state.game.profile.currency.coins - decor.gameplay.unlockCost),
          profile: {
            ...state.game.profile,
            currency: {
              ...state.game.profile.currency,
              coins: state.game.profile.currency.coins - decor.gameplay.unlockCost
            },
            unlockedDecorIds: [...state.game.profile.unlockedDecorIds, decor.decorId]
          }
        }
      }
    }
    case 'GAME/SET_FISH_COUNT': {
      const fish = getFishContent(action.payload.speciesId)
      if (!fish) return state
      if (!state.game.profile.unlockedFishIds.includes(fish.speciesId)) return state

      const normalizedCount = Math.max(0, Math.floor(action.payload.count))
      const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
      if (!activeTank) return state
      const current = activeTank.fishSchools.find((school) => school.speciesId === fish.speciesId)
      const currentCount = current?.count ?? 0
      const delta = normalizedCount - currentCount
      const cost = delta > 0 ? delta * fish.gameplay.purchaseCostPerFish : 0
      if (cost > state.game.profile.currency.coins) return state

      const nextGame = withActiveTank(withProfileCoins(state.game, state.game.profile.currency.coins - cost), (tank) => {
        const remaining = tank.fishSchools.filter((school) => school.speciesId !== fish.speciesId)
        if (normalizedCount <= 0) {
          return refreshTankProgression({
            ...tank,
            fishSchools: remaining
          })
        }
        return refreshTankProgression({
          ...tank,
          fishSchools: [
            ...remaining,
            {
              id: current?.id ?? `school-${fish.speciesId}`,
              speciesId: fish.speciesId,
              count: normalizedCount,
              lane: current?.lane ?? fish.gameplay.preferredLane
            }
          ]
        })
      })

      return {
        ...state,
        game: refreshGame(nextGame)
      }
    }
    case 'GAME/SET_FISH_LANE': {
      const nextGame = withActiveTank(state.game, (tank) => refreshTankProgression({
        ...tank,
        fishSchools: tank.fishSchools.map((school) =>
          school.speciesId === action.payload.speciesId
            ? { ...school, lane: action.payload.lane }
            : school
        )
      }))
      return {
        ...state,
        game: refreshGame(nextGame)
      }
    }
    case 'GAME/PLACE_DECOR': {
      if (!state.game.profile.unlockedDecorIds.includes(action.payload.decorId)) return state
      const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
      if (!activeTank) return state
      if (
        action.payload.x < 0 ||
        action.payload.y < 0 ||
        action.payload.x >= activeTank.layout.columns ||
        action.payload.y >= activeTank.layout.rows
      ) {
        return state
      }

      const nextGame = withActiveTank(state.game, (tank) => {
        const existing = getDecorAt(tank, action.payload.x, action.payload.y)
        const decor = existing
          ? tank.decor.map((item) =>
              item.id === existing.id
                ? { ...item, decorId: action.payload.decorId }
                : item
            )
          : [
              ...tank.decor,
              {
                id: `decor-${action.payload.x}-${action.payload.y}`,
                decorId: action.payload.decorId,
                x: action.payload.x,
                y: action.payload.y
              }
            ]

        return refreshTankProgression({
          ...tank,
          decor
        })
      })

      return {
        ...state,
        game: refreshGame(nextGame)
      }
    }
    case 'GAME/REMOVE_DECOR': {
      const nextGame = withActiveTank(state.game, (tank) => refreshTankProgression({
        ...tank,
        decor: tank.decor.filter((item) => item.x !== action.payload.x || item.y !== action.payload.y)
      }))
      return {
        ...state,
        game: refreshGame(nextGame)
      }
    }
    case 'GAME/CLEAN_TANK': {
      const activeTank = state.game.tanks.find((tank) => tank.id === state.game.activeTankId)
      if (!activeTank) return state
      const totalFish = activeTank.fishSchools.reduce((total, school) => total + school.count, 0)
      const maintenanceCost = Math.max(4, Math.ceil(totalFish / 4))
      if (state.game.profile.currency.coins < maintenanceCost) return state

      const nextGame = withActiveTank(withProfileCoins(state.game, state.game.profile.currency.coins - maintenanceCost), (tank) => refreshTankProgression({
        ...tank,
        progression: {
          ...tank.progression,
          waterQuality: 100
        }
      }))

      return {
        ...state,
        game: {
          ...refreshGame(nextGame),
          profile: {
            ...nextGame.profile,
            stats: {
              ...nextGame.profile.stats,
              totalMaintenanceActions: nextGame.profile.stats.totalMaintenanceActions + 1
            }
          }
        }
      }
    }
    case 'SETTINGS/SET_SOUND':
      return {
        ...state,
        game: {
          ...state.game,
          profile: {
            ...state.game.profile,
            preferences: {
              ...state.game.profile.preferences,
              soundEnabled: action.payload.enabled
            }
          }
        }
      }
    case 'SETTINGS/SET_MOTION':
      return {
        ...state,
        game: {
          ...state.game,
          profile: {
            ...state.game.profile,
            preferences: {
              ...state.game.profile.preferences,
              motionEnabled: action.payload.enabled
            }
          }
        }
      }
    case 'SETTINGS/SET_QUALITY':
      return {
        ...state,
        game: {
          ...state.game,
          profile: {
            ...state.game.profile,
            preferences: {
              ...state.game.profile.preferences,
              quality: action.payload.quality
            }
          }
        }
      }
    case 'SETTINGS/SET_HUD_VISIBILITY':
      return {
        ...state,
        game: {
          ...state.game,
          profile: {
            ...state.game.profile,
            preferences: {
              ...state.game.profile.preferences,
              hudVisible: action.payload.visible
            }
          }
        }
      }
    default:
      return state
  }
}
