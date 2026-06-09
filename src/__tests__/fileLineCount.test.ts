// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkFileLineCount } from '../../scripts/check-file-line-count.mjs'

const tempRoots: string[] = []

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
      maxLines: 800,
      legacyFileLineLimits: {}
    })

    expect(result.passed).toBe(false)
    expect(result.violations).toEqual([
      {
        path: 'src/largeFeature.ts',
        lines: 801,
        limit: 800,
        legacy: false
      }
    ])
  })

  it('does not grandfather legacy oversized files', async () => {
    const root = createTempRoot()
    mkdirSync(join(root, 'src/components'), { recursive: true })
    writeLines(root, 'src/components/AdvancedScene.ts', 805)

    const result = await checkFileLineCount({
      rootDir: root,
      sourceDir: 'src',
      maxLines: 800
    })

    expect(result.passed).toBe(false)
    expect(result.violations[0]).toMatchObject({
      path: 'src/components/AdvancedScene.ts',
      lines: 805,
      limit: 800
    })
  })

  it('runs the line count guard from verify:soc', async () => {
    const packageJson = await import('../../package.json')

    expect(packageJson.default.scripts['verify:soc']).toContain('node scripts/check-file-line-count.mjs')
  })
})
