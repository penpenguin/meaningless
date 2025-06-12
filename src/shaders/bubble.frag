varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  
  if (dist > 0.5) {
    discard;
  }
  
  float alpha = smoothstep(0.5, 0.3, dist) * vAlpha * 0.6;
  vec3 color = vec3(0.8, 0.9, 1.0);
  
  float highlight = smoothstep(0.4, 0.2, dist);
  color += vec3(highlight) * 0.3;
  
  gl_FragColor = vec4(color, alpha);
}