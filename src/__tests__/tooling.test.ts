import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { version as viteVersion } from 'vite/package.json'

const glslPackageJsonPath = join(process.cwd(), 'node_modules', 'vite-plugin-glsl', 'package.json')
const glslPluginVersion = JSON.parse(readFileSync(glslPackageJsonPath, 'utf-8')).version as string
const packageJsonPath = join(process.cwd(), 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  devDependencies?: Record<string, string>
}

describe('tooling baseline', () => {
  it('uses Vite 7 or newer', () => {
    const major = Number(viteVersion.split('.')[0])
    expect(major).toBeGreaterThanOrEqual(7)
  })

  it('uses vite-plugin-glsl 1.5 or newer', () => {
    const [major, minor] = glslPluginVersion.split('.').map(Number)
    if (major === 1) {
      expect(minor).toBeGreaterThanOrEqual(5)
    } else {
      expect(major).toBeGreaterThan(1)
    }
  })

  it('does not keep the unused Playwright dependency', () => {
    expect(packageJson.devDependencies).not.toHaveProperty('playwright')
  })

  it('uses a non-vulnerable @typescript-eslint major version', () => {
    const eslintPluginVersion = packageJson.devDependencies?.['@typescript-eslint/eslint-plugin']
    const parserVersion = packageJson.devDependencies?.['@typescript-eslint/parser']

    expect(eslintPluginVersion).toBeDefined()
    expect(parserVersion).toBeDefined()
    expect(Number(eslintPluginVersion?.match(/\d+/)?.[0] ?? '0')).toBeGreaterThanOrEqual(8)
    expect(Number(parserVersion?.match(/\d+/)?.[0] ?? '0')).toBeGreaterThanOrEqual(8)
  })
})
