import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('AdvancedAquariumScene performance stats', () => {
  it('reads fishVisible from fish system instead of using a fixed value', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      fishSystem: { getVisibleFishCount: () => number } | null
      stats: { fps: number; frameTime: number; fishVisible: number; drawCalls: number }
    }

    internals.fishSystem = {
      getVisibleFishCount: () => 24
    }
    internals.stats = {
      fps: 0,
      frameTime: 0,
      fishVisible: 0,
      drawCalls: 0
    }

    const syncFishVisibleStat = (AdvancedAquariumScene.prototype as unknown as {
      syncFishVisibleStat: () => void
    }).syncFishVisibleStat.bind(instance)

    syncFishVisibleStat()

    expect(internals.stats.fishVisible).toBe(24)
  })
})

describe('AdvancedAquariumScene camera', () => {
  it('frames the aquascape higher with a tighter hero composition', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      camera: THREE.PerspectiveCamera
      getViewportSize: () => { width: number; height: number }
    }

    internals.getViewportSize = () => ({ width: 1600, height: 900 })

    const setupCamera = (AdvancedAquariumScene.prototype as unknown as {
      setupCamera: () => void
    }).setupCamera.bind(instance)

    setupCamera()

    const direction = new THREE.Vector3()
    internals.camera.getWorldDirection(direction)

    expect(internals.camera.position.z).toBeCloseTo(13.2, 1)
    expect(internals.camera.position.y).toBeCloseTo(1.7, 1)
    expect(direction.y).toBeLessThan(-0.1)
  })
})

describe('AdvancedAquariumScene tank backdrop', () => {
  it('adds a rear depth scrim behind the substrate', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const backdrop = internals.tank.children.find((child) => child.name === 'tank-backdrop') as THREE.Mesh | undefined

    expect(internals.createSubstrate).toHaveBeenCalledWith(14, 14, 10)
    expect(backdrop).toBeDefined()
    expect(backdrop?.position.z).toBeLessThan(-4.7)
  })

  it('builds visible glass and water layers around the tank volume', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const frontGlass = internals.tank.children.find((child) => child.name === 'tank-glass-front') as THREE.Mesh | undefined
    const waterVolume = internals.tank.children.find((child) => child.name === 'tank-water-volume') as THREE.Mesh | undefined
    const surface = internals.tank.children.find((child) => child.name === 'tank-water-surface') as THREE.Mesh | undefined
    const caustics = internals.tank.children.find((child) => child.name === 'tank-caustics-floor') as THREE.Mesh | undefined

    expect(frontGlass).toBeDefined()
    expect(frontGlass?.material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(waterVolume).toBeDefined()
    expect(surface).toBeDefined()
    expect(caustics).toBeDefined()
  })

  it('adds premium highlight layers and richer refractive materials on high quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const frontGlass = internals.tank.children.find((child) => child.name === 'tank-glass-front') as THREE.Mesh | undefined
    const frontHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-front-highlight') as THREE.Mesh | undefined
    const waterVolume = internals.tank.children.find((child) => child.name === 'tank-water-volume') as THREE.Mesh | undefined
    const surface = internals.tank.children.find((child) => child.name === 'tank-water-surface') as THREE.Mesh | undefined
    const surfaceHighlight = internals.tank.children.find((child) => child.name === 'tank-water-surface-highlight') as THREE.Mesh | undefined

    const frontGlassMaterial = frontGlass?.material as THREE.MeshPhysicalMaterial | undefined
    const waterVolumeMaterial = waterVolume?.material as THREE.MeshPhysicalMaterial | undefined
    const surfaceMaterial = surface?.material as THREE.MeshPhysicalMaterial | undefined

    expect(frontHighlight).toBeDefined()
    expect(surfaceHighlight).toBeDefined()
    expect(frontGlassMaterial?.attenuationDistance).toBeLessThan(2)
    expect(waterVolumeMaterial?.attenuationDistance).toBeLessThan(3)
    expect(surfaceMaterial?.thickness).toBeGreaterThan(0.8)
    expect(surfaceMaterial?.attenuationDistance).toBeLessThan(2)
  })
})

describe('AdvancedAquariumScene substrate', () => {
  it('builds a rectangular floor that matches the tank footprint', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

    const [baseMesh, sandMesh] = internals.tank.children as THREE.Mesh[]

    expect(baseMesh.geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect((baseMesh.geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(14.6)
    expect((baseMesh.geometry as THREE.BoxGeometry).parameters.depth).toBeCloseTo(10.6)

    expect(sandMesh.geometry).toBeInstanceOf(THREE.PlaneGeometry)
    expect((sandMesh.geometry as THREE.PlaneGeometry).parameters.width).toBeCloseTo(14)
    expect((sandMesh.geometry as THREE.PlaneGeometry).parameters.height).toBeCloseTo(10)
  })

  it('uses muted sand tones instead of a bright white substrate', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

    const [baseMesh, sandMesh] = internals.tank.children as THREE.Mesh[]
    const baseMaterial = baseMesh.material as THREE.MeshStandardMaterial
    const sandMaterial = sandMesh.material as THREE.MeshStandardMaterial

    expect(baseMaterial.color.getHexString()).toBe('b59e84')
    expect(sandMaterial.color.getHexString()).toBe('d2bb9b')
  })
})

describe('AdvancedAquariumScene quality scaling', () => {
  it('keeps the water surface but hides premium water layers on low quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
      createBackdropTexture: () => THREE.CanvasTexture
      renderer: {
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'low' | 'medium' | 'high') => void } | null
      getViewportSize: () => { width: number; height: number }
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = { resize: vi.fn() }
    internals.fishSystem = { setQuality: vi.fn() }
    internals.getViewportSize = () => ({ width: 1600, height: 900 })

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)
    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'low' | 'medium' | 'high') => void
    }).setWaterQuality.bind(instance)

    createAdvancedTank()
    setWaterQuality('low')

    const waterVolume = internals.tank.children.find((child) => child.name === 'tank-water-volume') as THREE.Mesh | undefined
    const waterSurface = internals.tank.children.find((child) => child.name === 'tank-water-surface') as THREE.Mesh | undefined
    const waterSurfaceHighlight = internals.tank.children.find((child) => child.name === 'tank-water-surface-highlight') as THREE.Mesh | undefined
    const caustics = internals.tank.children.find((child) => child.name === 'tank-caustics-floor') as THREE.Mesh | undefined
    const frontGlassHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-front-highlight') as THREE.Mesh | undefined

    expect(internals.renderer.shadowMap.enabled).toBe(false)
    expect(waterVolume?.visible).toBe(false)
    expect(caustics?.visible).toBe(false)
    expect(waterSurface?.visible).toBe(true)
    expect(waterSurfaceHighlight?.visible).toBe(false)
    expect(frontGlassHighlight?.visible).toBe(false)
  })
})

describe('AdvancedAquariumScene water textures', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
  })

  it('creates a diffuse water surface texture instead of stroked contour bands', () => {
    const stats = {
      radialGradientCalls: 0,
      strokeCalls: 0,
      fillCalls: 0
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
          fillRect: () => {
            stats.fillCalls += 1
          },
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fill: () => {
            stats.fillCalls += 1
          },
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          globalCompositeOperation: 'source-over',
          globalAlpha: 1,
          lineWidth: 0
        } as unknown as CanvasRenderingContext2D
      })

    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const createWaterSurfaceTexture = (AdvancedAquariumScene.prototype as unknown as {
      createWaterSurfaceTexture: () => THREE.CanvasTexture
    }).createWaterSurfaceTexture.bind(instance)

    createWaterSurfaceTexture()

    expect(stats.radialGradientCalls).toBeGreaterThan(0)
    expect(stats.fillCalls).toBeGreaterThan(1)
    expect(stats.strokeCalls).toBe(0)
  })

  it('creates highlight blooms instead of repeated spine-like wave strokes', () => {
    const stats = {
      radialGradientCalls: 0,
      strokeCalls: 0,
      fillCalls: 0
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
          fillRect: () => {
            stats.fillCalls += 1
          },
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fill: () => {
            stats.fillCalls += 1
          },
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          globalCompositeOperation: 'source-over',
          globalAlpha: 1,
          lineWidth: 0
        } as unknown as CanvasRenderingContext2D
      })

    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const createWaterSurfaceHighlightTexture = (AdvancedAquariumScene.prototype as unknown as {
      createWaterSurfaceHighlightTexture: () => THREE.CanvasTexture
    }).createWaterSurfaceHighlightTexture.bind(instance)

    createWaterSurfaceHighlightTexture()

    expect(stats.radialGradientCalls).toBeGreaterThan(2)
    expect(stats.fillCalls).toBeGreaterThan(2)
    expect(stats.strokeCalls).toBe(0)
  })
})
