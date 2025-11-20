import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    pool: 'threads',
    maxThreads: 1,
    minThreads: 1,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    }
  }
})
