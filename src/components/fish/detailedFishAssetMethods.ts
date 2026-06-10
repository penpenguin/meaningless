/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BoidsSystem } from '../../utils/fish/Boids'
import { getFishContent, getFishContentList } from '../../content/registry'
import { resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors, resolveSubstratePlantAnchors } from '../aquascape/Aquascaping'
import { createFishSafeBounds, resolveFishAxisExtents } from '../../utils/layout/sceneBounds'
import { DEFAULT_ORIENTATION_CORRECTION, FISH_SAFE_PADDING_BY_PATH, LOCOMOTION_PROFILES, createFishVariants as createFishVariantDefinitions, resolveDefaultFishCount as resolveDefaultFishCountRule, resolveHeroAccentDepthMultiplier as resolveHeroAccentDepthMultiplierRule, resolveHeroAccentScaleMultiplier as resolveHeroAccentScaleMultiplierRule, resolveHeroPlacements as resolveHeroPlacementRules, resolveHeroPriorityMultiplier as resolveHeroPriorityMultiplierRule, resolveLocomotionProfile, resolvePreferredDepthBand, resolvePreferredLateralLane } from './fishPresentation'

export function resolveHeroPlacements(this: any): Array<{
    lateralOffset: number
    verticalOffset: number
    depthOffset: number
    scaleMultiplier: number
  }> {
    return resolveHeroPlacementRules(this.layoutStyle)
  }

export function resolveHeroPriorityMultiplier(this: any, variant?: FishVariant): number {
    return resolveHeroPriorityMultiplierRule(this.layoutStyle, variant, this.hasAuthoredHeroAsset(variant))
  }

export function hasAuthoredHeroAsset(this: any, variant?: FishVariant): boolean {
    return (this.getVisualModel(variant?.heroModelId)?.animations?.length ?? 0) > 0
  }

export function resolveHeroAccentScaleMultiplier(this: any, variant: FishVariant): number {
    return resolveHeroAccentScaleMultiplierRule(this.layoutStyle, variant)
  }

export function resolveHeroAccentDepthMultiplier(this: any, variant: FishVariant): number {
    return resolveHeroAccentDepthMultiplierRule(this.layoutStyle, variant)
  }

export function createFishAssetMaterial(this: any, baseMaterial: THREE.Material, variant: FishVariant, hero: boolean): THREE.MeshPhysicalMaterial {
    const texturedMaterial = baseMaterial as THREE.MeshStandardMaterial & {
      clearcoat?: number
      clearcoatRoughness?: number
      envMapIntensity?: number
      alphaMap?: THREE.Texture | null
    }
    const resolvedMap =
      texturedMaterial.map ??
      this.getVisualTexture(variant.baseColorTextureId) ??
      this.getVisualTexture(variant.patternTextureId)
    const resolvedAlphaMap = texturedMaterial.alphaMap ?? this.getVisualTexture(variant.alphaTextureId)
    const resolvedNormalMap =
      texturedMaterial.normalMap ??
      this.getVisualTexture(variant.normalTextureId) ??
      this.getGenericFishDetailTexture('normal')
    const resolvedRoughnessMap =
      texturedMaterial.roughnessMap ??
      this.getVisualTexture(variant.roughnessTextureId) ??
      this.getGenericFishDetailTexture('roughness')
    const materialResponse = this.resolveFishMaterialResponse(variant, hero)
    const resolvedAlphaTest = Math.max(texturedMaterial.alphaTest ?? 0, resolvedAlphaMap ? 0.05 : 0)
    const transparent = hero
      ? texturedMaterial.transparent || !!resolvedAlphaMap
      : texturedMaterial.transparent

    return new THREE.MeshPhysicalMaterial({
      map: resolvedMap,
      alphaMap: resolvedAlphaMap,
      normalMap: resolvedNormalMap,
      normalScale: materialResponse.normalScale,
      roughnessMap: resolvedRoughnessMap,
      color: texturedMaterial.color?.clone() ?? new THREE.Color(0xffffff),
      metalness: materialResponse.metalness,
      roughness: materialResponse.roughness,
      clearcoat: Math.max(materialResponse.clearcoat, texturedMaterial.clearcoat ?? 0),
      clearcoatRoughness: Math.min(materialResponse.clearcoatRoughness, texturedMaterial.clearcoatRoughness ?? materialResponse.clearcoatRoughness),
      reflectivity: materialResponse.reflectivity,
      envMapIntensity: hero
        ? materialResponse.envMapIntensity
        : Math.min(materialResponse.envMapIntensity, Math.max(0.52, texturedMaterial.envMapIntensity ?? materialResponse.envMapIntensity)),
      transparent,
      alphaTest: resolvedAlphaTest,
      side: texturedMaterial.side ?? THREE.FrontSide
    })
  }

export function clearMeshes(this: any): void {
    const heroFishMeshes = this.heroFishMeshes ?? []
    this.instancedMeshes.forEach((mesh) => {
      this.group.remove(mesh)
      if (!(mesh.geometry.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) {
        mesh.geometry.dispose()
      }
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => {
          this.disposeMaterialTextures(material)
          material.dispose()
        })
      } else if (mesh.material instanceof THREE.Material) {
        this.disposeMaterialTextures(mesh.material)
        mesh.material.dispose()
      }
    })
    this.instancedMeshes = []

    heroFishMeshes.forEach((object) => {
      this.group.remove(object)
      object.traverse((child) => {
        const mesh = child as THREE.Mesh
        const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
        if (!(mesh instanceof THREE.Mesh)) return

        if (!(mesh.geometry.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) {
          mesh.geometry.dispose()
        }

        if (Array.isArray(material)) {
          material.forEach((entry) => {
            this.disposeMaterialTextures(entry)
            entry.dispose()
          })
          return
        }

        if (material instanceof THREE.Material) {
          this.disposeMaterialTextures(material)
          material.dispose()
        }
      })
    })
    this.heroFishMeshes = []
    this.heroAssignments?.clear()
    this.instancedTailMotionUniforms = []
  }

export function mapGroupsToVariantCounts(this: any, groups: FishGroup[]): number[] {
    const counts = new Array(this.variants.length).fill(0)
    groups.forEach((group) => {
      const index = this.resolveVariantIndex(group.speciesId)
      counts[index] += group.count
    })
    return counts
  }

export function resolveVariantIndex(this: any, speciesId: string): number {
    const species = getFishContent(speciesId) ?? getFishContentList()[0]
    if (!species) return this.safeVariantIndex('neon')

    const archetype = species.render.archetype
    if (archetype === 'Neon') return this.safeVariantIndex('neon')
    if (archetype === 'Tropical') return this.safeVariantIndex('tropical')
    if (archetype === 'Angelfish') return this.safeVariantIndex('angelfish')
    if (archetype === 'Butterflyfish') return this.safeVariantIndex('butterflyfish')
    if (archetype === 'Goldfish') return this.safeVariantIndex('goldfish')
    if (archetype === 'AbeniPuffer') return this.safeVariantIndex('abenipuffer')
    if (archetype === 'Corydoras') return this.safeVariantIndex('corydoras')
    if (archetype === 'AfricanLampeye') return this.safeVariantIndex('africanlampeye')
    if (archetype === 'RasboraHeteromorpha') return this.safeVariantIndex('rasboraheteromorpha')
    if (archetype === 'YamatoShrimp') return this.safeVariantIndex('yamatoshrimp')
    return this.safeVariantIndex('neon')
  }

export function safeVariantIndex(this: any, name: string): number {
    const index = this.variants.findIndex((variant) => variant.name.toLowerCase() === name)
    return index >= 0 ? index : 0
  }

export function createDetailedFishGeometry(this: any, variant: FishVariant): THREE.BufferGeometry {
    const silhouette = this.resolveSilhouette(variant)

    const tailRootX = -silhouette.bodyLength * 0.48
    const bodyShoulderX = silhouette.bodyLength * 0.06
    const noseX = silhouette.bodyLength * 0.5 + silhouette.noseLength
    const upperCurveHeight = silhouette.bodyHeight * silhouette.topFullness
    const lowerCurveHeight = silhouette.bodyHeight * silhouette.bellyFullness

    // メインボディ
    const bodyShape = new THREE.Shape()
    bodyShape.moveTo(tailRootX, 0)
    bodyShape.bezierCurveTo(
      tailRootX + (silhouette.bodyLength * 0.18),
      upperCurveHeight,
      bodyShoulderX,
      silhouette.bodyHeight,
      noseX - (silhouette.noseLength * 0.22),
      silhouette.bodyHeight * 0.18
    )
    bodyShape.quadraticCurveTo(
      noseX,
      0,
      noseX - (silhouette.noseLength * 0.26),
      -silhouette.bodyHeight * 0.16
    )
    bodyShape.bezierCurveTo(
      bodyShoulderX,
      -lowerCurveHeight,
      tailRootX + (silhouette.bodyLength * 0.12),
      -silhouette.bodyHeight,
      tailRootX,
      0
    )
    
    const extrudeSettings = {
      depth: silhouette.bodyThickness,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03
    }
    
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings)
    
    // 尾ひれ
    const tailShape = new THREE.Shape()
    tailShape.moveTo(tailRootX + 0.06, silhouette.tailHeight * 0.16)
    tailShape.lineTo(tailRootX - silhouette.tailLength, silhouette.tailHeight * 0.54)
    tailShape.lineTo(tailRootX - (silhouette.tailLength * 0.58), 0)
    tailShape.lineTo(tailRootX - silhouette.tailLength, -silhouette.tailHeight * 0.54)
    tailShape.lineTo(tailRootX + 0.06, -silhouette.tailHeight * 0.16)
    tailShape.closePath()
    const tailGeometry = new THREE.ExtrudeGeometry(tailShape, {
      depth: Math.max(0.08, silhouette.bodyThickness * 0.3),
      bevelEnabled: false,
      steps: 1
    })
    
    // 胸ひれ
    const pectoralFinGeometry = new THREE.ConeGeometry(
      Math.max(0.05, silhouette.bodyHeight * 0.22),
      silhouette.pectoralLength,
      4
    )
    pectoralFinGeometry.rotateZ(-Math.PI / 3)
    pectoralFinGeometry.rotateY(Math.PI / 6)
    pectoralFinGeometry.translate(
      silhouette.bodyLength * 0.08,
      silhouette.bodyHeight * 0.38,
      silhouette.bodyThickness * 0.4
    )
    
    const pectoralFinGeometry2 = pectoralFinGeometry.clone()
    pectoralFinGeometry2.translate(
      0,
      -silhouette.bodyHeight * 0.76,
      -silhouette.bodyThickness * 0.8
    )
    
    // 背びれ
    const dorsalFinGeometry = new THREE.ConeGeometry(
      Math.max(0.06, silhouette.bodyHeight * 0.18),
      silhouette.dorsalHeight,
      5
    )
    dorsalFinGeometry.rotateX(Math.PI / 2)
    dorsalFinGeometry.translate(
      silhouette.bodyLength * 0.04,
      silhouette.bodyHeight * 0.42 + (silhouette.dorsalHeight * 0.28),
      0
    )
    
    // 腹びれ
    const ventralFinGeometry = new THREE.ConeGeometry(
      Math.max(0.04, silhouette.bodyHeight * 0.12),
      silhouette.ventralHeight,
      4
    )
    ventralFinGeometry.rotateX(-Math.PI / 2)
    ventralFinGeometry.translate(
      silhouette.bodyLength * 0.02,
      -(silhouette.bodyHeight * 0.34) - (silhouette.ventralHeight * 0.36),
      0
    )
    
    // ジオメトリを結合
    const geometries = [
      bodyGeometry,
      tailGeometry,
      pectoralFinGeometry,
      pectoralFinGeometry2,
      dorsalFinGeometry,
      ventralFinGeometry
    ]

    const nonIndexedGeometries = geometries.map(geometry =>
      geometry.index ? geometry.toNonIndexed() : geometry
    )

    let mergedGeometry = BufferGeometryUtils.mergeGeometries(nonIndexedGeometries)
    if (!mergedGeometry) {
      // Fallback to body geometry only on failure
      mergedGeometry = bodyGeometry
    }

    // スケールを適用
    mergedGeometry.center()
    mergedGeometry.scale(variant.scale, variant.scale, variant.scale)
    mergedGeometry.computeVertexNormals()

    return mergedGeometry
  }

export function createEmergencyFishTexture(this: any, variant: FishVariant): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      return texture
    }

    const width = canvas.width
    const height = canvas.height
    const dorsalColor = variant.primaryColor.clone().multiplyScalar(0.58)
    const midColor = variant.primaryColor.clone().lerp(variant.secondaryColor, 0.28)
    const bellyColor = variant.secondaryColor.clone().lerp(new THREE.Color('#f5f6ea'), 0.52)

    ctx.clearRect(0, 0, width, height)
    const baseGradient = ctx.createLinearGradient(0, 0, 0, height)
    baseGradient.addColorStop(0, dorsalColor.getStyle())
    baseGradient.addColorStop(0.42, midColor.getStyle())
    baseGradient.addColorStop(1, bellyColor.getStyle())
    ctx.fillStyle = baseGradient
    ctx.fillRect(0, 0, width, height)

    ctx.globalAlpha = 0.18
    for (let i = -height; i < width; i += 22) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + height * 0.42, height)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const bodyGradient = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.9)
    bodyGradient.addColorStop(0, variant.primaryColor.clone().multiplyScalar(0.92).getStyle())
    bodyGradient.addColorStop(0.55, variant.primaryColor.clone().lerp(variant.secondaryColor, 0.18).getStyle())
    bodyGradient.addColorStop(1, variant.secondaryColor.clone().lerp(new THREE.Color('#fff8e8'), 0.6).getStyle())
    ctx.fillStyle = bodyGradient
    ctx.fillRect(width * 0.06, height * 0.14, width * 0.88, height * 0.72)

    const species = variant.name.toLowerCase()
    if (species === 'neon') {
      ctx.fillStyle = 'rgba(18, 224, 255, 0.9)'
      ctx.fillRect(width * 0.08, height * 0.42, width * 0.68, height * 0.09)
      ctx.fillStyle = 'rgba(255, 82, 162, 0.72)'
      ctx.fillRect(width * 0.44, height * 0.5, width * 0.34, height * 0.12)
      const tailGradient = ctx.createLinearGradient(width * 0.72, 0, width * 0.94, 0)
      tailGradient.addColorStop(0, 'rgba(93, 157, 255, 0.18)')
      tailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)')
      ctx.fillStyle = tailGradient
      ctx.fillRect(width * 0.72, height * 0.28, width * 0.2, height * 0.38)
    } else if (species === 'angelfish') {
      ctx.fillStyle = 'rgba(36, 44, 64, 0.55)'
      ;[0.22, 0.38, 0.56].forEach((offset) => {
        ctx.fillRect(width * offset, height * 0.16, width * 0.05, height * 0.72)
      })
      ctx.fillStyle = 'rgba(245, 250, 255, 0.26)'
      ctx.fillRect(width * 0.18, height * 0.04, width * 0.16, height * 0.16)
      ctx.fillRect(width * 0.26, height * 0.8, width * 0.18, height * 0.14)
    } else if (species === 'goldfish') {
      const warmGradient = ctx.createLinearGradient(width * 0.08, 0, width * 0.86, 0)
      warmGradient.addColorStop(0, 'rgba(255, 213, 143, 0.92)')
      warmGradient.addColorStop(0.45, 'rgba(255, 155, 74, 0.84)')
      warmGradient.addColorStop(1, 'rgba(255, 108, 46, 0.72)')
      ctx.fillStyle = warmGradient
      ctx.fillRect(width * 0.08, height * 0.2, width * 0.82, height * 0.58)
      ctx.fillStyle = 'rgba(255, 244, 221, 0.38)'
      ctx.fillRect(width * 0.1, height * 0.28, width * 0.18, height * 0.22)
      ctx.fillStyle = 'rgba(255, 246, 231, 0.28)'
      ctx.fillRect(width * 0.76, height * 0.18, width * 0.14, height * 0.5)
    } else {
      ctx.fillStyle = 'rgba(43, 54, 80, 0.5)'
      ctx.fillRect(width * 0.13, height * 0.33, width * 0.2, height * 0.06)
      ctx.fillStyle = 'rgba(255, 229, 148, 0.72)'
      ctx.fillRect(width * 0.08, height * 0.48, width * 0.54, height * 0.14)
      ctx.fillStyle = 'rgba(255, 249, 235, 0.3)'
      ctx.fillRect(width * 0.74, height * 0.22, width * 0.16, height * 0.42)
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.fillRect(width * 0.16, height * 0.22, width * 0.44, height * 0.07)
    ctx.fillStyle = 'rgba(23, 28, 40, 0.78)'
    ctx.beginPath()
    ctx.arc(width * 0.16, height * 0.48, height * 0.055, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.beginPath()
    ctx.arc(width * 0.145, height * 0.46, height * 0.018, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

export function createFishMaterial(this: any, variant: FishVariant): THREE.MeshPhysicalMaterial {
    const speciesBaseColorTexture = this.getVisualTexture(variant.baseColorTextureId)
    const speciesNormalTexture = this.getVisualTexture(variant.normalTextureId)
    const speciesRoughnessTexture = this.getVisualTexture(variant.roughnessTextureId)
    const speciesAlphaTexture = this.getVisualTexture(variant.alphaTextureId)
    const legacyPatternTexture = this.getVisualTexture(variant.patternTextureId)
    const resolvedMap = speciesBaseColorTexture ?? legacyPatternTexture
    const materialResponse = this.resolveFishMaterialResponse(variant, false)
    if (resolvedMap) {
      const alphaTest = speciesAlphaTexture ? 0.05 : 0
      const materialOptions: THREE.MeshPhysicalMaterialParameters = {
        map: resolvedMap,
        normalMap: speciesNormalTexture,
        roughnessMap: speciesRoughnessTexture,
        alphaMap: speciesAlphaTexture,
        color: 0xffffff,
        metalness: materialResponse.metalness,
        roughness: materialResponse.roughness,
        clearcoat: materialResponse.clearcoat,
        clearcoatRoughness: materialResponse.clearcoatRoughness,
        reflectivity: materialResponse.reflectivity,
        envMapIntensity: materialResponse.envMapIntensity,
        transparent: false,
        alphaTest,
        side: THREE.FrontSide
      }
      if (speciesNormalTexture) {
        materialOptions.normalScale = materialResponse.normalScale
      }
      return new THREE.MeshPhysicalMaterial(materialOptions)
    }

    const texture = this.createEmergencyFishTexture(variant)
    
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      metalness: 0.04,
      roughness: 0.42,
      clearcoat: 0.58,
      clearcoatRoughness: 0.24,
      reflectivity: 0.9,
      envMapIntensity: 0.46,
      transparent: false,
      side: THREE.FrontSide
    })
  }
