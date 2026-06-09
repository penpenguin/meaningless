Aquarium Web App is a Vite single-page Three.js aquarium experience written in TypeScript. Current stack: Three.js 0.184, Vite 8, Vitest 4 + jsdom, ESLint 10, authored Pure CSS in `src/styles.css`, GLSL imports via `vite-plugin-glsl`, and Tweakpane-backed debug controls in `src/components/GameControlPane.ts`.

Main structure:
- `src/main.ts`: Vite entry and app bootstrap.
- `src/components/`: rendering, aquascape, water, fish, HUD/control pane, and scene systems.
- `src/assets/visualAssets.ts`: public asset manifest/loading for textures, GLB models, and environment assets.
- `src/content/`: fish/decor content registry.
- `src/utils/`: shared runtime/tooling helpers.
- `public/assets/aquarium/`: aquarium textures/models/static assets.

Tailwind/PostCSS/DaisyUI are intentionally not part of the active styling stack. Do not edit `dist/` directly.