import { describe, expect, it } from 'vitest'
import {
  assetPublicOutputPath,
  environmentAssetPath,
  fishAssetFileName,
  fishTextureAssetPath,
  modelAssetPath,
  textureAssetPath
} from './assetPathConventions.js'

describe('asset path conventions', () => {
  it('builds runtime manifest paths from shared public asset conventions', () => {
    expect(textureAssetPath('plants', 'leaf-diffuse.png')).toBe('assets/textures/plants/leaf-diffuse.png')
    expect(textureAssetPath('substrate', 'substrate-sand-ao.png')).toBe(
      'assets/textures/substrate/substrate-sand-ao.png'
    )
    expect(fishTextureAssetPath('tropical', 'basecolor')).toBe('assets/textures/fish/fish-tropical-basecolor.png')
    expect(modelAssetPath('rocks', 'rock-lava-transition-chips.glb')).toBe(
      'assets/models/rocks/rock-lava-transition-chips.glb'
    )
    expect(environmentAssetPath('aquarium-hdri.hdr')).toBe('assets/environment/aquarium-hdri.hdr')
  })

  it('builds authoring output paths from the same directory conventions', () => {
    expect(assetPublicOutputPath('textures', 'fish')).toBe('public/assets/textures/fish')
    expect(assetPublicOutputPath('models', 'driftwood', 'driftwood-hero.glb')).toBe(
      'public/assets/models/driftwood/driftwood-hero.glb'
    )
    expect(fishAssetFileName('neon', 'normal')).toBe('fish-neon-normal.png')
    expect(fishAssetFileName('neon', 'school')).toBe('fish-neon-school.glb')
  })
})
