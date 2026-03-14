import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outputDir = path.resolve('public/assets/aquarium')
const atlasWidth = 1024
const atlasHeight = 512

const atlasRects = {
  body: { u0: 0.06, v0: 0.22, u1: 0.94, v1: 0.9 },
  dorsal: { u0: 0.04, v0: 0.03, u1: 0.2, v1: 0.18 },
  ventral: { u0: 0.22, v0: 0.03, u1: 0.38, v1: 0.18 },
  pectoral: { u0: 0.4, v0: 0.03, u1: 0.62, v1: 0.18 },
  tail: { u0: 0.66, v0: 0.02, u1: 0.96, v1: 0.2 }
}

const fishConfigs = [
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
    primary: '#d8e5ef',
    secondary: '#8fa3ba',
    accent: '#2b3443',
    silhouette: {
      bodyLength: 1.06,
      bodyHeight: 0.62,
      bodyThickness: 0.18,
      noseLength: 0.18,
      tailLength: 0.34,
      tailHeight: 0.52,
      dorsalHeight: 0.9,
      ventralHeight: 0.96,
      pectoralLength: 0.24,
      topFullness: 0.9,
      bellyFullness: 0.88
    },
    heroScale: 1.16,
    pattern: 'angelfish'
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
    primary: '#f6bf58',
    secondary: '#f28a32',
    accent: '#96511e',
    silhouette: {
      bodyLength: 1.26,
      bodyHeight: 0.48,
      bodyThickness: 0.32,
      noseLength: 0.22,
      tailLength: 0.52,
      tailHeight: 0.6,
      dorsalHeight: 0.36,
      ventralHeight: 0.22,
      pectoralLength: 0.26,
      topFullness: 0.84,
      bellyFullness: 0.94
    },
    heroScale: 1.14,
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

const installExporterPolyfills = () => {
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
  const belly = mixColor([0.92, 0.94, 0.95], secondary, 0.22)
  const dorsal = multiplyColor(primary, 0.58)
  let color = mixColor(dorsal, belly, smoothstep(0.12, 0.72, v))
  let roughness = 0.38
  let height = 0.46 + (Math.sin(u * 34) * 0.016) + (Math.sin(v * 58) * 0.01)

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
    const bandA = gauss(u, 0.26, 0.05)
    const bandB = gauss(u, 0.5, 0.05)
    const bandC = gauss(u, 0.73, 0.05)
    const bandStrength = Math.max(bandA, bandB, bandC)
    color = mixColor(color, multiplyColor(accent, 0.72), bandStrength * 0.92)
    color = mixColor(color, [0.93, 0.86, 0.65], gauss(u, 0.9, 0.08) * 0.4)
    color = mixColor(color, [0.98, 0.99, 1], smoothstep(0.2, 0.68, v) * 0.25)
    roughness = 0.42 + (bandStrength * 0.08)
    height += bandStrength * 0.09
  } else if (config.pattern === 'goldfish') {
    const faceGlow = gauss(u, 0.86, 0.08) * gauss(v, 0.56, 0.18)
    const warmRidge = smoothstep(0.18, 0.78, u)
    const cheekShadow = gauss(u, 0.9, 0.03) * gauss(v, 0.54, 0.055)
    const dorsalPatch = gauss(v, 0.74, 0.11) * smoothstep(0.26, 0.82, u)
    const tailWarm = smoothstep(0.62, 0.96, u) * gauss(v, 0.5, 0.26)
    color = mixColor(color, [0.98, 0.7, 0.2], warmRidge * 0.75)
    color = mixColor(color, [1, 0.88, 0.56], smoothstep(0.06, 0.3, v) * 0.35)
    color = mixColor(color, [0.96, 0.78, 0.42], faceGlow * 0.85)
    color = mixColor(color, [0.92, 0.52, 0.18], dorsalPatch * 0.28)
    color = mixColor(color, [0.95, 0.52, 0.16], tailWarm * 0.42)
    color = mixColor(color, [0.72, 0.33, 0.12], cheekShadow * 0.82)
    roughness = 0.36 - (faceGlow * 0.08) + (tailWarm * 0.03)
    height += (Math.sin(u * 24 + v * 9) * 0.02) + (faceGlow * 0.06) + (dorsalPatch * 0.04)
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
  let color = mixColor([0.95, 0.96, 0.97], mixColor(primary, secondary, 0.4), 0.35)
  let height = 0.5 + (Math.sin(u * 32) * 0.01)
  let roughness = 0.72
  const edge = Math.min(u, 1 - u, v, 1 - v)
  const centerMask = smoothstep(0.02, 0.24, edge)
  let alpha = lerp(0.18, 0.88, centerMask)

  if (config.pattern === 'angelfish') {
    const band = gauss(u, 0.45, 0.08) + gauss(u, 0.72, 0.08)
    color = mixColor(color, multiplyColor(hexToRgb(config.accent), 0.92), clamp01(band * 0.4))
    alpha *= 0.95
    height += band * 0.04
  } else if (config.pattern === 'goldfish') {
    const warm = smoothstep(0.15, 0.85, u)
    const veins = gauss(u, 0.32, 0.05) + gauss(u, 0.58, 0.05)
    color = mixColor(color, [1, 0.78, 0.45], warm * 0.55)
    color = mixColor(color, [0.98, 0.56, 0.22], clamp01(veins * 0.22))
    alpha *= 0.9
    roughness = 0.78
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

  return { color, roughness, height, alpha }
}

const createAtlas = (config) => {
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

const writeFishAssets = async (config) => {
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

  const { body, fins } = createFishGeometries(config)
  const schoolGeometry = BufferGeometryUtils.mergeGeometries([body.clone(), fins.clone()])
  schoolGeometry.computeVertexNormals()

  const schoolMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    metalness: 0.03,
    roughness: 0.42,
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
    metalness: 0.03,
    roughness: 0.34
  })
  const heroFinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    alphaMap: textures.alphaMap,
    transparent: true,
    opacity: 0.96,
    alphaTest: 0.04,
    metalness: 0.02,
    roughness: 0.72,
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

const main = async () => {
  installExporterPolyfills()
  fs.mkdirSync(outputDir, { recursive: true })

  for (const config of fishConfigs) {
    await writeFishAssets(config)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
