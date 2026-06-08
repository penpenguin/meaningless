# Refactoring Plan

Last updated: 2026-06-09

## Goal

Reduce the maintenance risk in the aquarium application without changing visible behavior. The main target is the oversized rendering and presentation code, while preserving the current planted showcase look, game state behavior, and screenshot workflow.

All implementation work must follow t-wada TDD:

1. Red: add the smallest failing characterization or regression test first.
2. Green: make the minimum production change needed to pass.
3. Refactor: clean up structure only while the tests stay green.

## Current Findings

- `src/components/AdvancedScene.ts` is the largest coordination point at roughly 5,100 lines.
- `src/components/Aquascaping.ts` is also very large at roughly 5,900 lines and mixes layout data, geometry construction, material decisions, and asset placement.
- `src/components/DetailedFish.ts` is roughly 3,300 lines and mixes species presentation, geometry, motion tuning, and asset-backed variants.
- `src/components/GameHudOverlay.ts` is smaller but still combines DOM creation, event wiring, view state, and rendering.
- Declared package usage needs per-tool treatment. `playwright` is required by `scripts/capture-aquarium-screenshot.mjs`; Tailwind/PostCSS/Autoprefixer are currently wired through the CSS build pipeline (`src/styles.css` and `postcss.config.js`) but provide little value if the stylesheet remains authored CSS.
- `src/styles.css` is roughly 960 lines of mostly authored CSS. Tailwind-specific usage is currently limited to the top-level `@tailwind base`, `@tailwind components`, and `@tailwind utilities` directives; no `@apply` or `theme()` usage has been found.
- DaisyUI is currently only observed through `tailwind.config.js` plugin registration. No app-side DaisyUI class usage has been found, so it should be removed with the CSS toolchain unless new evidence proves real usage.

## Non-Goals

- Do not redesign the aquarium visuals.
- Do not remove assets or generated files unless a failing test proves they are stale or unreachable.
- Do not change public save formats without explicit migration tests.
- Do not replace Three.js, Vite, or Vitest as part of this refactor.
- Do not redesign the HUD while simplifying CSS tooling. A Pure CSS migration must preserve selectors, layout behavior, and responsive breakpoints unless tests intentionally document a change.

## Safety Net First

Before moving production code, inventory the existing characterization tests and extend them only where the current suite does not already lock down the behavior. This keeps the TDD red step focused on the new extraction risk instead of duplicating brittle assertions.

Add or strengthen characterization tests around behavior that is easy to break:

- `AdvancedAquariumScene` lifecycle: initialization, resize handling, render loop start/stop, disposal, and DOM cleanup.
- Scene composition: tank dimensions, camera defaults, photo mode framing, light rig constants, substrate mesh names, and key object counts.
- Aquascape layout: `nature-showcase` hardscape anchors, sand beach curve, plant layer ordering, and deterministic layout seeds.
- Fish presentation: default school counts, hero/accent fish ratios, depth/lane bias, and species-specific asset fallback.
- Save and hydration behavior: keep existing migration and autosave tests green.

Validation command after each meaningful step:

```sh
npm run test
```

Validation command before considering a phase complete:

```sh
npm run test && npm run lint && npm run typecheck && npm run build
```

For phases that touch visual construction, rendering constants, asset paths, or screenshot behavior, also run the screenshot smoke path before closing the phase:

```sh
npm run screenshot
```

## Separation Principles

Keep folders and modules separated by concern so future changes have a clear home:

- `src/components/`: runtime scene objects, Three.js lifecycle classes, and DOM-backed UI components.
- `src/components/*Layout*.ts` and `src/components/*Presentation*.ts`: pure authored presentation rules and layout constants.
- `src/assets/`: runtime asset registries, asset path helpers, and visual asset loading boundaries.
- `src/content/`: catalog/content definitions that describe available fish, decor, unlockable items, and authored metadata.
- `src/game/`: pure game state, reducer, simulation, unlocks, persistence contracts, and render-state mapping.
- `src/types/`: shared domain types and schema-adjacent type definitions.
- `src/utils/`: generic helpers only when they are not owned by a clearer domain folder.
- `scripts/`: Node-only authoring, generation, audio, and screenshot tools.

When extracting code, prefer ownership by domain over generic utility placement:

- Scene setup, camera, lighting, tank glass, water, and postprocessing should not be mixed with game reducer or save logic.
- Aquascape layout data should be reviewable without reading mesh construction code.
- Fish species presentation rules should be separate from geometry factories and runtime animation state.
- Runtime asset loading should be separate from asset authoring scripts.
- DOM event wiring should be separate from pure HUD view-model formatting.

Migration rule: create the destination module with tests first, move one concern at a time, then delete the old inline code only after the suite is green.

## Phase 0: Simplify CSS Toolchain To Pure CSS

Objective: remove Tailwind/PostCSS/DaisyUI tooling when the current UI can be represented by authored CSS without changing visible behavior.

Red:

- Add or update CSS/tooling regression tests before removing packages:
  - `src/styles.css` should not require Tailwind-specific syntax after the migration.
  - `src/styles.css` no longer contains `@tailwind`, `@apply`, or `theme()`.
  - `tailwind.config.js` and `postcss.config.js` are removed when no longer used.
  - `package.json` no longer lists `tailwindcss`, `postcss`, `autoprefixer`, or `daisyui` unless a test documents why one must remain.
- Keep viewport/layout tests focused on the existing selectors and responsive behavior, not on Tailwind implementation details.

Green:

- Replace the three Tailwind entry directives in `src/styles.css` with authored Pure CSS baseline rules that cover the current page, canvas, loading screen, HUD, controls, focus states, and responsive behavior.
- Remove `daisyui`, `tailwindcss`, `postcss`, and `autoprefixer` together only after the CSS entrypoint no longer depends on them.
- Update `package-lock.json` together with `package.json`.
- Keep Vite's normal CSS import path through `src/main.ts`; the goal is to remove the Tailwind/PostCSS plugin pipeline, not to change how the app loads its stylesheet.

Refactor:

- Delete stale CSS config files after package removal.
- Keep selectors stable so existing DOM-oriented tests and HUD code do not need unrelated edits.

Completion criteria:

- `npm run test && npm run lint && npm run typecheck && npm run build` passes.
- `npm run screenshot` passes after the CSS migration.
- `npm ls --depth=0` has no DaisyUI/Tailwind/PostCSS/Autoprefixer direct dependencies unless retained by a documented failing-then-passing test.

## Phase 1: Extract Stable Scene Configuration

Objective: move static constants and pure layout helpers out of `AdvancedScene.ts`.

Red:

- Add tests that lock down exported scene configuration values and pure helper outputs.
- Prefer tests in `src/components/sceneBounds.test.ts`, `src/components/AdvancedScene.test.ts`, or a new colocated test for the extracted module.

Green:

- Extract pure constants and helpers into small modules, for example:
  - `src/components/sceneLighting.ts`
  - `src/components/sceneMaterialConfig.ts`
  - `src/components/substrateGeometry.ts`
- Keep runtime resource creation, texture ownership, and disposal responsibilities explicit. Material and texture factories can be moved later, but they should not be treated as static configuration.

Refactor:

- Remove duplicated inline literals from `AdvancedScene.ts`.
- Keep `AdvancedAquariumScene` as the orchestration class for now.

Completion criteria:

- `AdvancedScene.ts` loses meaningful static configuration without behavior changes.
- Existing camera, substrate, lighting, and disposal tests still pass.
- New modules stay narrowly owned and do not introduce circular imports back into `AdvancedScene.ts`.

## Phase 2: Split Aquascaping Data From Builders

Objective: make `Aquascaping.ts` easier to change by separating authored layout data from mesh creation.

Red:

- Add characterization tests for hardscape anchor data, plant layer ordering, and deterministic seed behavior.
- Add tests that assert exported layout presets do not mutate when builders run.

Green:

- Extract authored data into modules such as:
  - `src/components/aquascapeLayouts.ts`
  - `src/components/aquascapePlants.ts`
  - `src/components/aquascapeHardscape.ts`

Refactor:

- Keep mesh-building APIs compatible with current callers.
- Keep pure layout resolvers free of `THREE.Group` mutation; they should return data.
- Keep builders that mutate `THREE.Group` explicit about their inputs: dimensions, seed, asset registry data, and target group.

Completion criteria:

- Layout data can be reviewed without reading geometry construction code.
- `nature-showcase` visual anchors remain covered by tests.
- Extracted layout modules are data/resolver modules, not hidden rendering coordinators.

## Phase 3: Isolate Fish Presentation Rules

Objective: separate fish configuration and behavior tuning from geometry and asset loading.

Red:

- Add tests for species presentation rules:
  - default counts
  - hero/accent weighting
  - lane/depth bias
  - model-backed versus fallback rendering decisions

Green:

- Extract fish presentation data and rule resolution into modules such as:
  - `src/components/fishPresentation.ts`
  - `src/components/fishMotionProfiles.ts`
  - `src/components/fishGeometryFactory.ts`

Refactor:

- Keep `DetailedFishSystem` as a facade over smaller collaborators.
- Avoid changing actual fish counts or movement curves unless a test intentionally documents the change.

Completion criteria:

- Species tuning can be changed without editing geometry code.
- `DetailedFish.ts` becomes mostly orchestration and system lifecycle.
- Motion profile changes remain testable without creating Three.js meshes.

## Phase 4: Decouple HUD Rendering And Events

Objective: make `GameHudOverlay.ts` easier to test and modify.

Red:

- Add tests for HUD state transitions and emitted callbacks without requiring full DOM reconstruction.
- Keep existing UX tests passing.

Green:

- Extract pure view-model formatting and action mapping into a small module, for example `src/components/gameHudViewModel.ts`.
- Keep DOM creation in `GameHudOverlay.ts`.

Refactor:

- Group event binding and cleanup so disposal behavior is easier to verify.

Completion criteria:

- HUD behavior can be tested through pure functions plus a small DOM integration test.
- Callback and unsubscribe behavior remains covered after event wiring is grouped.

## Phase 5: Normalize Asset Pipeline Boundaries

Objective: make runtime asset loading and authoring scripts easier to reason about.

Red:

- Add tests for asset path registries and screenshot script dependency expectations.
- Keep the existing `captureAquariumScreenshot` tests as the source of truth for Playwright usage.

Green:

- Centralize repeated public asset paths and generated asset naming conventions.
- Keep authoring scripts executable as independent Node ESM scripts.

Refactor:

- Avoid moving binary assets unless the registry tests prove the new paths are equivalent.

Completion criteria:

- Runtime code and asset generation scripts share path conventions without copy/paste drift.

## Phase 6: Tooling And Dependency Hygiene

Objective: keep dependencies intentional after structural work and prevent accidental reintroductions.

Red:

- Add or update tests that describe tooling expectations:
  - Playwright is allowed only because the screenshot script imports it.
  - `@types/three` remains required for typecheck.
  - CSS tooling packages removed in Phase 0 are not reintroduced without documented usage.

Green:

- Remove only dependencies proven unused by tests and static inspection.
- Update `package-lock.json` together with `package.json`.

Refactor:

- Document dependency decisions in `AGENTS.md` or a Serena memory when they affect future agent behavior.

Completion criteria:

- `npm run test && npm run lint && npm run typecheck && npm run build` passes.
- `npm ls --depth=0` has no unexpected direct dependencies.
- CSS dependency status remains explicit: DaisyUI/Tailwind/PostCSS/Autoprefixer stay removed, or any retained/reintroduced package is backed by documented usage and a failing-then-passing test.

## Working Rules

- One refactor target per commit where practical.
- Characterization tests are acceptable when existing behavior is complex but intentional.
- Prefer pure helper extraction before class decomposition.
- Avoid broad renames until behavior is locked down.
- Do not edit `dist/` directly.
- Keep imports and file names aligned with the existing TypeScript ES module style.

## Suggested Order

1. Phase 0: simplify the CSS toolchain to Pure CSS while the behavior surface is still small and independent.
2. Phase 1: extract pure scene configuration from `AdvancedScene.ts`.
3. Phase 2: split authored aquascape layout data from builders.
4. Phase 3: isolate fish presentation rules.
5. Phase 4: decouple HUD view-model logic.
6. Phase 5: normalize asset pipeline boundaries.
7. Phase 6: dependency hygiene checks after structural work.

This order removes low-value CSS tooling first, then attacks the highest line-count and highest coupling areas while keeping each step small enough to protect with fast Vitest coverage.
