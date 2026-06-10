/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { BoidsSystem } from '../../utils/fish/Boids'
import { getFishContent, getFishContentList } from '../../content/registry'
import { resolveRuntimeLayoutSeed, resolveSubstrateHardscapeAnchors, resolveSubstratePlantAnchors } from '../aquascape/Aquascaping'
import { createFishSafeBounds, resolveFishAxisExtents } from '../../utils/layout/sceneBounds'
import { DEFAULT_BEHAVIOR_PROFILE } from './detailedFishBehaviorProfile'
import { DEFAULT_ORIENTATION_CORRECTION, FISH_SAFE_PADDING_BY_PATH, LOCOMOTION_PROFILES, createFishVariants as createFishVariantDefinitions, resolveDefaultFishCount as resolveDefaultFishCountRule, resolveHeroAccentDepthMultiplier as resolveHeroAccentDepthMultiplierRule, resolveHeroAccentScaleMultiplier as resolveHeroAccentScaleMultiplierRule, resolveHeroPlacements as resolveHeroPlacementRules, resolveHeroPriorityMultiplier as resolveHeroPriorityMultiplierRule, resolveLocomotionProfile, resolvePreferredDepthBand, resolvePreferredLateralLane } from './fishPresentation'

export function createDetailedFishMeshes(this: any, countsPerVariant?: number[]): void {
    const counts = this.resolveVariantCounts(countsPerVariant)
    this.boidVariantIndices = this.buildBoidVariantIndices(counts)
    this.instancedTailMotionUniforms = []
    let boidStartIndex = 0

    this.variants.forEach((variant, variantIndex) => {
      const actualCount = counts[variantIndex] ?? 0
      if (actualCount <= 0) return
      
      const schoolAsset = this.getVisualModel(variant.schoolModelId)
      const sourceMesh = schoolAsset?.sourceMesh ?? null
      if (!sourceMesh) {
        boidStartIndex += actualCount
        return
      }

      const fishGeometry = sourceMesh.geometry.clone()
      const fishMaterial = this.createFishAssetMaterial(sourceMesh.material, variant, false)
      const renderPath = 'school'
      fishGeometry.userData = {
        ...fishGeometry.userData,
        sharedAsset: false
      }
      this.applyInstancedTailMotionAttributes(fishGeometry, variant, boidStartIndex, actualCount)
      this.patchInstancedFishMaterial(fishMaterial, fishGeometry, variant, renderPath)
      
      const instancedMesh = new THREE.InstancedMesh(
        fishGeometry,
        fishMaterial,
        actualCount
      )
      instancedMesh.userData.variantIndex = variantIndex
      instancedMesh.userData.renderPath = renderPath
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      
      // 個体差のある色を設定
      const colors = new Float32Array(actualCount * 3)
      const useSubtleInstanceTint = !!schoolAsset || !!variant.baseColorTextureId
      for (let i = 0; i < actualCount; i++) {
        const color = new THREE.Color()
        if (useSubtleInstanceTint) {
          const brightness = 0.9 + (Math.random() * 0.08)
          color.setRGB(brightness, brightness, brightness)
        } else {
          const hue = Math.random() * 0.1 - 0.05
          const saturation = 0.8 + Math.random() * 0.2
          const lightness = 0.5 + Math.random() * 0.3
          const hslTarget = { h: 0, s: 0, l: 0 }
          color.setHSL(
            (variant.primaryColor.getHSL(hslTarget).h + hue) % 1,
            saturation,
            lightness
          )
        }
        
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }
      
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
      this.instancedMeshes.push(instancedMesh)
      this.group.add(instancedMesh)
      boidStartIndex += actualCount
    })

    this.baseInstanceCounts = this.instancedMeshes.map(mesh => mesh.count)
    this.createHeroFishMeshes(counts)
  }

export function createHeroFishMeshes(this: any, counts: number[]): void {
    this.heroAssignments.clear()

    const candidates: Array<{
      boidIndex: number
      variantIndex: number
      priority: number
      slotIndex: number
    }> = []

    let boidStartIndex = 0
    counts.forEach((count, variantIndex) => {
      const normalizedCount = Math.max(0, count ?? 0)
      if (normalizedCount <= 0) {
        return
      }

      const heroSlots = Math.min(normalizedCount, normalizedCount >= 6 ? 2 : 1)
      for (let slotIndex = 0; slotIndex < heroSlots; slotIndex++) {
        const variant = this.variants[variantIndex]
        const priorityMultiplier = this.resolveHeroPriorityMultiplier(variant)
        candidates.push({
          boidIndex: boidStartIndex + Math.min(slotIndex * 2, normalizedCount - 1),
          variantIndex,
          priority: (normalizedCount - (slotIndex * 1.25)) * priorityMultiplier,
          slotIndex
        })
      }

      boidStartIndex += normalizedCount
    })

    const placements = this.resolveHeroPlacements()

    candidates
      .sort((left, right) => right.priority - left.priority)
      .slice(0, placements.length)
      .forEach((candidate, index) => {
        const variant = this.variants[candidate.variantIndex]
        if (!variant) return

        const heroAsset = this.getVisualModel(variant.heroModelId)
        const heroObject = this.createHeroFishObject(variant, heroAsset)
        if (!heroObject) {
          return
        }
        heroObject.visible = this.shouldShowHeroFishOnQuality(heroObject, this.currentQuality)
        heroObject.userData = {
          ...heroObject.userData,
          role: 'hero-fish',
          variantIndex: candidate.variantIndex
        }

        const placement = placements[index] ?? placements[placements.length - 1]
        const isSlenderVariant = variant.name === 'Neon'
        const accentPlacementScale = this.resolveHeroAccentScaleMultiplier(variant)
        const accentDepthScale = this.resolveHeroAccentDepthMultiplier(variant)
        const heroScaleMultiplier = Math.min(
          1.98,
          placement.scaleMultiplier * accentPlacementScale * (isSlenderVariant ? 1.18 : 1)
        )
        this.heroAssignments.set(candidate.boidIndex, {
          object: heroObject,
          body: (heroObject.userData.motionNodes as { body?: THREE.Object3D } | undefined)?.body ?? heroObject,
          tail: (heroObject.userData.motionNodes as { tail?: THREE.Object3D | null } | undefined)?.tail ?? null,
          lateralOffset: placement.lateralOffset,
          verticalOffset: placement.verticalOffset,
          depthOffset: placement.depthOffset * accentDepthScale,
          scaleMultiplier: heroScaleMultiplier,
          fishSafeExtents: this.resolveFishSafeExtents(variant, 'hero', heroScaleMultiplier * 1.04)
        })
        this.heroFishMeshes.push(heroObject)
        this.group.add(heroObject)
      })
  }

export function createHeroFishObject(this: any, variant: FishVariant, heroAsset: LoadedModelAsset | null): THREE.Object3D | null {
    const sourceMesh = heroAsset?.sourceMesh ?? null
    const sourceIsSkinnedMesh = (sourceMesh as (THREE.Mesh & { isSkinnedMesh?: boolean }) | null)?.isSkinnedMesh === true
    if (sourceMesh && !sourceIsSkinnedMesh) {
      const heroMesh = new THREE.Mesh(
        sourceMesh.geometry,
        this.createHeroFishMaterial(sourceMesh.material, variant)
      )
      heroMesh.castShadow = true
      heroMesh.receiveShadow = true
      const heroObject = this.wrapHeroMotionObject(heroMesh, variant)
      this.installHeroAnimation(heroObject, heroAsset?.animations ?? [])
      return heroObject
    }

    if (heroAsset?.scene) {
      const heroGroup = cloneSkeleton(heroAsset.scene) as THREE.Group
      heroGroup.traverse((object) => {
        const mesh = object as THREE.Mesh
        const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material
        if (!(mesh instanceof THREE.Mesh)) return

        if (Array.isArray(material)) {
          mesh.material = material.map((entry) => this.createHeroFishMaterial(entry, variant))
        } else if (material instanceof THREE.Material) {
          mesh.material = this.createHeroFishMaterial(material, variant)
        }

        mesh.castShadow = true
        mesh.receiveShadow = true
      })

      const heroObject = this.wrapHeroMotionObject(heroGroup, variant)
      this.installHeroAnimation(heroObject, heroAsset.animations ?? [])
      return heroObject
    }

    return null
  }

export function installHeroAnimation(this: any, heroObject: THREE.Object3D, animations: THREE.AnimationClip[]): void {
    if (animations.length === 0) return

    const mixer = new THREE.AnimationMixer(heroObject)
    animations.forEach((clip) => {
      mixer.clipAction(clip).play()
    })
    heroObject.userData.heroAnimationMixer = mixer
    heroObject.userData.hasAuthoredHeroAnimation = true
  }

export function updateHeroAnimations(this: any, deltaTime: number): void {
    if (deltaTime <= 0) return

    ;(this.heroFishMeshes ?? []).forEach((heroObject) => {
      const mixer = heroObject.userData.heroAnimationMixer as THREE.AnimationMixer | undefined
      mixer?.update(deltaTime)
    })
  }

export function wrapHeroMotionObject(this: any, body: THREE.Object3D, variant: FishVariant): THREE.Group {
    const root = new THREE.Group()
    const forwardAxis = this.getModelForwardAxis(variant, 'hero').clone().normalize()
    let tail = this.findHeroTailTarget(body, variant)

    if (tail) {
      root.add(body)
    } else {
      const tailPivot = new THREE.Group()
      const tailPivotDistance = this.resolveHeroTailPivotDistance(body, forwardAxis)
      tailPivot.name = 'HeroTailPivot'
      tailPivot.position.copy(forwardAxis).multiplyScalar(-tailPivotDistance)
      body.position.addScaledVector(forwardAxis, tailPivotDistance)
      tailPivot.add(body)
      root.add(tailPivot)
      tail = tailPivot
    }

    root.userData.motionNodes = {
      body,
      tail,
      bodyRotation: body.rotation.clone(),
      tailRotation: tail?.rotation.clone() ?? null,
      bodyPosition: body.position.clone(),
      tailPosition: tail?.position.clone() ?? null,
      tailMode: tail?.name === 'HeroTailPivot' ? 'pivot' : tail ? 'node' : 'none'
    }
    return root
  }

export function resolveHeroTailPivotDistance(this: any, body: THREE.Object3D, forwardAxis: THREE.Vector3): number {
    body.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(body)
    if (bounds.isEmpty()) {
      return 0.18
    }

    const size = bounds.getSize(new THREE.Vector3())
    const projectedLength =
      (Math.abs(forwardAxis.x) * size.x) +
      (Math.abs(forwardAxis.y) * size.y) +
      (Math.abs(forwardAxis.z) * size.z)

    return THREE.MathUtils.clamp(projectedLength * 0.32, 0.12, 0.9)
  }

export function findHeroTailTarget(this: any, root: THREE.Object3D, variant: FishVariant): THREE.Object3D | null {
    let namedTail: THREE.Object3D | null = null
    const forwardAxis = this.getModelForwardAxis(variant, 'hero').clone()
    let fallbackTail: THREE.Object3D | null = null
    let fallbackTailAftness = Number.NEGATIVE_INFINITY

    root.traverse((object) => {
      if (object === root) return

      const lowerName = object.name.toLowerCase()
      if (!namedTail && /tail|caudal|rear/.test(lowerName)) {
        namedTail = object
      }

      const aftness = -object.position.dot(forwardAxis)
      if (aftness > fallbackTailAftness) {
        fallbackTail = object
        fallbackTailAftness = aftness
      }
    })

    if (namedTail) return namedTail
    if (fallbackTail && fallbackTailAftness > 0.2) {
      return fallbackTail
    }

    return null
  }

export function createHeroFishMaterial(this: any, baseMaterial: THREE.Material, variant: FishVariant): THREE.MeshPhysicalMaterial {
    const heroMaterial = this.createFishAssetMaterial(baseMaterial, variant, true)
    heroMaterial.emissive.set(0x000000)
    heroMaterial.emissiveIntensity = 0
    return heroMaterial
  }

export function resolveBehaviorProfile(this: any, groups: FishGroup[]): BehaviorProfile {
    const totalCount = groups.reduce((sum, group) => sum + group.count, 0)
    if (totalCount <= 0) return { ...DEFAULT_BEHAVIOR_PROFILE }

    const moodWeights: Record<SchoolMood, number> = {
      calm: 0,
      alert: 0,
      feeding: 0
    }

    const weighted = groups.reduce((profile, group) => {
      const tuning = {
        ...DEFAULT_BEHAVIOR_PROFILE,
        ...group.tuning
      }
      moodWeights[tuning.schoolMood] += group.count
      return {
        speed: profile.speed + (tuning.speed * group.count),
        cohesion: profile.cohesion + (tuning.cohesion * group.count),
        separation: profile.separation + (tuning.separation * group.count),
        alignment: profile.alignment + (tuning.alignment * group.count),
        avoidWalls: profile.avoidWalls + (tuning.avoidWalls * group.count),
        preferredDepth: profile.preferredDepth + (tuning.preferredDepth * group.count),
        depthVariance: profile.depthVariance + (tuning.depthVariance * group.count),
        turnBias: profile.turnBias + (tuning.turnBias * group.count)
      }
    }, {
      speed: 0,
      cohesion: 0,
      separation: 0,
      alignment: 0,
      avoidWalls: 0,
      preferredDepth: 0,
      depthVariance: 0,
      turnBias: 0
    })

    const dominantMood = (Object.entries(moodWeights).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'calm') as SchoolMood

    return {
      speed: weighted.speed / totalCount,
      cohesion: weighted.cohesion / totalCount,
      separation: weighted.separation / totalCount,
      alignment: weighted.alignment / totalCount,
      avoidWalls: weighted.avoidWalls / totalCount,
      preferredDepth: weighted.preferredDepth / totalCount,
      schoolMood: dominantMood,
      depthVariance: weighted.depthVariance / totalCount,
      turnBias: weighted.turnBias / totalCount
    }
  }

export function applyBehaviorProfile(this: any, profile: BehaviorProfile): void {
    this.behaviorProfile = profile
    this.applyTuning(profile)
  }

export function rebuildFishSystem(this: any, totalCount: number, countsPerVariant: number[]): void {
    this.clearMeshes()

    this.fishCount = Math.max(0, totalCount)
    this.boids = new BoidsSystem(this.fishCount, this.bounds)
    this.boidVariantIndices = this.buildBoidVariantIndices(countsPerVariant)
    this.initializeRandomness()
    this.createDetailedFishMeshes(countsPerVariant)
  }

export function ensureHeadingState(this: any): void {
    const count = Number.isFinite(this.fishCount) ? this.fishCount : this.boids?.boids?.length ?? 0

    if (!this.smoothedQuaternions || this.smoothedQuaternions.length !== count) {
      this.smoothedQuaternions = Array.from({ length: count }, () => new THREE.Quaternion())
    }

    if (!this.previousVelocities || this.previousVelocities.length !== count) {
      this.previousVelocities = Array.from({ length: count }, () => new THREE.Vector3())
    }

    if (!this.headingInitialized || this.headingInitialized.length !== count) {
      this.headingInitialized = Array.from({ length: count }, () => false)
    }
  }

export function shouldTrigger(this: any, ratePerSecond: number, deltaTime: number): boolean {
    if (deltaTime <= 0 || ratePerSecond <= 0) {
      return false
    }

    return Math.random() < Math.min(1, ratePerSecond * deltaTime)
  }

export function disposeMaterialTextures(this: any, material: THREE.Material): void {
    const texturedMaterial = material as THREE.Material & {
      map?: THREE.Texture | null
      alphaMap?: THREE.Texture | null
      aoMap?: THREE.Texture | null
      bumpMap?: THREE.Texture | null
      displacementMap?: THREE.Texture | null
      emissiveMap?: THREE.Texture | null
      lightMap?: THREE.Texture | null
      metalnessMap?: THREE.Texture | null
      normalMap?: THREE.Texture | null
      roughnessMap?: THREE.Texture | null
      specularMap?: THREE.Texture | null
      clearcoatMap?: THREE.Texture | null
      clearcoatNormalMap?: THREE.Texture | null
      clearcoatRoughnessMap?: THREE.Texture | null
      sheenColorMap?: THREE.Texture | null
      sheenRoughnessMap?: THREE.Texture | null
      transmissionMap?: THREE.Texture | null
      thicknessMap?: THREE.Texture | null
      iridescenceMap?: THREE.Texture | null
      iridescenceThicknessMap?: THREE.Texture | null
      anisotropyMap?: THREE.Texture | null
    }

    const textures = [
      texturedMaterial.map,
      texturedMaterial.alphaMap,
      texturedMaterial.aoMap,
      texturedMaterial.bumpMap,
      texturedMaterial.displacementMap,
      texturedMaterial.emissiveMap,
      texturedMaterial.lightMap,
      texturedMaterial.metalnessMap,
      texturedMaterial.normalMap,
      texturedMaterial.roughnessMap,
      texturedMaterial.specularMap,
      texturedMaterial.clearcoatMap,
      texturedMaterial.clearcoatNormalMap,
      texturedMaterial.clearcoatRoughnessMap,
      texturedMaterial.sheenColorMap,
      texturedMaterial.sheenRoughnessMap,
      texturedMaterial.transmissionMap,
      texturedMaterial.thicknessMap,
      texturedMaterial.iridescenceMap,
      texturedMaterial.iridescenceThicknessMap,
      texturedMaterial.anisotropyMap
    ]

    const disposed = new Set<THREE.Texture>()
    textures.forEach((texture) => {
      if (!texture || disposed.has(texture)) return
      if ((texture.userData as { sharedAsset?: boolean } | undefined)?.sharedAsset) return
      texture.dispose()
      disposed.add(texture)
    })
  }

export function getVisualTexture(this: any, id?: string): THREE.Texture | null {
    if (!id) return null
    return this.visualAssets?.textures?.[id] ?? null
  }

export function getVisualModel(this: any, id?: string): LoadedModelAsset | null {
    if (!id) return null
    return this.visualAssets?.models[id] ?? null
  }

export function getGenericFishDetailTexture(this: any, kind: 'normal' | 'roughness'): THREE.Texture | null {
    return this.getVisualTexture(kind === 'normal' ? 'fish-scale-normal' : 'fish-scale-roughness')
  }

export function resolveFishMaterialResponse(this: any, variant: FishVariant, hero: boolean): {
    metalness: number
    roughness: number
    clearcoat: number
    clearcoatRoughness: number
    reflectivity: number
    envMapIntensity: number
    normalScale: THREE.Vector2
  } {
    const showcaseAccent = this.layoutStyle === 'nature-showcase'

    if (variant.name === 'Tropical') {
      return hero
        ? {
            metalness: 0,
            roughness: 0.56,
            clearcoat: 0.32,
            clearcoatRoughness: 0.58,
            reflectivity: 0.46,
            envMapIntensity: 0.38,
            normalScale: new THREE.Vector2(0.18, 0.12)
          }
        : {
            metalness: 0,
            roughness: 0.6,
            clearcoat: 0.24,
            clearcoatRoughness: 0.62,
            reflectivity: 0.42,
            envMapIntensity: 0.32,
            normalScale: new THREE.Vector2(0.14, 0.1)
          }
    }

    if (variant.name === 'Butterflyfish') {
      if (showcaseAccent) {
        return hero
          ? {
              metalness: 0.01,
              roughness: 0.64,
              clearcoat: 0.42,
              clearcoatRoughness: 0.58,
              reflectivity: 0.54,
              envMapIntensity: 0.44,
              normalScale: new THREE.Vector2(0.18, 0.12)
            }
          : {
              metalness: 0.01,
              roughness: 0.66,
              clearcoat: 0.28,
              clearcoatRoughness: 0.56,
              reflectivity: 0.5,
              envMapIntensity: 0.34,
              normalScale: new THREE.Vector2(0.15, 0.1)
            }
      }

      return hero
        ? {
            metalness: 0.01,
            roughness: 0.58,
            clearcoat: 0.58,
            clearcoatRoughness: 0.48,
            reflectivity: 0.62,
            envMapIntensity: 0.62,
            normalScale: new THREE.Vector2(0.2, 0.13)
          }
        : {
            metalness: 0.01,
            roughness: 0.62,
            clearcoat: 0.34,
            clearcoatRoughness: 0.54,
            reflectivity: 0.52,
            envMapIntensity: 0.42,
            normalScale: new THREE.Vector2(0.16, 0.1)
          }
    }

    if (variant.name === 'Goldfish') {
      if (showcaseAccent) {
        return hero
          ? {
              metalness: 0.01,
              roughness: 0.62,
              clearcoat: 0.44,
              clearcoatRoughness: 0.5,
              reflectivity: 0.56,
              envMapIntensity: 0.42,
              normalScale: new THREE.Vector2(0.22, 0.14)
            }
          : {
              metalness: 0.01,
              roughness: 0.64,
              clearcoat: 0.3,
              clearcoatRoughness: 0.52,
              reflectivity: 0.52,
              envMapIntensity: 0.36,
              normalScale: new THREE.Vector2(0.18, 0.12)
            }
      }

      return hero
        ? {
            metalness: 0.01,
            roughness: 0.5,
            clearcoat: 0.62,
            clearcoatRoughness: 0.42,
            reflectivity: 0.66,
            envMapIntensity: 0.62,
            normalScale: new THREE.Vector2(0.24, 0.16)
          }
        : {
            metalness: 0.01,
            roughness: 0.58,
            clearcoat: 0.38,
            clearcoatRoughness: 0.46,
            reflectivity: 0.58,
            envMapIntensity: 0.46,
            normalScale: new THREE.Vector2(0.2, 0.14)
          }
    }

    return hero
      ? {
          metalness: 0.04,
          roughness: 0.24,
          clearcoat: 0.84,
          clearcoatRoughness: 0.2,
          reflectivity: 0.9,
          envMapIntensity: 0.95,
          normalScale: new THREE.Vector2(0.4, 0.24)
        }
      : {
          metalness: 0.04,
          roughness: 0.38,
          clearcoat: 0.64,
          clearcoatRoughness: 0.2,
          reflectivity: 0.9,
          envMapIntensity: 0.78,
          normalScale: new THREE.Vector2(0.3, 0.18)
        }
  }
