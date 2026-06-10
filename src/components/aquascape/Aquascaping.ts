import * as THREE from 'three'
import type { VisualAssetBundle } from '../../assets/visualAssets'
import type { AquascapeLayoutStyle, Theme } from '../../types/aquarium'
import { resolveRuntimeLayoutSeed } from './aquascapePlants'
import {
  createSeaweed,
  createPlantedMasses,
  createNatureShowcasePlanting,
  createPlantMassesForLayout,
  toneAccentGroup,
  populatePlantCluster,
  resolveCompanionPlantType,
  addPlantMassFiller,
  createRibbonSeaweed,
  createSwordLeafPlant,
  createFanLeafPlant,
  createCryptRosettePlant,
  createMossPatchPlant,
  createSeaweedFrondGeometry,
  createSwordLeafGeometry,
  createFanLeafGeometry,
  createSeaweedMaterial
} from './aquascapingPlantShapeMethods'
import {
  getPlantMaterialProfile,
  getPlantTint,
  getPlantRenderRole,
  tonePlantColor,
  getVisualTexture,
  getVisualModel,
  cloneFirstAvailableVisualModelGroup,
  cloneVisualModelGroup,
  installPlantAnimation,
  createAssetBackedMaterial,
  createReplacementAssetMaterial
} from './aquascapingMaterialMethods'
import {
  tuneDriftwoodMaterial,
  installDriftwoodCavityShading,
  createDriftwoodReplacementMaterial,
  tuneRockMaterial,
  createRockReplacementMaterial,
  createLeafMaterial,
  createHeroDriftwood,
  createHeroDriftwoodTrunk,
  createHeroDriftwoodAssetExtenders,
  createHeroDriftwoodBranchAttachments
} from './aquascapingWoodMaterialMethods'
import {
  createHeroDriftwoodRoots,
  createHeroDriftwoodBrokenStubs,
  createHeroDriftwoodMossPatches,
  createHeroDriftwoodFineTwigs,
  createHeroDriftwoodRootBases,
  createHeroDriftwoodRootFlare,
  createHeroDriftwoodLocalShadow,
  createHeroDriftwoodLocalFill,
  createHeroDriftwoodLocalRim,
  fitHeroDriftwoodAssetCore
} from './aquascapingWoodDetailMethods'
import {
  createHeroRockRidge,
  createHeroCanopy,
  attachHardscapePlants,
  createEpiphyteCluster,
  createDriftwoodTubeMesh,
  deformDriftwoodTubeGeometry,
  createDriftwoodMaterial,
  createDriftwoodBurialDetails,
  ensureAoUv2,
  createRockMaterial,
  createRockClusterMesh,
  createDeformedRockGeometry,
  createFallbackSupportRockGroup,
  sinkObjectIntoSubstrate,
  createSupportRockCluster,
  createFallbackPebbleCluster,
  createHardscapeShadow
} from './aquascapingHardscapeMethods'
import {
  update,
  createSeaweedTexture,
  createSeaweedNormalMap,
  createSeaweedRoughnessMap,
  setMotionEnabled
} from './aquascapingLifecycleMethods'

export {
  PLANTED_SUBSTRATE_HARDSCAPE_ANCHORS as substrateHardscapeAnchors,
  resolveSubstrateHardscapeAnchors
} from './aquascapeHardscape'
export type { SubstrateHardscapeAnchor } from './aquascapeHardscape'
export {
  PLANTED_PLANT_CLUSTER_DEFINITIONS as plantClusterDefinitions,
  resolveRuntimeLayoutSeed,
  resolveSampledPlantPlacements,
  resolveSubstratePlantAnchors
} from './aquascapePlants'
export type {
  PlantClusterDefinition,
  SampledPlantPlacement,
  SubstratePlantAnchor
} from './aquascapePlants'
export { resolveHardscapePlantAnchors } from './aquascapeHardscapePlants'
export type { HardscapePlantAnchor } from './aquascapeHardscapePlants'

type AquascapingOptions = {
  layoutStyle?: AquascapeLayoutStyle
  layoutSeed?: number
}

export class AquascapingSystem {
  declare public createSeaweed: (bounds: THREE.Box3) => void
  declare public createHeroDriftwood: (bounds: THREE.Box3) => void
  declare public createHeroRockRidge: (bounds: THREE.Box3) => void
  declare public createHeroCanopy: (bounds: THREE.Box3) => void
  declare public createDriftwoodBurialDetails: (bounds: THREE.Box3) => void
  declare public createHardscapeShadow: (bounds: THREE.Box3) => void
  declare public update: (elapsedTime: number) => void
  declare public setMotionEnabled: (enabled: boolean) => void

  public group: THREE.Group
  public plants: THREE.Group[] = []
  public plantAnimationMixers: THREE.AnimationMixer[] = []
  public hardscapeGroups: THREE.Group[] = []
  public time = 0
  public visualAssets: VisualAssetBundle | null
  public layoutStyle: AquascapeLayoutStyle
  public layoutSeed: number
  
  constructor(
    scene: THREE.Scene,
    bounds: THREE.Box3,
    visualAssets: VisualAssetBundle | null = null,
    themeOrOptions: Theme | AquascapingOptions = { layoutStyle: 'planted' }
  ) {
    this.group = new THREE.Group()
    this.visualAssets = visualAssets
    this.layoutStyle = themeOrOptions.layoutStyle ?? 'planted'
    this.layoutSeed = resolveRuntimeLayoutSeed(
      scene,
      this.layoutStyle,
      'layoutSeed' in themeOrOptions ? themeOrOptions.layoutSeed : undefined
    )
    this.group.userData.layoutSeed = this.layoutSeed
    this.group.userData.layoutStyle = this.layoutStyle
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    this.createHeroDriftwood(bounds)
    this.createHeroRockRidge(bounds)
    this.createHeroCanopy(bounds)
    this.createDriftwoodBurialDetails(bounds)
    this.createHardscapeShadow(bounds)
  }
}

Object.assign(AquascapingSystem.prototype, {
  createSeaweed,
  createPlantedMasses,
  createNatureShowcasePlanting,
  createPlantMassesForLayout,
  toneAccentGroup,
  populatePlantCluster,
  resolveCompanionPlantType,
  addPlantMassFiller,
  createRibbonSeaweed,
  createSwordLeafPlant,
  createFanLeafPlant,
  createCryptRosettePlant,
  createMossPatchPlant,
  createSeaweedFrondGeometry,
  createSwordLeafGeometry,
  createFanLeafGeometry,
  createSeaweedMaterial,
  getPlantMaterialProfile,
  getPlantTint,
  getPlantRenderRole,
  tonePlantColor,
  getVisualTexture,
  getVisualModel,
  cloneFirstAvailableVisualModelGroup,
  cloneVisualModelGroup,
  installPlantAnimation,
  createAssetBackedMaterial,
  createReplacementAssetMaterial,
  tuneDriftwoodMaterial,
  installDriftwoodCavityShading,
  createDriftwoodReplacementMaterial,
  tuneRockMaterial,
  createRockReplacementMaterial,
  createLeafMaterial,
  createHeroDriftwood,
  createHeroDriftwoodTrunk,
  createHeroDriftwoodAssetExtenders,
  createHeroDriftwoodBranchAttachments,
  createHeroDriftwoodRoots,
  createHeroDriftwoodBrokenStubs,
  createHeroDriftwoodMossPatches,
  createHeroDriftwoodFineTwigs,
  createHeroDriftwoodRootBases,
  createHeroDriftwoodRootFlare,
  createHeroDriftwoodLocalShadow,
  createHeroDriftwoodLocalFill,
  createHeroDriftwoodLocalRim,
  fitHeroDriftwoodAssetCore,
  createHeroRockRidge,
  createHeroCanopy,
  attachHardscapePlants,
  createEpiphyteCluster,
  createDriftwoodTubeMesh,
  deformDriftwoodTubeGeometry,
  createDriftwoodMaterial,
  createDriftwoodBurialDetails,
  ensureAoUv2,
  createRockMaterial,
  createRockClusterMesh,
  createDeformedRockGeometry,
  createFallbackSupportRockGroup,
  sinkObjectIntoSubstrate,
  createSupportRockCluster,
  createFallbackPebbleCluster,
  createHardscapeShadow,
  update,
  createSeaweedTexture,
  createSeaweedNormalMap,
  createSeaweedRoughnessMap,
  setMotionEnabled
})
