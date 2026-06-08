// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readText = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const readJson = <T>(path: string): T => JSON.parse(readText(path)) as T

describe('pure CSS toolchain', () => {
  it('keeps the authored stylesheet free of Tailwind-specific syntax', () => {
    const styles = readText('src/styles.css')

    expect(styles).not.toMatch(/@tailwind\b/)
    expect(styles).not.toMatch(/@apply\b/)
    expect(styles).not.toMatch(/\btheme\(/)
  })

  it('does not keep unused Tailwind, PostCSS, Autoprefixer, or DaisyUI config files', () => {
    expect(existsSync(resolve(process.cwd(), 'tailwind.config.js'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'postcss.config.js'))).toBe(false)
  })

  it('does not list CSS build tooling as direct package dependencies', () => {
    const packageJson = readJson<{
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }>('package.json')
    const directDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    expect(directDependencies).not.toHaveProperty('tailwindcss')
    expect(directDependencies).not.toHaveProperty('postcss')
    expect(directDependencies).not.toHaveProperty('autoprefixer')
    expect(directDependencies).not.toHaveProperty('daisyui')
  })
})
