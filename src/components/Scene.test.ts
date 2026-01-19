import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

vi.mock('./Water', () => {
  return {
    WaterSurface: class {
      update() {}
    }
  }
})

import { AquariumScene } from './Scene'

describe('AquariumScene disposal', () => {
  it('disposes scene assets on teardown', () => {
    const instance = Object.create(AquariumScene.prototype) as AquariumScene
    const internals = instance as unknown as {
      renderer: { dispose: () => void }
      controls: { dispose: () => void }
      handleResize: () => void
      stop: () => void
      scene: THREE.Scene
    }

    internals.renderer = { dispose: vi.fn() }
    internals.controls = { dispose: vi.fn() }
    internals.handleResize = vi.fn()
    internals.stop = vi.fn()

    const scene = new THREE.Scene()
    const geometry = new THREE.SphereGeometry()
    const mapTexture = new THREE.Texture()
    const material = new THREE.MeshStandardMaterial({ map: mapTexture })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const background = new THREE.Texture()
    scene.background = background

    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    const mapDispose = vi.spyOn(mapTexture, 'dispose')
    const backgroundDispose = vi.spyOn(background, 'dispose')

    internals.scene = scene

    const dispose = (AquariumScene.prototype as unknown as {
      dispose: () => void
    }).dispose.bind(instance)

    dispose()

    expect(geometryDispose).toHaveBeenCalled()
    expect(materialDispose).toHaveBeenCalled()
    expect(mapDispose).toHaveBeenCalled()
    expect(backgroundDispose).toHaveBeenCalled()
    expect(scene.background).toBeNull()
    expect(scene.children.length).toBe(0)
  })
})
