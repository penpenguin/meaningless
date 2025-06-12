varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vScreenPosition;

uniform float time;
uniform sampler2D normalMap;
uniform samplerCube envMap;
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;

// Fresnel calculation
float fresnel(vec3 eyeVector, vec3 worldNormal, float power) {
  return pow(1.0 - max(dot(eyeVector, worldNormal), 0.0), power);
}

// Caustics pattern
float caustics(vec2 uv, float time) {
  vec2 p = uv * 8.0;
  float c = 0.0;
  
  for(int i = 0; i < 3; i++) {
    float t = time * 0.5 + float(i) * 2.1;
    vec2 offset = vec2(sin(t * 1.3) * 0.5, cos(t * 0.7) * 0.3);
    
    vec2 q = p + offset;
    c += abs(sin(q.x + q.y + t) * sin(q.x - q.y + t * 0.8));
  }
  
  return c * 0.3;
}

// Advanced noise for water distortion
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  
  for(int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  
  // Enhanced normal mapping
  vec2 normalUv1 = vUv * 4.0 + vec2(time * 0.03, time * 0.02);
  vec2 normalUv2 = vUv * 2.5 - vec2(time * 0.02, time * 0.04);
  vec2 normalUv3 = vUv * 6.0 + vec2(time * 0.01, -time * 0.03);
  
  vec3 normal1 = texture2D(normalMap, normalUv1).xyz * 2.0 - 1.0;
  vec3 normal2 = texture2D(normalMap, normalUv2).xyz * 2.0 - 1.0;
  vec3 normal3 = texture2D(normalMap, normalUv3).xyz * 2.0 - 1.0;
  
  vec3 combinedNormal = normalize(normal1 * 0.5 + normal2 * 0.3 + normal3 * 0.2);
  vec3 worldNormal = normalize(vNormal + combinedNormal * 0.3);
  
  // Environment reflection
  vec3 reflectedDirection = reflect(-viewDirection, worldNormal);
  vec3 envColor = textureCube(envMap, reflectedDirection).rgb;
  
  // Fresnel effect
  float fresnelTerm = fresnel(viewDirection, worldNormal, 2.0);
  
  // Water color based on depth and angle
  vec3 deepWaterColor = vec3(0.0, 0.2, 0.3);
  vec3 shallowWaterColor = vec3(0.3, 0.6, 0.7);
  vec3 waterColor = mix(deepWaterColor, shallowWaterColor, fresnelTerm);
  
  // Caustics effect
  float causticsPattern = caustics(vUv + worldNormal.xz * 0.1, time);
  vec3 causticsColor = vec3(0.8, 0.9, 1.0) * causticsPattern * 0.5;
  
  // Subsurface scattering simulation
  float scattering = max(0.0, dot(worldNormal, -lightDirection)) * 0.3;
  vec3 scatterColor = vec3(0.4, 0.8, 0.9) * scattering;
  
  // Foam on wave peaks
  float foam = smoothstep(0.0, 0.3, abs(worldNormal.y - 1.0));
  vec3 foamColor = vec3(1.0) * foam * 0.2;
  
  // Combine all effects
  vec3 finalColor = waterColor;
  finalColor = mix(finalColor, envColor, fresnelTerm * 0.8);
  finalColor += causticsColor;
  finalColor += scatterColor;
  finalColor += foamColor;
  
  // Specular highlights
  vec3 halfVector = normalize(lightDirection + viewDirection);
  float specular = pow(max(dot(worldNormal, halfVector), 0.0), 64.0);
  finalColor += lightColor * specular * 0.5;
  
  // Depth-based transparency
  float depth = length(vViewPosition);
  float alpha = mix(0.85, 0.95, fresnelTerm);
  
  // Underwater tint based on viewing angle
  float underwater = 1.0 - clamp(dot(vec3(0.0, 1.0, 0.0), viewDirection), 0.0, 1.0);
  finalColor = mix(finalColor, finalColor * vec3(0.8, 0.9, 1.0), underwater * 0.3);
  
  gl_FragColor = vec4(finalColor, alpha);
}