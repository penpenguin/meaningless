import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outputDir = path.resolve('public/assets/aquarium')
const textureSize = 256

const crcTable = new Uint32Array(256)
for (let index = 0; index < 256; index++) {
  let value = index
  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }
  crcTable[index] = value >>> 0
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))
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

  fillRect(x, y, width, height) {
    const normalized = this.fillStyle.replace('#', '')
    const value = Number.parseInt(normalized, 16)
    const rgba = [
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
      255
    ]

    for (let yy = y; yy < y + height; yy++) {
      for (let xx = x; xx < x + width; xx++) {
        const index = ((yy * this.canvas.width) + xx) * 4
        this.pixels[index] = rgba[0]
        this.pixels[index + 1] = rgba[1]
        this.pixels[index + 2] = rgba[2]
        this.pixels[index + 3] = rgba[3]
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
  const texture = new THREE.DataTexture(pixels, textureSize, textureSize, THREE.RGBAFormat)
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

const createRockTextureSet = (palette, seed) => {
  const base = new Uint8Array(textureSize * textureSize * 4)
  const normal = new Uint8Array(textureSize * textureSize * 4)
  const roughness = new Uint8Array(textureSize * textureSize * 4)
  const primary = hexToRgb(palette[0])
  const secondary = hexToRgb(palette[1])
  const accent = hexToRgb(palette[2])

  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const nx = x / (textureSize - 1)
      const ny = y / (textureSize - 1)
      const index = ((y * textureSize) + x) * 4
      const noiseA = Math.sin((nx * 13.2) + seed * 2.3) * 0.5 + 0.5
      const noiseB = Math.cos((ny * 16.8) - seed * 1.7) * 0.5 + 0.5
      const noiseC = Math.sin((nx + ny) * 21.4 + seed * 0.6) * 0.5 + 0.5
      const stratum = clamp01((Math.sin((ny * 28) + seed * 3.1) * 0.5) + 0.5)
      const blend = clamp01(noiseA * 0.46 + noiseB * 0.28 + noiseC * 0.26)
      const accentBlend = clamp01(stratum * 0.55 + noiseC * 0.45)
      const color = [
        ((primary[0] * (1 - blend)) + (secondary[0] * blend)) * (0.9 + accentBlend * 0.08) + accent[0] * 0.08,
        ((primary[1] * (1 - blend)) + (secondary[1] * blend)) * (0.9 + accentBlend * 0.08) + accent[1] * 0.08,
        ((primary[2] * (1 - blend)) + (secondary[2] * blend)) * (0.9 + accentBlend * 0.08) + accent[2] * 0.08
      ]

      base[index] = Math.round(clamp01(color[0]) * 255)
      base[index + 1] = Math.round(clamp01(color[1]) * 255)
      base[index + 2] = Math.round(clamp01(color[2]) * 255)
      base[index + 3] = 255

      const normalX = 0.5 + Math.sin((nx * 19.4) + seed * 1.8) * 0.09 + Math.cos((ny * 11.8) - seed * 0.9) * 0.04
      const normalY = 0.5 + Math.cos((ny * 17.3) + seed * 1.4) * 0.08 + Math.sin((nx * 14.1) + seed * 0.7) * 0.05
      normal[index] = Math.round(clamp01(normalX) * 255)
      normal[index + 1] = Math.round(clamp01(normalY) * 255)
      normal[index + 2] = 255
      normal[index + 3] = 255

      const roughValue = clamp01(0.72 + stratum * 0.14 + noiseB * 0.08)
      const packed = Math.round(roughValue * 255)
      roughness[index] = packed
      roughness[index + 1] = packed
      roughness[index + 2] = packed
      roughness[index + 3] = 255
    }
  }

  return {
    map: makeTexture(base, 'srgb'),
    normalMap: makeTexture(normal, 'linear'),
    roughnessMap: makeTexture(roughness, 'linear')
  }
}

const createPolyhedronGeometry = (shape, radius, detail) => {
  if (shape === 'icosahedron') return new THREE.IcosahedronGeometry(radius, detail)
  if (shape === 'octahedron') return new THREE.OctahedronGeometry(radius, detail)
  return new THREE.DodecahedronGeometry(radius, detail)
}

const deformRockGeometry = (geometry, seed) => {
  const positionAttribute = geometry.getAttribute('position')
  const vertex = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const chipDirection = new THREE.Vector3(
    Math.sin(seed * 2.4) * 0.72,
    -0.82 + Math.cos(seed * 1.6) * 0.1,
    Math.cos(seed * 1.9) * 0.66
  ).normalize()
  const radius = geometry.boundingSphere?.radius ?? 1
  const shearX = Math.sin(seed * 1.7) * 0.2
  const shearZ = Math.cos(seed * 2.1) * 0.18

  for (let index = 0; index < positionAttribute.count; index++) {
    vertex.fromBufferAttribute(positionAttribute, index)
    normal.copy(vertex).normalize()

    const normalizedX = vertex.x / Math.max(radius, 0.001)
    const normalizedY = vertex.y / Math.max(radius, 0.001)
    const normalizedZ = vertex.z / Math.max(radius, 0.001)
    const ridgeNoise = (
      Math.sin(normalizedX * 5.2 + seed * 1.9) * 0.09
      + Math.cos(normalizedY * 6.4 - seed * 0.8) * 0.06
      + Math.sin(normalizedZ * 4.6 + seed * 2.2) * 0.05
    )
    const chip = Math.max(0, normal.dot(chipDirection) - 0.36) * 0.26
    const originalY = vertex.y

    vertex.multiplyScalar(1 + ridgeNoise - chip)
    vertex.x += originalY * shearX
    vertex.z += originalY * shearZ
    vertex.y = originalY < 0 ? vertex.y * 0.7 : vertex.y * 0.9
    if (originalY < radius * -0.22) {
      vertex.y -= radius * 0.05
    }

    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z)
  }

  positionAttribute.needsUpdate = true
  geometry.computeVertexNormals()
}

const createRockPiece = (piece, paletteSeed) => {
  const geometry = createPolyhedronGeometry(piece.geometry, piece.radius, piece.detail)
  geometry.computeBoundingSphere()
  deformRockGeometry(geometry, piece.seed)
  const textures = createRockTextureSet(piece.palette, paletteSeed)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    roughness: 0.88,
    metalness: 0.02
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(piece.position)
  mesh.rotation.copy(piece.rotation)
  mesh.scale.copy(piece.scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

const groundObject = (object) => {
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const centerX = (box.min.x + box.max.x) * 0.5
  const centerZ = (box.min.z + box.max.z) * 0.5
  object.position.x -= centerX
  object.position.y -= box.min.y
  object.position.z -= centerZ
  object.updateMatrixWorld(true)
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

const assetConfigs = [
  {
    id: 'rock-support-a',
    pieces: [
      {
        geometry: 'icosahedron',
        radius: 0.92,
        detail: 1,
        position: new THREE.Vector3(0, 0.62, 0),
        rotation: new THREE.Euler(0.08, 0.24, -0.06),
        scale: new THREE.Vector3(1.3, 0.72, 0.94),
        palette: ['#8d8375', '#aa9d8a', '#70675e'],
        seed: 1.2
      },
      {
        geometry: 'dodecahedron',
        radius: 0.48,
        detail: 1,
        position: new THREE.Vector3(0.58, 0.2, -0.18),
        rotation: new THREE.Euler(-0.04, 0.32, -0.12),
        scale: new THREE.Vector3(0.94, 0.56, 0.86),
        palette: ['#9a8f7d', '#b0a492', '#786f65'],
        seed: 1.8
      },
      {
        geometry: 'octahedron',
        radius: 0.28,
        detail: 1,
        position: new THREE.Vector3(-0.54, 0.14, 0.24),
        rotation: new THREE.Euler(0.1, -0.28, 0.08),
        scale: new THREE.Vector3(0.92, 0.48, 0.8),
        palette: ['#867c6f', '#9f9382', '#665f57'],
        seed: 2.4
      }
    ]
  },
  {
    id: 'rock-support-b',
    pieces: [
      {
        geometry: 'dodecahedron',
        radius: 0.84,
        detail: 1,
        position: new THREE.Vector3(0, 0.58, 0),
        rotation: new THREE.Euler(-0.08, -0.28, 0.1),
        scale: new THREE.Vector3(1.18, 0.7, 1.08),
        palette: ['#938877', '#aea18d', '#746b61'],
        seed: 3.2
      },
      {
        geometry: 'icosahedron',
        radius: 0.42,
        detail: 1,
        position: new THREE.Vector3(-0.56, 0.18, -0.16),
        rotation: new THREE.Euler(0.06, -0.3, 0.12),
        scale: new THREE.Vector3(0.94, 0.54, 0.84),
        palette: ['#857a6d', '#9a8c7a', '#645d55'],
        seed: 3.8
      },
      {
        geometry: 'octahedron',
        radius: 0.24,
        detail: 1,
        position: new THREE.Vector3(0.52, 0.12, 0.28),
        rotation: new THREE.Euler(0.12, 0.22, -0.08),
        scale: new THREE.Vector3(0.88, 0.46, 0.76),
        palette: ['#9f9482', '#b6aa98', '#7a7268'],
        seed: 4.4
      }
    ]
  },
  {
    id: 'rock-support-c',
    pieces: [
      {
        geometry: 'dodecahedron',
        radius: 0.76,
        detail: 1,
        position: new THREE.Vector3(0, 0.5, 0),
        rotation: new THREE.Euler(0.04, -0.22, 0.06),
        scale: new THREE.Vector3(1.14, 0.64, 1.18),
        palette: ['#918676', '#ab9f8c', '#72695e'],
        seed: 5.2
      },
      {
        geometry: 'icosahedron',
        radius: 0.32,
        detail: 1,
        position: new THREE.Vector3(0.4, 0.16, -0.12),
        rotation: new THREE.Euler(-0.06, 0.24, -0.08),
        scale: new THREE.Vector3(0.98, 0.52, 0.82),
        palette: ['#857c70', '#9b8f7d', '#666058'],
        seed: 5.9
      },
      {
        geometry: 'octahedron',
        radius: 0.2,
        detail: 1,
        position: new THREE.Vector3(-0.32, 0.12, 0.2),
        rotation: new THREE.Euler(0.1, -0.26, 0.08),
        scale: new THREE.Vector3(0.9, 0.46, 0.78),
        palette: ['#9d9383', '#b5a997', '#776e65'],
        seed: 6.5
      }
    ]
  },
  {
    id: 'rock-pebble-cluster',
    pieces: [
      {
        geometry: 'dodecahedron',
        radius: 0.28,
        detail: 1,
        position: new THREE.Vector3(0, 0.18, 0),
        rotation: new THREE.Euler(0.12, -0.18, 0.08),
        scale: new THREE.Vector3(1.16, 0.58, 0.9),
        palette: ['#8b8171', '#a19787', '#70675c'],
        seed: 7.2
      },
      {
        geometry: 'icosahedron',
        radius: 0.18,
        detail: 1,
        position: new THREE.Vector3(0.26, 0.08, -0.08),
        rotation: new THREE.Euler(-0.08, 0.28, -0.12),
        scale: new THREE.Vector3(0.92, 0.5, 0.82),
        palette: ['#978c7c', '#b0a492', '#7b7266'],
        seed: 7.8
      },
      {
        geometry: 'octahedron',
        radius: 0.14,
        detail: 1,
        position: new THREE.Vector3(-0.24, 0.06, 0.12),
        rotation: new THREE.Euler(0.06, -0.24, 0.06),
        scale: new THREE.Vector3(0.84, 0.44, 0.76),
        palette: ['#7f7668', '#988d7c', '#635d56'],
        seed: 8.4
      },
      {
        geometry: 'dodecahedron',
        radius: 0.12,
        detail: 1,
        position: new THREE.Vector3(0.08, 0.04, 0.18),
        rotation: new THREE.Euler(0.04, 0.18, -0.04),
        scale: new THREE.Vector3(0.76, 0.38, 0.68),
        palette: ['#938877', '#a99d8b', '#746b60'],
        seed: 8.9
      }
    ]
  }
]

const main = async () => {
  installExporterPolyfills()
  fs.mkdirSync(outputDir, { recursive: true })

  for (const config of assetConfigs) {
    const group = new THREE.Group()
    config.pieces.forEach((piece, index) => {
      group.add(createRockPiece(piece, piece.seed + index * 0.3))
    })
    groundObject(group)

    const buffer = await exportGlb(group)
    fs.writeFileSync(path.join(outputDir, `${config.id}.glb`), buffer)
    console.log(`wrote ${config.id}.glb`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
