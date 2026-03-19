import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AquascapingSystem, plantClusterDefinitions, sampledPlantPlacements, substratePlantAnchors } from './Aquascaping'
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

const positionKey = (x: number, z: number): string => `${x.toFixed(3)}:${z.toFixed(3)}`

const getMinimumDistance = (
  placements: Array<{ x: number; z: number }>
): number => {
  let minimumDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < placements.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < placements.length; nextIndex += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        Math.hypot(
          placements[index]!.x - placements[nextIndex]!.x,
          placements[index]!.z - placements[nextIndex]!.z
        )
      )
    }
  }

  return minimumDistance
}

const getNearestNeighborDistances = (
  placements: Array<{ x: number; z: number }>
): number[] => (
  placements.map((placement, index) => {
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let nextIndex = 0; nextIndex < placements.length; nextIndex += 1) {
      if (index === nextIndex) {
        continue
      }

      nearestDistance = Math.min(
        nearestDistance,
        Math.hypot(
          placement.x - placements[nextIndex]!.x,
          placement.z - placements[nextIndex]!.z
        )
      )
    }

    return nearestDistance
  })
)

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

  it('adds a trunk-first driftwood hardscape with readable fork and epiphytes so the scape has a clear hero silhouette', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const driftwood = aquascapingGroup.children.find((child) => child.userData.role === 'hero-driftwood') as THREE.Group | undefined
    const trunks = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-trunk'
    ) ?? []
    const branchAttachments = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-branch-attachment'
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
    const localFill = driftwood?.children.find(
      (child): child is THREE.PointLight => child instanceof THREE.PointLight && child.userData.role === 'driftwood-local-fill'
    )
    const localShadow = driftwood?.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-local-shadow'
    )
    const driftwoodBounds = driftwood ? getWorldBounds(driftwood) : null
    const driftwoodCenter = driftwoodBounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3()
    const frontCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 64)
    frontCamera.position.set(
      driftwoodCenter.x,
      driftwoodCenter.y + 0.18,
      (driftwoodBounds?.max.z ?? 0) + 13
    )
    frontCamera.lookAt(driftwoodCenter.x, driftwoodCenter.y + 0.48, driftwoodCenter.z)
    frontCamera.updateMatrixWorld()
    frontCamera.updateProjectionMatrix()
    const projectedBranchXs = branchAttachments.map((branch) =>
      getWorldBounds(branch).getCenter(new THREE.Vector3()).project(frontCamera).x
    )
    const projectedTrunkX = trunks[0]
      ? getWorldBounds(trunks[0]).getCenter(new THREE.Vector3()).project(frontCamera).x
      : 0

    expect(driftwood).toBeDefined()
    expect(trunks).toHaveLength(1)
    expect(trunks[0]?.geometry.type).toBe('TubeGeometry')
    expect(trunks[0]?.userData.crossSectionAspect).toBeGreaterThan(1.05)
    expect(trunks[0]?.userData.tipRadius).toBeLessThan(trunks[0]?.userData.baseRadius)
    expect(trunks.every((trunk) => trunk.castShadow)).toBe(true)
    expect(branchAttachments).toHaveLength(2)
    expect(branchAttachments.every((branch) => branch.userData.tipRadius < branch.userData.baseRadius)).toBe(true)
    expect(projectedBranchXs.some((x) => x < projectedTrunkX - 0.04)).toBe(true)
    expect(projectedBranchXs.some((x) => x > projectedTrunkX + 0.04)).toBe(true)
    expect(roots.length).toBeGreaterThanOrEqual(3)
    expect(brokenStubs.length).toBeGreaterThanOrEqual(2)
    expect(rootFlare).toBeDefined()
    expect(epiphytes.length).toBeGreaterThanOrEqual(5)
    expect(epiphyteLeaves.length).toBeGreaterThan(0)
    expect(localFill).toBeDefined()
    expect(localShadow).toBeDefined()
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

  it('uses hero canopy assets as visible left, center, and right background masses', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bounds.getSize(size)
    bounds.getCenter(center)

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const canopyPlants = aquascapingGroup.children.filter(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-canopy'
    )

    expect(canopyPlants.length).toBeGreaterThanOrEqual(5)
    expect(
      canopyPlants.some((plant) =>
        plant.position.x <= center.x - size.x * 0.16
        && plant.position.z <= center.z - size.z * 0.14
        && plant.scale.y >= 2.1
        && plant.scale.x >= 1.05
      )
    ).toBe(true)
    expect(
      canopyPlants.some((plant) =>
        Math.abs(plant.position.x - center.x) <= size.x * 0.08
        && plant.position.z <= center.z - size.z * 0.22
        && plant.scale.y >= 2
        && plant.scale.x >= 1.12
      )
    ).toBe(true)
    expect(
      canopyPlants.some((plant) =>
        plant.position.x >= center.x + size.x * 0.18
        && plant.position.z <= center.z - size.z * 0.14
        && plant.scale.y >= 2
        && plant.scale.x >= 0.95
      )
    ).toBe(true)
  })

  it('defines planted zones that expand into irregular sampled colony placements', () => {
    const backgroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'background')
    const midgroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'midground')
    const foregroundClusters = plantClusterDefinitions.filter((cluster) => cluster.layer === 'foreground')
    const leftRear = plantClusterDefinitions.find((cluster) => cluster.massRole === 'left-rear')
    const driftwoodBackfill = plantClusterDefinitions.find((cluster) => cluster.massRole === 'driftwood-backfill')
    const rightRear = plantClusterDefinitions.find((cluster) => cluster.massRole === 'right-rear')
    const midRightBackfill = plantClusterDefinitions.find((cluster) => cluster.massRole === 'mid-right-backfill')
    const leftRearPlacements = sampledPlantPlacements.filter((placement) => placement.zoneId === 'left-rear')
    const driftwoodPlacements = sampledPlantPlacements.filter((placement) => placement.zoneId === 'driftwood-backfill')
    const rightRearPlacements = sampledPlantPlacements.filter((placement) => placement.zoneId === 'right-rear')
    const foregroundPlacements = sampledPlantPlacements.filter((placement) => placement.layer === 'foreground')
    const foregroundNearestDistances = getNearestNeighborDistances(foregroundPlacements)
    const leftRearLanes = new Set(leftRearPlacements.map((placement) => placement.depthLane))
    const driftwoodLanes = new Set(driftwoodPlacements.map((placement) => placement.depthLane))

    expect(backgroundClusters.length).toBeGreaterThanOrEqual(3)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'left-rear' && cluster.x <= -0.24 && cluster.z <= -0.2)).toBe(true)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'driftwood-backfill' && Math.abs(cluster.x) <= 0.08 && cluster.z <= -0.22)).toBe(true)
    expect(backgroundClusters.some((cluster) => cluster.massRole === 'right-rear' && cluster.x >= 0.26 && cluster.z <= -0.18)).toBe(true)
    expect(backgroundClusters.every((cluster) => cluster.plantType !== 'ribbon-seaweed')).toBe(true)
    expect(leftRear?.baseHeight).toBeGreaterThanOrEqual(9.5)
    expect(leftRear?.spreadX).toBeGreaterThanOrEqual(0.32)
    expect(leftRear?.spreadZ).toBeGreaterThanOrEqual(0.22)
    expect(leftRear?.scale.x).toBeGreaterThanOrEqual(1.3)
    expect(leftRear?.scale.y).toBeGreaterThanOrEqual(2.5)
    expect(driftwoodBackfill?.baseHeight).toBeGreaterThanOrEqual(7.9)
    expect(driftwoodBackfill?.spreadX).toBeGreaterThanOrEqual(0.28)
    expect(driftwoodBackfill?.spreadZ).toBeGreaterThanOrEqual(0.22)
    expect(driftwoodBackfill?.scale.x).toBeGreaterThanOrEqual(1.2)
    expect(driftwoodBackfill?.scale.y).toBeGreaterThanOrEqual(2.1)
    expect(rightRear?.baseHeight).toBeGreaterThanOrEqual(9.4)
    expect(rightRear?.spreadX).toBeGreaterThanOrEqual(0.24)
    expect(rightRear?.spreadZ).toBeGreaterThanOrEqual(0.18)
    expect(rightRear?.scale.x).toBeGreaterThanOrEqual(1)
    expect(rightRear?.scale.y).toBeGreaterThanOrEqual(2.3)
    expect(midRightBackfill?.plantType).not.toBe('ribbon-seaweed')
    expect(midgroundClusters.every((cluster) => cluster.baseHeight >= 3.8)).toBe(true)
    expect(foregroundClusters.every((cluster) => cluster.baseHeight <= 2)).toBe(true)
    expect(sampledPlantPlacements.length).toBeGreaterThan(plantClusterDefinitions.length)
    expect(leftRearPlacements.length).toBeGreaterThanOrEqual(5)
    expect(driftwoodPlacements.length).toBeGreaterThanOrEqual(5)
    expect(rightRearPlacements.length).toBeGreaterThanOrEqual(4)
    expect(rightRearPlacements.length).toBeLessThan(leftRearPlacements.length)
    expect(new Set(leftRearPlacements.map((placement) => placement.plantType)).has('sword-leaf')).toBe(true)
    expect(new Set(leftRearPlacements.map((placement) => placement.plantType)).has('fan-leaf')).toBe(true)
    expect(new Set(driftwoodPlacements.map((placement) => placement.plantType)).has('sword-leaf')).toBe(true)
    expect(new Set(driftwoodPlacements.map((placement) => placement.plantType)).has('fan-leaf')).toBe(true)
    expect(new Set(leftRearPlacements.map((placement) => placement.clusterKind)).has('satellite')).toBe(true)
    expect(new Set(leftRearPlacements.map((placement) => placement.clusterKind)).has('offshoot')).toBe(true)
    expect(getMinimumDistance(leftRearPlacements)).toBeGreaterThanOrEqual(0.06)
    expect(Math.max(...leftRearPlacements.map((placement) => placement.x)) - Math.min(...leftRearPlacements.map((placement) => placement.x))).toBeGreaterThan(0.2)
    expect(Math.max(...driftwoodPlacements.map((placement) => placement.z)) - Math.min(...driftwoodPlacements.map((placement) => placement.z))).toBeGreaterThan(0.12)
    expect(leftRearLanes.size).toBeGreaterThanOrEqual(2)
    expect(driftwoodLanes.size).toBeGreaterThanOrEqual(2)
    expect(leftRearPlacements.some((placement) => placement.tiltX > 0)).toBe(true)
    expect(leftRearPlacements.some((placement) => placement.tiltX < 0)).toBe(true)
    expect(driftwoodPlacements.some((placement) => placement.tiltZ > 0)).toBe(true)
    expect(driftwoodPlacements.some((placement) => placement.tiltZ < 0)).toBe(true)
    expect(driftwoodPlacements.every((placement) => placement.baseHeight >= 4.2 && placement.baseHeight <= 8.4)).toBe(true)
    expect(foregroundPlacements.every((placement) => placement.baseHeight <= 2)).toBe(true)
    expect(foregroundPlacements.every((placement) => placement.plantType === 'fan-leaf')).toBe(true)
    expect(Math.max(...foregroundNearestDistances) - Math.min(...foregroundNearestDistances)).toBeGreaterThan(0.03)
  })

  it('derives substrate plant anchors from sampled placements instead of fixed zone centers', () => {
    const zonePositionKeys = new Set(
      plantClusterDefinitions.map((cluster) => positionKey(cluster.x, cluster.z))
    )
    const sampledPositionKeys = new Set(
      sampledPlantPlacements.map((placement) => positionKey(placement.x, placement.z))
    )

    expect(substratePlantAnchors.length).toBe(sampledPlantPlacements.length)
    expect(substratePlantAnchors.every((anchor) => sampledPositionKeys.has(positionKey(anchor.x, anchor.z)))).toBe(true)
    expect(substratePlantAnchors.some((anchor) => !zonePositionKeys.has(positionKey(anchor.x, anchor.z)))).toBe(true)
    expect(substratePlantAnchors.some((anchor) => anchor.id.includes('-core-'))).toBe(true)
    expect(Math.max(...substratePlantAnchors.map((anchor) => anchor.moundHeight)) - Math.min(...substratePlantAnchors.map((anchor) => anchor.moundHeight))).toBeGreaterThan(0.004)
    expect(Math.max(...substratePlantAnchors.map((anchor) => anchor.scoopDepth)) - Math.min(...substratePlantAnchors.map((anchor) => anchor.scoopDepth))).toBeGreaterThan(0.002)
    expect(substratePlantAnchors.some((anchor) => Math.abs(anchor.scoopBiasX) > 0.01)).toBe(true)
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
    createFanLeafPlant(fanGroup, 'background', 5.1, 0.22)

    const ribbonDepthLanes = new Set(ribbonGroup.children.map((child) => child.userData.depthLane))
    const swordDepthLanes = new Set(swordGroup.children.map((child) => child.userData.depthLane))
    const fanDepthLanes = new Set(fanGroup.children.map((child) => child.userData.depthLane))
    const swordRotations = swordGroup.children.map((child) => child.rotation.y)
    const fanRotations = fanGroup.children.map((child) => child.rotation.y)

    expect(ribbonGroup.children).toHaveLength(12)
    expect(swordGroup.children.length).toBeGreaterThanOrEqual(16)
    expect(fanGroup.children.length).toBeGreaterThanOrEqual(14)
    expect(ribbonDepthLanes.size).toBeGreaterThanOrEqual(4)
    expect(swordDepthLanes.size).toBeGreaterThanOrEqual(5)
    expect(fanDepthLanes.size).toBeGreaterThanOrEqual(5)
    expect(Math.max(...swordRotations) - Math.min(...swordRotations)).toBeGreaterThan(2.4)
    expect(Math.max(...fanRotations) - Math.min(...fanRotations)).toBeGreaterThan(2.2)
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

    expect(plantedMasses.length).toBeGreaterThanOrEqual(18)
    expect(plantedMasses.length).toBeLessThanOrEqual(28)
    expect(massRoles.has('left-rear')).toBe(true)
    expect(massRoles.has('driftwood-backfill')).toBe(true)
    expect(massRoles.has('right-rear')).toBe(true)
  })

  it('layers procedural foliage into authored planted masses so background assets read as dense walls', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const bounds = createOpenWaterBounds()
    ;(instance as unknown as {
      visualAssets: {
        textures: Record<string, THREE.Texture | null>
        models: Record<string, { scene: THREE.Group; sourceMesh: null } | null>
      } | null
      group: THREE.Group
      plants: THREE.Group[]
    }).visualAssets = {
      textures: {},
      models: {
        'plant-sword-cluster': { scene: createModelAssetScene('plant-sword-cluster'), sourceMesh: null },
        'plant-fan-cluster': { scene: createModelAssetScene('plant-fan-cluster'), sourceMesh: null }
      }
    }
    ;(instance as unknown as { group: THREE.Group }).group = new THREE.Group()
    ;(instance as unknown as { plants: THREE.Group[] }).plants = []

    const createPlantedMasses = (AquascapingSystem.prototype as unknown as {
      createPlantedMasses: (bounds: THREE.Box3) => void
    }).createPlantedMasses.bind(instance)

    createPlantedMasses(bounds)

    const plantedMassGroup = ((instance as unknown as { group: THREE.Group }).group.children.find(
      (child) => child instanceof THREE.Group && child.userData.massRole === 'left-rear'
    )) as THREE.Group | undefined

    expect(plantedMassGroup).toBeDefined()
    expect(countMeshes(plantedMassGroup!)).toBeGreaterThan(10)
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
    const driftwood = aquascapingGroup.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-driftwood'
    )
    const burialShadow = driftwood?.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-burial-shadow'
    )
    const detritusMounds = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-detritus-mound'
    ) ?? []

    expect(burialShadow).toBeDefined()
    expect((burialShadow?.material as THREE.MeshBasicMaterial | undefined)?.transparent).toBe(true)
    expect(burialShadow?.position.x ?? 0).toBeLessThanOrEqual(-1.74)
    expect(burialShadow?.position.z ?? 0).toBeGreaterThanOrEqual(0.62)
    expect(detritusMounds.length).toBeGreaterThanOrEqual(4)
    expect(detritusMounds.some((mound) => mound.position.x <= -1.7 && mound.position.z >= 0.56)).toBe(true)
  })

  it('stages the driftwood ahead of the ridge and adds small attachments so the wood reads as the main hardscape', () => {
    getContextSpy = vi
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
    const driftwood = aquascapingGroup.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-driftwood'
    )
    const ridge = aquascapingGroup.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-rock-ridge'
    )
    const mossPatches = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-moss-patch'
    ) ?? []
    const fineTwigs = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-fine-twig'
    ) ?? []
    const rootBases = driftwood?.children.filter(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.userData.role === 'driftwood-root-base'
    ) ?? []
    const localFill = driftwood?.children.find(
      (child): child is THREE.PointLight => child instanceof THREE.PointLight && child.userData.role === 'driftwood-local-fill'
    )
    const driftwoodSize = driftwood ? getWorldBounds(driftwood).getSize(new THREE.Vector3()) : new THREE.Vector3()
    const ridgeSize = ridge ? getWorldBounds(ridge).getSize(new THREE.Vector3()) : new THREE.Vector3()

    expect(driftwood).toBeDefined()
    expect(ridge).toBeDefined()
    expect((driftwood?.position.x ?? 0) + 1.1).toBeLessThan(ridge?.position.x ?? 0)
    expect((driftwood?.position.y ?? 0) - 0.34).toBeGreaterThan(ridge?.position.y ?? 0)
    expect((driftwood?.position.z ?? 0) - 1.22).toBeGreaterThan(ridge?.position.z ?? 0)
    expect(driftwoodSize.x).toBeGreaterThan(ridgeSize.x * 1.38)
    expect(driftwoodSize.y).toBeGreaterThan(ridgeSize.y * 1.2)
    expect(mossPatches.length).toBeGreaterThanOrEqual(3)
    expect(fineTwigs.length).toBeGreaterThanOrEqual(3)
    expect(rootBases.length).toBeGreaterThanOrEqual(2)
    expect(localFill?.intensity ?? 0).toBeGreaterThanOrEqual(2.24)
    expect(localFill?.position.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.78)
    expect(localFill?.position.z ?? 0).toBeGreaterThanOrEqual(1.92)
  })

  it('builds seaweed from ribbon fronds instead of stacked cylinders', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds, null, {
      layoutStyle: 'marine'
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const ribbonPlant = aquascapingGroup.children.find((child) => child.userData.plantType === 'ribbon-seaweed') as THREE.Group
    const fronds = ribbonPlant.children.filter((child) => child instanceof THREE.Mesh) as THREE.Mesh[]

    expect(fronds.length).toBeGreaterThan(0)
    expect(fronds.some((frond) => frond.geometry.type === 'PlaneGeometry')).toBe(true)
    expect(fronds.some((frond) => frond.geometry.type === 'CylinderGeometry')).toBe(false)
  })

  it('mixes sword and fan foliage into the planted aquascape', () => {
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

    expect(uniquePlantTypes.has('sword-leaf')).toBe(true)
    expect(uniquePlantTypes.has('fan-leaf')).toBe(true)
    expect(uniquePlantTypes.has('ribbon-seaweed')).toBe(false)
    expect(uniquePlantTypes.size).toBeGreaterThanOrEqual(2)
    expect(fanPlant.children.some((leaf) => leaf instanceof THREE.Mesh && leaf.geometry.type === 'ShapeGeometry')).toBe(true)
  })

  it('keeps ribbon seaweed as a minor planted accent instead of a background mass', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new AquascapingSystem(scene, bounds)

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const plantedMasses = aquascapingGroup.children.filter(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'planted-mass'
    )
    const ribbonMasses = plantedMasses.filter((plant) => plant.userData.plantType === 'ribbon-seaweed')
    const backgroundMasses = plantedMasses.filter((plant) => plant.userData.layer === 'background')

    expect(ribbonMasses).toEqual([])
    expect(backgroundMasses.some((plant) => plant.userData.plantType === 'sword-leaf')).toBe(true)
    expect(backgroundMasses.some((plant) => plant.userData.plantType === 'fan-leaf')).toBe(true)
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
    expect(freshwaterAccentTypes.has('crypt-clump')).toBe(false)
    expect(freshwaterAccentTypes.has('foreground-tuft')).toBe(false)
    expect(freshwaterAccentTypes.has('wall-tuft')).toBe(false)
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

  it('keeps repeated foliage opaque while reserving alpha cutouts for ribbon plants', () => {
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
    expect(backgroundLeaf.alphaTest).toBe(0)
    expect(backgroundLeaf.transmission).toBe(0)
    expect(backgroundRibbon.transparent).toBe(false)
    expect(backgroundRibbon.opacity).toBe(1)
    expect(backgroundRibbon.alphaTest).toBeGreaterThanOrEqual(0.34)
    expect(backgroundRibbon.transmission).toBe(0)

    getContextSpy.mockRestore()
  })

  it('lifts background planted foliage tint so masses read as green instead of black', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem

    const getPlantTint = (AquascapingSystem.prototype as unknown as {
      getPlantTint: (
        layer: 'foreground' | 'background' | 'midground',
        plantType: 'ribbon-seaweed' | 'sword-leaf' | 'fan-leaf',
        role?: 'repeated' | 'hero'
      ) => THREE.Color
    }).getPlantTint.bind(instance)

    const backgroundSword = getPlantTint('background', 'sword-leaf')
    const backgroundFan = getPlantTint('background', 'fan-leaf')
    const backgroundRibbon = getPlantTint('background', 'ribbon-seaweed')

    expect(backgroundSword.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.39)
    expect(backgroundFan.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.4)
    expect(backgroundRibbon.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.38)
  })

  it('renders background broad-leaf foliage as solid tinted shapes instead of narrow alpha cutouts', () => {
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

    const backgroundLeaf = createLeafMaterial(0.24, 'background', 'fan-leaf')

    expect(backgroundLeaf.map).toBeNull()
    expect(backgroundLeaf.alphaMap).toBeNull()
    expect(backgroundLeaf.alphaTest).toBe(0)
  })

  it('lifts authored plant assets away from black crush while keeping a green mass tint', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem

    const createAssetBackedMaterial = (AquascapingSystem.prototype as unknown as {
      createAssetBackedMaterial: (
        id: string,
        material: THREE.Material,
        userData?: Record<string, unknown>
      ) => THREE.Material
    }).createAssetBackedMaterial.bind(instance)

    const material = createAssetBackedMaterial(
      'plant-sword-cluster',
      new THREE.MeshPhysicalMaterial({
        color: '#1a2118',
        roughness: 0.74,
        metalness: 0.06,
        envMapIntensity: 0.36
      }),
      {
        role: 'hero-canopy',
        layer: 'background',
        plantType: 'sword-leaf'
      }
    ) as THREE.MeshPhysicalMaterial
    const lightness = material.color.getHSL({ h: 0, s: 0, l: 0 }).l

    expect(lightness).toBeGreaterThanOrEqual(0.34)
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).s).toBeGreaterThan(0.16)
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

  it('lifts hero ridge rock albedo away from black crush without changing its matte response', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem

    const createAssetBackedMaterial = (AquascapingSystem.prototype as unknown as {
      createAssetBackedMaterial: (
        id: string,
        material: THREE.Material,
        userData?: Record<string, unknown>
      ) => THREE.Material
    }).createAssetBackedMaterial.bind(instance)

    const material = createAssetBackedMaterial(
      'rock-ridge-hero',
      new THREE.MeshPhysicalMaterial({
        color: '#1d1815',
        roughness: 0.7,
        metalness: 0.08,
        envMapIntensity: 0.4,
        clearcoat: 0.16
      }),
      { role: 'hero-rock-ridge' }
    ) as THREE.MeshPhysicalMaterial

    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.41)
    expect(material.roughness).toBeGreaterThanOrEqual(0.82)
    expect(material.metalness).toBeLessThanOrEqual(0.03)
    expect(material.clearcoat).toBeLessThanOrEqual(0.02)
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

  it('lifts dark driftwood albedo floors so bark detail does not collapse into black', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem

    const createAssetBackedMaterial = (AquascapingSystem.prototype as unknown as {
      createAssetBackedMaterial: (
        id: string,
        material: THREE.Material,
        userData?: Record<string, unknown>
      ) => THREE.Material
    }).createAssetBackedMaterial.bind(instance)

    const material = createAssetBackedMaterial(
      'driftwood-hero',
      new THREE.MeshPhysicalMaterial({
        color: '#241913',
        roughness: 0.88,
        metalness: 0.1,
        envMapIntensity: 0.52,
        clearcoat: 0.2
      }),
      { role: 'hero-driftwood' }
    ) as THREE.MeshPhysicalMaterial

    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.32)
    expect(material.roughness).toBeGreaterThanOrEqual(0.9)
    expect(material.metalness).toBeLessThanOrEqual(0.03)
    expect(material.clearcoat).toBeLessThanOrEqual(0.03)
    expect(material.emissiveIntensity).toBeGreaterThanOrEqual(0.09)
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

  it('preserves authored driftwood base color textures while still lifting replacement materials away from black crush', () => {
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
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThanOrEqual(0.15)
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

  it('fits the driftwood asset core into a larger, taller forward-biased hero silhouette', () => {
    const instance = Object.create(AquascapingSystem.prototype) as AquascapingSystem
    const asset = createModelAssetScene('driftwood-hero')
    const tankSize = createOpenWaterBounds().getSize(new THREE.Vector3())

    const fitHeroDriftwoodAssetCore = (AquascapingSystem.prototype as unknown as {
      fitHeroDriftwoodAssetCore: (asset: THREE.Group, tankSize: THREE.Vector3) => void
    }).fitHeroDriftwoodAssetCore.bind(instance)

    fitHeroDriftwoodAssetCore(asset, tankSize)

    const fittedSize = getWorldBounds(asset).getSize(new THREE.Vector3())

    expect(fittedSize.x).toBeGreaterThanOrEqual(4.45)
    expect(fittedSize.y).toBeGreaterThanOrEqual(3.75)
    expect(fittedSize.z).toBeGreaterThanOrEqual(2.45)
    expect(asset.position.x).toBeGreaterThanOrEqual(1.02)
    expect(asset.position.y).toBeGreaterThanOrEqual(0.5)
    expect(asset.position.z).toBeGreaterThanOrEqual(0.34)
    expect(asset.rotation.x).toBeLessThanOrEqual(-0.2)
    expect(asset.rotation.y).toBeGreaterThanOrEqual(0.34)
    expect(asset.rotation.z).toBeGreaterThanOrEqual(-0.14)
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
    expect(heroDriftwood.children.some((child) => child.userData.assetId === 'driftwood-hero')).toBe(true)
    expect(heroDriftwood.children.some((child) => child.userData.role === 'driftwood-root-flare')).toBe(true)
    expect(heroDriftwood.children.filter((child) => child.userData.role === 'driftwood-branch-attachment').length).toBeGreaterThanOrEqual(2)
    expect(heroDriftwood.children.filter((child) => child.userData.role === 'epiphyte-cluster').length).toBeGreaterThanOrEqual(5)
    expect(heroDriftwood.children.filter((child) => child.userData.role === 'driftwood-moss-patch').length).toBeGreaterThanOrEqual(3)
    expect(heroDriftwood.children.filter((child) => child.userData.role === 'driftwood-fine-twig').length).toBeGreaterThanOrEqual(3)
    expect(heroDriftwood.children.filter((child) => child.userData.role === 'driftwood-root-base').length).toBeGreaterThanOrEqual(2)
    expect(heroDriftwood.children.some((child) => child.userData.role === 'driftwood-local-shadow')).toBe(true)
    expect(heroDriftwood.children.some((child) => child.userData.role === 'driftwood-burial-shadow')).toBe(true)
    expect(heroRockRidge).toBeDefined()
    expect(heroRockRidge.userData.assetId).toBe('rock-ridge-hero')
    expect(heroCanopyAssets.length).toBeGreaterThanOrEqual(2)
    expect(heroCanopyAssets.some((child) => child.userData.assetId === 'plant-sword-cluster')).toBe(true)
    expect(plantedMassAssets.length).toBeGreaterThanOrEqual(3)
    expect(plantedMassAssets.some((child) => child.userData.assetId === 'plant-sword-cluster')).toBe(true)
    expect(plantedMassAssets.some((child) => child.userData.assetId === 'plant-fan-cluster')).toBe(true)

    getContextSpy.mockRestore()
  })

  it('keeps authored driftwood assets inside a larger hero silhouette instead of letting the raw asset read as the whole hardscape', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext())

    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const driftwoodAsset = createModelAssetScene('driftwood-hero')

    new AquascapingSystem(scene, bounds, {
      manifest: { textures: [], models: [], environment: [] },
      textures: {},
      environment: {},
      models: {
        'driftwood-hero': { scene: driftwoodAsset, sourceMesh: null },
        'rock-ridge-hero': null,
        'plant-sword-cluster': null,
        'plant-fan-cluster': null
      }
    })

    const aquascapingGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const heroDriftwood = aquascapingGroup.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-driftwood'
    )
    const assetCore = heroDriftwood?.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.assetId === 'driftwood-hero'
    )
    const heroSize = heroDriftwood ? getWorldBounds(heroDriftwood).getSize(new THREE.Vector3()) : null
    const assetSize = assetCore ? getWorldBounds(assetCore).getSize(new THREE.Vector3()) : null

    expect(heroDriftwood).toBeDefined()
    expect(assetCore).toBeDefined()
    expect(heroSize?.x ?? 0).toBeGreaterThan((assetSize?.x ?? 0) * 1.5)
    expect(heroSize?.y ?? 0).toBeGreaterThan((assetSize?.y ?? 0) * 1.4)

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
    const trunks = driftwood?.children.filter((child) => child.userData.role === 'driftwood-trunk') ?? []
    const branchAttachments = driftwood?.children.filter((child) => child.userData.role === 'driftwood-branch-attachment') ?? []
    const ridgeRocks = ridge?.children.filter((child) => child.userData.role === 'ridge-rock') ?? []

    expect(trunks).toHaveLength(1)
    expect(branchAttachments.length).toBeGreaterThanOrEqual(2)
    expect(ridgeRocks.length).toBeGreaterThan(0)

    getContextSpy.mockRestore()
  })
})
