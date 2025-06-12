import * as THREE from 'three'

export class EnvironmentLoader {
  private scene: THREE.Scene
  private envMap: THREE.CubeTexture | null = null
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  
  async loadHDRI(): Promise<THREE.CubeTexture> {
    // HDRIの代わりにキューブマップを生成
    const envMap = this.createEnvironmentCubeMap()
    this.envMap = envMap
    
    this.scene.environment = envMap
    this.scene.background = this.createGradientBackground()
    
    return envMap
  }
  
  private createEnvironmentCubeMap(): THREE.CubeTexture {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    const faces = []
    
    // 6面のキューブマップを生成
    for (let i = 0; i < 6; i++) {
      // 室内環境のような照明をシミュレート
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
      
      if (i === 2) { // 上面 - 天井照明
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(0.3, '#e6f2ff')
        gradient.addColorStop(1, '#b3d9ff')
      } else if (i === 3) { // 下面 - 床
        gradient.addColorStop(0, '#2c3e50')
        gradient.addColorStop(1, '#1a252f')
      } else { // 側面 - 壁
        gradient.addColorStop(0, '#34495e')
        gradient.addColorStop(0.5, '#2c3e50')
        gradient.addColorStop(1, '#1a252f')
      }
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      
      // 環境光のハイライトを追加
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = `rgba(106, 199, 214, ${0.1 + Math.random() * 0.1})`
      for (let j = 0; j < 20; j++) {
        const x = Math.random() * size
        const y = Math.random() * size
        const radius = Math.random() * 30 + 10
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      
      faces.push(canvas.toDataURL())
    }
    
    const loader = new THREE.CubeTextureLoader()
    const envMap = loader.load(faces)
    envMap.mapping = THREE.CubeReflectionMapping
    
    return envMap
  }
  
  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#1a4d61')
    gradient.addColorStop(0.3, '#2a5f75')
    gradient.addColorStop(0.7, '#1e3a47')
    gradient.addColorStop(1, '#0a2e3d')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    
    return texture
  }
  
  getEnvironmentMap(): THREE.CubeTexture | null {
    return this.envMap
  }
}