import * as THREE from 'three'

export const CRAWLER_SUBSTRATE_Y_RATIO = 0.035
export const CRAWLER_SUBSTRATE_MIN_Y_RATIO = 0.02
export const CRAWLER_SUBSTRATE_MAX_Y_RATIO = 0.05

export const resolveCrawlerSubstrateY = (bounds: THREE.Box3, boundsSize: THREE.Vector3): number => (
  bounds.min.y + boundsSize.y * CRAWLER_SUBSTRATE_Y_RATIO
)

export const clampCrawlerSubstrateY = (
  value: number,
  bounds: THREE.Box3,
  boundsSize: THREE.Vector3
): number => THREE.MathUtils.clamp(
  value,
  bounds.min.y + boundsSize.y * CRAWLER_SUBSTRATE_MIN_Y_RATIO,
  bounds.min.y + boundsSize.y * CRAWLER_SUBSTRATE_MAX_Y_RATIO
)
