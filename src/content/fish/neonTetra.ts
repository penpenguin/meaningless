import { createFishContent } from '../types'

export const neonTetra = createFishContent({
  speciesId: 'neon-tetra',
  displayName: 'ネオンテトラ',
  description: '小型で群泳する定番の熱帯魚',
  visualRef: 'sprites/neon-tetra.png',
  size: 0.6,
  colorVariants: ['#6ac7d6', '#2fd2ff'],
  unlock: {
    type: 'starter'
  },
  render: {
    archetype: 'Neon'
  },
  gameplay: {
    unlockCost: 0,
    purchaseCostPerFish: 1,
    baseIncomePerMinute: 0.22,
    preferredLane: 'top',
    pollutionPerFish: 0.42
  }
})
