import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { EnhancedParticleSystem } from './EnhancedParticles'
import { createOpenWaterBounds } from './sceneBounds'

describe('EnhancedParticleSystem layering', () => {
  it('layers localized bubble plumes with suspended motes instead of one generic bubble cloud', () => {
    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()

    new EnhancedParticleSystem(scene, bounds)

    const particleGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const particleLayers = particleGroup.children.filter((child): child is THREE.Points => child instanceof THREE.Points)
    const bubblePlumes = particleLayers.find((child) => child.userData.role === 'bubble-plumes')
    const suspendedMotes = particleLayers.find((child) => child.userData.role === 'suspended-motes')

    expect(bubblePlumes).toBeDefined()
    expect(suspendedMotes).toBeDefined()
    expect((bubblePlumes?.userData.emitters as THREE.Vector3[] | undefined)?.length).toBeGreaterThanOrEqual(3)
    expect((suspendedMotes?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined)?.count)
      .toBeGreaterThan((bubblePlumes?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined)?.count ?? 0)
    expect((bubblePlumes?.material as THREE.ShaderMaterial | undefined)?.blending).toBe(THREE.AdditiveBlending)
    expect((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.blending).toBe(THREE.NormalBlending)
  })

  it('drops the suspended motes on low quality but keeps the bubble plumes active', () => {
    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const particleSystem = new EnhancedParticleSystem(scene, bounds)

    particleSystem.setQuality('low')

    const particleGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const bubblePlumes = particleGroup.children.find(
      (child): child is THREE.Points => child instanceof THREE.Points && child.userData.role === 'bubble-plumes'
    )
    const suspendedMotes = particleGroup.children.find(
      (child): child is THREE.Points => child instanceof THREE.Points && child.userData.role === 'suspended-motes'
    )

    expect(bubblePlumes?.visible).toBe(true)
    expect(suspendedMotes?.visible).toBe(false)

    particleSystem.setQuality('medium')

    expect(suspendedMotes?.visible).toBe(true)
  })
})
