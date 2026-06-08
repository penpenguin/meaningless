import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readScript = (path: string): string => readFileSync(path, 'utf8')

describe('aquarium asset generator output paths', () => {
  it('writes generated fish assets to the same public paths used by the manifest', () => {
    const script = readScript('scripts/generate-fish-assets.mjs')

    expect(script).toContain("public/assets/textures/fish")
    expect(script).toContain("public/assets/models/fish")
    expect(script).not.toContain("public/assets/aquarium/textures/fish")
    expect(script).not.toContain("public/assets/aquarium/models/fish")
  })

  it('keeps shared texture and hardscape generators aligned with the flattened assets directory', () => {
    const scripts = [
      'scripts/generate-shared-aquarium-textures.mjs',
      'scripts/generate-driftwood-hero-asset.mjs',
      'scripts/generate-support-rock-assets.mjs'
    ].map(readScript)

    scripts.forEach((script) => {
      expect(script).not.toContain("public/assets/aquarium/")
    })
    expect(scripts.join('\n')).toContain("public/assets/textures/plants")
    expect(scripts.join('\n')).toContain("public/assets/models/driftwood")
    expect(scripts.join('\n')).toContain("public/assets/models/rocks")
  })
})
