import { describe, expect, it } from 'vitest'
import {
  assetPublicOutputPath,
  environmentAssetPath,
  fishAssetFileName,
  modelAssetPath,
  textureAssetPath
} from './assetPathConventions.js'

describe('asset path conventions', () => {
  it('builds runtime manifest paths from shared public asset conventions', () => {
    expect(textureAssetPath('substrate', 'substrate-sand-ao.png')).toBe(
      'assets/textures/substrate/substrate-sand-ao.png'
    )
    expect(modelAssetPath('rocks', 'rock-ridge-hero.glb')).toBe(
      'assets/models/rocks/rock-ridge-hero.glb'
    )
    expect(environmentAssetPath('aquarium-hdri.hdr')).toBe('assets/environment/aquarium-hdri.hdr')
  })

  it('builds authoring output paths from the same directory conventions', () => {
    expect(assetPublicOutputPath('textures', 'substrate')).toBe('public/assets/textures/substrate')
    expect(assetPublicOutputPath('models', 'driftwood', 'driftwood-hero.glb')).toBe(
      'public/assets/models/driftwood/driftwood-hero.glb'
    )
    expect(fishAssetFileName('neon', 'school')).toBe('fish-neon-school.glb')
  })
})
