import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(__dirname),
  testMatch: 'gorgias-sync-walkthrough.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  globalSetup: require.resolve('./live-merchant-auth-setup'),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    storageState: path.join(__dirname, '.auth/live-merchant.json'),
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
