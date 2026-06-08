import { createFishContent } from '../types'

export const rasboraHeteromorpha = createFishContent({
  speciesId: 'rasbora-heteromorpha',
  displayName: 'ラスボラヘテロモルファ',
  description: '黒い三角模様と橙色の体色が特徴の穏やかな群泳魚',
  visualRef: 'sprites/rasbora-heteromorpha.png',
  size: 0.5,
  colorVariants: ['#df8d42', '#3d2d24', '#d9c3a1'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 8,
    requiredViewSeconds: 3000
  },
  render: {
    archetype: 'RasboraHeteromorpha'
  },
  gameplay: {
    unlockCost: 62,
    purchaseCostPerFish: 4,
    baseIncomePerMinute: 0.52,
    preferredLane: 'middle',
  }
})
