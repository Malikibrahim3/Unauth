import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Phase 1 runtime-evidence project.
 *
 * Separate from tests/playwright.config.ts so the release browser suite keeps
 * its own fixtures and baselines. This project runs against a production build
 * and the Phase 1 QA fixture, and its only job is to produce the evidence
 * artifacts scripts/polish/phase-01.manifest.mjs requires.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: __dirname,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve('./global-setup'),
  reporter: [['list']],
  timeout: 180_000,
  use: {
    baseURL,
    storageState: path.join(__dirname, '.auth/storage-state.json'),
    screenshot: 'only-on-failure',
    // Tracing instruments every action; the RUN-13 measurement must not pay
    // for the cost of being measured. Failures are diagnosed from the evidence
    // artifacts, which record the same facts.
    trace: 'off',
  },
  projects: [
    {
      name: 'phase1-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
