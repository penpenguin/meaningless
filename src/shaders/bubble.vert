attribute float size;
attribute float speed;
attribute float offset;

varying float vAlpha;

uniform float time;

void main() {
  vec3 pos = position;
  
  float totalTime = time * speed + offset;
  pos.y = mod(totalTime, 10.0) - 5.0;
  
  float wiggle = sin(totalTime * 2.0) * 0.1;
  pos.x += wiggle;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  gl_PointSize = size * (300.0 / -mvPosition.z);
  
  vAlpha = 1.0 - smoothstep(-3.0, 3.0, pos.y);
}