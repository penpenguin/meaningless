import * as THREE from 'three'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { Theme } from '../../types/aquarium'
import type { QualityLevel } from '../../types/settings'

const usesScreenSpaceWaterHaze = (theme: Theme): boolean => (
  theme.layoutStyle === 'nature-showcase' ||
  (theme.layoutStyle === 'planted' && theme.fogDensity <= 0.08 && theme.glassFrameStrength >= 0.7)
)

export const ScreenSpaceWaterHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    hazeColor: { value: new THREE.Color('#07110f') },
    opacity: { value: 0 },
    innerRadius: { value: 0.34 },
    outerRadius: { value: 0.88 },
    lowerStrength: { value: 0.52 },
    aspect: { value: 16 / 9 },
    blurRadius: { value: 0 },
    edgeBlurStrength: { value: 0 },
    lowerBlurStrength: { value: 0 },
    horizonY: { value: 0.42 },
    horizonWidth: { value: 0.075 },
    horizonStrength: { value: 0 }
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
    uniform vec3 hazeColor;
    uniform float opacity;
    uniform float innerRadius;
    uniform float outerRadius;
    uniform float lowerStrength;
    uniform float aspect;
    uniform float blurRadius;
    uniform float edgeBlurStrength;
    uniform float lowerBlurStrength;
    uniform float horizonY;
    uniform float horizonWidth;
    uniform float horizonStrength;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - vec2(0.5);
      centered.x *= aspect;
      float radial = smoothstep(innerRadius, outerRadius, length(centered));
      float lower = smoothstep(0.58, 0.02, vUv.y) * lowerStrength;
      float upper = smoothstep(0.76, 1.0, vUv.y) * 0.18;
      float horizonDrift = (sin(vUv.x * 16.0) * 0.018) + (sin(vUv.x * 37.0 + 0.7) * 0.009);
      float horizon = pow(1.0 - smoothstep(0.0, horizonWidth, abs(vUv.y - (horizonY + horizonDrift))), 1.45) * horizonStrength;
      float haze = clamp((clamp(radial + lower + upper, 0.0, 1.0) * opacity) + (horizon * 0.18), 0.0, 1.0);
      float blurMask = clamp((radial * edgeBlurStrength) + (lower * lowerBlurStrength) + (upper * 0.62) + (horizon * 0.45), 0.0, 1.0);
      vec2 texel = vec2(blurRadius / max(aspect, 0.001), blurRadius);
      vec2 wideTexel = texel * 2.15;
      vec3 blurColor = base.rgb * 0.12;
      blurColor += texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb * 0.07;
      blurColor += texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb * 0.07;
      blurColor += texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb * 0.07;
      blurColor += texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb * 0.07;
      blurColor += texture2D(tDiffuse, vUv + texel).rgb * 0.065;
      blurColor += texture2D(tDiffuse, vUv - texel).rgb * 0.065;
      blurColor += texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)).rgb * 0.065;
      blurColor += texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)).rgb * 0.065;
      blurColor += texture2D(tDiffuse, vUv + vec2(wideTexel.x, 0.0)).rgb * 0.045;
      blurColor += texture2D(tDiffuse, vUv - vec2(wideTexel.x, 0.0)).rgb * 0.045;
      blurColor += texture2D(tDiffuse, vUv + vec2(0.0, wideTexel.y)).rgb * 0.045;
      blurColor += texture2D(tDiffuse, vUv - vec2(0.0, wideTexel.y)).rgb * 0.045;
      blurColor += texture2D(tDiffuse, vUv + wideTexel).rgb * 0.04;
      blurColor += texture2D(tDiffuse, vUv - wideTexel).rgb * 0.04;
      blurColor += texture2D(tDiffuse, vUv + vec2(wideTexel.x, -wideTexel.y)).rgb * 0.04;
      blurColor += texture2D(tDiffuse, vUv + vec2(-wideTexel.x, wideTexel.y)).rgb * 0.04;
      vec3 softened = mix(base.rgb, blurColor, blurMask);
      vec3 color = mix(softened, hazeColor, haze);
      gl_FragColor = vec4(color, base.a);
    }
  `
} as const

export const syncScreenSpaceWaterHazePass = (
  pass: ShaderPass | null | undefined,
  theme: Theme,
  quality: QualityLevel,
  aspect?: number
): void => {
  if (!pass) return

  const enabled = usesScreenSpaceWaterHaze(theme)
  const glassReflectionStrength = theme.glassReflectionStrength ?? 0
  const causticsStrength = theme.causticsStrength ?? 0
  const baseOpacity = enabled
    ? 0.1 + (glassReflectionStrength * 0.015) + (causticsStrength * 0.008)
    : 0
  const qualityScale = quality === 'simple' ? 0.54 : 1

  pass.enabled = enabled
  pass.uniforms.hazeColor.value = new THREE.Color(theme.waterTint).lerp(new THREE.Color('#08100e'), 0.82)
  pass.uniforms.opacity.value = quality === 'simple' ? baseOpacity * 0.72 : baseOpacity
  pass.uniforms.innerRadius.value = enabled ? 0.32 : 0.48
  pass.uniforms.outerRadius.value = enabled ? 0.84 : 1.1
  pass.uniforms.lowerStrength.value = enabled ? 0.46 : 0
  pass.uniforms.blurRadius.value = enabled ? 0.01 * qualityScale : 0
  pass.uniforms.edgeBlurStrength.value = enabled ? 0.5 * qualityScale : 0
  pass.uniforms.lowerBlurStrength.value = enabled ? 0.7 * qualityScale : 0
  pass.uniforms.horizonY.value = 0.42
  pass.uniforms.horizonWidth.value = enabled ? 0.16 : 0.075
  pass.uniforms.horizonStrength.value = enabled ? 0.55 * qualityScale : 0
  if (aspect !== undefined) {
    pass.uniforms.aspect.value = aspect
  }
}
