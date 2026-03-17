import fs from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outputPath = path.resolve('public/assets/aquarium/driftwood-hero.glb')

const installExporterPolyfills = () => {
  const { window } = new JSDOM('')
  globalThis.Blob = window.Blob
  globalThis.FileReader = window.FileReader
  globalThis.document = {
    createElement: () => ({})
  }
}

const deformDriftwoodTubeGeometry = (geometry, curve, definition) => {
  const position = geometry.getAttribute('position')
  const frameData = geometry
  const normals = frameData.normals
  const binormals = frameData.binormals
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
        Math.exp(-Math.pow((t - 0.22) / 0.08, 2)) * 0.14,
        Math.exp(-Math.pow((t - 0.58) / 0.1, 2)) * 0.18
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

const createDriftwoodTubeMesh = (definition, material) => {
  const curve = new THREE.CatmullRomCurve3(definition.points)
  const geometry = new THREE.TubeGeometry(
    curve,
    definition.tubularSegments,
    definition.radius,
    definition.radialSegments,
    false
  )
  deformDriftwoodTubeGeometry(geometry, curve, definition)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

const groundObject = (object) => {
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const centerX = (box.min.x + box.max.x) * 0.5
  const centerZ = (box.min.z + box.max.z) * 0.5
  object.position.x -= centerX
  object.position.y -= box.min.y
  object.position.z -= centerZ
  object.updateMatrixWorld(true)
}

const exportGlb = async (object) => {
  const exporter = new GLTFExporter()
  return await new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(Buffer.from(result))
          return
        }
        reject(new Error('Expected binary GLB output'))
      },
      reject,
      { binary: true }
    )
  })
}

installExporterPolyfills()

const material = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#8a7258'),
  roughness: 0.95,
  metalness: 0.01
})

const heroDriftwood = new THREE.Group()

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.44,
  points: [
    new THREE.Vector3(-2.38, 0.22, 0.48),
    new THREE.Vector3(-1.28, 0.92, 0.3),
    new THREE.Vector3(0.1, 1.46, 0.02),
    new THREE.Vector3(1.72, 1.88, -0.42),
    new THREE.Vector3(3.12, 1.96, -0.9)
  ],
  tubularSegments: 54,
  radialSegments: 11,
  ellipseAspect: 1.46,
  tipScale: 0.52,
  flare: 0.62,
  twist: 0.56,
  barkAmplitude: 0.14
}, material))

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.18,
  points: [
    new THREE.Vector3(0.18, 1.52, 0.08),
    new THREE.Vector3(1.06, 2.26, 0.72),
    new THREE.Vector3(2.08, 2.48, 1.08)
  ],
  tubularSegments: 30,
  radialSegments: 8,
  ellipseAspect: 1.24,
  tipScale: 0.42,
  flare: 0.26,
  twist: 0.84,
  barkAmplitude: 0.12
}, material))

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.16,
  points: [
    new THREE.Vector3(0.3, 1.48, -0.08),
    new THREE.Vector3(1.28, 1.92, -0.78),
    new THREE.Vector3(2.18, 2.08, -1.34)
  ],
  tubularSegments: 28,
  radialSegments: 8,
  ellipseAspect: 1.2,
  tipScale: 0.4,
  flare: 0.22,
  twist: 0.92,
  barkAmplitude: 0.12
}, material))

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.12,
  points: [
    new THREE.Vector3(-0.86, 1.02, 0.16),
    new THREE.Vector3(-0.1, 1.42, 0.42),
    new THREE.Vector3(0.82, 1.62, 0.56)
  ],
  tubularSegments: 24,
  radialSegments: 7,
  ellipseAspect: 1.18,
  tipScale: 0.44,
  flare: 0.2,
  twist: 0.72,
  barkAmplitude: 0.1
}, material))

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.06,
  points: [
    new THREE.Vector3(-1.82, 0.58, 0.3),
    new THREE.Vector3(-1.68, 0.0, 0.18),
    new THREE.Vector3(-1.54, -0.44, 0.04)
  ],
  tubularSegments: 18,
  radialSegments: 6,
  ellipseAspect: 1.18,
  tipScale: 0.5,
  flare: 0.34,
  twist: 0.44,
  barkAmplitude: 0.1
}, material))

heroDriftwood.add(createDriftwoodTubeMesh({
  radius: 0.054,
  points: [
    new THREE.Vector3(-1.14, 0.42, 0.22),
    new THREE.Vector3(-1.0, -0.18, 0.08),
    new THREE.Vector3(-0.78, -0.4, -0.08)
  ],
  tubularSegments: 18,
  radialSegments: 6,
  ellipseAspect: 1.16,
  tipScale: 0.5,
  flare: 0.32,
  twist: 0.4,
  barkAmplitude: 0.1
}, material))

const rootFlare = new THREE.Mesh(
  new THREE.SphereGeometry(0.62, 20, 16),
  material
)
rootFlare.position.set(-1.92, 0.18, 0.24)
rootFlare.scale.set(2.4, 0.92, 1.58)
rootFlare.rotation.set(-0.14, 0.28, 0.04)
rootFlare.castShadow = true
rootFlare.receiveShadow = true
heroDriftwood.add(rootFlare)

const forkBurl = new THREE.Mesh(
  new THREE.SphereGeometry(0.42, 18, 12),
  material
)
forkBurl.position.set(0.2, 1.44, 0.02)
forkBurl.scale.set(1.36, 0.82, 1.04)
forkBurl.rotation.set(-0.08, 0.24, -0.12)
forkBurl.castShadow = true
forkBurl.receiveShadow = true
heroDriftwood.add(forkBurl)

const brokenStub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.06, 0.42, 8),
  material
)
brokenStub.position.set(1.02, 1.76, -0.12)
brokenStub.rotation.set(-0.26, 0.58, -0.18)
brokenStub.castShadow = true
brokenStub.receiveShadow = true
heroDriftwood.add(brokenStub)

groundObject(heroDriftwood)

const buffer = await exportGlb(heroDriftwood)
fs.writeFileSync(outputPath, buffer)
console.log(outputPath)
