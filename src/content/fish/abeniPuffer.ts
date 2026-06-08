import { createFishContent } from '../types'

export const abeniPuffer = createFishContent({
  speciesId: 'abeni-puffer',
  displayName: 'アベニーパファー',
  description: '小さな丸い体とゆったりした動きが特徴の淡水フグ',
  visualRef: 'sprites/abeni-puffer.png',
  size: 0.62,
  colorVariants: ['#d7be74', '#6f744d', '#2f3426'],
  unlock: {
    type: 'costAndWatchTime',
    costPearls: 7,
    requiredViewSeconds: 2400
  },
  render: {
    archetype: 'AbeniPuffer'
  },
  gameplay: {
    unlockCost: 56,
    purchaseCostPerFish: 6,
    baseIncomePerMinute: 0.62,
    preferredLane: 'middle',
  }
})
