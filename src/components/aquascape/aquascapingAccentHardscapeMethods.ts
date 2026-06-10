import * as THREE from 'three'

type AccentHardscapeHost = {
    layoutStyle: string
    cloneVisualModelGroup: (id: string, userData: Record<string, unknown>) => THREE.Group | null
    hardscapeGroups: THREE.Group[]
    group: THREE.Group
}

type AccentHardscapeFit = {
    anchor: THREE.Vector3
    rotation: THREE.Euler
    targetSize: THREE.Vector3
}

const fitAccentHardscapeModel = (
    model: THREE.Group,
    { anchor, rotation, targetSize }: AccentHardscapeFit
): void => {
    model.position.set(0, 0, 0)
    model.rotation.copy(rotation)
    model.scale.set(1, 1, 1)
    model.updateWorldMatrix(true, true)

    const sourceBounds = new THREE.Box3().setFromObject(model)
    const sourceSize = sourceBounds.getSize(new THREE.Vector3())

    model.scale.set(
        targetSize.x / Math.max(sourceSize.x, 0.001),
        targetSize.y / Math.max(sourceSize.y, 0.001),
        targetSize.z / Math.max(sourceSize.z, 0.001)
    )
    model.updateWorldMatrix(true, true)

    const fittedBounds = new THREE.Box3().setFromObject(model)
    const fittedCenter = fittedBounds.getCenter(new THREE.Vector3())
    model.position.set(
        anchor.x - fittedCenter.x,
        anchor.y - fittedBounds.min.y,
        anchor.z - fittedCenter.z
    )
}

export function createAccentHardscape(this: AccentHardscapeHost, bounds: THREE.Box3): void {
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const surfaceY = bounds.min.y - 0.56

    const driftwoodAccent = this.cloneVisualModelGroup('driftwood-accent-02', {
        role: 'driftwood-accent'
    })
    if (driftwoodAccent) {
        fitAccentHardscapeModel(driftwoodAccent, {
            anchor: new THREE.Vector3(
                center.x - size.x * 0.2,
                surfaceY,
                center.z - size.z * 0.3
            ),
            rotation: new THREE.Euler(-0.2, 0.74, -0.08),
            targetSize: new THREE.Vector3(size.x * 0.3, size.y * 0.18, size.z * 0.2)
        })
        this.hardscapeGroups.push(driftwoodAccent)
        this.group.add(driftwoodAccent)
    }

    const rockAccent = this.cloneVisualModelGroup('rock-accent-02', {
        role: 'rock-accent'
    })
    if (rockAccent) {
        fitAccentHardscapeModel(rockAccent, {
            anchor: new THREE.Vector3(
                center.x - size.x * 0.22,
                surfaceY + 0.08,
                center.z - size.z * 0.01
            ),
            rotation: new THREE.Euler(-0.04, -0.5, 0.08),
            targetSize: new THREE.Vector3(size.x * 0.18, size.y * 0.13, size.z * 0.2)
        })
        this.hardscapeGroups.push(rockAccent)
        this.group.add(rockAccent)
    }
}
