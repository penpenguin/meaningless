Fish rendering/motion history compressed from dated UI memories:

- Asset-backed fish: school fish use `InstancedMesh` with loaded school model geometry/material when valid; hero fish use hero GLBs when available; missing/invalid assets fall back to procedural geometry/material. Shared loaded geometries/materials must not be disposed by individual instances.
- Fish texture/material policy preserves authored GLB materials first, supplements only missing maps, and uses alpha testing for school fish where needed to avoid transparent sorting artifacts. Non-model species have procedural texture/fallback coverage.
- Variant alignment: fish variants define forward-axis/orientation corrections. Angelfish school and hero assets use an X -90deg correction quaternion while preserving +X forward so dorsal maps to +Y and ventral to -Y.
- Motion: fish behavior uses mood/depth/turn bias, inertia and arcing turns, individual gait desync, and per-species/variant locomotion tuning. Keep movement supportive for the aquascape rather than visually dominating nature-showcase.
- Nature-showcase fish presentation intentionally lowers density, places fish in depth/lane bands that preserve hardscape readability, and keeps hero accents subtle.
- Simple-quality fish LOD can reduce school update cost; performance stats expose visible fish counts.