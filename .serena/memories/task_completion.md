Before finishing code work:
- For TDD changes, mention the failing test added before the implementation and the final verification commands.
- Run the smallest relevant test first, then broaden based on risk.
- Usual final checks: `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`; add `npm run verify:soc` for non-trivial TypeScript edits/extractions.
- For UI/Three.js visual changes, start the dev server when useful and capture or inspect desktop/mobile views with Playwright screenshot tooling. This repo can be heavy under SwiftShader, so prefer targeted headless checks for routine validation and reserve screenshot-heavy passes for signoff.
- PR notes should include purpose, key changes, verification, and screenshots/video when visuals changed.