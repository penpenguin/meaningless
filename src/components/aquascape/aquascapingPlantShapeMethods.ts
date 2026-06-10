/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function createSeaweed(this: any, bounds: THREE.Box3): void {
    if (this.layoutStyle === 'planted') {
      this.createPlantedMasses(bounds, this.layoutSeed)
      return
    }

    if (this.layoutStyle === 'nature-showcase') {
      this.createNatureShowcasePlanting(bounds, this.layoutSeed)
      return
    }
  }

export function createPlantedMasses(this: any, bounds: THREE.Box3, layoutSeed: number): void {
    this.createPlantMassesForLayout(bounds, layoutSeed, 'planted')
  }

export function createNatureShowcasePlanting(this: any, bounds: THREE.Box3, layoutSeed: number): void {
    this.createPlantMassesForLayout(bounds, layoutSeed, 'nature-showcase')
  }

export function createPlantMassesForLayout(this: any, bounds: THREE.Box3, layoutSeed: number, layoutStyle: 'planted' | 'nature-showcase'): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const substrateY = bounds.min.y + 0.42
    const placements = resolveSampledPlantPlacements(layoutStyle, layoutSeed)

    placements.forEach((placement) => {
      const x = THREE.MathUtils.clamp(
        placement.x * size.x,
        bounds.min.x + 0.34,
        bounds.max.x - 0.34
      )
      const z = THREE.MathUtils.clamp(
        placement.z * size.z,
        bounds.min.z + 0.28,
        bounds.max.z - 0.28
      )
      const userData = {
        role: 'planted-mass',
        massRole: placement.massRole,
        anchorId: placement.id,
        zoneId: placement.zoneId,
        clusterKind: placement.clusterKind,
        depthLane: placement.depthLane,
        layer: placement.layer,
        plantType: placement.plantType
      }
      const massGroup = this.cloneFirstAvailableVisualModelGroup(placement.assetIds ?? [], userData)
      if (!massGroup) {
        return
      }
      massGroup.position.set(x, substrateY, z)
      massGroup.rotation.set(placement.tiltX, placement.rotationY, placement.tiltZ)
      massGroup.scale.copy(placement.scale)

      this.plants.push(massGroup)
      this.group.add(massGroup)
    })
  }

export function toneAccentGroup(this: any, group: THREE.Group, tintHex: string, blend: number): void {
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

export function populatePlantCluster(this: any, seaweedGroup: THREE.Group, cluster: Pick<PlantClusterDefinition, 'plantType' | 'layer'>, height: number, hue: number): void {
    switch (getPlantSilhouetteFamily(cluster.plantType)) {
      case 'ribbon':
        this.createRibbonSeaweed(seaweedGroup, cluster.layer, height, hue)
        return
      case 'strap':
        this.createSwordLeafPlant(
          seaweedGroup,
          cluster.layer,
          height,
          hue,
          cluster.plantType as Exclude<PlantType, 'ribbon-seaweed'>
        )
        return
      case 'broad':
        this.createFanLeafPlant(
          seaweedGroup,
          cluster.layer,
          height,
          hue,
          cluster.plantType as Exclude<PlantType, 'ribbon-seaweed'>
        )
        return
      case 'rosette':
        this.createCryptRosettePlant(seaweedGroup, cluster.layer, height, hue)
        return
      case 'moss':
        this.createMossPatchPlant(seaweedGroup, cluster.layer, height, hue)
        return
    }
  }

export function resolveCompanionPlantType(this: any, plantType: PlantType): PlantType | null {
    switch (plantType) {
      case 'ribbon-seaweed':
        return null
      case 'vallisneria-tall':
        return 'stem-green-bush'
      case 'stem-green-bush':
      case 'hygrophila-rear':
      case 'matsumo':
        return 'vallisneria-tall'
      case 'willow-moss':
        return null
      case 'amazon-sword':
        return 'anubias-nana-clump'
      case 'javafern-large':
        return 'anubias-nana-clump'
      case 'javafern-narrow':
        return 'anubias-petite-clump'
      case 'anubias-nana-clump':
        return 'javafern-large'
      case 'anubias-petite-clump':
        return 'javafern-narrow'
      case 'crypt-brown':
        return 'anubias-nana-clump'
      case 'fan-leaf':
        return 'sword-leaf'
      case 'sword-leaf':
        return 'fan-leaf'
    }
  }

export function addPlantMassFiller(this: any, plantGroup: THREE.Group, layer: PlantLayer, height: number, hue: number, plantType: PlantType, includeCompanion: boolean): void {
    this.populatePlantCluster(plantGroup, { layer, plantType }, height, hue)

    if (!includeCompanion || plantType === 'ribbon-seaweed') {
      return
    }

    const companionType = this.resolveCompanionPlantType(plantType)
    if (!companionType) {
      return
    }

    this.populatePlantCluster(
      plantGroup,
      { layer, plantType: companionType },
      height * 0.78,
      hue + (companionType === 'fan-leaf' ? 0.03 : -0.015)
    )
  }

export function createRibbonSeaweed(this: any, seaweedGroup: THREE.Group, layer: PlantLayer, height: number, hue: number): void {
    const frondCount = layer === 'background' ? 12 : 13
    const laneCount = layer === 'background' ? 4 : 5
    const material = this.createSeaweedMaterial(hue, layer)

    for (let j = 0; j < frondCount; j++) {
      const frondHeight = height * (0.72 + Math.random() * 0.28)
      const frondWidth = 0.16 + frondHeight * 0.08 + Math.random() * 0.06
      const bend = (Math.random() - 0.5) * 0.2 + (j - (frondCount - 1) / 2) * 0.04
      const geometry = this.createSeaweedFrondGeometry(frondWidth, frondHeight, bend)
      const frond = new THREE.Mesh(geometry, material)
      const spread = j - (frondCount - 1) / 2
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * 0.085
      
      frond.position.set(
        spread * 0.058 + (Math.random() - 0.5) * 0.04,
        frondHeight / 2,
        laneOffset + spread * 0.014 + (Math.random() - 0.5) * 0.03
      )
      frond.rotation.y = spread * 0.2 + laneOffset * 1.6 + (depthLane % 2 === 0 ? -0.18 : 0.18) + (Math.random() - 0.5) * 0.18
      frond.rotation.z = -0.14 + spread * 0.045 + (Math.random() - 0.5) * 0.1
      frond.rotation.x = laneOffset * 0.36 + (Math.random() - 0.5) * 0.05
      frond.castShadow = true
      frond.receiveShadow = true
      frond.userData = {
        role: 'frond',
        depthLane,
        originalRotation: frond.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.05 + Math.random() * 0.05
      }
      
      seaweedGroup.add(frond)
    }
  }

export function createSwordLeafPlant(this: any, seaweedGroup: THREE.Group, layer: PlantLayer, height: number, hue: number, plantType: Exclude<PlantType, 'ribbon-seaweed'> = 'sword-leaf'): void {
    const isFineStemPlant = plantType === 'stem-green-bush' || plantType === 'hygrophila-rear' || plantType === 'matsumo'
    const leafCount = plantType === 'vallisneria-tall'
      ? layer === 'background' ? 13 : 12
      : isFineStemPlant
        ? layer === 'background' ? 18 : 16
        : plantType === 'crypt-brown'
          ? layer === 'background' ? 15 : 13
          : plantType === 'javafern-narrow'
            ? layer === 'background' ? 14 : 13
            : layer === 'background' ? 16 : 15
    const laneCount = layer === 'background' ? 5 : 5
    const material = this.createLeafMaterial(hue, layer, plantType)

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = plantType === 'vallisneria-tall'
        ? height * (0.88 + Math.random() * 0.22)
        : isFineStemPlant
          ? height * (0.56 + Math.random() * 0.16)
          : plantType === 'crypt-brown'
            ? height * (0.62 + Math.random() * 0.18)
            : plantType === 'javafern-narrow'
              ? height * (0.58 + Math.random() * 0.18)
              : height * (0.78 + Math.random() * 0.22)
      const leafWidth = plantType === 'vallisneria-tall'
        ? 0.14 + Math.random() * 0.04
        : isFineStemPlant
          ? 0.16 + Math.random() * 0.05
          : plantType === 'crypt-brown'
            ? 0.22 + Math.random() * 0.06
            : plantType === 'javafern-narrow'
              ? 0.18 + Math.random() * 0.05
              : 0.24 + Math.random() * 0.08
      const bend = (Math.random() - 0.5) * (plantType === 'vallisneria-tall' ? 0.26 : 0.14) + (j - (leafCount - 1) / 2) * 0.035
      const geometry = this.createSwordLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2
      const pairSign = spread === 0 ? 0 : Math.sign(spread)
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * (isFineStemPlant ? 0.074 : 0.088)

      leaf.position.set(
        spread * (plantType === 'vallisneria-tall' ? 0.04 : 0.054) + pairSign * 0.016 + (Math.random() - 0.5) * 0.03,
        0,
        laneOffset + spread * (plantType === 'crypt-brown' ? 0.022 : 0.016) + (Math.random() - 0.5) * 0.03
      )
      leaf.rotation.y = spread * 0.2 + laneOffset * 2.2 + (depthLane % 2 === 0 ? -0.2 : 0.24) + (Math.random() - 0.5) * 0.14
      leaf.rotation.z = (plantType === 'vallisneria-tall' ? -0.06 : -0.12) + spread * 0.03 + laneOffset * 0.1 + (Math.random() - 0.5) * 0.06
      leaf.rotation.x = laneOffset * 0.38 + (Math.random() - 0.5) * 0.05
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        depthLane,
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.04 + Math.random() * 0.03
      }

      seaweedGroup.add(leaf)
    }
  }

export function createFanLeafPlant(this: any, seaweedGroup: THREE.Group, layer: PlantLayer, height: number, hue: number, plantType: Exclude<PlantType, 'ribbon-seaweed'> = 'fan-leaf'): void {
    const leafCount = plantType === 'anubias-petite-clump'
      ? layer === 'background' ? 9 : 8
      : plantType === 'anubias-nana-clump'
        ? layer === 'background' ? 11 : 10
        : plantType === 'javafern-large'
          ? layer === 'background' ? 13 : 12
          : layer === 'background' ? 14 : 12
    const laneCount = layer === 'background' ? 5 : 4
    const material = this.createLeafMaterial(hue, layer, plantType)

    for (let j = 0; j < leafCount; j++) {
      const leafHeight = plantType === 'anubias-petite-clump'
        ? height * (0.28 + Math.random() * 0.1)
        : plantType === 'anubias-nana-clump'
          ? height * (0.36 + Math.random() * 0.12)
          : plantType === 'javafern-large'
            ? height * (0.54 + Math.random() * 0.14)
            : height * (0.48 + Math.random() * 0.16)
      const leafWidth = plantType === 'anubias-petite-clump'
        ? 0.26 + Math.random() * 0.08
        : plantType === 'anubias-nana-clump'
          ? 0.34 + Math.random() * 0.12
          : plantType === 'javafern-large'
            ? 0.5 + Math.random() * 0.14
            : 0.52 + Math.random() * 0.18
      const bend = (Math.random() - 0.5) * (plantType === 'javafern-large' ? 0.14 : 0.18) + (j - (leafCount - 1) / 2) * 0.06
      const geometry = this.createFanLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const spread = j - (leafCount - 1) / 2
      const pairSign = spread === 0 ? 0 : Math.sign(spread)
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * 0.09

      leaf.position.set(
        spread * 0.044 + pairSign * 0.014 + (Math.random() - 0.5) * 0.028,
        0,
        laneOffset + spread * 0.028 + (Math.random() - 0.5) * 0.032
      )
      leaf.rotation.y = spread * 0.26 + laneOffset * 2.3 + (depthLane % 2 === 0 ? -0.22 : 0.24) + (Math.random() - 0.5) * 0.12
      leaf.rotation.z = -0.24 + pairSign * 0.03 + laneOffset * 0.06 + (Math.random() - 0.5) * 0.08
      leaf.rotation.x = spread * 0.04 + laneOffset * 0.28 + (Math.random() - 0.5) * 0.04
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        depthLane,
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.025 + Math.random() * 0.025
      }

      seaweedGroup.add(leaf)
    }
  }

export function createCryptRosettePlant(this: any, seaweedGroup: THREE.Group, layer: PlantLayer, height: number, hue: number): void {
    const leafCount = 10
    const laneCount = 5
    const material = this.createLeafMaterial(hue, layer, 'crypt-brown')

    for (let j = 0; j < leafCount; j++) {
      const angle = (j / leafCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.22
      const radialOffset = 0.14 + Math.random() * 0.22
      const leafHeight = height * (0.28 + Math.random() * 0.1)
      const leafWidth = 0.38 + Math.random() * 0.14
      const bend = Math.cos(angle) * 0.04 + (Math.random() - 0.5) * 0.06
      const geometry = this.createFanLeafGeometry(leafWidth, leafHeight, bend)
      const leaf = new THREE.Mesh(geometry, material)
      const depthLane = j % laneCount
      const laneOffset = (depthLane - ((laneCount - 1) / 2)) * 0.045

      leaf.position.set(
        Math.cos(angle) * radialOffset,
        0,
        Math.sin(angle) * radialOffset + laneOffset
      )
      leaf.rotation.y = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.32
      leaf.rotation.z = -0.34 + Math.random() * 0.16
      leaf.rotation.x = -0.12 + Math.cos(angle) * 0.06 + (Math.random() - 0.5) * 0.05
      leaf.castShadow = true
      leaf.receiveShadow = true
      leaf.userData = {
        role: 'leaf',
        depthLane,
        originalRotation: leaf.rotation.z,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.02 + Math.random() * 0.015
      }

      seaweedGroup.add(leaf)
    }
  }

export function createMossPatchPlant(this: any, seaweedGroup: THREE.Group, layer: PlantLayer, height: number, hue: number): void {
    const patchCount = layer === 'background' ? 18 : 14
    const material = this.createLeafMaterial(hue, layer, 'willow-moss')

    for (let index = 0; index < patchCount; index += 1) {
      const angle = (index / patchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.36
      const radius = 0.04 + Math.random() * 0.24
      const bladeHeight = height * (0.08 + Math.random() * 0.12)
      const bladeWidth = 0.08 + Math.random() * 0.06
      const geometry = this.createFanLeafGeometry(bladeWidth, bladeHeight, (Math.random() - 0.5) * 0.04)
      const blade = new THREE.Mesh(geometry, material)

      blade.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius * 0.72
      )
      blade.rotation.y = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.28
      blade.rotation.z = -0.78 + (Math.random() - 0.5) * 0.16
      blade.rotation.x = -0.18 + (Math.random() - 0.5) * 0.08
      blade.castShadow = true
      blade.receiveShadow = true
      blade.userData = {
        role: 'moss-frond',
        swayOffset: Math.random() * Math.PI * 2,
        swayAmplitude: 0.012 + Math.random() * 0.01
      }

      seaweedGroup.add(blade)
    }
  }

export function createSeaweedFrondGeometry(this: any, width: number, height: number, bend: number): THREE.PlaneGeometry {
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

export function createSwordLeafGeometry(this: any, width: number, height: number, bend: number): THREE.ShapeGeometry {
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

export function createFanLeafGeometry(this: any, width: number, height: number, bend: number): THREE.ShapeGeometry {
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

export function createSeaweedMaterial(this: any, hue: number, layer: PlantLayer): THREE.MeshPhysicalMaterial {
    const seaweedTexture = this.createSeaweedTexture(hue)
    const normalMap = this.createSeaweedNormalMap()
    const roughnessMap = this.createSeaweedRoughnessMap()
    const profile = this.getPlantMaterialProfile(layer, 'ribbon-seaweed')
    
    const material = new THREE.MeshPhysicalMaterial({
      map: seaweedTexture,
      alphaMap: seaweedTexture,
      normalMap,
      roughnessMap,
      color: new THREE.Color('#ffffff'),
      metalness: 0,
      roughness: profile.roughness,
      transmission: profile.transmission,
      thickness: profile.thickness,
      transparent: profile.transparent,
      opacity: profile.opacity,
      alphaTest: profile.alphaTest,
      side: THREE.DoubleSide,
      envMapIntensity: profile.envMapIntensity,
      clearcoat: profile.clearcoat,
      clearcoatRoughness: profile.clearcoatRoughness
    })
    material.shadowSide = THREE.DoubleSide
    return material
  }
