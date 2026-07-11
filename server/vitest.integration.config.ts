import { defineConfig } from 'vitest/config';

// Integration suite: runs against a real Postgres (DATABASE_URL from server/.env).
// Auto-skips individual suites when DATABASE_URL is absent.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // DB round-trips need more headroom than unit tests.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
