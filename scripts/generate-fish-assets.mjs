// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import zlib from 'node:zlib'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outputDir = path.resolve('public/assets/aquarium')
export const atlasWidth = 1024
export const atlasHeight = 512

export const atlasRects = {
  body: { u0: 0.06, v0: 0.22, u1: 0.94, v1: 0.9 },
  dorsal: { u0: 0.04, v0: 0.03, u1: 0.2, v1: 0.18 },
  ventral: { u0: 0.22, v0: 0.03, u1: 0.38, v1: 0.18 },
  pectoral: { u0: 0.4, v0: 0.03, u1: 0.62, v1: 0.18 },
  tail: { u0: 0.66, v0: 0.02, u1: 0.96, v1: 0.2 }
}

export const fishAssetConfigs = [
  {
    id: 'tropical',
    primary: '#f28d3f',
    secondary: '#f7d35d',
    accent: '#1f3b3c',
    silhouette: {
      bodyLength: 1.45,
      bodyHeight: 0.38,
      bodyThickness: 0.28,
      noseLength: 0.24,
      tailLength: 0.44,
      tailHeight: 0.42,
      dorsalHeight: 0.28,
      ventralHeight: 0.16,
      pectoralLength: 0.22,
      topFullness: 0.72,
      bellyFullness: 0.8
    },
    heroScale: 1.12,
    pattern: 'tropical'
  },
  {
    id: 'angelfish',
    primary: '#d9d6c8',
    secondary: '#7f7867',
    accent: '#494236',
    silhouette: {
      bodyLength: 1.08,
      bodyHeight: 0.64,
      bodyThickness: 0.2,
      noseLength: 0.2,
      tailLength: 0.34,
      tailHeight: 0.54,
      dorsalHeight: 0.98,
      ventralHeight: 1.02,
      pectoralLength: 0.22,
      topFullness: 0.92,
      bellyFullness: 0.9
    },
    heroScale: 1.16,
    pattern: 'angelfish'
  },
  {
    id: 'butterflyfish',
    primary: '#f2cf63',
    secondary: '#f8eed1',
    accent: '#30353b',
    silhouette: {
      bodyLength: 1.12,
      bodyHeight: 0.66,
      bodyThickness: 0.2,
      noseLength: 0.18,
      tailLength: 0.3,
      tailHeight: 0.44,
      dorsalHeight: 0.52,
      ventralHeight: 0.44,
      pectoralLength: 0.24,
      topFullness: 0.94,
      bellyFullness: 0.9
    },
    heroScale: 1.18,
    pattern: 'butterflyfish'
  },
  {
    id: 'neon',
    primary: '#54d7ff',
    secondary: '#da3d63',
    accent: '#11253c',
    silhouette: {
      bodyLength: 1.82,
      bodyHeight: 0.18,
      bodyThickness: 0.15,
      noseLength: 0.3,
      tailLength: 0.36,
      tailHeight: 0.28,
      dorsalHeight: 0.12,
      ventralHeight: 0.06,
      pectoralLength: 0.14,
      topFullness: 0.56,
      bellyFullness: 0.64
    },
    heroScale: 1.18,
    pattern: 'neon'
  },
  {
    id: 'goldfish',
    primary: '#f6a338',
    secondary: '#ffd59a',
    accent: '#8e3f16',
    silhouette: {
      bodyLength: 1.28,
      bodyHeight: 0.52,
      bodyThickness: 0.35,
      noseLength: 0.22,
      tailLength: 0.6,
      tailHeight: 0.7,
      dorsalHeight: 0.4,
      ventralHeight: 0.28,
      pectoralLength: 0.28,
      topFullness: 0.82,
      bellyFullness: 1.02
    },
    heroScale: 1.18,
    pattern: 'goldfish'
  }
]

const crcTable = new Uint32Array(256)
for (let index = 0; index < 256; index++) {
  let value = index
  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }
  crcTable[index] = value >>> 0
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))
const lerp = (a, b, t) => a + ((b - a) * t)
const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - (2 * t))
}
const gauss = (value, center, width) => {
  const normalized = (value - center) / Math.max(0.0001, width)
  return Math.exp(-(normalized * normalized))
}
const mixColor = (left, right, t) => [
  lerp(left[0], right[0], t),
  lerp(left[1], right[1], t),
  lerp(left[2], right[2], t)
]
const multiplyColor = (color, scalar) => color.map((entry) => entry * scalar)
const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return [
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255
  ]
}

const buildChunk = (type, data) => {
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  chunk.write(type, 4, 4, 'ascii')
  data.copy(chunk, 8)
  let crc = 0xffffffff
  for (let index = 4; index < 8 + data.length; index++) {
    crc = crcTable[(crc ^ chunk[index]) & 0xff] ^ (crc >>> 8)
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length)
  return chunk
}

const encodePng = (width, height, rgba) => {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + (y * stride), stride).copy(raw, rowStart + 1)
  }
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    header,
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', zlib.deflateSync(raw)),
    buildChunk('IEND', Buffer.alloc(0))
  ])
}

const writePng = (filePath, width, height, rgba) => {
  fs.writeFileSync(filePath, encodePng(width, height, rgba))
}

class ExportCanvasContext2D {
  constructor(canvas) {
    this.canvas = canvas
    this.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4)
    this.fillStyle = '#000000'
  }

  reset() {
    this.pixels = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4)
  }

  translate() {}

  scale() {}

  _parseFillColor() {
    const match = /^#?([0-9a-f]{6})$/i.exec(this.fillStyle)
    if (!match) return [0, 0, 0, 255]
    const value = Number.parseInt(match[1], 16)
    return [
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
      255
    ]
  }

  fillRect(x, y, width, height) {
    const [r, g, b, a] = this._parseFillColor()
    for (let yy = y; yy < y + height; yy++) {
      for (let xx = x; xx < x + width; xx++) {
        const index = ((yy * this.canvas.width) + xx) * 4
        this.pixels[index] = r
        this.pixels[index + 1] = g
        this.pixels[index + 2] = b
        this.pixels[index + 3] = a
      }
    }
  }

  getImageData(x, y, width, height) {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let yy = 0; yy < height; yy++) {
      for (let xx = 0; xx < width; xx++) {
        const sourceIndex = ((((y + yy) * this.canvas.width) + (x + xx)) * 4)
        const targetIndex = ((yy * width) + xx) * 4
        data[targetIndex] = this.pixels[sourceIndex]
        data[targetIndex + 1] = this.pixels[sourceIndex + 1]
        data[targetIndex + 2] = this.pixels[sourceIndex + 2]
        data[targetIndex + 3] = this.pixels[sourceIndex + 3]
      }
    }
    return { data, width, height }
  }

  putImageData(imageData, x = 0, y = 0) {
    for (let yy = 0; yy < imageData.height; yy++) {
      for (let xx = 0; xx < imageData.width; xx++) {
        const sourceIndex = ((yy * imageData.width) + xx) * 4
        const targetIndex = ((((y + yy) * this.canvas.width) + (x + xx)) * 4)
        this.pixels[targetIndex] = imageData.data[sourceIndex]
        this.pixels[targetIndex + 1] = imageData.data[sourceIndex + 1]
        this.pixels[targetIndex + 2] = imageData.data[sourceIndex + 2]
        this.pixels[targetIndex + 3] = imageData.data[sourceIndex + 3]
      }
    }
  }

  drawImage(image, dx, dy, dw = image.width, dh = image.height) {
    const source = image?.data instanceof Uint8Array || image?.data instanceof Uint8ClampedArray
      ? image
      : image?.data?.data && image.data.width && image.data.height
        ? { data: image.data.data, width: image.data.width, height: image.data.height }
        : image?.data?._ctx?.pixels
          ? { data: image.data._ctx.pixels, width: image.data.width, height: image.data.height }
          : image?._ctx?.pixels
            ? { data: image._ctx.pixels, width: image.width, height: image.height }
            : null

    if (!source?.data) {
      throw new Error('Only data-backed images are supported by exporter polyfill')
    }

    for (let yy = 0; yy < dh; yy++) {
      const sourceY = Math.min(source.height - 1, Math.floor((yy / Math.max(1, dh)) * source.height))
      for (let xx = 0; xx < dw; xx++) {
        const sourceX = Math.min(source.width - 1, Math.floor((xx / Math.max(1, dw)) * source.width))
        const sourceIndex = ((sourceY * source.width) + sourceX) * 4
        const targetIndex = ((((dy + yy) * this.canvas.width) + (dx + xx)) * 4)
        this.pixels[targetIndex] = source.data[sourceIndex]
        this.pixels[targetIndex + 1] = source.data[sourceIndex + 1]
        this.pixels[targetIndex + 2] = source.data[sourceIndex + 2]
        this.pixels[targetIndex + 3] = source.data[sourceIndex + 3]
      }
    }
  }
}

class ExportCanvas {
  constructor() {
    this._width = 1
    this._height = 1
    this._ctx = new ExportCanvasContext2D(this)
  }

  set width(value) {
    this._width = value
    this._ctx.reset()
  }

  get width() {
    return this._width
  }

  set height(value) {
    this._height = value
    this._ctx.reset()
  }

  get height() {
    return this._height
  }

  getContext(type) {
    if (type !== '2d') return null
    return this._ctx
  }

  toBlob(callback, mimeType = 'image/png') {
    callback(new Blob([encodePng(this.width, this.height, this._ctx.pixels)], { type: mimeType }))
  }
}

export const installExporterPolyfills = () => {
  const { window } = new JSDOM('')
  globalThis.Blob = window.Blob
  globalThis.FileReader = window.FileReader
  globalThis.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data
      this.width = width
      this.height = height
    }
  }
  globalThis.document = {
    createElement: (tag) => {
      if (tag !== 'canvas') throw new Error(`Unsupported element: ${tag}`)
      return new ExportCanvas()
    }
  }
}

const makeTexture = (pixels, colorSpace = 'srgb') => {
  const texture = new THREE.DataTexture(pixels, atlasWidth, atlasHeight, THREE.RGBAFormat)
  texture.colorSpace = colorSpace === 'linear' ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.flipY = false
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.userData.mimeType = 'image/png'
  texture.needsUpdate = true
  return texture
}

const paintPixel = (pixels, x, y, rgba) => {
  const index = ((y * atlasWidth) + x) * 4
  pixels[index] = Math.round(clamp01(rgba[0]) * 255)
  pixels[index + 1] = Math.round(clamp01(rgba[1]) * 255)
  pixels[index + 2] = Math.round(clamp01(rgba[2]) * 255)
  pixels[index + 3] = Math.round(clamp01(rgba[3]) * 255)
}

const writeRegion = (pixels, rect, painter) => {
  const x0 = Math.floor(rect.u0 * atlasWidth)
  const x1 = Math.ceil(rect.u1 * atlasWidth)
  const y0 = Math.floor((1 - rect.v1) * atlasHeight)
  const y1 = Math.ceil((1 - rect.v0) * atlasHeight)

  for (let y = y0; y < y1; y++) {
    const v = 1 - (y / (atlasHeight - 1))
    const localV = clamp01((v - rect.v0) / Math.max(0.0001, rect.v1 - rect.v0))
    for (let x = x0; x < x1; x++) {
      const u = x / (atlasWidth - 1)
      const localU = clamp01((u - rect.u0) / Math.max(0.0001, rect.u1 - rect.u0))
      paintPixel(pixels, x, y, painter(localU, localV))
    }
  }
}

const countershading = (dorsalColor, bellyColor, v, edge0 = 0.16, edge1 = 0.8) => {
  return mixColor(bellyColor, dorsalColor, smoothstep(edge0, edge1, v))
}

const createGillMask = (u, v, centerU = 0.77, widthU = 0.026, centerV = 0.56, widthV = 0.18) => {
  return gauss(u, centerU, widthU) * gauss(v, centerV, widthV)
}

const createMouthMask = (u, v, centerU = 0.965, widthU = 0.022, centerV = 0.49, widthV = 0.05) => {
  return gauss(u, centerU, widthU) * gauss(v, centerV, widthV)
}

const createPeduncleMask = (u, v, centerU = 0.14, widthU = 0.08, centerV = 0.52, widthV = 0.28) => {
  return gauss(u, centerU, widthU) * gauss(v, centerV, widthV)
}

const createEyeMasks = (u, v, options = {}) => {
  const centerU = options.centerU ?? 0.89
  const centerV = options.centerV ?? 0.58
  const ring = gauss(u, centerU - 0.008, options.ringWidthU ?? 0.028) * gauss(v, centerV + 0.005, options.ringWidthV ?? 0.04)
  const core = gauss(u, centerU, options.coreWidthU ?? 0.014) * gauss(v, centerV, options.coreWidthV ?? 0.022)
  const highlight = gauss(u, centerU - 0.015, options.highlightWidthU ?? 0.008) * gauss(v, centerV + 0.017, options.highlightWidthV ?? 0.012)
  const lidShadow = gauss(u, centerU - 0.018, 0.028) * gauss(v, centerV + 0.03, 0.018)
  return { ring, core, highlight, lidShadow }
}

const createFinRayMask = (u, positions = [0.18, 0.34, 0.5, 0.66, 0.82], width = 0.028) => {
  return clamp01(positions.reduce((sum, position) => sum + gauss(u, position, width), 0))
}

const createMembraneAlphaProfile = (edge, centerAlpha = 0.78, edgeAlpha = 0.08, power = 1) => {
  const centerMask = smoothstep(0.02, 0.26, edge)
  return lerp(edgeAlpha, centerAlpha, Math.pow(centerMask, power))
}

const createMicroMottling = (u, v, amplitude = 0.02, freqU = 42, freqV = 74) => {
  const primary = Math.sin(u * freqU) * Math.sin(v * freqV)
  const secondary = Math.sin((u * (freqU * 0.55)) + 1.3) * Math.sin((v * (freqV * 0.62)) + 0.8)
  return (primary * 0.65 + secondary * 0.35) * amplitude
}

const createFinSurface = (config, finKind, u, v, options = {}) => {
  const primary = options.primary ?? hexToRgb(config.primary)
  const secondary = options.secondary ?? hexToRgb(config.secondary)
  const edge = Math.min(u, 1 - u, v, 1 - v)
  const rayPositions = options.rayPositions ?? (
    finKind === 'tail'
      ? [0.16, 0.28, 0.38, 0.5, 0.62, 0.76, 0.88]
      : [0.18, 0.34, 0.5, 0.66, 0.82]
  )
  const rayMask = createFinRayMask(u, rayPositions, options.rayWidth ?? 0.026)
  const edgeMask = 1 - smoothstep(0.03, 0.16, edge)
  const centerMask = smoothstep(0.03, 0.26, edge)
  const membraneAlpha = createMembraneAlphaProfile(edge, options.centerAlpha ?? 0.8, options.edgeAlpha ?? 0.08, options.alphaPower ?? 1.05)
  const membraneTint = options.membraneTint ?? mixColor([0.98, 0.97, 0.93], mixColor(primary, secondary, 0.42), 0.45)
  const rayTint = options.rayTint ?? mixColor(primary, secondary, 0.28)
  const rimTint = options.rimTint ?? mixColor(rayTint, [0.34, 0.28, 0.24], 0.38)
  const verticalWash = options.verticalWash ?? gauss(v, 0.58, finKind === 'tail' ? 0.24 : 0.18)
  const dorsalWarm = options.dorsalWarm ?? gauss(v, 0.78, 0.18)
  let color = membraneTint
  color = mixColor(color, options.centerTint ?? mixColor(primary, secondary, 0.56), centerMask * (options.centerTintStrength ?? 0.18))
  color = mixColor(color, rayTint, rayMask * (options.rayTintStrength ?? 0.26))
  color = mixColor(color, rimTint, edgeMask * (options.rimTintStrength ?? 0.28))
  color = mixColor(color, options.verticalTint ?? mixColor(secondary, primary, 0.32), verticalWash * (options.verticalTintStrength ?? 0.14))
  color = mixColor(color, options.dorsalTint ?? [1, 0.82, 0.56], dorsalWarm * (options.dorsalTintStrength ?? 0.08))

  let roughness = (options.membraneRoughness ?? 0.84) + (edgeMask * (options.edgeRoughnessBoost ?? 0.02))
  roughness += rayMask * (options.rayRoughnessBoost ?? 0.05)

  const rayHeight = rayMask * ((options.rayHeight ?? 0.08) + (Math.sin((u * (options.heightFrequency ?? 164)) + (v * 17)) * (options.heightJitter ?? 0.02)))
  const membraneHeight = centerMask * (options.membraneHeight ?? 0.02)
  const edgeHeight = edgeMask * (options.edgeHeight ?? 0.02)
  const height = 0.48 + membraneHeight + edgeHeight + rayHeight
  const alpha = clamp01(membraneAlpha + (rayMask * (options.rayAlphaBoost ?? 0.12)) - (edgeMask * (options.edgeAlphaPenalty ?? 0.03)))

  return {
    color,
    roughness: clamp01(roughness),
    height,
    alpha
  }
}

const sampleGoldfishBody = (config, u, v) => {
  const base = countershading([0.78, 0.3, 0.14], [1, 0.88, 0.58], v, 0.14, 0.8)
  const cheek = gauss(u, 0.83, 0.09) * gauss(v, 0.58, 0.22)
  const gillMask = createGillMask(u, v, 0.77, 0.026, 0.57, 0.18)
  const mouth = createMouthMask(u, v, 0.965, 0.022, 0.49, 0.05)
  const mouthShadow = gauss(u, 0.944, 0.03) * gauss(v, 0.468, 0.05)
  const peduncle = createPeduncleMask(u, v, 0.14, 0.09, 0.52, 0.28)
  const dorsalBand = gauss(v, 0.82, 0.12) * smoothstep(0.16, 0.84, u)
  const bellyLift = 1 - smoothstep(0.18, 0.5, v)
  const midBody = gauss(u, 0.52, 0.22) * gauss(v, 0.54, 0.24)
  const scaleBreakup = createMicroMottling(u, v, 0.028, 48, 82)
  const eye = createEyeMasks(u, v, { centerU: 0.898, centerV: 0.58, ringWidthU: 0.027, ringWidthV: 0.04 })

  let color = base
  color = mixColor(color, [1, 0.52, 0.16], midBody * 0.34)
  color = mixColor(color, [1, 0.9, 0.66], bellyLift * 0.24)
  color = mixColor(color, [0.62, 0.22, 0.1], dorsalBand * 0.5)
  color = mixColor(color, [0.99, 0.72, 0.28], cheek * 0.28)
  color = mixColor(color, [0.66, 0.26, 0.12], gillMask * 0.76)
  color = mixColor(color, [0.72, 0.22, 0.14], mouth * 0.84)
  color = mixColor(color, [0.62, 0.16, 0.12], mouthShadow * 0.48)
  color = mixColor(color, [0.64, 0.18, 0.1], peduncle * 0.74)
  color = mixColor(color, [0.78, 0.54, 0.28], eye.ring * 0.56)
  color = mixColor(color, [0.08, 0.08, 0.1], eye.core)
  color = mixColor(color, [0.98, 0.96, 0.92], eye.highlight * 0.94)

  const roughness = clamp01(
    0.62
      - (midBody * 0.06)
      + (gillMask * 0.1)
      + (peduncle * 0.14)
      + (dorsalBand * 0.04)
      + (Math.max(0, scaleBreakup) * 0.08)
  )
  const height =
    0.46
    + scaleBreakup
    + (midBody * 0.02)
    + (gillMask * (0.04 + ((u - 0.735) * 1.6) + (Math.sin((u * 210) + (v * 18)) * 0.018)))
    + (peduncle * (0.04 + (Math.sin((u * 120) + (v * 17)) * 0.015)))
    + (mouth * (0.03 + ((u - 0.94) * 0.12)))
    + (eye.ring * (0.13 + ((u - 0.872) * 0.82) - ((v - 0.58) * 0.32)))
    - (eye.core * 0.04)

  return { color, roughness, height, alpha: 1 }
}

const sampleGoldfishFin = (config, finKind, u, v) => {
  const tailSoftness = finKind === 'tail' ? 0.84 : 0.78
  return createFinSurface(config, finKind, u, v, {
    membraneTint: mixColor([1, 0.97, 0.9], [1, 0.76, 0.46], 0.5),
    centerTint: [1, 0.78, 0.5],
    rayTint: [0.98, 0.54, 0.22],
    rimTint: [0.82, 0.36, 0.16],
    centerAlpha: finKind === 'tail' ? 0.72 : 0.76,
    edgeAlpha: finKind === 'tail' ? 0.03 : 0.06,
    alphaPower: finKind === 'tail' ? 1.18 : 1.04,
    membraneRoughness: 0.82,
    rayRoughnessBoost: 0.08,
    edgeRoughnessBoost: 0.04,
    rayHeight: finKind === 'tail' ? 0.12 : 0.08,
    membraneHeight: tailSoftness * 0.02,
    rayPositions: finKind === 'tail' ? [0.14, 0.26, 0.38, 0.5, 0.62, 0.76, 0.9] : [0.18, 0.36, 0.52, 0.7, 0.86],
    rayWidth: finKind === 'tail' ? 0.024 : 0.026,
    rayAlphaBoost: finKind === 'tail' ? 0.16 : 0.12,
    edgeAlphaPenalty: finKind === 'tail' ? 0.05 : 0.03,
    rimTintStrength: 0.18,
    centerTintStrength: 0.22
  })
}

const sampleButterflyfishBody = (config, u, v) => {
  const base = countershading([0.64, 0.4, 0.24], [0.99, 0.84, 0.74], v, 0.14, 0.8)
  const bodyGlow = gauss(u, 0.5, 0.24) * gauss(v, 0.54, 0.25)
  const faceBand = gauss(u, 0.84, 0.055) * gauss(v, 0.56, 0.13)
  const faceMask = gauss(u, 0.9, 0.07) * gauss(v, 0.57, 0.18)
  const faceBandShadow = gauss(u, 0.83, 0.065) * gauss(v, 0.56, 0.16)
  const mouth = createMouthMask(u, v, 0.965, 0.022, 0.49, 0.05)
  const rearAccent = smoothstep(0.03, 0.18, u) * gauss(v, 0.54, 0.26)
  const tailSaddle = gauss(u, 0.12, 0.06) * gauss(v, 0.54, 0.24)
  const gillMask = createGillMask(u, v, 0.74, 0.024, 0.56, 0.16)
  const dorsalShadow = gauss(v, 0.84, 0.14) * smoothstep(0.12, 0.88, u)
  const eye = createEyeMasks(u, v, { centerU: 0.872, centerV: 0.57, ringWidthU: 0.024, ringWidthV: 0.034 })
  const pearlyBreakup = createMicroMottling(u, v, 0.018, 34, 58)

  let color = base
  color = mixColor(color, [0.98, 0.68, 0.64], bodyGlow * 0.58)
  color = mixColor(color, [0.98, 0.88, 0.68], (1 - smoothstep(0.18, 0.52, v)) * 0.18)
  color = mixColor(color, [0.62, 0.46, 0.22], dorsalShadow * 0.32)
  color = mixColor(color, [0.02, 0.02, 0.03], faceBand * 1)
  color = mixColor(color, [0.04, 0.04, 0.05], faceBandShadow * 0.34)
  color = mixColor(color, [0.1, 0.08, 0.06], faceMask * 0.84)
  color = mixColor(color, [0.9, 0.62, 0.24], rearAccent * 0.8)
  color = mixColor(color, [0.72, 0.48, 0.18], tailSaddle * 0.72)
  color = mixColor(color, [0.54, 0.36, 0.16], gillMask * 0.44)
  color = mixColor(color, [0.26, 0.18, 0.12], mouth * 0.84)
  color = mixColor(color, [0.78, 0.6, 0.34], eye.ring * 0.52)
  color = mixColor(color, [0.12, 0.12, 0.13], eye.core)
  color = mixColor(color, [0.96, 0.95, 0.88], eye.highlight * 0.92)

  const roughness = clamp01(
    0.62
      + (faceBand * 0.08)
      + (rearAccent * 0.03)
      + (tailSaddle * 0.04)
      + (dorsalShadow * 0.04)
      + (Math.max(0, pearlyBreakup) * 0.06)
  )
  const height =
    0.45
    + pearlyBreakup
    + (bodyGlow * 0.02)
    + (gillMask * (0.04 + ((u - 0.72) * 0.28)))
    + (faceBand * (0.06 + ((u - 0.81) * 0.84) + (Math.sin((u * 144) + (v * 14) + 1.6) * 0.02)))
    + (rearAccent * 0.04)
    + (tailSaddle * 0.05)
    + (eye.ring * (0.1 + ((u - 0.84) * 0.7) - ((v - 0.57) * 0.28)))
    - (eye.core * 0.03)

  return { color, roughness, height, alpha: 1 }
}

const sampleButterflyfishFin = (config, finKind, u, v) => {
  return createFinSurface(config, finKind, u, v, {
    membraneTint: [0.96, 0.9, 0.7],
    centerTint: [0.95, 0.84, 0.48],
    rayTint: [0.6, 0.48, 0.22],
    rimTint: [0.08, 0.08, 0.06],
    centerAlpha: finKind === 'tail' ? 0.78 : 0.74,
    edgeAlpha: 0.05,
    rayAlphaBoost: 0.16,
    membraneRoughness: 0.78,
    rayRoughnessBoost: 0.07,
    edgeRoughnessBoost: 0.05,
    rayHeight: 0.09,
    rimTintStrength: 0.78,
    centerTintStrength: 0.16,
    dorsalTintStrength: 0.12
  })
}

const sampleAngelfishBody = (config, u, v) => {
  const base = countershading([0.56, 0.52, 0.46], [0.95, 0.93, 0.86], v, 0.18, 0.82)
  const bandA = gauss(u, 0.3, 0.05)
  const bandB = gauss(u, 0.56, 0.06)
  const bandC = gauss(u, 0.76, 0.055)
  const bandStrength = clamp01((bandA * 0.9) + (bandB * 0.92) + bandC)
  const gillMask = createGillMask(u, v, 0.77, 0.024, 0.56, 0.18)
  const headVeil = gauss(u, 0.86, 0.09) * gauss(v, 0.58, 0.24)
  const cheekLight = gauss(u, 0.91, 0.05) * gauss(v, 0.42, 0.08)
  const dorsalOlive = gauss(v, 0.78, 0.12) * smoothstep(0.2, 0.82, u)
  const eye = createEyeMasks(u, v, { centerU: 0.868, centerV: 0.578, ringWidthU: 0.022, ringWidthV: 0.03 })
  const veilBreakup = createMicroMottling(u, v, 0.014, 28, 44)

  let color = base
  color = mixColor(color, [0.52, 0.46, 0.38], bandStrength * 0.78)
  color = mixColor(color, [0.72, 0.7, 0.58], headVeil * 0.34)
  color = mixColor(color, [0.84, 0.82, 0.74], cheekLight * 0.26)
  color = mixColor(color, [0.58, 0.6, 0.44], dorsalOlive * 0.22)
  color = mixColor(color, [0.46, 0.38, 0.28], gillMask * 0.52)
  color = mixColor(color, [0.78, 0.62, 0.42], eye.ring * 0.62)
  color = mixColor(color, [0.1, 0.1, 0.12], eye.core)
  color = mixColor(color, [0.96, 0.96, 0.92], eye.highlight * 0.9)

  const roughness = clamp01(0.68 + (bandStrength * 0.06) + (gillMask * 0.05))
  const height =
    0.45
    + veilBreakup
    + (bandStrength * 0.06)
    + (gillMask * (0.04 + ((u - 0.74) * 0.18)))
    + (eye.ring * (0.09 + ((u - 0.84) * 0.42)))

  return { color, roughness, height, alpha: 1 }
}

const sampleAngelfishFin = (config, finKind, u, v) => {
  return createFinSurface(config, finKind, u, v, {
    membraneTint: [0.88, 0.86, 0.8],
    centerTint: [0.8, 0.78, 0.7],
    rayTint: [0.7, 0.64, 0.5],
    rimTint: [0.44, 0.4, 0.32],
    centerAlpha: finKind === 'dorsal' || finKind === 'ventral' ? 0.7 : 0.74,
    edgeAlpha: 0.08,
    membraneRoughness: 0.82,
    rayRoughnessBoost: 0.06,
    edgeRoughnessBoost: 0.04,
    rayHeight: 0.08,
    verticalTint: [0.84, 0.82, 0.74],
    verticalTintStrength: 0.18,
    rimTintStrength: 0.24
  })
}

const sampleNeonBody = (config, u, v) => {
  const primary = hexToRgb(config.primary)
  const secondary = hexToRgb(config.secondary)
  const darkBack = countershading([0.08, 0.12, 0.2], [0.28, 0.34, 0.42], v, 0.2, 0.72)
  const cyanStripe = gauss(v, 0.58, 0.065) * smoothstep(0.12, 0.82, u)
  const redStripe = gauss(v, 0.33, 0.08) * smoothstep(0.18, 0.44, u) * (1 - smoothstep(0.82, 0.96, u))
  const headShadow = gauss(u, 0.88, 0.05) * gauss(v, 0.56, 0.09)
  const dorsalShadow = gauss(v, 0.78, 0.11) * smoothstep(0.16, 0.86, u)
  const tailShadow = smoothstep(0.82, 1, u) * gauss(v, 0.52, 0.12)
  const stripeBreakup = createMicroMottling(u, v, 0.01, 24, 46)

  let color = darkBack
  color = mixColor(color, mixColor(primary, [0.28, 0.86, 1], 0.5), cyanStripe * 0.96)
  color = mixColor(color, mixColor(secondary, [0.9, 0.24, 0.32], 0.56), redStripe * 0.94)
  color = mixColor(color, [0.05, 0.08, 0.14], headShadow * 0.92)
  color = mixColor(color, [0.06, 0.1, 0.16], dorsalShadow * 0.8)
  color = mixColor(color, [0.12, 0.18, 0.28], tailShadow * 0.76)

  const roughness = clamp01(0.34 - (cyanStripe * 0.03) + (dorsalShadow * 0.03))
  const height = 0.45 + stripeBreakup + (cyanStripe * 0.06) + (redStripe * 0.04) + (headShadow * 0.03)

  return { color, roughness, height, alpha: 1 }
}

const sampleNeonFin = (config, finKind, u, v) => {
  return createFinSurface(config, finKind, u, v, {
    membraneTint: [0.76, 0.8, 0.86],
    centerTint: finKind === 'tail' ? [0.56, 0.88, 1] : [0.76, 0.82, 0.9],
    rayTint: [0.56, 0.74, 0.88],
    rimTint: [0.22, 0.32, 0.42],
    centerAlpha: 0.72,
    edgeAlpha: 0.08,
    membraneRoughness: 0.74,
    rayRoughnessBoost: 0.04,
    edgeRoughnessBoost: 0.03,
    rayHeight: 0.06,
    centerTintStrength: finKind === 'tail' ? 0.28 : 0.12
  })
}

const sampleTropicalBody = (config, u, v) => {
  const accent = hexToRgb(config.accent)
  const base = countershading([0.52, 0.28, 0.14], [0.98, 0.84, 0.56], v, 0.16, 0.82)
  const dorsalBand = gauss(v, 0.8, 0.12) * smoothstep(0.16, 0.9, u)
  const bellyLift = 1 - smoothstep(0.18, 0.48, v)
  const faceMask = gauss(u, 0.84, 0.05) * gauss(v, 0.58, 0.08)
  const eyeLine = smoothstep(0.74, 0.82, u) * (1 - smoothstep(0.88, 0.96, u)) * gauss(v, 0.56, 0.035)
  const finAccent = smoothstep(0.74, 1, u) * gauss(v, 0.52, 0.24)
  const scaleBreakup = createMicroMottling(u, v, 0.016, 36, 62)

  let color = base
  color = mixColor(color, [0.98, 0.78, 0.32], smoothstep(0.22, 0.78, u) * 0.42)
  color = mixColor(color, [0.94, 0.88, 0.66], bellyLift * 0.24)
  color = mixColor(color, [0.74, 0.32, 0.16], dorsalBand * 0.38)
  color = mixColor(color, [0.18, 0.2, 0.18], eyeLine * 0.94)
  color = mixColor(color, [0.16, 0.28, 0.22], faceMask * 0.74)
  color = mixColor(color, multiplyColor(accent, 0.9), finAccent * 0.32)

  const roughness = clamp01(0.42 - (dorsalBand * 0.03) + (faceMask * 0.04))
  const height = 0.45 + scaleBreakup + (eyeLine * 0.08) + (faceMask * 0.05) + (finAccent * 0.03)

  return { color, roughness, height, alpha: 1 }
}

const sampleTropicalFin = (config, finKind, u, v) => {
  return createFinSurface(config, finKind, u, v, {
    membraneTint: [0.98, 0.92, 0.76],
    centerTint: [0.96, 0.74, 0.38],
    rayTint: [0.18, 0.54, 0.5],
    rimTint: [0.18, 0.38, 0.36],
    centerAlpha: 0.74,
    edgeAlpha: 0.08,
    membraneRoughness: 0.78,
    rayRoughnessBoost: 0.05,
    edgeRoughnessBoost: 0.03,
    rayHeight: 0.07
  })
}

const sampleBody = (config, u, v) => {
  if (config.pattern === 'goldfish') return sampleGoldfishBody(config, u, v)
  if (config.pattern === 'butterflyfish') return sampleButterflyfishBody(config, u, v)
  if (config.pattern === 'angelfish') return sampleAngelfishBody(config, u, v)
  if (config.pattern === 'neon') return sampleNeonBody(config, u, v)
  return sampleTropicalBody(config, u, v)
}

const sampleFin = (config, finKind, u, v) => {
  if (config.pattern === 'goldfish') return sampleGoldfishFin(config, finKind, u, v)
  if (config.pattern === 'butterflyfish') return sampleButterflyfishFin(config, finKind, u, v)
  if (config.pattern === 'angelfish') return sampleAngelfishFin(config, finKind, u, v)
  if (config.pattern === 'neon') return sampleNeonFin(config, finKind, u, v)
  return sampleTropicalFin(config, finKind, u, v)
}

export const createAtlas = (config) => {
  const baseColor = new Uint8Array(atlasWidth * atlasHeight * 4)
  const roughness = new Uint8Array(atlasWidth * atlasHeight * 4)
  const alpha = new Uint8Array(atlasWidth * atlasHeight * 4)
  const heightField = new Float32Array(atlasWidth * atlasHeight)

  const writeSurface = (rect, sampler, finKind = 'body') => {
    writeRegion(baseColor, rect, (u, v) => {
      const surface = sampler(config, finKind, u, v)
      return [...surface.color, 1]
    })
    writeRegion(roughness, rect, (u, v) => {
      const surface = sampler(config, finKind, u, v)
      return [surface.roughness, surface.roughness, surface.roughness, 1]
    })
    writeRegion(alpha, rect, (u, v) => {
      const surface = sampler(config, finKind, u, v)
      return [surface.alpha, surface.alpha, surface.alpha, 1]
    })

    const x0 = Math.floor(rect.u0 * atlasWidth)
    const x1 = Math.ceil(rect.u1 * atlasWidth)
    const y0 = Math.floor((1 - rect.v1) * atlasHeight)
    const y1 = Math.ceil((1 - rect.v0) * atlasHeight)
    for (let y = y0; y < y1; y++) {
      const v = 1 - (y / (atlasHeight - 1))
      const localV = clamp01((v - rect.v0) / Math.max(0.0001, rect.v1 - rect.v0))
      for (let x = x0; x < x1; x++) {
        const u = x / (atlasWidth - 1)
        const localU = clamp01((u - rect.u0) / Math.max(0.0001, rect.u1 - rect.u0))
        heightField[(y * atlasWidth) + x] = sampler(config, finKind, localU, localV).height
      }
    }
  }

  writeSurface(atlasRects.body, (_, __, u, v) => sampleBody(config, u, v))
  writeSurface(atlasRects.dorsal, sampleFin, 'dorsal')
  writeSurface(atlasRects.ventral, sampleFin, 'ventral')
  writeSurface(atlasRects.pectoral, sampleFin, 'pectoral')
  writeSurface(atlasRects.tail, sampleFin, 'tail')

  const normal = new Uint8Array(atlasWidth * atlasHeight * 4)
  for (let y = 0; y < atlasHeight; y++) {
    for (let x = 0; x < atlasWidth; x++) {
      const current = heightField[(y * atlasWidth) + x]
      const left = heightField[(y * atlasWidth) + Math.max(0, x - 1)] ?? current
      const right = heightField[(y * atlasWidth) + Math.min(atlasWidth - 1, x + 1)] ?? current
      const down = heightField[(Math.max(0, y - 1) * atlasWidth) + x] ?? current
      const up = heightField[(Math.min(atlasHeight - 1, y + 1) * atlasWidth) + x] ?? current
      const nx = left - right
      const ny = down - up
      const normalVector = new THREE.Vector3(nx * 3.2, ny * 3.2, 1).normalize()
      paintPixel(normal, x, y, [
        (normalVector.x * 0.5) + 0.5,
        (normalVector.y * 0.5) + 0.5,
        (normalVector.z * 0.5) + 0.5,
        1
      ])
    }
  }

  return { baseColor, normal, roughness, alpha }
}

export const sampleAtlas = (atlas, rect, localU, localV) => {
  const u = rect.u0 + (clamp01(localU) * (rect.u1 - rect.u0))
  const v = rect.v0 + (clamp01(localV) * (rect.v1 - rect.v0))
  const x = Math.max(0, Math.min(atlasWidth - 1, Math.round(u * (atlasWidth - 1))))
  const y = Math.max(0, Math.min(atlasHeight - 1, Math.round((1 - v) * (atlasHeight - 1))))
  const index = ((y * atlasWidth) + x) * 4
  return {
    baseColor: [
      atlas.baseColor[index] / 255,
      atlas.baseColor[index + 1] / 255,
      atlas.baseColor[index + 2] / 255
    ],
    roughness: atlas.roughness[index] / 255,
    alpha: atlas.alpha[index] / 255
  }
}

const remapUv = (geometry, rect, axisU = 'x', axisV = 'y') => {
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox
  const pos = geometry.getAttribute('position')
  const getComponent = (vector, axis) => axis === 'x' ? vector.x : axis === 'y' ? vector.y : vector.z
  const minU = getComponent(bbox.min, axisU)
  const maxU = getComponent(bbox.max, axisU)
  const minV = getComponent(bbox.min, axisV)
  const maxV = getComponent(bbox.max, axisV)
  const rangeU = Math.max(0.0001, maxU - minU)
  const rangeV = Math.max(0.0001, maxV - minV)
  const uv = new Float32Array(pos.count * 2)
  for (let index = 0; index < pos.count; index++) {
    const uValue = ((axisU === 'x' ? pos.getX(index) : axisU === 'y' ? pos.getY(index) : pos.getZ(index)) - minU) / rangeU
    const vValue = (axisV === 'x' ? pos.getX(index) : axisV === 'y' ? pos.getY(index) : pos.getZ(index)) - minV
    uv[index * 2] = rect.u0 + (uValue * (rect.u1 - rect.u0))
    uv[(index * 2) + 1] = rect.v0 + ((vValue / rangeV) * (rect.v1 - rect.v0))
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}

const createSilhouetteShapes = (config) => {
  const s = config.silhouette
  const tailRootX = -s.bodyLength * 0.48
  const shoulderX = s.bodyLength * 0.06
  const noseX = s.bodyLength * 0.5 + s.noseLength
  const upperCurve = s.bodyHeight * s.topFullness
  const lowerCurve = s.bodyHeight * s.bellyFullness

  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(tailRootX, 0)
  bodyShape.bezierCurveTo(
    tailRootX + (s.bodyLength * 0.18),
    upperCurve,
    shoulderX,
    s.bodyHeight,
    noseX - (s.noseLength * 0.18),
    s.bodyHeight * 0.14
  )
  bodyShape.quadraticCurveTo(noseX, 0, noseX - (s.noseLength * 0.24), -s.bodyHeight * 0.12)
  bodyShape.bezierCurveTo(
    shoulderX,
    -lowerCurve,
    tailRootX + (s.bodyLength * 0.12),
    -s.bodyHeight,
    tailRootX,
    0
  )

  const tailShape = new THREE.Shape()
  tailShape.moveTo(tailRootX + 0.05, s.tailHeight * 0.14)
  tailShape.lineTo(tailRootX - (s.tailLength * 0.8), s.tailHeight * 0.48)
  tailShape.quadraticCurveTo(
    tailRootX - s.tailLength,
    0,
    tailRootX - (s.tailLength * 0.8),
    -s.tailHeight * 0.48
  )
  tailShape.lineTo(tailRootX + 0.05, -s.tailHeight * 0.14)
  tailShape.closePath()

  const dorsalShape = new THREE.Shape()
  dorsalShape.moveTo(0, 0)
  dorsalShape.quadraticCurveTo(s.bodyLength * 0.12, s.dorsalHeight * 0.9, s.bodyLength * 0.36, s.dorsalHeight * 0.24)
  dorsalShape.lineTo(s.bodyLength * 0.24, 0)
  dorsalShape.closePath()

  const ventralShape = new THREE.Shape()
  ventralShape.moveTo(0, 0)
  ventralShape.quadraticCurveTo(s.bodyLength * 0.12, -s.ventralHeight, s.bodyLength * 0.3, -s.ventralHeight * 0.2)
  ventralShape.lineTo(s.bodyLength * 0.18, 0)
  ventralShape.closePath()

  const pectoralShape = new THREE.Shape()
  pectoralShape.moveTo(0, 0)
  pectoralShape.quadraticCurveTo(s.pectoralLength * 0.65, s.pectoralLength * 0.5, s.pectoralLength, 0)
  pectoralShape.quadraticCurveTo(s.pectoralLength * 0.55, -s.pectoralLength * 0.38, 0, 0)
  pectoralShape.closePath()

  return { bodyShape, tailShape, dorsalShape, ventralShape, pectoralShape }
}

const createFishGeometries = (config) => {
  const { bodyShape, tailShape, dorsalShape, ventralShape, pectoralShape } = createSilhouetteShapes(config)
  const s = config.silhouette
  const body = new THREE.ExtrudeGeometry(bodyShape, {
    depth: s.bodyThickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: Math.min(0.025, s.bodyThickness * 0.11),
    bevelThickness: Math.min(0.03, s.bodyThickness * 0.14)
  })
  body.translate(0, 0, -s.bodyThickness * 0.5)
  remapUv(body, atlasRects.body, 'x', 'y')

  const finDepth = Math.max(0.02, s.bodyThickness * 0.14)
  const tail = new THREE.ExtrudeGeometry(tailShape, {
    depth: finDepth,
    bevelEnabled: false,
    steps: 1
  })
  tail.translate(0, 0, -finDepth * 0.5)
  remapUv(tail, atlasRects.tail, 'x', 'y')

  const dorsal = new THREE.ExtrudeGeometry(dorsalShape, {
    depth: finDepth,
    bevelEnabled: false,
    steps: 1
  })
  dorsal.rotateX(Math.PI / 2)
  dorsal.translate(s.bodyLength * 0.02, s.bodyHeight * 0.34 + (s.dorsalHeight * 0.26), 0)
  remapUv(dorsal, atlasRects.dorsal, 'x', 'z')

  const ventral = new THREE.ExtrudeGeometry(ventralShape, {
    depth: finDepth,
    bevelEnabled: false,
    steps: 1
  })
  ventral.rotateX(-Math.PI / 2)
  ventral.translate(s.bodyLength * 0.04, -(s.bodyHeight * 0.28) - (s.ventralHeight * 0.3), 0)
  remapUv(ventral, atlasRects.ventral, 'x', 'z')

  const pectoralLeft = new THREE.ExtrudeGeometry(pectoralShape, {
    depth: finDepth,
    bevelEnabled: false,
    steps: 1
  })
  pectoralLeft.rotateY(Math.PI / 2)
  pectoralLeft.rotateZ(Math.PI / 5)
  pectoralLeft.translate(s.bodyLength * 0.1, s.bodyHeight * 0.1, s.bodyThickness * 0.42)
  remapUv(pectoralLeft, atlasRects.pectoral, 'x', 'y')

  const pectoralRight = pectoralLeft.clone()
  pectoralRight.scale(1, 1, -1)
  remapUv(pectoralRight, atlasRects.pectoral, 'x', 'y')

  const finGeometry = BufferGeometryUtils.mergeGeometries([tail, dorsal, ventral, pectoralLeft, pectoralRight])
  body.computeVertexNormals()
  finGeometry.computeVertexNormals()
  return { body, fins: finGeometry }
}

const exportGlb = async (object) => {
  const exporter = new GLTFExporter()
  return await new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(Buffer.from(result))
          return
        }
        reject(new Error('Expected binary GLB output'))
      },
      reject,
      { binary: true }
    )
  })
}

export const writeFishAssets = async (config) => {
  const atlas = createAtlas(config)
  const baseColorPath = path.join(outputDir, `fish-${config.id}-basecolor.png`)
  const normalPath = path.join(outputDir, `fish-${config.id}-normal.png`)
  const roughnessPath = path.join(outputDir, `fish-${config.id}-roughness.png`)
  const alphaPath = path.join(outputDir, `fish-${config.id}-alpha.png`)
  writePng(baseColorPath, atlasWidth, atlasHeight, atlas.baseColor)
  writePng(normalPath, atlasWidth, atlasHeight, atlas.normal)
  writePng(roughnessPath, atlasWidth, atlasHeight, atlas.roughness)
  writePng(alphaPath, atlasWidth, atlasHeight, atlas.alpha)

  const textures = {
    map: makeTexture(atlas.baseColor, 'srgb'),
    normalMap: makeTexture(atlas.normal, 'linear'),
    roughnessMap: makeTexture(atlas.roughness, 'linear'),
    alphaMap: makeTexture(atlas.alpha, 'linear')
  }

  const materialScalars = config.pattern === 'butterflyfish'
    ? {
        school: { metalness: 0.01, roughness: 0.6 },
        heroBody: { metalness: 0.01, roughness: 0.56 },
        heroFin: { metalness: 0.01, roughness: 0.88, opacity: 0.94, alphaTest: 0.06 }
      }
    : config.pattern === 'goldfish'
      ? {
          school: { metalness: 0.01, roughness: 0.58 },
          heroBody: { metalness: 0.01, roughness: 0.5 },
          heroFin: { metalness: 0.01, roughness: 0.9, opacity: 0.94, alphaTest: 0.06 }
        }
      : {
          school: { metalness: 0.02, roughness: 0.46 },
          heroBody: { metalness: 0.02, roughness: 0.4 },
          heroFin: { metalness: 0.01, roughness: 0.76, opacity: 0.96, alphaTest: 0.04 }
        }

  const { body, fins } = createFishGeometries(config)
  const schoolGeometry = BufferGeometryUtils.mergeGeometries([body.clone(), fins.clone()])
  schoolGeometry.computeVertexNormals()

  const schoolMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    metalness: materialScalars.school.metalness,
    roughness: materialScalars.school.roughness,
    side: THREE.FrontSide
  })

  const schoolMesh = new THREE.Mesh(schoolGeometry, schoolMaterial)
  const schoolScene = new THREE.Group()
  schoolScene.add(schoolMesh)
  const schoolGlb = await exportGlb(schoolScene)
  fs.writeFileSync(path.join(outputDir, `fish-${config.id}-school.glb`), schoolGlb)

  const heroBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    metalness: materialScalars.heroBody.metalness,
    roughness: materialScalars.heroBody.roughness
  })
  const heroFinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    alphaMap: textures.alphaMap,
    transparent: true,
    opacity: materialScalars.heroFin.opacity,
    alphaTest: materialScalars.heroFin.alphaTest,
    metalness: materialScalars.heroFin.metalness,
    roughness: materialScalars.heroFin.roughness,
    side: THREE.DoubleSide
  })

  const heroGroup = new THREE.Group()
  const heroScale = config.heroScale ?? 1.1
  const heroBody = new THREE.Mesh(body.clone(), heroBodyMaterial)
  const heroFins = new THREE.Mesh(fins.clone(), heroFinMaterial)
  heroBody.scale.setScalar(heroScale)
  heroFins.scale.setScalar(heroScale)
  heroGroup.add(heroBody, heroFins)
  const heroGlb = await exportGlb(heroGroup)
  fs.writeFileSync(path.join(outputDir, `fish-${config.id}-hero.glb`), heroGlb)
}

export const main = async () => {
  installExporterPolyfills()
  fs.mkdirSync(outputDir, { recursive: true })

  for (const config of fishAssetConfigs) {
    await writeFishAssets(config)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
