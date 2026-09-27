import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'ar-SA',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // E2E runs against the production build: the Turbopack dev server compiles
  // routes on demand, which made first-hit assertions flaky under parallel load.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Re-enable the development OTP path (fixed demo code + visible hint) for
    // this local production-build run; real deployments never set this.
    env: { ...process.env, NEXT_PUBLIC_ALLOW_DEV_OTP: 'true' } as Record<string, string>,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});