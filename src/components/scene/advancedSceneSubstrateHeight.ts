import * as THREE from 'three'
import type { AquascapeLayoutStyle } from '../../types/aquarium'
import { resolveSubstrateHardscapeAnchors, resolveSubstratePlantAnchors } from '../aquascape/Aquascaping'

const calculateGaussianFalloff = (
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number
): number => {
  const safeRadiusX = Math.max(radiusX, 0.001)
  const safeRadiusZ = Math.max(radiusZ, 0.001)
  const dx = (x - centerX) / safeRadiusX
  const dz = (z - centerZ) / safeRadiusZ
  return Math.exp(-((dx * dx) + (dz * dz)))
}

const calculateEllipticalDistance = (
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number
): number => {
  const safeRadiusX = Math.max(radiusX, 0.001)
  const safeRadiusZ = Math.max(radiusZ, 0.001)
  const dx = (x - centerX) / safeRadiusX
  const dz = (z - centerZ) / safeRadiusZ
  return Math.sqrt((dx * dx) + (dz * dz))
}

export const sampleSubstrateHeight = (
  x: number,
  z: number,
  tankWidth: number,
  tankDepth: number,
  layoutStyle: AquascapeLayoutStyle = 'planted',
  layoutSeed?: number
): number => {
  const halfWidth = tankWidth / 2
  const halfDepth = tankDepth / 2
  const normalizedX = halfWidth === 0 ? 0 : x / halfWidth
  const normalizedZ = halfDepth === 0 ? 0 : z / halfDepth
  const widthBlend = 1 - THREE.MathUtils.clamp(Math.abs(normalizedX), 0, 1)
  const depthBlend = 1 - THREE.MathUtils.clamp(Math.abs(normalizedZ), 0, 1)
  const coreBlend = THREE.MathUtils.smoothstep(Math.min(widthBlend, depthBlend), 0, 1)
  const backness = THREE.MathUtils.clamp((halfDepth - z) / tankDepth, 0, 1)
  const frontness = 1 - backness
  const leftness = THREE.MathUtils.clamp((-normalizedX + 1) / 2, 0, 1)
  const rightness = 1 - leftness
  const hardscapeAnchors = resolveSubstrateHardscapeAnchors(layoutStyle)
  const plantAnchors = resolveSubstratePlantAnchors(layoutStyle, layoutSeed)

  if (layoutStyle === 'nature-showcase') {
    const leftMound =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.31,
        -tankDepth * 0.08,
        tankWidth * 0.24,
        tankDepth * 0.28
      ) * 0.294) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.22,
        -tankDepth * 0.24,
        tankWidth * 0.2,
        tankDepth * 0.2
      ) * 0.172) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.18,
        tankDepth * 0.04,
        tankWidth * 0.16,
        tankDepth * 0.18
      ) * 0.11) +
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.24,
        tankDepth * 0.16,
        tankWidth * 0.16,
        tankDepth * 0.14
      ) * 0.088) +
      (backness * leftness * widthBlend * 0.056)

    const shoulderLift =
      calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.12,
        -tankDepth * 0.14,
        tankWidth * 0.18,
        tankDepth * 0.2
      ) * 0.108

    const sandBeach =
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.37,
        tankDepth * 0.38,
        tankWidth * 0.16,
        tankDepth * 0.12
      ) * -0.194) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.3,
        tankDepth * 0.28,
        tankWidth * 0.11,
        tankDepth * 0.08
      ) * -0.032)

    const curvedPath =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.01,
        tankDepth * 0.12,
        tankWidth * 0.16,
        tankDepth * 0.1
      ) * -0.08) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.16,
        tankDepth * 0.22,
        tankWidth * 0.1,
        tankDepth * 0.09
      ) * -0.042) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.28,
        tankDepth * 0.3,
        tankWidth * 0.08,
        tankDepth * 0.08
      ) * -0.026)

    const transitionLift =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.12,
        tankDepth * 0.16,
        tankWidth * 0.16,
        tankDepth * 0.12
      ) * 0.046) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.02,
        tankDepth * 0.2,
        tankWidth * 0.1,
        tankDepth * 0.08
      ) * 0.004)

    const shorelineBreakup =
      (calculateGaussianFalloff(
        x,
        z,
        -tankWidth * 0.1,
        tankDepth * 0.44,
        tankWidth * 0.2,
        tankDepth * 0.08
      ) * -0.046) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.24,
        tankDepth * 0.46,
        tankWidth * 0.14,
        tankDepth * 0.08
      ) * -0.034) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.02,
        tankDepth * 0.14,
        tankWidth * 0.06,
        tankDepth * 0.06
      ) * -0.054) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.12,
        tankDepth * 0.18,
        tankWidth * 0.07,
        tankDepth * 0.06
      ) * -0.052) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.12,
        tankDepth * 0.18,
        tankWidth * 0.045,
        tankDepth * 0.045
      ) * -0.112) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.15,
        tankDepth * 0.19,
        tankWidth * 0.05,
        tankDepth * 0.05
      ) * -0.108) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.08,
        tankDepth * 0.18,
        tankWidth * 0.08,
        tankDepth * 0.06
      ) * 0.05) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.03,
        tankDepth * 0.18,
        tankWidth * 0.05,
        tankDepth * 0.05
      ) * 0.074) +
      (calculateGaussianFalloff(
        x,
        z,
        tankWidth * 0.08,
        tankDepth * 0.18,
        tankWidth * 0.042,
        tankDepth * 0.048
      ) * 0.07) +
      (Math.sin((x * 0.62) + 0.3) * frontness * 0.016)

    const macroNoise = (
      (Math.sin((x * 0.42) + (z * 0.14) + 0.4) * 0.038) +
      (Math.cos((x * 0.18) - (z * 0.52) + 0.2) * 0.024)
    ) * (0.34 + (coreBlend * 0.46))

    const microNoise = (
      (Math.sin((x * 1.64) - (z * 0.92)) * 0.01) +
      (Math.cos((x * 2.1) + (z * 2.42) + 0.28) * 0.008)
    ) * (0.16 + (coreBlend * 0.6))

    let hardscapeRelief = 0
    hardscapeAnchors.forEach((anchor) => {
      const anchorX = anchor.x * tankWidth
      const anchorZ = anchor.z * tankDepth
      const radiusX = anchor.radiusX * tankWidth
      const radiusZ = anchor.radiusZ * tankDepth
      const distance = calculateEllipticalDistance(x, z, anchorX, anchorZ, radiusX, radiusZ)
      const sink = -anchor.sinkDepth * Math.exp(-((distance * distance) * 1.7))
      const settlingRim = anchor.rimHeight * 1.2 * Math.exp(-(Math.pow(distance - 1.05, 2) * 4))
      const biasedRim = anchor.rimHeight * 0.9 * calculateGaussianFalloff(
        x,
        z,
        anchorX + (anchor.rimBiasX * tankWidth),
        anchorZ + (anchor.rimBiasZ * tankDepth),
        radiusX * 1.2,
        radiusZ * 1.15
      )

      hardscapeRelief += sink + settlingRim + biasedRim
    })

    let plantRelief = 0
    plantAnchors.forEach((anchor) => {
      const anchorX = anchor.x * tankWidth
      const anchorZ = anchor.z * tankDepth
      const radiusX = anchor.radiusX * tankWidth
      const radiusZ = anchor.radiusZ * tankDepth
      const layerWeight = anchor.layer === 'background' ? 0.58 : anchor.layer === 'midground' ? 0.78 : 0.62
      const mound = anchor.moundHeight * layerWeight * calculateGaussianFalloff(
        x,
        z,
        anchorX,
        anchorZ,
        radiusX,
        radiusZ
      )
      const scoop = -anchor.scoopDepth * layerWeight * calculateGaussianFalloff(
        x,
        z,
        anchorX + (anchor.scoopBiasX * tankWidth),
        anchorZ + (anchor.scoopBiasZ * tankDepth),
        radiusX * 0.92,
        radiusZ * 0.9
      )

      plantRelief += mound + scoop
    })

    const edgeSettle =
      ((1 - widthBlend) * -0.018) +
      (THREE.MathUtils.clamp(frontness - 0.8, 0, 0.2) * -0.026) +
      (rightness * frontness * -0.016) +
      (leftness * frontness * 0.016)

    return THREE.MathUtils.clamp(
      leftMound +
        shoulderLift +
        sandBeach +
        curvedPath +
        transitionLift +
        shorelineBreakup +
        macroNoise +
        microNoise +
        hardscapeRelief +
        plantRelief +
        edgeSettle,
      -0.26,
      0.52
    )
  }

  const rearBerm =
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.16,
      -tankDepth * 0.22,
      tankWidth * 0.34,
      tankDepth * 0.24
    ) * 0.16) +
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.18,
      -tankDepth * 0.08,
      tankWidth * 0.24,
      tankDepth * 0.3
    ) * 0.08) +
    (backness * rightness * widthBlend * 0.05)

  const frontScoop =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.08,
      tankDepth * 0.34,
      tankWidth * 0.28,
      tankDepth * 0.16
    ) * -0.14) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.25,
      tankDepth * 0.4,
      tankWidth * 0.16,
      tankDepth * 0.1
    ) * -0.055)

  const frontSilhouette =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.16,
      tankDepth * 0.46,
      tankWidth * 0.22,
      tankDepth * 0.08
    ) * -0.08) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.22,
      tankDepth * 0.48,
      tankWidth * 0.15,
      tankDepth * 0.07
    ) * 0.045) +
    (Math.sin((x * 0.72) + 0.4) * frontness * 0.018)

  const sideDrift =
    (calculateGaussianFalloff(
      x,
      z,
      -tankWidth * 0.36,
      tankDepth * 0.08,
      tankWidth * 0.14,
      tankDepth * 0.28
    ) * 0.075) +
    (calculateGaussianFalloff(
      x,
      z,
      tankWidth * 0.4,
      tankDepth * 0.14,
      tankWidth * 0.12,
      tankDepth * 0.24
    ) * -0.03)

  const macroNoise = (
    (Math.sin((x * 0.46) + (z * 0.18) + 0.9) * 0.052) +
    (Math.sin((x * 0.18) - (z * 0.63) - 0.6) * 0.038) +
    (Math.cos((x + (z * 1.3)) * 0.78 + 0.2) * 0.03)
  ) * (0.42 + (coreBlend * 0.58))

  const microNoise = (
    (Math.sin((x * 1.85) - (z * 1.1)) * 0.012) +
    (Math.cos((x * 2.35) + (z * 2.8) + 0.25) * 0.01)
  ) * (0.2 + (coreBlend * 0.8))

  let hardscapeRelief = 0
  hardscapeAnchors.forEach((anchor) => {
    const anchorX = anchor.x * tankWidth
    const anchorZ = anchor.z * tankDepth
    const radiusX = anchor.radiusX * tankWidth
    const radiusZ = anchor.radiusZ * tankDepth
    const distance = calculateEllipticalDistance(x, z, anchorX, anchorZ, radiusX, radiusZ)
    const sink = -anchor.sinkDepth * Math.exp(-((distance * distance) * 1.7))
    const settlingRim = anchor.rimHeight * 1.15 * Math.exp(-(Math.pow(distance - 1.05, 2) * 4.2))
    const biasedRim = anchor.rimHeight * 0.82 * calculateGaussianFalloff(
      x,
      z,
      anchorX + (anchor.rimBiasX * tankWidth),
      anchorZ + (anchor.rimBiasZ * tankDepth),
      radiusX * 1.25,
      radiusZ * 1.15
    )

    hardscapeRelief += sink + settlingRim + biasedRim
  })

  let plantRelief = 0
  plantAnchors.forEach((anchor) => {
    const anchorX = anchor.x * tankWidth
    const anchorZ = anchor.z * tankDepth
    const radiusX = anchor.radiusX * tankWidth
    const radiusZ = anchor.radiusZ * tankDepth
    const layerWeight = anchor.layer === 'background' ? 0.72 : 1
    const mound = anchor.moundHeight * layerWeight * calculateGaussianFalloff(
      x,
      z,
      anchorX,
      anchorZ,
      radiusX,
      radiusZ
    )
    const scoop = -anchor.scoopDepth * layerWeight * calculateGaussianFalloff(
      x,
      z,
      anchorX + (anchor.scoopBiasX * tankWidth),
      anchorZ + (anchor.scoopBiasZ * tankDepth),
      radiusX * 0.92,
      radiusZ * 0.9
    )

    plantRelief += mound + scoop
  })

  const edgeSettle =
    ((1 - widthBlend) * -0.014) +
    (THREE.MathUtils.clamp(frontness - 0.82, 0, 0.18) * -0.02)

  return THREE.MathUtils.clamp(
    rearBerm +
      frontScoop +
      frontSilhouette +
      sideDrift +
      macroNoise +
      microNoise +
      hardscapeRelief +
      plantRelief +
      edgeSettle,
    -0.22,
    0.46
  )
}
