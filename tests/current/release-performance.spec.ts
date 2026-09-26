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

async function settleBackgroundRequests(page: Page, routeHref: string, activeRequests: Set<object>) {
  if (routeHref === '/work') {
    // Wait for the canonical queue surface to hydrate. The exact renderer
    // exposes its stable surface identity without making the root a landmark.
    await expect(page.locator('[data-surface-id="work-queue"]').first()).toBeVisible({ timeout: 30_000 });
  }
  // `page.waitForLoadState('networkidle')` is tied to the document lifecycle
  // and can remain satisfied while a later client-navigation RSC stream is
  // still open. Track request completion directly and require a quiet window.
  // The measured duration ends before this stabilisation step, so neither
  // production threshold is changed.
  const deadline = Date.now() + 30_000;
  let quietSince = activeRequests.size === 0 ? Date.now() : null;
  while (Date.now() < deadline) {
    if (activeRequests.size === 0) {
      quietSince ??= Date.now();
      if (Date.now() - quietSince >= 750) return;
    } else {
      quietSince = null;
    }
    await page.waitForTimeout(100);
  }
}

test('warmed sidebar navigation meets the interactive budget', async ({
  page,
}, testInfo) => {
  test.setTimeout(10 * 60_000);

  const requestStarts = new WeakMap<object, number>();
  const activeRequests = new Set<object>();
  const networkTimings: Array<{
    url: string;
    method: string;
    resourceType: string;
    durationMs: number;
    status: number | null;
    classification: 'rsc' | 'supabase' | 'document' | 'other';
  }> = [];
  page.on('request', (request) => {
    requestStarts.set(request, Date.now());
    activeRequests.add(request);
  });
  page.on('requestfinished', (request) => activeRequests.delete(request));
  page.on('response', (response) => {
    const request = response.request();
    const url = request.url();
    networkTimings.push({
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      durationMs: Date.now() - (requestStarts.get(request) ?? Date.now()),
      status: response.status(),
      classification: url.includes('_rsc=')
        ? 'rsc'
        : /127\.0\.0\.1:54321|localhost:54321|\[::1\]:54321/.test(url)
          ? 'supabase'
          : request.resourceType() === 'document'
            ? 'document'
            : 'other',
    });
  });
  page.on('requestfailed', (request) => {
    activeRequests.delete(request);
    const url = request.url();
    networkTimings.push({
      url,
      method: request.method(),
      resourceType: request.resourceType(),
      durationMs: Date.now() - (requestStarts.get(request) ?? Date.now()),
      status: null,
      classification: url.includes('_rsc=') ? 'rsc' : 'other',
    });
  });

  for (const route of ROUTES) {
    await page.goto(route.href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 20_000 });
    await settleBackgroundRequests(page, route.href, activeRequests);
  }

  const samples: Array<{ route: string; durationMs: number; network: typeof networkTimings }> = [];
  for (let iteration = 0; iteration < 2; iteration += 1) {
    for (const route of ROUTES) {
      const navLink = page.locator(`aside[aria-label="Workspace navigation"] a[href="${route.href}"]`).first();
      await expect(navLink).toBeVisible();
      const startedAt = Date.now();
      const networkStart = networkTimings.length;
      await navLink.click();
      await page.waitForURL(`**${route.href}**`, { timeout: 15_000 });
      await expect(page.locator('main h1').first()).toContainText(route.heading, { timeout: 15_000 });
      samples.push({ route: route.href, durationMs: Date.now() - startedAt, network: networkTimings.slice(networkStart) });
      await settleBackgroundRequests(page, route.href, activeRequests);
    }
  }

  const durations = samples.map((sample) => sample.durationMs);
  const p75 = percentile(durations, 0.75);
  const maximum = Math.max(...durations);
  const browserPressure = await page.evaluate(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    return memory ? { ...memory } : null;
  });
  const runnerPressure = { memory: process.memoryUsage(), resourceUsage: process.resourceUsage() };
  await testInfo.attach('route-performance.json', {
    body: Buffer.from(JSON.stringify({ p75, maximum, samples, browserPressure, runnerPressure }, null, 2)),
    contentType: 'application/json',
  });

  expect(p75, `sidebar-navigation p75 exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(4_000);
  expect(maximum, `one warmed sidebar route exceeded budget: ${JSON.stringify(samples)}`).toBeLessThan(8_000);
});
