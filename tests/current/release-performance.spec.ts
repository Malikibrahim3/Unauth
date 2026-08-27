import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  { href: '/work', heading: 'Work' },
  { href: '/cases', heading: 'Cases' },
  { href: '/financials/losses', heading: 'Loss ledger' },
  { href: '/financials/recovery', heading: 'Recovery board' },
  { href: '/customers', heading: 'Customers' },
  { href: '/financials/reports', heading: 'Reports' },
  { href: '/sources/connected', heading: 'Sources' },
  { href: '/overview', heading: 'Operating position' },
] as const;

function percentile(values: number[], fraction: number) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
}

async function settleBackgroundRequests(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 4_000 });
  } catch {
    // Some authenticated surfaces poll. The bounded wait still prevents rapid
    // route changes from stacking unfinished local API work between samples.
  }
}

test('warmed sidebar navigation meets the interactive budget', async ({
  page,
}, testInfo) => {
  test.setTimeout(6 * 60_000);

  for (const route of ROUTES) {
    await page.goto(route.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
    await settleBackgroundRequests(page);
  }

  const samples: Array<{ route: string; durationMs: number }> = [];
  for (let iteration = 0; iteration < 2; iteration += 1) {
    for (const route of ROUTES) {
      const navLink = page.locator(`aside[aria-label="Workspace navigation"] a[href="${route.href}"]`).first();
      await expect(navLink).toBeVisible();
      const startedAt = Date.now();
      await navLink.click();
      await page.waitForURL(`**${route.href}**`, { timeout: 15_000 });
      await expect(page.locator('main h1').first()).toContainText(route.heading, { timeout: 15_000 });
      samples.push({ route: route.href, durationMs: Date.now() - startedAt });
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

  expect(p75, `sidebar-navigation p75 exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(4_000);
  expect(maximum, `one warmed sidebar route exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(8_000);
});
