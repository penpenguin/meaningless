# Investigation scripts

When investigating this aquarium app, remember these local Playwright-based scripts are available and should be considered before ad-hoc browser checks:

- Visual/screenshot check: `npm run screenshot` or `node scripts/capture-aquarium-screenshot.mjs [outputPath]`
  - Default URL: `http://127.0.0.1:5173/meaningless/`
  - Useful env: `AQUARIUM_SCREENSHOT_URL`, `AQUARIUM_SCREENSHOT_WAIT_MS`, `AQUARIUM_SCREENSHOT_HIDE_HUD=0`
- Performance measurement: `npm run measure:performance` or `node scripts/measure-aquarium-performance.mjs [outputPath]`
  - Default URL: `http://127.0.0.1:5173/meaningless/`
  - Useful env: `AQUARIUM_PERFORMANCE_URL`, `AQUARIUM_PERFORMANCE_OUTPUT`, `AQUARIUM_PERFORMANCE_DURATION_MS`, `AQUARIUM_PERFORMANCE_HEADLESS=1`
  - A/B switches: `AQUARIUM_PERFORMANCE_POST_PROCESSING=0`, `AQUARIUM_PERFORMANCE_HAZE=0`, `AQUARIUM_PERFORMANCE_SHADOW_MAP_SIZE=1024|2048|4096`

Use these during visual, WebGL, rendering, and performance investigations. They complement `mem:tooling/performance_and_tooling_current`, which tracks broader tooling/performance context.