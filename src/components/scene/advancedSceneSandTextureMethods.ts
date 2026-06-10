/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DetailedFishSystem } from '../fish/DetailedFish'
import { EnhancedParticleSystem } from '../effects/EnhancedParticles'
import { EnvironmentLoader, createEnvironmentBackdropTexture } from './Environment'
import { AquascapingSystem, resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors } from '../aquascape/Aquascaping'
import { GodRaysEffect } from '../effects/GodRays'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { defaultTheme } from '../../utils/storage/stateSchema'
import { disposeSceneResources } from '../../utils/three/threeDisposal'
import { createOpenWaterBounds } from '../../utils/layout/sceneBounds'
import { createEmptySpanTimingStats, createEmptyPerformanceStats, measurePerformanceSpan, readRendererDebugStats } from '../../utils/performance/performanceStats'
import { DEFAULT_PERFORMANCE_TUNING } from '../../utils/performance/performanceTuning'
import { resolveAdaptiveRenderScale } from '../../utils/performance/renderScale'
import { shouldRunQualityCadencedUpdate } from '../../utils/performance/updateCadence'
import { AQUARIUM_CAMERA_FRAMING, AQUARIUM_DEPTH_LAYER_ANCHORS, AQUARIUM_TANK_DIMENSIONS, MAIN_LIGHT_RIG_ANCHORS, MAIN_LIGHT_TARGET_OFFSETS, PRIMARY_SHADOW_CAMERA_RANGE, PRIMARY_SHADOW_FRUSTUM_RATIOS, resolveDefaultCameraPosition, resolveDefaultControlsTarget, resolveLightTarget, resolvePhotoModeCameraPosition, resolvePhotoModeControlsTarget, resolveTankRelativePosition } from '../../utils/layout/aquariumLayout'
import { ScreenSpaceWaterHazeShader, syncScreenSpaceWaterHazePass } from '../effects/screenSpaceWaterHaze'
import { AQUARIUM_LAYERED_LIGHTING_ANCHORS, SURFACE_CAUSTIC_PHASE_FAMILY } from './sceneLighting'
import { SUBSTRATE_GEOMETRY_SEGMENTS, SUBSTRATE_VISUAL_FOOTPRINT_SCALE } from './substrateGeometry'
import { sampleSubstrateHeight } from './advancedSceneSubstrateHeight'
import { applyGradientBackground, applyThemeToScene, resolvePremiumThemeValues, resolveTheme, usesOpenWaterPresentation } from './advancedSceneTheme'

export function createSubstrateDetailTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.moveTo === 'function' &&
      typeof ctx.bezierCurveTo === 'function' &&
      typeof ctx.stroke === 'function'
    ) {
      ctx.globalAlpha = 0.42
      for (let i = 0; i < 10; i++) {
        const startY = canvas.height * (0.12 + (i * 0.085))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(121, 87, 53, 0.46)' : 'rgba(244, 215, 176, 0.34)'
        ctx.lineWidth = 14 + (i % 3) * 2
        ctx.beginPath()
        ctx.moveTo(-24, startY)
        ctx.bezierCurveTo(
          canvas.width * 0.18,
          startY + 18,
          canvas.width * 0.74,
          startY - 22,
          canvas.width + 24,
          startY + 12
        )
        ctx.stroke()
      }
    }

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.ellipse === 'function' &&
      typeof ctx.fill === 'function'
    ) {
      ctx.globalAlpha = 0.32
      for (let i = 0; i < 36; i++) {
        const x = (i * 73) % canvas.width
        const y = (i * 59) % canvas.height
        const width = 26 + ((i * 11) % 34)
        const height = 10 + ((i * 7) % 14)
        ctx.fillStyle = i % 3 === 0 ? 'rgba(90, 63, 40, 0.42)' : 'rgba(255, 236, 204, 0.28)'
        ctx.beginPath()
        ctx.ellipse(x, y, width, height, (i % 5) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

export function createSubstrateDetailAlphaTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.moveTo === 'function' &&
      typeof ctx.bezierCurveTo === 'function' &&
      typeof ctx.stroke === 'function'
    ) {
      ctx.globalAlpha = 0.9
      for (let i = 0; i < 9; i++) {
        const startY = canvas.height * (0.14 + (i * 0.09))
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.78)' : 'rgba(185, 185, 185, 0.58)'
        ctx.lineWidth = 18 + (i % 2) * 4
        ctx.beginPath()
        ctx.moveTo(-24, startY)
        ctx.bezierCurveTo(
          canvas.width * 0.22,
          startY - 8,
          canvas.width * 0.68,
          startY + 20,
          canvas.width + 24,
          startY - 6
        )
        ctx.stroke()
      }
    }

    if (
      typeof ctx.beginPath === 'function' &&
      typeof ctx.ellipse === 'function' &&
      typeof ctx.fill === 'function'
    ) {
      ctx.globalAlpha = 0.56
      for (let i = 0; i < 28; i++) {
        const x = (i * 61) % canvas.width
        const y = (i * 47) % canvas.height
        const width = 22 + ((i * 13) % 28)
        const height = 9 + ((i * 5) % 12)
        const shade = 180 + ((i * 9) % 70)
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
        ctx.beginPath()
        ctx.ellipse(x, y, width, height, (i % 6) * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    return texture
  }

export function createSubstrateHorizonFadeTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
      return texture
    }

    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(0.26, 'rgba(0, 0, 0, 0.08)')
    gradient.addColorStop(0.58, 'rgba(255, 255, 255, 0.46)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 1)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    texture.needsUpdate = true
    return texture
  }

export function createSandNormalTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#8080ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.42
    for (let i = 0; i < 22; i++) {
      const startY = canvas.height * (0.06 + (i * 0.045))
      ctx.strokeStyle = i % 2 === 0 ? '#8f8fff' : '#7070ff'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.24,
        startY + 16,
        canvas.width * 0.7,
        startY - 10,
        canvas.width + 24,
        startY + 12
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.6 + 0.4
      ctx.fillStyle = Math.random() > 0.5 ? '#8a8aff' : '#7676ff'
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }

export function createSandRoughnessTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const roughnessGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    roughnessGradient.addColorStop(0, '#7c7c7c')
    roughnessGradient.addColorStop(0.45, '#969696')
    roughnessGradient.addColorStop(1, '#bdbdbd')
    ctx.fillStyle = roughnessGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.34
    for (let i = 0; i < 20; i++) {
      const startY = canvas.height * (0.08 + (i * 0.048))
      ctx.strokeStyle = i % 2 === 0 ? '#5d5d5d' : '#c8c8c8'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.18,
        startY + 12,
        canvas.width * 0.76,
        startY - 14,
        canvas.width + 24,
        startY + 8
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1700; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.8 + 0.4
      const shade = 84 + Math.floor(Math.random() * 120)
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }

export function createSandAoTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const aoGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    aoGradient.addColorStop(0, '#d8d8d8')
    aoGradient.addColorStop(0.45, '#ababab')
    aoGradient.addColorStop(1, '#767676')
    ctx.fillStyle = aoGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = 0.26
    for (let i = 0; i < 24; i++) {
      const startY = canvas.height * (0.07 + (i * 0.04))
      ctx.strokeStyle = i % 3 === 0 ? '#5a5a5a' : '#909090'
      ctx.lineWidth = 8 + (i % 2)
      ctx.beginPath()
      ctx.moveTo(-24, startY)
      ctx.bezierCurveTo(
        canvas.width * 0.18,
        startY + 12,
        canvas.width * 0.74,
        startY - 10,
        canvas.width + 24,
        startY + 8
      )
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 1.6 + 0.5
      const shade = 96 + Math.floor(Math.random() * 72)
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.2
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const width = 16 + Math.random() * 44
      const height = 7 + Math.random() * 14
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 56, 56, 0.6)' : 'rgba(188, 188, 188, 0.42)'
      ctx.beginPath()
      ctx.ellipse(x, y, width, height, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    return texture
  }
