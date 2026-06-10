Project conventions:
- TypeScript ES modules, 2-space indentation, no semicolons in authored TS/CSS where existing style follows that convention.
- Classes/components use PascalCase; functions, variables, and helpers use camelCase.
- ESLint is strict: unused vars are errors unless intentionally prefixed with `_`.
- Tests use Vitest; browser-like tests use jsdom. Prefer fast unit tests over E2E unless the flow is critical.
- CSS is authored in `src/styles.css`; keep it free of Tailwind/PostCSS/DaisyUI syntax and config unless tests first lock an intentional toolchain change.
- GLSL assets live under `src/shaders/` and are imported through `vite-plugin-glsl`.
- Follow t-wada TDD for code changes: Red -> Green -> Refactor in the smallest practical steps, with a failing test before bug fixes.
- For non-trivial TypeScript changes, use the repo SoC skills/checks and keep module boundaries small.