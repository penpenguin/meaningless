import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AquascapingSystem } from './Aquascaping'
import { createOpenWaterBounds } from './sceneBounds'

const createMockCanvasContext = (): CanvasRenderingContext2D => {
  const gradient = {
    addColorStop: vi.fn()
  }

  return {
    createLinearGradient: () => gradient,
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

  it('lets plants and coral branches cast shadows onto the substrate', () => {
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
    const coralBranches = aquascapingGroup.children
      .filter((child) => child instanceof THREE.Group && child.userData.plantType === undefined)
      .flatMap((child) => (child as THREE.Group).children)
      .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry.type === 'ConeGeometry')

    expect(plantMeshes.length).toBeGreaterThan(0)
    expect(plantMeshes.every((mesh) => mesh.castShadow)).toBe(true)
    expect(plantMeshes.every((mesh) => mesh.receiveShadow)).toBe(true)
    expect(coralBranches.length).toBeGreaterThan(0)
    expect(coralBranches.every((mesh) => mesh.castShadow)).toBe(true)
  })
})
