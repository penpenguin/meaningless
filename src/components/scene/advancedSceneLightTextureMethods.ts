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

export function createWaterSurfaceTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.6, 1.4)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, 'rgba(234, 240, 231, 0.28)')
    gradient.addColorStop(0.5, 'rgba(174, 194, 182, 0.08)')
    gradient.addColorStop(1, 'rgba(245, 247, 240, 0.16)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 18; i++) {
      const x = ((i * 83) % 460) + 26
      const y = ((i * 59) % 360) + 48
      const radius = 44 + ((i % 4) * 18)
      const bloom = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius)
      bloom.addColorStop(0, 'rgba(241, 245, 238, 0.18)')
      bloom.addColorStop(0.45, 'rgba(195, 214, 201, 0.08)')
      bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = bloom
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 8; i++) {
      const x = ((i * 111) % 420) + 40
      const y = ((i * 73) % 300) + 90
      const radius = 96 + (i * 6)
      const haze = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius)
      haze.addColorStop(0, 'rgba(238, 241, 234, 0.07)')
      haze.addColorStop(0.5, 'rgba(183, 200, 190, 0.04)')
      haze.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = haze
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createNearSurfaceLightTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.14, 1.04)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.closePath !== 'function' ||
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const surfaceFalloff = ctx.createLinearGradient(0, 0, 0, canvas.height)
    surfaceFalloff.addColorStop(0, 'rgba(236, 238, 226, 0.24)')
    surfaceFalloff.addColorStop(0.22, 'rgba(200, 206, 188, 0.15)')
    surfaceFalloff.addColorStop(0.48, 'rgba(116, 125, 106, 0.07)')
    surfaceFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = surfaceFalloff
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.08, topWidth: 108, midWidth: 170, bottomWidth: 214, drift: -20, alpha: 0.15 },
      { x: 0.26, topWidth: 98, midWidth: 154, bottomWidth: 198, drift: 10, alpha: 0.16 },
      { x: 0.48, topWidth: 122, midWidth: 182, bottomWidth: 236, drift: -8, alpha: 0.19 },
      { x: 0.7, topWidth: 98, midWidth: 154, bottomWidth: 198, drift: 18, alpha: 0.16 },
      { x: 0.9, topWidth: 92, midWidth: 146, bottomWidth: 188, drift: -12, alpha: 0.14 }
    ].forEach((sheet) => {
      const centerX = canvas.width * sheet.x
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, `rgba(242, 243, 232, ${sheet.alpha})`)
      gradient.addColorStop(0.18, `rgba(205, 210, 193, ${sheet.alpha * 0.76})`)
      gradient.addColorStop(0.52, `rgba(126, 137, 118, ${sheet.alpha * 0.28})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(centerX - sheet.topWidth, 0)
      ctx.bezierCurveTo(
        centerX - sheet.midWidth,
        canvas.height * 0.2,
        centerX - sheet.bottomWidth + sheet.drift,
        canvas.height * 0.66,
        centerX - (sheet.bottomWidth * 0.72) + sheet.drift,
        canvas.height
      )
      ctx.lineTo(centerX + (sheet.bottomWidth * 0.8) + sheet.drift, canvas.height)
      ctx.bezierCurveTo(
        centerX + sheet.bottomWidth + sheet.drift,
        canvas.height * 0.64,
        centerX + sheet.midWidth,
        canvas.height * 0.22,
        centerX + sheet.topWidth,
        0
      )
      ctx.closePath()
      ctx.fill()
    })

    ;[
      { x: 0.18, y: 0.18, radius: 108, alpha: 0.11 },
      { x: 0.42, y: 0.24, radius: 140, alpha: 0.15 },
      { x: 0.64, y: 0.16, radius: 110, alpha: 0.13 },
      { x: 0.84, y: 0.22, radius: 112, alpha: 0.11 }
    ].forEach((bloom) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius * 0.1,
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius
      )
      gradient.addColorStop(0, `rgba(242, 243, 233, ${bloom.alpha})`)
      gradient.addColorStop(0.42, `rgba(202, 209, 191, ${bloom.alpha * 0.44})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * bloom.x) - bloom.radius,
        (canvas.height * bloom.y) - bloom.radius,
        bloom.radius * 2,
        bloom.radius * 2
      )
    })

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.16, y: 0.42, radius: 90, alpha: 0.11 },
      { x: 0.34, y: 0.62, radius: 102, alpha: 0.14 },
      { x: 0.58, y: 0.74, radius: 114, alpha: 0.16 },
      { x: 0.82, y: 0.54, radius: 92, alpha: 0.13 }
    ].forEach((breakup) => {
      const erode = ctx.createRadialGradient(
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius * 0.08,
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius
      )
      erode.addColorStop(0, `rgba(255, 255, 255, ${breakup.alpha})`)
      erode.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = erode
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createMidwaterLightTexture(this: any, variant: 'fill' | 'breakup' | 'combined'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    const includesFill = variant === 'fill' || variant === 'combined'
    const includesBreakup = variant === 'breakup' || variant === 'combined'
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.08, includesFill && !includesBreakup ? 1.02 : 1.08)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function' ||
      typeof ctx.beginPath !== 'function' ||
      typeof ctx.moveTo !== 'function' ||
      typeof ctx.bezierCurveTo !== 'function' ||
      typeof ctx.lineTo !== 'function' ||
      typeof ctx.closePath !== 'function' ||
      typeof ctx.fill !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const verticalFalloff = ctx.createLinearGradient(0, 0, 0, canvas.height)
    if (includesFill) {
      verticalFalloff.addColorStop(0, 'rgba(236, 240, 228, 0.36)')
      verticalFalloff.addColorStop(0.16, 'rgba(199, 206, 189, 0.26)')
      verticalFalloff.addColorStop(0.46, 'rgba(124, 136, 117, 0.11)')
      verticalFalloff.addColorStop(0.76, 'rgba(56, 66, 54, 0.05)')
      verticalFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    } else {
      verticalFalloff.addColorStop(0, 'rgba(237, 240, 229, 0.22)')
      verticalFalloff.addColorStop(0.18, 'rgba(201, 208, 191, 0.15)')
      verticalFalloff.addColorStop(0.44, 'rgba(124, 136, 118, 0.07)')
      verticalFalloff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    }
    ctx.fillStyle = verticalFalloff
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    if (includesFill) {
      [
        { x: 0.18, y: 0.26, radius: 126, alpha: 0.11 },
        { x: 0.42, y: 0.22, radius: 152, alpha: 0.15 },
        { x: 0.68, y: 0.32, radius: 140, alpha: 0.13 },
        { x: 0.86, y: 0.24, radius: 116, alpha: 0.1 }
      ].forEach((wash) => {
        const glow = ctx.createRadialGradient(
          canvas.width * wash.x,
          canvas.height * wash.y,
          wash.radius * 0.1,
          canvas.width * wash.x,
          canvas.height * wash.y,
          wash.radius
        )
        glow.addColorStop(0, `rgba(240, 241, 231, ${wash.alpha})`)
        glow.addColorStop(0.5, `rgba(202, 209, 191, ${wash.alpha * 0.44})`)
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(
          (canvas.width * wash.x) - wash.radius,
          (canvas.height * wash.y) - wash.radius,
          wash.radius * 2,
          wash.radius * 2
        )
      })
    }
    if (includesBreakup) {
      [
        { x: 0.34, topWidth: 72, midWidth: 122, bottomWidth: 164, drift: -18, alpha: 0.13 },
        { x: 0.58, topWidth: 62, midWidth: 112, bottomWidth: 150, drift: 12, alpha: 0.12 },
        { x: 0.76, topWidth: 54, midWidth: 98, bottomWidth: 132, drift: -8, alpha: 0.09 }
      ].forEach((band) => {
        const centerX = canvas.width * band.x
        const shaftGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        shaftGradient.addColorStop(0, `rgba(242, 243, 233, ${band.alpha})`)
        shaftGradient.addColorStop(0.18, `rgba(201, 208, 191, ${band.alpha * 0.68})`)
        shaftGradient.addColorStop(0.54, `rgba(117, 129, 111, ${band.alpha * 0.16})`)
        shaftGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = shaftGradient
        ctx.beginPath()
        ctx.moveTo(centerX - band.topWidth, 0)
        ctx.bezierCurveTo(
          centerX - band.midWidth,
          canvas.height * 0.26,
          centerX - band.bottomWidth + band.drift,
          canvas.height * 0.72,
          centerX - (band.bottomWidth * 0.58) + band.drift,
          canvas.height
        )
        ctx.lineTo(centerX + (band.bottomWidth * 0.64) + band.drift, canvas.height)
        ctx.bezierCurveTo(
          centerX + band.bottomWidth + band.drift,
          canvas.height * 0.7,
          centerX + band.midWidth,
          canvas.height * 0.28,
          centerX + band.topWidth,
          0
        )
        ctx.closePath()
        ctx.fill()
      })
    }

    ctx.globalCompositeOperation = 'destination-out'
    ;[
      { x: 0.18, y: 0.5, radius: 88, alpha: variant === 'fill' ? 0.18 : variant === 'combined' ? 0.22 : 0.26 },
      { x: 0.52, y: 0.68, radius: 116, alpha: variant === 'fill' ? 0.22 : variant === 'combined' ? 0.27 : 0.32 },
      { x: 0.78, y: 0.82, radius: 104, alpha: variant === 'fill' ? 0.2 : variant === 'combined' ? 0.24 : 0.28 }
    ].forEach((breakup) => {
      const erode = ctx.createRadialGradient(
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius * 0.14,
        canvas.width * breakup.x,
        canvas.height * breakup.y,
        breakup.radius
      )
      erode.addColorStop(0, `rgba(255, 255, 255, ${breakup.alpha})`)
      erode.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = erode
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })

    if (includesBreakup) {
      const lowerShear = ctx.createLinearGradient(0, canvas.height * 0.48, 0, canvas.height)
      lowerShear.addColorStop(0, 'rgba(255, 255, 255, 0)')
      lowerShear.addColorStop(0.54, 'rgba(255, 255, 255, 0.14)')
      lowerShear.addColorStop(1, 'rgba(255, 255, 255, 0.28)')
      ctx.fillStyle = lowerShear
      ctx.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.52)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createHeroLightCanopyTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.2, 1.05)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const canopyGlow = ctx.createLinearGradient(0, 0, 0, canvas.height)
      canopyGlow.addColorStop(0, 'rgba(240, 240, 229, 0.36)')
      canopyGlow.addColorStop(0.24, 'rgba(204, 206, 188, 0.18)')
      canopyGlow.addColorStop(0.58, 'rgba(120, 126, 108, 0.07)')
    canopyGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = canopyGlow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.22, y: 0.16, radius: 126, alpha: 0.11 },
      { x: 0.48, y: 0.18, radius: 186, alpha: 0.17 },
      { x: 0.78, y: 0.16, radius: 132, alpha: 0.09 }
    ].forEach((bloom) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius * 0.16,
        canvas.width * bloom.x,
        canvas.height * bloom.y,
        bloom.radius
      )
      gradient.addColorStop(0, `rgba(242, 242, 232, ${bloom.alpha})`)
      gradient.addColorStop(0.48, `rgba(202, 207, 190, ${bloom.alpha * 0.44})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * bloom.x) - bloom.radius,
        (canvas.height * bloom.y) - bloom.radius,
        bloom.radius * 2,
        bloom.radius * 2
      )
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createHeroGroundGlowTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.1, 0.96)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const warmCore = ctx.createRadialGradient(
      canvas.width * 0.56,
      canvas.height * 0.52,
      canvas.width * 0.03,
      canvas.width * 0.56,
      canvas.height * 0.52,
      canvas.width * 0.24
    )
    warmCore.addColorStop(0, 'rgba(236, 232, 214, 0.2)')
    warmCore.addColorStop(0.34, 'rgba(194, 188, 154, 0.12)')
    warmCore.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = warmCore
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    ;[
      { x: 0.28, y: 0.62, radius: 74, alpha: 0.08 },
      { x: 0.58, y: 0.46, radius: 88, alpha: 0.14 },
      { x: 0.76, y: 0.58, radius: 70, alpha: 0.1 }
    ].forEach((cluster) => {
      const glow = ctx.createRadialGradient(
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius * 0.12,
        canvas.width * cluster.x,
        canvas.height * cluster.y,
        cluster.radius
      )
      glow.addColorStop(0, `rgba(231, 226, 205, ${cluster.alpha})`)
      glow.addColorStop(0.5, `rgba(187, 179, 146, ${cluster.alpha * 0.38})`)
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(
        (canvas.width * cluster.x) - cluster.radius,
        (canvas.height * cluster.y) - cluster.radius,
        cluster.radius * 2,
        cluster.radius * 2
      )
    })
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createHeroFrontFillTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const lowerLift = ctx.createLinearGradient(
      canvas.width * 0.5,
      canvas.height,
      canvas.width * 0.5,
      canvas.height * 0.08
    )
    lowerLift.addColorStop(0, 'rgba(244, 252, 242, 0.18)')
    lowerLift.addColorStop(0.28, 'rgba(212, 238, 226, 0.16)')
    lowerLift.addColorStop(0.62, 'rgba(164, 214, 208, 0.08)')
    lowerLift.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = lowerLift
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ;[
      { x: 0.36, y: 0.74, radius: 96, alpha: 0.18 },
      { x: 0.54, y: 0.58, radius: 124, alpha: 0.22 },
      { x: 0.7, y: 0.68, radius: 88, alpha: 0.14 }
    ].forEach((glow) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius * 0.1,
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius
      )
      gradient.addColorStop(0, `rgba(248, 253, 245, ${glow.alpha})`)
      gradient.addColorStop(0.5, `rgba(177, 224, 212, ${glow.alpha * 0.5})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * glow.x) - glow.radius,
        (canvas.height * glow.y) - glow.radius,
        glow.radius * 2,
        glow.radius * 2
      )
    })

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createHeroRimLightTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const verticalCore = ctx.createLinearGradient(canvas.width * 0.14, 0, canvas.width * 0.78, canvas.height)
    verticalCore.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalCore.addColorStop(0.28, 'rgba(198, 243, 248, 0.12)')
    verticalCore.addColorStop(0.52, 'rgba(238, 252, 255, 0.36)')
    verticalCore.addColorStop(0.78, 'rgba(166, 228, 238, 0.18)')
    verticalCore.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = verticalCore
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ;[
      { x: 0.56, y: 0.26, radius: 106, alpha: 0.24 },
      { x: 0.48, y: 0.54, radius: 138, alpha: 0.3 },
      { x: 0.6, y: 0.78, radius: 92, alpha: 0.18 }
    ].forEach((glow) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius * 0.12,
        canvas.width * glow.x,
        canvas.height * glow.y,
        glow.radius
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glow.alpha})`)
      gradient.addColorStop(0.48, `rgba(191, 238, 245, ${glow.alpha * 0.45})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(
        (canvas.width * glow.x) - glow.radius,
        (canvas.height * glow.y) - glow.radius,
        glow.radius * 2,
        glow.radius * 2
      )
    })

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

export function createWaterSurfaceHighlightTexture(this: any): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.44, 1.28)

    if (
      !ctx ||
      typeof ctx.createLinearGradient !== 'function' ||
      typeof ctx.createRadialGradient !== 'function'
    ) {
      return texture
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const glow = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
    glow.addColorStop(0.34, 'rgba(204, 207, 186, 0.13)')
    glow.addColorStop(0.68, 'rgba(176, 178, 156, 0.13)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97) % 452) + 30
      const y = ((i * 67) % 280) + 84
      const radius = 34 + ((i % 3) * 18)
      const highlight = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius)
      highlight.addColorStop(0, 'rgba(219, 221, 198, 0.1)')
      highlight.addColorStop(0.36, 'rgba(187, 191, 169, 0.06)')
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlight
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }

    for (let i = 0; i < 6; i++) {
      const x = ((i * 121) % 420) + 46
      const y = ((i * 89) % 240) + 120
      const radius = 84 + (i * 10)
      const shimmer = ctx.createRadialGradient(x, y, radius * 0.16, x, y, radius)
      shimmer.addColorStop(0, 'rgba(202, 206, 185, 0.076)')
      shimmer.addColorStop(0.52, 'rgba(171, 175, 154, 0.05)')
      shimmer.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shimmer
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    ctx.globalCompositeOperation = 'source-over'

    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }
