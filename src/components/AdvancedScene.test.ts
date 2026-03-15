import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AdvancedAquariumScene } from './AdvancedScene'
import type { Theme } from '../types/aquarium'

const createSubstrateTestScene = () => {
  const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
  const internals = instance as unknown as {
    tank: THREE.Group
    createSandTexture: () => THREE.CanvasTexture
    createSandNormalTexture: () => THREE.CanvasTexture
    createSandRoughnessTexture: () => THREE.CanvasTexture
  }

  internals.tank = new THREE.Group()
  internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
  internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
  internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

  const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
    createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
  }).createSubstrate.bind(instance)

  createSubstrate(14, 14, 10)

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
    internals.defaultCameraPosition = new THREE.Vector3(0, 1.2, 11.8)
    internals.defaultControlsTarget = new THREE.Vector3(0, -0.9, 0.6)

    const setupCamera = (AdvancedAquariumScene.prototype as unknown as {
      setupCamera: () => void
    }).setupCamera.bind(instance)

    setupCamera()

    const direction = new THREE.Vector3()
    internals.camera.getWorldDirection(direction)

    expect(internals.camera.position.z).toBeCloseTo(11.8, 1)
    expect(internals.camera.position.y).toBeCloseTo(1.2, 1)
    expect(direction.y).toBeLessThan(-0.14)
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

    internals.photoModeControlsTarget = new THREE.Vector3(0.7, -0.35, 0.15)
    internals.tempPhotoModeTarget = new THREE.Vector3()
    internals.fishSystem = {
      getHeroFocusPoint: () => new THREE.Vector3(2.4, -0.1, 2.7)
    }

    const resolvePhotoModeTarget = (AdvancedAquariumScene.prototype as unknown as {
      resolvePhotoModeTarget: () => THREE.Vector3
    }).resolvePhotoModeTarget.bind(instance)

    const target = resolvePhotoModeTarget()

    expect(target.x).toBeGreaterThan(0.7)
    expect(target.z).toBeGreaterThan(0.15)
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

  it('adds an asset-backed backdrop overlay when premium visual assets are available', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const overlayTexture = new THREE.Texture()
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
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

  it('adds a waterline rim and edge glints so the tank reads as layered glass and water', () => {
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

    const leftEdgeHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-edge-highlight-left') as THREE.Mesh | undefined
    const rightEdgeHighlight = internals.tank.children.find((child) => child.name === 'tank-glass-edge-highlight-right') as THREE.Mesh | undefined
    const waterlineFront = internals.tank.children.find((child) => child.name === 'tank-waterline-front') as THREE.Mesh | undefined

    expect(leftEdgeHighlight).toBeDefined()
    expect(rightEdgeHighlight).toBeDefined()
    expect(waterlineFront).toBeDefined()
    expect(leftEdgeHighlight?.position.z).toBeGreaterThan(4.9)
    expect(rightEdgeHighlight?.position.x).toBeGreaterThan(6.5)
    expect((waterlineFront?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })

  it('adds interior wall response layers so the tank walls catch light instead of reading as empty planes', () => {
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

    const backWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-back-panel') as THREE.Mesh | undefined
    const leftWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-left-panel') as THREE.Mesh | undefined
    const rightWallPanel = internals.tank.children.find((child) => child.name === 'tank-wall-right-panel') as THREE.Mesh | undefined

    const backWallMaterial = backWallPanel?.material as THREE.MeshBasicMaterial | undefined

    expect(backWallPanel).toBeDefined()
    expect(leftWallPanel).toBeDefined()
    expect(rightWallPanel).toBeDefined()
    expect(backWallMaterial?.transparent).toBe(true)
    expect(backWallMaterial?.map).toBeInstanceOf(THREE.Texture)
    expect(backWallPanel?.position.z).toBeGreaterThan(-5)
    expect(leftWallPanel?.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(rightWallPanel?.rotation.y).toBeCloseTo(-Math.PI / 2)
  })

  it('stages midground and foreground depth layers for a richer hero shot', () => {
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

    const lightCanopy = internals.tank.children.find((child) => child.name === 'tank-light-canopy') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined

    expect(lightCanopy).toBeDefined()
    expect(heroGroundGlow).toBeDefined()
    expect(lightCanopy?.position.y).toBeGreaterThan(4.5)
    expect(heroGroundGlow?.position.y).toBeLessThan(-6)
    expect((heroGroundGlow?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })

  it('splits underwater lighting into near-surface shafts, midwater caustics shafts, and substrate/backwall depth bands', () => {
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

    const nearSurfaceBands = internals.tank.children.filter((child) => (
      child.name.startsWith('tank-light-near-surface-band-')
    )) as THREE.Mesh[]
    const midwaterShafts = internals.tank.children.filter((child) => (
      child.name.startsWith('tank-caustics-midwater-')
    )) as THREE.Mesh[]
    const substrateGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined
    const backCaustics = internals.tank.children.find((child) => child.name === 'tank-caustics-back') as THREE.Mesh | undefined

    expect(nearSurfaceBands).toHaveLength(3)
    expect(nearSurfaceBands.every((mesh) => mesh.position.y > 3.5)).toBe(true)
    expect(midwaterShafts).toHaveLength(3)
    expect(midwaterShafts.every((mesh) => mesh.position.y > -1.5)).toBe(true)
    expect(midwaterShafts.every((mesh) => mesh.position.y < 3.6)).toBe(true)
    expect(new Set(midwaterShafts.map((mesh) => mesh.position.x.toFixed(2))).size).toBeGreaterThan(1)
    expect(new Set(midwaterShafts.map((mesh) => mesh.rotation.z.toFixed(2))).size).toBeGreaterThan(1)
    expect(substrateGlow?.position.y).toBeLessThan(-6)
    expect(backCaustics?.position.z).toBeLessThan(-4.5)
  })

  it('adds hardscape-linked occlusion pools and midwater cutouts instead of leaving the tank evenly lit', () => {
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

    const driftwoodOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-driftwood'
    )) as THREE.Mesh | undefined
    const ridgeOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-ridge'
    )) as THREE.Mesh | undefined
    const backwallOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-backwall'
    )) as THREE.Mesh | undefined
    const driftwoodMidwaterOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-midwater-driftwood'
    )) as THREE.Mesh | undefined
    const ridgeMidwaterOcclusion = internals.tank.children.find((child) => (
      child.name === 'tank-hardscape-occlusion-midwater-ridge'
    )) as THREE.Mesh | undefined
    const midwaterShaft = internals.tank.children.find((child) => (
      child.name === 'tank-caustics-midwater-2'
    )) as THREE.Mesh | undefined

    expect(driftwoodOcclusion).toBeDefined()
    expect(ridgeOcclusion).toBeDefined()
    expect(backwallOcclusion).toBeDefined()
    expect(driftwoodMidwaterOcclusion).toBeDefined()
    expect(ridgeMidwaterOcclusion).toBeDefined()
    expect(midwaterShaft).toBeDefined()
    expect(driftwoodOcclusion?.position.x).toBeLessThan(0.2)
    expect(ridgeOcclusion?.position.x).toBeGreaterThan(1.2)
    expect(backwallOcclusion?.position.z).toBeLessThan(-4.6)
    expect(driftwoodMidwaterOcclusion?.position.y).toBeGreaterThan(-1)
    expect(ridgeMidwaterOcclusion?.position.y).toBeGreaterThan(-1)
    expect(driftwoodMidwaterOcclusion?.renderOrder).toBeGreaterThan(midwaterShaft?.renderOrder ?? 0)
    expect((driftwoodOcclusion?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.NormalBlending)
  })

  it('adds a rear hero rim light panel to separate the hardscape silhouette from the backdrop', () => {
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

    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined

    expect(heroRimLight).toBeDefined()
    expect(heroRimLight?.position.z).toBeLessThan(-1.2)
    expect((heroRimLight?.material as THREE.MeshBasicMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
  })
})

describe('AdvancedAquariumScene lighting', () => {
  it('uses a stronger hero key light and rear rim light for premium depth', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as { scene: THREE.Scene }

    internals.scene = new THREE.Scene()

    const setupAdvancedLighting = (AdvancedAquariumScene.prototype as unknown as {
      setupAdvancedLighting: () => void
    }).setupAdvancedLighting.bind(instance)

    setupAdvancedLighting()

    const directionalLights = internals.scene.children.filter(
      (child): child is THREE.DirectionalLight => child instanceof THREE.DirectionalLight
    )
    const strongestLight = directionalLights.reduce((current, light) => (
      light.intensity > current.intensity ? light : current
    ))
    const rearRimLight = directionalLights.find((light) => light.position.z < -13)

    expect(strongestLight.intensity).toBeGreaterThan(1.5)
    expect(rearRimLight?.intensity).toBeGreaterThan(0.08)
    expect(rearRimLight?.intensity).toBeLessThan(0.18)
    expect(strongestLight.position.y).toBeGreaterThan(12)
    expect(strongestLight.shadow.camera.left).toBeGreaterThan(-14)
    expect(strongestLight.shadow.camera.right).toBeLessThan(14)
    expect(strongestLight.shadow.normalBias).toBeGreaterThan(0)
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
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

    const baseMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-base') as THREE.Mesh
    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh

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
      createSandNormalTexture: () => THREE.CanvasTexture
      createSandRoughnessTexture: () => THREE.CanvasTexture
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

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
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

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
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

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
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

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
    }

    internals.tank = new THREE.Group()
    internals.createSandTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandNormalTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))
    internals.createSandRoughnessTexture = () => new THREE.CanvasTexture(document.createElement('canvas'))

    const createSubstrate = (AdvancedAquariumScene.prototype as unknown as {
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

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
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
    }).createSubstrate.bind(instance)

    createSubstrate(14, 14, 10)

    const sandMesh = internals.tank.children.find((child) => child.name === 'tank-substrate-top') as THREE.Mesh | undefined
    const sandMaterial = sandMesh?.material as THREE.MeshStandardMaterial | undefined
    const uv2 = sandMesh?.geometry.getAttribute('uv2')

    expect(sandMaterial?.map).toBe(albedo)
    expect(sandMaterial?.normalMap).toBe(normal)
    expect(sandMaterial?.roughnessMap).toBe(roughness)
    expect(sandMaterial?.aoMap).toBe(ao)
    expect(albedo.anisotropy).toBe(8)
    expect(uv2).toBeDefined()
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
    const driftwoodContact = getNearestTopHeight(sandTop, -0.2, -0.45)
    const driftwoodRing = [
      getNearestTopHeight(sandTop, -0.72, -0.18),
      getNearestTopHeight(sandTop, 0.16, -0.12),
      getNearestTopHeight(sandTop, -0.44, -0.88),
      getNearestTopHeight(sandTop, 0.08, -0.78)
    ].reduce((sum, height) => sum + height, 0) / 4
    const rockContact = getNearestTopHeight(sandTop, 0.56, 0.08)
    const rockRing = [
      getNearestTopHeight(sandTop, 0.08, 0.34),
      getNearestTopHeight(sandTop, 1.02, 0.32),
      getNearestTopHeight(sandTop, 0.36, -0.38),
      getNearestTopHeight(sandTop, 1.18, -0.16)
    ].reduce((sum, height) => sum + height, 0) / 4

    expect(driftwoodRing - driftwoodContact).toBeGreaterThan(0.03)
    expect(rockRing - rockContact).toBeGreaterThan(0.03)
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
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
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
    const nearSurfaceBand1 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-1') as THREE.Mesh | undefined
    const nearSurfaceBand2 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-2') as THREE.Mesh | undefined
    const nearSurfaceBand3 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-3') as THREE.Mesh | undefined
    const midwaterShafts = internals.tank.children.filter((child) => (
      child.name.startsWith('tank-caustics-midwater-')
    )) as THREE.Mesh[]
    const visibleMidwaterShafts = midwaterShafts.filter((mesh) => mesh.visible)
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
    expect(lightCanopy?.visible).toBe(false)
    expect(nearSurfaceBand1?.visible).toBe(true)
    expect(nearSurfaceBand2?.visible).toBe(true)
    expect(nearSurfaceBand3?.visible).toBe(false)
    expect(midwaterShafts).toHaveLength(3)
    expect(visibleMidwaterShafts).toHaveLength(1)
    expect(heroRimLight?.visible).toBe(false)
    expect(heroGroundGlow?.visible).toBe(false)
    expect(driftwoodOcclusion?.visible).toBe(true)
    expect(ridgeOcclusion?.visible).toBe(true)
    expect(backwallOcclusion?.visible).toBe(true)
  })

  it('keeps the richer hero layers on standard quality', () => {
    const instance = Object.create(AdvancedAquariumScene.prototype) as AdvancedAquariumScene
    const internals = instance as unknown as {
      tank: THREE.Group
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
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
    const nearSurfaceBand3 = internals.tank.children.find((child) => child.name === 'tank-light-near-surface-band-3') as THREE.Mesh | undefined
    const midwaterShafts = internals.tank.children.filter((child) => (
      child.name.startsWith('tank-caustics-midwater-')
    )) as THREE.Mesh[]
    const heroRimLight = internals.tank.children.find((child) => child.name === 'tank-hero-rim-light') as THREE.Mesh | undefined
    const heroGroundGlow = internals.tank.children.find((child) => child.name === 'tank-hero-ground-glow') as THREE.Mesh | undefined
    const backwallOcclusion = internals.tank.children.find((child) => child.name === 'tank-hardscape-occlusion-backwall') as THREE.Mesh | undefined

    expect(internals.renderer.shadowMap.enabled).toBe(true)
    expect(internals.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
    expect(internals.primaryShadowLight?.shadow.mapSize.width).toBe(4096)
    expect(midground?.visible).toBe(true)
    expect(foreground?.visible).toBe(true)
    expect(lightCanopy?.visible).toBe(true)
    expect(nearSurfaceBand3?.visible).toBe(true)
    expect(midwaterShafts).toHaveLength(3)
    expect(midwaterShafts.every((mesh) => mesh.visible)).toBe(true)
    expect(heroRimLight?.visible).toBe(true)
    expect(heroGroundGlow?.visible).toBe(true)
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
      createSubstrate: (tankWidth: number, tankHeight: number, tankDepth: number) => void
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
