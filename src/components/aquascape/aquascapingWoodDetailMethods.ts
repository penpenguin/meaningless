/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { getPlantSilhouetteFamily, resolveRuntimeLayoutSeed, resolveSampledPlantPlacements } from './aquascapePlants'
import { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'

export function createHeroDriftwoodRoots(this: any, material: THREE.Material): THREE.Mesh[] {
    const rootDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.024,
        points: [
          new THREE.Vector3(-1.62, 0.42, 0.32),
          new THREE.Vector3(-1.5, -0.16, 0.18),
          new THREE.Vector3(-1.42, -0.54, 0.02)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.2,
        tipScale: 0.6,
        flare: 0.46,
        twist: 0.46,
        barkAmplitude: 0.11
      },
      {
        radius: 0.02,
        points: [
          new THREE.Vector3(-1.18, 0.36, 0.28),
          new THREE.Vector3(-1.02, -0.22, 0.14),
          new THREE.Vector3(-0.82, -0.44, 0.04)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.16,
        tipScale: 0.56,
        flare: 0.4,
        twist: 0.4,
        barkAmplitude: 0.1
      },
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(-0.22, 0.22, -0.02),
          new THREE.Vector3(0.12, -0.2, -0.18),
          new THREE.Vector3(0.56, -0.34, -0.42)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.14,
        tipScale: 0.52,
        flare: 0.34,
        twist: 0.34,
        barkAmplitude: 0.1
      }
    ]

    return rootDefinitions.map((definition) => this.createDriftwoodTubeMesh(definition, material, 'driftwood-root'))
  }

export function createHeroDriftwoodBrokenStubs(this: any, material: THREE.Material): THREE.Mesh[] {
    const brokenStubDefinitions = [
      {
        position: new THREE.Vector3(-0.1, 1.72, 0.16),
        rotation: new THREE.Euler(0.58, -0.28, 0.42),
        scale: new THREE.Vector3(0.12, 0.22, 0.1)
      },
      {
        position: new THREE.Vector3(0.92, 1.98, -0.18),
        rotation: new THREE.Euler(-0.32, 0.54, -0.18),
        scale: new THREE.Vector3(0.1, 0.18, 0.08)
      }
    ]

    return brokenStubDefinitions.map((definition) => {
      const stub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.04, 0.34, 7),
        material
      )
      stub.position.copy(definition.position)
      stub.rotation.copy(definition.rotation)
      stub.scale.copy(definition.scale)
      stub.castShadow = true
      stub.receiveShadow = true
      stub.userData = {
        role: 'driftwood-broken-stub'
      }
      return stub
    })
  }

export function createHeroDriftwoodMossPatches(this: any): THREE.Mesh[] {
    const mossMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#556844'),
      roughness: 1,
      metalness: 0
    })
    const patchDefinitions = [
      {
        position: new THREE.Vector3(-0.94, 1.14, 0.62),
        rotation: new THREE.Euler(-0.3, 0.12, 0.16),
        scale: new THREE.Vector3(0.52, 0.08, 0.32),
        color: '#5d7247'
      },
      {
        position: new THREE.Vector3(0.52, 2.08, 0.92),
        rotation: new THREE.Euler(-0.34, 0.48, -0.06),
        scale: new THREE.Vector3(0.42, 0.08, 0.26),
        color: '#64784c'
      },
      {
        position: new THREE.Vector3(-0.62, 2.18, -0.28),
        rotation: new THREE.Euler(-0.24, -0.18, 0.1),
        scale: new THREE.Vector3(0.34, 0.07, 0.22),
        color: '#5b7046'
      }
    ]

    return patchDefinitions.map((definition) => {
      const patch = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 18, 12),
        mossMaterial.clone()
      )
      ;(patch.material as THREE.MeshStandardMaterial).color = new THREE.Color(definition.color)
      patch.position.copy(definition.position)
      patch.rotation.copy(definition.rotation)
      patch.scale.copy(definition.scale)
      patch.castShadow = true
      patch.receiveShadow = true
      patch.userData = {
        role: 'driftwood-moss-patch'
      }
      return patch
    })
  }

export function createHeroDriftwoodFineTwigs(this: any, material: THREE.Material): THREE.Mesh[] {
    const twigDefinitions: DriftwoodTubeDefinition[] = [
      {
        radius: 0.018,
        points: [
          new THREE.Vector3(1.12, 2.42, 0.88),
          new THREE.Vector3(1.6, 2.68, 1.02),
          new THREE.Vector3(2.08, 2.82, 1.12)
        ],
        tubularSegments: 18,
        radialSegments: 5,
        ellipseAspect: 1.14,
        tipScale: 0.28,
        flare: 0.12,
        twist: 0.68,
        barkAmplitude: 0.08
      },
      {
        radius: 0.014,
        points: [
          new THREE.Vector3(-0.84, 2.36, -0.56),
          new THREE.Vector3(-1.38, 2.64, -0.82),
          new THREE.Vector3(-1.96, 2.92, -1.04)
        ],
        tubularSegments: 16,
        radialSegments: 5,
        ellipseAspect: 1.12,
        tipScale: 0.24,
        flare: 0.1,
        twist: 0.74,
        barkAmplitude: 0.08
      },
      {
        radius: 0.016,
        points: [
          new THREE.Vector3(1.38, 2.2, -0.12),
          new THREE.Vector3(1.86, 2.34, -0.24),
          new THREE.Vector3(2.26, 2.46, -0.36)
        ],
        tubularSegments: 16,
        radialSegments: 5,
        ellipseAspect: 1.1,
        tipScale: 0.22,
        flare: 0.1,
        twist: 0.62,
        barkAmplitude: 0.08
      }
    ]

    return twigDefinitions.map((definition) => this.createDriftwoodTubeMesh(
      definition,
      material,
      'driftwood-fine-twig'
    ))
  }

export function createHeroDriftwoodRootBases(this: any, material: THREE.Material): THREE.Mesh[] {
    const rootBaseDefinitions = this.layoutStyle === 'nature-showcase'
      ? [
        {
          position: new THREE.Vector3(-2.24, -0.14, 0.76),
          rotation: new THREE.Euler(-0.26, 0.38, 0.12),
          scale: new THREE.Vector3(1.08, 0.24, 0.64)
        },
        {
          position: new THREE.Vector3(-1.84, -0.1, 0.52),
          rotation: new THREE.Euler(-0.22, 0.3, 0.04),
          scale: new THREE.Vector3(0.82, 0.2, 0.48)
        },
        {
          position: new THREE.Vector3(-2.54, -0.08, 0.96),
          rotation: new THREE.Euler(-0.32, 0.46, 0.22),
          scale: new THREE.Vector3(1.18, 0.26, 0.7)
        },
        {
          position: new THREE.Vector3(-1.58, -0.08, 0.34),
          rotation: new THREE.Euler(-0.2, 0.24, -0.08),
          scale: new THREE.Vector3(0.72, 0.18, 0.42)
        }
      ]
      : [
        {
          position: new THREE.Vector3(-2.18, -0.12, 0.74),
          rotation: new THREE.Euler(-0.24, 0.34, 0.1),
          scale: new THREE.Vector3(0.98, 0.22, 0.58)
        },
        {
          position: new THREE.Vector3(-1.42, -0.08, 0.36),
          rotation: new THREE.Euler(-0.18, 0.26, -0.04),
          scale: new THREE.Vector3(0.7, 0.18, 0.42)
        },
        {
          position: new THREE.Vector3(-2.46, -0.06, 0.92),
          rotation: new THREE.Euler(-0.28, 0.42, 0.2),
          scale: new THREE.Vector3(1.08, 0.24, 0.66)
        }
      ]

    return rootBaseDefinitions.map((definition) => {
      const rootBase = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 18, 12),
        material
      )
      rootBase.position.copy(definition.position)
      rootBase.rotation.copy(definition.rotation)
      rootBase.scale.copy(definition.scale)
      rootBase.castShadow = true
      rootBase.receiveShadow = true
      rootBase.userData = {
        role: 'driftwood-root-base'
      }
      return rootBase
    })
  }

export function createHeroDriftwoodRootFlare(this: any, material: THREE.Material): THREE.Mesh {
    const rootFlare = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 12),
      material
    )
    if (this.layoutStyle === 'nature-showcase') {
      rootFlare.position.set(-2.14, -0.1, 0.64)
      rootFlare.scale.set(3.34, 1.18, 2.16)
      rootFlare.rotation.set(-0.3, 0.42, 0.12)
    } else {
      rootFlare.position.set(-2.04, -0.08, 0.58)
      rootFlare.scale.set(2.92, 1.08, 1.92)
      rootFlare.rotation.set(-0.26, 0.36, 0.1)
    }
    rootFlare.castShadow = true
    rootFlare.receiveShadow = true
    rootFlare.userData = {
      role: 'driftwood-root-flare'
    }
    return rootFlare
  }

export function createHeroDriftwoodLocalShadow(this: any): THREE.Mesh {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.08),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#102026'),
        transparent: true,
        opacity: 0.08,
        depthWrite: false
      })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(0.14, 0.08, 0.6)
    shadow.userData = {
      role: 'driftwood-local-shadow'
    }
    return shadow
  }

export function createHeroDriftwoodLocalFill(this: any): THREE.PointLight {
    const fill = new THREE.PointLight('#f4ebd8', this.layoutStyle === 'nature-showcase' ? 3.72 : 3.4, 9.6, 1.8)
    fill.position.set(
      this.layoutStyle === 'nature-showcase' ? 0.28 : 0.42,
      this.layoutStyle === 'nature-showcase' ? 0.74 : 0.76,
      this.layoutStyle === 'nature-showcase' ? 2.48 : 2.34
    )
    fill.userData = {
      role: 'driftwood-local-fill'
    }
    return fill
  }

export function createHeroDriftwoodLocalRim(this: any): THREE.PointLight {
    const rim = new THREE.PointLight('#adc0b8', this.layoutStyle === 'nature-showcase' ? 1.14 : 1.04, 6.1, 1.8)
    rim.position.set(
      this.layoutStyle === 'nature-showcase' ? -1.34 : -1.18,
      this.layoutStyle === 'nature-showcase' ? 2.08 : 1.96,
      this.layoutStyle === 'nature-showcase' ? -1.16 : -1.08
    )
    rim.userData = {
      role: 'driftwood-local-rim'
    }
    return rim
  }

export function fitHeroDriftwoodAssetCore(this: any, asset: THREE.Group, tankSize: THREE.Vector3): void {
    if (this.layoutStyle === 'nature-showcase') {
      asset.rotation.set(-0.14, 0.62, -0.08)
    } else {
      asset.rotation.set(-0.24, 0.42, -0.08)
    }

    const sourceBounds = new THREE.Box3().setFromObject(asset)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())
    const targetSize = this.layoutStyle === 'nature-showcase'
      ? new THREE.Vector3(
        tankSize.x * 0.176,
        tankSize.y * 0.228,
        tankSize.z * 0.146
      )
      : new THREE.Vector3(
        tankSize.x * 0.312,
        tankSize.y * 0.35,
        tankSize.z * 0.244
      )

    asset.scale.set(
      targetSize.x / Math.max(sourceSize.x, 0.001),
      targetSize.y / Math.max(sourceSize.y, 0.001),
      targetSize.z / Math.max(sourceSize.z, 0.001)
    )

    const fittedBounds = new THREE.Box3().setFromObject(asset)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    if (this.layoutStyle === 'nature-showcase') {
      asset.position.set(
        -0.3 - fittedCenter.x,
        -1.62 - fittedBounds.min.y,
        0.08 - fittedCenter.z
      )
    } else {
      asset.position.set(
        1.16 - fittedCenter.x,
        0.58 - fittedBounds.min.y,
        0.42 - fittedCenter.z
      )
    }
  }
