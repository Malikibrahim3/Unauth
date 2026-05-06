import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './',
  testMatch: 'full-tour.spec.ts',
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(process.cwd(), 'tests/full-tour/html-report'), open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    video: 'off',
    trace: 'retain-on-failure',
    storageState: path.join(__dirname, '.full-tour-storage-state.json'),
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'full-tour',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
