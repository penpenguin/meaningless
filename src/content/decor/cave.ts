import { createDecorContent } from '../types'

export const cave = createDecorContent({
  decorId: 'cave',
  displayName: 'Stone Cave',
  gameplay: {
    unlockCost: 24,
    comfortBonus: 10,
    waterQualityBonus: 0.2,
    laneAffinity: 'bottom',
    adjacencyBonus: 4
  }
})
