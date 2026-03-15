import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import type { Theme } from '../types/aquarium'
import { GodRaysEffect, GodRaysShader, resolveGodRayThemeValues, resolveSuspendedMoteScatter } from './GodRays'

describe('GodRays underwater scatter', () => {
  it('derives clearer ray colors and murkier scatter from the active theme', () => {
    const clearTheme: Theme = {
      waterTint: '#65b6ca',
      fogDensity: 0.12,
      particleDensity: 0.14,
      waveStrength: 0.42,
      waveSpeed: 0.36,
      layoutStyle: 'planted',
      glassFrameStrength: 0.5,
      glassTint: '#b9e0ea',
      glassReflectionStrength: 0.44,
      surfaceGlowStrength: 0.7,
      causticsStrength: 0.42
    }
    const murkyTheme: Theme = {
      waterTint: '#35554b',
      fogDensity: 0.62,
      particleDensity: 0.7,
      waveStrength: 0.42,
      waveSpeed: 0.36,
      layoutStyle: 'planted',
      glassFrameStrength: 0.5,
      glassTint: '#92b6ae',
      glassReflectionStrength: 0.18,
      surfaceGlowStrength: 0.18,
      causticsStrength: 0.12
    }

    const clearValues = resolveGodRayThemeValues(clearTheme)
    const murkyValues = resolveGodRayThemeValues(murkyTheme)
    const clearRayLuminance = clearValues.rayTint.r + clearValues.rayTint.g + clearValues.rayTint.b
    const murkyRayLuminance = murkyValues.rayTint.r + murkyValues.rayTint.g + murkyValues.rayTint.b

    expect(clearValues.opacityMultiplier).toBeGreaterThan(murkyValues.opacityMultiplier)
    expect(murkyValues.scatterMultiplier).toBeGreaterThan(clearValues.scatterMultiplier)
    expect(clearValues.bloomRadius).toBeLessThan(murkyValues.bloomRadius)
    expect(clearRayLuminance).toBeGreaterThan(murkyRayLuminance)
    expect(clearValues.scatterTint.getHexString()).not.toBe(murkyValues.scatterTint.getHexString())
  })

  it('exposes mote-scatter uniforms in the shader instead of a flat ray overlay', () => {
    expect(GodRaysShader.uniforms.time.value).toBe(0)
    expect(GodRaysShader.uniforms.scatterStrength.value).toBe(0)
    expect(GodRaysShader.uniforms.scatterDrift.value).toBeInstanceOf(THREE.Vector2)
    expect(GodRaysShader.uniforms.rayTint.value).toBeInstanceOf(THREE.Color)
    expect(GodRaysShader.uniforms.scatterTint.value).toBeInstanceOf(THREE.Color)
    expect(GodRaysShader.fragmentShader).toContain('scatterStrength')
    expect(GodRaysShader.fragmentShader).toContain('scatterDrift')
    expect(GodRaysShader.fragmentShader).toContain('rayTint')
    expect(GodRaysShader.fragmentShader).toContain('scatterTint')
    expect(GodRaysShader.fragmentShader).toContain('hash12')
  })

  it('derives scattering intensity from the suspended mote layer visibility and density', () => {
    const scene = new THREE.Scene()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(180 * 3), 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        opacityScale: { value: 0.22 }
      }
    })

    const motes = new THREE.Points(geometry, material)
    motes.name = 'suspended-motes'
    scene.add(motes)

    expect(resolveSuspendedMoteScatter(scene)).toBeGreaterThan(0.15)

    motes.visible = false

    expect(resolveSuspendedMoteScatter(scene)).toBe(0)
  })

  it('updates ray uniforms from suspended motes so the shafts gain drifting underwater scatter', () => {
    const scene = new THREE.Scene()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(180 * 3), 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        opacityScale: { value: 0.22 }
      }
    })

    const motes = new THREE.Points(geometry, material)
    motes.name = 'suspended-motes'
    scene.add(motes)

    const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100)
    camera.position.set(0, 0, 20)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()

    const instance = Object.create(GodRaysEffect.prototype) as GodRaysEffect
    const internals = instance as unknown as {
      scene: THREE.Scene
      camera: THREE.Camera
      sunMesh: THREE.Group
      themeValues: { opacityMultiplier: number; scatterMultiplier: number }
      godRaysPass: {
        uniforms: {
          sunPosition: { value: THREE.Vector2 }
          opacity: { value: number }
          time: { value: number }
          scatterStrength: { value: number }
          scatterDrift: { value: THREE.Vector2 }
          rayTint: { value: THREE.Color }
          scatterTint: { value: THREE.Color }
        }
      }
    }

    internals.scene = scene
    internals.camera = camera
    internals.sunMesh = new THREE.Group()
    internals.themeValues = {
      opacityMultiplier: 1,
      scatterMultiplier: 1
    }
    internals.godRaysPass = {
      uniforms: {
        sunPosition: { value: new THREE.Vector2() },
        opacity: { value: 0 },
        time: { value: 0 },
        scatterStrength: { value: 0 },
        scatterDrift: { value: new THREE.Vector2() },
        rayTint: { value: new THREE.Color('#ffffff') },
        scatterTint: { value: new THREE.Color('#88cddd') }
      }
    }

    instance.update(8)

    expect(internals.godRaysPass.uniforms.time.value).toBe(8)
    expect(internals.godRaysPass.uniforms.scatterStrength.value).toBeGreaterThan(0.15)
    expect(internals.godRaysPass.uniforms.scatterDrift.value.length()).toBeGreaterThan(0)
    expect(internals.godRaysPass.uniforms.opacity.value).toBeGreaterThanOrEqual(0.15)
  })

  it('applies theme-driven tint and bloom tuning to the post effect', () => {
    const instance = Object.create(GodRaysEffect.prototype) as GodRaysEffect
    const internals = instance as unknown as {
      themeValues: { opacityMultiplier: number; scatterMultiplier: number }
      godRaysPass: {
        uniforms: {
          rayTint: { value: THREE.Color }
          scatterTint: { value: THREE.Color }
        }
      }
      bloomPass: {
        strength: number
        radius: number
        threshold: number
      }
    }

    internals.themeValues = {
      opacityMultiplier: 1,
      scatterMultiplier: 1
    }
    internals.godRaysPass = {
      uniforms: {
        rayTint: { value: new THREE.Color('#ffffff') },
        scatterTint: { value: new THREE.Color('#ffffff') }
      }
    }
    internals.bloomPass = {
      strength: 0,
      radius: 0,
      threshold: 0
    }

    instance.applyTheme({
      waterTint: '#65b6ca',
      fogDensity: 0.12,
      particleDensity: 0.14,
      waveStrength: 0.42,
      waveSpeed: 0.36,
      layoutStyle: 'planted',
      glassFrameStrength: 0.5,
      glassTint: '#b9e0ea',
      glassReflectionStrength: 0.44,
      surfaceGlowStrength: 0.7,
      causticsStrength: 0.42
    })

    expect(internals.themeValues.opacityMultiplier).toBeGreaterThan(1)
    expect(internals.themeValues.scatterMultiplier).toBeGreaterThan(0.7)
    expect(internals.godRaysPass.uniforms.rayTint.value.getHexString()).not.toBe('ffffff')
    expect(internals.godRaysPass.uniforms.scatterTint.value.getHexString()).not.toBe('ffffff')
    expect(internals.bloomPass.strength).toBeGreaterThan(0.2)
    expect(internals.bloomPass.threshold).toBeGreaterThan(0.5)
  })
})
