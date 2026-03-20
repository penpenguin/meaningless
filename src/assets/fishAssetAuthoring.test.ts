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
  })

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
  })

  it('keeps butterflyfish non-metallic while separating it clearly from goldfish by texture alone', () => {
    const butterflyfish = fishAssetConfigs.find((config) => config.id === 'butterflyfish')
    const goldfish = fishAssetConfigs.find((config) => config.id === 'goldfish')

    expect(butterflyfish).toBeDefined()
    expect(goldfish).toBeDefined()

    const butterflyAtlas = createAtlas(butterflyfish!)
    const goldfishAtlas = createAtlas(goldfish!)

    const butterflyBody = sampleAtlas(butterflyAtlas, atlasRects.body, 0.52, 0.54)
    const butterflyEyeBand = sampleAtlas(butterflyAtlas, atlasRects.body, 0.84, 0.56)
    const butterflyFinEdge = sampleAtlas(butterflyAtlas, atlasRects.dorsal, 0.88, 0.64)
    const goldfishBody = sampleAtlas(goldfishAtlas, atlasRects.body, 0.52, 0.54)
    const colorDistance = butterflyBody.baseColor.reduce((total, channel, index) => {
      return total + Math.abs(channel - goldfishBody.baseColor[index])
    }, 0)

    expect(butterflyEyeBand.baseColor[0]).toBeLessThan(butterflyBody.baseColor[0] - 0.18)
    expect(butterflyBody.roughness).toBeGreaterThan(0.42)
    expect(butterflyBody.roughness).toBeLessThan(0.82)
    expect(colorDistance).toBeGreaterThan(0.28)
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
})
