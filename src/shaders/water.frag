varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float time;
uniform sampler2D normalMap;
uniform vec3 cameraPosition;

void main() {
  vec2 normalUv1 = vUv * 3.0 + vec2(time * 0.02, time * 0.01);
  vec2 normalUv2 = vUv * 2.0 - vec2(time * 0.01, time * 0.02);
  
  vec3 normal1 = texture2D(normalMap, normalUv1).xyz * 2.0 - 1.0;
  vec3 normal2 = texture2D(normalMap, normalUv2).xyz * 2.0 - 1.0;
  vec3 combinedNormal = normalize(normal1 + normal2);
  
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  vec3 reflectedDirection = reflect(-viewDirection, combinedNormal);
  
  float fresnel = pow(1.0 - dot(viewDirection, combinedNormal), 2.0);
  
  vec3 waterColor = vec3(0.1, 0.3, 0.4);
  vec3 surfaceColor = vec3(0.4, 0.7, 0.8);
  
  vec3 color = mix(waterColor, surfaceColor, fresnel);
  
  float specular = pow(max(dot(reflectedDirection, vec3(0.0, 1.0, 0.0)), 0.0), 32.0);
  color += vec3(specular) * 0.5;
  
  gl_FragColor = vec4(color, 0.8);
}