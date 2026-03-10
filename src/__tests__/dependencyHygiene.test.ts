import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type PackageJson = {
  devDependencies?: Record<string, string>
}

describe('dependency hygiene', () => {
  it('does not keep playwright in devDependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as PackageJson

    expect(packageJson.devDependencies?.playwright).toBeUndefined()
  })
})
