import * as THREE from 'three'

// Unused - kept for reference
/*
interface SpiralParams {
  a: number      // Spiral scaling factor
  b: number      // Spiral tightness
  height: number // Shell height
  rotations: number
  segments: number
}

interface SpiralParams {
  a: number
  b: number  
  height: number
  rotations: number
  segments: number
}
*/

// Unused - kept for reference
/*
const SHELL_TYPES = {
  nautilus: { a: 1, b: 0.17, height: 5, rotations: 30, segments: 100 },
  conch: { a: 0.5, b: 0.25, height: 8, rotations: 20, segments: 80 },
  snail: { a: 0.8, b: 0.15, height: 3, rotations: 25, segments: 90 },
  coral: { a: 0.3, b: 0.3, height: 12, rotations: 40, segments: 120 }
}
*/

export class SpiralDecorations {
  private shells: THREE.Mesh[] = []
  private corals: THREE.Mesh[] = []
  private lightBeams: THREE.Mesh[] = []
  private scene: THREE.Scene
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.generateDecorations()
  }
  
  private generateDecorations(): void {
    // Light beams removed - GodRay effect handles lighting now
  }
  
  // Unused - kept for reference
  /*
  private createLightBeam(
    position: THREE.Vector3,
    intensity: number,
    color: number
  ): void {
    // Create light beam geometry (円錐形の光線)
    const geometry = new THREE.ConeGeometry(
      0.1 + intensity * 0.3,  // 上部の半径（小さく）
      8,                      // 光線の長さ（水面から底まで）
      8,                      // 放射状セグメント
      1,                      // 高さセグメント
      false,                  // 開いた円錐
      0,                      // 開始角度
      Math.PI * 2             // 全周
    )
    
    // 光線マテリアル（極めて透明で発光効果）
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.02,          // 極めて薄い光線
      blending: THREE.AdditiveBlending,  // 加算合成で光の効果
      side: THREE.DoubleSide,
      depthWrite: false
    })
    
    const lightBeam = new THREE.Mesh(geometry, material)
    
    // 位置設定（水面近くから下向きに）
    lightBeam.position.copy(position)
    lightBeam.position.y -= 4  // 下向きに配置
    
    // 回転設定（下向きの光線）
    lightBeam.rotation.x = Math.PI  // 180度回転して下向きに
    
    // わずかな角度をつけて自然な光線に
    lightBeam.rotation.z = (Math.random() - 0.5) * 0.3
    lightBeam.rotation.y = (Math.random() - 0.5) * 0.2
    
    this.scene.add(lightBeam)
    this.lightBeams.push(lightBeam)
  }
  */
  
  // Unused - kept for reference
  /*
  private createShell(
    type: keyof typeof SHELL_TYPES,
    position: THREE.Vector3,
    scale: number,
    color: number
  ): void {
    const params = SHELL_TYPES[type]
    const geometry = this.createSpiralGeometry(params)
    
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 80,
      transparent: true,
      opacity: 0.08,  // 極めて透明に（90%以上透明）
      depthWrite: false,  // 透明度の描画順序を改善
      alphaTest: 0.001,  // ほぼ見えない部分もレンダリング
      side: THREE.DoubleSide  // 両面レンダリングで美しく
    })
    
    // Add subtle texture variation
    this.addShellTexture(material, type)
    
    const shell = new THREE.Mesh(geometry, material)
    shell.position.copy(position)
    shell.scale.setScalar(scale)
    
    // Random orientation
    shell.rotation.x = Math.random() * Math.PI * 2
    shell.rotation.y = Math.random() * Math.PI * 2
    shell.rotation.z = Math.random() * Math.PI * 2
    
    this.scene.add(shell)
    this.shells.push(shell)
  }
  */
  
  // Unused - kept for reference
  /*
  private createCoral(
    position: THREE.Vector3,
    scale: number,
    color: number
  ): void {
    const coralGroup = new THREE.Group()
    
    // Create minimal spiral branches for coral effect (削減)
    const branchCount = 2 + Math.floor(Math.random() * 2)  // 2-3本のみ
    
    for (let i = 0; i < branchCount; i++) {
      const branchParams = {
        ...SHELL_TYPES.coral,
        a: 0.2 + Math.random() * 0.3,
        b: 0.25 + Math.random() * 0.15,
        height: 8 + Math.random() * 8,
        rotations: 25 + Math.random() * 20
      }
      
      const geometry = this.createCoralBranch(branchParams)
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color).offsetHSL(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.1
        ),
        shininess: 30,
        transparent: true,
        opacity: 0.05,  // コーラルも極めて透明に（95%透明）
        depthWrite: false,
        alphaTest: 0.001,
        side: THREE.DoubleSide  // 両面レンダリング
      })
      
      const branch = new THREE.Mesh(geometry, material)
      
      // Position branches randomly around center
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5
      const radius = Math.random() * 0.5
      branch.position.set(
        Math.cos(angle) * radius,
        Math.random() * 2,
        Math.sin(angle) * radius
      )
      
      branch.rotation.x = Math.random() * 0.5
      branch.rotation.z = Math.random() * 0.5
      
      coralGroup.add(branch)
    }
    
    coralGroup.position.copy(position)
    coralGroup.scale.setScalar(scale)
    
    this.scene.add(coralGroup)
    this.corals.push(coralGroup as any)
  }
  */
  
  // Unused - kept for reference
  /*
  private createSpiralGeometry(params: SpiralParams): THREE.BufferGeometry {
    const { a, b, height, rotations, segments } = params
    
    // Use simple predefined geometries instead of complex spiral calculations
    try {
      // Generate logarithmic spiral points safely
      const spiralPoints = this.logarithmicSpiral(a, b, 0, Math.PI * 2 * rotations, segments)
      
      // Validate points before creating geometry
      const validPoints = spiralPoints.filter(p => 
        !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) &&
        isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
      )
      
      if (validPoints.length < 3) {
        // Fallback to simple geometry
        return this.createSimpleShellGeometry(params)
      }
      
      // Create 3D shell geometry
      return this.createShellFromSpiral(validPoints, height, rotations)
    } catch (error) {
      console.warn('Failed to create spiral geometry, using simple shell:', error)
      return this.createSimpleShellGeometry(params)
    }
  }
  
  private createSimpleShellGeometry(params: SpiralParams): THREE.BufferGeometry {
    // Create a simple shell-like shape using basic geometry
    const geometry = new THREE.SphereGeometry(params.a, 8, 6)
    
    // Stretch it to look more shell-like
    const positions = geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= 1.5        // X - make it longer
      positions[i + 1] *= 0.8    // Y - flatten slightly
      positions[i + 2] *= 1.2    // Z - moderate depth
    }
    
    geometry.attributes.position.needsUpdate = true
    return geometry
  }
  
  private logarithmicSpiral(
    a: number,
    b: number,
    thetaStart: number,
    thetaEnd: number,
    steps: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    
    // Enhanced parameter validation
    if (!isFinite(a) || !isFinite(b) || a <= 0 || steps <= 0) {
      console.warn('Invalid spiral parameters, using fallback')
      return this.createFallbackSpiral(a, steps)
    }
    
    const safeSteps = Math.max(10, Math.min(steps, 200))
    const deltaTheta = (thetaEnd - thetaStart) / safeSteps
    
    // Adaptive scaling to prevent overflow
    const maxTheta = thetaEnd
    const maxExponent = b * maxTheta
    let scaleFactor = 1
    
    if (maxExponent > 8) {
      scaleFactor = 8 / maxExponent
      console.log(`Scaling spiral by ${scaleFactor} to prevent overflow`)
    }
    
    for (let i = 0; i <= safeSteps; i++) {
      const theta = thetaStart + i * deltaTheta
      
      // Apply scaling and compute radius
      const scaledExponent = b * theta * scaleFactor
      const r = a * Math.exp(scaledExponent)
      
      // Enhanced validation
      if (!isFinite(r) || r > 100 || r < 0.001) {
        if (points.length > 0) {
          // Use last valid point with slight variation
          const lastPoint = points[points.length - 1]
          const variation = 0.01 * i
          points.push(new THREE.Vector3(
            lastPoint.x + variation,
            lastPoint.y + variation,
            lastPoint.z
          ))
        }
        continue
      }
      
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      const z = theta * 0.1 // Add slight z-variation for 3D effect
      
      // Strict validation
      if (isFinite(x) && isFinite(y) && isFinite(z) &&
          Math.abs(x) < 1000 && Math.abs(y) < 1000) {
        points.push(new THREE.Vector3(x, y, z))
      }
    }
    
    // Ensure minimum viable spiral
    if (points.length < 5) {
      console.warn('Generated spiral too short, using enhanced fallback')
      return this.createEnhancedFallbackSpiral(a, b, safeSteps)
    }
    
    return points
  }
  
  private createFallbackSpiral(a: number, steps: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    const safeA = Math.max(0.1, Math.min(a, 2))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const theta = t * Math.PI * 4 // Two full rotations
      const r = safeA * (1 + t * 2) // Linear growth instead of exponential
      
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      const z = t * 0.5
      
      points.push(new THREE.Vector3(x, y, z))
    }
    
    return points
  }
  
  private createEnhancedFallbackSpiral(a: number, b: number, steps: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    const safeA = Math.max(0.1, Math.min(a, 2))
    const safeB = Math.max(0.01, Math.min(Math.abs(b), 0.3))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const theta = t * Math.PI * 6 // Three full rotations
      
      // Use power function instead of exponential for safety
      const r = safeA * Math.pow(1 + t, safeB * 10)
      
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      const z = t * 1.5 // More pronounced 3D effect
      
      points.push(new THREE.Vector3(x, y, z))
    }
    
    return points
  }
  
  private createShellFromSpiral(
    spiralPoints: THREE.Vector3[],
    height: number,
    rotations: number
  ): THREE.BufferGeometry {
    const vertices: number[] = []
    const indices: number[] = []
    const uvs: number[] = []
    
    const heightStep = height / rotations
    const angleStep = (Math.PI * 2) / rotations
    
    let vertexIndex = 0
    
    // Generate shell surface
    for (let i = 0; i < spiralPoints.length - 1; i++) {
      const point1 = spiralPoints[i]
      const point2 = spiralPoints[i + 1]
      
      for (let j = 0; j < rotations; j++) {
        const angle1 = j * angleStep
        const angle2 = (j + 1) * angleStep
        const h1 = j * heightStep
        const h2 = (j + 1) * heightStep
        
        // Create quad vertices
        const v1 = this.rotateAroundY(point1, angle1, h1)
        const v2 = this.rotateAroundY(point2, angle1, h1)
        const v3 = this.rotateAroundY(point2, angle2, h2)
        const v4 = this.rotateAroundY(point1, angle2, h2)
        
        // Validate vertices before adding
        const vertices_to_add = [v1, v2, v3, v4]
        let allValid = true
        
        for (const v of vertices_to_add) {
          if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z)) {
            allValid = false
            break
          }
        }
        
        if (!allValid) {
          continue // Skip this quad if any vertex is invalid
        }
        
        // Add vertices
        vertices.push(v1.x, v1.y, v1.z)
        vertices.push(v2.x, v2.y, v2.z)
        vertices.push(v3.x, v3.y, v3.z)
        vertices.push(v4.x, v4.y, v4.z)
        
        // Add UVs
        const u1 = i / (spiralPoints.length - 1)
        const u2 = (i + 1) / (spiralPoints.length - 1)
        const v_1 = j / rotations
        const v_2 = (j + 1) / rotations
        
        uvs.push(u1, v_1, u2, v_1, u2, v_2, u1, v_2)
        
        // Add indices for two triangles
        indices.push(
          vertexIndex, vertexIndex + 1, vertexIndex + 2,
          vertexIndex, vertexIndex + 2, vertexIndex + 3
        )
        
        vertexIndex += 4
      }
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    
    return geometry
  }
  */
  
  // Unused methods - commented out to fix build errors
  /*
  private createCoralBranch(params: SpiralParams): THREE.BufferGeometry {
    // Create simple coral using basic geometry to avoid NaN issues
    try {
      const geometry = new THREE.CylinderGeometry(
        params.a * 0.1,     // top radius
        params.a * 0.2,     // bottom radius  
        params.height,      // height
        8,                  // radial segments
        4                   // height segments
      )
      
      // Add some organic variation
      const positions = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        const noise = Math.sin(i * 0.1) * 0.05
        positions[i] += noise      // x
        positions[i + 2] += noise  // z
      }
      
      geometry.attributes.position.needsUpdate = true
      return geometry
    } catch (error) {
      console.warn('Failed to create coral branch, using simple cylinder:', error)
      return new THREE.CylinderGeometry(0.1, 0.2, params.height, 6, 2)
    }
  }
  
  private rotateAroundY(point: THREE.Vector3, angle: number, height: number): THREE.Vector3 {
    const x = point.x * Math.cos(angle) - point.z * Math.sin(angle)
    const y = point.y + height
    const z = point.x * Math.sin(angle) + point.z * Math.cos(angle)
    
    return new THREE.Vector3(x, y, z)
  }
  
  private addShellTexture(material: THREE.MeshPhongMaterial, type: string): void {
    // Add simple color variation based on shell type without custom shaders
    const baseColor = material.color.clone()
    
    if (type === 'nautilus') {
      material.color.multiplyScalar(1.1)
    } else if (type === 'conch') {
      material.color.offsetHSL(0, 0, 0.1)
    }
    
    // Store original color for animation
    ;(material as any).userData = {
      originalColor: baseColor,
      type: type,
      time: 0
    }
  }
  */
  
  update(deltaTime: number): void {
    // Light beam animation (光線の微妙な動き)
    const time = performance.now() * 0.001
    
    this.lightBeams.forEach((beam, index) => {
      const phase = index * 1.2
      
      // 光線の強度の微妙な変化
      const material = beam.material as THREE.MeshBasicMaterial
      const baseOpacity = 0.02
      const variation = Math.sin(time * 0.5 + phase) * 0.01
      material.opacity = Math.max(0.005, baseOpacity + variation)
      
      // 光線の微妙な揺れ（水面の波の影響）
      const sway = Math.sin(time * 0.3 + phase) * 0.02
      beam.rotation.z += sway * deltaTime
      
      // 光線の角度の微妙な変化
      const angleShift = Math.sin(time * 0.2 + phase * 0.8) * 0.01
      beam.rotation.y += angleShift * deltaTime
    })
    
    // Keep original shell and coral animations for any remaining decorations
    this.shells.forEach((shell, index) => {
      const phase = index * 0.5
      shell.rotation.y += deltaTime * 0.03
      shell.position.y += Math.sin(time + phase) * 0.001
    })
    
    this.corals.forEach((coral, index) => {
      const phase = index * 0.7
      coral.rotation.y += deltaTime * 0.02
      
      coral.children.forEach((branch, branchIndex) => {
        const branchPhase = phase + branchIndex * 0.3
        branch.rotation.z = Math.sin(time * 0.3 + branchPhase) * 0.05
      })
    })
  }
  
  dispose(): void {
    this.lightBeams.forEach(beam => {
      this.scene.remove(beam)
      beam.geometry.dispose()
      ;(beam.material as THREE.Material).dispose()
    })
    
    this.shells.forEach(shell => {
      this.scene.remove(shell)
      shell.geometry.dispose()
      ;(shell.material as THREE.Material).dispose()
    })
    
    this.corals.forEach(coral => {
      this.scene.remove(coral)
      coral.children.forEach(branch => {
        (branch as THREE.Mesh).geometry.dispose()
        ;((branch as THREE.Mesh).material as THREE.Material).dispose()
      })
    })
    
    this.lightBeams = []
    this.shells = []
    this.corals = []
  }
}