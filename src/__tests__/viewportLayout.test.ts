import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('viewport layout', () => {
  it('sizes the aquarium container to the viewport', () => {
    expect(styles).toMatch(/#canvas-container\s*{[^}]*width:\s*100vw;/s)
    expect(styles).toMatch(/#canvas-container\s*{[^}]*height:\s*100dvh;/s)
    expect(styles).not.toContain('width: min(92vmin, 760px);')
    expect(styles).not.toContain('height: min(92vmin, 760px);')
    expect(styles).not.toContain('width: min(94vw, 94vh);')
    expect(styles).not.toContain('height: min(94vw, 94vh);')
  })

  it('adds glass reflection layers so the tank reads like an aquarium shell', () => {
    expect(styles).toMatch(/#canvas-container::before\s*{/)
    expect(styles).toMatch(/#canvas-container::after\s*{/)
  })

  it('packs the overlay into a compact mobile bottom sheet', () => {
    expect(styles).toMatch(/@media \(max-width: 960px\)\s*{[\s\S]*\.hud-panel-container\s*{[^}]*max-height:\s*min\(52dvh,\s*30rem\);/s)
    expect(styles).toMatch(/@media \(max-width: 720px\)\s*{[\s\S]*\.hud-guide-hint\s*{[^}]*display:\s*none;/s)
  })

  it('stacks desktop HUD sections in a vertical rail so wrapped controls do not collide', () => {
    expect(styles).toMatch(/\.hud-rail\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*0\.75rem;/s)
    expect(styles).toMatch(/\.hud-panel-container\s*{[^}]*position:\s*relative;/s)
    expect(styles).not.toContain('top: 5.5rem;')
  })

  it('adds animated panel transitions and custom UI chrome for controls', () => {
    expect(styles).toContain('@keyframes hudPanelEnter')
    expect(styles).toMatch(/\.hud-buttons button\s*{[^}]*transition:/s)
    expect(styles).toMatch(/\.hud-toggle-button\s*{/)
    expect(styles).toMatch(/\.hud-segmented\s*{/)
    expect(styles).toMatch(/\.hud-stat-card\s*{/)
    expect(styles).toMatch(/\.hud-board-shell\s*{/)
  })

  it('keeps a fixed reveal tab available when the HUD is hidden', () => {
    expect(styles).toMatch(/\.hud-reveal-tab\s*{[^}]*position:\s*absolute;[^}]*top:\s*1rem;[^}]*right:\s*1rem;/s)
    expect(styles).toMatch(/@media \(max-width: 960px\)\s*{[\s\S]*\.hud-reveal-tab\s*{[^}]*bottom:\s*1rem;/s)
  })

  it('forces hidden HUD elements off-screen even when base display styles are present', () => {
    expect(styles).toMatch(/\.hud-rail\[hidden\],\s*\.hud-reveal-tab\[hidden\]\s*{[^}]*display:\s*none\s*!important;/s)
  })
})
