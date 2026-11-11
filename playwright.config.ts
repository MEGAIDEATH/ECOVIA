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
    // Local production-build run: enable the server-side demo OTP mode for
    // every identity. `*` is rejected on Vercel/Netlify, so this cannot leak.
    env: {
      ...process.env,
      OTP_MODE: 'demo',
      OTP_DEMO_CODE: '123456',
      OTP_DEMO_ALLOWLIST: '*',
    } as Record<string, string>,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});