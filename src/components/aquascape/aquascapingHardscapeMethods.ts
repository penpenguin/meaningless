/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function createHeroRockRidge(this: any, bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const ridgeGroup = new THREE.Group()
    if (this.layoutStyle === 'nature-showcase') {
      ridgeGroup.position.set(
        center.x - size.x * 0.384,
        bounds.min.y + 0.12,
        center.z - size.z * 0.06
      )
      ridgeGroup.rotation.set(-0.12, 0.34, 0.04)
    } else {
      ridgeGroup.position.set(
        center.x + size.x * 0.182,
        bounds.min.y + 0.58,
        center.z - size.z * 0.112
      )
      ridgeGroup.rotation.y = -0.28
    }
    ridgeGroup.userData = {
      role: 'hero-rock-ridge'
    }

    const ridgeAsset = this.cloneVisualModelGroup('rock-ridge-hero', {
      role: 'hero-rock-ridge'
    })
    if (ridgeAsset) {
      ridgeAsset.position.copy(ridgeGroup.position)
      ridgeAsset.rotation.copy(ridgeGroup.rotation)
      ridgeAsset.scale.set(
        this.layoutStyle === 'nature-showcase' ? 0.48 : 1.18,
        this.layoutStyle === 'nature-showcase' ? 0.44 : 1.12,
        this.layoutStyle === 'nature-showcase' ? 0.54 : 1.18
      )
      this.attachHardscapePlants(ridgeAsset, 'rock')
      this.hardscapeGroups.push(ridgeAsset)
      this.group.add(ridgeAsset)
      return
    }
  }

export function createHeroCanopy(this: any, bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const canopyDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          position: new THREE.Vector3(center.x - size.x * 0.35, bounds.min.y + 0.42, center.z - size.z * 0.24),
          rotationY: -0.46,
          scale: new THREE.Vector3(0.58, 0.9, 0.54),
          assetId: 'plant-vallisneria-tall',
          plantType: 'vallisneria-tall' as const,
          height: 5.1,
          hue: 0.24
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.28, bounds.min.y + 0.42, center.z - size.z * 0.1),
          rotationY: -0.3,
          scale: new THREE.Vector3(1.04, 1.36, 0.96),
          assetId: 'plant-amazon-sword',
          plantType: 'javafern-large' as const,
          height: 5.9,
          hue: 0.286
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.18, bounds.min.y + 0.42, center.z),
          rotationY: 0.04,
          scale: new THREE.Vector3(0.92, 1.24, 0.86),
          assetId: 'plant-matsumo',
          plantType: 'javafern-narrow' as const,
          height: 5.5,
          hue: 0.28
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.24, bounds.min.y + 0.42, center.z + size.z * 0.04),
          rotationY: -0.08,
          scale: new THREE.Vector3(0.84, 1.02, 0.8),
          assetId: 'plant-willow-moss',
          plantType: 'anubias-nana-clump' as const,
          height: 4,
          hue: 0.262
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.12, bounds.min.y + 0.42, center.z + size.z * 0.1),
          rotationY: 0.12,
          scale: new THREE.Vector3(0.72, 0.88, 0.68),
          assetId: 'plant-willow-moss',
          plantType: 'anubias-petite-clump' as const,
          height: 3.3,
          hue: 0.268
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.16, bounds.min.y + 0.42, center.z - size.z * 0.14),
          rotationY: 0.2,
          scale: new THREE.Vector3(0.6, 0.78, 0.58),
          assetId: 'plant-amazon-sword',
          plantType: 'crypt-brown' as const,
          height: 3.6,
          hue: 0.062
        }
      ]
      : [
        {
          position: new THREE.Vector3(center.x - size.x * 0.25, bounds.min.y + 0.42, center.z - size.z * 0.2),
          rotationY: -0.42,
          scale: new THREE.Vector3(1.14, 2.22, 1.08),
          assetId: 'plant-vallisneria-tall',
          plantType: 'vallisneria-tall' as const,
          height: 9.4,
          hue: 0.24
        },
        {
          position: new THREE.Vector3(center.x - size.x * 0.1, bounds.min.y + 0.42, center.z - size.z * 0.26),
          rotationY: -0.16,
          scale: new THREE.Vector3(1.06, 1.94, 1.02),
          assetId: 'plant-hygrophila-rear',
          plantType: 'stem-green-bush' as const,
          height: 8.2,
          hue: 0.27
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.02, bounds.min.y + 0.42, center.z - size.z * 0.32),
          rotationY: -0.02,
          scale: new THREE.Vector3(1.18, 2.12, 1.16),
          assetId: 'plant-amazon-sword',
          plantType: 'javafern-large' as const,
          height: 9.1,
          hue: 0.29
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.12, bounds.min.y + 0.42, center.z - size.z * 0.24),
          rotationY: 0.16,
          scale: new THREE.Vector3(1.02, 1.9, 0.96),
          assetId: 'plant-hygrophila-rear',
          plantType: 'hygrophila-rear' as const,
          height: 7.9,
          hue: 0.274
        },
        {
          position: new THREE.Vector3(center.x + size.x * 0.28, bounds.min.y + 0.42, center.z - size.z * 0.21),
          rotationY: 0.3,
          scale: new THREE.Vector3(0.98, 2.08, 0.86),
          assetId: 'plant-hygrophila-rear',
          plantType: 'stem-green-bush' as const,
          height: 8.8,
          hue: 0.282
        }
      ]
    canopyDefinitions.forEach((definition) => {
      const assetCanopy = this.cloneVisualModelGroup(definition.assetId, {
        role: 'hero-canopy',
        layer: 'background',
        plantType: definition.plantType
      })
      if (!assetCanopy) {
        return
      }
      assetCanopy.position.copy(definition.position)
      assetCanopy.rotation.y = definition.rotationY
      assetCanopy.scale.copy(definition.scale)
      this.plants.push(assetCanopy)
      this.group.add(assetCanopy)
    })
  }

export function attachHardscapePlants(this: any, parentGroup: THREE.Group, host: HardscapePlantHost): void {
    const anchors = resolveHardscapePlantAnchors(this.layoutStyle).filter((anchor) => anchor.host === host)

    anchors.forEach((anchor) => {
      const userData = {
        role: 'epiphyte-cluster',
        massRole: anchor.massRole,
        layer: anchor.layer,
        plantType: anchor.plantType,
        anchorId: anchor.id
      }
      const cluster = this.cloneFirstAvailableVisualModelGroup(anchor.assetIds ?? [], userData)
      if (!cluster) {
        return
      }

      cluster.userData = {
        ...cluster.userData,
        ...userData
      }
      cluster.position.copy(anchor.position)
      cluster.rotation.copy(anchor.rotation)
      cluster.scale.copy(anchor.scale)
      parentGroup.add(cluster)
      this.plants.push(cluster)
    })
  }

export function createEpiphyteCluster(this: any, plantType: Exclude<PlantType, 'ribbon-seaweed'>, hue: number, layer: PlantLayer = 'midground'): THREE.Group {
    const cluster = new THREE.Group()
    cluster.userData = {
      role: 'epiphyte-cluster',
      layer,
      plantType
    }
    const baseHeight = plantType === 'anubias-petite-clump'
      ? 1.18
      : plantType === 'anubias-nana-clump'
        ? 1.54
        : plantType === 'javafern-large'
          ? 2.12
          : plantType === 'willow-moss'
            ? 0.74
            : 1.78
    this.populatePlantCluster(cluster, { plantType, layer }, baseHeight, hue)
    cluster.scale.multiplyScalar(
      plantType === 'anubias-petite-clump'
        ? 0.22
        : plantType === 'anubias-nana-clump'
          ? 0.24
          : plantType === 'javafern-large'
            ? 0.28
            : plantType === 'willow-moss'
              ? 0.18
              : 0.24
    )
    cluster.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return
      }
      child.userData = {
        ...child.userData,
        role: 'epiphyte-leaf'
      }
    })

    return cluster
  }

export function createDriftwoodTubeMesh(this: any, definition: DriftwoodTubeDefinition, material: THREE.Material, role:
      | 'driftwood-trunk'
      | 'driftwood-trunk-extender'
      | 'driftwood-branch-attachment'
      | 'driftwood-root'
      | 'driftwood-fine-twig'): THREE.Mesh {
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

export function deformDriftwoodTubeGeometry(this: any, geometry: THREE.TubeGeometry, curve: THREE.CatmullRomCurve3, definition: DriftwoodTubeDefinition): void {
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

export function createDriftwoodMaterial(this: any): THREE.MeshPhysicalMaterial {
    return this.createDriftwoodReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6f5641')
    }))
  }

export function createDriftwoodBurialDetails(this: any, bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const driftwoodGroup = this.group.children.find(
      (child): child is THREE.Group => child instanceof THREE.Group && child.userData.role === 'hero-driftwood'
    )
    if (!driftwoodGroup) return

    const burialShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(
        size.x * (this.layoutStyle === 'nature-showcase' ? 0.26 : 0.23),
        size.z * (this.layoutStyle === 'nature-showcase' ? 0.2 : 0.18)
      ),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#102026'),
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
    )
    burialShadow.rotation.x = -Math.PI / 2
    burialShadow.position.set(
      this.layoutStyle === 'nature-showcase' ? -2.04 : -1.86,
      0.02,
      this.layoutStyle === 'nature-showcase' ? 0.76 : 0.7
    )
    burialShadow.userData = {
      role: 'driftwood-burial-shadow'
    }
    driftwoodGroup.add(burialShadow)

  }

export function ensureAoUv2(this: any, mesh: THREE.Mesh): void {
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

export function createRockMaterial(this: any, color: string, userData: Record<string, unknown> = {}): THREE.MeshPhysicalMaterial {
    return this.createRockReplacementMaterial(new THREE.MeshStandardMaterial({
      color: new THREE.Color(color)
    }), userData)
  }

export function createRockClusterMesh(this: any, pieceDefinition: RockClusterPieceDefinition): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.createDeformedRockGeometry(
        pieceDefinition.geometry,
        pieceDefinition.radius,
        pieceDefinition.detail,
        pieceDefinition.seed
      ),
      this.createRockMaterial(pieceDefinition.color, { role: pieceDefinition.role })
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

export function createDeformedRockGeometry(this: any, shape: RockClusterShape, radius: number, detail: number, seed: number): THREE.BufferGeometry {
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

export function createFallbackSupportRockGroup(this: any, role: 'hero-rock' | 'support-rock' | 'support-rock-chip', pieceDefinitions: RockClusterPieceDefinition[]): THREE.Group {
    const rockGroup = new THREE.Group()
    rockGroup.userData = {
      role
    }

    pieceDefinitions.forEach((pieceDefinition) => {
      rockGroup.add(this.createRockClusterMesh(pieceDefinition))
    })

    return rockGroup
  }

export function sinkObjectIntoSubstrate(this: any, object: THREE.Object3D, surfaceY: number, burialRatio: number): void {
    object.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3().setFromObject(object)
    const height = Math.max(bounds.max.y - bounds.min.y, 0.001)
    const targetBottomY = surfaceY - height * burialRatio
    object.position.y += targetBottomY - bounds.min.y
  }

export function createSupportRockCluster(this: any, definition: SupportRockClusterDefinition, surfaceY: number): THREE.Group {
    const clusterGroup = new THREE.Group()
    clusterGroup.position.copy(definition.position)
    clusterGroup.userData = {
      role: 'support-rock-cluster',
      side: definition.side
    }

    definition.elements.forEach((element) => {
      const clusterElement = element.role === 'support-rock-scatter'
        ? this.cloneFirstAvailableVisualModelGroup(element.assetIds, { role: element.role })
          ?? this.createFallbackPebbleCluster(
            element.fallbackPebbleSeed ?? 0,
            element.fallbackPebbleColors ?? ['#867d70', '#968c7d', '#756c60']
          )
        : this.cloneFirstAvailableVisualModelGroup(element.assetIds, { role: element.role })
          ?? this.createFallbackSupportRockGroup(element.role, element.fallbackPieceDefinitions ?? [])

      clusterElement.position.set(element.offset.x, 0, element.offset.z)
      clusterElement.rotation.copy(element.rotation)
      clusterElement.scale.copy(element.scale)
      clusterGroup.add(clusterElement)
      this.sinkObjectIntoSubstrate(clusterElement, surfaceY, element.burialRatio)
    })

    return clusterGroup
  }

export function createFallbackPebbleCluster(this: any, seed: number, colors: string[]): THREE.Group {
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

export function createHardscapeShadow(this: any, bounds: THREE.Box3): void {
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
    if (this.layoutStyle === 'nature-showcase') {
      shadow.position.set(-1.48, bounds.min.y + 0.02, -0.04)
      shadow.scale.set(1.12, 1, 0.92)
    } else {
      shadow.position.set(0.94, bounds.min.y + 0.02, -0.16)
    }
    shadow.userData = {
      role: 'hero-hardscape-shadow'
    }
    this.group.add(shadow)
  }
