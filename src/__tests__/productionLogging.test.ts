import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const collectSourceFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === '__tests__') return []
      return collectSourceFiles(fullPath)
    }
    if (!entry.endsWith('.ts')) return []
    if (entry.endsWith('.test.ts') || entry.endsWith('.d.ts')) return []
    return [fullPath]
  })
}

describe('production source logging', () => {
  it('does not contain console.log calls', () => {
    const sourceFiles = collectSourceFiles(join(process.cwd(), 'src'))
    const filesWithConsoleLog = sourceFiles.filter((file) => {
      const source = readFileSync(file, 'utf-8')
      return source.includes('console.log(')
    })

    expect(filesWithConsoleLog).toEqual([])
  })
})
