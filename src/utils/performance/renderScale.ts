export type AdaptiveRenderScaleInput = {
  currentScale: number
  averageFrameTimeMs: number
  stressedSampleCount: number
  stableSampleCount: number
}

const renderScaleTiers = [0.7, 0.85, 1] as const
const stressedFrameTimeMs = 28
const stableFrameTimeMs = 20
const requiredStressedSamples = 3
const requiredStableSamples = 6

const resolveTierIndex = (scale: number): number => {
  const index = renderScaleTiers.findIndex((tier) => scale <= tier + 0.001)
  return index === -1 ? renderScaleTiers.length - 1 : index
}

export const resolveAdaptiveRenderScale = ({
  currentScale,
  averageFrameTimeMs,
  stressedSampleCount,
  stableSampleCount
}: AdaptiveRenderScaleInput): number => {
  const tierIndex = resolveTierIndex(currentScale)

  if (
    averageFrameTimeMs >= stressedFrameTimeMs &&
    stressedSampleCount >= requiredStressedSamples
  ) {
    return renderScaleTiers[Math.max(0, tierIndex - 1)]
  }

  if (
    averageFrameTimeMs <= stableFrameTimeMs &&
    stableSampleCount >= requiredStableSamples
  ) {
    return renderScaleTiers[Math.min(renderScaleTiers.length - 1, tierIndex + 1)]
  }

  return renderScaleTiers[tierIndex]
}
