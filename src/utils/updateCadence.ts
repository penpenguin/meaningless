export type CadencedQuality = 'simple' | 'standard'

export type QualityCadenceOptions = {
  frame: number
  quality: CadencedQuality
}

export const shouldRunQualityCadencedUpdate = ({
  frame,
  quality
}: QualityCadenceOptions): boolean => {
  const interval = quality === 'simple' ? 2 : 1
  return frame % interval === 0
}
