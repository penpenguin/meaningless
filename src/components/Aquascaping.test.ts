import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AquascapingSystem, plantClusterDefinitions } from './Aquascaping'
import { createOpenWaterBounds } from './sceneBounds'

const createMockCanvasContext = (): CanvasRenderingContext2D => {
  const gradient = {
    addColorStop: vi.fn()
  }

  return {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalCompositeOperation: 'source-over'
  } as unknown as CanvasRenderingContext2D
}

const createModelAssetScene = (role: string): THREE.Group => {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#ffffff' })
  )
  mesh.userData = { role: `${role}-mesh` }
  group.userData = { sourceRole: role }
  group.add(mesh)
  return group
}

const createMaterialAssetScene = (material: THREE.Material): THREE.Group => {
  const group = new THREE.Group()
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material))
  return group
}

const getWorldBounds = (object: THREE.Object3D): THREE.Box3 => {
  object.updateWorldMatrix(true, true)
  return new THREE.Box3().setFromObject(object)
}

const countMeshes = (object: THREE.Object3D): number => {
  let meshCount = 0
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshCount += 1
    }
  })
  return meshCount
}

describe('AquascapingSystem composition', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
  })

  it('creates a hero rock and layered plant clusters instead of repeating the same silhouette', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const heroRock = aquascapingGroup.children.find((child) => child.userData.role === 'hero-rock')
    const backgroundPlants = aquascapingGroup.children.filter((child) => child.userData.layer === 'background')
    const foregroundPlants = aquascapingGroup.children.filter((child) => child.userData.layer === 'foreground')

    expect(heroRock).toBeDefined()
    expect(backgroundPlants.length).toBeGreaterThan(0)
    expect(foregroundPlants.length).toBeGreaterThan(0)
  })

  it('adds a driftwood arch with epiphyte clusters so the scape has a clear hero silhouette', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const driftwood = aquascapingGroup.children.find((child) => child.userData.role === 'hero-driftwood') as THREE.Group | undefined
    const branches = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-branch'
    ) ?? []
    const branchlets = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-branchlet'
    ) ?? []
    const roots = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-root'
    ) ?? []
    const brokenStubs = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-broken-stub'
    ) ?? []
    const rootFlare = driftwood?.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-root-flare'
    )
    const epiphytes = driftwood?.children.filter(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'epiphyte-cluster'
    ) ?? []
    const epiphyteLeaves = epiphytes.flatMap((cluster) =>
      cluster.children.filter(
        (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'epiphyte-leaf'
      )
    )

    expect(driftwood).toBeDefined()
    expect(branches.some((branch) => branch.geometry.type === 'TubeGeometry')).toBe(true)
    expect(branches.some((branch) => branch.userData.crossSectionAspect > 1.05)).toBe(true)
    expect(branchlets.some((branchlet) => branchlet.userData.tipRadius < branchlet.userData.baseRadius)).toBe(true)
    expect(branches.every((branch) => branch.castShadow)).toBe(true)
    expect(branchlets.length).toBeGreaterThanOrEqual(2)
    expect(roots.length).toBeGreaterThanOrEqual(3)
    expect(brokenStubs.length).toBeGreaterThanOrEqual(2)
    expect(rootFlare).toBeDefined()
    expect(epiphytes.length).toBeGreaterThanOrEqual(2)
    expect(epiphyteLeaves.length).toBeGreaterThan(0)
  })

  it('builds a raised rock ridge and tall canopy plants around the hero silhouette', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const ridge = aquascapingGroup.children.find((child) => child.userData.role === 'hero-rock-ridge') as THREE.Group | undefined
    const ridgeRocks = ridge?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'ridge-rock'
    ) ?? []
    const ridgeSlates = ridge?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'ridge-slate'
    ) ?? []
    const ridgeRubble = ridge?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'ridge-rubble'
    ) ?? []
    const canopyPlants = aquascapingGroup.children.filter(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-canopy'
    )
    const canopyTypes = new Set(canopyPlants.map((plant) => plant.userData.plantType))

    expect(ridge).toBeDefined()
    expect(ridgeRocks.length).toBeGreaterThanOrEqual(3)
    expect(ridgeSlates.length).toBeGreaterThanOrEqual(2)
    expect(ridgeRubble.length).toBeGreaterThanOrEqual(4)
    expect(canopyPlants.length).toBeGreaterThanOrEqual(4)
    expect(canopyTypes.has('sword-leaf')).toBe(true)
    expect(canopyTypes.has('fan-leaf')).toBe(true)
  })

  it('defines tall planted masses for the left rear, center rear, and right rear of the default layout', () => {
    const backgroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'background')
    const midgroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'midground')
    const foregroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'foreground')

    expect(backgroundClusters.length).toBeGreaterThanOrEqual(3)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'left-rear' && cluster.x <= -0.24 && cluster.z <= -0.2)).toBe(true)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'driftwood-backfill' && Math.abs(cluster.x) <= 0.08 && cluster.z <= -0.22)).toBe(true)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'right-rear' && cluster.x >= 0.26 && cluster.z <= -0.18)).toBe(true)
    expect(backgroundClusters.every((cluster) => cluster.baseHeight >= 6.2)).toBe(true)
    expect(midgroundClusters.every((cluster) => cluster.baseHeight >= 3.8)).toBe(true)
    expect(foregroundClusters.every((cluster) => cluster.baseHeight <= 2)).toBe(true)
  })

  it('builds denser foliage clusters so planted masses stay readable edge-on', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    ;(instance as unknown as { visualAssets: null }).visualAssets = null

    const createRibbonSeaweed = (AquascapingSystem.prototype as unknown as {
      createRibbonSeaweed: (
        seaweedGroup: THREE.Group,
        layer: 'foreground' | 'background' | 'midground',
        height: number,
        hue: number
      ) => void
    }).createRibbonSeaweed.bind(instance)
    const createSwordLeafPlant = (AquascapingSystem.prototype as unknown as {
      createSwordLeafPlant: (
        seaweedGroup: THREE.Group,
        layer: 'foreground' | 'background' | 'midground',
        height: number,
        hue: number
      ) => void
    }).createSwordLeafPlant.bind(instance)
    const createFanLeafPlant = (AquascapingSystem.prototype as unknown as {
      createFanLeafPlant: (
        seaweedGroup: THREE.Group,
        layer: 'foreground' | 'background' | 'midground',
        height: number,
        hue: number
      ) => void
    }).createFanLeafPlant.bind(instance)

    const ribbonGroup = new THREE.Group()
    const swordGroup = new THREE.Group()
    const fanGroup = new THREE.Group()

    createRibbonSeaweed(ribbonGroup, 'background', 5.8, 0.28)
    createSwordLeafPlant(swordGroup, 'background', 5.3, 0.24)
    createFanLeafPlant(fanGroup, 'midground', 3.4, 0.22)

    const ribbonDepthLanes = new Set(ribbonGroup.children.map((child) => child.userData.depthLane))
    const swordDepthLanes = new Set(swordGroup.children.map((child) => child.userData.depthLane))
    const fanDepthLanes = new Set(fanGroup.children.map((child) => child.userData.depthLane))

    expect(ribbonGroup.children).toHaveLength(12)
    expect(swordGroup.children).toHaveLength(13)
    expect(fanGroup.children).toHaveLength(11)
    expect(ribbonDepthLanes.size).toBeGreaterThanOrEqual(4)
    expect(swordDepthLanes.size).toBeGreaterThanOrEqual(4)
    expect(fanDepthLanes.size).toBeGreaterThanOrEqual(4)
  })

  it('replaces the planted blanket with a bounded set of planted masses', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const plantedMasses = aquascapingGroup.children.filter(
      (child) => child instanceof THREE.Group && child.userData.role === 'planted-mass'
    ) as THREE.Group[]
    const massRoles = new Set(plantedMasses.map((mass) => mass.userData.massRole))

    expect(plantedMasses.length).toBeGreaterThanOrEqual(8)
    expect(plantedMasses.length).toBeLessThanOrEqual(12)
    expect(massRoles.has('left-rear')).toBe(true)
    expect(massRoles.has('driftwood-backfill')).toBe(true)
    expect(massRoles.has('right-rear')).toBe(true)
  })

  it('adds a soft hardscape shadow to ground the hero scape on the substrate', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const hardscapeShadow = aquascapingGroup.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'hero-hardscape-shadow'
    )

    expect(hardscapeShadow).toBeDefined()
    expect(hardscapeShadow?.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect((hardscapeShadow?.material as THREE.MeshBasicMaterial | undefined)?.transparent).toBe(true)
  })

  it('blends the hardscape into the substrate with a berm and pebble scatter', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const transitionBerm = aquascapingGroup.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'hardscape-transition-berm'
    )
    const transitionPebbles = aquascapingGroup.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'hardscape-transition-pebble'
    )

    expect(transitionBerm).toBeDefined()
    expect(transitionBerm?.position.y).toBeGreaterThan(bounds.min.y)
    expect(transitionPebbles.length).toBeGreaterThanOrEqual(5)
    expect(transitionPebbles.every((pebble) => pebble.castShadow)).toBe(true)
  })

  it('adds driftwood-specific burial details so the hero wood feels partially settled into the substrate', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const burialShadow = aquascapingGroup.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-burial-shadow'
    )
    const detritusMounds = aquascapingGroup.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-detritus-mound'
    )

    expect(burialShadow).toBeDefined()
    expect((burialShadow?.material as THREE.MeshBasicMaterial | undefined)?.transparent).toBe(true)
    expect(detritusMounds.length).toBeGreaterThanOrEqual(2)
  })

  it('builds seaweed from ribbon fronds instead of stacked cylinders', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const ribbonPlant = aquascapingGroup.children.find((child) => child.userData.plantType === 'ribbon-seaweed') as THREE.Group
    const fronds = ribbonPlant.children.filter((child) => child instanceof THREE.Mesh) as THREE.Mesh[]

    expect(fronds.length).toBeGreaterThan(0)
    expect(fronds.some((frond) => frond.geometry.type === 'PlaneGeometry')).toBe(true)
    expect(fronds.some((frond) => frond.geometry.type === 'CylinderGeometry')).toBe(false)
  })

  it('mixes multiple plant archetypes into the aquascape', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const plantTypes = aquascapingGroup.children
      .filter((child) => typeof child.userData.layer === 'string')
      .map((child) => child.userData.plantType)
    const fanPlant = aquascapingGroup.children.find((child) => child.userData.plantType === 'fan-leaf') as THREE.Group
    const uniquePlantTypes = new Set(plantTypes)

    expect(uniquePlantTypes.has('ribbon-seaweed')).toBe(true)
    expect(uniquePlantTypes.has('sword-leaf')).toBe(true)
    expect(uniquePlantTypes.has('fan-leaf')).toBe(true)
    expect(uniquePlantTypes.size).toBeGreaterThanOrEqual(3)
    expect(fanPlant.children.some((leaf) => leaf instanceof THREE.Mesh && leaf.geometry.type === 'ShapeGeometry')).toBe(true)
  })

  it('does not add coral cone decorations in the default planted layout', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const plantMeshes = aquascapingGroup.children
      .filter((child) => child instanceof THREE.Group && typeof child.userData.plantType === 'string')
      .flatMap((child) => (child as THREE.Group).children)
      .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh)
    const freshwaterAccentTypes = new Set(
      aquascapingGroup.children
        .filter((child) => child.userData.role === 'freshwater-accent')
        .map((child) => child.userData.accentType)
    )
    const coralBranches = aquascapingGroup.children.flatMap((child) =>
      child instanceof THREE.Group ? child.children : []
    ).filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry.type === 'ConeGeometry')

    expect(plantMeshes.length).toBeGreaterThan(0)
    expect(plantMeshes.every((mesh) => mesh.castShadow)).toBe(true)
    expect(plantMeshes.every((mesh) => mesh.receiveShadow)).toBe(true)
    expect(coralBranches).toEqual([])
    expect(freshwaterAccentTypes.has('crypt-clump')).toBe(true)
    expect(freshwaterAccentTypes.has('foreground-tuft')).toBe(true)
    expect(freshwaterAccentTypes.has('wall-tuft')).toBe(true)
    expect(freshwaterAccentTypes.has('background-stem-group')).toBe(false)
    expect(freshwaterAccentTypes.has('epiphyte')).toBe(true)
  })

  it('adds coral cone decorations only for the marine layout', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds, null, {
      layoutStyle: 'marine'
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const coralBranches = aquascapingGroup.children.flatMap((child) =>
      child instanceof THREE.Group ? child.children : []
    ).filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry.type === 'ConeGeometry')

    expect(coralBranches.length).toBeGreaterThan(0)
    expect(coralBranches.every((mesh) => mesh.castShadow)).toBe(true)
  })
})

describe('AquascapingSystem premium materials', () => {
  it('uses external plant textures when visual assets are available', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const leafDiffuse = new THREE.Texture()
    const leafAlpha = new THREE.Texture()
    const leafNormal = new THREE.Texture()
    const leafRoughness = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'leaf-diffuse': leafDiffuse,
        'leaf-alpha': leafAlpha,
        'leaf-normal': leafNormal,
        'leaf-roughness': leafRoughness
      }
    }

    const createLeafMaterial = (AquascapingSystem.prototype as unknown as {
      createLeafMaterial: (
        hue: number,
        layer: 'foreground' | 'background' | 'midground',
        plantType: 'sword-leaf' | 'fan-leaf'
      ) => THREE.MeshPhysicalMaterial
    }).createLeafMaterial.bind(instance)

    const material = createLeafMaterial(0.32, 'foreground', 'sword-leaf')

    expect(material.map).toBe(leafDiffuse)
    expect(material.alphaMap).toBe(leafAlpha)
    expect(material.normalMap).toBe(leafNormal)
    expect(material.roughnessMap).toBe(leafRoughness)
  })

  it('prefers alpha cutout over translucent foliage for repeated plants', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = null

    const createLeafMaterial = (AquascapingSystem.prototype as unknown as {
      createLeafMaterial: (
        hue: number,
        layer: 'foreground' | 'background' | 'midground',
        plantType: 'sword-leaf' | 'fan-leaf'
      ) => THREE.MeshPhysicalMaterial
    }).createLeafMaterial.bind(instance)
    const createSeaweedMaterial = (AquascapingSystem.prototype as unknown as {
      createSeaweedMaterial: (
        hue: number,
        layer: 'foreground' | 'background' | 'midground'
      ) => THREE.MeshPhysicalMaterial
    }).createSeaweedMaterial.bind(instance)

    const backgroundLeaf = createLeafMaterial(0.26, 'background', 'sword-leaf')
    const backgroundRibbon = createSeaweedMaterial(0.3, 'background')

    expect(backgroundLeaf.transparent).toBe(false)
    expect(backgroundLeaf.opacity).toBe(1)
    expect(backgroundLeaf.alphaTest).toBeGreaterThanOrEqual(0.16)
    expect(backgroundLeaf.transmission).toBe(0)
    expect(backgroundRibbon.transparent).toBe(false)
    expect(backgroundRibbon.opacity).toBe(1)
    expect(backgroundRibbon.alphaTest).toBeGreaterThanOrEqual(0.34)
    expect(backgroundRibbon.transmission).toBe(0)

    getContextSpy.mockRestore()
  })

  it('uses external wood textures for driftwood when visual assets are available', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const driftwoodDiffuse = new THREE.Texture()
    const driftwoodRoughness = new THREE.Texture()
    const driftwoodNormal = new THREE.Texture()
    const driftwoodAo = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'driftwood-diffuse': driftwoodDiffuse,
        'driftwood-roughness': driftwoodRoughness,
        'driftwood-normal': driftwoodNormal,
        'driftwood-ao': driftwoodAo
      }
    }

    const createDriftwoodMaterial = (AquascapingSystem.prototype as unknown as {
      createDriftwoodMaterial: () => THREE.MeshStandardMaterial
    }).createDriftwoodMaterial.bind(instance)

    const material = createDriftwoodMaterial()

    expect(material.map).toBe(driftwoodDiffuse)
    expect(material.roughnessMap).toBe(driftwoodRoughness)
    expect(material.normalMap).toBe(driftwoodNormal)
    expect(material.aoMap).toBe(driftwoodAo)
    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(material.envMapIntensity).toBeLessThanOrEqual(0.14)
  })

  it('uses external rock detail maps when visual assets are available', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const rockDiffuse = new THREE.Texture()
    const rockRoughness = new THREE.Texture()
    const rockNormal = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'rock-diffuse': rockDiffuse,
        'rock-roughness': rockRoughness,
        'rock-normal': rockNormal
      }
    }

    const createRockMaterial = (AquascapingSystem.prototype as unknown as {
      createRockMaterial: (color: string) => THREE.MeshPhysicalMaterial
    }).createRockMaterial.bind(instance)

    const material = createRockMaterial('#7a7364')

    expect(material.map).toBe(rockDiffuse)
    expect(material.roughnessMap).toBe(rockRoughness)
    expect(material.normalMap).toBe(rockNormal)
    expect(material.clearcoat).toBeLessThanOrEqual(0.03)
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(0.35)
  })

  it('preserves authored rock base color and ao maps while only supplementing missing support rock channels', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const authoredMap = new THREE.Texture()
    const authoredAo = new THREE.Texture()
    const sharedDiffuse = new THREE.Texture()
    const sharedNormal = new THREE.Texture()
    const sharedRoughness = new THREE.Texture()
    const supportRockAsset = createMaterialAssetScene(new THREE.MeshPhysicalMaterial({
      color: '#211d19',
      map: authoredMap,
      aoMap: authoredAo,
      roughness: 0.66,
      metalness: 0.12,
      clearcoat: 0.18,
      envMapIntensity: 0.48
    }))

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: null } | null>
      } | null
    }).visualAssets = {
      textures: {
        'rock-diffuse': sharedDiffuse,
        'rock-normal': sharedNormal,
        'rock-roughness': sharedRoughness
      },
      models: {
        'rock-support-a': { scene: supportRockAsset, sourceMesh: null }
      }
    }

    const cloneVisualModelGroup = (AquascapingSystem.prototype as unknown as {
      cloneVisualModelGroup: (id: string, userData: Record<string, unknown>) => THREE.Group | null
    }).cloneVisualModelGroup.bind(instance)

    const clone = cloneVisualModelGroup('rock-support-a', { role: 'support-rock' })
    const clonedMesh = clone?.children[0] as THREE.Mesh | undefined
    const clonedMaterial = clonedMesh?.material as THREE.MeshPhysicalMaterial | undefined

    expect(clone).toBeDefined()
    expect(clonedMaterial?.map).toBe(authoredMap)
    expect(clonedMaterial?.normalMap).toBe(sharedNormal)
    expect(clonedMaterial?.roughnessMap).toBe(sharedRoughness)
    expect(clonedMaterial?.aoMap).toBe(authoredAo)
    expect(clonedMaterial?.metalness).toBeLessThanOrEqual(0.04)
    expect(clonedMaterial?.roughness).toBeGreaterThanOrEqual(0.78)
    expect(clonedMaterial?.clearcoat).toBeLessThanOrEqual(0.03)
    expect(clonedMaterial?.color.getHSL({ h: 0, s: 0, l: 0 }).l ?? 0).toBeGreaterThanOrEqual(0.4)
  })

  it('preserves authored driftwood materials when the asset already includes the key maps', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const authoredMap = new THREE.Texture()
    const authoredNormal = new THREE.Texture()
    const authoredRoughness = new THREE.Texture()
    const authoredAo = new THREE.Texture()
    const sharedDiffuse = new THREE.Texture()
    const sharedNormal = new THREE.Texture()
    const sharedRoughness = new THREE.Texture()
    const sharedAo = new THREE.Texture()
    const driftwoodAsset = createMaterialAssetScene(new THREE.MeshStandardMaterial({
      color: '#8a715a',
      map: authoredMap,
      normalMap: authoredNormal,
      roughnessMap: authoredRoughness,
      aoMap: authoredAo
    }))

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: null } | null>
      } | null
    }).visualAssets = {
      textures: {
        'driftwood-diffuse': sharedDiffuse,
        'driftwood-normal': sharedNormal,
        'driftwood-roughness': sharedRoughness,
        'driftwood-ao': sharedAo
      },
      models: {
        'driftwood-hero': { scene: driftwoodAsset, sourceMesh: null }
      }
    }

    const cloneVisualModelGroup = (AquascapingSystem.prototype as unknown as {
      cloneVisualModelGroup: (id: string, userData: Record<string, unknown>) => THREE.Group | null
    }).cloneVisualModelGroup.bind(instance)

    const clone = cloneVisualModelGroup('driftwood-hero', { role: 'hero-driftwood' })
    const clonedMesh = clone?.children[0] as THREE.Mesh | undefined
    const clonedMaterial = clonedMesh?.material as THREE.MeshStandardMaterial | undefined

    expect(clone).toBeDefined()
    expect(clonedMaterial).toBeInstanceOf(THREE.Material)
    expect(clonedMaterial).not.toBe((driftwoodAsset.children[0] as THREE.Mesh).material)
    expect(clonedMaterial?.map).toBe(authoredMap)
    expect(clonedMaterial?.normalMap).toBe(authoredNormal)
    expect(clonedMaterial?.roughnessMap).toBe(authoredRoughness)
    expect(clonedMaterial?.aoMap).toBe(authoredAo)
    expect(clonedMaterial?.envMapIntensity).toBeLessThanOrEqual(0.16)
    expect(clonedMesh?.castShadow).toBe(true)
    expect(clonedMesh?.receiveShadow).toBe(true)
  })

  it('supplements missing driftwood maps, adds uv2 for ao, and clamps glossy reflections on cloned hero assets', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const authoredMap = new THREE.Texture()
    const sharedNormal = new THREE.Texture()
    const sharedRoughness = new THREE.Texture()
    const sharedAo = new THREE.Texture()
    const driftwoodAsset = createMaterialAssetScene(new THREE.MeshStandardMaterial({
      color: '#7b624f',
      map: authoredMap,
      roughness: 0.68,
      metalness: 0.08,
      envMapIntensity: 0.92
    }))
    ;((driftwoodAsset.children[0] as THREE.Mesh).geometry as THREE.BufferGeometry).deleteAttribute('uv2')

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: null } | null>
      } | null
    }).visualAssets = {
      textures: {
        'driftwood-normal': sharedNormal,
        'driftwood-roughness': sharedRoughness,
        'driftwood-ao': sharedAo
      },
      models: {
        'driftwood-hero': { scene: driftwoodAsset, sourceMesh: null }
      }
    }

    const cloneVisualModelGroup = (AquascapingSystem.prototype as unknown as {
      cloneVisualModelGroup: (id: string, userData: Record<string, unknown>) => THREE.Group | null
    }).cloneVisualModelGroup.bind(instance)

    const clone = cloneVisualModelGroup('driftwood-hero', { role: 'hero-driftwood' })
    const clonedMesh = clone?.children[0] as THREE.Mesh | undefined
    const clonedMaterial = clonedMesh?.material as THREE.MeshStandardMaterial | undefined

    expect(clone).toBeDefined()
    expect(clonedMaterial?.map).toBe(authoredMap)
    expect(clonedMaterial?.normalMap).toBe(sharedNormal)
    expect(clonedMaterial?.roughnessMap).toBe(sharedRoughness)
    expect(clonedMaterial?.aoMap).toBe(sharedAo)
    expect(clonedMaterial?.envMapIntensity).toBeLessThanOrEqual(0.16)
    expect(clonedMaterial?.metalness).toBeLessThanOrEqual(0.03)
    expect((clonedMesh?.geometry as THREE.BufferGeometry | undefined)?.getAttribute('uv2')).toBeDefined()
  })

  it('preserves authored driftwood base color textures when non-pbr authored materials need replacement', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const authoredMap = new THREE.Texture()
    const sharedDiffuse = new THREE.Texture()
    const sharedNormal = new THREE.Texture()
    const sharedRoughness = new THREE.Texture()
    const sharedAo = new THREE.Texture()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
      } | null
    }).visualAssets = {
      textures: {
        'driftwood-diffuse': sharedDiffuse,
        'driftwood-normal': sharedNormal,
        'driftwood-roughness': sharedRoughness,
        'driftwood-ao': sharedAo
      }
    }

    const createAssetBackedMaterial = (AquascapingSystem.prototype as unknown as {
      createAssetBackedMaterial: (id: string, material: THREE.Material) => THREE.Material
    }).createAssetBackedMaterial.bind(instance)

    const material = createAssetBackedMaterial('driftwood-hero', new THREE.MeshBasicMaterial({
      color: '#7b624f',
      map: authoredMap
    })) as THREE.MeshPhysicalMaterial

    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(material.map).toBe(authoredMap)
    expect(material.normalMap).toBe(sharedNormal)
    expect(material.roughnessMap).toBe(sharedRoughness)
    expect(material.aoMap).toBe(sharedAo)
    expect(material.color.getHexString()).toBe('7b624f')
    expect(material.envMapIntensity).toBeLessThanOrEqual(0.14)
    expect(material.roughness).toBeGreaterThanOrEqual(0.9)
    expect(material.metalness).toBeLessThanOrEqual(0.03)
  })

  it('supplements missing plant maps without replacing the authored base color map', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const authoredMap = new THREE.Texture()
    const sharedAlpha = new THREE.Texture()
    const sharedNormal = new THREE.Texture()
    const sharedRoughness = new THREE.Texture()
    const plantAsset = createMaterialAssetScene(new THREE.MeshStandardMaterial({
      color: '#5f8f57',
      map: authoredMap,
      transparent: true
    }))

    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: null } | null>
      } | null
    }).visualAssets = {
      textures: {
        'leaf-alpha': sharedAlpha,
        'leaf-normal': sharedNormal,
        'leaf-roughness': sharedRoughness
      },
      models: {
        'plant-sword-cluster': { scene: plantAsset, sourceMesh: null }
      }
    }

    const cloneVisualModelGroup = (AquascapingSystem.prototype as unknown as {
      cloneVisualModelGroup: (id: string, userData: Record<string, unknown>) => THREE.Group | null
    }).cloneVisualModelGroup.bind(instance)

    const clone = cloneVisualModelGroup('plant-sword-cluster', {
      role: 'hero-canopy',
      layer: 'background',
      plantType: 'sword-leaf'
    })
    const clonedMesh = clone?.children[0] as THREE.Mesh | undefined
    const clonedMaterial = clonedMesh?.material as THREE.MeshPhysicalMaterial | undefined

    expect(clone).toBeDefined()
    expect(clonedMaterial?.map).toBe(authoredMap)
    expect(clonedMaterial?.alphaMap).toBe(sharedAlpha)
    expect(clonedMaterial?.normalMap).toBe(sharedNormal)
    expect(clonedMaterial?.roughnessMap).toBe(sharedRoughness)
    expect(clonedMaterial?.transparent).toBe(false)
    expect(clonedMaterial?.opacity).toBe(1)
    expect(clonedMaterial?.alphaTest).toBeGreaterThanOrEqual(0.12)
    expect(clonedMaterial?.transmission ?? 0).toBeLessThanOrEqual(0.015)
  })
})

describe('AquascapingSystem asset-backed hero scape', () => {
  it('builds left and right support rock clusters from authored support glbs', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const supportRockA = createModelAssetScene('rock-support-a')
    const supportRockB = createModelAssetScene('rock-support-b')
    const supportRockC = createModelAssetScene('rock-support-c')
    const pebbleCluster = createModelAssetScene('rock-pebble-cluster')

    new AquascapingSystem(scene, bounds, {
      manifest: { textures: [], models: [], environment: [] },
      textures: {},
      environment: {},
      models: {
        'rock-support-a': { scene: supportRockA, sourceMesh: null },
        'rock-support-b': { scene: supportRockB, sourceMesh: null },
        'rock-support-c': { scene: supportRockC, sourceMesh: null },
        'rock-pebble-cluster': { scene: pebbleCluster, sourceMesh: null }
      }
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const supportClusters = aquascapingGroup.children.filter(
      (child): child is THREE.Group =>
        child instanceof THREE.Group
        && child.userData.role === 'support-rock-cluster'
    )
    const leftCluster = supportClusters.find((cluster) => cluster.position.x < 0)
    const rightCluster = supportClusters.find((cluster) => cluster.position.x > 0)
    const surfaceY = bounds.min.y + 0.42
    const leftPrimary = leftCluster?.children.find((child) => child.userData.role === 'support-rock')
    const rightPrimary = rightCluster?.children.find((child) => child.userData.role === 'support-rock')

    expect(supportClusters).toHaveLength(2)
    expect(leftCluster).toBeDefined()
    expect(rightCluster).toBeDefined()
    expect(leftCluster?.position.z ?? 0).toBeGreaterThan(0.9)
    expect(rightCluster?.position.z ?? 0).toBeGreaterThan(0.9)
    expect(leftCluster?.children.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(rightCluster?.children.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(leftCluster?.children.some((child) => child.userData.assetId === 'rock-pebble-cluster')).toBe(true)
    expect(rightCluster?.children.some((child) => child.userData.assetId === 'rock-pebble-cluster')).toBe(true)

    const leftAssetIds = new Set(leftCluster?.children.map((child) => child.userData.assetId).filter(Boolean) as string[])
    const rightAssetIds = new Set(rightCluster?.children.map((child) => child.userData.assetId).filter(Boolean) as string[])

    expect(leftAssetIds.has('rock-support-a') || leftAssetIds.has('rock-support-b')).toBe(true)
    expect(rightAssetIds.has('rock-support-b') || rightAssetIds.has('rock-support-c')).toBe(true)

    const leftBounds = leftPrimary ? getWorldBounds(leftPrimary) : null
    const rightBounds = rightPrimary ? getWorldBounds(rightPrimary) : null
    const leftBurialRatio = leftBounds ? (surfaceY - leftBounds.min.y) / Math.max(leftBounds.max.y - leftBounds.min.y, 0.001) : 0
    const rightBurialRatio = rightBounds ? (surfaceY - rightBounds.min.y) / Math.max(rightBounds.max.y - rightBounds.min.y, 0.001) : 0

    expect(leftBurialRatio).toBeGreaterThanOrEqual(0.06)
    expect(leftBurialRatio).toBeLessThanOrEqual(0.16)
    expect(rightBurialRatio).toBeGreaterThanOrEqual(0.06)
    expect(rightBurialRatio).toBeLessThanOrEqual(0.16)

    getContextSpy.mockRestore()
  })

  it('falls back to clustered deformed support rocks when authored support assets are missing', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds, {
      manifest: { textures: [], models: [], environment: [] },
      textures: {},
      environment: {},
      models: {
        'rock-support-a': null,
        'rock-support-b': null,
        'rock-support-c': null,
        'rock-pebble-cluster': null
      }
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const supportClusters = aquascapingGroup.children.filter(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'support-rock-cluster'
    )
    const clusterMeshCounts = supportClusters.map((cluster) => countMeshes(cluster))

    expect(supportClusters).toHaveLength(2)
    expect(supportClusters.every((cluster) => cluster.children.length >= 3)).toBe(true)
    expect(supportClusters.every((cluster) => cluster.children.some((child) => child.userData.role === 'support-rock-scatter'))).toBe(true)
    expect(clusterMeshCounts.every((count) => count >= 4)).toBe(true)
    expect(supportClusters.some((cluster) => cluster.position.x < 0)).toBe(true)
    expect(supportClusters.some((cluster) => cluster.position.x > 0)).toBe(true)

    getContextSpy.mockRestore()
  })

  it('clones hero asset scenes when premium models are available', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const driftwoodAsset = createModelAssetScene('driftwood-hero')
    const rockAsset = createModelAssetScene('rock-ridge-hero')
    const swordPlantAsset = createModelAssetScene('plant-sword-cluster')
    const fanPlantAsset = createModelAssetScene('plant-fan-cluster')

    new AquascapingSystem(scene, bounds, {
      manifest: { textures: [], models: [], environment: [] },
      textures: {},
      environment: {},
      models: {
        'driftwood-hero': { scene: driftwoodAsset, sourceMesh: null },
        'rock-ridge-hero': { scene: rockAsset, sourceMesh: null },
        'plant-sword-cluster': { scene: swordPlantAsset, sourceMesh: null },
        'plant-fan-cluster': { scene: fanPlantAsset, sourceMesh: null }
      }
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const heroDriftwood = aquascapingGroup.children.find((child) => child.userData.role === 'hero-driftwood') as THREE.Group
    const heroRockRidge = aquascapingGroup.children.find((child) => child.userData.role === 'hero-rock-ridge') as THREE.Group
    const heroCanopyAssets = aquascapingGroup.children.filter(
      (child) => child.userData.role === 'hero-canopy' && typeof child.userData.assetId === 'string'
    )
    const plantedMassAssets = aquascapingGroup.children.filter(
      (child) => child.userData.role === 'planted-mass' && typeof child.userData.assetId === 'string'
    )

    expect(heroDriftwood).toBeDefined()
    expect(heroDriftwood).not.toBe(driftwoodAsset)
    expect(heroDriftwood.userData.assetId).toBe('driftwood-hero')
    expect(heroRockRidge).toBeDefined()
    expect(heroRockRidge.userData.assetId).toBe('rock-ridge-hero')
    expect(heroCanopyAssets.length).toBeGreaterThanOrEqual(2)
    expect(heroCanopyAssets.some((child) => child.userData.assetId === 'plant-sword-cluster')).toBe(true)
    expect(plantedMassAssets.length).toBeGreaterThanOrEqual(3)
    expect(plantedMassAssets.some((child) => child.userData.assetId === 'plant-sword-cluster')).toBe(true)
    expect(plantedMassAssets.some((child) => child.userData.assetId === 'plant-fan-cluster')).toBe(true)

    getContextSpy.mockRestore()
  })

  it('falls back to procedural hero generators when premium models are missing', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds, {
      manifest: { textures: [], models: [], environment: [] },
      textures: {},
      environment: {},
      models: {
        'driftwood-hero': null,
        'rock-ridge-hero': null,
        'plant-sword-cluster': null,
        'plant-fan-cluster': null
      }
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const driftwood = aquascapingGroup.children.find((child) => child.userData.role === 'hero-driftwood') as THREE.Group | undefined
    const ridge = aquascapingGroup.children.find((child) => child.userData.role === 'hero-rock-ridge') as THREE.Group | undefined
    const branches = driftwood?.children.filter((child) => child.userData.role === 'driftwood-branch') ?? []
    const ridgeRocks = ridge?.children.filter((child) => child.userData.role === 'ridge-rock') ?? []

    expect(branches.length).toBeGreaterThan(0)
    expect(ridgeRocks.length).toBeGreaterThan(0)

    getContextSpy.mockRestore()
  })
})
