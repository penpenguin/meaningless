import * as THREE from 'three'

interface ParticleSystem {
  points: THREE.Points
  material: THREE.ShaderMaterial
  count: number
}

export class EnhancedParticleSystem {
  private group: THREE.Group
  private bubbleSystem: ParticleSystem
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    this.bubbleSystem = this.createBubbleSystem(bounds)
    
    this.group.add(this.bubbleSystem.points)
  }
  
  private createBubbleSystem(bounds: THREE.Box3): ParticleSystem {
    const count = 40  // 泡の数を大幅に削減（120→40）
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)
    const offsets = new Float32Array(count)
    const phases = new Float32Array(count)
    const startY = new Float32Array(count)
    
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)
    
    for (let i = 0; i < count; i++) {
      // 泡は水槽の底付近からランダムに生成
      positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.9
      positions[i * 3 + 1] = bounds.min.y + Math.random() * 1.0 // 底から1ユニット以内
      positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.9
      
      // より小さく控えめな泡サイズ
      sizes[i] = Math.random() * 0.8 + 0.3  // サイズを縮小（1.5+0.5 → 0.8+0.3）
      speeds[i] = Math.random() * 0.3 + 0.15  // よりゆっくりと上昇
      offsets[i] = Math.random() * 20
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
        color: { value: new THREE.Color(0.9, 0.95, 1.0) },  // より透明感のある薄い色
        tankBounds: { value: new THREE.Vector4(bounds.min.y, bounds.max.y, 0, 0) }
      },
      vertexShader: `
        attribute float size;
        attribute float speed;
        attribute float offset;
        attribute float phase;
        attribute float startY;
        
        varying float vAlpha;
        varying float vSize;
        
        uniform float time;
        uniform vec4 tankBounds; // min.y, max.y
        
        void main() {
          vec3 pos = position;
          
          float totalTime = time * speed + offset;
          float travelDistance = tankBounds.y - tankBounds.x; // 水槽の高さ
          
          // 底から天井まで連続的に移動
          float progress = mod(totalTime * 0.5, 1.0);
          pos.y = tankBounds.x + progress * travelDistance;
          
          // 泡が上昇するにつれて左右に揺れる
          float wiggle = sin(progress * 10.0 + phase) * 0.1 * progress;
          pos.x += wiggle;
          pos.z += cos(progress * 8.0 + phase) * 0.08 * progress;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          vSize = size;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          // 全体的に透明感を高める
          vAlpha = (1.0 - smoothstep(0.8, 1.0, progress)) * 0.4;  // 基本透明度を下げる
          vAlpha *= (0.6 + 0.2 * sin(time * 2.0 + phase));  // より微妙な変化
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vSize;
        uniform vec3 color;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // よりソフトで透明感のある泡
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha * 0.3;  // 透明度をさらに下げる
          
          // より控えめなハイライト
          float highlight = smoothstep(0.4, 0.15, dist);
          vec3 finalColor = color + vec3(highlight * 0.2);  // ハイライトを控えめに
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return {
      points: new THREE.Points(geometry, material),
      material,
      count
    }
  }
  
  
  
  update(time: number): void {
    this.bubbleSystem.material.uniforms.time.value = time
  }
  
  setEnabled(enabled: boolean): void {
    this.group.visible = enabled
  }
}