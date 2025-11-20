import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import { DetailedFishSystem } from './DetailedFish'

describe('DetailedFishSystem geometry merging', () => {
  test('createDetailedFishGeometry merges mixed index geometries safely', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const variant = {
      name: 'specimen',
      primaryColor: new THREE.Color('#ffffff'),
      secondaryColor: new THREE.Color('#000000'),
      scale: 1,
      speed: 1
    }

    // Bypass constructor side effects; the method does not rely on instance state.
    const instance = Object.create(DetailedFishSystem.prototype) as DetailedFishSystem
    const { createDetailedFishGeometry } = DetailedFishSystem.prototype as unknown as {
      createDetailedFishGeometry: (variant: typeof variant) => THREE.BufferGeometry
    }
    const createGeometry = createDetailedFishGeometry.bind(instance)

    const geometry = createGeometry(variant) as THREE.BufferGeometry

    expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(geometry.index).toBeNull()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
