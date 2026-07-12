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
  try {
    const authUrl = new URL('/api/test/e2e-auth', baseURL);
    authUrl.searchParams.set('secret', secret);
    authUrl.searchParams.set('merchant_id', merchantId);
    authUrl.searchParams.set('redirect', '/dashboard');
    await page.goto(authUrl.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
