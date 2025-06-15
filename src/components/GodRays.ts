import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

// Ultra-simplified God rays shader to avoid compilation errors
const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 0.25 },  // God Raysをより目立つように
    sunPosition: { value: new THREE.Vector2(0.5, 0.0) }  // 動的な太陽位置
  },
  
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float opacity;
    varying vec2 vUv;
    
    uniform vec2 sunPosition;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Use sun position even if outside screen bounds
      vec2 center = sunPosition;
      
      // Use sun position directly for ray calculation
      vec2 rayCenter = center;
      
      // If sun is off-screen, reduce the effect intensity but keep direction
      float offScreenFactor = 1.0;
      if (center.x < 0.0 || center.x > 1.0 || center.y < 0.0 || center.y > 1.0) {
        offScreenFactor = 0.3;  // Reduce intensity when sun is off-screen
      }
      
      float dist = distance(vUv, rayCenter);
      
      // 太陽から画面全体への方向ベクトル
      vec2 sunToPixel = vUv - rayCenter;
      float distToSun = length(sunToPixel);
      vec2 rayDirection = normalize(sunToPixel);
      
      // 長い光線エフェクト（距離制限なし）
      float longRay = 0.0;
      
      // 太陽方向からの放射状光線（不規則な幅）
      float angle = atan(rayDirection.y, rayDirection.x);
      
      // 複数の周波数を組み合わせて不規則なパターンを作成
      float rayPattern1 = sin(angle * 8.0) * 0.5 + 0.5;  // 基本の8本
      float rayPattern2 = sin(angle * 5.0 + 1.57) * 0.3;  // 5本（位相シフト）
      float rayPattern3 = sin(angle * 11.0 - 0.78) * 0.2;  // 11本（位相シフト）
      
      // ノイズのような変化を追加
      float noisePattern = sin(angle * 23.0) * sin(angle * 17.0) * 0.15;
      
      // パターンを組み合わせて不規則な幅を作成
      float rayPattern = rayPattern1 + rayPattern2 + rayPattern3 + noisePattern;
      rayPattern = clamp(rayPattern, 0.0, 1.0);
      
      // 場所によって異なる鋭さを適用
      float sharpness = 2.0 + sin(angle * 3.0) * 1.5;
      rayPattern = pow(rayPattern, sharpness);  // 不規則な鋭さ
      
      // 距離による減衰（より緩やか）
      float distanceFade = 1.0 / (1.0 + distToSun * 0.5);
      
      // 主要な光線ストリーク
      float mainBeam = rayPattern * distanceFade;
      
      // 縦方向の光線（太陽が上にある時）- 不規則な幅
      float verticalBeam = 0.0;
      if (rayCenter.y <= 1.0) {  // 太陽の高度制限を緩和
        float horizontalDist = abs(vUv.x - rayCenter.x);
        
        // 高さに応じた幅の変化を追加
        float heightVariation = 1.0 + sin(vUv.y * 15.0) * 0.3 + sin(vUv.y * 7.0) * 0.2;
        float widthFactor = 8.0 * heightVariation;
        
        // 複数の光線を重ねて不規則感を出す
        float beam1 = exp(-horizontalDist * widthFactor);
        float beam2 = exp(-horizontalDist * (widthFactor * 0.6)) * 0.5;  // より幅広の薄い光線
        float beam3 = exp(-horizontalDist * (widthFactor * 1.5)) * 0.3;  // より細い光線
        
        verticalBeam = beam1 + beam2 + beam3;
        verticalBeam *= smoothstep(min(rayCenter.y, 0.0), 1.0, vUv.y);  // 上から下へ
        
        // 局所的な強度変化を追加
        verticalBeam *= 0.7 + sin(vUv.y * 40.0 + vUv.x * 10.0) * 0.3;
      }
      
      // 画面外でも見える長い光線
      float screenRay = 0.0;
      if (rayCenter.x < 0.0 || rayCenter.x > 1.0 || rayCenter.y < 0.0 || rayCenter.y > 1.0) {
        // 画面外の太陽からの光線
        vec2 screenCenter = vec2(0.5, 0.5);
        vec2 sunDirection = normalize(rayCenter - screenCenter);
        
        // 太陽方向に基づく光線強度
        float alignment = max(0.0, dot(rayDirection, sunDirection));
        screenRay = pow(alignment, 4.0) * 0.4;  // 太陽方向に向かう光線
      }
      
      // 複数の光線を組み合わせ
      float combinedRay = (mainBeam * 0.4 + verticalBeam * 0.5 + screenRay) * offScreenFactor;
      
      vec3 rayColor = vec3(1.0, 0.95, 0.8) * combinedRay * opacity;
      
      gl_FragColor = vec4(color.rgb + rayColor, 1.0);
    }
  `
}

export class GodRaysEffect {
  private composer: EffectComposer
  private godRaysPass: ShaderPass
  private bloomPass: UnrealBloomPass
  private depthMaterial: THREE.MeshDepthMaterial
  private depthRenderTarget: THREE.WebGLRenderTarget
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private sunMesh: THREE.Group
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    
    // Create depth render target
    const size = renderer.getSize(new THREE.Vector2())
    this.depthRenderTarget = new THREE.WebGLRenderTarget(
      size.width * 0.5, 
      size.height * 0.5,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    )
    
    // Depth material
    this.depthMaterial = new THREE.MeshDepthMaterial()
    
    // Create composer
    this.composer = new EffectComposer(renderer)
    
    // Add render pass
    const renderPass = new RenderPass(scene, camera)
    this.composer.addPass(renderPass)
    
    // Add bloom pass for beautiful blur effect
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.3,  // strength - 大幅に削減
      0.2,  // radius - 小さく
      0.8   // threshold - 高く（太陽のみがブルーム対象）
    )
    this.composer.addPass(this.bloomPass)
    
    // Add god rays pass
    this.godRaysPass = new ShaderPass(GodRaysShader)
    this.composer.addPass(this.godRaysPass)
    
    // Create invisible sun position for GodRay calculation only
    const sunGroup = new THREE.Group()
    this.sunMesh = sunGroup
    this.sunMesh.position.set(0, 15, 0)  // 水槽上方に配置
    // Note: sun mesh not added to scene - only used for position calculation
    
    // Set initial parameters for underwater effect
    this.setUnderwaterParameters()
  }
  
  private setUnderwaterParameters(): void {
    this.godRaysPass.uniforms['opacity'].value = 0.2  // より目立つ初期設定
  }
  
  private renderDepth(): void {
    // Store original materials
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        originalMaterials.set(object, object.material)
        object.material = this.depthMaterial
      }
    })
    
    // Render depth
    this.renderer.setRenderTarget(this.depthRenderTarget)
    this.renderer.render(this.scene, this.camera)
    
    // Restore materials
    originalMaterials.forEach((material, mesh) => {
      mesh.material = material
    })
    
    this.renderer.setRenderTarget(null)
  }
  
  update(time: number): void {
    // Keep sun position fixed above tank center with subtle movement
    this.sunMesh.position.x = Math.sin(time * 0.05) * 1.5  // 微妙な横揺れ
    this.sunMesh.position.y = 15 + Math.sin(time * 0.03) * 0.5  // 微妙な上下
    this.sunMesh.position.z = Math.cos(time * 0.05) * 1.5  // 微妙な前後
    
    // Calculate sun position in screen space
    const sunScreenPosition = new THREE.Vector3()
    sunScreenPosition.copy(this.sunMesh.position)
    sunScreenPosition.project(this.camera)
    
    // Convert to UV coordinates (0-1 range)
    const sunUV = new THREE.Vector2(
      (sunScreenPosition.x + 1) * 0.5,
      (sunScreenPosition.y + 1) * 0.5
    )
    
    // Update shader uniform
    this.godRaysPass.uniforms['sunPosition'].value = sunUV
    
    // Dynamic opacity animation for more visible rays
    const baseOpacity = 0.25
    const variation = Math.sin(time * 0.2) * 0.05  // より穏やかな変化
    this.godRaysPass.uniforms['opacity'].value = Math.max(0.15, baseOpacity + variation)
  }
  
  render(): void {
    this.renderDepth()
    this.composer.render()
  }
  
  resize(width: number, height: number): void {
    this.composer.setSize(width, height)
    this.bloomPass.setSize(width, height)
    this.depthRenderTarget.setSize(width * 0.5, height * 0.5)
  }
  
  dispose(): void {
    this.composer.dispose()
    this.depthRenderTarget.dispose()
    // Sun mesh not added to scene, so no removal needed
  }
}