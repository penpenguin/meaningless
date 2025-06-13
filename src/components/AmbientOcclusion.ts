import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export class AmbientOcclusionRenderer {
  private composer: EffectComposer
  private saoPass: SAOPass
  private renderPass: RenderPass
  private outputPass: OutputPass

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    // Create effect composer
    this.composer = new EffectComposer(renderer)
    
    // Add render pass
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)
    
    // Add Screen Space Ambient Occlusion pass
    this.saoPass = new SAOPass(scene, camera)
    this.setupSAOParameters()
    this.composer.addPass(this.saoPass)
    
    // Add output pass for color space conversion
    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)
  }

  private setupSAOParameters(): void {
    // Fine-tune SAO parameters for underwater scene
    this.saoPass.params = {
      output: SAOPass.OUTPUT.Default, // SAO only
      saoBias: 0.5,
      saoIntensity: 0.18, // Subtle AO for underwater ambiance
      saoScale: 1000,
      saoKernelRadius: 100,
      saoMinResolution: 0,
      saoBlur: true,
      saoBlurRadius: 8,
      saoBlurStdDev: 4,
      saoBlurDepthCutoff: 0.01
    }
  }

  render(): void {
    this.composer.render()
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  setIntensity(intensity: number): void {
    this.saoPass.params.saoIntensity = Math.max(0, Math.min(1, intensity))
  }

  dispose(): void {
    this.composer.dispose()
  }
}