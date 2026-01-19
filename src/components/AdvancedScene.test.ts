import { describe, expect, it, vi } from 'vitest'
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
    }

    internals.renderer = { domElement: canvas, dispose: vi.fn() }
    internals.controls = { dispose: vi.fn() }
    internals.composer = { dispose: vi.fn() }
    internals.handleResize = vi.fn()
    internals.stop = vi.fn()
    internals.spiralDecorations = null
    internals.godRaysEffect = null

    expect(container.contains(canvas)).toBe(true)

    const dispose = (AdvancedAquariumScene.prototype as unknown as {
      dispose: () => void
    }).dispose.bind(instance)

    dispose()

    expect(container.contains(canvas)).toBe(false)
  })
})
