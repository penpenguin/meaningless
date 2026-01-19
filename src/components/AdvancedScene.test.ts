import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AdvancedAquariumScene } from './AdvancedScene'

describe('AdvancedAquariumScene disposal', () => {
  it('removes renderer canvas from the DOM', () => {
    const container = document.createElement('div')
    const canvas = document.createElement('canvas')
    container.appendChild(canvas)

    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: { domElement: HTMLCanvasElement; dispose: () => void }
      controls: { dispose: () => void }
      composer: { dispose: () => void }
      handleResize: () => void
      stop: () => void
      spiralDecorations: { dispose: () => void } | null
      godRaysEffect: { dispose: () => void } | null
      scene: THREE.Scene
    }

    internals.renderer = { domElement: canvas, dispose: vi.fn() }
    internals.controls = { dispose: vi.fn() }
    internals.composer = { dispose: vi.fn() }
    internals.handleResize = vi.fn()
    internals.stop = vi.fn()
    internals.spiralDecorations = null
    internals.godRaysEffect = null
    internals.scene = new THREE.Scene()

    expect(container.contains(canvas)).toBe(true)

    const dispose = (AdvancedAquariumScene.prototype as unknown as {
      dispose: () => void
    }).dispose.bind(instance)

    dispose()

    expect(container.contains(canvas)).toBe(false)
  })

  it('disposes scene assets on teardown', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: { domElement: HTMLCanvasElement; dispose: () => void }
      controls: { dispose: () => void }
      composer: { dispose: () => void }
      handleResize: () => void
      stop: () => void
      spiralDecorations: { dispose: () => void } | null
      godRaysEffect: { dispose: () => void } | null
      scene: THREE.Scene
    }

    internals.renderer = { domElement: document.createElement('canvas'), dispose: vi.fn() }
    internals.controls = { dispose: vi.fn() }
    internals.composer = { dispose: vi.fn() }
    internals.handleResize = vi.fn()
    internals.stop = vi.fn()
    internals.spiralDecorations = null
    internals.godRaysEffect = null

    const scene = new THREE.Scene()
    const geometry = new THREE.BoxGeometry()
    const mapTexture = new THREE.Texture()
    const material = new THREE.MeshStandardMaterial({ map: mapTexture })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const background = new THREE.Texture()
    const environment = new THREE.Texture()
    scene.background = background
    scene.environment = environment

    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    const mapDispose = vi.spyOn(mapTexture, 'dispose')
    const backgroundDispose = vi.spyOn(background, 'dispose')
    const environmentDispose = vi.spyOn(environment, 'dispose')

    internals.scene = scene

    const dispose = (AdvancedAquariumScene.prototype as unknown as {
      dispose: () => void
    }).dispose.bind(instance)

    dispose()

    expect(geometryDispose).toHaveBeenCalled()
    expect(materialDispose).toHaveBeenCalled()
    expect(mapDispose).toHaveBeenCalled()
    expect(backgroundDispose).toHaveBeenCalled()
    expect(environmentDispose).toHaveBeenCalled()
    expect(scene.background).toBeNull()
    expect(scene.environment).toBeNull()
    expect(scene.children.length).toBe(0)
  })
})
