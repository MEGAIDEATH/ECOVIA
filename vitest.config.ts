import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // DB-backed suites run separately: `npm run test:integration`.
    exclude: ['src/**/*.integration.test.ts', 'node_modules/**'],
    css: false,
    restoreMocks: true,
    testTimeout: 15000,
    // Keeps per-file isolation while reusing the jsdom environment per worker
    // (avoids re-creating jsdom for each of the ~24 test files).
    pool: 'vmThreads',
  },
});