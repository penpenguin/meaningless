import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import type { VisualAssetBundle } from '../assets/visualAssets'

type EnvironmentBackdropPalette = {
  topColor: string
  upperMidColor: string
  lowerMidColor: string
  deepColor: string
  upperBloomInner: string
  upperBloomOuter: string
  midBloomInner: string
  midBloomOuter: string
  lowerVignetteInner: string
  lowerVignetteOuter: string
  silhouetteColor: string
}

const defaultBackdropPalette: EnvironmentBackdropPalette = {
  topColor: '#386b7d',
  upperMidColor: '#2d6476',
  lowerMidColor: '#163947',
  deepColor: '#081d27',
  upperBloomInner: 'rgba(239, 252, 255, 0.34)',
  upperBloomOuter: 'rgba(156, 217, 229, 0.12)',
  midBloomInner: 'rgba(212, 244, 250, 0.16)',
  midBloomOuter: 'rgba(115, 178, 189, 0.08)',
  lowerVignetteInner: 'rgba(11, 34, 43, 0)',
  lowerVignetteOuter: 'rgba(3, 8, 12, 0.38)',
  silhouetteColor: 'rgba(7, 23, 29, 0.24)'
}

const resolveBackdropPalette = (
  palette?: Partial<EnvironmentBackdropPalette>
): EnvironmentBackdropPalette => ({
  ...defaultBackdropPalette,
  ...palette
})

const drawBackdropSilhouettes = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  silhouetteColor: string
): void => {
  if (
    typeof ctx.beginPath !== 'function' ||
    typeof ctx.moveTo !== 'function' ||
    typeof ctx.bezierCurveTo !== 'function' ||
    typeof ctx.stroke !== 'function'
  ) {
    return
  }

  ctx.lineWidth = canvas.width * 0.014
  ctx.strokeStyle = silhouetteColor
  ;[
    { x: 0.18, height: 0.34, bend: -0.04 },
    { x: 0.36, height: 0.48, bend: 0.03 },
    { x: 0.63, height: 0.42, bend: -0.02 },
    { x: 0.84, height: 0.3, bend: 0.04 }
  ].forEach((silhouette) => {
    const baseX = canvas.width * silhouette.x
    const baseY = canvas.height
    const tipY = canvas.height * (1 - silhouette.height)
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.bezierCurveTo(
      baseX - (canvas.width * 0.03),
      canvas.height * 0.82,
      baseX + (canvas.width * silhouette.bend),
      canvas.height * 0.58,
      baseX - (canvas.width * silhouette.bend),
      tipY
    )
    ctx.stroke()
  })
}

export const createEnvironmentBackdropTexture = (
  palette?: Partial<EnvironmentBackdropPalette>
): THREE.CanvasTexture => {
  const resolvedPalette = resolveBackdropPalette(palette)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const texture = new THREE.CanvasTexture(canvas)
  const ctx = canvas.getContext('2d')

  if (
    !ctx ||
    typeof ctx.createLinearGradient !== 'function' ||
    typeof ctx.fillRect !== 'function'
  ) {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.userData = {
      ...texture.userData,
      isEnvironmentBackdrop: true
    }
    return texture
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, resolvedPalette.topColor)
  gradient.addColorStop(0.24, resolvedPalette.upperMidColor)
  gradient.addColorStop(0.58, resolvedPalette.lowerMidColor)
  gradient.addColorStop(1, resolvedPalette.deepColor)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (typeof ctx.createRadialGradient === 'function') {
    const upperBloom = ctx.createRadialGradient(
      canvas.width * 0.54,
      canvas.height * 0.12,
      canvas.width * 0.04,
      canvas.width * 0.54,
      canvas.height * 0.12,
      canvas.width * 0.5
    )
    upperBloom.addColorStop(0, resolvedPalette.upperBloomInner)
    upperBloom.addColorStop(0.42, resolvedPalette.upperBloomOuter)
    upperBloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = upperBloom
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const midwaterBloom = ctx.createRadialGradient(
      canvas.width * 0.72,
      canvas.height * 0.34,
      canvas.width * 0.06,
      canvas.width * 0.72,
      canvas.height * 0.34,
      canvas.width * 0.34
    )
    midwaterBloom.addColorStop(0, resolvedPalette.midBloomInner)
    midwaterBloom.addColorStop(0.5, resolvedPalette.midBloomOuter)
    midwaterBloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = midwaterBloom
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const lowerVignette = ctx.createRadialGradient(
      canvas.width * 0.52,
      canvas.height * 0.92,
      canvas.width * 0.08,
      canvas.width * 0.52,
      canvas.height * 0.92,
      canvas.width * 0.74
    )
    lowerVignette.addColorStop(0, resolvedPalette.lowerVignetteInner)
    lowerVignette.addColorStop(0.6, 'rgba(8, 20, 29, 0.14)')
    lowerVignette.addColorStop(1, resolvedPalette.lowerVignetteOuter)
    ctx.fillStyle = lowerVignette
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  drawBackdropSilhouettes(ctx, canvas, resolvedPalette.silhouetteColor)

  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData = {
    ...texture.userData,
    isEnvironmentBackdrop: true
  }

  return texture
}

export class EnvironmentLoader {
  private scene: THREE.Scene
  private envMap: THREE.Texture | null = null
  private renderer: THREE.WebGLRenderer | null
  private visualAssets: VisualAssetBundle | null
  private hdriLoader: Pick<RGBELoader, 'loadAsync'>
  private pmremGeneratorFactory: (renderer: THREE.WebGLRenderer) => {
    fromEquirectangular(texture: THREE.Texture): { texture: THREE.Texture }
    dispose(): void
    compileEquirectangularShader?: () => void
  }

  constructor(
    scene: THREE.Scene,
    options: {
      renderer?: THREE.WebGLRenderer | null
      visualAssets?: VisualAssetBundle | null
      hdriLoader?: Pick<RGBELoader, 'loadAsync'>
      pmremGeneratorFactory?: (renderer: THREE.WebGLRenderer) => {
        fromEquirectangular(texture: THREE.Texture): { texture: THREE.Texture }
        dispose(): void
        compileEquirectangularShader?: () => void
      }
    } = {}
  ) {
    this.scene = scene
    this.renderer = options.renderer ?? null
    this.visualAssets = options.visualAssets ?? null
    this.hdriLoader = options.hdriLoader ?? new RGBELoader()
    this.pmremGeneratorFactory = options.pmremGeneratorFactory ?? ((renderer) => new THREE.PMREMGenerator(renderer))
  }
  
  private async resolveHdriTexture(): Promise<THREE.Texture | null> {
    const bundledTexture = this.visualAssets?.environment['aquarium-hdri'] ?? null
    if (bundledTexture) {
      return bundledTexture
    }

    const hdriEntry = this.visualAssets?.manifest.environment.find((entry) => entry.id === 'aquarium-hdri')
    if (!hdriEntry) {
      return null
    }

    try {
      const texture = await this.hdriLoader.loadAsync(hdriEntry.url)
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.LinearSRGBColorSpace
      texture.userData.sharedAsset = true
      texture.needsUpdate = true
      return texture
    } catch {
      return null
    }
  }

  private createPmremEnvironment(texture: THREE.Texture): THREE.Texture | null {
    if (!this.renderer) {
      return null
    }

    try {
      const pmremGenerator = this.pmremGeneratorFactory(this.renderer)
      pmremGenerator.compileEquirectangularShader?.()
      const envMap = pmremGenerator.fromEquirectangular(texture).texture
      envMap.userData.sharedAsset = true
      pmremGenerator.dispose()
      return envMap
    } catch {
      return null
    }
  }

  async loadHDRI(): Promise<THREE.Texture> {
    const hdriTexture = await this.resolveHdriTexture()
    const pmremTexture = hdriTexture ? this.createPmremEnvironment(hdriTexture) : null

    if (pmremTexture) {
      this.envMap = pmremTexture
      this.scene.environment = pmremTexture
      return pmremTexture
    }

    const envMap = this.createEnvironmentCubeMap()
    this.envMap = envMap
    this.scene.environment = envMap
    return envMap
  }
  
  private createEnvironmentCubeMap(): THREE.CubeTexture {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    const faces = []
    
    // 6面のキューブマップを生成
    for (let i = 0; i < 6; i++) {
      if (typeof ctx.clearRect === 'function') {
        ctx.clearRect(0, 0, size, size)
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, size)

      if (i === 2) { // 上面 - 天井照明
        gradient.addColorStop(0, '#f7fcff')
        gradient.addColorStop(0.4, '#d8ebf5')
        gradient.addColorStop(1, '#9fc0d1')
      } else if (i === 3) { // 下面 - 床
        gradient.addColorStop(0, '#37515f')
        gradient.addColorStop(0.5, '#243744')
        gradient.addColorStop(1, '#111a21')
      } else { // 側面 - 壁
        gradient.addColorStop(0, '#577482')
        gradient.addColorStop(0.42, '#2f4957')
        gradient.addColorStop(1, '#14202a')
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      if (typeof ctx.createRadialGradient === 'function') {
        ctx.globalCompositeOperation = 'screen'
        for (let j = 0; j < 2; j++) {
          const centerX = size * (0.22 + (j * 0.38) + ((i % 2) * 0.05))
          const centerY = size * (i === 2 ? 0.28 + (j * 0.12) : 0.22 + (j * 0.24))
          const radius = size * (j === 0 ? 0.26 : 0.22)
          const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.08, centerX, centerY, radius)
          glow.addColorStop(0, i === 3 ? 'rgba(196, 227, 234, 0.14)' : 'rgba(244, 252, 255, 0.34)')
          glow.addColorStop(0.46, 'rgba(157, 213, 225, 0.12)')
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = glow
          ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
        }

        const ambientFog = ctx.createRadialGradient(
          size * 0.62,
          size * 0.7,
          size * 0.08,
          size * 0.62,
          size * 0.7,
          size * 0.5
        )
        ambientFog.addColorStop(0, 'rgba(194, 230, 236, 0.1)')
        ambientFog.addColorStop(0.48, 'rgba(122, 174, 185, 0.06)')
        ambientFog.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = ambientFog
        ctx.fillRect(0, 0, size, size)
        ctx.globalCompositeOperation = 'source-over'
      }

      if (
        i !== 3 &&
        typeof ctx.beginPath === 'function' &&
        typeof ctx.moveTo === 'function' &&
        typeof ctx.bezierCurveTo === 'function' &&
        typeof ctx.stroke === 'function'
      ) {
        ctx.lineWidth = size * 0.024
        ctx.strokeStyle = i === 2 ? 'rgba(84, 116, 128, 0.18)' : 'rgba(10, 24, 32, 0.26)'
        ;[
          { x: 0.24, height: 0.36, bend: -0.04 },
          { x: 0.68, height: 0.48, bend: 0.05 }
        ].forEach((silhouette) => {
          const baseX = size * silhouette.x
          const baseY = size
          const tipY = size * (1 - silhouette.height)
          ctx.beginPath()
          ctx.moveTo(baseX, baseY)
          ctx.bezierCurveTo(
            baseX - (size * 0.03),
            size * 0.84,
            baseX + (size * silhouette.bend),
            size * 0.56,
            baseX - (size * silhouette.bend),
            tipY
          )
          ctx.stroke()
        })
      }
      
      faces.push(canvas.toDataURL())
    }
    
    const loader = new THREE.CubeTextureLoader()
    const envMap = loader.load(faces)
    envMap.mapping = THREE.CubeReflectionMapping
    
    return envMap
  }
  
  getEnvironmentMap(): THREE.Texture | null {
    return this.envMap
  }
}
