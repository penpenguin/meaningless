// @vitest-environment node
import { describe, expect, it } from 'vitest'
import config from '../../vite.config'

describe('vite build chunking', () => {
  it('splits three addons away from the core runtime chunk', () => {
    const output = config.build?.rollupOptions?.output
    const manualChunks = Array.isArray(output) ? undefined : output?.manualChunks

    expect(typeof manualChunks).toBe('function')

    const resolveChunk = manualChunks as (id: string) => string | undefined
    expect(resolveChunk('/workspace/node_modules/three/build/three.module.js')).toBe('three-core')
    expect(resolveChunk('/workspace/node_modules/three/examples/jsm/postprocessing/EffectComposer.js')).toBe('three-addons')
    expect(resolveChunk('/workspace/src/main.ts')).toBeUndefined()
  })
})
