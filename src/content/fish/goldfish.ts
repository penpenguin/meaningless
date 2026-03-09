import { createFishContent } from '../types'

export const goldfish = createFishContent({
  speciesId: 'goldfish',
  displayName: 'ゴールドフィッシュ',
  description: '丸みのある体型で観賞向けの人気種',
  visualRef: 'sprites/goldfish.png',
  size: 1,
  colorVariants: ['#ffc857', '#ff8c42'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 5,
    requiredViewSeconds: 1800
  },
  render: {
    archetype: 'Goldfish'
  },
  gameplay: {
    unlockCost: 48,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.55,
    preferredLane: 'bottom',
    pollutionPerFish: 0.8
  }
})
