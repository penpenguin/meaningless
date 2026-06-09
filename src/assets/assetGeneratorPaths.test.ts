import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assetPublicOutputPath } from './assetPathConventions.js'

const readScript = (path: string): string => readFileSync(path, 'utf8')

describe('aquarium asset generator output paths', () => {
  it('writes generated fish assets to the same public paths used by the manifest', () => {
    const script = readScript('scripts/generate-fish-assets.mjs')

    expect(assetPublicOutputPath('textures', 'fish')).toBe('public/assets/textures/fish')
    expect(assetPublicOutputPath('models', 'fish')).toBe('public/assets/models/fish')
    expect(script).toContain("assetPublicOutputPath('textures', 'fish')")
    expect(script).toContain("assetPublicOutputPath('models', 'fish')")
    expect(script).toContain('fishAssetFileName(config.id')
    expect(script).not.toContain("public/assets/aquarium/textures/fish")
    expect(script).not.toContain("public/assets/aquarium/models/fish")
  })

  it('keeps shared texture and hardscape generators aligned with the flattened assets directory', () => {
    const scripts = [
      'scripts/generate-shared-aquarium-textures.mjs',
      'scripts/generate-driftwood-hero-asset.mjs'
    ].map(readScript)

    scripts.forEach((script) => {
      expect(script).not.toContain("public/assets/aquarium/")
      expect(script).toContain('assetPublicOutputPath')
    })
    expect(assetPublicOutputPath('textures', 'plants')).toBe('public/assets/textures/plants')
    expect(assetPublicOutputPath('models', 'driftwood')).toBe('public/assets/models/driftwood')
    expect(assetPublicOutputPath('models', 'rocks')).toBe('public/assets/models/rocks')
  })
})
