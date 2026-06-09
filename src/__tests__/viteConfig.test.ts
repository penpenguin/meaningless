// @vitest-environment node
import { describe, expect, it } from 'vitest'
import config from '../../vite.config'

describe('vite build chunking', () => {
  it('splits three examples addons by runtime concern', () => {
    const output = config.build?.rolldownOptions?.output
    const codeSplitting = Array.isArray(output) ? undefined : output?.codeSplitting
    const firstGroup = typeof codeSplitting === 'object' ? codeSplitting.groups?.[0] : undefined

    expect(firstGroup).toBeDefined()
    expect(codeSplitting).toMatchObject({
      includeDependenciesRecursively: false,
      maxSize: 450 * 1024
    })

    const resolveChunk = firstGroup?.name as (id: string) => string | null
    expect(resolveChunk('/workspace/node_modules/three/build/three.module.js')).toBe('three-core')
    expect(resolveChunk('/workspace/node_modules/.vite/deps/three.module-Dhi4sXJn.js')).toBe('three-core')
    expect(resolveChunk('/workspace/node_modules/three/examples/jsm/postprocessing/EffectComposer.js')).toBe('three-postprocessing')
    expect(resolveChunk('/workspace/node_modules/three/examples/jsm/loaders/GLTFLoader.js')).toBe('three-loaders')
    expect(resolveChunk('/workspace/node_modules/three/examples/jsm/utils/SkeletonUtils.js')).toBe('three-utils')
    expect(resolveChunk('/workspace/node_modules/three/examples/jsm/controls/OrbitControls.js')).toBe('three-controls')
    expect(resolveChunk('/workspace/src/main.ts')).toBeNull()
  })
})
