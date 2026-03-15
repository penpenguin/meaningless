import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AdvancedAquariumScene } from './AdvancedScene'
import { substrateHardscapeAnchors } from './Aquascaping'
import {
  AQUARIUM_MAIN_LIGHT_RIG,
  AQUARIUM_TANK_DIMENSIONS,
  type AquariumTankDimensions,
  resolveDefaultCameraPosition,
  resolveDefaultControlsTarget,
  resolvePhotoModeControlsTarget
} from './aquariumLayout'
import type { Theme } from '../types/aquarium'

type CreateSubstrateFn = (dimensions: AquariumTankDimensions) => void

const createSubstrateTestScene = () => {
  const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
  const internals = instance as unknown as {
    tank: THREE.Group
    createSandTexture: () => THREE.CanvasTexture
    createSandNormalTexture: () => THREE.CanvasTexture
    createSandRoughnessTexture: () => THREE.CanvasTexture
    createSandAoTexture: () => THREE.CanvasTexture
  }

  internals.tank = new THREE.Group()
  internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
  internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
  internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
  internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

  const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
    createSubstrate: CreateSubstrateFn
  }).createSubstrate.bind(instance)

  createSubstrate(AQUARIUM_TANK_DIMENSIONS)

  return {
    tank: internals.tank,
    sandTop: internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh,
    sandFront: internals.tank.children.find((child) => child.name === 'tank-substrate-front') as THREE.Mesh
  }
}

const getNearestTopHeight = (mesh: THREE.Mesh, targetX: number, targetZ: number): number => {
  const positions = mesh.geometry.getAttribute('position')
  let bestDistance = Number.POSITIVE_INFINITY
  let bestHeight = 0

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const distance = Math.hypot(x - targetX, z - targetZ)

    if (distance < bestDistance) {
      bestDistance = distance
      bestHeight = y
    }
  }

  return bestHeight
}

const getTopFrontEdgeHeights = (mesh: THREE.Mesh): number[] => {
  const positions = mesh.geometry.getAttribute('position')
  let maxZ = Number.NEGATIVE_INFINITY

  for (let i = 0; i < positions.count; i += 1) {
    maxZ = Math.max(maxZ, positions.getZ(i))
  }

  const heights: number[] = []
  for (let i = 0; i < positions.count; i += 1) {
    if (Math.abs(positions.getZ(i) - maxZ) < 0.001) {
      heights.push(positions.getY(i))
    }
  }

  return heights
}

const getFrontTopEdgeHeights = (mesh: THREE.Mesh): number[] => {
  const positions = mesh.geometry.getAttribute('position')
  const columnHeights = new Map<string, number>()

  for (let i = 0; i < positions.count; i += 1) {
    const xKey = positions.getX(i).toFixed(4)
    const y = positions.getY(i)
    const currentHeight = columnHeights.get(xKey)

    if (currentHeight === undefined || y > currentHeight) {
      columnHeights.set(xKey, y)
    }
  }

  return Array.from(columnHeights.values())
}

const getValueRange = (values: number[]): number => Math.max(...values) - Math.min(...values)

const EXPANDED_TANK_DIMENSIONS: AquariumTankDimensions = {
  width: 19.8,
  height: 15.3,
  depth: 13.6
}

const setTankDimensions = (instance: AdvancedAquariumScene, dimensions: AquariumTankDimensions) => {
  Object.defineProperty(instance as object, 'tankDimensions', {
    value: dimensions,
    configurable: true,
    writable: true
  })
}

const getWidthRatio = (position: THREE.Vector3, dimensions: AquariumTankDimensions): number => (
  position.x / dimensions.width
)

const getHeightRatio = (position: THREE.Vector3, dimensions: AquariumTankDimensions): number => (
  position.y / dimensions.height
)

const getDepthRatio = (position: THREE.Vector3, dimensions: AquariumTankDimensions): number => (
  position.z / dimensions.depth
)

const getTopClearanceRatio = (position: THREE.Vector3, dimensions: AquariumTankDimensions): number => (
  ((dimensions.height / 2) - position.y) / dimensions.height
)

const getBottomClearanceRatio = (position: THREE.Vector3, dimensions: AquariumTankDimensions): number => (
  (position.y + (dimensions.height / 2)) / dimensions.height
)

const expectRatioInRange = (
  actual: number,
  expected: number,
  tolerance = 0.015
) => {
  expect(actual).toBeGreaterThan(expected - tolerance)
  expect(actual).toBeLessThan(expected + tolerance)
}

const getHardscapeAnchor = (anchorId: string) => {
  const anchor = substrateHardscapeAnchors.find((candidate) => candidate.id === anchorId)
  if (!anchor) {
    throw new Error(`Missing hardscape anchor: ${anchorId}`)
  }

  return anchor
}

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
      defaultCameraPosition: THREE.Vector3
      defaultControlsTarget: THREE.Vector3
    }

    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    internals.defaultCameraPosition = resolveDefaultCameraPosition(AQUARIUM_TANK_DIMENSIONS)
    internals.defaultControlsTarget = resolveDefaultControlsTarget(AQUARIUM_TANK_DIMENSIONS)

    const setupCamera = (AdvancedAquariumScene.prototype as unknown as {
      setupCamera: () => void
    }).setupCamera.bind(instance)

    setupCamera()

    const direction = new THREE.Vector3()
    internals.camera.getWorldDirection(direction)

    expect(internals.camera.fov).toBe(47)
    expect(internals.camera.position.z).toBeCloseTo(resolveDefaultCameraPosition(AQUARIUM_TANK_DIMENSIONS).z, 1)
    expect(internals.camera.position.y).toBeCloseTo(resolveDefaultCameraPosition(AQUARIUM_TANK_DIMENSIONS).y, 1)
    expect(direction.y).toBeLessThan(-0.12)
  })
})

describe('AdvancedAquariumScene photo mode', () => {
  it('enables slower showcase motion and auto-rotate while active', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      controls: { autoRotate: boolean; autoRotateSpeed: number }
      motionScale: number
      photoModeEnabled: boolean
    }

    internals.controls = {
      autoRotate: false,
      autoRotateSpeed: 1
    }
    internals.motionScale = 1
    internals.photoModeEnabled = false

    const setPhotoMode = (AdvancedAquariumScene.prototype as unknown as {
      setPhotoMode: (enabled: boolean) => void
    }).setPhotoMode.bind(instance)

    setPhotoMode(true)
    expect(internals.photoModeEnabled).toBe(true)
    expect(internals.motionScale).toBeCloseTo(0.72)
    expect(internals.controls.autoRotate).toBe(true)
    expect(internals.controls.autoRotateSpeed).toBeCloseTo(0.45)

    setPhotoMode(false)
    expect(internals.photoModeEnabled).toBe(false)
    expect(internals.motionScale).toBe(1)
    expect(internals.controls.autoRotate).toBe(false)
  })

  it('pulls the camera target toward the hero fish focus point while photo mode is active', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      photoModeControlsTarget: THREE.Vector3
      tempPhotoModeTarget: THREE.Vector3
      fishSystem: {
        getHeroFocusPoint: () => THREE.Vector3
      }
    }

    internals.photoModeControlsTarget = resolvePhotoModeControlsTarget(AQUARIUM_TANK_DIMENSIONS)
    internals.tempPhotoModeTarget = new THREE.Vector3()
    internals.fishSystem = {
      getHeroFocusPoint: () => new THREE.Vector3(2.4, -0.1, 2.7)
    }

    const resolvePhotoModeTarget = (AdvancedAquariumScene.prototype as unknown as {
      resolvePhotoModeTarget: () => THREE.Vector3
    }).resolvePhotoModeTarget.bind(instance)

    const target = resolvePhotoModeTarget()

    expect(target.x).toBeGreaterThan(resolvePhotoModeControlsTarget(AQUARIUM_TANK_DIMENSIONS).x)
    expect(target.z).toBeGreaterThan(resolvePhotoModeControlsTarget(AQUARIUM_TANK_DIMENSIONS).z)
  })
})

describe('AdvancedAquariumScene tank backdrop', () => {
  it('adds a rear depth scrim behind the substrate', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
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

    expect(internals.createSubstrate).toHaveBeenCalledWith(AQUARIUM_TANK_DIMENSIONS)
    expect(backdrop).toBeDefined()
    expect(backdrop?.position.z).toBeCloseTo((-AQUARIUM_TANK_DIMENSIONS.depth / 2) + 0.08)
  })

  it('adds an asset-backed backdrop overlay when premium visual assets are available', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const overlayTexture = new THREE.Texture()
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
      visualAssets: { textures: Record<string, THREE.Texture | null> } | undefined
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.visualAssets = {
      textures: {
        'backdrop-depth': overlayTexture
      }
    }

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const overlay = internals.tank.children.find((child) => child.name === 'tank-backdrop-overlay') as THREE.Mesh | undefined

    expect(overlay).toBeDefined()
    expect((overlay?.material as THREE.MeshBasicMaterial | undefined)?.map).toBe(overlayTexture)
  })

  it('builds visible glass and water layers around the tank volume', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
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
      createSubstrate: CreateSubstrateFn
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

  it('adds a waterline rim and edge glints so the tank reads as layered glass and water', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const leftEdgeHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-edge-highlight-left') as THREE.Mesh | undefined
    const rightEdgeHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-edge-highlight-right') as THREE.Mesh | undefined
    const waterlineFront = internals.tank.children.find((child) => child.name === 'tank-waterline-front') as THREE.Mesh | undefined

    expect(leftEdgeHighlight).toBeDefined()
    expect(rightEdgeHighlight).toBeDefined()
    expect(waterlineFront).toBeDefined()
    expect(leftEdgeHighlight?.position.z).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.depth / 2) + 0.076)
    expect(rightEdgeHighlight?.position.x).toBeCloseTo((AQUARIUM_TANK_DIMENSIONS.width / 2) - 0.12)
    expect((waterlineFront?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })

  it('adds interior wall response layers so the tank walls catch light instead of reading as empty planes', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const backWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-back-panel') as THREE.Mesh | undefined
    const leftWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-left-panel') as THREE.Mesh | undefined
    const rightWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-right-panel') as THREE.Mesh | undefined

    const backWallMaterial = backWallPanel?.material as THREE.MeshBasicMaterial | undefined

    expect(backWallPanel).toBeDefined()
    expect(leftWallPanel).toBeDefined()
    expect(rightWallPanel).toBeDefined()
    expect(backWallMaterial?.transparent).toBe(true)
    expect(backWallMaterial?.map).toBeInstanceOf(THREE.Texture)
    expect(backWallPanel?.position.z).toBeCloseTo((-AQUARIUM_TANK_DIMENSIONS.depth / 2) + 0.18)
    expect(leftWallPanel?.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(rightWallPanel?.rotation.y).toBeCloseTo(-Math.PI / 2)
  })

  it('stages midground and foreground depth layers for a richer hero shot', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const midground = internals.tank.children.find((child) => child.name === 'tank-depth-midground') as THREE.Mesh | undefined
    const foreground = internals.tank.children.find((child) => child.name === 'tank-depth-foreground-shadow') as THREE.Mesh | undefined

    expect(midground).toBeDefined()
    expect(foreground).toBeDefined()
    expect(midground?.position.z).toBeLessThan(0)
    expect(foreground?.position.z).toBeGreaterThan(1.5)
    expect(foreground?.position.z).toBeLessThan(4.2)
  })

  it('adds a suspended light canopy and focused substrate glow around the hero hardscape', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const lightCanopy = internals.tank.children.find((child) => child.name === 'tank-light-canopy') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined

    expect(lightCanopy).toBeDefined()
    expect(heroGroundGlow).toBeDefined()
    expect(getTopClearanceRatio(lightCanopy!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(0.105)
    expect(getTopClearanceRatio(lightCanopy!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(0.116)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(0.05)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(0.058)
    expect((heroGroundGlow?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })

  it('splits underwater lighting into near-surface shafts, a midwater scatter layer, and substrate/backwall depth bands', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const nearSurfaceBands = internals.tank.children.filter((child) => (
      child.name.startsWith('tank-light-near-surface-band-')
    )) as THREE.Mesh[]
    const midwaterLayer = internals.tank.children.find((child) => (
      child.name === 'tank-light-midwater'
    )) as THREE.Mesh | undefined
    const substrateGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined
    const backCaustics = internals.tank.children.find((child) => child.name === 'tank-caustics-back') as THREE.Mesh | undefined

    expect(nearSurfaceBands).toHaveLength(3)
    expect(nearSurfaceBands.map((mesh) => mesh.name)).toEqual([
      'tank-light-near-surface-band-0',
      'tank-light-near-surface-band-1',
      'tank-light-near-surface-band-2'
    ])
    expect(nearSurfaceBands.every((mesh) => (
      getTopClearanceRatio(mesh.position, AQUARIUM_TANK_DIMENSIONS) > 0.18 &&
      getTopClearanceRatio(mesh.position, AQUARIUM_TANK_DIMENSIONS) < 0.225
    ))).toBe(true)
    expect(midwaterLayer).toBeDefined()
    expect(getHeightRatio(midwaterLayer!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(0.075)
    expect(getHeightRatio(midwaterLayer!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(0.09)
    expect(getDepthRatio(midwaterLayer!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(-0.18)
    expect(getDepthRatio(midwaterLayer!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(-0.14)
    expect((midwaterLayer?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
    expect(getBottomClearanceRatio(substrateGlow!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(0.05)
    expect(getBottomClearanceRatio(substrateGlow!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(0.058)
    expect(getDepthRatio(backCaustics!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(-0.4)
  })

  it('keeps hero lighting anchors tank-relative when the tank dimensions grow', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    setTankDimensions(instance, EXPANDED_TANK_DIMENSIONS)

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const lightCanopy = internals.tank.children.find((child) => child.name === 'tank-light-canopy') as THREE.Mesh | undefined
    const nearSurfaceBand0 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-0') as THREE.Mesh | undefined
    const nearSurfaceBand1 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-1') as THREE.Mesh | undefined
    const nearSurfaceBand2 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-2') as THREE.Mesh | undefined
    const midwaterLayer = internals.tank.children.find((child) => child.name === 'tank-light-midwater') as THREE.Mesh | undefined
    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined

    expect(lightCanopy).toBeDefined()
    expect(nearSurfaceBand0).toBeDefined()
    expect(nearSurfaceBand1).toBeDefined()
    expect(nearSurfaceBand2).toBeDefined()
    expect(midwaterLayer).toBeDefined()
    expect(heroRimLight).toBeDefined()
    expect(heroGroundGlow).toBeDefined()

    expect(getWidthRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.162)
    expect(getWidthRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.142)
    expect(getWidthRatio(nearSurfaceBand1!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.025)
    expect(getWidthRatio(nearSurfaceBand1!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.033)
    expect(getWidthRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.158)
    expect(getWidthRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.178)
    expect(getTopClearanceRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.195)
    expect(getTopClearanceRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.215)
    expect(getTopClearanceRatio(nearSurfaceBand1!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.18)
    expect(getTopClearanceRatio(nearSurfaceBand1!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.2)
    expect(getTopClearanceRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.205)
    expect(getTopClearanceRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.225)
    expect(getWidthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.022)
    expect(getWidthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.029)
    expect(getHeightRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.079)
    expect(getHeightRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.088)
    expect(getDepthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.18)
    expect(getDepthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.14)
    expect(getWidthRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.024)
    expect(getWidthRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.035)
    expect(getTopClearanceRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.105)
    expect(getTopClearanceRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.116)
    expect(getWidthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.104)
    expect(getWidthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.118)
    expect(getDepthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.19)
    expect(getDepthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.17)
    expect(getWidthRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.067)
    expect(getWidthRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.076)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.05)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.058)
    expect(getDepthRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.09)
    expect(getDepthRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.07)
  })

  it('adds hardscape-linked occlusion pools and backwall cutouts instead of leaving the tank evenly lit', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const driftwoodOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-driftwood'
    )) as THREE.Mesh | undefined
    const ridgeOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-ridge'
    )) as THREE.Mesh | undefined
    const backwallOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-backwall'
    )) as THREE.Mesh | undefined
    const midwaterLayer = internals.tank.children.find((child) => (
      child.name === 'tank-light-midwater'
    )) as THREE.Mesh | undefined

    expect(driftwoodOcclusion).toBeDefined()
    expect(ridgeOcclusion).toBeDefined()
    expect(backwallOcclusion).toBeDefined()
    expect(midwaterLayer).toBeDefined()
    expect(driftwoodOcclusion?.position.x).toBeLessThan(0.2)
    expect(ridgeOcclusion?.position.x).toBeGreaterThan(1.2)
    expect(backwallOcclusion?.position.z).toBeLessThan(-4.6)
    expect(driftwoodOcclusion?.renderOrder).toBeGreaterThan(midwaterLayer?.renderOrder ?? 0)
    expect(ridgeOcclusion?.renderOrder).toBeGreaterThan(midwaterLayer?.renderOrder ?? 0)
    expect((driftwoodOcclusion?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.NormalBlending)
  })

  it('adds a rear hero rim light panel to separate the hardscape silhouette from the backdrop', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)

    createAdvancedTank()

    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined

    expect(heroRimLight).toBeDefined()
    expect(getDepthRatio(heroRimLight!.position, AQUARIUM_TANK_DIMENSIONS)).toBeGreaterThan(-0.19)
    expect(getDepthRatio(heroRimLight!.position, AQUARIUM_TANK_DIMENSIONS)).toBeLessThan(-0.17)
    expect((heroRimLight?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })
})

describe('AdvancedAquariumScene lighting', () => {
  it('uses tank-relative main light anchors while keeping premium key and rim balance', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      scene: THREE.Scene
      primaryShadowLight: THREE.DirectionalLight | null
      fillLight: THREE.DirectionalLight | null
      bounceLight: THREE.PointLight | null
      rimLight: THREE.DirectionalLight | null
    }

    internals.scene = new THREE.Scene()

    const setupAdvancedLighting = (AdvancedAquariumScene.prototype as unknown as {
      setupAdvancedLighting: () => void
    }).setupAdvancedLighting.bind(instance)

    setupAdvancedLighting()

    const strongestLight = internals.primaryShadowLight
    const fillLight = internals.fillLight
    const bounceLight = internals.bounceLight
    const rearRimLight = internals.rimLight
    const defaultControlsTarget = resolveDefaultControlsTarget(AQUARIUM_TANK_DIMENSIONS)

    expect(strongestLight).toBeDefined()
    expect(fillLight).toBeDefined()
    expect(bounceLight).toBeDefined()
    expect(rearRimLight).toBeDefined()
    const sunLight = strongestLight!
    const frontFillLight = fillLight!
    const substrateBounceLight = bounceLight!
    const rimLight = rearRimLight!

    expect(sunLight.intensity).toBeGreaterThan(1.5)
    expect(rimLight.intensity).toBeGreaterThan(0.08)
    expect(rimLight.intensity).toBeLessThan(0.18)
    expectRatioInRange(getWidthRatio(sunLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.x)
    expectRatioInRange(getHeightRatio(sunLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.y)
    expectRatioInRange(getDepthRatio(sunLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.z)
    expectRatioInRange(getWidthRatio(frontFillLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.x)
    expectRatioInRange(getHeightRatio(frontFillLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.y)
    expectRatioInRange(getDepthRatio(frontFillLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.z)
    expectRatioInRange(getWidthRatio(substrateBounceLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.x)
    expectRatioInRange(getHeightRatio(substrateBounceLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.y)
    expectRatioInRange(getDepthRatio(substrateBounceLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.z)
    expectRatioInRange(getWidthRatio(rimLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.x)
    expectRatioInRange(getHeightRatio(rimLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.y)
    expectRatioInRange(getDepthRatio(rimLight.position, AQUARIUM_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.z)
    expectRatioInRange(
      (sunLight.target.position.x - defaultControlsTarget.x) / AQUARIUM_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.x
    )
    expectRatioInRange(
      (sunLight.target.position.y - defaultControlsTarget.y) / AQUARIUM_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.y
    )
    expectRatioInRange(
      (sunLight.target.position.z - defaultControlsTarget.z) / AQUARIUM_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.z
    )
    expectRatioInRange(
      (frontFillLight.target.position.x - defaultControlsTarget.x) / AQUARIUM_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.x
    )
    expectRatioInRange(
      (frontFillLight.target.position.y - defaultControlsTarget.y) / AQUARIUM_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.y
    )
    expectRatioInRange(
      (frontFillLight.target.position.z - defaultControlsTarget.z) / AQUARIUM_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.z
    )
    expectRatioInRange(
      (rimLight.target.position.x - defaultControlsTarget.x) / AQUARIUM_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.x
    )
    expectRatioInRange(
      (rimLight.target.position.y - defaultControlsTarget.y) / AQUARIUM_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.y
    )
    expectRatioInRange(
      (rimLight.target.position.z - defaultControlsTarget.z) / AQUARIUM_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.z
    )
    expectRatioInRange(
      (sunLight.shadow.camera as THREE.OrthographicCamera).left / AQUARIUM_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.left
    )
    expectRatioInRange(
      (sunLight.shadow.camera as THREE.OrthographicCamera).right / AQUARIUM_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.right
    )
    expect(sunLight.shadow.normalBias).toBeGreaterThan(0)
  })

  it('scales the main light rig positions, target, and frustum relative to the tank dimensions', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      scene: THREE.Scene
      primaryShadowLight: THREE.DirectionalLight | null
      fillLight: THREE.DirectionalLight | null
      bounceLight: THREE.PointLight | null
      rimLight: THREE.DirectionalLight | null
    }

    internals.scene = new THREE.Scene()
    setTankDimensions(instance, EXPANDED_TANK_DIMENSIONS)

    const setupAdvancedLighting = (AdvancedAquariumScene.prototype as unknown as {
      setupAdvancedLighting: () => void
    }).setupAdvancedLighting.bind(instance)

    setupAdvancedLighting()

    const primaryShadowLight = internals.primaryShadowLight
    const fillLight = internals.fillLight
    const bounceLight = internals.bounceLight
    const rimLight = internals.rimLight
    const defaultControlsTarget = resolveDefaultControlsTarget(EXPANDED_TANK_DIMENSIONS)

    expect(primaryShadowLight).toBeDefined()
    expect(fillLight).toBeDefined()
    expect(bounceLight).toBeDefined()
    expect(rimLight).toBeDefined()
    expectRatioInRange(getWidthRatio(primaryShadowLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.x)
    expectRatioInRange(getHeightRatio(primaryShadowLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.y)
    expectRatioInRange(getDepthRatio(primaryShadowLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.sun.z)
    expectRatioInRange(getWidthRatio(fillLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.x)
    expectRatioInRange(getHeightRatio(fillLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.y)
    expectRatioInRange(getDepthRatio(fillLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.fill.z)
    expectRatioInRange(getWidthRatio(bounceLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.x)
    expectRatioInRange(getHeightRatio(bounceLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.y)
    expectRatioInRange(getDepthRatio(bounceLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.bounce.z)
    expectRatioInRange(getWidthRatio(rimLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.x)
    expectRatioInRange(getHeightRatio(rimLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.y)
    expectRatioInRange(getDepthRatio(rimLight!.position, EXPANDED_TANK_DIMENSIONS), AQUARIUM_MAIN_LIGHT_RIG.positions.rim.z)
    expectRatioInRange(
      (primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).left / EXPANDED_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.left
    )
    expectRatioInRange(
      (primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).right / EXPANDED_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.right
    )
    expectRatioInRange(
      (primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).top / EXPANDED_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.top
    )
    expectRatioInRange(
      (primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).bottom / EXPANDED_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.shadowFrustumRatios.bottom
    )
    expectRatioInRange(
      (primaryShadowLight!.target.position.x - defaultControlsTarget.x) / EXPANDED_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.x
    )
    expectRatioInRange(
      (primaryShadowLight!.target.position.y - defaultControlsTarget.y) / EXPANDED_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.y
    )
    expectRatioInRange(
      (primaryShadowLight!.target.position.z - defaultControlsTarget.z) / EXPANDED_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.sun.z
    )
    expectRatioInRange(
      (fillLight!.target.position.x - defaultControlsTarget.x) / EXPANDED_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.x
    )
    expectRatioInRange(
      (fillLight!.target.position.y - defaultControlsTarget.y) / EXPANDED_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.y
    )
    expectRatioInRange(
      (fillLight!.target.position.z - defaultControlsTarget.z) / EXPANDED_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.fill.z
    )
    expectRatioInRange(
      (rimLight!.target.position.x - defaultControlsTarget.x) / EXPANDED_TANK_DIMENSIONS.width,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.x
    )
    expectRatioInRange(
      (rimLight!.target.position.y - defaultControlsTarget.y) / EXPANDED_TANK_DIMENSIONS.height,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.y
    )
    expectRatioInRange(
      (rimLight!.target.position.z - defaultControlsTarget.z) / EXPANDED_TANK_DIMENSIONS.depth,
      AQUARIUM_MAIN_LIGHT_RIG.targets.rim.z
    )
    expect((primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).left / EXPANDED_TANK_DIMENSIONS.width).toBeLessThan(-0.69)
    expect((primaryShadowLight!.shadow.camera as THREE.OrthographicCamera).right / EXPANDED_TANK_DIMENSIONS.width).toBeGreaterThan(0.69)
  })
})

describe('AdvancedAquariumScene post-processing', () => {
  it('adds an OutputPass after the RenderPass so composer output owns the final color conversion', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: {
        getPixelRatio: () => number
        getSize: (target: THREE.Vector2) => { width: number; height: number }
      }
      composer: { passes: Array<{ constructor: { name: string } }> }
      scene: THREE.Scene
      camera: THREE.PerspectiveCamera
    }

    internals.renderer = {
      getPixelRatio: () => 1,
      getSize: (target: THREE.Vector2) => {
        target.set(1280, 720)
        return { width: 1280, height: 720 }
      }
    }
    internals.scene = new THREE.Scene()
    internals.camera = new THREE.PerspectiveCamera()

    const setupComposer = (AdvancedAquariumScene.prototype as unknown as {
      setupComposer: () => void
    }).setupComposer.bind(instance)

    setupComposer()

    expect(internals.composer.passes.map((pass) => pass.constructor.name)).toEqual([
      'RenderPass',
      'OutputPass'
    ])
  })
})

describe('AdvancedAquariumScene substrate', () => {
  it('builds a rectangular floor that matches the tank footprint', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const baseMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-base') as THREE.Mesh
    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh

    expect(baseMesh.geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect((baseMesh.geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(AQUARIUM_TANK_DIMENSIONS.width + 0.6)
    expect((baseMesh.geometry as THREE.BoxGeometry).parameters.depth).toBeCloseTo(AQUARIUM_TANK_DIMENSIONS.depth + 0.6)

    expect(sandMesh.geometry).toBeInstanceOf(THREE.PlaneGeometry)
    expect((sandMesh.geometry as THREE.PlaneGeometry).parameters.width).toBeCloseTo(AQUARIUM_TANK_DIMENSIONS.width)
    expect((sandMesh.geometry as THREE.PlaneGeometry).parameters.height).toBeCloseTo(AQUARIUM_TANK_DIMENSIONS.depth)
  })

  it('uses muted sand tones instead of a bright white substrate', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const baseMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-base') as THREE.Mesh
    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh
    const baseMaterial = baseMesh.material as THREE.MeshStandardMaterial
    const sandMaterial = sandMesh.material as THREE.MeshStandardMaterial

    expect(baseMaterial.color.getHexString()).toBe('b59e84')
    expect(sandMaterial.color.getHexString()).toBe('d2bb9b')
  })

  it('adds a textured front face so the substrate reads deeper from the viewing angle', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandTop = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh
    const sandFront = internals.tank.children.find((child) => child.name === 'tank-substrate-front') as THREE.Mesh

    expect(sandFront).toBeDefined()
    expect(sandFront.geometry).toBeInstanceOf(THREE.PlaneGeometry)
    expect(sandFront.position.z).toBeGreaterThan(sandTop.position.z)
  })

  it('uses normal and roughness detail on the sand material', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh
    const sandMaterial = sandMesh.material as THREE.MeshStandardMaterial

    expect(sandMaterial.normalMap).toBeInstanceOf(THREE.Texture)
    expect(sandMaterial.roughnessMap).toBeInstanceOf(THREE.Texture)
  })

  it('adds a translucent sediment detail layer so the substrate does not read as a single flat sand sheet', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandTop = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh
    const sedimentDetail = internals.tank.children.find((child) => child.name === 'tank-substrate-detail') as THREE.Mesh | undefined
    const detailMaterial = sedimentDetail?.material as THREE.MeshStandardMaterial | undefined

    expect(sedimentDetail).toBeDefined()
    expect(sedimentDetail?.position.y).toBeGreaterThan(sandTop.position.y)
    expect(detailMaterial?.transparent).toBe(true)
    expect(detailMaterial?.map).toBeInstanceOf(THREE.Texture)
    expect(detailMaterial?.alphaMap).toBeInstanceOf(THREE.Texture)
  })

  it('adds a front sediment overlay so the ground keeps layered shading from the viewing angle', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSandTexture: () => THREE.CanvasTexture
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
      createSandAoTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandAoTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandFront = internals.tank.children.find((child) => child.name === 'tank-substrate-front') as THREE.Mesh
    const frontDetail = internals.tank.children.find((child) => child.name === 'tank-substrate-front-detail') as THREE.Mesh | undefined
    const detailMaterial = frontDetail?.material as THREE.MeshStandardMaterial | undefined

    expect(frontDetail).toBeDefined()
    expect(frontDetail?.position.z).toBeGreaterThan(sandFront.position.z)
    expect(detailMaterial?.transparent).toBe(true)
    expect(detailMaterial?.alphaMap).toBeInstanceOf(THREE.Texture)
  })

  it('prefers authored substrate maps and prepares uv2 for ao when premium visual assets are available', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const albedo = new THREE.Texture()
    const normal = new THREE.Texture()
    const roughness = new THREE.Texture()
    const ao = new THREE.Texture()
    const internals = instance as unknown as {
      tank: THREE.Group
      renderer: { capabilities: { getMaxAnisotropy: () => number } }
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, unknown>
        environment: Record<string, THREE.Texture | null>
        manifest: { textures: unknown[]; models: unknown[]; environment: unknown[] }
      } | undefined
      createSandTexture: () => THREE.Texture
      createSandNormalTexture: () => THREE.Texture
      createSandRoughnessTexture: () => THREE.Texture
      createSubstrateDetailTexture: () => THREE.Texture
      createSubstrateDetailAlphaTexture: () => THREE.Texture
    }

    internals.tank = new THREE.Group()
    internals.renderer = {
      capabilities: {
        getMaxAnisotropy: () => 8
      }
    }
    internals.visualAssets = {
      manifest: { textures: [], models: [], environment: [] },
      textures: {
        'substrate-sand-albedo': albedo,
        'substrate-sand-normal': normal,
        'substrate-sand-roughness': roughness,
        'substrate-sand-ao': ao
      },
      models: {},
      environment: {}
    }
    internals.createSandTexture = () => new THREE.Texture()
    internals.createSandNormalTexture = () => new THREE.Texture()
    internals.createSandRoughnessTexture = () => new THREE.Texture()
    internals.createSubstrateDetailTexture = () => new THREE.Texture()
    internals.createSubstrateDetailAlphaTexture = () => new THREE.Texture()

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh | undefined
    const sandMaterial = sandMesh?.material as THREE.MeshStandardMaterial | undefined
    const sandFrontMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-front') as THREE.Mesh | undefined
    const sandFrontMaterial = sandFrontMesh?.material as THREE.MeshStandardMaterial | undefined
    const uv2 = sandMesh?.geometry.getAttribute('uv2')

    expect(sandMaterial?.map).toBe(albedo)
    expect(sandMaterial?.normalMap).toBe(normal)
    expect(sandMaterial?.roughnessMap).toBe(roughness)
    expect(sandMaterial?.aoMap).toBe(ao)
    expect(sandFrontMaterial?.map).toBe(albedo)
    expect(sandFrontMaterial?.normalMap).toBe(normal)
    expect(sandFrontMaterial?.roughnessMap).toBe(roughness)
    expect(sandFrontMaterial?.aoMap).toBe(ao)
    expect(albedo.anisotropy).toBe(8)
    expect(uv2).toBeDefined()
  })

  it('falls back to procedural substrate maps when authored sand textures are missing', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const fallbackAlbedo = new THREE.Texture()
    const fallbackNormal = new THREE.Texture()
    const fallbackRoughness = new THREE.Texture()
    const fallbackAo = new THREE.Texture()
    const createSandTexture = vi.fn(() => fallbackAlbedo)
    const createSandNormalTexture = vi.fn(() => fallbackNormal)
    const createSandRoughnessTexture = vi.fn(() => fallbackRoughness)
    const createSandAoTexture = vi.fn(() => fallbackAo)
    const internals = instance as unknown as {
      tank: THREE.Group
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, unknown>
        environment: Record<string, THREE.Texture | null>
        manifest: { textures: unknown[]; models: unknown[]; environment: unknown[] }
      } | undefined
      createSandTexture: () => THREE.Texture
      createSandNormalTexture: () => THREE.Texture
      createSandRoughnessTexture: () => THREE.Texture
      createSandAoTexture: () => THREE.Texture
      createSubstrateDetailTexture: () => THREE.Texture
      createSubstrateDetailAlphaTexture: () => THREE.Texture
    }

    internals.tank = new THREE.Group()
    internals.visualAssets = {
      manifest: { textures: [], models: [], environment: [] },
      textures: {
        'substrate-sand-albedo': null,
        'substrate-sand-normal': null,
        'substrate-sand-roughness': null,
        'substrate-sand-ao': null
      },
      models: {},
      environment: {}
    }
    internals.createSandTexture = createSandTexture
    internals.createSandNormalTexture = createSandNormalTexture
    internals.createSandRoughnessTexture = createSandRoughnessTexture
    internals.createSandAoTexture = createSandAoTexture
    internals.createSubstrateDetailTexture = () => new THREE.Texture()
    internals.createSubstrateDetailAlphaTexture = () => new THREE.Texture()

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: CreateSubstrateFn
    }).createSubstrate.bind(instance)

    createSubstrate(AQUARIUM_TANK_DIMENSIONS)

    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh | undefined
    const sandFrontMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-front') as THREE.Mesh | undefined
    const sandMaterial = sandMesh?.material as THREE.MeshStandardMaterial | undefined
    const sandFrontMaterial = sandFrontMesh?.material as THREE.MeshStandardMaterial | undefined

    expect(createSandTexture).toHaveBeenCalledTimes(1)
    expect(createSandNormalTexture).toHaveBeenCalledTimes(1)
    expect(createSandRoughnessTexture).toHaveBeenCalledTimes(1)
    expect(createSandAoTexture).toHaveBeenCalledTimes(1)
    expect(sandMaterial?.map).toBe(fallbackAlbedo)
    expect(sandMaterial?.normalMap).toBe(fallbackNormal)
    expect(sandMaterial?.roughnessMap).toBe(fallbackRoughness)
    expect(sandMaterial?.aoMap).toBe(fallbackAo)
    expect(sandFrontMaterial?.map).toBe(fallbackAlbedo)
    expect(sandFrontMaterial?.normalMap).toBe(fallbackNormal)
    expect(sandFrontMaterial?.roughnessMap).toBe(fallbackRoughness)
    expect(sandFrontMaterial?.aoMap).toBe(fallbackAo)
  })

  it('keeps substrate detail layers valid in both simple and standard quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const substrateDetailMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.58 })
    )
    const substrateFrontDetailMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.62 })
    )
    substrateDetailMesh.userData.baseOpacity = 0.58
    substrateFrontDetailMesh.userData.baseOpacity = 0.62

    const internals = instance as unknown as {
      ensureTankVisualLayers: () => void
      applyLightingQuality: (quality: 'simple' | 'standard') => void
      glassPanes: THREE.Mesh[]
      glassEdgeHighlightMeshes: THREE.Mesh[]
      wallPanelMeshes: THREE.Mesh[]
      nearSurfaceLightMeshes: THREE.Mesh[]
      midwaterLightMeshes: THREE.Mesh[]
      causticsMeshes: THREE.Mesh[]
      hardscapeOcclusionMeshes: THREE.Mesh[]
      waterVolumeMesh: THREE.Mesh | null
      waterSurfaceMesh: THREE.Mesh | null
      frontGlassHighlightMesh: THREE.Mesh | null
      waterSurfaceHighlightMesh: THREE.Mesh | null
      waterlineFrontMesh: THREE.Mesh | null
      depthMidgroundMesh: THREE.Mesh | null
      foregroundShadowMesh: THREE.Mesh | null
      lightCanopyMesh: THREE.Mesh | null
      heroRimLightMesh: THREE.Mesh | null
      heroGroundGlowMesh: THREE.Mesh | null
      substrateDetailMesh: THREE.Mesh | null
      substrateFrontDetailMesh: THREE.Mesh | null
    }

    internals.ensureTankVisualLayers = vi.fn()
    internals.applyLightingQuality = vi.fn()
    internals.glassPanes = []
    internals.glassEdgeHighlightMeshes = []
    internals.wallPanelMeshes = []
    internals.nearSurfaceLightMeshes = []
    internals.midwaterLightMeshes = []
    internals.causticsMeshes = []
    internals.hardscapeOcclusionMeshes = []
    internals.waterVolumeMesh = null
    internals.waterSurfaceMesh = null
    internals.frontGlassHighlightMesh = null
    internals.waterSurfaceHighlightMesh = null
    internals.waterlineFrontMesh = null
    internals.depthMidgroundMesh = null
    internals.foregroundShadowMesh = null
    internals.lightCanopyMesh = null
    internals.heroRimLightMesh = null
    internals.heroGroundGlowMesh = null
    internals.substrateDetailMesh = substrateDetailMesh
    internals.substrateFrontDetailMesh = substrateFrontDetailMesh

    const applyVisualQuality = (AdvancedAquariumScene.prototype as unknown as {
      applyVisualQuality: (quality: 'simple' | 'standard') => void
    }).applyVisualQuality.bind(instance)

    applyVisualQuality('simple')

    expect(substrateDetailMesh.visible).toBe(true)
    expect(substrateFrontDetailMesh.visible).toBe(true)
    expect((substrateDetailMesh.material as THREE.MeshStandardMaterial).opacity).toBeCloseTo(0.58 * 0.52)
    expect((substrateFrontDetailMesh.material as THREE.MeshStandardMaterial).opacity).toBeCloseTo(0.62 * 0.56)

    applyVisualQuality('standard')

    expect((substrateDetailMesh.material as THREE.MeshStandardMaterial).opacity).toBeCloseTo(0.58)
    expect((substrateFrontDetailMesh.material as THREE.MeshStandardMaterial).opacity).toBeCloseTo(0.62)
  })

  it('uses denser top and front subdivisions so silhouette shaping survives in simple quality', () => {
    const { sandTop, sandFront } = createSubstrateTestScene()
    const topGeometry = sandTop.geometry as THREE.PlaneGeometry
    const frontGeometry = sandFront.geometry as THREE.PlaneGeometry

    expect(topGeometry.parameters.widthSegments).toBeGreaterThanOrEqual(80)
    expect(topGeometry.parameters.heightSegments).toBeGreaterThanOrEqual(56)
    expect(frontGeometry.parameters.widthSegments).toBeGreaterThanOrEqual(64)
    expect(frontGeometry.parameters.heightSegments).toBeGreaterThanOrEqual(24)
  })

  it('breaks the top and front foreground crest into an irregular silhouette instead of a straight edge', () => {
    const { sandTop, sandFront } = createSubstrateTestScene()
    const topFrontEdgeHeights = getTopFrontEdgeHeights(sandTop)
    const frontTopEdgeHeights = getFrontTopEdgeHeights(sandFront)

    expect(getValueRange(topFrontEdgeHeights)).toBeGreaterThan(0.08)
    expect(getValueRange(frontTopEdgeHeights)).toBeGreaterThan(0.12)
  })

  it('sculpts a local sink and sand berm around the hero hardscape so it does not read as tabletop placement', () => {
    const { sandTop } = createSubstrateTestScene()
    const driftwoodAnchor = getHardscapeAnchor('driftwood-root-flare')
    const heroRockAnchor = getHardscapeAnchor('ridge-rock-hero')
    const toWorldPoint = (anchor: typeof driftwoodAnchor, offsetX = 0, offsetZ = 0) => ({
      x: (anchor.x + offsetX) * AQUARIUM_TANK_DIMENSIONS.width,
      z: (anchor.z + offsetZ) * AQUARIUM_TANK_DIMENSIONS.depth
    })
    const getRimAverageHeight = (anchor: typeof driftwoodAnchor) => {
      const sampleOffsets: Array<[number, number]> = [
        [anchor.rimBiasX - (anchor.radiusX * 0.55), anchor.rimBiasZ],
        [anchor.rimBiasX + (anchor.radiusX * 0.55), anchor.rimBiasZ],
        [anchor.rimBiasX, anchor.rimBiasZ - (anchor.radiusZ * 0.55)],
        [anchor.rimBiasX, anchor.rimBiasZ + (anchor.radiusZ * 0.55)]
      ]

      return sampleOffsets.reduce((sum, [offsetX, offsetZ]) => {
        const samplePoint = toWorldPoint(anchor, offsetX, offsetZ)
        return sum + getNearestTopHeight(sandTop, samplePoint.x, samplePoint.z)
      }, 0) / sampleOffsets.length
    }

    const driftwoodContactPoint = toWorldPoint(driftwoodAnchor)
    const heroRockContactPoint = toWorldPoint(heroRockAnchor)
    const driftwoodContact = getNearestTopHeight(sandTop, driftwoodContactPoint.x, driftwoodContactPoint.z)
    const driftwoodRing = getRimAverageHeight(driftwoodAnchor)
    const rockContact = getNearestTopHeight(sandTop, heroRockContactPoint.x, heroRockContactPoint.z)
    const rockRing = getRimAverageHeight(heroRockAnchor)

    expect(driftwoodRing - driftwoodContact).toBeGreaterThan(0.02)
    expect(rockRing - rockContact).toBeGreaterThan(0.02)
  })
})

describe('AdvancedAquariumScene quality scaling', () => {
  it('uses different exposure and light balances for simple and standard quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: {
        toneMappingExposure: number
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      particleSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      primaryShadowLight: { shadow: { mapSize: { width: number; height: number } } } | null
      hemiLight: THREE.HemisphereLight | null
      fillLight: THREE.DirectionalLight | null
      bounceLight: THREE.PointLight | null
      rimLight: THREE.DirectionalLight | null
      getViewportSize: () => { width: number; height: number }
    }

    internals.renderer = {
      toneMappingExposure: 1.2,
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = null
    internals.fishSystem = null
    internals.particleSystem = null
    internals.primaryShadowLight = { shadow: { mapSize: { width: 4096, height: 4096 } } }
    internals.hemiLight = new THREE.HemisphereLight()
    internals.fillLight = new THREE.DirectionalLight()
    internals.bounceLight = new THREE.PointLight()
    internals.rimLight = new THREE.DirectionalLight()
    internals.getViewportSize = () => ({ width: 1600, height: 900 })

    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    setWaterQuality('simple')
    const simpleExposure = internals.renderer.toneMappingExposure
    const simpleHemi = internals.hemiLight.intensity
    const simpleRim = internals.rimLight.intensity

    setWaterQuality('standard')

    expect(internals.renderer.toneMappingExposure).toBeGreaterThan(simpleExposure)
    expect(internals.hemiLight.intensity).toBeGreaterThan(simpleHemi)
    expect(internals.rimLight.intensity).toBeGreaterThan(simpleRim)
  })

  it('keeps shadows and core texture layers on simple quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
      renderer: {
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      particleSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      primaryShadowLight: { shadow: { mapSize: { width: number; height: number } } } | null
      getViewportSize: () => { width: number; height: number }
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = { resize: vi.fn() }
    internals.fishSystem = { setQuality: vi.fn() }
    internals.particleSystem = { setQuality: vi.fn() }
    internals.primaryShadowLight = { shadow: { mapSize: { width: 4096, height: 4096 } } }
    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    setTankDimensions(instance, EXPANDED_TANK_DIMENSIONS)

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)
    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    createAdvancedTank()
    setWaterQuality('simple')

    const waterVolume = internals.tank.children.find((child) => child.name === 'tank-water-volume') as THREE.Mesh | undefined
    const waterSurface = internals.tank.children.find((child) => child.name === 'tank-water-surface') as THREE.Mesh | undefined
    const waterSurfaceHighlight = internals.tank.children.find((child) => child.name === 'tank-water-surface-highlight') as THREE.Mesh | undefined
    const caustics = internals.tank.children.find((child) => child.name === 'tank-caustics-floor') as THREE.Mesh | undefined
    const frontGlassHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-front-highlight') as THREE.Mesh | undefined
    const leftEdgeHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-edge-highlight-left') as THREE.Mesh | undefined
    const waterlineFront = internals.tank.children.find((child) => child.name === 'tank-waterline-front') as THREE.Mesh | undefined
    const midground = internals.tank.children.find((child) => child.name === 'tank-depth-midground') as THREE.Mesh | undefined
    const foreground = internals.tank.children.find((child) => child.name === 'tank-depth-foreground-shadow') as THREE.Mesh | undefined
    const lightCanopy = internals.tank.children.find((child) => child.name === 'tank-light-canopy') as THREE.Mesh | undefined
    const nearSurfaceBand0 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-0') as THREE.Mesh | undefined
    const nearSurfaceBand1 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-1') as THREE.Mesh | undefined
    const nearSurfaceBand2 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-2') as THREE.Mesh | undefined
    const midwaterLayer = internals.tank.children.find((child) => child.name === 'tank-light-midwater') as THREE.Mesh | undefined
    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined
    const driftwoodOcclusion = internals.tank.children.find((child) => child.name === 'tank-hardscape-occlusion-driftwood') as THREE.Mesh | undefined
    const ridgeOcclusion = internals.tank.children.find((child) => child.name === 'tank-hardscape-occlusion-ridge') as THREE.Mesh | undefined
    const backwallOcclusion = internals.tank.children.find((child) => child.name === 'tank-hardscape-occlusion-backwall') as THREE.Mesh | undefined

    expect(internals.renderer.setPixelRatio).toHaveBeenCalledWith(1)
    expect(internals.renderer.shadowMap.enabled).toBe(true)
    expect(internals.renderer.shadowMap.type).toBe(THREE.PCFShadowMap)
    expect(internals.primaryShadowLight?.shadow.mapSize.width).toBe(2048)
    expect(internals.primaryShadowLight?.shadow.mapSize.height).toBe(2048)
    expect(waterVolume?.visible).toBe(true)
    expect(caustics?.visible).toBe(true)
    expect(waterSurface?.visible).toBe(true)
    expect(waterSurfaceHighlight?.visible).toBe(false)
    expect(frontGlassHighlight?.visible).toBe(true)
    expect(leftEdgeHighlight?.visible).toBe(true)
    expect(waterlineFront?.visible).toBe(false)
    expect(midground?.visible).toBe(true)
    expect(foreground?.visible).toBe(false)
    expect(lightCanopy?.visible).toBe(true)
    expect(nearSurfaceBand0?.visible).toBe(true)
    expect(nearSurfaceBand1?.visible).toBe(true)
    expect(nearSurfaceBand2?.visible).toBe(true)
    expect(midwaterLayer?.visible).toBe(true)
    expect(getTopClearanceRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.105)
    expect(getTopClearanceRatio(lightCanopy!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.116)
    expect(getWidthRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.162)
    expect(getWidthRatio(nearSurfaceBand0!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.142)
    expect(getDepthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(-0.18)
    expect(getDepthRatio(midwaterLayer!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(-0.14)
    expect((midwaterLayer?.material as THREE.MeshBasicMaterial | undefined)?.opacity).toBeGreaterThan(0)
    expect(heroRimLight?.visible).toBe(true)
    expect(heroGroundGlow?.visible).toBe(true)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.05)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.058)
    expect(driftwoodOcclusion?.visible).toBe(true)
    expect(ridgeOcclusion?.visible).toBe(true)
    expect(backwallOcclusion?.visible).toBe(true)
  })

  it('keeps the richer hero layers on standard quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
      renderer: {
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      primaryShadowLight: { shadow: { mapSize: { width: number; height: number } } } | null
      getViewportSize: () => { width: number; height: number }
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFShadowMap }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = { resize: vi.fn() }
    internals.fishSystem = { setQuality: vi.fn() }
    internals.primaryShadowLight = { shadow: { mapSize: { width: 2048, height: 2048 } } }
    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    setTankDimensions(instance, EXPANDED_TANK_DIMENSIONS)

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)
    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    createAdvancedTank()
    setWaterQuality('standard')

    const midground = internals.tank.children.find((child) => child.name === 'tank-depth-midground') as THREE.Mesh | undefined
    const foreground = internals.tank.children.find((child) => child.name === 'tank-depth-foreground-shadow') as THREE.Mesh | undefined
    const lightCanopy = internals.tank.children.find((child) => child.name === 'tank-light-canopy') as THREE.Mesh | undefined
    const nearSurfaceBand2 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-2') as THREE.Mesh | undefined
    const midwaterLayer = internals.tank.children.find((child) => child.name === 'tank-light-midwater') as THREE.Mesh | undefined
    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined
    const backwallOcclusion = internals.tank.children.find((child) => child.name === 'tank-hardscape-occlusion-backwall') as THREE.Mesh | undefined

    expect(internals.renderer.shadowMap.enabled).toBe(true)
    expect(internals.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
    expect(internals.primaryShadowLight?.shadow.mapSize.width).toBe(4096)
    expect(midground?.visible).toBe(true)
    expect(foreground?.visible).toBe(true)
    expect(lightCanopy?.visible).toBe(true)
    expect(nearSurfaceBand2?.visible).toBe(true)
    expect(getWidthRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.158)
    expect(getWidthRatio(nearSurfaceBand2!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.178)
    expect(midwaterLayer?.visible).toBe(true)
    expect(heroRimLight?.visible).toBe(true)
    expect(getWidthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.104)
    expect(getWidthRatio(heroRimLight!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.118)
    expect(heroGroundGlow?.visible).toBe(true)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeGreaterThan(0.05)
    expect(getBottomClearanceRatio(heroGroundGlow!.position, EXPANDED_TANK_DIMENSIONS)).toBeLessThan(0.058)
    expect(backwallOcclusion?.visible).toBe(true)
  })

  it('forwards quality changes to the particle system so dense water haze can scale down cleanly', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: {
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      particleSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      getViewportSize: () => { width: number; height: number }
      applyVisualQuality: (quality: 'simple' | 'standard') => void
      currentVisualQuality: 'simple' | 'standard'
    }

    internals.renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = { resize: vi.fn() }
    internals.fishSystem = { setQuality: vi.fn() }
    internals.particleSystem = { setQuality: vi.fn() }
    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    internals.applyVisualQuality = vi.fn()
    internals.currentVisualQuality = 'standard'

    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    setWaterQuality('simple')

    expect(internals.particleSystem.setQuality).toHaveBeenCalledWith('simple')
  })

  it('refreshes the renderer pipeline when switching quality tiers with different antialias settings', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: {
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: { setSize: (width: number, height: number) => void }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      particleSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      getViewportSize: () => { width: number; height: number }
      applyVisualQuality: (quality: 'simple' | 'standard') => void
      syncRendererPipelineForQuality: (quality: 'simple' | 'standard') => void
      currentVisualQuality: 'simple' | 'standard'
    }

    internals.renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
    }
    internals.composer = { setSize: vi.fn() }
    internals.godRaysEffect = { resize: vi.fn() }
    internals.fishSystem = { setQuality: vi.fn() }
    internals.particleSystem = { setQuality: vi.fn() }
    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    internals.applyVisualQuality = vi.fn()
    internals.syncRendererPipelineForQuality = vi.fn()
    internals.currentVisualQuality = 'standard'

    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    setWaterQuality('simple')

    expect(internals.syncRendererPipelineForQuality).toHaveBeenCalledWith('simple')
  })

  it('keeps the post-processing stack lightweight when quality changes', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      renderer: {
        toneMappingExposure: number
        setPixelRatio: (value: number) => void
        setSize: (width: number, height: number) => void
        shadowMap: { enabled: boolean; type: number }
      }
      composer: {
        passes: Array<{ constructor: { name: string } }>
        setSize: (width: number, height: number) => void
      }
      godRaysEffect: { resize: (width: number, height: number) => void } | null
      fishSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      particleSystem: { setQuality: (quality: 'simple' | 'standard') => void } | null
      getViewportSize: () => { width: number; height: number }
      applyVisualQuality: (quality: 'simple' | 'standard') => void
      syncRendererPipelineForQuality: (quality: 'simple' | 'standard') => void
      currentVisualQuality: 'simple' | 'standard'
    }

    internals.renderer = {
      toneMappingExposure: 1.2,
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
    }
    internals.composer = {
      passes: [
        { constructor: { name: 'RenderPass' } },
        { constructor: { name: 'OutputPass' } }
      ],
      setSize: vi.fn()
    }
    internals.godRaysEffect = null
    internals.fishSystem = null
    internals.particleSystem = null
    internals.getViewportSize = () => ({ width: 1600, height: 900 })
    internals.applyVisualQuality = vi.fn()
    internals.syncRendererPipelineForQuality = vi.fn()
    internals.currentVisualQuality = 'standard'

    const setWaterQuality = (AdvancedAquariumScene.prototype as unknown as {
      setWaterQuality: (quality: 'simple' | 'standard') => void
    }).setWaterQuality.bind(instance)

    setWaterQuality('simple')

    expect(internals.composer.passes).toHaveLength(2)
    expect(internals.composer.passes[1]?.constructor.name).toBe('OutputPass')
  })
})

describe('AdvancedAquariumScene theme application', () => {
  it('tints depth layers to match the active water theme', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: CreateSubstrateFn
      createBackdropTexture: () => THREE.CanvasTexture
      scene: THREE.Scene
      godRaysEffect: { applyTheme: (theme: Theme) => void } | null
    }

    const nextTheme: Theme = {
      waterTint: '#225577',
      fogDensity: 0.24,
      particleDensity: 0.2,
      waveStrength: 0.4,
      waveSpeed: 0.3,
      glassFrameStrength: 0.5,
      glassTint: '#a8dcea',
      glassReflectionStrength: 0.45,
      surfaceGlowStrength: 0.5,
      causticsStrength: 0.36
    }

    internals.tank = new THREE.Group()
    internals.createSubstrate = vi.fn()
    internals.createBackdropTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.scene = new THREE.Scene()
    internals.godRaysEffect = { applyTheme: vi.fn() }

    const createAdvancedTank = (AdvancedAquariumScene.prototype as unknown as {
      createAdvancedTank: () => void
    }).createAdvancedTank.bind(instance)
    const applyTankTheme = (AdvancedAquariumScene.prototype as unknown as {
      applyTankTheme: (theme: Theme) => void
    }).applyTankTheme.bind(instance)

    createAdvancedTank()
    applyTankTheme(nextTheme)

    const midground = internals.tank.children.find((child) => child.name === 'tank-depth-midground') as THREE.Mesh | undefined
    const foreground = internals.tank.children.find((child) => child.name === 'tank-depth-foreground-shadow') as THREE.Mesh | undefined
    const midgroundMaterial = midground?.material as THREE.MeshBasicMaterial | undefined
    const foregroundMaterial = foreground?.material as THREE.MeshBasicMaterial | undefined

    expect(midgroundMaterial?.color.getHexString()).not.toBe('3f7880')
    expect(foregroundMaterial?.color.getHexString()).not.toBe('07212a')
  })

  it('forwards the active theme to god rays when applying a theme to the scene', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      scene: THREE.Scene
      godRaysEffect: { applyTheme: (theme: Theme) => void } | null
      applyTankTheme: (theme: Theme) => void
      applyVisualQuality: (quality: 'simple' | 'standard') => void
      currentVisualQuality: 'simple' | 'standard'
    }

    const nextTheme: Theme = {
      waterTint: '#225577',
      fogDensity: 0.24,
      particleDensity: 0.2,
      waveStrength: 0.4,
      waveSpeed: 0.3,
      glassFrameStrength: 0.5,
      glassTint: '#a8dcea',
      glassReflectionStrength: 0.45,
      surfaceGlowStrength: 0.5,
      causticsStrength: 0.36
    }

    internals.scene = new THREE.Scene()
    internals.godRaysEffect = { applyTheme: vi.fn() }
    internals.applyTankTheme = vi.fn()
    internals.applyVisualQuality = vi.fn()
    internals.currentVisualQuality = 'standard'

    const applyTheme = (AdvancedAquariumScene.prototype as unknown as {
      applyTheme: (theme: Theme) => void
    }).applyTheme.bind(instance)

    applyTheme(nextTheme)

    expect(internals.godRaysEffect.applyTheme).toHaveBeenCalledWith(nextTheme)
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

describe('AdvancedAquariumScene backdrop textures', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
  })

  it('layers multiple depth glows into the backdrop texture', () => {
    const stats = {
      radialGradientCalls: 0,
      fillCalls: 0,
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
          fillRect: () => {
            stats.fillCalls += 1
          },
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          globalCompositeOperation: 'source-over',
          lineWidth: 0
        } as unknown as CanvasRenderingContext2D
      })

    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const createBackdropTexture = (AdvancedAquariumScene.prototype as unknown as {
      createBackdropTexture: () => THREE.CanvasTexture
    }).createBackdropTexture.bind(instance)

    createBackdropTexture()

    expect(stats.radialGradientCalls).toBeGreaterThanOrEqual(2)
    expect(stats.fillCalls).toBeGreaterThan(2)
    expect(stats.strokeCalls).toBeGreaterThan(0)
  })

  it('creates diffuse caustics clusters instead of repeated stripe strokes', () => {
    const stats = {
      radialGradientCalls: 0,
      fillCalls: 0,
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
          fillRect: () => {
            stats.fillCalls += 1
          },
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          stroke: () => {
            stats.strokeCalls += 1
          },
          fillStyle: '',
          strokeStyle: '',
          globalCompositeOperation: 'source-over',
          lineWidth: 0
        } as unknown as CanvasRenderingContext2D
      })

    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const createCausticsTexture = (AdvancedAquariumScene.prototype as unknown as {
      createCausticsTexture: () => THREE.CanvasTexture
    }).createCausticsTexture.bind(instance)

    createCausticsTexture()

    expect(stats.radialGradientCalls).toBeGreaterThan(6)
    expect(stats.fillCalls).toBeGreaterThan(6)
    expect(stats.strokeCalls).toBe(0)
  })
})
