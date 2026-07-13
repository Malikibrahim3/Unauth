import { expect, test, type Page } from '@playwright/test';

const STATIC_AUTHENTICATED_ROUTES = [
  '/dashboard', '/work', '/exceptions', '/claims', '/losses', '/recoveries',
  '/customers', '/rules', '/flows', '/flows/runs', '/reports', '/reports/records',
  '/integrations', '/integrations/imports', '/notifications', '/partners',
  '/help', '/help/confidence-grades', '/help/how-it-works',
  '/help/identity-matching', '/help/integrations/siena', '/help/integrations/yuma',
  '/settings', '/settings/account', '/settings/agreements',
  '/settings/api-integrations', '/settings/audit-trail', '/settings/billing',
  '/settings/data-privacy', '/settings/notifications', '/settings/platform',
  '/settings/team', '/settings/integrations',
  '/settings/integrations/bigcommerce', '/settings/integrations/chrome',
  '/settings/integrations/freshdesk', '/settings/integrations/gorgias',
  '/settings/integrations/shopify', '/settings/integrations/woocommerce',
  '/settings/integrations/zendesk', '/store', '/audit/00000000-0000-4000-8000-000000000000', '/catches',
  '/chargebacks', '/chargebacks/00000000-0000-4000-8000-000000000000', '/watchlist', '/global', '/lookup',
  '/apply', '/audit-running', '/onboarding',
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

async function expectAuthenticatedSystem(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  const root = page.locator('.ua-app, .ua-auth-surface');
  await expect(root).toBeVisible({ timeout: 20_000 });
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
}

test('every static authenticated and compatibility route uses the new system', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  for (const route of STATIC_AUTHENTICATED_ROUTES) {
    await test.step(route, async () => expectAuthenticatedSystem(page, route));
  }
});

test('seeded dynamic record routes use the new system', async ({ page }) => {
  test.setTimeout(4 * 60_000);
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
    await page.goto(source, { waitUntil: 'domcontentloaded' });
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
  await page.goto('/integrations', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('img[src*="shopify"]')).toBeVisible();
  await expect(page.locator('img[src*="gorgias"]')).toBeVisible();
  await expect(page.locator('img[src*="shipbob"]')).toBeVisible();
  await expect(page.locator('.ua-focal-panel')).not.toHaveCount(0);

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ua-metric-card')).not.toHaveCount(0);
  await expect(page.locator('.ua-panel-header')).not.toHaveCount(0);
});
