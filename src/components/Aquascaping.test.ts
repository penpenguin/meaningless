import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AquascapingSystem } from './Aquascaping'
import { createOpenWaterBounds } from './sceneBounds'

describe('AquascapingSystem composition', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
  })

  it('creates a hero rock and layered plant clusters instead of repeating the same silhouette', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        const gradient = {
          addColorStop: vi.fn()
        }

        return {
          createLinearGradient: () => gradient,
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          globalCompositeOperation: 'source-over'
        } as unknown as CanvasRenderingContext2D
      })

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
})
