import { createFishContent } from '../types'

export const angelfish = createFishContent({
  speciesId: 'angelfish',
  displayName: 'エンゼルフィッシュ',
  description: '縦長の優雅なシルエット',
  visualRef: 'sprites/angelfish.png',
  size: 1.2,
  colorVariants: ['#9dd6ff', '#4b72d9'],
  unlock: {
    type: 'watchTime',
    requiredViewSeconds: 900
  },
  render: {
    archetype: 'Angelfish'
  },
  gameplay: {
    unlockCost: 32,
    purchaseCostPerFish: 3,
    baseIncomePerMinute: 0.38,
    preferredLane: 'top',
    pollutionPerFish: 0.65
  }
})
