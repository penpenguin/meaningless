import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { version as viteVersion } from 'vite/package.json'

const glslPackageJsonPath = join(process.cwd(), 'node_modules', 'vite-plugin-glsl', 'package.json')
const glslPluginVersion = JSON.parse(readFileSync(glslPackageJsonPath, 'utf-8')).version as string

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
})
