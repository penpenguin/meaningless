// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readText = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const readJson = <T>(path: string): T => JSON.parse(readText(path)) as T

type PackageJson = {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

describe('tooling dependency hygiene', () => {
  it('keeps Playwright tied to the screenshot script instead of runtime code', () => {
    const packageJson = readJson<PackageJson>('package.json')
    const screenshotScript = readText('scripts/capture-aquarium-screenshot.mjs')

    expect(packageJson.scripts?.screenshot).toBe('node scripts/capture-aquarium-screenshot.mjs')
    expect(packageJson.dependencies).not.toHaveProperty('playwright')
    expect(packageJson.devDependencies).toHaveProperty('playwright')
    expect(screenshotScript).toContain("from 'playwright'")
  })

  it('keeps Three runtime and type dependencies explicit', () => {
    const packageJson = readJson<PackageJson>('package.json')

    expect(packageJson.dependencies).toHaveProperty('three')
    expect(packageJson.devDependencies).toHaveProperty('@types/three')
  })

  it('documents the current pure CSS and tooling dependency decisions for future agents', () => {
    const agents = readText('AGENTS.md')
    const activeTechnologies = agents.match(/## Active Technologies[\s\S]*?(?=\n## )/)?.[0] ?? ''

    expect(activeTechnologies).toContain('authored Pure CSS')
    expect(activeTechnologies).toContain('Playwright')
    expect(activeTechnologies).toContain('@types/three')
    expect(activeTechnologies).not.toContain('TailwindCSS')
    expect(activeTechnologies).not.toContain('DaisyUI')
  })
})
