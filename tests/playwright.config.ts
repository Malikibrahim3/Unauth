import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const storageState = path.join(__dirname, 'current/.auth/storage-state.json');

export default defineConfig({
  testDir: './current',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  globalSetup: require.resolve('./current/global-setup'),
  globalTeardown: require.resolve('./current/global-teardown'),
  reporter: [
    ['html', { outputFolder: path.join(__dirname, 'reports/html') }],
    ['json', { outputFile: path.join(__dirname, 'reports/results.json') }],
    ['list'],
  ],
  use: {
    baseURL,
    storageState,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } },
    },
  ],
});
