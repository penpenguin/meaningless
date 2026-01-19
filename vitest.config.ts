import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    pool: 'threads',
    maxThreads: 1,
    minThreads: 1,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    }
  }
})
