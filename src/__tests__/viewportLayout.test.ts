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
})
