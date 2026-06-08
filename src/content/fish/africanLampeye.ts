import { createFishContent } from '../types'

export const africanLampeye = createFishContent({
  speciesId: 'african-lampeye',
  displayName: 'アフリカンランプアイ',
  description: '青白く光る目が特徴の小型で穏やかな群泳魚',
  visualRef: 'sprites/african-lampeye.png',
  size: 0.44,
  colorVariants: ['#d9e8d7', '#8fb7aa', '#d7eaff'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 7,
    requiredViewSeconds: 2700
  },
  render: {
    archetype: 'AfricanLampeye'
  },
  gameplay: {
    unlockCost: 58,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.5,
    preferredLane: 'top',
  }
})
