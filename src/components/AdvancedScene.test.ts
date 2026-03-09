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
