import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export const defaultMaxLines = 800

export const legacyOversizedFileLineLimits = {
  'src/components/AdvancedScene.ts': 4934,
  'src/components/Aquascaping.ts': 3519,
  'src/components/DetailedFish.ts': 2709,
  'src/components/aquascapePlants.ts': 921
}

/**
 * @param {string} relativePath
 * @returns {boolean}
 */
const isProductionTypeScriptFile = (relativePath) => {
  if (!/\.(?:ts|tsx)$/.test(relativePath)) return false
  if (/\.test\.(?:ts|tsx)$/.test(relativePath)) return false
  if (relativePath.includes('/__tests__/')) return false
  if (relativePath.includes('/fixtures/')) return false
  return true
}

/**
 * @param {string} filePath
 * @returns {string}
 */
const toPosixPath = (filePath) => filePath.split(path.sep).join('/')

/**
 * @param {string} content
 * @returns {number}
 */
const countLines = (content) => {
  if (content.length === 0) return 0
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n').length - (normalized.endsWith('\n') ? 1 : 0)
}

/**
 * @typedef {{
 *   fullPath: string,
 *   relativePath: string
 * }} SourceFile
 */

/**
 * @param {string} directory
 * @param {string} rootDir
 * @param {SourceFile[]} [files]
 * @returns {Promise<SourceFile[]>}
 */
const collectFiles = async (directory, rootDir, files = []) => {
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return files
    throw error
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, rootDir, files)
      continue
    }
    if (!entry.isFile()) continue
    const relativePath = toPosixPath(path.relative(rootDir, fullPath))
    if (isProductionTypeScriptFile(relativePath)) {
      files.push({ fullPath, relativePath })
    }
  }

  return files
}

/**
 * @typedef {{
 *   path: string,
 *   lines: number,
 *   limit: number,
 *   legacy: boolean
 * }} FileLineCountViolation
 *
 * @typedef {{
 *   passed: boolean,
 *   violations: FileLineCountViolation[]
 * }} FileLineCountResult
 *
 * @typedef {{
 *   rootDir?: string,
 *   sourceDir?: string,
 *   maxLines?: number,
 *   legacyFileLineLimits?: Record<string, number>
 * }} FileLineCountOptions
 */

/**
 * @param {FileLineCountOptions} [options]
 * @returns {Promise<FileLineCountResult>}
 */
export const checkFileLineCount = async ({
  rootDir = process.cwd(),
  sourceDir = 'src',
  maxLines = defaultMaxLines,
  legacyFileLineLimits = legacyOversizedFileLineLimits
} = {}) => {
  const files = await collectFiles(path.resolve(rootDir, sourceDir), rootDir)
  const violations = []

  for (const file of files) {
    const content = await fs.readFile(file.fullPath, 'utf8')
    const lines = countLines(content)
    const legacyLimit = legacyFileLineLimits[file.relativePath]
    const limit = legacyLimit ?? maxLines
    if (lines > limit) {
      violations.push({
        path: file.relativePath,
        lines,
        limit,
        legacy: typeof legacyLimit === 'number'
      })
    }
  }

  violations.sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path))

  return {
    passed: violations.length === 0,
    violations
  }
}

/**
 * @param {FileLineCountViolation} violation
 * @returns {string}
 */
const formatViolation = (violation) => {
  const kind = violation.legacy ? 'legacy ceiling' : 'limit'
  return `${violation.path}: ${violation.lines} lines > ${violation.limit} ${kind}`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkFileLineCount()
    .then((result) => {
      if (result.passed) return
      console.error(`File line count guard failed. Production TypeScript files must stay within ${defaultMaxLines} lines unless explicitly grandfathered.`)
      for (const violation of result.violations) {
        console.error(`- ${formatViolation(violation)}`)
      }
      process.exit(1)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
