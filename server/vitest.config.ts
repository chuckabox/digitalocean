import { defineConfig } from 'vitest/config';

// Default suite: fast, hermetic unit tests. Excludes DB integration tests.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'node_modules/**'],
  },
});
