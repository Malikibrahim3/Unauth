import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3027';
const target = new URL(baseURL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
  throw new Error('Landing checks require a loopback preview.');
}
export default defineConfig({
  testDir: './current',
  testMatch: 'landing-page.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: process.env.LANDING_TEST_OUTPUT ?? '../artifacts/landing-app-story/2026-09-21-implementation/playwright',
  use: { channel: 'chrome', baseURL, viewport: { width: 1440, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
