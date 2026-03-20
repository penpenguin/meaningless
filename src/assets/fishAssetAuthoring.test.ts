import { describe, expect, it } from 'vitest'
import {
  atlasRects,
  createAtlas,
  fishAssetConfigs,
  sampleAtlas
} from '../../scripts/generate-fish-assets.mjs'

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
    const butterflyEyeBand = sampleAtlas(butterflyAtlas, atlasRects.body, 0.84, 0.56)
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
    expect(signatureDistance).toBeGreaterThan(0.28)
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
})
