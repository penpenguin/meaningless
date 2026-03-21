import { createDecorContent } from '../types'

export const plant = createDecorContent({
  decorId: 'plant',
  displayName: 'Plant Cluster',
  gameplay: {
    unlockCost: 0,
    comfortBonus: 6,
    waterQualityBonus: 0.9,
    laneAffinity: 'top',
    adjacencyBonus: 2,
    hideoutScore: 1
  },
  visual: {
    assetFamily: 'plant',
    shortLabel: 'PL'
  }
})
