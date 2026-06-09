Water, lighting, and environment history compressed from dated UI memories:

- Early visual retuning made the aquarium calmer: deeper teal water tints, warmer sand, closer downward camera, glass/reflection cues, and no page-level scroll on desktop/mobile.
- Environment/background: `EnvironmentLoader` should not own `scene.background`; `createEnvironmentBackdropTexture()` is shared with `applyGradientBackground()` so backdrop/reflection cues share the same depth motif.
- Backdrop/depth planes were feathered with alpha masks and softened opacities to remove rectangular bands. Caustics colors/opacities were shifted away from harsh white stripes toward pale cyan/off-white, with lower base opacity.
- Lighting stack includes layered underwater/canopy lighting, midwater caustic shafts, near-surface and midwater light sheets, godrays/mote scatter, theme-responsive godrays, and daylight freshwater color-script tuning for nature-showcase.
- Glass visuals were progressively reduced; P1 performance work removed glass overlays/front highlights/edge layers as first-class optimization candidates while retaining a natural water-volume look.
- Water/glass high-quality remaster added richer physical material settings and premium highlight layers, but current performance direction favors quality-aware disabling/removal of expensive transparent/glass layers.
- Quality policy: premium/high-quality layers are available only when quality allows; simple quality should suppress or bypass expensive post-processing/transparent overlays.