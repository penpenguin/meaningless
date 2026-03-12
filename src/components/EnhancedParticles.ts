import * as THREE from 'three'
import type { QualityLevel } from '../types/settings'

type VisualQuality = QualityLevel

interface ParticleSystem {
  points: THREE.Points
  material: THREE.ShaderMaterial
  count: number
}

const bubbleVertexShader = `
  attribute float size;
  attribute float speed;
  attribute float offset;
  attribute float phase;
  attribute float startY;

  varying float vAlpha;

  uniform float time;
  uniform float opacityBoost;
  uniform vec4 tankBounds;

  void main() {
    vec3 pos = position;

    float totalTime = time * speed + offset;
    float progress = mod(totalTime * 0.38, 1.0);
    float travelDistance = tankBounds.y - tankBounds.x;

    pos.y = mix(startY, tankBounds.y - 0.18, progress);
    pos.x += sin(progress * 9.0 + phase) * 0.12 * (0.35 + progress);
    pos.z += cos(progress * 7.0 + phase) * 0.08 * (0.25 + progress);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (260.0 / max(1.0, -mvPosition.z));

    float crestFade = 1.0 - smoothstep(0.82, 1.0, progress);
    vAlpha = crestFade * (0.36 + 0.22 * sin(time * 1.8 + phase)) * opacityBoost;
  }
`

const bubbleFragmentShader = `
  varying float vAlpha;
  uniform vec3 color;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float rim = smoothstep(0.5, 0.22, dist);
    float core = smoothstep(0.3, 0.05, dist);
    vec3 finalColor = color + vec3(core * 0.18);
    float alpha = rim * vAlpha * 0.32;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

const moteVertexShader = `
  attribute float size;
  attribute float speed;
  attribute float offset;
  attribute float phase;

  varying float vAlpha;

  uniform float time;
  uniform float opacityScale;
  uniform vec2 verticalBounds;

  void main() {
    vec3 pos = position;

    float driftTime = time * speed + offset;
    pos.x += sin(driftTime + phase) * 0.09;
    pos.y += sin(driftTime * 0.7 + phase * 1.4) * 0.05;
    pos.z += cos(driftTime * 0.85 + phase) * 0.08;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (180.0 / max(1.0, -mvPosition.z));

    float heightProgress = clamp((pos.y - verticalBounds.x) / max(0.001, verticalBounds.y - verticalBounds.x), 0.0, 1.0);
    float bandFade = 0.35 + sin((heightProgress + phase) * 9.0) * 0.1;
    vAlpha = opacityScale * bandFade;
  }
`

const moteFragmentShader = `
  varying float vAlpha;
  uniform vec3 color;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`

export class EnhancedParticleSystem {
  private group: THREE.Group
  private bubbleSystem: ParticleSystem
  private moteSystem: ParticleSystem

  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    this.group.name = 'enhanced-particles'
    scene.add(this.group)

    this.bubbleSystem = this.createBubbleSystem(bounds)
    this.moteSystem = this.createSuspendedMoteSystem(bounds)

    this.group.add(this.moteSystem.points)
    this.group.add(this.bubbleSystem.points)

    this.setQuality('standard')
  }

  private createBubbleSystem(bounds: THREE.Box3): ParticleSystem {
    const count = 54
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)
    const offsets = new Float32Array(count)
    const phases = new Float32Array(count)
    const startY = new Float32Array(count)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()

    bounds.getSize(size)
    bounds.getCenter(center)

    const emitters = [
      new THREE.Vector3(center.x + size.x * -0.16, bounds.min.y + 0.34, center.z + size.z * 0.08),
      new THREE.Vector3(center.x + size.x * 0.04, bounds.min.y + 0.38, center.z + size.z * -0.18),
      new THREE.Vector3(center.x + size.x * 0.22, bounds.min.y + 0.3, center.z + size.z * 0.12)
    ]

    for (let i = 0; i < count; i++) {
      const emitter = emitters[i % emitters.length]
      const radius = 0.12 + Math.random() * 0.22
      const angle = Math.random() * Math.PI * 2

      positions[i * 3] = emitter.x + Math.cos(angle) * radius
      positions[i * 3 + 1] = emitter.y + Math.random() * 0.95
      positions[i * 3 + 2] = emitter.z + Math.sin(angle) * radius * 0.72

      sizes[i] = 0.38 + Math.random() * 0.68
      speeds[i] = 0.18 + Math.random() * 0.24
      offsets[i] = Math.random() * 24
      phases[i] = Math.random() * Math.PI * 2
      startY[i] = positions[i * 3 + 1]
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    geometry.setAttribute('startY', new THREE.BufferAttribute(startY, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0.9, 0.96, 1.0) },
        opacityBoost: { value: 1 },
        tankBounds: { value: new THREE.Vector4(bounds.min.y, bounds.max.y, 0, 0) }
      },
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    points.name = 'bubble-plumes'
    points.userData = {
      role: 'bubble-plumes',
      emitters
    }

    return {
      points,
      material,
      count
    }
  }

  private createSuspendedMoteSystem(bounds: THREE.Box3): ParticleSystem {
    const count = 180
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)
    const offsets = new Float32Array(count)
    const phases = new Float32Array(count)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()

    bounds.getSize(size)
    bounds.getCenter(center)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.88
      positions[i * 3 + 1] = bounds.min.y + 0.8 + Math.random() * (size.y - 1.8)
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.82

      sizes[i] = 0.12 + Math.random() * 0.34
      speeds[i] = 0.05 + Math.random() * 0.08
      offsets[i] = Math.random() * 18
      phases[i] = Math.random() * Math.PI * 2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0.58, 0.8, 0.84) },
        opacityScale: { value: 0.22 },
        verticalBounds: { value: new THREE.Vector2(bounds.min.y, bounds.max.y) }
      },
      vertexShader: moteVertexShader,
      fragmentShader: moteFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)
    points.name = 'suspended-motes'
    points.userData = {
      role: 'suspended-motes'
    }

    return {
      points,
      material,
      count
    }
  }

  update(time: number): void {
    this.bubbleSystem.material.uniforms.time.value = time
    this.moteSystem.material.uniforms.time.value = time
  }

  setEnabled(enabled: boolean): void {
    this.group.visible = enabled
  }

  setQuality(quality: VisualQuality): void {
    this.bubbleSystem.material.uniforms.opacityBoost.value =
      quality === 'standard' ? 1 : 0.72

    this.moteSystem.points.visible = quality === 'standard'
    this.moteSystem.material.uniforms.opacityScale.value =
      quality === 'standard' ? 0.22 : 0
  }
}
