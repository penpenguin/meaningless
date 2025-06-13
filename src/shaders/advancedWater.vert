varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vScreenPosition;

uniform float time;
uniform vec3 cameraPosition;

// Fish interaction uniforms
#define MAX_FISH 20
uniform vec3 fishPositions[MAX_FISH];
uniform vec3 fishVelocities[MAX_FISH];
uniform int fishCount;

// Wave parameters
vec3 gerstnerWave(vec2 direction, float amplitude, float frequency, float speed, vec2 position, float time) {
  float phase = frequency * dot(direction, position) + speed * time;
  float c = cos(phase);
  float s = sin(phase);
  
  return vec3(
    direction.x * amplitude * s,
    amplitude * c,
    direction.y * amplitude * s
  );
}

// Fish-generated ripples and wakes
vec3 fishRipples(vec2 position, float time) {
  vec3 totalRipple = vec3(0.0);
  
  for (int i = 0; i < MAX_FISH; i++) {
    if (i >= fishCount) break;
    
    vec3 fishPos = fishPositions[i];
    vec3 fishVel = fishVelocities[i];
    float speed = length(fishVel);
    
    // Only create ripples for fish near the surface
    if (fishPos.y > 2.0 && speed > 0.1) {
      vec2 fishPosXZ = fishPos.xz;
      float distance = length(position - fishPosXZ);
      
      // Circular ripples
      float rippleRadius = time * 2.0;
      float rippleDecay = exp(-distance * 0.3);
      float ripplePhase = distance * 8.0 - time * 5.0;
      float rippleAmplitude = speed * 0.02 * rippleDecay;
      
      // Add time delay based on distance
      float timeDelay = distance * 0.2;
      float delayedTime = max(0.0, time - timeDelay);
      
      if (delayedTime > 0.0 && distance < rippleRadius) {
        float ripple = sin(ripplePhase) * rippleAmplitude;
        totalRipple.y += ripple * smoothstep(rippleRadius, 0.0, distance);
      }
      
      // Kelvin wake for fast-moving fish
      if (speed > 0.3) {
        vec2 velDir = normalize(fishVel.xz);
        float wakeAngle = 19.47 * 3.14159 / 180.0; // Kelvin wake angle
        
        // Check if position is within wake cone
        vec2 toPoint = position - fishPosXZ;
        float alongWake = dot(toPoint, -velDir);
        
        if (alongWake > 0.0 && alongWake < 5.0) {
          vec2 perpWake = toPoint - alongWake * (-velDir);
          float perpDist = length(perpWake);
          float wakeWidth = alongWake * tan(wakeAngle);
          
          if (perpDist < wakeWidth) {
            float wakeFactor = (1.0 - perpDist / wakeWidth) * exp(-alongWake * 0.2);
            float wakeFreq = 6.0;
            float wakePhase = alongWake * wakeFreq - time * speed * 4.0;
            totalRipple.y += sin(wakePhase) * wakeFactor * speed * 0.015;
          }
        }
      }
    }
  }
  
  return totalRipple;
}

void main() {
  vUv = uv;
  
  vec3 pos = position;
  vec2 worldPos = pos.xz;
  
  // Multiple Gerstner waves for realistic water movement
  vec3 wave1 = gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, worldPos, time);
  vec3 wave2 = gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, worldPos, time * 1.1);
  vec3 wave3 = gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, worldPos, time * 0.9);
  vec3 wave4 = gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, worldPos, time * 1.3);
  
  vec3 waveSum = wave1 + wave2 + wave3 + wave4;
  
  // Add fish-generated ripples
  vec3 ripples = fishRipples(worldPos, time);
  waveSum += ripples;
  
  pos += waveSum;
  
  // Calculate normal for lighting
  float normalStrength = 0.3;
  vec3 tangent = normalize(vec3(1.0, 0.0, 0.0));
  vec3 bitangent = normalize(vec3(0.0, 0.0, 1.0));
  
  // Sample neighboring positions for normal calculation
  float offset = 0.01;
  vec3 posX = position + vec3(offset, 0.0, 0.0);
  vec3 posZ = position + vec3(0.0, 0.0, offset);
  
  posX += gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, posX.xz, time);
  posX += gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, posX.xz, time * 1.1);
  posX += gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, posX.xz, time * 0.9);
  posX += gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, posX.xz, time * 1.3);
  posX += fishRipples(posX.xz, time);
  
  posZ += gerstnerWave(normalize(vec2(1.0, 0.3)), 0.08, 0.8, 1.2, posZ.xz, time);
  posZ += gerstnerWave(normalize(vec2(0.7, 1.0)), 0.06, 1.2, 0.8, posZ.xz, time * 1.1);
  posZ += gerstnerWave(normalize(vec2(-0.5, 0.8)), 0.04, 2.0, 1.5, posZ.xz, time * 0.9);
  posZ += gerstnerWave(normalize(vec2(0.2, -1.0)), 0.03, 3.0, 2.0, posZ.xz, time * 1.3);
  posZ += fishRipples(posZ.xz, time);
  
  vec3 dx = posX - pos;
  vec3 dz = posZ - pos;
  
  vec3 normal = normalize(cross(dx, dz));
  vNormal = normalMatrix * normal;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  vec4 viewPosition = viewMatrix * worldPosition;
  vViewPosition = viewPosition.xyz;
  
  gl_Position = projectionMatrix * viewPosition;
  vScreenPosition = gl_Position;
}