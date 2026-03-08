import * as THREE from 'three'

export const createOpenWaterBounds = (): THREE.Box3 => {
  return new THREE.Box3(
    new THREE.Vector3(-6.5, -6.2, -4.5),
    new THREE.Vector3(6.5, 6.4, 4.5)
  )
}
