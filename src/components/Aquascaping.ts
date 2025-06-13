import * as THREE from 'three'

export class AquascapingSystem {
  private group: THREE.Group
  private plants: THREE.Group[] = []
  private decorations: THREE.Group[] = []
  private time = 0
  
  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.group = new THREE.Group()
    scene.add(this.group)
    
    this.createSeaweed(bounds)
    this.createCorals(bounds)
    this.createRocks(bounds)
    this.createSandDetails(bounds)
  }
  
  private createSeaweed(bounds: THREE.Box3): void {
    const seaweedCount = 15
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < seaweedCount; i++) {
      const seaweedGroup = new THREE.Group()
      
      const x = (Math.random() - 0.5) * size.x * 0.7
      const z = (Math.random() - 0.5) * size.z * 0.7
      const y = bounds.min.y + 0.32  // 砂層の高さに合わせる
      
      seaweedGroup.position.set(x, y, z)
      
      const height = 2 + Math.random() * 3
      const segments = Math.floor(height * 3)
      
      for (let j = 0; j < segments; j++) {
        const segmentHeight = height / segments
        const width = 0.1 + (segments - j) * 0.02
        
        const geometry = new THREE.CylinderGeometry(
          width * 0.3, 
          width, 
          segmentHeight, 
          6
        )
        
        const hue = 0.3 + Math.random() * 0.2 // Green variations
        
        // リアルな水草テクスチャを生成
        const seaweedTexture = this.createSeaweedTexture(hue)
        const normalMap = this.createSeaweedNormalMap()
        const roughnessMap = this.createSeaweedRoughnessMap()
        
        const material = new THREE.MeshPhysicalMaterial({
          map: seaweedTexture,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          color: new THREE.Color().setHSL(hue, 0.8, 0.4),
          metalness: 0,
          roughness: 0.9,
          transmission: 0.4,
          thickness: 0.15,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          envMapIntensity: 0.3,
          clearcoat: 0.1,
          clearcoatRoughness: 0.8
        })
        
        const segment = new THREE.Mesh(geometry, material)
        segment.position.y = j * segmentHeight + segmentHeight / 2
        segment.rotation.z = Math.sin(j * 0.5) * 0.2
        segment.userData = { 
          originalRotation: segment.rotation.z,
          swayOffset: Math.random() * Math.PI * 2,
          swayAmplitude: 0.1 + Math.random() * 0.1
        }
        
        seaweedGroup.add(segment)
      }
      
      this.plants.push(seaweedGroup)
      this.group.add(seaweedGroup)
    }
  }
  
  private createCorals(bounds: THREE.Box3): void {
    const coralCount = 8
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < coralCount; i++) {
      const coralGroup = new THREE.Group()
      
      const x = (Math.random() - 0.5) * size.x * 0.6
      const z = (Math.random() - 0.5) * size.z * 0.6
      const y = bounds.min.y + 0.32  // 砂層の高さに合わせる
      
      coralGroup.position.set(x, y, z)
      
      // Branch coral structure
      const branchCount = 3 + Math.floor(Math.random() * 4)
      
      for (let j = 0; j < branchCount; j++) {
        const branchHeight = 0.5 + Math.random() * 1.5
        const branchRadius = 0.05 + Math.random() * 0.03
        
        const geometry = new THREE.ConeGeometry(
          branchRadius * 2,
          branchHeight,
          6
        )
        
        const coralColors = [
          new THREE.Color(0xff6b47),
          new THREE.Color(0xff8c69),
          new THREE.Color(0xffa500),
          new THREE.Color(0xff69b4)
        ]
        
        const material = new THREE.MeshPhysicalMaterial({
          color: coralColors[Math.floor(Math.random() * coralColors.length)],
          metalness: 0,
          roughness: 0.9,
          clearcoat: 0.3,
          clearcoatRoughness: 0.8
        })
        
        const branch = new THREE.Mesh(geometry, material)
        branch.position.y = branchHeight / 2
        branch.rotation.x = (Math.random() - 0.5) * 0.5
        branch.rotation.z = (Math.random() - 0.5) * 0.5
        branch.rotation.y = (j / branchCount) * Math.PI * 2 + Math.random() * 0.5
        
        coralGroup.add(branch)
      }
      
      this.decorations.push(coralGroup)
      this.group.add(coralGroup)
    }
  }
  
  private createRocks(bounds: THREE.Box3): void {
    const rockCount = 12
    const size = new THREE.Vector3()
    bounds.getSize(size)
    
    for (let i = 0; i < rockCount; i++) {
      const rockScale = 0.3 + Math.random() * 0.8
      
      // Irregular rock shape
      const geometry = new THREE.DodecahedronGeometry(rockScale)
      
      // Deform the geometry for natural look
      const positionAttribute = geometry.getAttribute('position')
      for (let j = 0; j < positionAttribute.count; j++) {
        const vertex = new THREE.Vector3()
        vertex.fromBufferAttribute(positionAttribute, j)
        
        const noise = (Math.random() - 0.5) * 0.3
        vertex.multiplyScalar(1 + noise)
        
        positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z)
      }
      geometry.computeVertexNormals()
      
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL(
          0.1 + Math.random() * 0.1, // Brown-gray hues
          0.2 + Math.random() * 0.3,
          0.2 + Math.random() * 0.3
        ),
        metalness: 0.1,
        roughness: 0.9,
        bumpScale: 0.5
      })
      
      const rock = new THREE.Mesh(geometry, material)
      
      const x = (Math.random() - 0.5) * size.x * 0.8
      const z = (Math.random() - 0.5) * size.z * 0.8
      const y = bounds.min.y + 0.32 + rockScale * 0.1  // 砂層の上に配置
      
      rock.position.set(x, y, z)
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      
      rock.receiveShadow = true
      
      this.decorations.push(new THREE.Group().add(rock))
      this.group.add(rock)
    }
  }
  
  private createSandDetails(bounds: THREE.Box3): void {
    // Sand ripples
    const rippleGeometry = new THREE.PlaneGeometry(1, 0.1, 10, 1)
    const rippleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8d5b8,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.3
    })
    
    for (let i = 0; i < 20; i++) {
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
      ripple.rotation.x = -Math.PI / 2
      ripple.rotation.z = Math.random() * Math.PI
      
      const size = new THREE.Vector3()
      bounds.getSize(size)
      
      ripple.position.set(
        (Math.random() - 0.5) * size.x * 0.9,
        bounds.min.y + 0.01,
        (Math.random() - 0.5) * size.z * 0.9
      )
      
      const scale = 0.5 + Math.random() * 2
      ripple.scale.set(scale, 1, scale)
      
      this.group.add(ripple)
    }
  }
  
  update(elapsedTime: number): void {
    this.time = elapsedTime
    
    // Animate seaweed swaying
    this.plants.forEach((plant) => {
      plant.children.forEach((segment, segmentIndex) => {
        if (segment.userData.originalRotation !== undefined) {
          const swayOffset = segment.userData.swayOffset || 0
          const swayAmplitude = segment.userData.swayAmplitude || 0.1
          
          const sway = Math.sin(this.time * 0.8 + swayOffset + segmentIndex * 0.3) * swayAmplitude
          segment.rotation.z = segment.userData.originalRotation + sway
          
          // Add slight x-axis movement
          segment.rotation.x = Math.sin(this.time * 0.5 + swayOffset) * 0.05
        }
      })
    })
  }
  
  private createSeaweedTexture(hue: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // ベース色の設定
    const baseColor = new THREE.Color().setHSL(hue, 0.7, 0.3)
    const darkColor = new THREE.Color().setHSL(hue, 0.8, 0.15)
    const lightColor = new THREE.Color().setHSL(hue, 0.6, 0.5)
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, lightColor.getStyle())
    gradient.addColorStop(0.3, baseColor.getStyle())
    gradient.addColorStop(0.7, baseColor.getStyle())
    gradient.addColorStop(1, darkColor.getStyle())
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 水草の縦縞模様（葉脈）
    ctx.globalCompositeOperation = 'overlay'
    for (let i = 0; i < 8; i++) {
      const x = (i / 7) * canvas.width + Math.sin(i) * 20
      ctx.strokeStyle = `rgba(0, 100, 0, ${0.3 + Math.random() * 0.2})`
      ctx.lineWidth = 2 + Math.random() * 3
      ctx.beginPath()
      ctx.moveTo(x, 0)
      // 曲線的な葉脈
      for (let y = 0; y <= canvas.height; y += 10) {
        const wave = Math.sin(y * 0.02 + i) * 15
        ctx.lineTo(x + wave, y)
      }
      ctx.stroke()
    }
    
    // 細かい質感
    ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 3
      const alpha = 0.1 + Math.random() * 0.2
      
      ctx.fillStyle = `rgba(0, 80, 0, ${alpha})`
      ctx.fillRect(x, y, size, size)
    }
    
    ctx.globalCompositeOperation = 'source-over'
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 2)
    
    return texture
  }
  
  private createSeaweedNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // ベースカラー（法線マップ用）
    ctx.fillStyle = '#8080ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 縦方向の凹凸（葉脈）
    for (let i = 0; i < 8; i++) {
      const x = (i / 7) * canvas.width
      ctx.strokeStyle = '#6060ff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, 0)
      for (let y = 0; y <= canvas.height; y += 5) {
        const wave = Math.sin(y * 0.02 + i) * 10
        ctx.lineTo(x + wave, y)
      }
      ctx.stroke()
    }
    
    // 細かい凹凸
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = 1 + Math.random() * 2
      
      ctx.fillStyle = Math.random() > 0.5 ? '#9090ff' : '#7070ff'
      ctx.fillRect(x, y, size, size)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 2)
    
    return texture
  }
  
  private createSeaweedRoughnessMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // ベースの粗さ
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // ランダムな粗さの変化
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 4
      const roughness = Math.random() * 255
      
      ctx.fillStyle = `rgb(${roughness}, ${roughness}, ${roughness})`
      ctx.fillRect(x, y, size, size)
    }
    
    // 葉脈部分は滑らか
    for (let i = 0; i < 8; i++) {
      const x = (i / 7) * canvas.width
      ctx.strokeStyle = '#404040'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      for (let y = 0; y <= canvas.height; y += 5) {
        const wave = Math.sin(y * 0.02 + i) * 10
        ctx.lineTo(x + wave, y)
      }
      ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 2)
    
    return texture
  }

  setMotionEnabled(enabled: boolean): void {
    // Plants can still sway slightly even when motion is reduced
    this.plants.forEach(plant => {
      plant.children.forEach(segment => {
        if (!enabled && segment.userData.originalRotation !== undefined) {
          segment.rotation.z = segment.userData.originalRotation
          segment.rotation.x = 0
        }
      })
    })
  }
}