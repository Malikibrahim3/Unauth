import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/work',
  '/claims',
  '/losses',
  '/recoveries',
  '/customers',
  '/reports',
  '/integrations',
] as const;

function percentile(values: number[], fraction: number) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
}

async function blockAutomaticPrefetch(page: Page) {
  await page.route(/(?:\?|&)_rsc=/, async (route) => {
    if (await route.request().headerValue('next-router-prefetch') === '1') {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function settleBackgroundRequests(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 4_000 });
  } catch {
    // Some authenticated surfaces poll. The bounded wait still prevents rapid
    // route changes from stacking unfinished local API work between samples.
  }
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('warmed primary-route navigation meets the representative local budget', async ({
  page,
}, testInfo) => {
  test.setTimeout(6 * 60_000);
  await blockAutomaticPrefetch(page);

  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
    await settleBackgroundRequests(page);
  }

  const samples: Array<{ route: string; durationMs: number }> = [];
  for (let iteration = 0; iteration < 2; iteration += 1) {
    for (const route of ROUTES) {
      const startedAt = Date.now();
      await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
      samples.push({ route, durationMs: Date.now() - startedAt });
      await settleBackgroundRequests(page);
    }
  }

  const durations = samples.map((sample) => sample.durationMs);
  const p75 = percentile(durations, 0.75);
  const maximum = Math.max(...durations);
  await testInfo.attach('route-performance.json', {
    body: Buffer.from(JSON.stringify({ p75, maximum, samples }, null, 2)),
    contentType: 'application/json',
  });

  expect(p75, `primary-route p75 exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(8_000);
  expect(maximum, `one warmed route exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(15_000);
});
