import * as THREE from 'three'

export const createOpenWaterBounds = (): THREE.Box3 => {
  return new THREE.Box3(
    new THREE.Vector3(-10.5, -6.0, -8.5),
    new THREE.Vector3(10.5, 8.0, 8.5)
  )
}
