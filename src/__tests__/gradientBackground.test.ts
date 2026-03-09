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
  let radialGradientCalls = 0
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  afterEach(() => {
    getContextSpy?.mockRestore()
    getContextSpy = null
    stops = []
    radialGradientCalls = 0
  })

  it('uses stored theme values and soft radial light blooms for gradient and fog', () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => {
        const gradient = {
          addColorStop: (_offset: number, color: string) => {
            stops.push(color)
          }
        }

        const radialGradient = {
          addColorStop: vi.fn()
        }

        return {
          createLinearGradient: () => gradient,
          createRadialGradient: () => {
            radialGradientCalls += 1
            return radialGradient
          },
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          stroke: vi.fn(),
          fillStyle: '',
          globalAlpha: 1,
          lineWidth: 0,
          strokeStyle: ''
        } as unknown as CanvasRenderingContext2D
      })

    const scene = new THREE.Scene()

    applyThemeToScene(scene, theme)
    applyGradientBackground(scene)

    expect(scene.background).toBeInstanceOf(THREE.CanvasTexture)
    const fog = scene.fog as THREE.FogExp2
    expect(fog.density).toBeCloseTo(theme.fogDensity)
    expect(fog.color.getHexString()).toBe(theme.waterTint.replace('#', '').toLowerCase())
    expect(radialGradientCalls).toBeGreaterThanOrEqual(2)
    expect(stops.map((color) => color.toLowerCase())).toContain(theme.waterTint.toLowerCase())
  })
})
