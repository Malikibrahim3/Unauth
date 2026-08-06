import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const authSecret = process.env.E2E_AUTH_SECRET;
const merchantId = process.env.E2E_MERCHANT_ID;

if (!authSecret || !merchantId) {
  throw new Error('P00 capture requires the existing local E2E_AUTH_SECRET and E2E_MERCHANT_ID.');
}

const output = path.resolve(
  process.cwd(),
  'artifacts/unauth-ui/p00/baseline/reconciliation-1440x900.png',
);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  const authUrl = new URL('/api/test/e2e-auth', baseUrl);
  authUrl.searchParams.set('secret', authSecret);
  authUrl.searchParams.set('merchant_id', merchantId);
  authUrl.searchParams.set('redirect', '/financials/reconciliation?capture=1');

  const response = await page.goto(authUrl.toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  if (!response?.ok()) {
    throw new Error(`P00 authentication returned HTTP ${response?.status() ?? 'unknown'}.`);
  }

  await page.waitForURL(/\/financials\/reconciliation/);
  await page.locator('h1').filter({ hasText: 'Reconciliation' }).waitFor();
  await page.getByRole('heading', { name: 'Exception queue' }).waitFor();

  const loadingQueue = page.getByText('Loading exception queue…');
  let queueState = 'settled';
  try {
    await loadingQueue.waitFor({ state: 'hidden', timeout: 15_000 });
  } catch {
    queueState = 'delayed-loading';
  }

  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      tag: active?.tagName ?? null,
      text: active?.textContent?.trim().slice(0, 80) ?? null,
    };
  });
  if (!focus.tag || focus.tag === 'BODY') {
    throw new Error('P00 reconciliation keyboard smoke did not reach a focusable control.');
  }

  await mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, animations: 'disabled', caret: 'hide' });
  console.log(JSON.stringify({
    route: '/financials/reconciliation',
    status: 'rendered',
    viewport: '1440x900',
    queueState,
    keyboardFocus: focus,
    output: path.relative(process.cwd(), output),
  }, null, 2));
} finally {
  await browser.close();
}
