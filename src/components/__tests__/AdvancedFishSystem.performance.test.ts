import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { AdvancedFishSystem } from '../AdvancedFishSystem'
import type { BoidsSystem } from '../../utils/Boids'

type TestBoid = { position: THREE.Vector3; velocity: THREE.Vector3 }

const createSystem = (boids: TestBoid[]): AdvancedFishSystem => {
  const system = Object.create(AdvancedFishSystem.prototype) as AdvancedFishSystem & Record<string, unknown>

  system['camera'] = {
    position: new THREE.Vector3(0, 0, 40),
    projectionMatrix: new THREE.Matrix4(),
    matrixWorldInverse: new THREE.Matrix4()
  } as unknown as THREE.Camera

  system['cameraMatrix'] = new THREE.Matrix4()
  system['tempDirection'] = new THREE.Vector3()
  system['tempSphere'] = new THREE.Sphere()

  system['frustum'] = {
    setFromProjectionMatrix: vi.fn(),
    intersectsSphere: vi.fn().mockReturnValue(true)
  } as unknown as THREE.Frustum

  system['dummy'] = new THREE.Object3D()

  system['lodLevels'] = [
    { distance: 0, instanceCount: 10, quality: 'high' },
    { distance: 25, instanceCount: 10, quality: 'medium' },
    { distance: 50, instanceCount: 10, quality: 'low' }
  ]

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshPhongMaterial()

  system['instancedMeshes'] = new Map([
    [
      'Test',
      [
        new THREE.InstancedMesh(geometry, material, 10),
        new THREE.InstancedMesh(geometry, material, 10),
        new THREE.InstancedMesh(geometry, material, 10)
      ]
    ]
  ])

  system['boidsSystems'] = new Map<string, BoidsSystem>([
    ['Test', { boids } as unknown as BoidsSystem]
  ])

  system['renderStats'] = { visibleFish: 0, culledFish: 0, frameTime: 0 }

  return system
}

describe('AdvancedFishSystem performance', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updateLOD reuses velocity vectors instead of cloning per boid', () => {
    const boids: TestBoid[] = [
      { position: new THREE.Vector3(5, 0, 0), velocity: new THREE.Vector3(1, 0, 0) },
      { position: new THREE.Vector3(28, 0, 0), velocity: new THREE.Vector3(0, 1, 0) },
      { position: new THREE.Vector3(60, 0, 0), velocity: new THREE.Vector3(0, 0, 1) }
    ]

    const cloneSpies = boids.map(boid => vi.spyOn(boid.velocity, 'clone'))

    const system = createSystem(boids)

    ;(system as unknown as { updateLOD: () => void }).updateLOD()

    cloneSpies.forEach(spy => expect(spy).not.toHaveBeenCalled())
  })
})
