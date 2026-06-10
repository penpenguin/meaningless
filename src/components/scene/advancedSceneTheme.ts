import * as THREE from 'three'
import type { Theme } from '../../types/aquarium'
import { defaultTheme } from '../../utils/storage/stateSchema'
import { createEnvironmentBackdropTexture } from './Environment'

type PremiumThemeValues = {
  glassTint: string
  glassReflectionStrength: number
  surfaceGlowStrength: number
  causticsStrength: number
}

export const usesOpenWaterPresentation = (theme: Theme): boolean => (
  theme.layoutStyle === 'nature-showcase' ||
  (theme.layoutStyle === 'planted' && theme.fogDensity <= 0.08 && theme.glassFrameStrength >= 0.7)
)

export const resolvePremiumThemeValues = (theme?: Theme): PremiumThemeValues => {
  const fallback = defaultTheme

  return {
    glassTint: theme?.glassTint ?? fallback.glassTint ?? '#c3dde3',
    glassReflectionStrength: theme?.glassReflectionStrength ?? fallback.glassReflectionStrength ?? 0.32,
    surfaceGlowStrength: theme?.surfaceGlowStrength ?? fallback.surfaceGlowStrength ?? 0.45,
    causticsStrength: theme?.causticsStrength ?? fallback.causticsStrength ?? 0.3
  }
}

export const applyThemeToScene = (scene: THREE.Scene, theme: Theme): void => {
  scene.userData.theme = theme
  const background = scene.background
  const shouldPreserveGradient =
    background instanceof THREE.CanvasTexture &&
    (background.userData as { isGradientBackground?: boolean } | undefined)?.isGradientBackground
  if (shouldPreserveGradient) {
    applyGradientBackground(scene, theme)
    return
  }
  scene.background = new THREE.Color(theme.waterTint)
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color = new THREE.Color(theme.waterTint)
    scene.fog.density = theme.fogDensity
    return
  }
  scene.fog = new THREE.FogExp2(theme.waterTint, theme.fogDensity)
}

export const resolveTheme = (scene: THREE.Scene, theme?: Theme): Theme => {
  const storedTheme = scene.userData.theme as Theme | undefined
  return theme ?? storedTheme ?? defaultTheme
}

const drawLightShafts = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void => {
  if (
    typeof ctx.createLinearGradient !== 'function' ||
    typeof ctx.beginPath !== 'function' ||
    typeof ctx.moveTo !== 'function' ||
    typeof ctx.lineTo !== 'function' ||
    typeof ctx.closePath !== 'function' ||
    typeof ctx.fill !== 'function'
  ) return

  ;[
    { x: 0.18, width: 0.12, alpha: 0.14 },
    { x: 0.52, width: 0.1, alpha: 0.1 },
    { x: 0.8, width: 0.14, alpha: 0.08 }
  ].forEach((shaft) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, `rgba(235, 249, 255, ${shaft.alpha})`)
    gradient.addColorStop(0.35, `rgba(162, 221, 232, ${shaft.alpha * 0.55})`)
    gradient.addColorStop(1, 'rgba(9, 28, 37, 0)')
    ctx.fillStyle = gradient

    const startX = canvas.width * shaft.x
    const topWidth = canvas.width * shaft.width
    const bottomSpread = topWidth * 2.2
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX + topWidth, 0)
    ctx.lineTo(startX + bottomSpread, canvas.height)
    ctx.lineTo(startX - bottomSpread * 0.45, canvas.height)
    ctx.closePath()
    ctx.fill()
  })
}

const drawDistantSilhouettes = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void => {
  if (
    typeof ctx.beginPath !== 'function' ||
    typeof ctx.moveTo !== 'function' ||
    typeof ctx.bezierCurveTo !== 'function' ||
    typeof ctx.stroke !== 'function'
  ) return

  const silhouettes = [
    { x: 0.14, height: 0.2, bend: -0.04 },
    { x: 0.32, height: 0.28, bend: 0.03 },
    { x: 0.54, height: 0.22, bend: -0.02 },
    { x: 0.76, height: 0.3, bend: 0.05 }
  ]

  ctx.lineWidth = canvas.width * 0.012
  ctx.strokeStyle = 'rgba(8, 25, 33, 0.18)'
  silhouettes.forEach((silhouette) => {
    const baseX = canvas.width * silhouette.x
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * (1 - silhouette.height)

    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.bezierCurveTo(
      baseX - canvas.width * 0.015,
      canvas.height * 0.82,
      baseX + canvas.width * silhouette.bend,
      canvas.height * 0.55,
      baseX - canvas.width * silhouette.bend,
      tipY
    )
    ctx.bezierCurveTo(
      baseX + canvas.width * silhouette.bend * 0.6,
      canvas.height * 0.62,
      baseX + canvas.width * 0.02,
      canvas.height * 0.84,
      baseX,
      baseY
    )
    ctx.stroke()
  })
}

export const applyGradientBackground = (scene: THREE.Scene, theme?: Theme): void => {
  const resolvedTheme = resolveTheme(scene, theme)
  const currentBackground = scene.background
  if (
    currentBackground instanceof THREE.CanvasTexture &&
    (currentBackground.userData as { isGradientBackground?: boolean } | undefined)?.isGradientBackground
  ) {
    currentBackground.dispose()
  }
  const baseColor = new THREE.Color(resolvedTheme.waterTint).lerp(new THREE.Color('#5f7467'), 0.42)
  const deepColor = baseColor.clone().lerp(new THREE.Color('#141a18'), 0.8)
  const midDeepColor = baseColor.clone().lerp(new THREE.Color('#222c28'), 0.58)
  const surfaceColor = baseColor.clone().lerp(new THREE.Color('#dfe5d7'), 0.3)
  const backgroundTexture = createEnvironmentBackdropTexture({
    topColor: `#${surfaceColor.getHexString()}`,
    upperMidColor: `#${baseColor.getHexString()}`,
    lowerMidColor: `#${midDeepColor.getHexString()}`,
    deepColor: `#${deepColor.getHexString()}`,
    silhouetteColor: 'rgba(18, 27, 24, 0.18)'
  })
  const canvas = backgroundTexture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    scene.background = new THREE.Color(resolvedTheme.waterTint)
    scene.fog = new THREE.FogExp2(resolvedTheme.waterTint, resolvedTheme.fogDensity)
    return
  }

  drawLightShafts(ctx, canvas)
  drawDistantSilhouettes(ctx, canvas)

  backgroundTexture.userData = {
    ...backgroundTexture.userData,
    isGradientBackground: true
  }
  backgroundTexture.needsUpdate = true

  scene.background = backgroundTexture
  scene.fog = new THREE.FogExp2(resolvedTheme.waterTint, resolvedTheme.fogDensity)
}
