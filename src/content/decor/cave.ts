import { createDecorContent } from '../types'

export const cave = createDecorContent({
  decorId: 'cave',
  displayName: 'River Rock',
  gameplay: {
    unlockCost: 24,
    comfortBonus: 10,
    waterQualityBonus: 0.2,
    laneAffinity: 'bottom',
    adjacencyBonus: 4,
    hideoutScore: 4
  },
  visual: {
    assetFamily: 'rock',
    shortLabel: 'RK'
  }
})
