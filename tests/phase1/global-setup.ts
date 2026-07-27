import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const AUTH_DIR = path.join(__dirname, '.auth');
export const STORAGE_STATE = path.join(AUTH_DIR, 'storage-state.json');

/**
 * Authenticates the Phase 1 evidence run against the QA fixture merchant using
 * the repository's existing local-only e2e auth route. No test-only bypass is
 * introduced: the route mints a real Supabase session for the fixture's owner
 * membership, so every subsequent request goes through production auth.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = String(config.projects[0]?.use?.baseURL ?? 'http://localhost:3000');
  const secret = process.env.E2E_AUTH_SECRET;
  const merchantId = process.env.E2E_MERCHANT_ID;
  if (!secret || !merchantId) {
    throw new Error('Phase 1 evidence run requires E2E_AUTH_SECRET and E2E_MERCHANT_ID');
  }
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const landing = '/legal/privacy?e2e_session=ready';
    const expected = new URL(landing, baseURL).toString();
    const authUrl = new URL('/api/test/e2e-auth', baseURL);
    authUrl.searchParams.set('secret', secret);
    authUrl.searchParams.set('merchant_id', merchantId);
    authUrl.searchParams.set('redirect', landing);

    let failure = 'no response';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await page.goto(authUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
      if (page.url() === expected) {
        failure = '';
        break;
      }
      const detail = (await page.textContent('body').catch(() => null))?.trim().slice(0, 240);
      failure = `attempt ${attempt}: HTTP ${response?.status() ?? 'unknown'}${detail ? ` (${detail})` : ''}`;
      if (attempt < 3) await page.waitForTimeout(500 * attempt);
    }
    if (failure) throw new Error(`Phase 1 auth bootstrap failed: ${failure}`);
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
