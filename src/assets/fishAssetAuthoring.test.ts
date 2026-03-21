import { describe, expect, it } from 'vitest'
import {
  atlasHeight,
  atlasRects,
  atlasWidth,
  createAtlas,
  fishAssetConfigs,
  sampleAtlas
} from '../../scripts/generate-fish-assets.mjs'

const sumChannels = (channels: number[]): number => channels.reduce((sum, channel) => sum + channel, 0)
const colorDistance = (left: number[], right: number[]): number => {
  return left.reduce((sum, channel, index) => sum + Math.abs(channel - right[index]), 0)
}
const sampleNormalSlope = (
  atlas: ReturnType<typeof createAtlas>,
  rect: { u0: number; v0: number; u1: number; v1: number },
  localU: number,
  localV: number
): number => {
  const u = rect.u0 + (Math.max(0, Math.min(1, localU)) * (rect.u1 - rect.u0))
  const v = rect.v0 + (Math.max(0, Math.min(1, localV)) * (rect.v1 - rect.v0))
  const x = Math.max(0, Math.min(atlasWidth - 1, Math.round(u * (atlasWidth - 1))))
  const y = Math.max(0, Math.min(atlasHeight - 1, Math.round((1 - v) * (atlasHeight - 1))))
  const index = ((y * atlasWidth) + x) * 4
  const nx = atlas.normal[index] / 255
  const ny = atlas.normal[index + 1] / 255

  return Math.abs(nx - 0.5) + Math.abs(ny - 0.5)
}

describe('fish asset authoring', () => {
  it('gives goldfish distinct facial detail, fin transparency, and roughness separation', () => {
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')
    expect(goldfish).toBeDefined()

    const atlas = createAtlas(goldfish!)
    const cheek = sampleAtlas(atlas, atlasRects.body, 0.8, 0.58)
    const eye = sampleAtlas(atlas, atlasRects.body, 0.9, 0.56)
    const body = sampleAtlas(atlas, atlasRects.body, 0.56, 0.52)
    const tail = sampleAtlas(atlas, atlasRects.tail, 0.74, 0.52)

    expect(eye.baseColor[0]).toBeLessThan(cheek.baseColor[0] - 0.12)
    expect(tail.alpha).toBeLessThan(body.alpha - 0.2)
    expect(tail.roughness).toBeGreaterThan(body.roughness + 0.12)
  }, 15000)

  it('gives goldfish a darker back, lighter belly, and thinner fin edges instead of a flat orange slab', () => {
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')
    expect(goldfish).toBeDefined()

    const atlas = createAtlas(goldfish!)
    const dorsal = sampleAtlas(atlas, atlasRects.body, 0.55, 0.8)
    const belly = sampleAtlas(atlas, atlasRects.body, 0.55, 0.2)
    const tailCenter = sampleAtlas(atlas, atlasRects.tail, 0.5, 0.5)
    const tailEdge = sampleAtlas(atlas, atlasRects.tail, 0.05, 0.5)

    const dorsalLuma = dorsal.baseColor.reduce((sum, channel) => sum + channel, 0)
    const bellyLuma = belly.baseColor.reduce((sum, channel) => sum + channel, 0)

    expect(dorsalLuma).toBeLessThan(bellyLuma - 0.12)
    expect(tailEdge.alpha).toBeLessThan(tailCenter.alpha - 0.36)
  }, 15000)

  it('gives goldfish readable mouth landmarks and visible fin-ray breakup instead of a single orange mass', () => {
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')
    expect(goldfish).toBeDefined()

    const atlas = createAtlas(goldfish!)
    const cheek = sampleAtlas(atlas, atlasRects.body, 0.8, 0.58)
    const mouth = sampleAtlas(atlas, atlasRects.body, 0.965, 0.49)
    const head = sampleAtlas(atlas, atlasRects.body, 0.88, 0.58)
    const body = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const peduncle = sampleAtlas(atlas, atlasRects.body, 0.14, 0.52)
    const tailRay = sampleAtlas(atlas, atlasRects.tail, 0.38, 0.55)
    const tailMembrane = sampleAtlas(atlas, atlasRects.tail, 0.47, 0.55)

    const headDistance = head.baseColor.reduce((sum, channel, index) => {
      return sum + Math.abs(channel - body.baseColor[index])
    }, 0)
    const peduncleDistance = peduncle.baseColor.reduce((sum, channel, index) => {
      return sum + Math.abs(channel - body.baseColor[index])
    }, 0)

    expect(Math.abs(mouth.baseColor[1] - cheek.baseColor[1])).toBeGreaterThan(0.06)
    expect(headDistance).toBeGreaterThan(0.18)
    expect(peduncleDistance).toBeGreaterThan(0.12)
    expect(tailRay.alpha).toBeGreaterThan(tailMembrane.alpha + 0.08)
  }, 15000)

  it('keeps butterflyfish non-metallic while separating it clearly from goldfish by texture alone', () => {
    const butterflyfish = fishAssetConfigs.find((config) => config.id === 'butterflyfish')
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')

    expect(butterflyfish).toBeDefined()
    expect(goldfish).toBeDefined()

    const butterflyAtlas = createAtlas(butterflyfish!)
    const goldfishAtlas = createAtlas(goldfish!)

    const butterflyBody = sampleAtlas(butterflyAtlas, atlasRects.body, 0.52, 0.54)
    const butterflyEyeBand = sampleAtlas(butterflyAtlas, atlasRects.body, 0.85, 0.56)
    const butterflyFaceMask = sampleAtlas(butterflyAtlas, atlasRects.body, 0.9, 0.57)
    const butterflyFinEdge = sampleAtlas(butterflyAtlas, atlasRects.dorsal, 0.88, 0.64)
    const goldfishBody = sampleAtlas(goldfishAtlas, atlasRects.body, 0.52, 0.54)
    const eyeBandDistance = butterflyEyeBand.baseColor.reduce((total, channel, index) => {
      return total + Math.abs(channel - goldfishBody.baseColor[index])
    }, 0)
    const faceMaskDistance = butterflyFaceMask.baseColor.reduce((total, channel, index) => {
      return total + Math.abs(channel - goldfishBody.baseColor[index])
    }, 0)
    const signatureDistance = Math.max(eyeBandDistance, faceMaskDistance)

    expect(butterflyEyeBand.baseColor[0]).toBeLessThan(butterflyBody.baseColor[0] - 0.18)
    expect(butterflyBody.roughness).toBeGreaterThan(0.42)
    expect(butterflyBody.roughness).toBeLessThan(0.82)
    expect(signatureDistance).toBeGreaterThan(0.2)
    expect(Math.abs(butterflyFinEdge.baseColor[2] - butterflyBody.baseColor[2])).toBeGreaterThan(0.08)
  }, 15000)

  it('gives butterflyfish readable facial landmarks without relying on chrome-like contrast', () => {
    const butterflyfish = fishAssetConfigs.find((config) => config.id === 'butterflyfish')
    expect(butterflyfish).toBeDefined()

    const atlas = createAtlas(butterflyfish!)
    const body = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const faceMask = sampleAtlas(atlas, atlasRects.body, 0.9, 0.57)
    const mouth = sampleAtlas(atlas, atlasRects.body, 0.965, 0.49)
    const finCenter = sampleAtlas(atlas, atlasRects.dorsal, 0.5, 0.5)

    const bodyLuma = body.baseColor.reduce((sum, channel) => sum + channel, 0)
    const faceMaskLuma = faceMask.baseColor.reduce((sum, channel) => sum + channel, 0)
    const finPeak = Math.max(...finCenter.baseColor)

    expect(faceMaskLuma).toBeLessThan(bodyLuma - 0.14)
    expect(mouth.baseColor[1]).toBeLessThan(faceMask.baseColor[1] - 0.06)
    expect(finPeak).toBeLessThan(0.94)
  }, 15000)

  it('gives butterflyfish softer body contrast, stronger fin edging, and membrane separation without chrome-like plates', () => {
    const butterflyfish = fishAssetConfigs.find((config) => config.id === 'butterflyfish')
    expect(butterflyfish).toBeDefined()

    const atlas = createAtlas(butterflyfish!)
    const body = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const faceMask = sampleAtlas(atlas, atlasRects.body, 0.9, 0.57)
    const tailBase = sampleAtlas(atlas, atlasRects.body, 0.1, 0.54)
    const dorsalFinCenter = sampleAtlas(atlas, atlasRects.dorsal, 0.5, 0.5)
    const dorsalFinEdge = sampleAtlas(atlas, atlasRects.dorsal, 0.9, 0.5)
    const pectoralCenter = sampleAtlas(atlas, atlasRects.pectoral, 0.5, 0.5)
    const pectoralEdge = sampleAtlas(atlas, atlasRects.pectoral, 0.06, 0.5)

    const bodyLuma = body.baseColor.reduce((sum, channel) => sum + channel, 0)
    const faceMaskLuma = faceMask.baseColor.reduce((sum, channel) => sum + channel, 0)
    const tailBaseDistance = tailBase.baseColor.reduce((sum, channel, index) => {
      return sum + Math.abs(channel - body.baseColor[index])
    }, 0)

    expect(faceMaskLuma).toBeLessThan(bodyLuma - 0.22)
    expect(tailBaseDistance).toBeGreaterThan(0.24)
    expect(dorsalFinEdge.baseColor[0]).toBeLessThan(dorsalFinCenter.baseColor[0] - 0.14)
    expect(pectoralCenter.alpha).toBeGreaterThan(pectoralEdge.alpha + 0.58)
  }, 15000)

  it('locks goldfish body landmarks, fin membrane breakup, and normal detail for a wetter organic read', () => {
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')
    expect(goldfish).toBeDefined()

    const atlas = createAtlas(goldfish!)
    const dorsal = sampleAtlas(atlas, atlasRects.body, 0.52, 0.82)
    const belly = sampleAtlas(atlas, atlasRects.body, 0.52, 0.22)
    const cheek = sampleAtlas(atlas, atlasRects.body, 0.82, 0.58)
    const mouth = sampleAtlas(atlas, atlasRects.body, 0.965, 0.49)
    const gill = sampleAtlas(atlas, atlasRects.body, 0.77, 0.57)
    const eye = sampleAtlas(atlas, atlasRects.body, 0.89, 0.58)
    const midBody = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const peduncle = sampleAtlas(atlas, atlasRects.body, 0.14, 0.52)
    const tailCenter = sampleAtlas(atlas, atlasRects.tail, 0.5, 0.5)
    const tailEdge = sampleAtlas(atlas, atlasRects.tail, 0.05, 0.5)
    const tailRay = sampleAtlas(atlas, atlasRects.tail, 0.38, 0.55)
    const tailMembrane = sampleAtlas(atlas, atlasRects.tail, 0.47, 0.55)
    const bodyNormalSlope = sampleNormalSlope(atlas, atlasRects.body, 0.52, 0.54)
    const gillNormalSlope = sampleNormalSlope(atlas, atlasRects.body, 0.76, 0.56)
    const eyeNormalSlope = sampleNormalSlope(atlas, atlasRects.body, 0.88, 0.56)
    const tailRayNormalSlope = sampleNormalSlope(atlas, atlasRects.tail, 0.38, 0.55)
    const tailMembraneNormalSlope = sampleNormalSlope(atlas, atlasRects.tail, 0.47, 0.55)

    expect(sumChannels(dorsal.baseColor)).toBeLessThan(sumChannels(belly.baseColor) - 0.18)
    expect(colorDistance(mouth.baseColor, cheek.baseColor)).toBeGreaterThan(0.2)
    expect(colorDistance(gill.baseColor, cheek.baseColor)).toBeGreaterThan(0.14)
    expect(colorDistance(eye.baseColor, cheek.baseColor)).toBeGreaterThan(0.42)
    expect(colorDistance(peduncle.baseColor, midBody.baseColor)).toBeGreaterThan(0.18)
    expect(peduncle.roughness).toBeGreaterThan(midBody.roughness + 0.08)
    expect(tailCenter.alpha).toBeGreaterThan(tailEdge.alpha + 0.45)
    expect(tailRay.alpha).toBeGreaterThan(tailMembrane.alpha + 0.1)
    expect(tailRay.roughness).toBeGreaterThan(tailMembrane.roughness + 0.03)
    expect(midBody.roughness).toBeLessThan(tailCenter.roughness - 0.18)
    expect(gillNormalSlope).toBeGreaterThan(bodyNormalSlope + 0.015)
    expect(eyeNormalSlope).toBeGreaterThan(bodyNormalSlope + 0.02)
    expect(tailRayNormalSlope).toBeGreaterThan(tailMembraneNormalSlope + 0.015)
  }, 15000)

  it('locks butterflyfish to a warm cream body with readable facial banding and fin/material separation', () => {
    const butterflyfish = fishAssetConfigs.find((config) => config.id === 'butterflyfish')
    expect(butterflyfish).toBeDefined()

    const atlas = createAtlas(butterflyfish!)
    const body = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const dorsal = sampleAtlas(atlas, atlasRects.body, 0.52, 0.82)
    const faceBand = sampleAtlas(atlas, atlasRects.body, 0.85, 0.56)
    const mouth = sampleAtlas(atlas, atlasRects.body, 0.965, 0.49)
    const eye = sampleAtlas(atlas, atlasRects.body, 0.872, 0.57)
    const rearAccent = sampleAtlas(atlas, atlasRects.body, 0.1, 0.54)
    const tailCenter = sampleAtlas(atlas, atlasRects.tail, 0.5, 0.5)
    const tailEdge = sampleAtlas(atlas, atlasRects.tail, 0.05, 0.5)
    const tailRay = sampleAtlas(atlas, atlasRects.tail, 0.38, 0.55)
    const tailMembrane = sampleAtlas(atlas, atlasRects.tail, 0.47, 0.55)
    const bodyNormalSlope = sampleNormalSlope(atlas, atlasRects.body, 0.52, 0.54)
    const faceNormalSlope = sampleNormalSlope(atlas, atlasRects.body, 0.85, 0.56)
    const tailRayNormalSlope = sampleNormalSlope(atlas, atlasRects.tail, 0.38, 0.55)
    const tailMembraneNormalSlope = sampleNormalSlope(atlas, atlasRects.tail, 0.47, 0.55)

    expect(body.baseColor[0]).toBeGreaterThan(body.baseColor[1] + 0.26)
    expect(body.baseColor[1] - body.baseColor[2]).toBeLessThan(0.32)
    expect(sumChannels(dorsal.baseColor)).toBeLessThan(sumChannels(body.baseColor) - 0.12)
    expect(sumChannels(faceBand.baseColor)).toBeLessThan(sumChannels(body.baseColor) - 0.34)
    expect(colorDistance(mouth.baseColor, faceBand.baseColor)).toBeGreaterThan(0.14)
    expect(colorDistance(eye.baseColor, faceBand.baseColor)).toBeGreaterThan(0.22)
    expect(colorDistance(rearAccent.baseColor, body.baseColor)).toBeGreaterThan(0.2)
    expect(body.roughness).toBeGreaterThan(0.5)
    expect(body.roughness).toBeLessThan(0.84)
    expect(tailCenter.roughness).toBeGreaterThan(body.roughness + 0.12)
    expect(tailCenter.alpha).toBeGreaterThan(tailEdge.alpha + 0.46)
    expect(tailRay.alpha).toBeGreaterThan(tailMembrane.alpha + 0.1)
    expect(faceNormalSlope).toBeGreaterThan(bodyNormalSlope + 0.015)
    expect(tailRayNormalSlope).toBeGreaterThan(tailMembraneNormalSlope + 0.015)
  }, 15000)

  it('keeps angelfish bands, head shadow, and long fin translucency readable', () => {
    const angelfish = fishAssetConfigs.find((config) => config.id === 'angelfish')
    expect(angelfish).toBeDefined()

    const atlas = createAtlas(angelfish!)
    const bandA = sampleAtlas(atlas, atlasRects.body, 0.3, 0.55)
    const bandB = sampleAtlas(atlas, atlasRects.body, 0.56, 0.55)
    const betweenBands = sampleAtlas(atlas, atlasRects.body, 0.43, 0.55)
    const headShadow = sampleAtlas(atlas, atlasRects.body, 0.86, 0.58)
    const cheekLight = sampleAtlas(atlas, atlasRects.body, 0.9, 0.4)
    const dorsalCenter = sampleAtlas(atlas, atlasRects.dorsal, 0.5, 0.5)
    const dorsalEdge = sampleAtlas(atlas, atlasRects.dorsal, 0.08, 0.5)

    expect(sumChannels(bandA.baseColor)).toBeLessThan(sumChannels(betweenBands.baseColor) - 0.2)
    expect(sumChannels(bandB.baseColor)).toBeLessThan(sumChannels(betweenBands.baseColor) - 0.2)
    expect(sumChannels(headShadow.baseColor)).toBeLessThan(sumChannels(cheekLight.baseColor) - 0.12)
    expect(dorsalCenter.alpha).toBeGreaterThan(dorsalEdge.alpha + 0.38)
    expect(dorsalCenter.roughness).toBeGreaterThan(headShadow.roughness + 0.12)
  }, 15000)

  it('keeps neon stripe contrast grounded by darker head and non-toy roughness', () => {
    const neon = fishAssetConfigs.find((config) => config.id === 'neon')
    expect(neon).toBeDefined()

    const atlas = createAtlas(neon!)
    const blueStripe = sampleAtlas(atlas, atlasRects.body, 0.46, 0.58)
    const redLower = sampleAtlas(atlas, atlasRects.body, 0.46, 0.33)
    const headDark = sampleAtlas(atlas, atlasRects.body, 0.88, 0.58)
    const dorsalDark = sampleAtlas(atlas, atlasRects.body, 0.56, 0.78)

    expect(blueStripe.baseColor[2]).toBeGreaterThan(blueStripe.baseColor[0] + 0.26)
    expect(redLower.baseColor[0]).toBeGreaterThan(redLower.baseColor[2] + 0.34)
    expect(sumChannels(headDark.baseColor)).toBeLessThan(sumChannels(blueStripe.baseColor) - 0.34)
    expect(sumChannels(dorsalDark.baseColor)).toBeLessThan(sumChannels(blueStripe.baseColor) - 0.24)
    expect(blueStripe.roughness).toBeGreaterThan(0.3)
  }, 15000)

  it('keeps tropical fish from reading as flat orange by separating back, face, and fins', () => {
    const tropical = fishAssetConfigs.find((config) => config.id === 'tropical')
    expect(tropical).toBeDefined()

    const atlas = createAtlas(tropical!)
    const dorsal = sampleAtlas(atlas, atlasRects.body, 0.3, 0.82)
    const belly = sampleAtlas(atlas, atlasRects.body, 0.3, 0.22)
    const face = sampleAtlas(atlas, atlasRects.body, 0.84, 0.58)
    const midBody = sampleAtlas(atlas, atlasRects.body, 0.52, 0.54)
    const dorsalFinCenter = sampleAtlas(atlas, atlasRects.dorsal, 0.5, 0.5)
    const dorsalFinEdge = sampleAtlas(atlas, atlasRects.dorsal, 0.08, 0.5)

    expect(sumChannels(dorsal.baseColor)).toBeLessThan(sumChannels(belly.baseColor) - 0.18)
    expect(colorDistance(face.baseColor, midBody.baseColor)).toBeGreaterThan(0.24)
    expect(dorsalFinCenter.alpha).toBeGreaterThan(dorsalFinEdge.alpha + 0.38)
    expect(dorsalFinCenter.roughness).toBeGreaterThan(midBody.roughness + 0.26)
  }, 15000)
})
