import { expect, test } from '@playwright/test';

const CANONICAL_ROUTES = [
  { path: '/overview', heading: 'Overview' },
  { path: '/cases', heading: 'Cases' },
  { path: '/controls/rules', heading: 'Rules' },
  { path: '/controls/flows', heading: 'Flows' },
  { path: '/financials/losses', heading: 'Losses' },
  { path: '/financials/recovery', heading: 'Recovery board' },
  { path: '/financials/reports', heading: 'Reports' },
  { path: '/sources/connected', heading: 'Sources' },
  { path: '/settings/workspace/account', heading: 'Account' },
] as const;

const LEGACY_REDIRECTS = [
  { source: '/dashboard', destination: '/overview' },
  { source: '/claims', destination: '/cases' },
  { source: '/rules', destination: '/controls/rules' },
  { source: '/flows', destination: '/controls/flows' },
  { source: '/losses', destination: '/financials/losses' },
  { source: '/recoveries', destination: '/financials/recovery' },
  { source: '/reports', destination: '/financials/reports' },
  { source: '/integrations', destination: '/sources/connected' },
  { source: '/settings/account', destination: '/settings/workspace/account' },
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
      await expect(page).toHaveURL(
        new RegExp(`${redirect.destination.replaceAll('/', '\\/')}/?\\?smoke=1$`),
      );
      await expect(page.locator('main h1').first()).toBeVisible({ timeout: 60_000 });
    });
  }
});
