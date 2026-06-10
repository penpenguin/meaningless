// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkFileLineCount } from '../../scripts/check-file-line-count.mjs'

const tempRoots: string[] = []
const repositoryRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

const createTempRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'aquarium-line-count-'))
  tempRoots.push(root)
  return root
}

const writeLines = (root: string, relativePath: string, lineCount: number): void => {
  const filePath = join(root, relativePath)
  const content = Array.from({ length: lineCount }, (_, index) => `export const line${index} = ${index}`).join('\n')
  writeFileSync(filePath, `${content}\n`)
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('file line count guard', () => {
  it('fails production TypeScript files above the 800 line limit', async () => {
    const root = createTempRoot()
    mkdirSync(join(root, 'src'), { recursive: true })
    writeLines(root, 'src/largeFeature.ts', 801)
    writeLines(root, 'src/largeFeature.test.ts', 1200)

    const result = await checkFileLineCount({
      rootDir: root,
      sourceDir: 'src',
      maxLines: 800
    })

    expect(result.passed).toBe(false)
    expect(result.violations).toEqual([
      {
        path: 'src/largeFeature.ts',
        lines: 801,
        limit: 800
      }
    ])
  })

  it('does not grandfather legacy oversized files', async () => {
    const root = createTempRoot()
    mkdirSync(join(root, 'src/components/scene'), { recursive: true })
    writeLines(root, 'src/components/scene/AdvancedScene.ts', 805)

    const result = await checkFileLineCount({
      rootDir: root,
      sourceDir: 'src',
      maxLines: 800
    })

    expect(result.passed).toBe(false)
    expect(result.violations[0]).toMatchObject({
      path: 'src/components/scene/AdvancedScene.ts',
      lines: 805,
      limit: 800
    })
  })

  it('runs the line count guard from verify:soc', async () => {
    const packageJson = await import('../../package.json')

    expect(packageJson.default.scripts['verify:soc']).toContain('node scripts/check-file-line-count.mjs')
  })

  it('keeps component implementation files out of the components root', () => {
    const directComponentTypeScriptFiles = readdirSync(join(repositoryRoot, 'src/components'), {
      withFileTypes: true
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort()

    expect(directComponentTypeScriptFiles).toEqual(['index.ts'])
  })

  it('keeps utility implementation files out of the utils root', () => {
    const directUtilityTypeScriptFiles = readdirSync(join(repositoryRoot, 'src/utils'), {
      withFileTypes: true
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name)
      .sort()

    expect(directUtilityTypeScriptFiles).toEqual([])
  })
})
