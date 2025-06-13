# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a realistic aquarium web application built with Three.js, TypeScript, and TailwindCSS. The application creates an immersive 3D aquarium experience with realistic fish behavior, water physics, and ambient sounds.

## Essential Commands

### Development
- `npm run dev` - Start the Vite development server
- `npm run build` - Run TypeScript checks and build for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks
- `npm run typecheck` - Run TypeScript type checking only

### Deployment
The project uses GitHub Actions for automated deployment to GitHub Pages. Pushing to the main branch triggers the CI/CD pipeline.

## Architecture Overview

### Core Structure
- **Entry Point**: `src/main.ts` - Initializes the AquariumApp class which manages the loading screen, 3D scene initialization, and user preferences (motion/sound toggles)
- **Scene Orchestration**: `src/components/Scene.ts` - Central orchestrator for the Three.js scene, camera, renderer, and all visual components
- **Fish Behavior**: Uses Boids algorithm (`src/utils/Boids.ts`) for realistic schooling behavior, implemented in `src/components/DetailedFish.ts`
- **Water Effects**: Shader-based water rendering in `src/components/Water.ts` using custom GLSL shaders in `src/shaders/`

### Key Technical Decisions
- **Performance**: Automatic fish count adjustment (100 for desktop, 50 for mobile)
- **Shaders**: All `.vert` and `.frag` files in `src/shaders/` are GLSL shaders imported as strings
- **Accessibility**: Respects `prefers-reduced-motion` media query and includes toggle controls
- **Build**: Vite with chunk splitting for Three.js and Lottie to optimize loading

### Component Dependencies
- Three.js for 3D rendering
- @vueuse/core for reactive utilities
- lottie-web for loading animations
- TailwindCSS + DaisyUI for UI styling
- vite-plugin-glsl for shader imports

## Important Notes
- The project uses TypeScript strict mode - all type errors must be resolved
- GLSL shaders are imported as strings and require the vite-plugin-glsl plugin
- The aquarium theme is customized in `tailwind.config.js`
- Audio features use the Web Audio API and require user interaction to start

## Advanced Rendering Techniques

### Volumetric Lighting (God Rays) Implementation
Based on Three.js postprocessing techniques, volumetric underwater light shafts can be implemented:

#### Implementation Strategy
1. **Multi-Pass Rendering Pipeline**
   - Render scene depth to separate render target
   - Create depth mask for light source occlusion
   - Apply progressive filtering passes (typically 3 passes)
   - Composite final effect with main scene

2. **Performance Optimization**
   - Use reduced resolution (1/4) for effect render targets
   - Implement scissor test to limit processing area
   - Use ping-pong render targets for efficient multi-pass filtering

3. **Key Parameters**
   ```javascript
   // Typical god rays parameters
   const filterLength = 1.0;      // Length of light rays
   const tapsPerPass = 6.0;       // Quality vs performance trade-off
   const numPasses = 3;           // Number of filtering passes
   ```

4. **Shader Structure**
   - **Depth Mask Shader**: Creates occlusion mask from scene depth
   - **Generate Shader**: Creates initial light ray pattern
   - **Combine Shader**: Blends effect with original scene
   - **Fake Sun Shader**: Renders light source (can be adapted for water surface)

5. **Screen-Space Calculations**
   ```javascript
   // Convert world position to screen space
   const sunScreenPos = sunWorldPos.project(camera);
   sunScreenPos.x = (sunScreenPos.x + 1) / 2;
   sunScreenPos.y = (sunScreenPos.y + 1) / 2;
   ```

#### Aquarium-Specific Adaptations
- Light source from water surface (caustics integration)
- Multiple light sources for complex lighting
- Interaction with bubble particles for enhanced realism
- Color tinting for underwater atmosphere (blue-green gradients)

### Advanced Ocean Water Rendering
Based on Three.js ocean shader techniques, realistic water surface can be enhanced:

#### Water Surface Implementation
1. **Water Configuration**
   ```javascript
   const water = new Water(waterGeometry, {
     textureWidth: 512,
     textureHeight: 512,
     waterNormals: normalTexture,  // Normal map for wave details
     sunDirection: new THREE.Vector3(),
     sunColor: 0xffffff,
     waterColor: 0x001e0f,         // Deep ocean color
     distortionScale: 3.7,          // Wave amplitude
     fog: scene.fog !== undefined
   });
   ```

2. **Real-time Animation**
   ```javascript
   // In render loop - creates continuous wave motion
   water.material.uniforms['time'].value += 1.0 / 60.0;
   ```

3. **Key Techniques**
   - **Normal Mapping**: Use high-quality water normal textures with repeat wrapping
   - **Dynamic Sun Direction**: Update sun position for realistic lighting
   - **Environment Mapping**: Use PMREMGenerator for accurate reflections
   - **Tone Mapping**: Apply ACESFilmicToneMapping for photorealistic rendering

4. **Performance Considerations**
   - Texture resolution balance (512x512 is typically sufficient)
   - LOD system for distant water
   - Frustum culling for large water surfaces
   - Conditional rendering based on camera distance

5. **Aquarium-Specific Enhancements**
   - **Underwater View**: Modify shader for viewing from below surface
   - **Caustics Integration**: Combine with caustic effects for light patterns
   - **Depth-based Color**: Vary water color based on depth
   - **Surface Interaction**: Ripples from fish breaking surface
   
#### Shader Uniforms for Fine Control
```javascript
// Essential uniforms for water customization
uniforms: {
  'time': { value: 0.0 },                    // Animation
  'distortionScale': { value: 3.7 },         // Wave size
  'size': { value: 1.0 },                    // Texture scale
  'alpha': { value: 0.9 },                   // Transparency
  'sunDirection': { value: new Vector3() },  // Light direction
  'sunColor': { value: new Color() },        // Light color
  'waterColor': { value: new Color() }       // Base water color
}
```

### Spline-Based Fish Geometry Generation
Advanced technique for creating organic fish shapes using curve interpolation:

#### Implementation Approach
1. **Define Base Splines**
   ```javascript
   // Top curve (fish back)
   const topCurve = new THREE.CatmullRomCurve3([
     [0, 0],
     [0.1, 0.15],
     [1, 0.75],
     [3.5, 1.5],
     [9, 0.5],
     [9.5, 0.45],
     [10, 0.5]
   ].map(p => new THREE.Vector3(p[0], p[1], 0)));
   
   // Bottom curve (fish belly)
   const bottomCurve = new THREE.CatmullRomCurve3([
     [0, 0],
     [0.1, -0.15],
     [0.5, -0.35],
     [4.5, -1],
     [8, -0.6],
     [9.5, -0.45],
     [10, -0.5]
   ].map(p => new THREE.Vector3(p[0], p[1], 0)));
   
   // Side curve (fish width profile)
   const sideCurve = new THREE.CatmullRomCurve3([
     [0, 0, 0],
     [0.1, 0, 0.125],
     [1, 0, 0.375],
     [4, -0.25, 0.6],
     [8, 0, 0.25],
     [10, 0, 0.05]
   ].map(p => new THREE.Vector3(p[0], p[1], p[2])));
   ```

2. **Frame Generation Algorithm**
   ```javascript
   function computeFrames() {
     const frames = [];
     const step = 0.05;
     
     // First frame at origin (all zeros)
     frames.push(new Array(divisions + 1).fill(0).map(() => new THREE.Vector3()));
     
     // Generate frames along x-axis
     for (let i = step; i < 10; i += step) {
       frames.push(getFrame(i));
     }
     
     // Last frame at tail
     frames.push(getFramePoints(topPoints[100], bottomPoints[100], sidePoints[100]));
     return frames;
   }
   
   function getFrame(x) {
     const top = getPoint(topPoints, x);
     const bottom = getPoint(bottomPoints, x);
     const side = getPoint(sidePoints, x);
     return getFramePoints(top, bottom, side);
   }
   
   function getFramePoints(top, bottom, side) {
     const sideR = side;
     const sideL = sideR.clone().setZ(sideR.z * -1);
     
     // Create circular cross-section
     const baseCurve = new THREE.CatmullRomCurve3([
       bottom, sideR, top, sideL
     ], true); // closed curve
     
     return baseCurve.getSpacedPoints(divisions);
   }
   ```

3. **Geometry Construction**
   ```javascript
   // Convert frames to vertex positions
   const pts = [];
   frames.forEach(frame => {
     frame.forEach(p => {
       pts.push(p.x, p.y, p.z);
     });
   });
   
   // Create plane geometry and replace vertices
   const planeGeom = new THREE.PlaneGeometry(1, 1, divisions, frames.length - 1);
   planeGeom.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
   planeGeom.computeVertexNormals();
   ```

4. **Fin Creation Algorithm**
   ```javascript
   function createFin(basePoints, contourPoints, isTop) {
     const basePts = [];
     const shift = 0.05;
     const shiftSign = isTop ? 1 : -1;
     const vAdd = new THREE.Vector3(0, -shift * shiftSign, 0);
     
     // Create base points along body curve
     contourPoints.forEach(p => {
       basePts.push(getPoint(basePoints, p.x).add(vAdd));
     });
     
     // Create reversed arrays for closed shape
     const basePtsRev = basePts.map(p => p.clone()).reverse();
     basePtsRev.shift();
     const contourPointsRev = contourPoints.map(p => p.clone()).reverse();
     contourPointsRev.shift();
     
     // Add z-offset for fin thickness
     basePts.forEach((p, idx, arr) => {
       if (idx > 0 && idx < arr.length - 1) p.setZ(shift * shiftSign);
     });
     basePtsRev.forEach((p, idx, arr) => {
       if (idx < arr.length - 1) p.setZ(-shift * shiftSign);
     });
     
     // Combine all points
     const fullPoints = [...contourPoints, ...contourPointsRev, ...basePts, ...basePtsRev];
     const ps = [];
     fullPoints.forEach(p => ps.push(p.x, p.y, p.z));
     
     // Create fin geometry
     const plane = new THREE.PlaneGeometry(1, 1, (contourPoints.length - 1) * 2, 1);
     plane.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
     plane.computeVertexNormals();
     return plane;
   }
   ```

5. **Tail Fin Special Case**
   ```javascript
   // Create tail fin with interpolation
   const tailfinSlices = 5;
   const tailRatioStep = 1 / tailfinSlices;
   const vTemp = new THREE.Vector3();
   
   for (let i = 1; i <= tailfinSlices; i++) {
     const ratio = i * tailRatioStep;
     frames[frames.length - 1].forEach((p, idx) => {
       vTemp.lerpVectors(p, fullTailPoints[idx], ratio);
       pts.push(vTemp.x, vTemp.y, vTemp.z);
     });
   }
   ```

6. **Linear Interpolation for Curve Sampling**
   ```javascript
   function getPoint(curvePoints, x) {
     const v = new THREE.Vector3();
     for (let i = 0; i < curvePoints.length - 1; i++) {
       const i1 = curvePoints[i];
       const i2 = curvePoints[i + 1];
       if (x >= i1.x && x <= i2.x) {
         const a = (x - i1.x) / (i2.x - i1.x);
         return v.lerpVectors(i1, i2, a);
       }
     }
   }
   ```

7. **Geometry Merging**
   ```javascript
   // Merge all parts into single geometry
   const mainGeom = BufferGeometryUtils.mergeBufferGeometries([
     planeGeom,    // Body
     gDorsal,      // Dorsal fin
     gRect,        // Rear fin
     gPelvicL,     // Left pelvic fin
     gPelvicR      // Right pelvic fin
   ]);
   ```

#### Key Parameters
- `divisions`: 200 (smoothness of curves)
- Frame step: 0.05 (density of cross-sections)
- Fin shift: 0.05 (fin thickness)
- Tail fin slices: 5 (tail transition smoothness)

#### Advantages
- Organic, smooth shapes without manual modeling
- Parametric control over fish proportions
- Easy to create variations by adjusting spline points
- Maintains proper UV mapping for texturing
- Single merged geometry for efficient rendering

#### Performance Optimization
- Pre-calculate static geometry when possible
- Use BufferGeometry for better performance
- Consider LOD (Level of Detail) for distant fish
- Batch similar fish using InstancedMesh
- Merge all fins into single geometry to reduce draw calls

### Logarithmic Spiral Geometry Generation
Mathematical approach for creating natural spiral forms (shells, nautilus):

#### Mathematical Foundation
```javascript
// Logarithmic spiral equation: r = a * e^(b * θ)
function logarithmicSpiral(a, b, thetaStart, thetaEnd, steps) {
  const points = [];
  const deltaTheta = (thetaEnd - thetaStart) / steps;
  
  for (let i = 0; i <= steps; i++) {
    const theta = thetaStart + i * deltaTheta;
    const r = a * Math.exp(b * theta);
    
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = 0; // Can be modified for 3D spirals
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}
```

#### 3D Shell Generation
```javascript
// Create 3D shell from logarithmic spiral
function createShell(spiralPoints, height, rotations) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  
  // Generate shell by rotating spiral around axis
  const heightStep = height / rotations;
  const angleStep = (Math.PI * 2) / rotations;
  
  spiralPoints.forEach((point, i) => {
    for (let j = 0; j < rotations; j++) {
      const angle = j * angleStep;
      const h = j * heightStep;
      
      // Rotate point around y-axis and translate up
      const x = point.x * Math.cos(angle) - point.z * Math.sin(angle);
      const y = point.y + h;
      const z = point.x * Math.sin(angle) + point.z * Math.cos(angle);
      
      vertices.push(x, y, z);
    }
  });
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}
```

#### Performance Optimization Strategies
1. **Pre-generation Approach**
   - Generate a library of shell variations at initialization
   - Randomly select from pre-computed geometries
   - Avoids runtime generation overhead

2. **Level of Detail (LOD)**
   ```javascript
   // Create multiple detail levels
   const shellLOD = new THREE.LOD();
   shellLOD.addLevel(highDetailShell, 0);
   shellLOD.addLevel(mediumDetailShell, 50);
   shellLOD.addLevel(lowDetailShell, 100);
   ```

3. **Geometry Merging**
   - Use ConvexBufferGeometry for complex shapes
   - Apply SubdivisionModifier sparingly (level 2 max)
   - Merge similar shells into single geometry

#### Aquarium Applications
- **Decorative Shells**: Various nautilus and conch shells
- **Coral Formations**: Spiral-based coral structures
- **Fish Paths**: Logarithmic spiral swimming patterns
- **Bubble Trails**: Spiral bubble streams

#### Natural Variations
```javascript
// Parameters for different shell types
const shellTypes = {
  nautilus: { a: 1, b: 0.17, height: 5, rotations: 30 },
  conch: { a: 0.5, b: 0.25, height: 8, rotations: 20 },
  snail: { a: 0.8, b: 0.15, height: 3, rotations: 25 }
};
```

#### Performance Benchmarks
- Desktop (Core i7/i9): 2-5 seconds for complex shell
- Mobile devices: 13-17 seconds (consider pre-generation)
- Optimization crucial for real-time applications

