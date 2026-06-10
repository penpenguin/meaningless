import { createFishContent } from '../types'

export const yamatoShrimp = createFishContent({
  speciesId: 'yamato-shrimp',
  displayName: 'ヤマトヌマエビ',
  description: '底床や流木の近くを歩き回る透明感のある淡水エビ',
  visualRef: 'sprites/yamato-shrimp.png',
  size: 0.46,
  colorVariants: ['#c8b08b', '#6f6148', '#e0d6c2'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 6,
    requiredViewSeconds: 2700
  },
  render: {
    archetype: 'YamatoShrimp'
  },
  gameplay: {
    unlockCost: 58,
    purchaseCostPerFish: 4,
    preferredLane: 'bottom',
  }
})
