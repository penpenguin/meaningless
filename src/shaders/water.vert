varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float time;

void main() {
  vUv = uv;
  
  vec3 pos = position;
  float wave = sin(pos.x * 2.0 + time) * 0.05 + sin(pos.z * 3.0 + time * 1.5) * 0.03;
  pos.y += wave;
  
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}