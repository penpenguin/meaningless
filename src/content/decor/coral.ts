import { createDecorContent } from '../types'

export const coral = createDecorContent({
  decorId: 'coral',
  displayName: 'Coral Shelf',
  gameplay: {
    unlockCost: 16,
    comfortBonus: 8,
    waterQualityBonus: 0.5,
    laneAffinity: 'middle',
    adjacencyBonus: 3,
    hideoutScore: 2
  }
})
