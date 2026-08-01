import { expect, test, type Page } from '@playwright/test';

const STATIC_AUTHENTICATED_ROUTES = [
  '/dashboard', '/work', '/exceptions', '/claims', '/losses', '/recoveries',
  '/customers', '/rules', '/flows', '/flows/runs', '/reports', '/reports/records',
  '/integrations', '/integrations/imports', '/notifications', '/rules/recovery',
  '/help',
  '/settings', '/settings/account', '/settings/agreements',
  '/settings/api-integrations', '/settings/audit-trail', '/settings/billing',
  '/settings/data-privacy', '/settings/notifications', '/settings/platform',
  '/settings/team',
  '/integrations/bigcommerce', '/settings/integrations/chrome',
  '/settings/integrations/freshdesk', '/settings/integrations/gorgias',
  '/settings/integrations/shopify', '/integrations/woocommerce',
  '/settings/integrations/zendesk', '/onboarding',
  '/claims/00000000-0000-4000-8000-000000000000', '/customers/00000000-0000-4000-8000-000000000000', '/customers/00000000-0000-4000-8000-000000000000/claims',
  '/customers/00000000-0000-4000-8000-000000000000/evidence/new', '/losses/00000000-0000-4000-8000-000000000000', '/recoveries/00000000-0000-4000-8000-000000000000',
  '/rules/00000000-0000-4000-8000-000000000000', '/flows/00000000-0000-4000-8000-000000000000', '/flows/runs/00000000-0000-4000-8000-000000000000',
  '/integrations/example', '/orders/00000000-0000-4000-8000-000000000000', '/shipments/00000000-0000-4000-8000-000000000000',
  '/refunds/00000000-0000-4000-8000-000000000000', '/returns/00000000-0000-4000-8000-000000000000', '/disputes/00000000-0000-4000-8000-000000000000', '/tickets/00000000-0000-4000-8000-000000000000',
] as const;

const OLD_RGB = new Set([
  'rgb(123, 45, 38)',
  'rgb(94, 32, 24)',
  'rgb(168, 80, 64)',
  'rgb(244, 230, 224)',
  'rgb(248, 245, 238)',
  'rgb(253, 251, 246)',
  'rgb(216, 208, 189)',
]);

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
    // Some development-only streams remain open. The bounded wait still
    // gives completed route requests time to leave the local runtime.
  }
}

async function gotoAuthenticatedRoute(page: Page, route: string) {
  const root = page.locator('.ua-app, .ua-auth-surface');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(route, { waitUntil: 'commit', timeout: 60_000 });
    await expect(root).toBeVisible({ timeout: 60_000 });
    if (!/\/login(?:\?|$)/.test(page.url())) return;
    if (attempt === 0) await page.waitForTimeout(500);
  }
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.beforeEach(async ({ page }) => {
  await blockAutomaticPrefetch(page);
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

async function expectAuthenticatedSystem(page: Page, route: string) {
  await gotoAuthenticatedRoute(page, route);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  const root = page.locator('.ua-app, .ua-auth-surface');
  await expect(root).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => {
    try {
      return await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        // Scrollable tables may extend their own scrollWidth by design; the
        // page itself must remain pinned to the viewport.
        return document.body.scrollWidth <= viewport && document.body.getBoundingClientRect().width <= viewport;
      });
    } catch {
      // A handful of compatibility setup routes complete a deliberate client
      // redirect after their shell renders. Retry against the settled route.
      return false;
    }
  }).toBe(true);
  let residue: string[] = [];
  await expect.poll(async () => {
    try {
      residue = await page.evaluate((oldRgb) => {
        const old = new Set(oldRgb);
        const scope = document.querySelector('.ua-app, .ua-auth-surface');
        if (!scope) return ['missing authenticated scope'];
        return [...scope.querySelectorAll('*')].slice(0, 2500).flatMap((element) => {
          const style = getComputedStyle(element);
          const matches = [style.color, style.backgroundColor, style.borderColor].filter((value) => old.has(value));
          return matches.length ? [`${element.tagName.toLowerCase()}.${element.className}: ${matches.join(', ')}`] : [];
        }).slice(0, 10);
      }, [...OLD_RGB]);
      return true;
    } catch {
      return false;
    }
  }).toBe(true);
  expect(residue, `${route} rendered legacy authenticated colours`).toEqual([]);
  await settleBackgroundRequests(page);
}

test('every static authenticated and compatibility route uses the new system', async ({ page }) => {
  test.setTimeout(12 * 60_000);
  for (const route of STATIC_AUTHENTICATED_ROUTES) {
    await test.step(route, async () => expectAuthenticatedSystem(page, route));
  }
});

test('seeded dynamic record routes use the new system', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const sources: Array<{ source: string; patterns: string[] }> = [
    { source: '/work', patterns: ['/claims/'] },
    { source: '/customers', patterns: ['/customers/'] },
    { source: '/losses', patterns: ['/losses/'] },
    { source: '/recoveries', patterns: ['/recoveries/'] },
    { source: '/rules', patterns: ['/rules/'] },
    { source: '/flows', patterns: ['/flows/'] },
    { source: '/flows/runs', patterns: ['/flows/runs/'] },
    { source: '/integrations', patterns: ['/integrations/'] },
  ];

  const destinations = new Set<string>();
  for (const { source, patterns } of sources) {
    await gotoAuthenticatedRoute(page, source);
    // `gotoAuthenticatedRoute` intentionally returns at the first committed
    // authenticated shell. Wait for the streamed route data before looking
    // for record links, otherwise a fast local run can inspect the shell
    // before the seeded list has rendered.
    await settleBackgroundRequests(page);
    for (const pattern of patterns) {
      const links = page.locator(`main a[href^="${pattern}"]`);
      const count = await links.count();
      if (count > 0) {
        const href = await links.first().getAttribute('href');
        if (href && href !== pattern.slice(0, -1)) destinations.add(href);
      }
    }
  }

  expect(destinations.size, 'Safe E2E data should expose dynamic record routes').toBeGreaterThan(2);
  for (const destination of destinations) {
    await test.step(destination, async () => expectAuthenticatedSystem(page, destination));
  }
});

test('visual enrichment preserves provider identity and focal hierarchy', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/integrations', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('img[src*="shopify"]')).toBeVisible();
  await expect(page.locator('img[src*="gorgias"]')).toBeVisible();
  await expect(page.locator('img[src*="shipbob"]')).toBeVisible();
  await expect(page.locator('[data-auth-visual="key-insight"]')).toHaveCount(1);
  await expect(page.locator('[data-auth-visual="summary-rail"]')).toHaveCount(1);

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Value this period' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Payout performance charts' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payout performance' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Recovered/ })).toBeVisible();
});

test('dashboard pilot interactions and responsive layout remain operational', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('svg.recharts-surface')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-capability-id="reports.range"]')).toBeVisible();
  await expect(page.locator('[data-capability-id="reports.compare"]')).toBeVisible();
  await expect(page.locator('[data-capability-id="reports.currency"]')).toBeVisible();
  await expect(page.locator('[data-capability-id="reports.open-full"]')).toBeVisible();
  await expect(page.locator('[data-capability-id="work.open-header"]')).toHaveAttribute('href', '/work');
  await expect(page.locator('[data-capability-id="claims.review-high-value"]')).toHaveAttribute('href', '/claims?sort=value');
  await expect(page.locator('[data-capability-id="reports.open-full"]')).toHaveAttribute('href', /\/reports\?range=/);

  const recoveredTab = page.getByRole('tab').filter({ hasText: 'Recovered' });
  await expect(recoveredTab).toHaveCount(1);
  await recoveredTab.click();
  await expect(recoveredTab).toHaveAttribute('aria-selected', 'true');

  const detailsButton = page.getByRole('button', { name: 'Details', exact: true });
  await expect(detailsButton).toHaveCount(1);
  await detailsButton.click();
  await expect(page.getByRole('dialog', { name: 'Data health' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Data health' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
});

test('operational routes use purpose-specific insights from one visual grammar', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const routeVisuals = [
    ['/work', 'Deadline risk'],
    ['/claims', 'Decision states'],
    ['/losses', 'Loss contribution'],
    ['/recoveries', 'Is recoverable value converting into cash?'],
    ['/customers', 'Case context'],
    ['/rules', 'Rules'],
    ['/flows', 'Action load'],
    ['/integrations', 'Source health'],
    ['/notifications', 'Recent activity'],
  ] as const;

  for (const [route, summaryTitle] of routeVisuals) {
    await test.step(`${route} → ${summaryTitle}`, async () => {
      await gotoAuthenticatedRoute(page, route);
      await expect(page).toHaveURL(new RegExp(`${route}(?:\\?|$)`), { timeout: 60_000 });
      if (route === '/recoveries') {
        await expect(page.getByRole('heading', { name: summaryTitle })).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('[aria-label="Recovery stages"]')).toBeVisible();
        expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await settleBackgroundRequests(page);
        return;
      }
      if (route === '/rules') {
        await expect(page.getByRole('heading', { name: summaryTitle, exact: true })).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('section[aria-label="Rules"]')).toBeVisible();
        await expect(page.locator('[data-auth-visual="key-insight"]')).toHaveCount(0);
        await expect(page.locator('[data-auth-visual="summary-rail"]')).toHaveCount(0);
        expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await settleBackgroundRequests(page);
        return;
      }
      await expect(page.locator('[data-auth-visual="key-insight"]')).toBeVisible({ timeout: 60_000 });
      const summaryRail = page.locator('[data-auth-visual="summary-rail"]');
      await expect(summaryRail).toBeVisible({ timeout: 60_000 });
      await expect(summaryRail.getByRole('heading', { name: summaryTitle })).toBeVisible();
      expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await settleBackgroundRequests(page);
    });
  }
});
