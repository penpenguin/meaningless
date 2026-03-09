import { createFishContent } from '../types'

export const clownfish = createFishContent({
  speciesId: 'clownfish',
  displayName: 'クマノミ',
  description: 'オレンジと白の縞模様が特徴',
  visualRef: 'sprites/clownfish.png',
  size: 0.9,
  colorVariants: ['#ff8a3d', '#ffd5b1'],
  unlock: {
    type: 'cost',
    costPearls: 3
  },
  render: {
    archetype: 'Tropical'
  },
  gameplay: {
    unlockCost: 18,
    purchaseCostPerFish: 2,
    baseIncomePerMinute: 0.3,
    preferredLane: 'middle',
    pollutionPerFish: 0.5
  }
})
