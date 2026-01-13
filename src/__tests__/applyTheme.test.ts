import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyThemeToScene } from '../components/AdvancedScene'
import type { Theme } from '../types/aquarium'

const baseTheme: Theme = {
  waterTint: '#112233',
  fogDensity: 0.25,
  particleDensity: 0.2,
  waveStrength: 0.3,
  waveSpeed: 0.4,
  glassFrameStrength: 0.5
}

describe('applyThemeToScene', () => {
  it('replaces linear fog with FogExp2 and updates density', () => {
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x000000, 10, 100)

    applyThemeToScene(scene, baseTheme)

    expect(scene.fog).toBeInstanceOf(THREE.FogExp2)
    const fog = scene.fog as THREE.FogExp2
    expect(fog.density).toBeCloseTo(baseTheme.fogDensity)
    expect(fog.color.getHexString()).toBe('112233')
  })

  it('updates existing FogExp2 color and density', () => {
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.01)

    applyThemeToScene(scene, baseTheme)

    const fog = scene.fog as THREE.FogExp2
    expect(fog.density).toBeCloseTo(baseTheme.fogDensity)
    expect(fog.color.getHexString()).toBe('112233')
  })
})
