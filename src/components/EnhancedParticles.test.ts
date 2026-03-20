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
    expect(((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.uniforms.opacityScale.value) ?? 0).toBeLessThan(0.18)
    expect((((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.uniforms.color.value) as THREE.Color | undefined)?.g ?? 0)
      .toBeGreaterThan(((((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.uniforms.color.value) as THREE.Color | undefined)?.b ?? 0))
  })

  it('keeps a faint freshwater haze on simple quality while reducing the suspended motes', () => {
    const scene = new THREE.Scene()
    const bounds = createOpenWaterBounds()
    const particleSystem = new EnhancedParticleSystem(scene, bounds)

    particleSystem.setQuality('simple')

    const particleGroup = scene.children.find((child) => child instanceof THREE.Group) as THREE.Group
    const bubblePlumes = particleGroup.children.find(
      (child): child is THREE.Points => child instanceof THREE.Points && child.userData.role === 'bubble-plumes'
    )
    const suspendedMotes = particleGroup.children.find(
      (child): child is THREE.Points => child instanceof THREE.Points && child.userData.role === 'suspended-motes'
    )

    expect(bubblePlumes?.visible).toBe(true)
    expect(suspendedMotes?.visible).toBe(true)
    expect(((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.uniforms.opacityScale.value) ?? 0)
      .toBeGreaterThan(0.03)

    particleSystem.setQuality('standard')

    expect(suspendedMotes?.visible).toBe(true)
    expect(((suspendedMotes?.material as THREE.ShaderMaterial | undefined)?.uniforms.opacityScale.value) ?? 0)
      .toBeGreaterThan(0.1)
  })
})
