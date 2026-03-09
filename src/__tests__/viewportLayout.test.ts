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

  it('adds animated panel transitions and custom UI chrome for controls', () => {
    expect(styles).toContain('@keyframes hudPanelEnter')
    expect(styles).toMatch(/\.hud-buttons button\s*{[^}]*transition:/s)
    expect(styles).toMatch(/\.hud-toggle-button\s*{/)
    expect(styles).toMatch(/\.hud-segmented\s*{/)
    expect(styles).toMatch(/\.hud-stat-card\s*{/)
    expect(styles).toMatch(/\.hud-board-shell\s*{/)
  })
})
