Common commands:
- `npm install` for setup.
- `npm run dev` for local Vite dev server.
- `npm run test` for Vitest.
- `npm run typecheck` for `tsc --noEmit`.
- `npm run lint` for ESLint with zero warnings.
- `npm run build` for production build.
- `npm run preview` to inspect a production build.
- `npm run verify:soc` for dependency-cruiser separation-of-concerns checks.
- `npm run screenshot` for local aquarium screenshot tooling.
- `npm run measure:performance` for the Playwright-based performance harness.

Primary regression gate: `npm run test && npm run typecheck && npm run build`; include `npm run lint` and `npm run verify:soc` for code changes that touch TypeScript structure or shared behavior.