import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(__dirname),
  testMatch: 'support-case-linking-ui.spec.ts',
  fullyParallel: false,
  workers: 1,
  globalSetup: require.resolve('./light-auth-setup'),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    storageState: path.join(__dirname, '.auth/user.json'),
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
