import { chromium, type FullConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

export const AUTH_DIR = path.join(__dirname, '.auth');
export const STORAGE_STATE = path.join(AUTH_DIR, 'storage-state.json');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; current-product E2E requires a safe E2E merchant.`);
  return value;
}

export default async function globalSetup(config: FullConfig) {
  loadEnvConfig(process.cwd());
  const baseURL = String(config.projects[0]?.use?.baseURL ?? 'http://localhost:3000');
  const secret = required('E2E_AUTH_SECRET');
  const merchantId = required('E2E_MERCHANT_ID');
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const authAttemptTimeoutMs = 45_000;
  try {
    const authLandingPath = '/legal/privacy?e2e_session=ready';
    const expectedLandingUrl = new URL(authLandingPath, baseURL);
    const authUrl = new URL('/api/test/e2e-auth', baseURL);
    authUrl.searchParams.set('secret', secret);
    authUrl.searchParams.set('merchant_id', merchantId);
    authUrl.searchParams.set('redirect', authLandingPath);

    let lastFailure = 'no response';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await page.goto(authUrl.toString(), {
          waitUntil: 'domcontentloaded',
          timeout: authAttemptTimeoutMs,
        });
        const actualLandingUrl = new URL(page.url());
        if (
          actualLandingUrl.pathname === expectedLandingUrl.pathname
          && actualLandingUrl.search === expectedLandingUrl.search
        ) {
          lastFailure = '';
          break;
        }

        const detail = (await page.textContent('body').catch(() => null))?.trim().slice(0, 240);
        lastFailure = `attempt ${attempt}: HTTP ${response?.status() ?? 'unknown'}${detail ? ` (${detail})` : ''}`;
      } catch (error) {
        lastFailure = `attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`;
      }

      if (attempt < 3) await page.waitForTimeout(500 * attempt);
    }

    if (lastFailure) {
      throw new Error(`E2E auth bootstrap failed after 3 attempts: ${lastFailure}`);
    }
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
