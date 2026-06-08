import { createDecorContent } from '../types'

export const coral = createDecorContent({
  decorId: 'coral',
  displayName: 'Driftwood Branch',
  gameplay: {
    unlockCost: 16,
    comfortBonus: 8,
    laneAffinity: 'middle',
    adjacencyBonus: 3,
    hideoutScore: 2
  },
  visual: {
    assetFamily: 'driftwood',
    shortLabel: 'DW'
  }
})
