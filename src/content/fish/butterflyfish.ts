import { createFishContent } from '../types'

export const butterflyfish = createFishContent({
  speciesId: 'butterflyfish',
  displayName: 'チョウチョウウオ',
  description: 'ゆったり泳ぐ縞模様の海水魚',
  visualRef: 'sprites/butterflyfish.png',
  size: 1.1,
  colorVariants: ['#ffd766', '#1f2b59'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 4,
    requiredViewSeconds: 1200
  },
  render: {
    archetype: 'Angelfish'
  },
  gameplay: {
    unlockCost: 40,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.48,
    preferredLane: 'middle',
    pollutionPerFish: 0.7
  }
})
