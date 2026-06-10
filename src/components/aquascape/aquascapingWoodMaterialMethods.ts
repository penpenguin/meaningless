/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function tuneDriftwoodMaterial(this: any, material: T): T {
    material.map = material.map ?? this.getVisualTexture('driftwood-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('driftwood-normal')
    material.normalScale = new THREE.Vector2(1.36, 0.64)
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('driftwood-roughness')
    material.aoMap = material.aoMap
        ?? this.getVisualTexture('driftwood-bark-ao')
        ?? this.getVisualTexture('driftwood-ao')
    material.aoMapIntensity = material.aoMap
        ? THREE.MathUtils.clamp(material.aoMapIntensity ?? 0.64, 0.6, 0.76)
        : 0
    const driftwoodColor = material.color?.clone() ?? new THREE.Color('#6f5641')
    const driftwoodHsl = { h: 0, s: 0, l: 0 }
    driftwoodColor.getHSL(driftwoodHsl)
    if (driftwoodHsl.l < 0.37) {
        driftwoodColor.setHSL(
            driftwoodHsl.h,
            THREE.MathUtils.clamp(driftwoodHsl.s * 0.78 + 0.025, 0.1, 0.24),
            0.42
        )
    }
    material.color = driftwoodColor
    material.emissive = material.emissive ?? new THREE.Color('#000000')
    material.emissive.lerp(new THREE.Color('#5f4328'), 0.28)
    material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.2)
    material.roughness = typeof material.roughness === 'number'
        ? Math.max(material.roughness, material.roughnessMap ? 0.9 : 0.94)
        : material.roughnessMap ? 0.91 : 0.95
    material.metalness = typeof material.metalness === 'number'
        ? Math.min(material.metalness, 0.03)
        : 0.02
    material.envMapIntensity = THREE.MathUtils.clamp(material.envMapIntensity ?? 0.05, 0.02, 0.08)

    const cavityMask = this.getVisualTexture('driftwood-bark-cavity-mask')
    if (cavityMask) {
        this.installDriftwoodCavityShading(material, cavityMask)
    }

    if (material instanceof THREE.MeshPhysicalMaterial) {
        material.clearcoat = Math.min(material.clearcoat ?? 0, 0.03)
        material.clearcoatRoughness = Math.max(material.clearcoatRoughness ?? 0.94, 0.94)
    }

    return material
}

export function installDriftwoodCavityShading(this: any, material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, cavityMask: THREE.Texture): void {
    const cavityStrength = 0.2
    const ridgeLift = 0.15
    material.userData = {
        ...material.userData,
        driftwoodCavityMask: cavityMask,
        driftwoodCavityStrength: cavityStrength,
        driftwoodRidgeLift: ridgeLift
    }

    const previousOnBeforeCompile = material.onBeforeCompile.bind(material)
    const previousProgramCacheKey = typeof material.customProgramCacheKey === 'function'
        ? material.customProgramCacheKey.bind(material)
        : null

    material.onBeforeCompile = (shader, renderer) => {
        previousOnBeforeCompile(shader, renderer)
        shader.uniforms.uDriftwoodCavityMask = { value: cavityMask }
        shader.uniforms.uDriftwoodCavityStrength = { value: cavityStrength }
        shader.uniforms.uDriftwoodRidgeLift = { value: ridgeLift }
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <aomap_pars_fragment>',
                `#include <aomap_pars_fragment>
uniform sampler2D uDriftwoodCavityMask;
uniform float uDriftwoodCavityStrength;
uniform float uDriftwoodRidgeLift;`
            )
            .replace(
                '#include <aomap_fragment>',
                `#include <aomap_fragment>
#ifdef USE_AOMAP
  float driftwoodCavity = texture2D(uDriftwoodCavityMask, vAoMapUv).r;
  float driftwoodUnderside = smoothstep(-0.32, 0.46, normal.y);
  float driftwoodRidge = (1.0 - driftwoodCavity) * driftwoodUnderside;
  reflectedLight.indirectDiffuse *= 1.0 - driftwoodCavity * uDriftwoodCavityStrength;
  reflectedLight.directDiffuse *= 1.0 - driftwoodCavity * (uDriftwoodCavityStrength * 0.58);
  diffuseColor.rgb += vec3(uDriftwoodRidgeLift * driftwoodRidge);
#endif`
            )
    }
    material.customProgramCacheKey = () => `${previousProgramCacheKey ? previousProgramCacheKey() : 'standard'}-driftwood-cavity`
    material.needsUpdate = true
}

export function createDriftwoodReplacementMaterial(this: any, material: THREE.Material): THREE.MeshPhysicalMaterial {
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

export function tuneRockMaterial(this: any, material: T, userData: Record<string, unknown> = {}): T {
    material.map = material.map ?? this.getVisualTexture('rock-diffuse')
    material.normalMap = material.normalMap ?? this.getVisualTexture('rock-normal')
    if (material.normalMap) {
        material.normalScale = new THREE.Vector2(0.54, 0.54)
    }
    material.roughnessMap = material.roughnessMap ?? this.getVisualTexture('rock-roughness')

    const role = userData.role
    const isSupportRock = role === 'support-rock'
        || role === 'support-rock-piece'
        || role === 'support-rock-chip'
        || role === 'support-rock-pebble'
        || role === 'support-rock-scatter'
    const isHeroRidge = role === 'hero-rock-ridge'
        || role === 'ridge-rock'
        || role === 'ridge-slate'
        || role === 'ridge-rubble'
    const lightnessFloor = isSupportRock ? 0.42 : isHeroRidge ? 0.41 : 0.38
    const color = material.color?.clone() ?? new THREE.Color('#8a8378')
    const liftedHsl = { h: 0, s: 0, l: 0 }
    color.getHSL(liftedHsl)
    if (liftedHsl.l < lightnessFloor) {
        color.setHSL(
            liftedHsl.h,
            THREE.MathUtils.clamp(
                liftedHsl.s * 0.92 + (isSupportRock ? 0.04 : isHeroRidge ? 0.03 : 0.02),
                0.12,
                isSupportRock ? 0.34 : isHeroRidge ? 0.32 : 0.28
            ),
            lightnessFloor
        )
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

export function createRockReplacementMaterial(this: any, material: THREE.Material, userData: Record<string, unknown> = {}): THREE.MeshPhysicalMaterial {
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

    return this.tuneRockMaterial(rockMaterial, userData)
}

export function createLeafMaterial(this: any, hue: number, layer: PlantLayer, plantType: Exclude<PlantType, 'ribbon-seaweed'>, role: PlantRenderRole = 'repeated'): THREE.MeshPhysicalMaterial {
    const profile = this.getPlantMaterialProfile(layer, plantType, role)
    const silhouetteFamily = getPlantSilhouetteFamily(plantType)
    const useSolidBackgroundLeaf = layer === 'background' && role === 'repeated' && silhouetteFamily !== 'ribbon'
    const hueSaturation = plantType === 'crypt-brown'
        ? 0.28
        : silhouetteFamily === 'broad'
            ? 0.3
            : 0.26
    const hueLightness = layer === 'background'
        ? plantType === 'crypt-brown' ? 0.37 : 0.39
        : silhouetteFamily === 'broad'
            ? 0.35
            : plantType === 'crypt-brown' ? 0.31 : 0.33
    const color = this.getPlantTint(layer, plantType, role).lerp(
        new THREE.Color().setHSL(
            hue,
            hueSaturation,
            hueLightness
        ),
        role === 'hero' ? 0.34 : 0.22
    )

    const material = new THREE.MeshPhysicalMaterial({
        map: useSolidBackgroundLeaf ? null : this.getVisualTexture('leaf-diffuse'),
        alphaMap: useSolidBackgroundLeaf ? null : this.getVisualTexture('leaf-alpha'),
        normalMap: this.getVisualTexture('leaf-normal'),
        normalScale: new THREE.Vector2(
            silhouetteFamily === 'broad' ? 0.42 : 0.34,
            silhouetteFamily === 'broad' ? 0.42 : 0.34
        ),
        roughnessMap: this.getVisualTexture('leaf-roughness'),
        color,
        metalness: 0,
        roughness: profile.roughness,
        transmission: profile.transmission,
        thickness: profile.thickness,
        transparent: profile.transparent,
        opacity: profile.opacity,
        alphaTest: useSolidBackgroundLeaf ? 0 : profile.alphaTest,
        side: THREE.DoubleSide,
        envMapIntensity: profile.envMapIntensity,
        clearcoat: profile.clearcoat,
        clearcoatRoughness: profile.clearcoatRoughness
    })
    material.shadowSide = THREE.DoubleSide
    return material
}

export function createHeroDriftwood(this: any, bounds: THREE.Box3): void {
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const driftwoodGroup = new THREE.Group()
    if (this.layoutStyle === 'nature-showcase') {
        driftwoodGroup.position.set(
        center.x - size.x * 0.308,
        bounds.min.y - 1.58,
            center.z - size.z * 0.14
        )
        driftwoodGroup.rotation.set(-0.06, -0.22, 0.1)
        driftwoodGroup.scale.set(1.32, 1.18, 0.98)
    } else {
        driftwoodGroup.position.set(
            center.x + size.x * 0.056,
            bounds.min.y - 2.2,
            center.z - size.z * 0.16
        )
        driftwoodGroup.rotation.set(-0.01, -0.14, 0.2)
        driftwoodGroup.scale.set(1.72, 1.58, 1.34)
    }
    driftwoodGroup.userData = {
        role: 'hero-driftwood'
    }

    const driftwoodAsset = this.cloneVisualModelGroup('driftwood-hero', {
        role: 'driftwood-asset-core'
    })
    if (!driftwoodAsset) {
        return
    }

    driftwoodGroup.userData = {
        ...driftwoodGroup.userData,
        assetId: 'driftwood-hero'
    }
    this.fitHeroDriftwoodAssetCore(driftwoodAsset, size)
    driftwoodGroup.add(driftwoodAsset)

    this.attachHardscapePlants(driftwoodGroup, 'driftwood')

    this.hardscapeGroups.push(driftwoodGroup)
    this.group.add(driftwoodGroup)
}

export function createHeroDriftwoodTrunk(this: any, material: THREE.Material): THREE.Mesh {
    const trunk = this.layoutStyle === 'nature-showcase'
        ? this.createDriftwoodTubeMesh({
            radius: 0.36,
            points: [
                new THREE.Vector3(-2.08, -0.08, 0.72),
                new THREE.Vector3(-1.34, 0.56, 0.56),
                new THREE.Vector3(-0.54, 1.04, 0.3),
                new THREE.Vector3(0.3, 1.36, 0.02),
                new THREE.Vector3(0.86, 1.52, -0.18)
            ],
            tubularSegments: 36,
            radialSegments: 9,
            ellipseAspect: 1.52,
            tipScale: 0.42,
            flare: 0.58,
            twist: 0.62,
            barkAmplitude: 0.13
        }, material, 'driftwood-trunk')
        : this.createDriftwoodTubeMesh({
            radius: 0.4,
            points: [
                new THREE.Vector3(-2.18, -0.08, 0.72),
                new THREE.Vector3(-1.12, 0.92, 0.54),
                new THREE.Vector3(0.26, 1.84, 0.18),
                new THREE.Vector3(2.1, 2.54, -0.22),
                new THREE.Vector3(4.08, 2.96, -1.02)
            ],
            tubularSegments: 50,
            radialSegments: 9,
            ellipseAspect: 1.56,
            tipScale: 0.5,
            flare: 0.6,
            twist: 0.66,
            barkAmplitude: 0.13
        }, material, 'driftwood-trunk')

    if (this.layoutStyle === 'nature-showcase') {
        trunk.position.set(-0.24, 0.1, 0.2)
        trunk.rotation.set(-0.02, 0.12, -0.06)
        trunk.scale.set(0.96, 0.96, 0.92)
        return trunk
    }

    trunk.position.set(0.08, 0.22, 0.16)
    trunk.rotation.set(-0.02, 0.06, -0.08)
    trunk.scale.set(1.7, 1.36, 1.22)
    return trunk
}

export function createHeroDriftwoodAssetExtenders(this: any, material: THREE.Material): THREE.Mesh[] {
    if (this.layoutStyle !== 'nature-showcase') {
        return []
    }

    const extenderDefinitions: DriftwoodTubeDefinition[] = [
        {
            radius: 0.092,
            points: [
                new THREE.Vector3(-2.22, -0.02, 0.72),
                new THREE.Vector3(-1.76, 0.28, 0.62),
                new THREE.Vector3(-1.06, 0.64, 0.44)
            ],
            tubularSegments: 18,
            radialSegments: 7,
            ellipseAspect: 1.38,
            tipScale: 0.48,
            flare: 0.34,
            twist: 0.56,
            barkAmplitude: 0.1
        },
        {
            radius: 0.048,
            points: [
                new THREE.Vector3(0.26, 1.38, 0),
                new THREE.Vector3(0.58, 1.6, -0.08),
                new THREE.Vector3(0.9, 1.74, -0.18)
            ],
            tubularSegments: 16,
            radialSegments: 6,
            ellipseAspect: 1.22,
            tipScale: 0.24,
            flare: 0.16,
            twist: 0.7,
            barkAmplitude: 0.08
        }
    ]

    return extenderDefinitions.map((definition) => this.createDriftwoodTubeMesh(
        definition,
        material,
        'driftwood-trunk-extender'
    ))
}

export function createHeroDriftwoodBranchAttachments(this: any, material: THREE.Material): THREE.Mesh[] {
    const branchDefinitions: DriftwoodTubeDefinition[] = this.layoutStyle === 'nature-showcase'
        ? [
            {
                radius: 0.108,
                points: [
                    new THREE.Vector3(0.28, 1.36, 0.16),
                    new THREE.Vector3(1.88, 2.18, 0.62),
                    new THREE.Vector3(3.12, 2.62, 0.9)
                ],
                tubularSegments: 24,
                radialSegments: 7,
                ellipseAspect: 1.24,
                tipScale: 0.4,
                flare: 0.28,
                twist: 0.82,
                barkAmplitude: 0.12
            },
            {
                radius: 0.092,
                points: [
                    new THREE.Vector3(-0.76, 1.02, 0.02),
                    new THREE.Vector3(-0.08, 1.64, -0.14),
                    new THREE.Vector3(0.98, 2.08, -0.32)
                ],
                tubularSegments: 26,
                radialSegments: 7,
                ellipseAspect: 1.2,
                tipScale: 0.42,
                flare: 0.24,
                twist: 0.88,
                barkAmplitude: 0.11
            },
            {
                radius: 0.08,
                points: [
                    new THREE.Vector3(-1.12, 0.92, -0.08),
                    new THREE.Vector3(-0.62, 1.74, -0.48),
                    new THREE.Vector3(0.04, 2.24, -0.78)
                ],
                tubularSegments: 24,
                radialSegments: 7,
                ellipseAspect: 1.18,
                tipScale: 0.38,
                flare: 0.22,
                twist: 0.94,
                barkAmplitude: 0.12
            },
            {
                radius: 0.076,
                points: [
                    new THREE.Vector3(-1.18, 0.86, 0.14),
                    new THREE.Vector3(-1.76, 1.56, -0.22),
                    new THREE.Vector3(-2.36, 2.18, -0.68)
                ],
                tubularSegments: 24,
                radialSegments: 7,
                ellipseAspect: 1.16,
                tipScale: 0.36,
                flare: 0.2,
                twist: 0.9,
                barkAmplitude: 0.11
            }
        ]
        : [
            {
                radius: 0.104,
                points: [
                    new THREE.Vector3(0.62, 1.84, 0.24),
                    new THREE.Vector3(1.88, 3.14, 1.16),
                    new THREE.Vector3(3.96, 4.02, 1.88)
                ],
                tubularSegments: 30,
                radialSegments: 7,
                ellipseAspect: 1.22,
                tipScale: 0.4,
                flare: 0.26,
                twist: 0.84,
                barkAmplitude: 0.12
            },
            {
                radius: 0.088,
                points: [
                    new THREE.Vector3(-0.18, 1.64, -0.02),
                    new THREE.Vector3(-0.96, 2.36, -0.58),
                    new THREE.Vector3(-1.72, 3.02, -0.94)
                ],
                tubularSegments: 28,
                radialSegments: 7,
                ellipseAspect: 1.24,
                tipScale: 0.4,
                flare: 0.22,
                twist: 0.96,
                barkAmplitude: 0.12
            }
        ]

    return branchDefinitions.map((definition) => this.createDriftwoodTubeMesh(
        definition,
        material,
        'driftwood-branch-attachment'
    ))
}
