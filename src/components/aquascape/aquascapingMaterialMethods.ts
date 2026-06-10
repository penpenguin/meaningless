/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function getPlantMaterialProfile(this: any, layer: PlantLayer, plantType: PlantType, role: PlantRenderRole = 'repeated'): {
    roughness: number
    transmission: number
    thickness: number
    transparent: boolean
    opacity: number
    alphaTest: number
    envMapIntensity: number
    clearcoat: number
    clearcoatRoughness: number
  } {
    const silhouetteFamily = getPlantSilhouetteFamily(plantType)
    const alphaTestBase = silhouetteFamily === 'ribbon'
      ? 0.34
      : silhouetteFamily === 'moss'
        ? 0.12
      : silhouetteFamily === 'broad'
        ? 0.2
        : 0.16
    const alphaTest = layer === 'background'
      ? alphaTestBase + 0.04
      : role === 'hero'
        ? Math.max(0.12, alphaTestBase - 0.02)
        : alphaTestBase

    if (silhouetteFamily === 'ribbon') {
      return {
        roughness: plantType === 'vallisneria-tall'
          ? (layer === 'background' ? 0.86 : 0.8)
          : layer === 'background' ? 0.88 : 0.82,
        transmission: 0,
        thickness: 0.008,
        transparent: false,
        opacity: 1,
        alphaTest,
        envMapIntensity: 0.06,
        clearcoat: 0.02,
        clearcoatRoughness: 0.94
      }
    }

    return {
      roughness: silhouetteFamily === 'broad'
        ? layer === 'background' ? 0.78 : 0.72
        : layer === 'background' ? 0.84 : 0.78,
      transmission: role === 'hero' ? (layer === 'background' ? 0.012 : 0.01) : 0,
      thickness: role === 'hero'
        ? silhouetteFamily === 'broad' ? 0.02 : 0.016
        : 0.01,
      transparent: false,
      opacity: 1,
      alphaTest,
      envMapIntensity: role === 'hero' ? 0.1 : 0.06,
      clearcoat: role === 'hero'
        ? silhouetteFamily === 'broad' ? 0.05 : 0.035
        : 0.02,
      clearcoatRoughness: role === 'hero' ? 0.88 : 0.94
    }
  }

export function getPlantTint(this: any, layer: PlantLayer, plantType: PlantType, role: PlantRenderRole = 'repeated'): THREE.Color {
    const hue = (() => {
      switch (plantType) {
        case 'ribbon-seaweed':
          return 0.235
        case 'vallisneria-tall':
          return 0.255
        case 'stem-green-bush':
        case 'hygrophila-rear':
        case 'matsumo':
          return 0.272
        case 'willow-moss':
          return 0.286
        case 'javafern-large':
          return 0.288
        case 'javafern-narrow':
          return 0.276
        case 'anubias-nana-clump':
          return 0.262
        case 'anubias-petite-clump':
          return 0.268
        case 'amazon-sword':
          return 0.27
        case 'crypt-brown':
          return 0.064
        case 'fan-leaf':
          return 0.278
        case 'sword-leaf':
          return 0.268
      }
    })()
    const saturation = (() => {
      switch (plantType) {
        case 'crypt-brown':
          return 0.34
        case 'stem-green-bush':
        case 'hygrophila-rear':
        case 'matsumo':
        case 'willow-moss':
        case 'vallisneria-tall':
          return 0.38
        case 'anubias-nana-clump':
        case 'anubias-petite-clump':
          return 0.28
        case 'javafern-large':
        case 'javafern-narrow':
          return 0.32
        case 'ribbon-seaweed':
          return 0.39
        case 'fan-leaf':
          return 0.34
        case 'amazon-sword':
          return 0.32
        case 'sword-leaf':
          return 0.32
      }
    })()
    const backgroundLightness = (() => {
      switch (plantType) {
        case 'crypt-brown':
          return role === 'hero' ? 0.46 : 0.44
        case 'anubias-nana-clump':
        case 'anubias-petite-clump':
          return role === 'hero' ? 0.47 : 0.44
        case 'javafern-large':
        case 'javafern-narrow':
          return role === 'hero' ? 0.48 : 0.45
        case 'stem-green-bush':
        case 'hygrophila-rear':
        case 'matsumo':
          return role === 'hero' ? 0.53 : 0.5
        case 'willow-moss':
          return role === 'hero' ? 0.42 : 0.38
        case 'vallisneria-tall':
          return role === 'hero' ? 0.51 : 0.48
        case 'ribbon-seaweed':
          return role === 'hero' ? 0.42 : 0.4
        case 'fan-leaf':
          return role === 'hero' ? 0.47 : 0.44
        case 'amazon-sword':
          return role === 'hero' ? 0.48 : 0.45
        case 'sword-leaf':
          return role === 'hero' ? 0.46 : 0.43
      }
    })()
    const lightness = layer === 'background'
      ? backgroundLightness
      : layer === 'midground'
        ? role === 'hero'
          ? plantType === 'crypt-brown' ? 0.38 : 0.4
          : plantType === 'crypt-brown' ? 0.34 : 0.36
        : role === 'hero'
          ? plantType === 'anubias-petite-clump' ? 0.38 : 0.4
          : plantType === 'anubias-petite-clump' ? 0.34 : 0.36

    return new THREE.Color().setHSL(hue, saturation, lightness)
  }

export function getPlantRenderRole(this: any, userData: Record<string, unknown> = {}): PlantRenderRole {
    return userData.role === 'hero-canopy' ? 'hero' : 'repeated'
  }

export function tonePlantColor(this: any, color: THREE.Color, layer: PlantLayer, plantType: PlantType, role: PlantRenderRole): THREE.Color {
    const tint = this.getPlantTint(layer, plantType, role)
    const toned = tint.clone().lerp(color, role === 'hero' ? 0.26 : 0.34)
    const tintHsl = { h: 0, s: 0, l: 0 }
    const tonedHsl = { h: 0, s: 0, l: 0 }
    tint.getHSL(tintHsl)
    toned.getHSL(tonedHsl)

    const lightnessFloor = layer === 'background'
      ? role === 'hero' ? 0.4 : 0.39
      : layer === 'midground'
        ? 0.32
        : 0.3
    const saturationFloor = getPlantSilhouetteFamily(plantType) === 'ribbon' ? 0.2 : 0.18

    if (tonedHsl.l < lightnessFloor || tonedHsl.s < saturationFloor) {
      toned.setHSL(
        tintHsl.h,
        Math.max(tonedHsl.s, saturationFloor),
        Math.max(tonedHsl.l, lightnessFloor)
      )
    }

    return toned
  }

export function getVisualTexture(this: any, id: string): THREE.Texture | null {
    return this.visualAssets?.textures[id] ?? null
  }

export function getVisualModel(this: any, id?: string): LoadedModelAsset | null {
    if (!id) return null
    return this.visualAssets?.models[id] ?? null
  }

export function cloneFirstAvailableVisualModelGroup(this: any, ids: string[], userData: Record<string, unknown>): THREE.Group | null {
    for (const id of ids) {
      const clone = this.cloneVisualModelGroup(id, userData)
      if (clone) {
        return clone
      }
    }

    return null
  }

export function cloneVisualModelGroup(this: any, id: string, userData: Record<string, unknown>): THREE.Group | null {
    const model = this.getVisualModel(id)
    if (!model) return null

    const clone = cloneSkeleton(model.scene) as THREE.Group
    clone.userData = {
      ...clone.userData,
      ...userData,
      assetId: id
    }
    this.installPlantAnimation(id, clone, model.animations ?? [])

    clone.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh)) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => this.createAssetBackedMaterial(id, material, clone.userData))
      } else if (mesh.material instanceof THREE.Material) {
        mesh.material = this.createAssetBackedMaterial(id, mesh.material, clone.userData)
      }
      this.ensureAoUv2(mesh)
      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    return clone
  }

export function installPlantAnimation(this: any, id: string, root: THREE.Object3D, animations: THREE.AnimationClip[]): void {
    if (!id.startsWith('plant-') || animations.length === 0) {
      return
    }

    const mixer = new THREE.AnimationMixer(root)
    animations.forEach((clip) => {
      mixer.clipAction(clip).play()
    })
    root.userData = {
      ...root.userData,
      plantAnimationMixer: mixer
    }
    this.plantAnimationMixers.push(mixer)
  }

export function createAssetBackedMaterial(this: any, id: string, material: THREE.Material, userData: Record<string, unknown> = {}): THREE.Material {
    if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
      return this.createReplacementAssetMaterial(id, material, userData)
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
      const layer = (userData.layer as PlantLayer | undefined) ?? 'background'
      const plantType = (userData.plantType as PlantType | undefined) ?? 'sword-leaf'
      const role = this.getPlantRenderRole(userData)
      const profile = this.getPlantMaterialProfile(layer, plantType, role)
      baseMaterial.map = baseMaterial.map ?? this.getVisualTexture('leaf-diffuse')
      baseMaterial.alphaMap = baseMaterial.alphaMap ?? this.getVisualTexture('leaf-alpha')
      baseMaterial.normalMap = baseMaterial.normalMap ?? this.getVisualTexture('leaf-normal')
      if (baseMaterial.normalMap) {
        baseMaterial.normalScale = new THREE.Vector2(0.34, 0.34)
      }
      baseMaterial.roughnessMap = baseMaterial.roughnessMap ?? this.getVisualTexture('leaf-roughness')
      baseMaterial.color = this.tonePlantColor(
        baseMaterial.color?.clone() ?? new THREE.Color('#4d8150'),
        layer,
        plantType,
        role
      )
      baseMaterial.emissive = new THREE.Color(0x000000)
      baseMaterial.emissiveIntensity = 0
      baseMaterial.emissiveMap = null
      baseMaterial.metalness = 0
      baseMaterial.roughness = typeof baseMaterial.roughness === 'number'
        ? Math.max(baseMaterial.roughness, profile.roughness)
        : profile.roughness
      baseMaterial.transparent = false
      baseMaterial.opacity = profile.opacity
      baseMaterial.alphaTest = Math.max(baseMaterial.alphaTest ?? 0, baseMaterial.alphaMap ? profile.alphaTest : 0)
      baseMaterial.side = THREE.DoubleSide
      baseMaterial.envMapIntensity = Math.min(baseMaterial.envMapIntensity ?? profile.envMapIntensity, profile.envMapIntensity)
      if (baseMaterial instanceof THREE.MeshPhysicalMaterial) {
        baseMaterial.transmission = role === 'hero'
          ? Math.min(Math.max(baseMaterial.transmission ?? 0, profile.transmission), 0.015)
          : 0
        baseMaterial.thickness = role === 'hero'
          ? Math.max(baseMaterial.thickness ?? 0, profile.thickness)
          : profile.thickness
        baseMaterial.clearcoat = Math.min(baseMaterial.clearcoat ?? profile.clearcoat, profile.clearcoat)
        baseMaterial.clearcoatRoughness = Math.max(baseMaterial.clearcoatRoughness ?? profile.clearcoatRoughness, profile.clearcoatRoughness)
      }
      baseMaterial.shadowSide = THREE.DoubleSide
      return baseMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.tuneDriftwoodMaterial(baseMaterial)
    }

    if (id.startsWith('rock-')) {
      return this.tuneRockMaterial(baseMaterial, userData)
    }

    return baseMaterial
  }

export function createReplacementAssetMaterial(this: any, id: string, material: THREE.Material, userData: Record<string, unknown> = {}): THREE.Material {
    const baseMaterial = material as THREE.MeshStandardMaterial

    if (id.startsWith('plant-')) {
      const layer = (userData.layer as PlantLayer | undefined) ?? 'background'
      const plantType = (userData.plantType as PlantType | undefined) ?? 'sword-leaf'
      const role = this.getPlantRenderRole(userData)
      const profile = this.getPlantMaterialProfile(layer, plantType, role)
      const plantMaterial = new THREE.MeshPhysicalMaterial({
        map: this.getVisualTexture('leaf-diffuse'),
        alphaMap: this.getVisualTexture('leaf-alpha'),
        normalMap: this.getVisualTexture('leaf-normal'),
        normalScale: new THREE.Vector2(0.34, 0.34),
        roughnessMap: this.getVisualTexture('leaf-roughness'),
        color: this.tonePlantColor(
          baseMaterial.color?.clone() ?? new THREE.Color('#4d8150'),
          layer,
          plantType,
          role
        ),
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
      plantMaterial.shadowSide = THREE.DoubleSide
      return plantMaterial
    }

    if (id.startsWith('driftwood-')) {
      return this.createDriftwoodReplacementMaterial(material)
    }

    if (id.startsWith('rock-')) {
      return this.createRockReplacementMaterial(material, userData)
    }

    return material.clone()
  }
