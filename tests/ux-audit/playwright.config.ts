import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  testMatch: 'ux-audit.spec.ts',
  timeout: 360_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  reporter: [['list'], ['json', { outputFile: 'reports/ux-audit/playwright-results.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    screenshot: 'off',
    video: 'off',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'ux-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'ux-mobile',
      testIgnore: 'ux-audit.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
