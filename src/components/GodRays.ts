import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { Theme } from '../types/aquarium'
import { defaultTheme } from '../utils/stateSchema'

type GodRayThemeValues = {
  rayTint: THREE.Color
  scatterTint: THREE.Color
  opacityMultiplier: number
  scatterMultiplier: number
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
}

const isHierarchyVisible = (object: THREE.Object3D): boolean => {
  let current: THREE.Object3D | null = object

  while (current) {
    if (!current.visible) {
      return false
    }
    current = current.parent
  }

  return true
}

export const resolveSuspendedMoteScatter = (scene: THREE.Scene): number => {
  const moteLayer = scene.getObjectByName('suspended-motes')
  if (!(moteLayer instanceof THREE.Points) || !isHierarchyVisible(moteLayer)) {
    return 0
  }

  const material = moteLayer.material
  if (!(material instanceof THREE.ShaderMaterial)) {
    return 0
  }

  const opacityScale = material.uniforms.opacityScale?.value
  const positionAttribute = moteLayer.geometry.getAttribute('position')
  const densityFactor = positionAttribute
    ? THREE.MathUtils.clamp(positionAttribute.count / 180, 0, 1)
    : 0.7

  if (typeof opacityScale !== 'number' || opacityScale <= 0) {
    return 0
  }

  return THREE.MathUtils.clamp(opacityScale * (0.62 + densityFactor * 0.9), 0, 0.35)
}

export const resolveGodRayThemeValues = (theme?: Theme): GodRayThemeValues => {
  const resolvedTheme = theme ?? defaultTheme
  const baseWater = new THREE.Color(resolvedTheme.waterTint)
  const fogDensity = THREE.MathUtils.clamp(resolvedTheme.fogDensity, 0, 1)
  const particleDensity = THREE.MathUtils.clamp(resolvedTheme.particleDensity, 0, 1)
  const surfaceGlow = THREE.MathUtils.clamp(resolvedTheme.surfaceGlowStrength ?? defaultTheme.surfaceGlowStrength ?? 0.45, 0, 1)
  const causticsStrength = THREE.MathUtils.clamp(resolvedTheme.causticsStrength ?? defaultTheme.causticsStrength ?? 0.3, 0, 1)
  const clarity = THREE.MathUtils.clamp(1 - (fogDensity * 0.95 + particleDensity * 0.55), 0, 1)

  return {
    rayTint: new THREE.Color('#f5edcc').lerp(
      baseWater.clone().lerp(new THREE.Color('#ffffff'), 0.58),
      0.28 + (1 - clarity) * 0.54
    ),
    scatterTint: baseWater
      .clone()
      .lerp(new THREE.Color('#dff8ff'), 0.22 + clarity * 0.28)
      .lerp(new THREE.Color('#0a1d1f'), (1 - clarity) * 0.18),
    opacityMultiplier: THREE.MathUtils.clamp(
      0.86 + clarity * 0.2 + surfaceGlow * 0.18 + causticsStrength * 0.08 - particleDensity * 0.06,
      0.78,
      1.28
    ),
    scatterMultiplier: THREE.MathUtils.clamp(
      0.72 + particleDensity * 0.38 + fogDensity * 0.16 - clarity * 0.08,
      0.68,
      1.4
    ),
    bloomStrength: THREE.MathUtils.clamp(0.18 + surfaceGlow * 0.22 + clarity * 0.08, 0.14, 0.38),
    bloomRadius: THREE.MathUtils.clamp(0.12 + (1 - clarity) * 0.18 + particleDensity * 0.06, 0.1, 0.38),
    bloomThreshold: THREE.MathUtils.clamp(0.78 - surfaceGlow * 0.12 + particleDensity * 0.08, 0.58, 0.88)
  }
}

export const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 0.25 },  // God Raysをより目立つように
    sunPosition: { value: new THREE.Vector2(0.5, 0.0) },  // 動的な太陽位置
    time: { value: 0 },
    scatterStrength: { value: 0 },
    scatterDrift: { value: new THREE.Vector2(0, 0) },
    rayTint: { value: new THREE.Color('#f5edcc') },
    scatterTint: { value: new THREE.Color('#8bc7d3') }
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
    uniform float time;
    uniform float scatterStrength;
    varying vec2 vUv;
    
    uniform vec2 sunPosition;
    uniform vec2 scatterDrift;
    uniform vec3 rayTint;
    uniform vec3 scatterTint;

    float hash12(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float moteField(vec2 uv, vec2 drift) {
      vec2 cellUvA = uv * vec2(48.0, 82.0) + drift * vec2(18.0, 32.0);
      vec2 localA = fract(cellUvA) - 0.5;
      float seedA = hash12(floor(cellUvA));
      vec2 anchorA = vec2(fract(seedA * 7.13), fract(seedA * 13.71)) - 0.5;
      float sparkleA = smoothstep(0.16, 0.0, length(localA - anchorA * 0.3)) * step(0.82, seedA);

      vec2 cellUvB = uv.yx * vec2(34.0, 56.0) + drift * vec2(-22.0, 14.0);
      vec2 localB = fract(cellUvB) - 0.5;
      float seedB = hash12(floor(cellUvB) + 7.31);
      vec2 anchorB = vec2(fract(seedB * 5.27), fract(seedB * 9.41)) - 0.5;
      float sparkleB = smoothstep(0.18, 0.0, length(localB - anchorB * 0.28)) * step(0.78, seedB);

      return sparkleA * 0.75 + sparkleB * 0.55;
    }
    
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
      
      // 太陽から画面全体への方向ベクトル
      vec2 sunToPixel = vUv - rayCenter;
      float distToSun = length(sunToPixel);
      vec2 rayDirection = normalize(sunToPixel + vec2(0.0001));
      
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
      float shaftMask = clamp(verticalBeam * 0.82 + mainBeam * 0.45, 0.0, 1.0);
      float driftVeil = 0.45 + 0.55 * sin((vUv.y + scatterDrift.y) * 26.0 + (vUv.x + scatterDrift.x) * 13.0 + time * 0.35);
      float moteSparkle = moteField(vUv, scatterDrift + vec2(time * 0.03, time * 0.015));
      float volumetricScatter = (moteSparkle * 0.85 + driftVeil * 0.18) * shaftMask * scatterStrength;
      
      vec3 rayColor = rayTint * combinedRay * opacity;
      rayColor += scatterTint * volumetricScatter;
      
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
  private themeValues: GodRayThemeValues = resolveGodRayThemeValues(defaultTheme)
  
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
    this.applyTheme((scene.userData.theme as Theme | undefined) ?? defaultTheme)
  }
  
  private setUnderwaterParameters(): void {
    this.godRaysPass.uniforms['opacity'].value = 0.2  // より目立つ初期設定
    this.godRaysPass.uniforms['time'].value = 0
    this.godRaysPass.uniforms['scatterStrength'].value = resolveSuspendedMoteScatter(this.scene)
    ;(this.godRaysPass.uniforms['scatterDrift'].value as THREE.Vector2).set(0, 0)
    ;(this.godRaysPass.uniforms['rayTint'].value as THREE.Color).copy(this.themeValues.rayTint)
    ;(this.godRaysPass.uniforms['scatterTint'].value as THREE.Color).copy(this.themeValues.scatterTint)
  }

  public applyTheme(theme: Theme): void {
    this.themeValues = resolveGodRayThemeValues(theme)
    ;(this.godRaysPass.uniforms['rayTint'].value as THREE.Color).copy(this.themeValues.rayTint)
    ;(this.godRaysPass.uniforms['scatterTint'].value as THREE.Color).copy(this.themeValues.scatterTint)
    this.bloomPass.strength = this.themeValues.bloomStrength
    this.bloomPass.radius = this.themeValues.bloomRadius
    this.bloomPass.threshold = this.themeValues.bloomThreshold
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
    const themeValues = this.themeValues ?? resolveGodRayThemeValues(defaultTheme)

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
    this.godRaysPass.uniforms['time'].value = time

    const baseScatter = resolveSuspendedMoteScatter(this.scene)
    const scatterPulse = 0.92 + Math.sin(time * 0.37) * 0.08
    this.godRaysPass.uniforms['scatterStrength'].value =
      baseScatter * scatterPulse * themeValues.scatterMultiplier
    ;(this.godRaysPass.uniforms['scatterDrift'].value as THREE.Vector2).set(
      Math.sin(time * 0.08) * 0.035,
      time * 0.018
    )
    
    // Dynamic opacity animation for more visible rays
    const baseOpacity = 0.22 + baseScatter * 0.18
    const variation = Math.sin(time * 0.2) * 0.04  // より穏やかな変化
    this.godRaysPass.uniforms['opacity'].value = THREE.MathUtils.clamp(
      (baseOpacity * themeValues.opacityMultiplier) + variation,
      0.15,
      0.34
    )
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
