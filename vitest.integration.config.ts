import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Database integration tests (`npm run test:integration`). They run the real
 * repository code — transactions, row locks, constraints — against the
 * PostgreSQL database in INTEGRATION_DATABASE_URL, which must be a disposable
 * database (e.g. a throwaway Neon branch). See src/test/integration/setup.ts.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/integration/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    pool: 'forks',
  },
});
