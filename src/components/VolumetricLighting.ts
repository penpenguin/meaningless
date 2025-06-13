import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

export class VolumetricLighting {
  private composer!: EffectComposer
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private volumetricPass!: ShaderPass
  private occlusionRenderTarget: THREE.WebGLRenderTarget
  private occlusionComposer!: EffectComposer
  private lightPosition: THREE.Vector3

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.lightPosition = new THREE.Vector3(5, 10, 5)

    // Create render targets
    this.occlusionRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * 0.5,
      window.innerHeight * 0.5
    )

    this.setupOcclusionPass()
    this.setupVolumetricPass()
    this.setupComposer()
  }

  private setupOcclusionPass(): void {
    // Create occlusion scene with black background and white light source
    const occlusionScene = new THREE.Scene()
    
    // Create a bright sphere at light position for occlusion
    const lightGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial)
    lightMesh.position.copy(this.lightPosition)
    occlusionScene.add(lightMesh)

    // Create black material for all other objects
    const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })

    // Clone scene objects and make them black for occlusion
    const sceneObjects: THREE.Mesh[] = []
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const occlusionObject = object.clone()
        occlusionObject.material = blackMaterial
        sceneObjects.push(occlusionObject)
      }
    })

    sceneObjects.forEach(obj => occlusionScene.add(obj))

    this.occlusionComposer = new EffectComposer(this.renderer, this.occlusionRenderTarget)
    this.occlusionComposer.addPass(new RenderPass(occlusionScene, this.camera))
  }

  private setupVolumetricPass(): void {
    const volumetricShader = {
      uniforms: {
        tDiffuse: { value: null },
        tOcclusion: { value: this.occlusionRenderTarget.texture },
        lightPosition: { value: new THREE.Vector2() },
        exposure: { value: 0.2 },
        decay: { value: 0.96 },
        density: { value: 0.8 },
        weight: { value: 0.3 },
        samples: { value: 64 },
        time: { value: 0 },
        fishPositions: { value: new Array(20).fill(new THREE.Vector3(0, -100, 0)) },
        fishCount: { value: 0 }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tOcclusion;
        uniform vec2 lightPosition;
        uniform float exposure;
        uniform float decay;
        uniform float density;
        uniform float weight;
        uniform int samples;
        uniform float time;
        uniform vec3 fishPositions[20];
        uniform int fishCount;
        varying vec2 vUv;
        
        void main() {
          // Original scene color
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Volumetric light scattering
          vec2 texCoord = vUv;
          vec2 deltaTextCoord = texCoord - lightPosition;
          deltaTextCoord *= (1.0 / float(samples)) * density;
          
          float illuminationDecay = 1.0;
          vec4 scattering = vec4(0.0);
          
          for(int i = 0; i < 64; i++) {
            if(i >= samples) break;
            
            texCoord -= deltaTextCoord;
            vec4 occlusionSample = texture2D(tOcclusion, texCoord);
            
            // Use the occlusion to determine light scattering
            float lightIntensity = occlusionSample.r;
            scattering += lightIntensity * illuminationDecay * weight;
            illuminationDecay *= decay;
          }
          
          // Dynamic caustic-like patterns
          float causticPattern = 0.0;
          vec2 causticUV = vUv * 8.0 + time * 0.1;
          for(int i = 0; i < 3; i++) {
            float t = time * 0.5 + float(i) * 2.1;
            vec2 offset = vec2(sin(t * 1.3) * 0.5, cos(t * 0.7) * 0.3);
            vec2 q = causticUV + offset;
            causticPattern += abs(sin(q.x + q.y + t) * sin(q.x - q.y + t * 0.8));
          }
          causticPattern *= 0.15;
          
          // Fish disturbance effects
          float fishDisturbance = 0.0;
          for(int i = 0; i < 20; i++) {
            if(i >= fishCount) break;
            
            vec3 fishPos = fishPositions[i];
            // Project fish position to screen space
            vec2 fishScreen = (fishPos.xy + vec2(10.0, 6.0)) / vec2(20.0, 12.0);
            float distToFish = length(vUv - fishScreen);
            
            if(distToFish < 0.3) {
              float ripple = sin(distToFish * 20.0 - time * 8.0) * exp(-distToFish * 5.0);
              fishDisturbance += ripple * 0.1;
            }
          }
          
          // God ray color with dynamic variations
          vec3 baseGodRayColor = vec3(1.0, 0.9, 0.7);
          vec3 godRayColor = baseGodRayColor + vec3(0.2, 0.1, 0.0) * sin(time * 0.3);
          
          // Add caustic shimmer to the god rays
          godRayColor += vec3(0.3, 0.4, 0.6) * causticPattern;
          
          // Combine effects
          vec3 finalScattering = scattering.rgb * godRayColor * (exposure + fishDisturbance);
          color.rgb += finalScattering;
          
          gl_FragColor = color;
        }
      `
    }

    this.volumetricPass = new ShaderPass(volumetricShader)
  }

  private setupComposer(): void {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.composer.addPass(this.volumetricPass)
  }

  update(camera: THREE.Camera, time: number = 0): void {
    // Convert 3D light position to screen space
    const lightScreenPosition = this.lightPosition.clone()
    lightScreenPosition.project(camera)
    
    // Convert from [-1, 1] to [0, 1] screen coordinates
    const screenX = (lightScreenPosition.x + 1) * 0.5
    const screenY = 1 - (lightScreenPosition.y + 1) * 0.5
    
    this.volumetricPass.uniforms.lightPosition.value.set(screenX, screenY)
    this.volumetricPass.uniforms.time.value = time
    
    // Update occlusion pass
    this.occlusionComposer.render()
  }
  
  updateFishData(fishPositions: THREE.Vector3[]): void {
    const count = Math.min(fishPositions.length, 20)
    this.volumetricPass.uniforms.fishCount.value = count
    
    for (let i = 0; i < count; i++) {
      this.volumetricPass.uniforms.fishPositions.value[i].copy(fishPositions[i])
    }
  }

  render(): void {
    this.composer.render()
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height)
    this.occlusionRenderTarget.setSize(width * 0.5, height * 0.5)
    this.occlusionComposer.setSize(width * 0.5, height * 0.5)
  }

  setLightPosition(position: THREE.Vector3): void {
    this.lightPosition.copy(position)
  }

  dispose(): void {
    this.composer.dispose()
    this.occlusionComposer.dispose()
    this.occlusionRenderTarget.dispose()
  }
}