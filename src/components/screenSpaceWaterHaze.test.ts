import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { Theme } from '../types/aquarium'
import { syncScreenSpaceWaterHazePass } from './screenSpaceWaterHaze'

const createPass = () => ({
  enabled: false,
  uniforms: {
    hazeColor: { value: new THREE.Color('#ffffff') },
    opacity: { value: 0 },
    innerRadius: { value: 0 },
    outerRadius: { value: 0 },
    lowerStrength: { value: 0 },
    aspect: { value: 1 },
    blurRadius: { value: 0 },
    edgeBlurStrength: { value: 0 },
    lowerBlurStrength: { value: 0 },
    horizonY: { value: 0 },
    horizonWidth: { value: 0 },
    horizonStrength: { value: 0 }
  }
})

describe('syncScreenSpaceWaterHazePass', () => {
  it('enables haze for the clear planted presentation used by the runtime aquarium', () => {
    const pass = createPass()
    const theme: Theme = {
      waterTint: '#0b5666',
      fogDensity: 0.018,
      particleDensity: 0.42,
      waveStrength: 0.58,
      waveSpeed: 0.72,
      layoutStyle: 'planted',
      glassFrameStrength: 0.78,
      glassTint: '#cfe7ee',
      glassReflectionStrength: 0.4,
      surfaceGlowStrength: 0.57,
      causticsStrength: 0.43
    }

    syncScreenSpaceWaterHazePass(pass as unknown as ShaderPass, theme, 'standard', 16 / 9)

    expect(pass.enabled).toBe(true)
    expect(pass.uniforms.opacity.value).toBeGreaterThan(0.08)
    expect(pass.uniforms.opacity.value).toBeLessThan(0.18)
    expect(pass.uniforms.blurRadius.value).toBeGreaterThan(0.006)
    expect(pass.uniforms.blurRadius.value).toBeLessThanOrEqual(0.016)
    expect(pass.uniforms.horizonStrength.value).toBeGreaterThan(0.3)
    expect(pass.uniforms.horizonStrength.value).toBeLessThanOrEqual(0.72)
    expect(pass.uniforms.aspect.value).toBeCloseTo(16 / 9)
  })

  it('keeps haze disabled for ordinary murkier planted layouts', () => {
    const pass = createPass()
    const theme: Theme = {
      waterTint: '#0e3d4e',
      fogDensity: 0.4,
      particleDensity: 0.4,
      waveStrength: 0.7,
      waveSpeed: 0.8,
      layoutStyle: 'planted',
      glassFrameStrength: 0.6,
      glassTint: '#c3dde3',
      glassReflectionStrength: 0.32,
      surfaceGlowStrength: 0.45,
      causticsStrength: 0.3
    }

    syncScreenSpaceWaterHazePass(pass as unknown as ShaderPass, theme, 'standard')

    expect(pass.enabled).toBe(false)
    expect(pass.uniforms.opacity.value).toBe(0)
    expect(pass.uniforms.blurRadius.value).toBe(0)
    expect(pass.uniforms.horizonStrength.value).toBe(0)
  })
})
