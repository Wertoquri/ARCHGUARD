import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**', 'src/**'],
    globals: false,
  },
  coverage: {
    provider: 'c8',
    reporter: ['lcov', 'text'],
    reportsDirectory: 'coverage',
    include: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx'],
    exclude: ['src/**/__tests__/**', 'test/**', 'node_modules/**'],
  },
})
