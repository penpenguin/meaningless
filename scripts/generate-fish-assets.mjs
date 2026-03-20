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

const sampleBody = (config, u, v) => {
  const primary = hexToRgb(config.primary)
  const secondary = hexToRgb(config.secondary)
  const accent = hexToRgb(config.accent)
  const belly = mixColor([0.95, 0.94, 0.9], secondary, 0.24)
  const dorsal = multiplyColor(primary, 0.56)
  let color = mixColor(dorsal, belly, smoothstep(0.12, 0.72, v))
  let roughness = 0.62
  let height = 0.46 + (Math.sin(u * 34) * 0.014) + (Math.sin(v * 58) * 0.01)

  if (config.pattern === 'neon') {
    const cyanStripe = gauss(v, 0.58, 0.09)
    const redStripe = gauss(v, 0.33, 0.085) * smoothstep(0.18, 0.42, u) * (1 - smoothstep(0.82, 0.96, u))
    color = mixColor(color, [0.34, 0.9, 1], cyanStripe * 0.95)
    color = mixColor(color, [0.87, 0.23, 0.33], redStripe * 0.92)
    color = mixColor(color, [0.14, 0.2, 0.42], smoothstep(0.82, 1, u) * 0.7)
    color = mixColor(color, [0.08, 0.12, 0.2], gauss(u, 0.9, 0.04) * gauss(v, 0.52, 0.08) * 0.9)
    roughness = 0.34 - (cyanStripe * 0.08)
    height += (cyanStripe * 0.08) + (redStripe * 0.05)
  } else if (config.pattern === 'angelfish') {
    const bandA = gauss(u, 0.3, 0.05)
    const bandB = gauss(u, 0.56, 0.06)
    const bandC = gauss(u, 0.76, 0.055)
    const bandStrength = Math.max(bandA, bandB, bandC)
    const eyeRing = gauss(u, 0.86, 0.028) * gauss(v, 0.58, 0.04)
    const eyeCore = gauss(u, 0.868, 0.014) * gauss(v, 0.578, 0.023)
    const eyeHighlight = gauss(u, 0.853, 0.008) * gauss(v, 0.594, 0.013)
    const gillBand = gauss(u, 0.77, 0.024) * gauss(v, 0.56, 0.18)
    const headVeil = gauss(u, 0.86, 0.09) * gauss(v, 0.58, 0.24)
    const dorsalOlive = gauss(v, 0.78, 0.12) * smoothstep(0.2, 0.82, u)
    color = mixColor(color, [0.98, 0.97, 0.92], smoothstep(0.1, 0.34, v) * 0.26)
    color = mixColor(color, [0.54, 0.48, 0.4], bandStrength * 0.7)
    color = mixColor(color, [0.72, 0.7, 0.58], headVeil * 0.32)
    color = mixColor(color, [0.6, 0.62, 0.46], dorsalOlive * 0.28)
    color = mixColor(color, [0.52, 0.44, 0.34], gillBand * 0.6)
    color = mixColor(color, [0.78, 0.62, 0.42], eyeRing * 0.72)
    color = mixColor(color, [0.1, 0.1, 0.12], eyeCore)
    color = mixColor(color, [0.96, 0.96, 0.92], eyeHighlight * 0.9)
    roughness = 0.68 + (bandStrength * 0.06) + (gillBand * 0.05)
    height += (Math.sin(u * 26 + v * 8) * 0.02) + (bandStrength * 0.05) + (gillBand * 0.05) + (eyeRing * 0.12)
  } else if (config.pattern === 'butterflyfish') {
    const eyeBand = gauss(u, 0.84, 0.045) * gauss(v, 0.56, 0.13)
    const rearBand = gauss(u, 0.58, 0.055) * gauss(v, 0.58, 0.3)
    const tailAccent = smoothstep(0.03, 0.18, u) * gauss(v, 0.54, 0.26)
    const dorsalWash = gauss(v, 0.8, 0.12) * smoothstep(0.12, 0.9, u)
    const ventralFade = 1 - smoothstep(0.18, 0.52, v)
    const eyeCore = gauss(u, 0.872, 0.016) * gauss(v, 0.57, 0.024)
    const eyeHighlight = gauss(u, 0.858, 0.008) * gauss(v, 0.588, 0.012)
    const mouth = gauss(u, 0.965, 0.022) * gauss(v, 0.49, 0.05)
    const gillBand = gauss(u, 0.74, 0.024) * gauss(v, 0.56, 0.16)
    const faceMask = gauss(u, 0.9, 0.07) * gauss(v, 0.57, 0.18)
    const dorsalSlate = gauss(v, 0.84, 0.14) * smoothstep(0.1, 0.82, u)
    const bodyCream = gauss(u, 0.48, 0.22) * gauss(v, 0.54, 0.28)
    const bodyOlive = gauss(u, 0.5, 0.18) * gauss(v, 0.54, 0.22)
    const midBodyPlate = gauss(u, 0.52, 0.14) * gauss(v, 0.54, 0.18)
    const bodyMint = gauss(u, 0.5, 0.2) * gauss(v, 0.54, 0.24)
    const speciesTint = gauss(u, 0.5, 0.28) * gauss(v, 0.54, 0.26)
    color = mixColor([0.9, 0.92, 0.84], [0.54, 0.72, 0.48], smoothstep(0.28, 0.88, v))
    color = mixColor(color, [0.68, 0.8, 0.66], bodyCream * 0.74)
    color = mixColor(color, [0.34, 0.62, 0.4], bodyOlive * 0.72)
    color = mixColor(color, [0.34, 0.62, 0.44], midBodyPlate * 0.96)
    color = mixColor(color, [0.44, 0.68, 0.48], bodyMint * 0.72)
    color = mixColor(color, [0.94, 0.92, 0.8], ventralFade * 0.24)
    color = mixColor(color, [0.62, 0.66, 0.4], dorsalWash * 0.28)
    color = mixColor(color, [0.56, 0.48, 0.3], dorsalSlate * 0.2)
    color = mixColor(color, [0.62, 0.76, 0.46], speciesTint * 0.84)
    color = mixColor(color, [0.18, 0.18, 0.2], eyeBand * 0.94)
    color = mixColor(color, [0.72, 0.62, 0.38], rearBand * 0.24)
    color = mixColor(color, [0.98, 0.66, 0.18], tailAccent * 0.82)
    color = mixColor(color, [0.66, 0.5, 0.24], gillBand * 0.4)
    color = mixColor(color, [0.36, 0.3, 0.18], faceMask * 0.6)
    color = mixColor(color, [0.12, 0.12, 0.14], eyeCore)
    color = mixColor(color, [0.96, 0.95, 0.88], eyeHighlight * 0.9)
    color = mixColor(color, [0.28, 0.2, 0.12], mouth * 0.82)
    roughness = 0.76 + (eyeBand * 0.06) + (tailAccent * 0.03) + (faceMask * 0.03)
    height += (Math.sin(u * 24 + v * 7) * 0.018) + (rearBand * 0.04) + (gillBand * 0.03) + (eyeBand * 0.06)
  } else if (config.pattern === 'goldfish') {
    const dorsalBand = gauss(v, 0.8, 0.14) * smoothstep(0.18, 0.86, u)
    const bellyLight = 1 - smoothstep(0.18, 0.52, v)
    const headWarm = gauss(u, 0.84, 0.11) * gauss(v, 0.58, 0.22)
    const peduncle = gauss(u, 0.14, 0.08) * gauss(v, 0.52, 0.28)
    const gillBand = gauss(u, 0.77, 0.025) * gauss(v, 0.56, 0.18)
    const mouth = gauss(u, 0.965, 0.02) * gauss(v, 0.49, 0.05)
    const mouthShadow = gauss(u, 0.944, 0.032) * gauss(v, 0.468, 0.05)
    const midBodyWarm = gauss(u, 0.52, 0.22) * gauss(v, 0.52, 0.28)
    const eyeRing = gauss(u, 0.89, 0.026) * gauss(v, 0.585, 0.038)
    const eyeCore = gauss(u, 0.898, 0.014) * gauss(v, 0.58, 0.022)
    const eyeHighlight = gauss(u, 0.884, 0.008) * gauss(v, 0.598, 0.012)
    const scaleBreakup = (Math.sin(u * 44) * Math.sin(v * 76)) * 0.022
    color = mixColor([0.98, 0.84, 0.56], [0.82, 0.41, 0.16], smoothstep(0.18, 0.84, v))
    color = mixColor(color, [1, 0.5, 0.14], midBodyWarm * 0.42)
    color = mixColor(color, [1, 0.91, 0.64], bellyLight * 0.34)
    color = mixColor(color, [0.72, 0.28, 0.12], dorsalBand * 0.5)
    color = mixColor(color, [0.98, 0.68, 0.24], headWarm * 0.42)
    color = mixColor(color, [0.86, 0.34, 0.12], peduncle * 0.5)
    color = mixColor(color, [0.72, 0.3, 0.12], gillBand * 0.7)
    color = mixColor(color, [0.78, 0.26, 0.14], mouth * 0.82)
    color = mixColor(color, [0.72, 0.22, 0.14], mouthShadow * 0.38)
    color = mixColor(color, [0.86, 0.58, 0.28], eyeRing * 0.6)
    color = mixColor(color, [0.08, 0.08, 0.09], eyeCore)
    color = mixColor(color, [0.98, 0.96, 0.92], eyeHighlight * 0.92)
    roughness = 0.7 - (smoothstep(0.24, 0.76, u) * 0.08) + (gillBand * 0.08) + (peduncle * 0.06)
    height += scaleBreakup + (gillBand * 0.07) + (eyeRing * 0.16) + (peduncle * 0.04) + (mouth * 0.04)
  } else {
    const eyeLine = smoothstep(0.74, 0.82, u) * (1 - smoothstep(0.88, 0.96, u)) * gauss(v, 0.56, 0.035)
    const finEdge = smoothstep(0.74, 1, u) * gauss(v, 0.5, 0.28)
    const dorsalBand = gauss(v, 0.72, 0.11)
    const eyeAccent = gauss(u, 0.84, 0.05) * gauss(v, 0.62, 0.05)
    color = mixColor(color, [0.99, 0.83, 0.34], smoothstep(0.2, 0.78, u) * 0.48)
    color = mixColor(color, [0.16, 0.22, 0.22], eyeLine * 0.95)
    color = mixColor(color, [0.2, 0.64, 0.61], eyeAccent * 0.92)
    color = mixColor(color, multiplyColor(accent, 0.9), finEdge * 0.35)
    color = mixColor(color, [0.92, 0.55, 0.24], dorsalBand * 0.3)
    roughness = 0.37 - (dorsalBand * 0.04)
    height += (eyeLine * 0.09) + (eyeAccent * 0.05) + (gauss(u, 0.6, 0.1) * 0.03)
  }

  return { color, roughness, height, alpha: 1 }
}

const sampleFin = (config, finKind, u, v) => {
  const primary = hexToRgb(config.primary)
  const secondary = hexToRgb(config.secondary)
  let color = mixColor([0.96, 0.95, 0.92], mixColor(primary, secondary, 0.45), 0.42)
  let height = 0.5 + (Math.sin(u * 32) * 0.012)
  let roughness = 0.8
  const edge = Math.min(u, 1 - u, v, 1 - v)
  const centerMask = smoothstep(0.02, 0.24, edge)
  const rayA = gauss(u, 0.2, 0.04)
  const rayB = gauss(u, 0.38, 0.04)
  const rayC = gauss(u, 0.56, 0.04)
  const rayD = gauss(u, 0.74, 0.04)
  const rayStrength = clamp01(rayA + rayB + rayC + rayD)
  let alpha = lerp(0.16, 0.8, centerMask) + (rayStrength * 0.08)

  if (config.pattern === 'angelfish') {
    const smoke = gauss(v, 0.64, 0.18) * smoothstep(0.1, 0.92, u)
    const edgeRim = 1 - smoothstep(0.03, 0.16, edge)
    color = mixColor(color, [0.84, 0.82, 0.74], smoke * 0.22)
    color = mixColor(color, [0.52, 0.46, 0.38], edgeRim * 0.3)
    color = mixColor(color, [0.75, 0.66, 0.44], rayStrength * 0.18)
    alpha *= 0.9
    roughness = 0.86
    height += rayStrength * 0.05
  } else if (config.pattern === 'butterflyfish') {
    const border = 1 - smoothstep(0.03, 0.14, edge)
    const warmEdge = smoothstep(0.72, 1, u) + gauss(v, 0.76, 0.18)
    const membraneAmber = smoothstep(0.16, 0.82, centerMask)
    const membraneAlpha = lerp(0.14, 0.8, centerMask)
    color = mixColor(color, [0.92, 0.86, 0.58], membraneAmber * 0.26)
    color = mixColor(color, [0.92, 0.82, 0.34], warmEdge * 0.18)
    color = mixColor(color, [0.12, 0.1, 0.1], border * 0.72)
    color = mixColor(color, [0.58, 0.48, 0.22], rayStrength * 0.26)
    alpha = ((membraneAlpha + (rayStrength * 0.12)) * 0.9) - (border * 0.08) + (rayStrength * 0.02)
    roughness = 0.88
    height += border * 0.05 + (rayStrength * 0.06)
  } else if (config.pattern === 'goldfish') {
    const warm = smoothstep(0.12, 0.9, u)
    const edgeFade = 1 - smoothstep(0.03, 0.14, edge)
    const membraneAlpha = lerp(0.14, 0.8, centerMask)
    color = mixColor(color, [1, 0.82, 0.5], warm * 0.46)
    color = mixColor(color, [0.98, 0.55, 0.22], rayStrength * 0.34)
    color = mixColor(color, [0.86, 0.42, 0.18], edgeFade * 0.22)
    alpha = ((membraneAlpha + (rayStrength * 0.14)) * 0.74) - (edgeFade * 0.05) + (rayStrength * 0.04)
    roughness = 0.92
    height += rayStrength * 0.12
  } else if (config.pattern === 'neon') {
    const tailFlash = finKind === 'tail' ? smoothstep(0.3, 1, u) : gauss(v, 0.55, 0.16)
    color = mixColor(color, [0.56, 0.9, 1], tailFlash * 0.4)
    alpha *= 0.84
    roughness = 0.74
  } else {
    const edgeRim = smoothstep(0.78, 1, u)
    const border = 1 - smoothstep(0.02, 0.14, edge)
    color = mixColor(color, [0.18, 0.62, 0.61], edgeRim * 0.32)
    color = mixColor(color, [0.98, 0.7, 0.32], gauss(v, 0.54, 0.16) * 0.25)
    color = mixColor(color, multiplyColor(hexToRgb(config.accent), 0.9), border * 0.24)
    alpha *= 0.88
  }

  alpha = clamp01(alpha)

  return { color, roughness, height, alpha }
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
        school: { metalness: 0.01, roughness: 0.52 },
        heroBody: { metalness: 0.01, roughness: 0.5 },
        heroFin: { metalness: 0.01, roughness: 0.9, opacity: 0.92, alphaTest: 0.06 }
      }
    : config.pattern === 'goldfish'
      ? {
          school: { metalness: 0.02, roughness: 0.5 },
          heroBody: { metalness: 0.02, roughness: 0.42 },
          heroFin: { metalness: 0.01, roughness: 0.94, opacity: 0.92, alphaTest: 0.06 }
        }
      : {
          school: { metalness: 0.03, roughness: 0.42 },
          heroBody: { metalness: 0.03, roughness: 0.34 },
          heroFin: { metalness: 0.02, roughness: 0.72, opacity: 0.96, alphaTest: 0.04 }
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
