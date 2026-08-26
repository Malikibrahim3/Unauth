import { expect, test } from '@playwright/test';

const CANONICAL_ROUTES = [
  { path: '/overview', heading: 'Operating position' },
  { path: '/cases', heading: 'Cases' },
  { path: '/controls/rules', heading: 'Payout rules' },
  { path: '/controls/flows', heading: 'Flows' },
  { path: '/financials/losses', heading: 'Loss ledger' },
  { path: '/financials/recovery', heading: 'Recovery board' },
  { path: '/financials/reports', heading: 'Reports' },
  { path: '/sources/connected', heading: 'Sources' },
  { path: '/settings/workspace/account', heading: 'Account' },
] as const;

const LEGACY_REDIRECTS = [
  { source: '/dashboard', destination: '/overview', destinationState: [] },
  { source: '/claims', destination: '/cases', destinationState: [] },
  { source: '/rules', destination: '/controls/rules', destinationState: [] },
  { source: '/flows', destination: '/controls/flows', destinationState: [] },
  { source: '/losses', destination: '/financials/losses', destinationState: [] },
  { source: '/recoveries', destination: '/financials/recovery', destinationState: [] },
  { source: '/reports', destination: '/financials/reports', destinationState: [] },
  { source: '/integrations', destination: '/sources/connected', destinationState: [] },
  { source: '/settings/account', destination: '/settings/workspace/account', destinationState: [] },
] as const;

const DIRECT_ADAPTERS = [
  { source: '/controls', destination: '/controls/rules', heading: 'Payout rules', query: { search: 'adapter-probe' } },
  { source: '/financials', destination: '/financials/losses', heading: 'Loss ledger', query: { range: '30d', currency: 'USD' } },
  { source: '/sources', destination: '/sources/connected', heading: 'Sources', query: { q: 'adapter-probe' } },
] as const;

test.describe('canonical route smoke', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const route of CANONICAL_ROUTES) {
    test(`${route.path} renders directly`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll('/', '\\/')}/?(?:\\?.*)?$`));
      await expect(page.locator('main h1').first()).toContainText(route.heading, {
        timeout: 60_000,
      });
    });
  }

  for (const redirect of LEGACY_REDIRECTS) {
    test(`${redirect.source} redirects to ${redirect.destination}`, async ({ page }) => {
      await page.goto(`${redirect.source}?smoke=1`, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => new URL(page.url()).pathname).toBe(redirect.destination);
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 60_000 });
      const finalUrl = new URL(page.url());
      expect(finalUrl.searchParams.get('smoke')).toBe('1');
      expect(
        [...new Set(finalUrl.searchParams.keys())]
          .filter((key) => key !== 'smoke')
          .sort(),
      ).toEqual([...redirect.destinationState].sort());
      if ((redirect.destinationState as readonly string[]).includes('selected')) {
        expect(finalUrl.searchParams.get('selected')).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });
  }

  for (const adapter of DIRECT_ADAPTERS) {
    test(`${adapter.source} preserves query state through ${adapter.destination}`, async ({ page }) => {
      const query = new URLSearchParams(Object.entries(adapter.query)).toString();
      await page.goto(`${adapter.source}?${query}`, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => new URL(page.url()).pathname).toBe(adapter.destination);
      const finalUrl = new URL(page.url());
      for (const [key, value] of Object.entries(adapter.query)) {
        expect(finalUrl.searchParams.get(key)).toBe(value);
      }
      await expect(page.locator('main h1').first()).toContainText(adapter.heading, {
        timeout: 60_000,
      });
    });
  }
});
