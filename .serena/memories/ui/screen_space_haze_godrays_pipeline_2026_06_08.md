# Screen-space haze and GodRays pipeline

In `AdvancedScene`, the visible render path normally goes through `GodRaysEffect.render()` when `advancedEffectsEnabled` is true. A haze/blur pass added only to `AdvancedScene`'s local `EffectComposer` will not be visible in that mode.

The screen-space water haze shader/config now lives in `src/components/screenSpaceWaterHaze.ts` and is installed in both composers:
- `AdvancedScene.setupComposer()` for non-godrays fallback rendering.
- `GodRaysEffect` composer after the god-rays pass for the normal advanced-effects render path.

`AdvancedScene.syncScreenSpaceHazePass()` must sync theme, quality, and aspect to both the local pass and `GodRaysEffect.configureScreenSpaceWaterHaze()`. This is the critical path for hiding nature-showcase floor/tank edges with blur/tint in normal rendering.