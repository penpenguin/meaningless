import * as THREE from 'three'
import type { VisualAssetBundle } from '../assets/visualAssets'

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

export class AquascapingSystem {
  private group: THREE.Group
  private plants: THREE.Group[] = []
  private decorations: THREE.Group[] = []
  private time = 0
  private visualAssets: VisualAssetBundle | null
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3, visualAssets: VisualAssetBundle | null = null) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    this.createCorals(bounds)
    this.createRocks(bounds)
    this.createHeroDriftwood(bounds)
    this.createHeroRockRidge(bounds)
    this.createHeroCanopy(bounds)
    this.createHardscapeTransitionDetails(bounds)
    this.createHardscapeShadow(bounds)
    this.createSandDetails(bounds)
  }
  
  private createSeaweed(bounds: THREE.Box3): void {
    const seaweedCount = 18
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const clusters: PlantClusterDefinition[] = [
      { x: -0.34, z: 0.18, layer: 'foreground', plantType: 'ribbon-seaweed', baseHeight: 2.6, spreadX: 0.9, spreadZ: 0.65, hueBase: 0.3 },
      { x: -0.08, z: -0.2, layer: 'background', plantType: 'sword-leaf', baseHeight: 4, spreadX: 0.65, spreadZ: 0.55, hueBase: 0.36 },
      { x: 0.18, z: 0.06, layer: 'midground', plantType: 'fan-leaf', baseHeight: 2.8, spreadX: 0.75, spreadZ: 0.55, hueBase: 0.29 },
      { x: 0.36, z: -0.16, layer: 'background', plantType: 'ribbon-seaweed', baseHeight: 4.6, spreadX: 0.7, spreadZ: 0.5, hueBase: 0.42 },
      { x: 0.04, z: 0.24, layer: 'foreground', plantType: 'sword-leaf', baseHeight: 2.5, spreadX: 0.82, spreadZ: 0.7, hueBase: 0.34 },
      { x: -0.24, z: 0.02, layer: 'midground', plantType: 'fan-leaf', baseHeight: 3.1, spreadX: 0.72, spreadZ: 0.58, hueBase: 0.27 }
    ]
    
    for (let i = 0; i < seaweedCount; i++) {
      const seaweedGroup = new THREE.Group()
      const cluster = clusters[i % clusters.length]
      
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

    const branchMaterial = this.createDriftwoodMaterial()
    const branchDefinitions = [
      {
        radius: 0.18,
        points: [
          new THREE.Vector3(-1.8, 0.15, 0.5),
          new THREE.Vector3(-0.65, 1.55, 0.2),
          new THREE.Vector3(0.85, 2.55, -0.25),
          new THREE.Vector3(2.05, 2.1, -0.7)
        ]
      },
      {
        radius: 0.1,
        points: [
          new THREE.Vector3(-0.2, 1.45, 0.2),
          new THREE.Vector3(0.55, 2.35, 0.65),
          new THREE.Vector3(1.55, 2.85, 0.8)
        ]
      },
      {
        radius: 0.08,
        points: [
          new THREE.Vector3(0.35, 1.35, -0.05),
          new THREE.Vector3(1.15, 2.05, -0.8),
          new THREE.Vector3(1.65, 2.5, -1.2)
        ]
      }
    ]

    branchDefinitions.forEach((definition) => {
      const curve = new THREE.CatmullRomCurve3(definition.points)
      const branch = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, definition.radius, 8, false),
        branchMaterial
      )
      branch.castShadow = true
      branch.receiveShadow = true
      branch.userData = {
        role: 'driftwood-branch'
      }
      driftwoodGroup.add(branch)
    })

    ;[
      {
        radius: 0.04,
        points: [
          new THREE.Vector3(0.22, 1.88, 0.34),
          new THREE.Vector3(0.86, 2.36, 0.54),
          new THREE.Vector3(1.24, 2.72, 0.98)
        ]
      },
      {
        radius: 0.032,
        points: [
          new THREE.Vector3(0.62, 1.76, -0.22),
          new THREE.Vector3(1.18, 2.12, -0.58),
          new THREE.Vector3(1.72, 2.26, -1.04)
        ]
      },
      {
        radius: 0.028,
        points: [
          new THREE.Vector3(-0.48, 1.62, 0.12),
          new THREE.Vector3(-0.06, 2.12, 0.22),
          new THREE.Vector3(0.42, 2.54, 0.3)
        ]
      }
    ].forEach((definition) => {
      const curve = new THREE.CatmullRomCurve3(definition.points)
      const branchlet = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, definition.radius, 6, false),
        branchMaterial
      )
      branchlet.castShadow = true
      branchlet.receiveShadow = true
      branchlet.userData = {
        role: 'driftwood-branchlet'
      }
      driftwoodGroup.add(branchlet)
    })

    ;[
      {
        radius: 0.022,
        points: [
          new THREE.Vector3(-1.32, 0.66, 0.34),
          new THREE.Vector3(-1.18, 0.12, 0.18),
          new THREE.Vector3(-1.06, -0.48, 0.08)
        ]
      },
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(-0.24, 1.02, 0.28),
          new THREE.Vector3(-0.16, 0.32, 0.12),
          new THREE.Vector3(-0.08, -0.4, 0.06)
        ]
      },
      {
        radius: 0.016,
        points: [
          new THREE.Vector3(0.94, 1.24, -0.12),
          new THREE.Vector3(0.98, 0.42, -0.18),
          new THREE.Vector3(1.02, -0.34, -0.24)
        ]
      }
    ].forEach((definition) => {
      const curve = new THREE.CatmullRomCurve3(definition.points)
      const root = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, definition.radius, 5, false),
        branchMaterial
      )
      root.castShadow = true
      root.receiveShadow = true
      root.userData = {
        role: 'driftwood-root'
      }
      driftwoodGroup.add(root)
    })

    ;[
      { offset: new THREE.Vector3(-0.25, 1.15, 0.32), hue: 0.29 },
      { offset: new THREE.Vector3(0.72, 1.95, 0.58), hue: 0.33 },
      { offset: new THREE.Vector3(1.02, 1.55, -0.42), hue: 0.26 }
    ].forEach((attachment) => {
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

    ;[
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
    ].forEach((definition) => {
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

    ;[
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
    ].forEach((definition) => {
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

    ;[
      { position: new THREE.Vector3(-1.36, -0.06, 0.74), scale: 0.24, color: '#7a7264' },
      { position: new THREE.Vector3(-0.54, -0.12, 0.88), scale: 0.18, color: '#93886f' },
      { position: new THREE.Vector3(0.38, -0.08, 0.54), scale: 0.22, color: '#665f55' },
      { position: new THREE.Vector3(1.04, -0.1, -0.68), scale: 0.2, color: '#847a67' },
      { position: new THREE.Vector3(1.56, -0.06, -0.12), scale: 0.16, color: '#a09681' }
    ].forEach((definition, index) => {
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

    ;[
      {
        position: new THREE.Vector3(center.x - size.x * 0.04, bounds.min.y + 0.42, center.z - size.z * 0.18),
        rotationY: -0.18,
        scale: new THREE.Vector3(0.92, 1.18, 0.92),
        plantType: 'sword-leaf' as const,
        height: 6.2,
        hue: 0.35
      },
      {
        position: new THREE.Vector3(center.x + size.x * 0.2, bounds.min.y + 0.42, center.z - size.z * 0.12),
        rotationY: 0.24,
        scale: new THREE.Vector3(0.82, 1.28, 0.82),
        plantType: 'ribbon-seaweed' as const,
        height: 6.8,
        hue: 0.42
      },
      {
        position: new THREE.Vector3(center.x + size.x * 0.06, bounds.min.y + 0.42, center.z - size.z * 0.24),
        rotationY: -0.36,
        scale: new THREE.Vector3(0.86, 1.1, 0.86),
        plantType: 'sword-leaf' as const,
        height: 5.7,
        hue: 0.31
      }
    ].forEach((definition) => {
      const canopyGroup = new THREE.Group()
      canopyGroup.position.copy(definition.position)
      canopyGroup.rotation.y = definition.rotationY
      canopyGroup.scale.copy(definition.scale)
      canopyGroup.userData = {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.plantType
      }

      if (definition.plantType === 'sword-leaf') {
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

  private createDriftwoodMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map: this.getVisualTexture('driftwood-diffuse'),
      color: new THREE.Color('#6f5641'),
      roughnessMap: this.getVisualTexture('driftwood-roughness'),
      roughness: 0.96,
      metalness: 0.03
    })
  }

  private createRockMaterial(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: this.getVisualTexture('rock-diffuse'),
      roughnessMap: this.getVisualTexture('rock-roughness'),
      color: new THREE.Color(color),
      metalness: 0.04,
      roughness: 0.9,
      clearcoat: 0.08
    })
  }
  
  private createCorals(bounds: THREE.Box3): void {
    const coralCount = 8
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < coralCount; i++) {
      const coralGroup = new THREE.Group()
      
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
    const rockCount = 12
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const anchors = [
      { x: 0.18, z: -0.06, role: 'hero-rock', scale: 1.24, geometry: 'dodecahedron' },
      { x: -0.14, z: 0.18, role: 'support-rock', scale: 0.94, geometry: 'icosahedron' },
      { x: 0.34, z: 0.12, role: 'support-rock', scale: 0.76, geometry: 'octahedron' }
    ] as const
    
    for (let i = 0; i < rockCount; i++) {
      const anchor = anchors[i % anchors.length]
      const rockScale = i === 0 ? anchor.scale : 0.32 + Math.random() * 0.62
      
      const geometry = anchor.geometry === 'icosahedron'
        ? new THREE.IcosahedronGeometry(rockScale, 0)
        : anchor.geometry === 'octahedron'
          ? new THREE.OctahedronGeometry(rockScale * 0.92, 0)
          : new THREE.DodecahedronGeometry(rockScale)
      
      // Deform the geometry for natural look
      const positionAttribute = geometry.getAttribute('position')
      for (let j = 0; j < positionAttribute.count; j++) {
        const vertex = new THREE.Vector3()
        vertex.fromBufferAttribute(positionAttribute, j)
        
        const noise = (Math.random() - 0.5) * (i === 0 ? 0.18 : 0.3)
        vertex.multiplyScalar(1 + noise)
        
        positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z)
      }
      geometry.computeVertexNormals()
      
      const material = this.createRockMaterial(
        new THREE.Color().setHSL(
          0.1 + Math.random() * 0.1,
          0.2 + Math.random() * 0.3,
          0.2 + Math.random() * 0.3
        ).getStyle()
      )
      
      const rock = new THREE.Mesh(geometry, material)
      
      const x = i === 0
        ? anchor.x * size.x
        : THREE.MathUtils.clamp(
            anchor.x * size.x + (Math.random() - 0.5) * 1.2,
            bounds.min.x + 0.45,
            bounds.max.x - 0.45
          )
      const z = i === 0
        ? anchor.z * size.z
        : THREE.MathUtils.clamp(
            anchor.z * size.z + (Math.random() - 0.5) * 0.9,
            bounds.min.z + 0.4,
            bounds.max.z - 0.4
          )
      const y = bounds.min.y + 0.42 + rockScale * (i === 0 ? 0.22 : 0.1)  // 砂層の上に配置
      
      rock.position.set(x, y, z)
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      if (i === 0) {
        rock.scale.set(1.2, 0.86, 1.35)
      }
      
      rock.castShadow = true
      rock.receiveShadow = true
      rock.userData = {
        role: i === 0 ? 'hero-rock' : anchor.role
      }
      
      this.decorations.push(new THREE.Group().add(rock))
      this.group.add(rock)
    }
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
    const center = new THREE.Vector3()
    bounds.getCenter(center)

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
      center.x + size.x * 0.12,
      bounds.min.y + 0.26,
      center.z - size.z * 0.04
    )
    berm.receiveShadow = true
    berm.userData = {
      role: 'hardscape-transition-berm'
    }
    this.group.add(berm)

    ;[
      { offset: new THREE.Vector3(-1.48, 0.02, 0.92), scale: 0.18, color: '#8a7c68' },
      { offset: new THREE.Vector3(-0.86, 0.05, 0.62), scale: 0.14, color: '#9a8b75' },
      { offset: new THREE.Vector3(-0.08, 0.03, 0.46), scale: 0.16, color: '#756959' },
      { offset: new THREE.Vector3(0.74, 0.04, 0.1), scale: 0.13, color: '#a09076' },
      { offset: new THREE.Vector3(1.34, 0.02, -0.34), scale: 0.17, color: '#6c6255' },
      { offset: new THREE.Vector3(1.82, 0.03, -0.8), scale: 0.12, color: '#91826e' }
    ].forEach((definition, index) => {
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
