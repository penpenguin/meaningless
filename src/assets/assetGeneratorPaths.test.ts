import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createAquariumAssetManifest } from './visualAssets'

const removedGeneratorScripts = [
  'scripts/generate-fish-assets.mjs',
  'scripts/generate-shared-aquarium-textures.mjs',
  'scripts/generate-driftwood-hero-asset.mjs'
]

const existsInRepo = (path: string): boolean => existsSync(resolve(process.cwd(), path))
const readPackageJson = (): { scripts?: Record<string, string> } => (
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
)
const publicUrlToRepoPath = (url: string): string => `public/${url.replace(/^\/+/, '')}`
const listFiles = (directory: string): string[] => {
  const entries = readdirSync(resolve(process.cwd(), directory), { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath}/${entry.name}`.replace(`${process.cwd()}/`, ''))
    .sort()
}

describe('fixed aquarium asset files', () => {
  it('does not keep one-off asset generator scripts in the runtime repository', () => {
    removedGeneratorScripts.forEach((scriptPath) => {
      expect(existsInRepo(scriptPath)).toBe(false)
    })
    expect(readPackageJson().scripts).not.toHaveProperty('generate:fish-assets')
  })

  it('keeps manifest-referenced fish and driftwood models plus substrate textures checked in under public assets', () => {
    const manifest = createAquariumAssetManifest('/')
    const authoredAssetUrls = [
      ...manifest.textures
        .filter((entry) => entry.id.startsWith('substrate-sand-'))
        .map((entry) => entry.url),
      ...manifest.models
        .filter((entry) => entry.usageTag === 'fish' || entry.usageTag === 'wood')
        .map((entry) => entry.url)
    ]

    expect(authoredAssetUrls.length).toBeGreaterThan(0)
    authoredAssetUrls.forEach((url) => {
      expect(existsInRepo(publicUrlToRepoPath(url))).toBe(true)
    })
  })

  it('does not keep non-substrate files under public texture assets', () => {
    const textureFiles = listFiles('public/assets/textures')
    expect(textureFiles.length).toBeGreaterThan(0)
    expect(textureFiles.every((file) => file.startsWith('public/assets/textures/substrate/'))).toBe(true)
  })

  it('does not keep substrate texture files that are not referenced by the manifest', () => {
    const manifest = createAquariumAssetManifest('/')
    const manifestTextureFiles = manifest.textures.map((entry) => publicUrlToRepoPath(entry.url)).sort()
    const textureFiles = listFiles('public/assets/textures/substrate')

    expect(textureFiles).toEqual(manifestTextureFiles)
  })
})
