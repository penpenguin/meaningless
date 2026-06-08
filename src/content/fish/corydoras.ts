import { createFishContent } from '../types'

export const corydoras = createFishContent({
  speciesId: 'corydoras',
  displayName: 'コリドラス',
  description: '底床付近をゆっくり泳ぎ回る穏やかな小型ナマズ',
  visualRef: 'sprites/corydoras.png',
  size: 0.68,
  colorVariants: ['#d8c9a1', '#8a806c', '#3f3a33'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 6,
    requiredViewSeconds: 2100
  },
  render: {
    archetype: 'Corydoras'
  },
  gameplay: {
    unlockCost: 52,
    purchaseCostPerFish: 5,
    baseIncomePerMinute: 0.58,
    preferredLane: 'bottom',
  }
})
