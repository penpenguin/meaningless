export type ProfileState = {
  schemaVersion: number
  currency: {
    pearls: number
  }
  unlockedSpeciesIds: string[]
  stats: {
    totalViewSeconds: number
    totalEarnedPearls: number
  }
  pendingViewSeconds: number
}
