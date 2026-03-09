import { createFishContent } from '../types'

export const cardinalTetra = createFishContent({
  speciesId: 'cardinal-tetra',
  displayName: 'カージナルテトラ',
  description: '鮮やかな青赤ラインを持つ群泳魚',
  visualRef: 'sprites/cardinal-tetra.png',
  size: 0.65,
  colorVariants: ['#2fd2ff', '#ff4b6e'],
  unlock: {
    type: 'cost',
    costPearls: 2
  },
  render: {
    archetype: 'Neon'
  },
  gameplay: {
    unlockCost: 22,
    purchaseCostPerFish: 2,
    baseIncomePerMinute: 0.28,
    preferredLane: 'middle',
    pollutionPerFish: 0.48
  }
})
