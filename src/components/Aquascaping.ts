import * as THREE from 'three'
import type { LoadedModelAsset, VisualAssetBundle } from '../assets/visualAssets'
import type { AquascapeLayoutStyle, Theme } from '../types/aquarium'

type PlantLayer = 'foreground' | 'background' | 'midground'
type PlantType = 'ribbon-seaweed' | 'sword-leaf' | 'fan-leaf'

type PlantClusterDefinition = {
  x: number
  z: number
  layer: PlantLayer
  plantType: PlantType
  baseHeight: number
  spreadX: number
  spreadZ: number
  hueBase: number
}

type AquascapingOptions = {
  layoutStyle?: AquascapeLayoutStyle
}

type DriftwoodTubeDefinition = {
  radius: number
  points: THREE.Vector3[]
  tubularSegments: number
  radialSegments: number
  ellipseAspect: number
  tipScale: number
  flare: number
  twist: number
  barkAmplitude: number
}

type RockClusterShape = 'icosahedron' | 'octahedron' | 'dodecahedron'

type RockClusterPieceDefinition = {
  geometry: RockClusterShape
  radius: number
  detail: number
  offset: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  color: string
  seed: number
  role: 'support-rock-piece' | 'support-rock-chip' | 'support-rock-pebble'
}

export type SubstrateHardscapeAnchor = {
  id: string
  x: number
  z: number
  radiusX: number
  radiusZ: number
  sinkDepth: number
  rimHeight: number
  rimBiasX: number
  rimBiasZ: number
}

export type SubstratePlantAnchor = {
  id: string
  x: number
  z: number
  layer: 'foreground' | 'background' | 'midground'
  radiusX: number
  radiusZ: number
  moundHeight: number
  scoopDepth: number
  scoopBiasX: number
  scoopBiasZ: number
}

export const plantClusterDefinitions: PlantClusterDefinition[] = [
  { x: -0.34, z: 0.18, layer: 'foreground', plantType: 'ribbon-seaweed', baseHeight: 2.6, spreadX: 0.9, spreadZ: 0.65, hueBase: 0.3 },
  { x: -0.08, z: -0.2, layer: 'background', plantType: 'sword-leaf', baseHeight: 4, spreadX: 0.65, spreadZ: 0.55, hueBase: 0.36 },
  { x: 0.18, z: 0.06, layer: 'midground', plantType: 'fan-leaf', baseHeight: 2.8, spreadX: 0.75, spreadZ: 0.55, hueBase: 0.29 },
  { x: 0.36, z: -0.16, layer: 'background', plantType: 'ribbon-seaweed', baseHeight: 4.6, spreadX: 0.7, spreadZ: 0.5, hueBase: 0.42 },
  { x: 0.04, z: 0.24, layer: 'foreground', plantType: 'sword-leaf', baseHeight: 2.5, spreadX: 0.82, spreadZ: 0.7, hueBase: 0.34 },
  { x: -0.24, z: 0.02, layer: 'midground', plantType: 'fan-leaf', baseHeight: 3.1, spreadX: 0.72, spreadZ: 0.58, hueBase: 0.27 }
]

export const substrateHardscapeAnchors: SubstrateHardscapeAnchor[] = [
  {
    id: 'driftwood-root-flare',
    x: -0.018,
    z: -0.052,
    radiusX: 0.065,
    radiusZ: 0.06,
    sinkDepth: 0.09,
    rimHeight: 0.042,
    rimBiasX: -0.018,
    rimBiasZ: 0.03
  },
  {
    id: 'ridge-rock-front',
    x: 0.04,
    z: 0.012,
    radiusX: 0.052,
    radiusZ: 0.048,
    sinkDepth: 0.074,
    rimHeight: 0.052,
    rimBiasX: -0.008,
    rimBiasZ: 0.03
  },
  {
    id: 'ridge-rock-hero',
    x: 0.136,
    z: -0.032,
    radiusX: 0.086,
    radiusZ: 0.068,
    sinkDepth: 0.074,
    rimHeight: 0.044,
    rimBiasX: 0.016,
    rimBiasZ: 0.022
  },
  {
    id: 'ridge-rock-tail',
    x: 0.212,
    z: -0.078,
    radiusX: 0.07,
    radiusZ: 0.06,
    sinkDepth: 0.058,
    rimHeight: 0.034,
    rimBiasX: 0.022,
    rimBiasZ: 0.012
  }
]

export const substratePlantAnchors: SubstratePlantAnchor[] = plantClusterDefinitions.map((cluster, index) => ({
  id: `plant-cluster-${index + 1}`,
  x: cluster.x,
  z: cluster.z,
  layer: cluster.layer,
  radiusX: cluster.layer === 'background' ? 0.045 : 0.058,
  radiusZ: cluster.layer === 'background' ? 0.045 : 0.052,
  moundHeight: cluster.layer === 'background' ? 0.016 : 0.024,
  scoopDepth: cluster.layer === 'background' ? 0.009 : 0.016,
  scoopBiasX: cluster.plantType === 'fan-leaf' ? -0.012 : 0.012,
  scoopBiasZ: cluster.layer === 'foreground' ? 0.02 : 0.012
}))

export class AquascapingSystem {
  private group: THREE.Group
  private plants: THREE.Group[] = []
  private decorations: THREE.Group[] = []
  private time = 0
  private visualAssets: VisualAssetBundle | null
  private layoutStyle: AquascapeLayoutStyle
  
  constructor(
    scene: THREE.Scene,
    bounds: THREE.Box3,
    visualAssets: VisualAssetBundle | null = null,
    themeOrOptions: Theme | AquascapingOptions = { layoutStyle: 'planted' }
  ) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    this.layoutStyle = themeOrOptions.layoutStyle ?? 'planted'
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    if (this.layoutStyle === 'marine') {
      this.createCorals(bounds)
    } else {
      this.createFreshwaterAccents(bounds)
    }
    this.createRocks(bounds)
    this.createHeroDriftwood(bounds)
    this.createHeroRockRidge(bounds)
    this.createHeroCanopy(bounds)
    this.createDriftwoodBurialDetails(bounds)
    this.createHardscapeTransitionDetails(bounds)
    this.createHardscapeShadow(bounds)
    this.createSandDetails(bounds)
  }
  
  private createSeaweed(bounds: THREE.Box3): void {
    const seaweedCount = 18
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < seaweedCount; i++) {
      const seaweedGroup = new THREE.Group()
      const cluster = plantClusterDefinitions[i % plantClusterDefinitions.length]
      
      const x = THREE.MathUtils.clamp(
        cluster.x * size.x + (Math.random() - 0.5) * cluster.spreadX,
        bounds.min.x + 0.45,
        bounds.max.x - 0.45
      )
      const z = THREE.MathUtils.clamp(
        cluster.z * size.z + (Math.random() - 0.5) * cluster.spreadZ,
        bounds.min.z + 0.35,
        bounds.max.z - 0.35
      )
      const y = bounds.min.y + 0.42  // 砂層の高さに合わせる
      
      seaweedGroup.position.set(x, y, z)
      seaweedGroup.userData = {
        layer: cluster.layer,
        plantType: cluster.plantType
      }
      
      const height = cluster.baseHeight + Math.random() * (cluster.layer === 'background' ? 1.4 : 1.1)
      const hue = cluster.hueBase + Math.random() * 0.06

      this.populatePlantCluster(seaweedGroup, cluster, height, hue)

      if (cluster.plantType === 'ribbon-seaweed' && cluster.layer === 'background') {
        seaweedGroup.scale.set(0.82, 1.08, 0.82)
      } else if (cluster.plantType === 'ribbon-seaweed' && cluster.layer === 'foreground') {
        seaweedGroup.scale.set(1.08, 0.94, 1.08)
      } else if (cluster.plantType === 'sword-leaf') {
        seaweedGroup.scale.set(
          cluster.layer === 'foreground' ? 1.04 : 0.9,
          cluster.layer === 'background' ? 1.1 : 0.96,
          cluster.layer === 'foreground' ? 1.04 : 0.92
        )
      } else {
        seaweedGroup.scale.set(
          cluster.layer === 'foreground' ? 1.12 : 0.94,
          cluster.layer === 'background' ? 1.04 : 0.92,
          cluster.layer === 'foreground' ? 1.12 : 0.94
        )
      }
      seaweedGroup.rotation.y = (Math.random() - 0.5) * 0.45
      
      this.plants.push(seaweedGroup)
      this.group.add(seaweedGroup)
    }
  }

  private createFreshwaterAccents(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    const substrateY = bounds.min.y + 0.42

    const accentDefinitions = [
      {
        accentType: 'crypt-clump',
        plantType: 'sword-leaf' as const,
        layer: 'foreground' as const,
        position: new THREE.Vector3(center.x - size.x * 0.17, substrateY, center.z + size.z * 0.2),
        rotationY: -0.18,
        scale: new THREE.Vector3(0.66, 0.72, 0.66),
        height: 1.35,
        hue: 0.23,
        tint: '#5c6841',
        blend: 0.34
      },
      {
        accentType: 'foreground-tuft',
        plantType: 'fan-leaf' as const,
        layer: 'foreground' as const,
        position: new THREE.Vector3(center.x + size.x * 0.12, substrateY, center.z + size.z * 0.24),
        rotationY: 0.16,
        scale: new THREE.Vector3(0.52, 0.56, 0.52),
        height: 0.92,
        hue: 0.28,
        tint: '#53653a',
        blend: 0.32
      },
      {
        accentType: 'background-stem-group',
        plantType: 'ribbon-seaweed' as const,
        layer: 'background' as const,
        position: new THREE.Vector3(center.x + size.x * 0.27, substrateY, center.z - size.z * 0.22),
        rotationY: 0.1,
        scale: new THREE.Vector3(0.58, 0.84, 0.58),
        height: 2.35,
        hue: 0.27,
        tint: '#677242',
        blend: 0.38
      },
      {
        accentType: 'background-stem-group',
        plantType: 'ribbon-seaweed' as const,
        layer: 'background' as const,
        position: new THREE.Vector3(center.x - size.x * 0.3, substrateY, center.z - size.z * 0.16),
        rotationY: -0.24,
        scale: new THREE.Vector3(0.54, 0.8, 0.54),
        height: 2.1,
        hue: 0.21,
        tint: '#6e6244',
        blend: 0.42
      }
    ]

    accentDefinitions.forEach((definition) => {
      const accentGroup = new THREE.Group()
      accentGroup.position.copy(definition.position)
      accentGroup.rotation.y = definition.rotationY
      accentGroup.scale.copy(definition.scale)
      accentGroup.userData = {
        role: 'freshwater-accent',
        accentType: definition.accentType,
        layer: definition.layer,
        plantType: definition.plantType
      }

      if (definition.plantType === 'sword-leaf') {
        this.createSwordLeafPlant(accentGroup, definition.layer, definition.height, definition.hue)
      } else if (definition.plantType === 'fan-leaf') {
        this.createFanLeafPlant(accentGroup, definition.layer, definition.height, definition.hue)
      } else {
        this.createRibbonSeaweed(accentGroup, definition.layer, definition.height, definition.hue)
      }

      this.toneAccentGroup(accentGroup, definition.tint, definition.blend)
      this.plants.push(accentGroup)
      this.decorations.push(accentGroup)
      this.group.add(accentGroup)
    })

    ;[
      {
        position: new THREE.Vector3(center.x - size.x * 0.05, bounds.min.y + 1.58, center.z - size.z * 0.08),
        rotationY: -0.32,
        scale: new THREE.Vector3(0.66, 0.66, 0.66),
        hue: 0.22,
        tint: '#596543',
        blend: 0.3
      },
      {
        position: new THREE.Vector3(center.x + size.x * 0.08, bounds.min.y + 1.34, center.z - size.z * 0.16),
        rotationY: 0.24,
        scale: new THREE.Vector3(0.58, 0.58, 0.58),
        hue: 0.19,
        tint: '#665940',
        blend: 0.36
      }
    ].forEach((definition) => {
      const epiphyteCluster = this.createEpiphyteCluster(definition.hue)
      epiphyteCluster.position.copy(definition.position)
      epiphyteCluster.rotation.y = definition.rotationY
      epiphyteCluster.scale.copy(definition.scale)
      epiphyteCluster.userData = {
        role: 'freshwater-accent',
        accentType: 'epiphyte',
        layer: 'midground',
        plantType: 'fan-leaf'
      }

      this.toneAccentGroup(epiphyteCluster, definition.tint, definition.blend)
      this.plants.push(epiphyteCluster)
      this.decorations.push(epiphyteCluster)
      this.group.add(epiphyteCluster)
    })
  }

  private toneAccentGroup(group: THREE.Group, tintHex: string, blend: number): void {
    const tint = new THREE.Color(tintHex)

    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]

      materials.forEach((material) => {
        const stylableMaterial = material as THREE.MeshPhysicalMaterial & { clearcoat?: number; roughness?: number }
        if ('color' in stylableMaterial && stylableMaterial.color instanceof THREE.Color) {
          stylableMaterial.color.lerp(tint, blend)
        }
        if (typeof stylableMaterial.roughness === 'number') {
          stylableMaterial.roughness = Math.min(1, stylableMaterial.roughness + 0.08)
        }
        if (typeof stylableMaterial.clearcoat === 'number') {
          stylableMaterial.clearcoat = Math.max(0, stylableMaterial.clearcoat - 0.03)
        }
      })
    })
  }

  private populatePlantCluster(
    seaweedGroup: THREE.Group,
    cluster: PlantClusterDefinition,
    height: number,
    hue: number
  ): void {
    switch (cluster.plantType) {
      case 'ribbon-seaweed':
        this.createRibbonSeaweed(seaweedGroup, cluster.layer, height, hue)
        return
      case 'sword-leaf':
        this.createSwordLeafPlant(seaweedGroup, cluster.layer, height, hue)
        return
      case 'fan-leaf':
        this.createFanLeafPlant(seaweedGroup, cluster.layer, height, hue)
        return
    }
  }

  private createRibbonSeaweed(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number
  ): void {
    const frondCount = layer === 'background' ? 4 : layer === 'midground' ? 5 : 6
    const material = this.createSeaweedMaterial(hue, layer)

    for (let j = 0; j < frondCount; j++) {
      const frondHeight = height * (0.72 + Math.random() * 0.28)
      const frondWidth = 0.16 + frondHeight * 0.08 + Math.random() * 0.06
      const bend = (Math.random() - 0.5) * 0.2 + (j - (frondCount - 1) / 2) * 0.04
      const geometry = this.createSeaweedFrondGeometry(frondWidth, frondHeight, bend)
      const frond = new THREE.Mesh(geometry, material)
      const spread = j - (frondCount - 1) / 2
      
      frond.position.set(
        spread * 0.08 + (Math.random() - 0.5) * 0.05,
        frondHeight / 2,
        (Math.random() - 0.5) * 0.08
      )
      frond.rotation.y = spread * 0.22 + (Math.random() - 0.5) * 0.35
      frond.rotation.z = -0.12 + spread * 0.05 + (Math.random() - 0.5) * 0.12
      frond.rotation.x = (Math.random() - 0.5) * 0.08
      frond.castShadow = true
      frond.receiveShadow = true
      frond.userData = {
        role: 'frond',
        originalRotation: frond.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.05 + Math.random() * 0.05
      }
      
      seaweedGroup.add(frond)
    }
  }

  private createSwordLeafPlant(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number
  ): void {
    const leafCount = layer === 'background' ? 5 : 6
    const material = this.createLeafMaterial(hue, layer, 'sword-leaf')

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = height * (0.78 + Math.random() * 0.22)
      const leafWidth = 0.24 + Math.random() * 0.08
      const bend = (Math.random() - 0.5) * 0.14 + (j - (leafCount - 1) / 2) * 0.035
      const geometry = this.createSwordLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2

      leaf.position.set(
        spread * 0.07 + (Math.random() - 0.5) * 0.04,
        0,
        (Math.random() - 0.5) * 0.07
      )
      leaf.rotation.y = spread * 0.28 + (Math.random() - 0.5) * 0.24
      leaf.rotation.z = -0.06 + spread * 0.035 + (Math.random() - 0.5) * 0.08
      leaf.rotation.x = (Math.random() - 0.5) * 0.05
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.04 + Math.random() * 0.03
      }

      seaweedGroup.add(leaf)
    }
  }

  private createFanLeafPlant(
    seaweedGroup: THREE.Group,
    layer: PlantLayer,
    height: number,
    hue: number
  ): void {
    const leafCount = layer === 'background' ? 4 : 5
    const material = this.createLeafMaterial(hue, layer, 'fan-leaf')

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = height * (0.48 + Math.random() * 0.16)
      const leafWidth = 0.52 + Math.random() * 0.18
      const bend = (Math.random() - 0.5) * 0.18 + (j - (leafCount - 1) / 2) * 0.06
      const geometry = this.createFanLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2

      leaf.position.set(
        spread * 0.05 + (Math.random() - 0.5) * 0.03,
        0,
        spread * 0.03 + (Math.random() - 0.5) * 0.05
      )
      leaf.rotation.y = spread * 0.34 + (Math.random() - 0.5) * 0.28
      leaf.rotation.z = -0.18 + (Math.random() - 0.5) * 0.12
      leaf.rotation.x = spread * 0.05 + (Math.random() - 0.5) * 0.04
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.025 + Math.random() * 0.025
      }

      seaweedGroup.add(leaf)
    }
  }

  private createSeaweedFrondGeometry(width: number, height: number, bend: number): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(width, height, 5, 12)
    const positionAttribute = geometry.getAttribute('position')
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = (y + height / 2) / height
      const taper = THREE.MathUtils.lerp(1, 0.18, progress)
      const curvedX = Math.sin(progress * Math.PI * 0.9) * bend * height
      const depth = Math.sin(progress * Math.PI) * width * 0.08
      const droop = progress * progress * height * 0.08
      
      positionAttribute.setX(i, x * taper + curvedX)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth)
    }
    
    geometry.computeVertexNormals()
    
    return geometry
  }

  private createSwordLeafGeometry(width: number, height: number, bend: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(-width * 0.16, height * 0.16, -width * 0.3, height * 0.5, 0, height)
    shape.bezierCurveTo(width * 0.3, height * 0.5, width * 0.16, height * 0.16, 0, 0)

    const geometry = new THREE.ShapeGeometry(shape, 10)
    const positionAttribute = geometry.getAttribute('position')

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = y / height
      const side = x === 0 ? 0 : Math.sign(x)
      const curl = Math.sin(progress * Math.PI * 0.85) * bend * height
      const depth = Math.sin(progress * Math.PI) * width * 0.14
      const droop = progress * progress * height * 0.04

      positionAttribute.setX(i, x + curl)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth * side)
    }

    geometry.computeVertexNormals()

    return geometry
  }

  private createFanLeafGeometry(width: number, height: number, bend: number): THREE.ShapeGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(-width * 0.18, height * 0.14, -width * 0.58, height * 0.4, -width * 0.2, height * 0.96)
    shape.quadraticCurveTo(0, height * 1.08, width * 0.2, height * 0.96)
    shape.bezierCurveTo(width * 0.58, height * 0.4, width * 0.18, height * 0.14, 0, 0)

    const geometry = new THREE.ShapeGeometry(shape, 12)
    const positionAttribute = geometry.getAttribute('position')

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const progress = y / height
      const side = x === 0 ? 0 : Math.sign(x)
      const curl = Math.sin(progress * Math.PI * 0.9) * bend * height
      const depth = Math.sin(progress * Math.PI * 1.1) * width * 0.1
      const droop = progress * progress * height * 0.06

      positionAttribute.setX(i, x + curl)
      positionAttribute.setY(i, y - droop)
      positionAttribute.setZ(i, depth * side)
    }

    geometry.computeVertexNormals()

    return geometry
  }

  private createSeaweedMaterial(
    hue: number,
    layer: PlantLayer
  ): THREE.MeshPhysicalMaterial {
    const seaweedTexture = this.createSeaweedTexture(hue)
    const normalMap = this.createSeaweedNormalMap()
    const roughnessMap = this.createSeaweedRoughnessMap()
    
    const material = new THREE.MeshPhysicalMaterial({
      map: seaweedTexture,
      alphaMap: seaweedTexture,
      normalMap,
      roughnessMap,
      color: new THREE.Color('#ffffff'),
      metalness: 0,
      roughness: layer === 'background' ? 0.84 : 0.72,
      transmission: layer === 'background' ? 0.04 : 0.08,
      thickness: 0.02,
      transparent: true,
      opacity: layer === 'background' ? 0.8 : 0.92,
      alphaTest: 0.28,
      side: THREE.DoubleSide,
      envMapIntensity: 0.18,
      clearcoat: 0.04,
      clearcoatRoughness: 0.9
    })
    material.shadowSide = THREE.DoubleSide
    return material
  }

  private getVisualTexture(id: string): THREE.Texture | null {
    return this.visualAssets?.textures[id] ?? null
  }

  private getVisualModel(id?: string): LoadedModelAsset | null {
    if (!id) return null
    return this.visualAssets?.models[id] ?? null
  }

  private cloneFirstAvailableVisualModelGroup(
    ids: string[],
    userData: Record<string, unknown>
  ): THREE.Group | null {
    for (const id of ids) {
      const clone = this.cloneVisualModelGroup(id, userData)
      if (clone) {
        return clone
      }
    }

    return null
  }

  private cloneVisualModelGroup(
    id: string,
    userData: Record<string, unknown>
  ): THREE.Group | null {
    const model = this.getVisualModel(id)
    if (!model) return null

    const clone = model.scene.clone(true)
    clone.userData = {
      ...clone.userData,
      ...userData,
      assetId: id
    }

    clone.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh)) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => this.createAssetBackedMaterial(id, material))
      } else if (mesh.material instanceof THREE.Material) {
        mesh.material = this.createAssetBackedMaterial(id, mesh.material)
      }
      this.ensureAoUv2(mesh)
      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    return clone
  }

  private createAssetBackedMaterial(id: string, material: THREE.Material): THREE.Material {
    if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
      return this.createReplacementAssetMaterial(id, material)
    }

    const baseMaterial = material.clone() as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial & {
      envMapIntensity?: number
      clearcoat?: number
      clearcoatRoughness?: number
      transmission?: number
      thickness?: number
      shadowSide?: THREE.Side
    }

    if (id.startsWith('plant-')) {
      baseMaterial.map = baseMaterial.map ?? this.getVisualTexture('leaf-diffuse')
      baseMaterial.alphaMap = baseMaterial.alphaMap ?? this.getVisualTexture('leaf-alpha')
      baseMaterial.normalMap = baseMaterial.normalMap ?? this.getVisualTexture('leaf-normal')
      if (baseMaterial.normalMap) {
        baseMaterial.normalScale = new THREE.Vector2(0.36, 0.36)
      }
      baseMaterial.roughnessMap = baseMaterial.roughnessMap ?? this.getVisualTexture('leaf-roughness')
      baseMaterial.color = baseMaterial.color?.clone() ?? new THREE.Color('#4d8150')
      baseMaterial.metalness = 0
      baseMaterial.roughness = typeof baseMaterial.roughness === 'number'
        ? Math.min(0.78, Math.max(baseMaterial.roughness, 0.48))
        : 0.66
      baseMaterial.transparent = baseMaterial.transparent || Boolean(baseMaterial.alphaMap)
      baseMaterial.opacity = Math.min(baseMaterial.opacity ?? 0.92, 0.96)
      baseMaterial.alphaTest = Math.max(baseMaterial.alphaTest ?? 0, baseMaterial.alphaMap ? 0.04 : 0)
      baseMaterial.side = THREE.DoubleSide
      baseMaterial.envMapIntensity = Math.max(baseMaterial.envMapIntensity ?? 0, 0.16)
      if (baseMaterial instanceof THREE.MeshPhysicalMaterial) {
        baseMaterial.transmission = Math.max(baseMaterial.transmission ?? 0, 0.02)
        baseMaterial.thickness = Math.max(baseMaterial.thickness ?? 0, 0.02)
        baseMaterial.clearcoat = Math.max(baseMaterial.clearcoat ?? 0, 0.04)
        baseMaterial.clearcoatRoughness = baseMaterial.clearcoatRoughness ?? 0.78
      }
      baseMaterial.shadowSide = THREE.DoubleSide
      return baseMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.tuneDriftwoodMaterial(baseMaterial)
    }

    if (id.startsWith('rock-')) {
      return this.tuneRockMaterial(baseMaterial)
    }

    return baseMaterial
  }

  private createReplacementAssetMaterial(id: string, material: THREE.Material): THREE.Material {
    const baseMaterial = material as THREE.MeshStandardMaterial

    if (id.startsWith('plant-')) {
      const plantMaterial = new THREE.MeshPhysicalMaterial({
        map: this.getVisualTexture('leaf-diffuse'),
        alphaMap: this.getVisualTexture('leaf-alpha'),
        normalMap: this.getVisualTexture('leaf-normal'),
        normalScale: new THREE.Vector2(0.36, 0.36),
        roughnessMap: this.getVisualTexture('leaf-roughness'),
        color: baseMaterial.color?.clone() ?? new THREE.Color('#4d8150'),
        metalness: 0,
        roughness: 0.66,
        transmission: 0.06,
        thickness: 0.04,
        transparent: true,
        opacity: 0.92,
        alphaTest: 0.06,
        side: THREE.DoubleSide,
        envMapIntensity: 0.16,
        clearcoat: 0.08,
        clearcoatRoughness: 0.78
      })
      plantMaterial.shadowSide = THREE.DoubleSide
      return plantMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.createDriftwoodReplacementMaterial(material)
    }

    if (id.startsWith('rock-')) {
      return this.createRockReplacementMaterial(material)
    }

    return material.clone()
  }

  private tuneDriftwoodMaterial<T extends THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(material: T): T {
    material.map = material.map ?? this.getVisualTexture('driftwood-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('driftwood-normal')
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(1.18, 0.68)
    }
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('driftwood-roughness')
    material.aoMap = material.aoMap ?? this.getVisualTexture('driftwood-ao')
    material.aoMapIntensity = material.aoMap ? Math.max(material.aoMapIntensity ?? 0.94, 0.94) : 0
    material.color = material.color?.clone() ?? new THREE.Color('#6f5641')
    material.roughness = typeof material.roughness === 'number'
      ? Math.max(material.roughness, material.roughnessMap ? 0.9 : 0.94)
      : material.roughnessMap ? 0.92 : 0.96
    material.metalness = typeof material.metalness === 'number'
      ? Math.min(material.metalness, 0.03)
      : 0.02
    material.envMapIntensity = THREE.MathUtils.clamp(material.envMapIntensity ?? 0.07, 0.03, 0.14)

    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = Math.min(material.clearcoat ?? 0, 0.03)
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness ?? 0.94, 0.94)
    }

    return material
  }

  private createDriftwoodReplacementMaterial(material: THREE.Material): THREE.MeshPhysicalMaterial {
    const sourceMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      color?: THREE.Color
      roughness?: number
      metalness?: number
      envMapIntensity?: number
      transparent?: boolean
      opacity?: number
      side?: THREE.Side
      alphaTest?: number
      depthWrite?: boolean
    }

    const driftwoodMaterial = new THREE.MeshPhysicalMaterial({
      map: sourceMaterial.map ?? this.getVisualTexture('driftwood-diffuse'),
      normalMap: sourceMaterial.normalMap ?? this.getVisualTexture('driftwood-normal'),
      roughnessMap: sourceMaterial.roughnessMap ?? this.getVisualTexture('driftwood-roughness'),
      aoMap: sourceMaterial.aoMap ?? this.getVisualTexture('driftwood-ao'),
      color: sourceMaterial.color?.clone() ?? new THREE.Color('#6f5641'),
      roughness: typeof sourceMaterial.roughness === 'number' ? sourceMaterial.roughness : 0.94,
      metalness: typeof sourceMaterial.metalness === 'number' ? sourceMaterial.metalness : 0.02,
      transparent: sourceMaterial.transparent ?? false,
      opacity: sourceMaterial.opacity ?? 1,
      side: sourceMaterial.side ?? THREE.FrontSide,
      alphaTest: sourceMaterial.alphaTest ?? 0,
      depthWrite: sourceMaterial.depthWrite ?? true,
      envMapIntensity: typeof sourceMaterial.envMapIntensity === 'number' ? sourceMaterial.envMapIntensity : 0.07,
      clearcoat: 0,
      clearcoatRoughness: 1
    })
    driftwoodMaterial.name = material.name
    driftwoodMaterial.userData = { ...material.userData }

    return this.tuneDriftwoodMaterial(driftwoodMaterial)
  }

  private tuneRockMaterial<T extends THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(material: T): T {
    material.map = material.map ?? this.getVisualTexture('rock-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('rock-normal')
    if (material.normalMap) {
      material.normalScale = new THREE.Vector2(0.54, 0.54)
    }
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('rock-roughness')

    const color = material.color?.clone() ?? new THREE.Color('#8a8378')
    const liftedHsl = { h: 0, s: 0, l: 0 }
    color.getHSL(liftedHsl)
    if (liftedHsl.l < 0.38) {
      color.setHSL(liftedHsl.h, Math.min(0.28, liftedHsl.s * 0.82), 0.38)
    }
    material.color = color
    material.metalness = typeof material.metalness === 'number'
      ? Math.min(material.metalness, 0.03)
      : 0.02
    material.roughness = typeof material.roughness === 'number'
      ? Math.max(material.roughness, material.roughnessMap ? 0.82 : 0.88)
      : material.roughnessMap ? 0.86 : 0.92
    material.envMapIntensity = THREE.MathUtils.clamp(material.envMapIntensity ?? 0.06, 0.02, 0.1)

    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = Math.min(material.clearcoat ?? 0, 0.02)
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness ?? 0.94, 0.94)
    }

    return material
  }

  private createRockReplacementMaterial(material: THREE.Material): THREE.MeshPhysicalMaterial {
    const sourceMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      color?: THREE.Color
      roughness?: number
      metalness?: number
      envMapIntensity?: number
      transparent?: boolean
      opacity?: number
      side?: THREE.Side
      alphaTest?: number
      depthWrite?: boolean
    }

    const rockMaterial = new THREE.MeshPhysicalMaterial({
      map: sourceMaterial.map ?? this.getVisualTexture('rock-diffuse'),
      normalMap: sourceMaterial.normalMap ?? this.getVisualTexture('rock-normal'),
      roughnessMap: sourceMaterial.roughnessMap ?? this.getVisualTexture('rock-roughness'),
      aoMap: sourceMaterial.aoMap ?? null,
      color: sourceMaterial.color?.clone() ?? new THREE.Color('#8a8378'),
      roughness: typeof sourceMaterial.roughness === 'number' ? sourceMaterial.roughness : 0.88,
      metalness: typeof sourceMaterial.metalness === 'number' ? sourceMaterial.metalness : 0.02,
      transparent: sourceMaterial.transparent ?? false,
      opacity: sourceMaterial.opacity ?? 1,
      side: sourceMaterial.side ?? THREE.FrontSide,
      alphaTest: sourceMaterial.alphaTest ?? 0,
      depthWrite: sourceMaterial.depthWrite ?? true,
      envMapIntensity: typeof sourceMaterial.envMapIntensity === 'number' ? sourceMaterial.envMapIntensity : 0.06,
      clearcoat: 0,
      clearcoatRoughness: 1
    })
    rockMaterial.name = material.name
    rockMaterial.userData = { ...material.userData }

    return this.tuneRockMaterial(rockMaterial)
  }

  private createLeafMaterial(
    hue: number,
    layer: PlantLayer,
    plantType: Exclude<PlantType, 'ribbon-seaweed'>
  ): THREE.MeshPhysicalMaterial {
    const color = new THREE.Color().setHSL(
      hue,
      plantType === 'fan-leaf' ? 0.44 : 0.38,
      layer === 'background' ? 0.28 : plantType === 'fan-leaf' ? 0.4 : 0.35
    )

    const material = new THREE.MeshPhysicalMaterial({
      map: this.getVisualTexture('leaf-diffuse'),
      alphaMap: this.getVisualTexture('leaf-alpha'),
      normalMap: this.getVisualTexture('leaf-normal'),
      normalScale: new THREE.Vector2(
        plantType === 'fan-leaf' ? 0.42 : 0.34,
        plantType === 'fan-leaf' ? 0.42 : 0.34
      ),
      roughnessMap: this.getVisualTexture('leaf-roughness'),
      color,
      metalness: 0,
      roughness: plantType === 'fan-leaf' ? 0.54 : 0.68,
      transmission: layer === 'background' ? 0.03 : 0.06,
      thickness: plantType === 'fan-leaf' ? 0.05 : 0.03,
      transparent: true,
      opacity: layer === 'background' ? 0.82 : 0.9,
      alphaTest: plantType === 'fan-leaf' ? 0.08 : 0.04,
      side: THREE.DoubleSide,
      envMapIntensity: 0.16,
      clearcoat: plantType === 'fan-leaf' ? 0.12 : 0.06,
      clearcoatRoughness: 0.76
    })
    material.shadowSide = THREE.DoubleSide
    return material
  }

  private createHeroDriftwood(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const driftwoodGroup = new THREE.Group()
    driftwoodGroup.position.set(
      center.x + size.x * 0.08,
      bounds.min.y + 0.86,
      center.z - size.z * 0.08
    )
    driftwoodGroup.rotation.y = -0.38
    driftwoodGroup.userData = {
      role: 'hero-driftwood'
    }

    const driftwoodAsset = this.cloneVisualModelGroup('driftwood-hero', {
      role: 'hero-driftwood'
    })
    if (driftwoodAsset) {
      driftwoodAsset.position.copy(driftwoodGroup.position)
      driftwoodAsset.rotation.copy(driftwoodGroup.rotation)
      driftwoodAsset.scale.set(1.18, 1.18, 1.18)
      this.decorations.push(driftwoodAsset)
      this.group.add(driftwoodAsset)
      return
    }

    const branchMaterial = this.createDriftwoodMaterial()
    const branchDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.18,
        points: [
          new THREE.Vector3(-1.8, 0.15, 0.5),
          new THREE.Vector3(-0.65, 1.55, 0.2),
          new THREE.Vector3(0.85, 2.55, -0.25),
          new THREE.Vector3(2.05, 2.1, -0.7)
        ],
        tubularSegments: 34,
        radialSegments: 8,
        ellipseAspect: 1.28,
        tipScale: 0.58,
        flare: 0.42,
        twist: 0.7,
        barkAmplitude: 0.1
      },
      {
        radius: 0.1,
        points: [
          new THREE.Vector3(-0.2, 1.45, 0.2),
          new THREE.Vector3(0.55, 2.35, 0.65),
          new THREE.Vector3(1.55, 2.85, 0.8)
        ],
        tubularSegments: 28,
        radialSegments: 7,
        ellipseAspect: 1.18,
        tipScale: 0.48,
        flare: 0.18,
        twist: 0.82,
        barkAmplitude: 0.12
      },
      {
        radius: 0.08,
        points: [
          new THREE.Vector3(0.35, 1.35, -0.05),
          new THREE.Vector3(1.15, 2.05, -0.8),
          new THREE.Vector3(1.65, 2.5, -1.2)
        ],
        tubularSegments: 26,
        radialSegments: 7,
        ellipseAspect: 1.22,
        tipScale: 0.44,
        flare: 0.2,
        twist: 1.04,
        barkAmplitude: 0.12
      }
    ]

    branchDefinitions.forEach((definition) => {
      const branch = this.createDriftwoodTubeMesh(definition, branchMaterial, 'driftwood-branch')
      driftwoodGroup.add(branch)
    })

    const branchletDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.04,
        points: [
          new THREE.Vector3(0.22, 1.88, 0.34),
          new THREE.Vector3(0.86, 2.36, 0.54),
          new THREE.Vector3(1.24, 2.72, 0.98)
        ],
        tubularSegments: 22,
        radialSegments: 6,
        ellipseAspect: 1.16,
        tipScale: 0.34,
        flare: 0.14,
        twist: 0.92,
        barkAmplitude: 0.14
      },
      {
        radius: 0.032,
        points: [
          new THREE.Vector3(0.62, 1.76, -0.22),
          new THREE.Vector3(1.18, 2.12, -0.58),
          new THREE.Vector3(1.72, 2.26, -1.04)
        ],
        tubularSegments: 20,
        radialSegments: 6,
        ellipseAspect: 1.14,
        tipScale: 0.3,
        flare: 0.12,
        twist: 1.06,
        barkAmplitude: 0.13
      },
      {
        radius: 0.028,
        points: [
          new THREE.Vector3(-0.48, 1.62, 0.12),
          new THREE.Vector3(-0.06, 2.12, 0.22),
          new THREE.Vector3(0.42, 2.54, 0.3)
        ],
        tubularSegments: 18,
        radialSegments: 6,
        ellipseAspect: 1.12,
        tipScale: 0.28,
        flare: 0.1,
        twist: 0.86,
        barkAmplitude: 0.12
      }
    ]
    branchletDefinitions.forEach((definition) => {
      const branchlet = this.createDriftwoodTubeMesh(definition, branchMaterial, 'driftwood-branchlet')
      driftwoodGroup.add(branchlet)
    })

    const rootDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.022,
        points: [
          new THREE.Vector3(-1.32, 0.66, 0.34),
          new THREE.Vector3(-1.18, 0.12, 0.18),
          new THREE.Vector3(-1.06, -0.48, 0.08)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.2,
        tipScale: 0.62,
        flare: 0.5,
        twist: 0.48,
        barkAmplitude: 0.11
      },
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(-0.24, 1.02, 0.28),
          new THREE.Vector3(-0.16, 0.32, 0.12),
          new THREE.Vector3(-0.08, -0.4, 0.06)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.16,
        tipScale: 0.58,
        flare: 0.42,
        twist: 0.42,
        barkAmplitude: 0.1
      },
      {
        radius: 0.016,
        points: [
          new THREE.Vector3(0.94, 1.24, -0.12),
          new THREE.Vector3(0.98, 0.42, -0.18),
          new THREE.Vector3(1.02, -0.34, -0.24)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.14,
        tipScale: 0.54,
        flare: 0.4,
        twist: 0.36,
        barkAmplitude: 0.1
      }
    ]
    rootDefinitions.forEach((definition) => {
      const root = this.createDriftwoodTubeMesh(definition, branchMaterial, 'driftwood-root')
      driftwoodGroup.add(root)
    })

    const rootFlare = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 12),
      branchMaterial
    )
    rootFlare.position.set(-1.26, 0.12, 0.26)
    rootFlare.scale.set(1.5, 0.62, 1.18)
    rootFlare.rotation.set(-0.18, 0.34, 0.08)
    rootFlare.castShadow = true
    rootFlare.receiveShadow = true
    rootFlare.userData = {
      role: 'driftwood-root-flare'
    }
    driftwoodGroup.add(rootFlare)

    const brokenStubDefinitions = [
      {
        position: new THREE.Vector3(-0.18, 1.68, 0.22),
        rotation: new THREE.Euler(0.56, -0.3, 0.42),
        scale: new THREE.Vector3(0.12, 0.2, 0.1)
      },
      {
        position: new THREE.Vector3(0.88, 2.06, -0.22),
        rotation: new THREE.Euler(-0.34, 0.52, -0.2),
        scale: new THREE.Vector3(0.1, 0.18, 0.08)
      }
    ]
    brokenStubDefinitions.forEach((definition) => {
      const stub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.04, 0.34, 7),
        branchMaterial
      )
      stub.position.copy(definition.position)
      stub.rotation.copy(definition.rotation)
      stub.scale.copy(definition.scale)
      stub.castShadow = true
      stub.receiveShadow = true
      stub.userData = {
        role: 'driftwood-broken-stub'
      }
      driftwoodGroup.add(stub)
    })

    const epiphyteAttachments = [
      { offset: new THREE.Vector3(-0.25, 1.15, 0.32), hue: 0.29 },
      { offset: new THREE.Vector3(0.72, 1.95, 0.58), hue: 0.33 },
      { offset: new THREE.Vector3(1.02, 1.55, -0.42), hue: 0.26 }
    ]
    epiphyteAttachments.forEach((attachment) => {
      const cluster = this.createEpiphyteCluster(attachment.hue)
      cluster.position.copy(attachment.offset)
      cluster.rotation.y = Math.random() * Math.PI * 2
      driftwoodGroup.add(cluster)
      this.plants.push(cluster)
    })

    this.decorations.push(driftwoodGroup)
    this.group.add(driftwoodGroup)
  }

  private createHeroRockRidge(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const ridgeGroup = new THREE.Group()
    ridgeGroup.position.set(
      center.x + size.x * 0.12,
      bounds.min.y + 0.72,
      center.z - size.z * 0.04
    )
    ridgeGroup.rotation.y = -0.42
    ridgeGroup.userData = {
      role: 'hero-rock-ridge'
    }

    const ridgeAsset = this.cloneVisualModelGroup('rock-ridge-hero', {
      role: 'hero-rock-ridge'
    })
    if (ridgeAsset) {
      ridgeAsset.position.copy(ridgeGroup.position)
      ridgeAsset.rotation.copy(ridgeGroup.rotation)
      ridgeAsset.scale.set(1.24, 1.24, 1.24)
      this.decorations.push(ridgeAsset)
      this.group.add(ridgeAsset)
      return
    }

    const ridgeRockDefinitions = [
      {
        geometry: new THREE.DodecahedronGeometry(0.92, 0),
        position: new THREE.Vector3(-1.05, 0.04, 0.46),
        rotation: new THREE.Euler(0.18, -0.22, 0.34),
        scale: new THREE.Vector3(1.7, 0.56, 1.08),
        color: '#70685b'
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.68, 0),
        position: new THREE.Vector3(0.18, 0.18, 0.08),
        rotation: new THREE.Euler(-0.14, 0.32, -0.18),
        scale: new THREE.Vector3(1.38, 0.74, 1.04),
        color: '#867c6a'
      },
      {
        geometry: new THREE.OctahedronGeometry(0.6, 0),
        position: new THREE.Vector3(1.18, 0.12, -0.34),
        rotation: new THREE.Euler(0.28, -0.34, 0.12),
        scale: new THREE.Vector3(1.24, 0.68, 1.28),
        color: '#625b4f'
      }
    ]
    ridgeRockDefinitions.forEach((definition) => {
      const rock = new THREE.Mesh(
        definition.geometry,
        this.createRockMaterial(definition.color)
      )
      rock.position.copy(definition.position)
      rock.rotation.copy(definition.rotation)
      rock.scale.copy(definition.scale)
      rock.castShadow = true
      rock.receiveShadow = true
      rock.userData = {
        role: 'ridge-rock'
      }
      ridgeGroup.add(rock)
    })

    const ridgeSlateDefinitions = [
      {
        position: new THREE.Vector3(-0.36, 0.54, 0.24),
        rotation: new THREE.Euler(-0.18, 0.12, 0.42),
        scale: new THREE.Vector3(1.24, 0.08, 0.38),
        color: '#8d8473'
      },
      {
        position: new THREE.Vector3(0.58, 0.64, -0.12),
        rotation: new THREE.Euler(0.12, -0.34, 0.24),
        scale: new THREE.Vector3(1.42, 0.07, 0.32),
        color: '#70695e'
      },
      {
        position: new THREE.Vector3(1.42, 0.46, -0.48),
        rotation: new THREE.Euler(0.22, 0.28, 0.36),
        scale: new THREE.Vector3(1.02, 0.08, 0.28),
        color: '#9b927f'
      }
    ]
    ridgeSlateDefinitions.forEach((definition) => {
      const slate = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.16, 0.34),
        this.createRockMaterial(definition.color)
      )
      slate.position.copy(definition.position)
      slate.rotation.copy(definition.rotation)
      slate.scale.copy(definition.scale)
      slate.castShadow = true
      slate.receiveShadow = true
      slate.userData = {
        role: 'ridge-slate'
      }
      ridgeGroup.add(slate)
    })

    const ridgeRubbleDefinitions = [
      { position: new THREE.Vector3(-1.36, -0.06, 0.74), scale: 0.24, color: '#7a7264' },
      { position: new THREE.Vector3(-0.54, -0.12, 0.88), scale: 0.18, color: '#93886f' },
      { position: new THREE.Vector3(0.38, -0.08, 0.54), scale: 0.22, color: '#665f55' },
      { position: new THREE.Vector3(1.04, -0.1, -0.68), scale: 0.2, color: '#847a67' },
      { position: new THREE.Vector3(1.56, -0.06, -0.12), scale: 0.16, color: '#a09681' }
    ]
    ridgeRubbleDefinitions.forEach((definition, index) => {
      const rubbleGeometry = index % 2 === 0
        ? new THREE.DodecahedronGeometry(definition.scale, 0)
        : new THREE.IcosahedronGeometry(definition.scale, 0)
      const rubble = new THREE.Mesh(
        rubbleGeometry,
        this.createRockMaterial(definition.color)
      )
      rubble.position.copy(definition.position)
      rubble.rotation.set(
        0.14 + index * 0.05,
        -0.22 + index * 0.08,
        0.18 - index * 0.03
      )
      rubble.castShadow = true
      rubble.receiveShadow = true
      rubble.userData = {
        role: 'ridge-rubble'
      }
      ridgeGroup.add(rubble)
    })

    this.decorations.push(ridgeGroup)
    this.group.add(ridgeGroup)
  }

  private createHeroCanopy(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const canopyDefinitions = [
      {
        position: new THREE.Vector3(center.x - size.x * 0.04, bounds.min.y + 0.42, center.z - size.z * 0.18),
        rotationY: -0.18,
        scale: new THREE.Vector3(0.92, 1.18, 0.92),
        assetId: 'plant-sword-cluster',
        plantType: 'sword-leaf' as const,
        height: 6.2,
        hue: 0.35
      },
      {
        position: new THREE.Vector3(center.x + size.x * 0.2, bounds.min.y + 0.42, center.z - size.z * 0.12),
        rotationY: 0.24,
        scale: new THREE.Vector3(0.82, 1.28, 0.82),
        assetId: 'plant-fan-cluster',
        plantType: 'fan-leaf' as const,
        fallbackPlantType: 'ribbon-seaweed' as const,
        height: 6.8,
        hue: 0.42
      },
      {
        position: new THREE.Vector3(center.x + size.x * 0.06, bounds.min.y + 0.42, center.z - size.z * 0.24),
        rotationY: -0.36,
        scale: new THREE.Vector3(0.86, 1.1, 0.86),
        assetId: 'plant-sword-cluster',
        plantType: 'sword-leaf' as const,
        height: 5.7,
        hue: 0.31
      }
    ]
    canopyDefinitions.forEach((definition) => {
      const assetCanopy = this.cloneVisualModelGroup(definition.assetId, {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.plantType
      })
      if (assetCanopy) {
        assetCanopy.position.copy(definition.position)
        assetCanopy.rotation.y = definition.rotationY
        assetCanopy.scale.copy(definition.scale)
        this.plants.push(assetCanopy)
        this.group.add(assetCanopy)
        return
      }

      const canopyGroup = new THREE.Group()
      canopyGroup.position.copy(definition.position)
      canopyGroup.rotation.y = definition.rotationY
      canopyGroup.scale.copy(definition.scale)
      canopyGroup.userData = {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.fallbackPlantType ?? definition.plantType
      }

      if ((definition.fallbackPlantType ?? definition.plantType) === 'sword-leaf') {
        this.createSwordLeafPlant(canopyGroup, 'background', definition.height, definition.hue)
      } else {
        this.createRibbonSeaweed(canopyGroup, 'background', definition.height, definition.hue)
      }

      this.plants.push(canopyGroup)
      this.group.add(canopyGroup)
    })
  }

  private createEpiphyteCluster(hue: number): THREE.Group {
    const cluster = new THREE.Group()
    cluster.userData = {
      role: 'epiphyte-cluster'
    }

    const leafMaterial = this.createLeafMaterial(hue, 'midground', 'fan-leaf')
    const leafCount = 5

    for (let i = 0; i < leafCount; i++) {
      const leafWidth = 0.18 + Math.random() * 0.08
      const leafHeight = 0.32 + Math.random() * 0.16
      const bend = (Math.random() - 0.5) * 0.08 + (i - (leafCount - 1) / 2) * 0.03
      const leaf = new THREE.Mesh(
        this.createFanLeafGeometry(leafWidth, leafHeight, bend),
        leafMaterial
      )
      const spread = i - (leafCount - 1) / 2

      leaf.position.set(
        spread * 0.08 + (Math.random() - 0.5) * 0.03,
        Math.random() * 0.05,
        (Math.random() - 0.5) * 0.05
      )
      leaf.rotation.y = spread * 0.45 + (Math.random() - 0.5) * 0.25
      leaf.rotation.z = -0.24 + (Math.random() - 0.5) * 0.08
      leaf.rotation.x = (Math.random() - 0.5) * 0.08
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'epiphyte-leaf',
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.015 + Math.random() * 0.02
      }

      cluster.add(leaf)
    }

    return cluster
  }

  private createDriftwoodTubeMesh(
    definition: DriftwoodTubeDefinition,
    material: THREE.Material,
    role: 'driftwood-branch' | 'driftwood-branchlet' | 'driftwood-root'
  ): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(definition.points)
    const geometry = new THREE.TubeGeometry(
      curve,
      definition.tubularSegments,
      definition.radius,
      definition.radialSegments,
      false
    )

    this.deformDriftwoodTubeGeometry(geometry, curve, definition)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      role,
      crossSectionAspect: definition.ellipseAspect,
      baseRadius: definition.radius * (1 + definition.flare * 0.35),
      tipRadius: definition.radius * definition.tipScale
    }
    return mesh
  }

  private deformDriftwoodTubeGeometry(
    geometry: THREE.TubeGeometry,
    curve: THREE.CatmullRomCurve3,
    definition: DriftwoodTubeDefinition
  ): void {
    const position = geometry.getAttribute('position')
    const normals = (geometry as THREE.TubeGeometry & {
      normals: THREE.Vector3[]
      binormals: THREE.Vector3[]
    }).normals
    const binormals = (geometry as THREE.TubeGeometry & {
      normals: THREE.Vector3[]
      binormals: THREE.Vector3[]
    }).binormals
    const ringSize = definition.radialSegments + 1
    const ringCenter = new THREE.Vector3()
    const radialOffset = new THREE.Vector3()
    const tangentNormal = new THREE.Vector3()
    const tangentBinormal = new THREE.Vector3()
    const nextVertex = new THREE.Vector3()

    for (let i = 0; i <= definition.tubularSegments; i++) {
      const t = i / definition.tubularSegments
      ringCenter.copy(curve.getPointAt(t))
      tangentNormal.copy(normals[i] ?? normals[normals.length - 1] ?? new THREE.Vector3(1, 0, 0))
      tangentBinormal.copy(binormals[i] ?? binormals[binormals.length - 1] ?? new THREE.Vector3(0, 0, 1))
      const ringTwist = definition.twist * t + Math.sin(t * 9.5) * 0.08
      const radiusBase = THREE.MathUtils.lerp(
        definition.radius * (1 + definition.flare * Math.pow(1 - t, 1.8)),
        definition.radius * definition.tipScale,
        Math.pow(t, 0.82)
      )

      for (let j = 0; j < ringSize; j++) {
        const index = i * ringSize + j
        nextVertex.fromBufferAttribute(position, index)
        radialOffset.copy(nextVertex).sub(ringCenter)

        const normalComponent = radialOffset.dot(tangentNormal)
        const binormalComponent = radialOffset.dot(tangentBinormal)
        const angle = Math.atan2(binormalComponent, normalComponent)
        const barkNoise = (
          Math.sin(t * 26 + angle * 6.2)
          + Math.sin(t * 48 - angle * 10.4) * 0.55
        ) * definition.barkAmplitude
        const knotBand = Math.max(
          Math.exp(-Math.pow((t - 0.22) / 0.08, 2)) * 0.12,
          Math.exp(-Math.pow((t - 0.58) / 0.1, 2)) * 0.16
        ) * Math.max(0, Math.cos(angle - 0.5))
        const rotatedAngle = angle + ringTwist
        const ellipseNormal = Math.cos(rotatedAngle) * definition.ellipseAspect
        const ellipseBinormal = Math.sin(rotatedAngle) / definition.ellipseAspect
        const radius = radiusBase * (1 + barkNoise + knotBand)

        nextVertex.copy(ringCenter)
        nextVertex.addScaledVector(tangentNormal, radius * ellipseNormal)
        nextVertex.addScaledVector(tangentBinormal, radius * ellipseBinormal)
        position.setXYZ(index, nextVertex.x, nextVertex.y, nextVertex.z)
      }
    }

    position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  private createDriftwoodMaterial(): THREE.MeshPhysicalMaterial {
    return this.createDriftwoodReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6f5641')
    }))
  }

  private createDriftwoodBurialDetails(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const driftwoodAnchor = substrateHardscapeAnchors.find((anchor) => anchor.id === 'driftwood-root-flare')
    const basePosition = new THREE.Vector3(
      (driftwoodAnchor?.x ?? 0.08) * size.x,
      bounds.min.y + 0.04,
      (driftwoodAnchor?.z ?? -0.08) * size.z
    )

    const burialShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#102026'),
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
    )
    burialShadow.rotation.x = -Math.PI / 2
    burialShadow.position.set(basePosition.x - 0.28, basePosition.y, basePosition.z + 0.2)
    burialShadow.userData = {
      role: 'driftwood-burial-shadow'
    }
    this.group.add(burialShadow)

    const moundDefinitions = [
      {
        offset: new THREE.Vector3(-0.38, 0.12, 0.2),
        scale: new THREE.Vector3(0.72, 0.16, 0.36),
        color: '#8d7b63'
      },
      {
        offset: new THREE.Vector3(0.18, 0.1, 0.12),
        scale: new THREE.Vector3(0.54, 0.12, 0.28),
        color: '#776750'
      }
    ]
    moundDefinitions.forEach((definition) => {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 18, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(definition.color),
          roughness: 0.98,
          metalness: 0
        })
      )
      mound.position.set(
        basePosition.x + definition.offset.x,
        bounds.min.y + definition.offset.y,
        basePosition.z + definition.offset.z
      )
      mound.scale.copy(definition.scale)
      mound.receiveShadow = true
      mound.userData = {
        role: 'driftwood-detritus-mound'
      }
      this.group.add(mound)
    })
  }

  private ensureAoUv2(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const needsAoUv = materials.some(
      (material) => material instanceof THREE.MeshStandardMaterial && Boolean(material.aoMap)
    )
    if (!needsAoUv) return

    const geometry = mesh.geometry
    const uv = geometry.getAttribute('uv')
    if (!uv || geometry.getAttribute('uv2')) return

    const nextGeometry = geometry.userData.sharedAsset ? geometry.clone() : geometry
    nextGeometry.setAttribute('uv2', uv.clone())
    mesh.geometry = nextGeometry
  }

  private createRockMaterial(color: string): THREE.MeshPhysicalMaterial {
    return this.createRockReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color(color)
    }))
  }

  private createRockClusterMesh(pieceDefinition: RockClusterPieceDefinition): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.createDeformedRockGeometry(
        pieceDefinition.geometry,
        pieceDefinition.radius,
        pieceDefinition.detail,
        pieceDefinition.seed
      ),
      this.createRockMaterial(pieceDefinition.color)
    )
    mesh.position.copy(pieceDefinition.offset)
    mesh.rotation.copy(pieceDefinition.rotation)
    mesh.scale.copy(pieceDefinition.scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      role: pieceDefinition.role,
      clusterSeed: pieceDefinition.seed
    }
    return mesh
  }

  private createDeformedRockGeometry(
    shape: RockClusterShape,
    radius: number,
    detail: number,
    seed: number
  ): THREE.BufferGeometry {
    const geometry = shape === 'icosahedron'
      ? new THREE.IcosahedronGeometry(radius, detail)
      : shape === 'octahedron'
        ? new THREE.OctahedronGeometry(radius, detail)
        : new THREE.DodecahedronGeometry(radius, detail)
    const positionAttribute = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    const normal = new THREE.Vector3()
    const chipDirection = new THREE.Vector3(
      Math.sin(seed * 2.1) * 0.74,
      -0.84 + Math.cos(seed * 1.3) * 0.12,
      Math.cos(seed * 1.7) * 0.68
    ).normalize()
    const shearX = Math.sin(seed * 1.9) * 0.22
    const shearZ = Math.cos(seed * 2.3) * 0.18

    for (let index = 0; index < positionAttribute.count; index++) {
      vertex.fromBufferAttribute(positionAttribute, index)
      normal.copy(vertex).normalize()

      const normalizedX = vertex.x / Math.max(radius, 0.001)
      const normalizedY = vertex.y / Math.max(radius, 0.001)
      const normalizedZ = vertex.z / Math.max(radius, 0.001)
      const layeredNoise = (
        Math.sin(normalizedX * 4.8 + seed * 1.6) * 0.09
        + Math.cos(normalizedY * 6.1 - seed * 0.8) * 0.06
        + Math.sin(normalizedZ * 5.4 + seed * 2.2) * 0.05
      )
      const stratum = Math.sin((normalizedX + normalizedZ) * 4.2 + seed * 1.4) * 0.03
      const chip = Math.max(0, normal.dot(chipDirection) - 0.38) * 0.28
      const originalY = vertex.y

      vertex.multiplyScalar(1 + layeredNoise + stratum - chip)
      vertex.x += originalY * shearX
      vertex.z += originalY * shearZ
      vertex.y = originalY < 0 ? vertex.y * 0.68 : vertex.y * 0.9
      if (originalY < radius * -0.28) {
        vertex.y -= radius * 0.08
      }

      positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }

    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }

  private createFallbackSupportRockGroup(
    role: 'hero-rock' | 'support-rock',
    pieceDefinitions: RockClusterPieceDefinition[]
  ): THREE.Group {
    const rockGroup = new THREE.Group()
    rockGroup.userData = {
      role
    }

    pieceDefinitions.forEach((pieceDefinition) => {
      rockGroup.add(this.createRockClusterMesh(pieceDefinition))
    })

    return rockGroup
  }

  private createFallbackPebbleCluster(seed: number, colors: string[]): THREE.Group {
    const pebbleGroup = new THREE.Group()
    pebbleGroup.userData = {
      role: 'support-rock-scatter'
    }

    ;[
      {
        geometry: 'dodecahedron' as const,
        radius: 0.22,
        detail: 1,
        offset: new THREE.Vector3(0, 0.16, 0),
        rotation: new THREE.Euler(0.12, -0.18, 0.06),
        scale: new THREE.Vector3(1.18, 0.64, 0.92),
        color: colors[0] ?? '#867d70',
        seed: seed + 0.1
      },
      {
        geometry: 'icosahedron' as const,
        radius: 0.16,
        detail: 1,
        offset: new THREE.Vector3(0.26, 0.08, -0.08),
        rotation: new THREE.Euler(-0.08, 0.3, -0.12),
        scale: new THREE.Vector3(0.92, 0.54, 0.84),
        color: colors[1] ?? '#968c7d',
        seed: seed + 0.5
      },
      {
        geometry: 'octahedron' as const,
        radius: 0.12,
        detail: 1,
        offset: new THREE.Vector3(-0.22, 0.06, 0.12),
        rotation: new THREE.Euler(0.1, -0.24, 0.08),
        scale: new THREE.Vector3(0.86, 0.48, 0.78),
        color: colors[2] ?? '#756c60',
        seed: seed + 0.9
      },
      {
        geometry: 'dodecahedron' as const,
        radius: 0.1,
        detail: 1,
        offset: new THREE.Vector3(0.08, 0.03, 0.18),
        rotation: new THREE.Euler(0.06, 0.18, 0.04),
        scale: new THREE.Vector3(0.78, 0.42, 0.72),
        color: colors[0] ?? '#867d70',
        seed: seed + 1.4
      }
    ].forEach((definition) => {
      pebbleGroup.add(this.createRockClusterMesh({
        ...definition,
        role: 'support-rock-pebble'
      }))
    })

    return pebbleGroup
  }
  
  private createCorals(bounds: THREE.Box3): void {
    const coralCount = 8
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < coralCount; i++) {
      const coralGroup = new THREE.Group()
      coralGroup.userData = {
        role: 'marine-accent',
        accentType: 'coral'
      }
      
      const x = (Math.random() - 0.5) * size.x * 0.6
      const z = (Math.random() - 0.5) * size.z * 0.6
      const y = bounds.min.y + 0.42  // 砂層の高さに合わせる
      
      coralGroup.position.set(x, y, z)
      
      // Branch coral structure
      const branchCount = 3 + Math.floor(Math.random() * 4)
      
      for (let j = 0; j < branchCount; j++) {
        const branchHeight = 0.5 + Math.random() * 1.5
        const branchRadius = 0.05 + Math.random() * 0.03
        
        const geometry = new THREE.ConeGeometry(
          branchRadius * 2,
          branchHeight,
          6
        )
        
        const coralColors = [
          new THREE.Color(0xff6b47),
          new THREE.Color(0xff8c69),
          new THREE.Color(0xffa500),
          new THREE.Color(0xff69b4)
        ]
        
        const material = new THREE.MeshPhysicalMaterial({
          color: coralColors[Math.floor(Math.random() * coralColors.length)],
          metalness: 0,
          roughness: 0.9,
          clearcoat: 0.3,
          clearcoatRoughness: 0.8
        })
        
        const branch = new THREE.Mesh(geometry, material)
        branch.position.y = branchHeight / 2
        branch.rotation.x = (Math.random() - 0.5) * 0.5
        branch.rotation.z = (Math.random() - 0.5) * 0.5
        branch.rotation.y = (j / branchCount) * Math.PI * 2 + Math.random() * 0.5
        branch.castShadow = true
        branch.receiveShadow = true
        
        coralGroup.add(branch)
      }
      
      this.decorations.push(coralGroup)
      this.group.add(coralGroup)
    }
  }
  
  private createRocks(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    const surfaceY = bounds.min.y + 0.42

    const rockPlacements = [
      {
        role: 'hero-rock' as const,
        assetIds: ['rock-support-c', 'rock-support-a'],
        position: new THREE.Vector3(center.x - size.x * 0.05, surfaceY - 0.08, center.z + size.z * 0.07),
        rotation: new THREE.Euler(-0.08, -0.26, 0.04),
        scale: new THREE.Vector3(0.82, 0.76, 0.84),
        pieceDefinitions: [
          {
            geometry: 'dodecahedron' as const,
            radius: 0.7,
            detail: 1,
            offset: new THREE.Vector3(0, 0.5, 0),
            rotation: new THREE.Euler(0.12, -0.2, 0.1),
            scale: new THREE.Vector3(1.26, 0.72, 1.02),
            color: '#8e8679',
            seed: 0.4,
            role: 'support-rock-piece' as const
          },
          {
            geometry: 'icosahedron' as const,
            radius: 0.32,
            detail: 1,
            offset: new THREE.Vector3(0.44, 0.18, -0.18),
            rotation: new THREE.Euler(-0.08, 0.32, -0.06),
            scale: new THREE.Vector3(0.92, 0.56, 0.84),
            color: '#9b907d',
            seed: 1.1,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'octahedron' as const,
            radius: 0.22,
            detail: 1,
            offset: new THREE.Vector3(-0.38, 0.14, 0.2),
            rotation: new THREE.Euler(0.1, -0.28, 0.08),
            scale: new THREE.Vector3(0.88, 0.52, 0.78),
            color: '#72695e',
            seed: 1.6,
            role: 'support-rock-chip' as const
          }
        ],
        pebblePosition: new THREE.Vector3(center.x - size.x * 0.14, surfaceY - 0.1, center.z + size.z * 0.16),
        pebbleRotation: new THREE.Euler(0.04, 0.28, -0.02),
        pebbleScale: new THREE.Vector3(0.56, 0.56, 0.56),
        pebbleSeed: 2.4,
        pebbleColors: ['#877d6c', '#9a907c', '#72685d']
      },
      {
        role: 'support-rock' as const,
        assetIds: ['rock-support-a'],
        position: new THREE.Vector3(center.x - size.x * 0.35, surfaceY - 0.12, center.z + size.z * 0.2),
        rotation: new THREE.Euler(0.02, 0.54, -0.06),
        scale: new THREE.Vector3(0.98, 0.82, 0.9),
        pieceDefinitions: [
          {
            geometry: 'icosahedron' as const,
            radius: 0.84,
            detail: 1,
            offset: new THREE.Vector3(0, 0.56, 0),
            rotation: new THREE.Euler(0.08, 0.22, -0.04),
            scale: new THREE.Vector3(1.34, 0.7, 0.96),
            color: '#8b8275',
            seed: 3.1,
            role: 'support-rock-piece' as const
          },
          {
            geometry: 'dodecahedron' as const,
            radius: 0.46,
            detail: 1,
            offset: new THREE.Vector3(0.58, 0.2, -0.16),
            rotation: new THREE.Euler(-0.06, 0.3, -0.1),
            scale: new THREE.Vector3(0.98, 0.58, 0.88),
            color: '#a09482',
            seed: 3.7,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'octahedron' as const,
            radius: 0.28,
            detail: 1,
            offset: new THREE.Vector3(-0.56, 0.14, 0.22),
            rotation: new THREE.Euler(0.12, -0.32, 0.08),
            scale: new THREE.Vector3(0.94, 0.5, 0.82),
            color: '#7a7166',
            seed: 4.2,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'icosahedron' as const,
            radius: 0.18,
            detail: 1,
            offset: new THREE.Vector3(0.22, 0.1, 0.34),
            rotation: new THREE.Euler(0.04, 0.18, -0.04),
            scale: new THREE.Vector3(0.82, 0.44, 0.74),
            color: '#958a79',
            seed: 4.8,
            role: 'support-rock-chip' as const
          }
        ],
        pebblePosition: new THREE.Vector3(center.x - size.x * 0.24, surfaceY - 0.14, center.z + size.z * 0.09),
        pebbleRotation: new THREE.Euler(0.04, -0.12, 0.02),
        pebbleScale: new THREE.Vector3(0.64, 0.64, 0.64),
        pebbleSeed: 5.4,
        pebbleColors: ['#8d8170', '#a19583', '#70675d']
      },
      {
        role: 'support-rock' as const,
        assetIds: ['rock-support-b'],
        position: new THREE.Vector3(center.x + size.x * 0.39, surfaceY - 0.12, center.z + size.z * 0.14),
        rotation: new THREE.Euler(-0.06, -0.48, 0.1),
        scale: new THREE.Vector3(0.94, 0.8, 1),
        pieceDefinitions: [
          {
            geometry: 'dodecahedron' as const,
            radius: 0.76,
            detail: 1,
            offset: new THREE.Vector3(0, 0.52, 0),
            rotation: new THREE.Euler(-0.1, -0.24, 0.06),
            scale: new THREE.Vector3(1.22, 0.68, 1.08),
            color: '#918777',
            seed: 6.1,
            role: 'support-rock-piece' as const
          },
          {
            geometry: 'icosahedron' as const,
            radius: 0.38,
            detail: 1,
            offset: new THREE.Vector3(-0.54, 0.18, -0.18),
            rotation: new THREE.Euler(0.06, -0.3, 0.12),
            scale: new THREE.Vector3(0.96, 0.54, 0.86),
            color: '#786e63',
            seed: 6.6,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'octahedron' as const,
            radius: 0.26,
            detail: 1,
            offset: new THREE.Vector3(0.52, 0.12, 0.26),
            rotation: new THREE.Euler(0.12, 0.28, -0.08),
            scale: new THREE.Vector3(0.88, 0.48, 0.78),
            color: '#a19684',
            seed: 7.1,
            role: 'support-rock-chip' as const
          },
          {
            geometry: 'dodecahedron' as const,
            radius: 0.16,
            detail: 1,
            offset: new THREE.Vector3(-0.12, 0.08, 0.34),
            rotation: new THREE.Euler(-0.04, 0.2, -0.06),
            scale: new THREE.Vector3(0.82, 0.4, 0.7),
            color: '#8a7f70',
            seed: 7.7,
            role: 'support-rock-chip' as const
          }
        ],
        pebblePosition: new THREE.Vector3(center.x + size.x * 0.28, surfaceY - 0.14, center.z + size.z * 0.24),
        pebbleRotation: new THREE.Euler(-0.02, 0.2, 0.04),
        pebbleScale: new THREE.Vector3(0.6, 0.6, 0.6),
        pebbleSeed: 8.4,
        pebbleColors: ['#938775', '#7b7166', '#a49886']
      }
    ]

    rockPlacements.forEach((placement) => {
      const rockGroup = this.cloneFirstAvailableVisualModelGroup(placement.assetIds, {
        role: placement.role
      }) ?? this.createFallbackSupportRockGroup(placement.role, placement.pieceDefinitions)
      rockGroup.position.copy(placement.position)
      rockGroup.rotation.copy(placement.rotation)
      rockGroup.scale.copy(placement.scale)
      this.decorations.push(rockGroup)
      this.group.add(rockGroup)

      const pebbleCluster = this.cloneFirstAvailableVisualModelGroup(['rock-pebble-cluster'], {
        role: 'support-rock-scatter'
      }) ?? this.createFallbackPebbleCluster(placement.pebbleSeed, placement.pebbleColors)
      pebbleCluster.position.copy(placement.pebblePosition)
      pebbleCluster.rotation.copy(placement.pebbleRotation)
      pebbleCluster.scale.copy(placement.pebbleScale)
      this.decorations.push(pebbleCluster)
      this.group.add(pebbleCluster)
    })
  }

  private createHardscapeShadow(bounds: THREE.Box3): void {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    let shadowTexture: THREE.Texture | null = null

    if (ctx && typeof ctx.createRadialGradient === 'function') {
      const gradient = ctx.createRadialGradient(128, 128, 18, 128, 128, 112)
      gradient.addColorStop(0, 'rgba(7, 17, 20, 0.64)')
      gradient.addColorStop(0.52, 'rgba(7, 17, 20, 0.2)')
      gradient.addColorStop(1, 'rgba(7, 17, 20, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      shadowTexture = new THREE.CanvasTexture(canvas)
      shadowTexture.colorSpace = THREE.SRGBColorSpace
    }

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 3.8),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: new THREE.Color('#122329'),
        transparent: true,
        opacity: 0.34,
        depthWrite: false
      })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(0.94, bounds.min.y + 0.02, -0.16)
    shadow.userData = {
      role: 'hero-hardscape-shadow'
    }
    this.group.add(shadow)
  }

  private createHardscapeTransitionDetails(bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const ridgeAnchor = substrateHardscapeAnchors.find((anchor) => anchor.id === 'ridge-rock-hero')

    const berm = new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 28, 18),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#9f8b70'),
        roughness: 0.97,
        metalness: 0,
        transparent: true,
        opacity: 0.94
      })
    )
    berm.scale.set(2.2, 0.38, 1.18)
    berm.position.set(
      (ridgeAnchor?.x ?? 0.12) * size.x + 0.18,
      bounds.min.y + 0.26,
      (ridgeAnchor?.z ?? -0.04) * size.z + 0.18
    )
    berm.receiveShadow = true
    berm.userData = {
      role: 'hardscape-transition-berm'
    }
    this.group.add(berm)

    const pebbleDefinitions = [
      { offset: new THREE.Vector3(-1.48, 0.02, 0.92), scale: 0.18, color: '#8a7c68' },
      { offset: new THREE.Vector3(-0.86, 0.05, 0.62), scale: 0.14, color: '#9a8b75' },
      { offset: new THREE.Vector3(-0.08, 0.03, 0.46), scale: 0.16, color: '#756959' },
      { offset: new THREE.Vector3(0.74, 0.04, 0.1), scale: 0.13, color: '#a09076' },
      { offset: new THREE.Vector3(1.34, 0.02, -0.34), scale: 0.17, color: '#6c6255' },
      { offset: new THREE.Vector3(1.82, 0.03, -0.8), scale: 0.12, color: '#91826e' }
    ]
    pebbleDefinitions.forEach((definition, index) => {
      const pebble = new THREE.Mesh(
        index % 2 === 0
          ? new THREE.DodecahedronGeometry(definition.scale, 0)
          : new THREE.IcosahedronGeometry(definition.scale, 0),
        this.createRockMaterial(definition.color)
      )
      pebble.position.set(
        berm.position.x + definition.offset.x,
        bounds.min.y + 0.08 + definition.offset.y,
        berm.position.z + definition.offset.z
      )
      pebble.rotation.set(
        0.14 + index * 0.05,
        -0.3 + index * 0.08,
        0.08 + index * 0.04
      )
      pebble.castShadow = true
      pebble.receiveShadow = true
      pebble.userData = {
        role: 'hardscape-transition-pebble'
      }
      this.group.add(pebble)
    })
  }

  private createSandDetails(bounds: THREE.Box3): void {
    // Sand ripples
    const rippleGeometry = new THREE.PlaneGeometry(1, 0.1, 10, 1)
    const rippleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8d5b8,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.3
    })
    
    for (let i = 0; i < 20; i++) {
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
      ripple.rotation.x = -Math.PI / 2
      ripple.rotation.z = Math.random() * Math.PI
      
      const size = new THREE.Vector3()
      bounds.getSize(size)
      
      ripple.position.set(
        (Math.random() - 0.5) * size.x * 0.9,
        bounds.min.y + 0.01,
        (Math.random() - 0.5) * size.z * 0.9
      )
      
      const scale = 0.5 + Math.random() * 2
      ripple.scale.set(scale, 1, scale)
      ripple.userData = {
        role: 'sand-ripple'
      }
      
      this.group.add(ripple)
    }
  }
  
  update(elapsedTime: number): void {
    this.time = elapsedTime
    
    // Animate plant swaying
    this.plants.forEach((plant) => {
      plant.children.forEach((segment, segmentIndex) => {
        if (segment.userData.originalRotation !== undefined) {
          const swayOffset = segment.userData.swayOffset || 0
          const swayAmplitude = segment.userData.swayAmplitude || 0.1
          
          const sway = Math.sin(this.time * 0.8 + swayOffset + segmentIndex * 0.3) * swayAmplitude
          segment.rotation.z = segment.userData.originalRotation + sway
          
          // Add slight x-axis movement
          segment.rotation.x = Math.sin(this.time * 0.5 + swayOffset) * 0.05
        }
      })
    })
  }
  
  private createSeaweedTexture(hue: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const baseColor = new THREE.Color().setHSL(hue, 0.52, 0.34)
    const shadowColor = baseColor.clone().lerp(new THREE.Color('#061d14'), 0.45)
    const highlightColor = baseColor.clone().lerp(new THREE.Color('#d7ffd9'), 0.24)
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const leftBase = canvas.width * 0.18
    const rightBase = canvas.width * 0.82

    const gradient = ctx.createLinearGradient(0, tipY, 0, baseY)
    gradient.addColorStop(0, highlightColor.getStyle())
    gradient.addColorStop(0.38, baseColor.getStyle())
    gradient.addColorStop(1, shadowColor.getStyle())

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(leftBase, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(rightBase, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = shadowColor.clone().multiplyScalar(0.9).getStyle()
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.globalCompositeOperation = 'overlay'
    ctx.strokeStyle = 'rgba(223, 255, 214, 0.4)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < 5; i++) {
      const startY = canvas.height * (0.18 + i * 0.14)
      const offset = (i - 2) * 12
      ctx.strokeStyle = `rgba(7, 43, 24, ${0.18 + i * 0.02})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 34, midX + offset * 1.5, startY + 82)
      ctx.stroke()
    }
    
    ctx.globalCompositeOperation = 'source-over'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    
    return texture
  }
  
  private createSeaweedNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = '#8080ff'
    ctx.fill()

    ctx.strokeStyle = '#6f6fff'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()

    ctx.strokeStyle = '#9494ff'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      const startY = canvas.height * (0.22 + i * 0.16)
      const offset = (i - 1.5) * 16
      ctx.beginPath()
      ctx.moveTo(midX + offset * 0.2, startY)
      ctx.quadraticCurveTo(midX + offset, startY + 28, midX + offset * 1.4, startY + 72)
      ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }
  
  private createSeaweedRoughnessMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const midX = canvas.width * 0.5
    const baseY = canvas.height * 0.98
    const tipY = canvas.height * 0.04
    const roughnessGradient = ctx.createLinearGradient(0, tipY, 0, baseY)

    roughnessGradient.addColorStop(0, '#666666')
    roughnessGradient.addColorStop(0.55, '#8d8d8d')
    roughnessGradient.addColorStop(1, '#b8b8b8')

    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.18, canvas.height * 0.7, canvas.width * 0.38, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.46, canvas.height * 0.09, midX, tipY)
    ctx.quadraticCurveTo(canvas.width * 0.56, canvas.height * 0.12, canvas.width * 0.66, canvas.height * 0.24)
    ctx.quadraticCurveTo(canvas.width * 0.82, canvas.height * 0.72, midX, baseY)
    ctx.closePath()
    ctx.fillStyle = roughnessGradient
    ctx.fill()

    ctx.strokeStyle = '#565656'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(midX, baseY)
    ctx.quadraticCurveTo(canvas.width * 0.48, canvas.height * 0.48, midX, tipY)
    ctx.stroke()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return texture
  }

  setMotionEnabled(enabled: boolean): void {
    // Plants can still sway slightly even when motion is reduced
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        if (!enabled && segment.userData.originalRotation !== undefined) {
          segment.rotation.z = segment.userData.originalRotation
          segment.rotation.x = 0
        }
      })
    })
  }
}
