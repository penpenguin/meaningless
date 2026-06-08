import { describe, expect, it } from 'vitest'
import {
  SUBSTRATE_GEOMETRY_SEGMENTS,
  SUBSTRATE_VISUAL_FOOTPRINT_SCALE
} from './substrateGeometry'

describe('substrate geometry configuration', () => {
  it('exports the current high-density terrain subdivisions used by the showcase substrate', () => {
    expect(SUBSTRATE_GEOMETRY_SEGMENTS).toEqual({
      topWidth: 160,
      topDepth: 112
    })
  })

  it('exports the authored visual footprint scale separately from mesh construction', () => {
    expect(SUBSTRATE_VISUAL_FOOTPRINT_SCALE).toEqual({
      width: 3.62,
      depth: 3.68
    })
  })
})
