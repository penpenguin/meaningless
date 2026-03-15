import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const outputDir = path.resolve('public/assets/aquarium')

const leafSize = 1024
const rockSize = 1024
const backdropSize = 2048

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
const fract = (value) => value - Math.floor(value)
const toByte = (value) => Math.round(clamp01(value) * 255)

const mixColor = (left, right, t) => [
  lerp(left[0], right[0], t),
  lerp(left[1], right[1], t),
  lerp(left[2], right[2], t)
]

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
    buildChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    buildChunk('IEND', Buffer.alloc(0))
  ])
}

const writePng = (filename, width, height, rgba) => {
  fs.writeFileSync(path.join(outputDir, filename), encodePng(width, height, rgba))
}

const setPixel = (rgba, index, color, alpha = 1) => {
  rgba[index] = toByte(color[0])
  rgba[index + 1] = toByte(color[1])
  rgba[index + 2] = toByte(color[2])
  rgba[index + 3] = toByte(alpha)
}

const sampleNoise = (x, y, seed, period = 0) => {
  const wrap = (value) => {
    if (period <= 0) return value
    return ((value % period) + period) % period
  }

  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0

  const hash = (ix, iy) => fract(Math.sin(
    (wrap(ix) * 127.1)
      + (wrap(iy) * 311.7)
      + (seed * 74.7)
  ) * 43758.5453123)

  const fx = tx * tx * (3 - (2 * tx))
  const fy = ty * ty * (3 - (2 * ty))

  const top = lerp(hash(x0, y0), hash(x0 + 1, y0), fx)
  const bottom = lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), fx)
  return lerp(top, bottom, fy)
}

const sampleFbm = (
  x,
  y,
  seed,
  {
    octaves = 5,
    lacunarity = 2,
    gain = 0.5,
    period = 0
  } = {}
) => {
  let amplitude = 0.5
  let frequency = 1
  let sum = 0
  let weight = 0

  for (let octave = 0; octave < octaves; octave++) {
    const currentPeriod = period > 0 ? period * frequency : 0
    sum += sampleNoise(x * frequency, y * frequency, seed + (octave * 17), currentPeriod) * amplitude
    weight += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }

  return weight > 0 ? sum / weight : 0
}

const buildNormalMap = (width, height, heightField, strength, wrap = false) => {
  const rgba = new Uint8Array(width * height * 4)
  const sample = (x, y) => {
    if (wrap) {
      const wrappedX = ((x % width) + width) % width
      const wrappedY = ((y % height) + height) % height
      return heightField[(wrappedY * width) + wrappedX]
    }
    const clampedX = Math.max(0, Math.min(width - 1, x))
    const clampedY = Math.max(0, Math.min(height - 1, y))
    return heightField[(clampedY * width) + clampedX]
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width) + x
      const rgbaIndex = index * 4
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength
      const nx = -dx
      const ny = -dy
      const nz = 1
      const length = Math.hypot(nx, ny, nz) || 1
      setPixel(rgba, rgbaIndex, [
        ((nx / length) * 0.5) + 0.5,
        ((ny / length) * 0.5) + 0.5,
        ((nz / length) * 0.5) + 0.5
      ], 1)
    }
  }

  return rgba
}

const createLeafTextures = () => {
  const width = leafSize
  const height = leafSize
  const diffuse = new Uint8Array(width * height * 4)
  const alpha = new Uint8Array(width * height * 4)
  const roughness = new Uint8Array(width * height * 4)
  const heightField = new Float32Array(width * height)

  const deepGreen = [0.08, 0.2, 0.13]
  const midGreen = [0.2, 0.42, 0.24]
  const lightGreen = [0.78, 0.86, 0.5]
  const warmBloom = [0.96, 0.92, 0.58]

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    const baseWidth = 0.04 + (0.34 * Math.pow(Math.sin(Math.PI * v), 0.78))
    const centerOffset = (
      (Math.sin((v - 0.08) * Math.PI * 1.1) * 0.05)
      + (Math.sin((v + 0.12) * Math.PI * 3.1) * 0.025 * (1 - v))
    )

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1)
      const nx = (u * 2) - 1
      const noiseBand = sampleFbm(u * 6, v * 12, 11, { octaves: 3, lacunarity: 2.1, gain: 0.54 })
      const edgeNoise = (noiseBand - 0.5) * 0.08
      const halfWidth = baseWidth * (0.92 + (0.18 * sampleFbm(u * 3, v * 6, 13, { octaves: 2 }))) + edgeNoise
      const signedDistance = halfWidth - Math.abs(nx - centerOffset)

      let mask = smoothstep(-0.02, 0.014, signedDistance)
      mask *= smoothstep(0.0, 0.055, v)
      mask *= 1 - smoothstep(0.945, 1, v)

      const index = (y * width) + x
      const rgbaIndex = index * 4

      if (mask < 0.0005) {
        setPixel(diffuse, rgbaIndex, [0, 0, 0], 0)
        setPixel(alpha, rgbaIndex, [0, 0, 0], 0)
        setPixel(roughness, rgbaIndex, [1, 1, 1], 1)
        heightField[index] = 0
        continue
      }

      const midrib = gauss(nx - centerOffset, 0, 0.015)
      let lateralVeins = 0
      for (let veinIndex = 0; veinIndex < 6; veinIndex++) {
        const anchor = 0.15 + (veinIndex * 0.12)
        const influence = gauss(v, anchor, 0.05)
        const slope = 0.22 + (veinIndex * 0.03)
        lateralVeins += gauss((nx - centerOffset) + (slope * (v - anchor)), 0, 0.01) * influence
        lateralVeins += gauss((nx - centerOffset) - (slope * (v - anchor)), 0, 0.01) * influence
      }

      const tissue = sampleFbm(u * 22, v * 28, 17, { octaves: 4, lacunarity: 2.15, gain: 0.55 })
      const microSpots = sampleFbm(u * 70, v * 96, 19, { octaves: 2, lacunarity: 2.5, gain: 0.42 })
      const warmPatch = gauss(u, 0.32, 0.18) * gauss(v, 0.24, 0.16)
      const rimShade = smoothstep(0.12, 0.94, Math.abs(nx - centerOffset) / Math.max(0.001, halfWidth))

      const leafHeight = clamp01(
        (midrib * 0.42)
          + (lateralVeins * 0.22)
          + (tissue * 0.18)
          + (microSpots * 0.04)
      ) * mask
      heightField[index] = leafHeight

      const baseTone = mixColor(deepGreen, midGreen, clamp01(0.36 + (0.18 * (1 - v)) + (0.24 * tissue)))
      let color = mixColor(baseTone, lightGreen, clamp01((midrib * 0.32) + (lateralVeins * 0.12) + (warmPatch * 0.42)))
      color = mixColor(color, warmBloom, clamp01((warmPatch * 0.42) + ((1 - v) * 0.08)))
      color = color.map((channel) => channel * (0.72 + (0.28 * (1 - rimShade))))

      const edgeWear = sampleFbm(u * 120, v * 110, 23, { octaves: 2, lacunarity: 2.7, gain: 0.42 })
      const pinhole = edgeWear > 0.82 && rimShade > 0.6 ? (edgeWear - 0.82) * 3 : 0
      const alphaValue = clamp01(mask * (0.94 - (0.16 * rimShade) - pinhole))
      const roughnessValue = clamp01(
        0.58
          + (0.22 * tissue)
          + (0.08 * rimShade)
          - (0.22 * midrib)
          - (0.12 * lateralVeins)
      )

      setPixel(diffuse, rgbaIndex, color, alphaValue)
      setPixel(alpha, rgbaIndex, [alphaValue, alphaValue, alphaValue], alphaValue)
      setPixel(roughness, rgbaIndex, [roughnessValue, roughnessValue, roughnessValue], 1)
    }
  }

  const normal = buildNormalMap(width, height, heightField, 7.4, false)

  return { diffuse, alpha, normal, roughness }
}

const createRockTextures = () => {
  const width = rockSize
  const height = rockSize
  const diffuse = new Uint8Array(width * height * 4)
  const roughness = new Uint8Array(width * height * 4)
  const heightField = new Float32Array(width * height)

  const shadowStone = [0.19, 0.17, 0.15]
  const midStone = [0.42, 0.38, 0.33]
  const lightStone = [0.82, 0.76, 0.67]
  const warmSediment = [0.7, 0.61, 0.5]
  const coolMineral = [0.54, 0.56, 0.58]

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1)
      const index = (y * width) + x
      const rgbaIndex = index * 4

      const broad = sampleFbm(u * 5.5, v * 5.5, 31, { octaves: 5, lacunarity: 2.05, gain: 0.52, period: 6 })
      const grain = sampleFbm(u * 18, v * 18, 37, { octaves: 3, lacunarity: 2.3, gain: 0.45, period: 18 })
      const weathering = sampleFbm(u * 2.6, v * 3.2, 41, { octaves: 4, lacunarity: 2, gain: 0.58, period: 4 })
      const ridge = 1 - Math.abs((sampleFbm(u * 7.4, v * 4.2, 43, { octaves: 4, lacunarity: 2.2, gain: 0.5, period: 8 }) * 2) - 1)
      const fractureA = 1 - smoothstep(0.0, 0.12, Math.abs(Math.sin(((u * 6.4) + (v * 2.1) + (weathering * 0.8)) * Math.PI)))
      const fractureB = 1 - smoothstep(0.0, 0.1, Math.abs(Math.sin(((u * -3.6) + (v * 7.2) + (broad * 0.65)) * Math.PI)))
      const fractureC = 1 - smoothstep(0.0, 0.11, Math.abs(Math.sin(((u * 4.3) - (v * 5.4) + (grain * 0.45)) * Math.PI)))
      const fractures = clamp01((fractureA * 0.42) + (fractureB * 0.34) + (fractureC * 0.24))

      const geology = clamp01((broad * 0.48) + (ridge * 0.26) + (grain * 0.18) - (fractures * 0.2))
      heightField[index] = geology

      let color = mixColor(shadowStone, midStone, clamp01((geology * 0.95) + (weathering * 0.08)))
      color = mixColor(color, lightStone, clamp01((ridge * 0.32) + (broad * 0.24)))
      color = mixColor(color, warmSediment, clamp01(weathering * 0.22))
      color = mixColor(color, coolMineral, clamp01((grain * 0.12) + (fractures * 0.08)))
      color = color.map((channel) => channel * (0.78 + (0.22 * (1 - (fractures * 0.7)))))

      const roughnessValue = clamp01(
        0.7
          + (0.18 * grain)
          + (0.1 * fractures)
          - (0.24 * ridge)
          - (0.08 * geology)
      )

      setPixel(diffuse, rgbaIndex, color, 1)
      setPixel(roughness, rgbaIndex, [roughnessValue, roughnessValue, roughnessValue], 1)
    }
  }

  const normal = buildNormalMap(width, height, heightField, 8.5, true)

  return { diffuse, normal, roughness }
}

const addColor = (base, added, weight) => [
  clamp01(base[0] + (added[0] * weight)),
  clamp01(base[1] + (added[1] * weight)),
  clamp01(base[2] + (added[2] * weight))
]

const createBackdropTexture = () => {
  const width = backdropSize
  const height = backdropSize
  const rgba = new Uint8Array(width * height * 4)

  const topGlow = [0.78, 0.95, 0.98]
  const shallowWater = [0.16, 0.52, 0.6]
  const deepWater = [0.02, 0.09, 0.13]
  const silhouetteTint = [0.08, 0.22, 0.27]
  const bandTint = [0.62, 0.92, 0.95]

  const masses = [
    { peakY: 0.1, baseX: 0.18, baseWidth: 0.21, lean: 0.08, spreadPower: 0.72, seed: 71, strength: 0.32 },
    { peakY: 0.08, baseX: 0.48, baseWidth: 0.18, lean: -0.03, spreadPower: 0.64, seed: 73, strength: 0.28 },
    { peakY: 0.12, baseX: 0.76, baseWidth: 0.14, lean: 0.04, spreadPower: 0.78, seed: 79, strength: 0.22 }
  ]

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1)
      const index = (y * width) + x
      const rgbaIndex = index * 4

      let color = mixColor(topGlow, shallowWater, smoothstep(0.0, 0.34, v))
      color = mixColor(color, deepWater, smoothstep(0.22, 1, v))

      const mistCore = gauss(u, 0.52, 0.23) * gauss(v, 0.2, 0.14)
      const mistNoise = sampleFbm(u * 5.4, v * 7.8, 83, { octaves: 4, lacunarity: 2.05, gain: 0.56 })
      const mist = clamp01(mistCore * (0.66 + (mistNoise * 0.36)))

      const shimmerBand = smoothstep(0.26, 0.54, v) * (1 - smoothstep(0.58, 0.78, v))
      const shimmerNoise = sampleFbm(u * 4.2, v * 5.1, 89, { octaves: 3, lacunarity: 2.1, gain: 0.48 })
      const luminousBand = shimmerBand * (0.08 + (0.16 * shimmerNoise))

      let silhouette = 0
      for (const mass of masses) {
        const drift = sampleFbm((u * 9) + mass.seed, (v * 9) + mass.seed, mass.seed, { octaves: 2, lacunarity: 2.2, gain: 0.42 })
        const localPeak = mass.peakY + ((drift - 0.5) * 0.045)
        const growth = smoothstep(localPeak, 1, v)
        const center = mass.baseX + (mass.lean * growth)
        const halfWidth = mass.baseWidth * Math.pow(growth, mass.spreadPower) * (0.84 + (0.28 * drift))
        const inside = halfWidth - Math.abs(u - center)
        silhouette += smoothstep(-0.012, 0.018, inside) * mass.strength
      }
      silhouette = clamp01(silhouette)

      const waterNoise = sampleFbm(u * 10.5, v * 12.3, 97, { octaves: 3, lacunarity: 2.2, gain: 0.46 })
      color = mixColor(color, topGlow, clamp01((mist * 0.58) + (luminousBand * 0.44)))
      color = addColor(color, bandTint, luminousBand)
      color = addColor(color, silhouetteTint, silhouette * 0.38)
      color = color.map((channel) => clamp01(channel * (0.92 + (waterNoise * 0.16))))

      const alpha = clamp01(
        0.02
          + (mist * 0.6)
          + (luminousBand * 0.48)
          + (silhouette * 0.3)
      )

      setPixel(rgba, rgbaIndex, color, alpha)
    }
  }

  return rgba
}

const run = () => {
  fs.mkdirSync(outputDir, { recursive: true })

  const leaf = createLeafTextures()
  writePng('leaf-diffuse.png', leafSize, leafSize, leaf.diffuse)
  writePng('leaf-alpha.png', leafSize, leafSize, leaf.alpha)
  writePng('leaf-normal.png', leafSize, leafSize, leaf.normal)
  writePng('leaf-roughness.png', leafSize, leafSize, leaf.roughness)

  const rock = createRockTextures()
  writePng('rock-diffuse.png', rockSize, rockSize, rock.diffuse)
  writePng('rock-normal.png', rockSize, rockSize, rock.normal)
  writePng('rock-roughness.png', rockSize, rockSize, rock.roughness)

  const backdrop = createBackdropTexture()
  writePng('backdrop-depth.png', backdropSize, backdropSize, backdrop)

  console.log('Generated shared aquarium PNG textures:', [
    'leaf-diffuse.png',
    'leaf-alpha.png',
    'leaf-normal.png',
    'leaf-roughness.png',
    'rock-diffuse.png',
    'rock-normal.png',
    'rock-roughness.png',
    'backdrop-depth.png'
  ].join(', '))
}

run()
