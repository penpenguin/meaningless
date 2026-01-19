import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { applyGradientBackground, applyThemeToScene } from '../components/AdvancedScene'
import type { Theme } from '../types/aquarium'

const theme: Theme = {
  waterTint: '#ff3366',
  fogDensity: 0.85,
  particleDensity: 0.2,
  waveStrength: 0.3,
  waveSpeed: 0.4,
  glassFrameStrength: 0.5
}

describe('applyGradientBackground', () => {
  let stops: string[] = []
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
    stops = []
  })

  it('uses stored theme values for gradient and fog', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        const gradient = {
          addColorStop: (_offset: number, color: string) => {
            stops.push(color)
          }
        }

        return {
          createLinearGradient: () => gradient,
          fillRect: vi.fn(),
          fillStyle: ''
        } as unknown as CanvasRenderingContext2D
      })

    const scene = new THREE.Scene()

    applyThemeToScene(scene, theme)
    applyGradientBackground(scene)

    expect(scene.background).toBeInstanceOf(THREE.CanvasTexture)
    const fog = scene.fog as THREE.FogExp2
    expect(fog.density).toBeCloseTo(theme.fogDensity)
    expect(fog.color.getHexString()).toBe(theme.waterTint.replace('#', '').toLowerCase())
    expect(stops.map((color) => color.toLowerCase())).toContain(theme.waterTint.toLowerCase())
  })
})
