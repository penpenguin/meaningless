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

  it('anchors the Tweakpane controls as a compact fixed HUD surface', () => {
    expect(styles).toMatch(/\.game-control-pane\s*{[^}]*position:\s*fixed;[^}]*top:\s*1rem;[^}]*right:\s*1rem;/s)
    expect(styles).toMatch(/\.game-control-pane\s*{[^}]*width:\s*min\(22rem,\s*calc\(100vw - 2rem\)\);/s)
  })

  it('keeps pane controls usable on narrow screens', () => {
    expect(styles).toMatch(/@media \(max-width:\s*720px\)\s*{[\s\S]*\.game-control-pane\s*{[^}]*left:\s*0\.75rem;[^}]*right:\s*0\.75rem;/s)
    expect(styles).toMatch(/@media \(max-width:\s*720px\)\s*{[\s\S]*\.game-control-pane\s*{[^}]*width:\s*auto;/s)
  })

  it('removes the legacy authored HUD selectors', () => {
    expect(styles).not.toContain('.hud-overlay')
    expect(styles).not.toContain('.hud-rail')
    expect(styles).not.toContain('.hud-reveal-tab')
  })
})
