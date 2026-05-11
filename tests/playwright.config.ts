import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  reporter: [
    ['html', { outputFolder: 'tests/reports/html' }],
    ['json', { outputFile: 'tests/reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? process.env.STAGING_BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'critical',
      testMatch: '**/audit/critical-path.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'desktop',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/audit/critical-path.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile',
      testMatch: '**/audit/critical-path.spec.ts',
      use: { ...devices['iPhone 13'] }
    }
  ]
})
