import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { EnvironmentLoader, createEnvironmentBackdropTexture } from './Environment'

describe('EnvironmentLoader depth cues', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null
  let toDataURLSpy: ReturnType<typeof vi.spyOn> | null = null
  let cubeLoadSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    toDataURLSpy?.mockRestore()
    cubeLoadSpy?.mockRestore()
    getContextSpy = null
    toDataURLSpy = null
    cubeLoadSpy = null
  })

  it('layers haze blooms and silhouette strokes into the shared backdrop texture', () => {
    const stats = {
      radialGradientCalls: 0,
      strokeCalls: 0
    }

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        const gradient = { addColorStop: vi.fn() }

        return {
          createLinearGradient: () => gradient,
          createRadialGradient: () => {
            stats.radialGradientCalls += 1
            return { addColorStop: vi.fn() }
          },
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          globalAlpha: 1,
          globalCompositeOperation: 'source-over'
        } as unknown as CanvasRenderingContext2D
      })

    const texture = createEnvironmentBackdropTexture()

    expect(texture).toBeInstanceOf(THREE.CanvasTexture)
    expect((texture.userData as { isEnvironmentBackdrop?: boolean }).isEnvironmentBackdrop).toBe(true)
    expect(stats.radialGradientCalls).toBeGreaterThanOrEqual(3)
    expect(stats.strokeCalls).toBeGreaterThanOrEqual(4)
  })

  it('builds an env map with layered reflection cues instead of flat random speckles', () => {
    const stats = {
      radialGradientCalls: 0,
      strokeCalls: 0
    }

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        const gradient = { addColorStop: vi.fn() }

        return {
          clearRect: vi.fn(),
          createLinearGradient: () => gradient,
          createRadialGradient: () => {
            stats.radialGradientCalls += 1
            return { addColorStop: vi.fn() }
          },
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          globalAlpha: 1,
          globalCompositeOperation: 'source-over'
        } as unknown as CanvasRenderingContext2D
      })

    toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation(() => 'data:image/png;base64,depth')

    cubeLoadSpy = vi
      .spyOn(THREE.CubeTextureLoader.prototype, 'load')
      .mockImplementation(() => new THREE.CubeTexture())

    const loader = new EnvironmentLoader(new THREE.Scene())
    const createEnvironmentCubeMap = (EnvironmentLoader.prototype as unknown as {
      createEnvironmentCubeMap: () => THREE.CubeTexture
    }).createEnvironmentCubeMap.bind(loader)

    const envMap = createEnvironmentCubeMap()

    expect(envMap).toBeInstanceOf(THREE.CubeTexture)
    expect(stats.radialGradientCalls).toBeGreaterThanOrEqual(12)
    expect(stats.strokeCalls).toBeGreaterThanOrEqual(8)
  })

  it('keeps the scene background owned by the composition layer when loading the env map', async () => {
    const scene = new THREE.Scene()
    const existingBackground = new THREE.Color('#123456')
    scene.background = existingBackground

    toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockImplementation(() => 'data:image/png;base64,env')

    cubeLoadSpy = vi
      .spyOn(THREE.CubeTextureLoader.prototype, 'load')
      .mockImplementation(() => new THREE.CubeTexture())

    const loader = new EnvironmentLoader(scene)

    await loader.loadHDRI()

    expect(scene.environment).toBeInstanceOf(THREE.CubeTexture)
    expect(scene.background).toBe(existingBackground)
  })

  it('uses a preloaded hdri texture with PMREM when premium environment assets are available', async () => {
    const scene = new THREE.Scene()
    const hdriTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    const pmremTexture = new THREE.Texture()
    const pmremFactory = vi.fn(() => ({
      fromEquirectangular: vi.fn(() => ({ texture: pmremTexture })),
      dispose: vi.fn()
    }))

    const loader = new EnvironmentLoader(scene, {
      renderer: {} as THREE.WebGLRenderer,
      visualAssets: {
        manifest: { textures: [], models: [], environment: [] },
        textures: {},
        models: {},
        environment: {
          'aquarium-hdri': hdriTexture
        }
      },
      pmremGeneratorFactory: pmremFactory
    })

    await loader.loadHDRI()

    expect(pmremFactory).toHaveBeenCalledTimes(1)
    expect(scene.environment).toBe(pmremTexture)
  })

  it('falls back to the procedural env map when hdri assets are unavailable', async () => {
    const scene = new THREE.Scene()
    const proceduralEnv = new THREE.CubeTexture()
    const loader = new EnvironmentLoader(scene, {
      renderer: {} as THREE.WebGLRenderer,
      visualAssets: {
        manifest: { textures: [], models: [], environment: [] },
        textures: {},
        models: {},
        environment: {}
      },
      pmremGeneratorFactory: vi.fn()
    })
    const createEnvironmentCubeMapSpy = vi
      .spyOn(loader as unknown as { createEnvironmentCubeMap: () => THREE.CubeTexture }, 'createEnvironmentCubeMap')
      .mockReturnValue(proceduralEnv)

    await loader.loadHDRI()

    expect(scene.environment).toBe(proceduralEnv)
    expect(createEnvironmentCubeMapSpy).toHaveBeenCalledTimes(1)
    createEnvironmentCubeMapSpy.mockRestore()
  })
})
