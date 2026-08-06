import { test, expect } from '@playwright/test';

/** Keep in sync with lib/navigation/appRoutes.ts sidebar registry. */
const SIDEBAR_ROUTES = [
  { href: '/overview', heading: 'Overview' },
  { href: '/work', heading: 'Work' },
  { href: '/cases', heading: 'Cases' },
  { href: '/financials/losses', heading: 'Losses' },
  { href: '/financials/recovery', heading: 'Recovery board' },
  { href: '/customers', heading: 'Customers' },
  { href: '/controls/rules', heading: 'Rules' },
  { href: '/controls/flows', heading: 'Flows' },
  { href: '/financials/reports', heading: 'Reports' },
  { href: '/sources/connected', heading: 'Sources' },
  { href: '/settings/workspace/account', heading: 'Account' },
] as const;

test.describe('Sidebar route matrix', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForSelector('main h1', { timeout: 60_000 });
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`navigates to ${route.href}`, async ({ page }) => {
      if (route.href === '/overview') {
        await page.goto('/work', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toContainText('Work', { timeout: 30_000 });
      }
      const navLink = page.locator(`nav[aria-label="Main navigation"] a[href="${route.href}"]`).first();
      await expect(navLink).toBeVisible();

      const clickStarted = Date.now();
      await navLink.click();

      const pendingIndicator = page.locator(`nav[aria-label="Main navigation"] a[href="${route.href}"][aria-busy="true"]`);
      await expect(pendingIndicator).toBeVisible({ timeout: 150 });

      await page.waitForURL(`**${route.href}**`, { timeout: 30_000 });
      await expect(page.locator('main h1').first()).toContainText(route.heading, { timeout: 60_000 });

      expect(page.url()).toContain(route.href);

      const elapsed = Date.now() - clickStarted;
      if (process.env.CI && process.env.NODE_ENV === 'production') {
        expect(elapsed).toBeLessThan(8000);
      }
    });
  }

  test('claims sidebar link does not land on customers', async ({ page }) => {
    await page.locator('nav[aria-label="Main navigation"] a[href="/cases"]').first().click();
    await page.waitForURL('**/cases**', { timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/customers\/?$/);
    await expect(page.locator('main h1').first()).toContainText('Cases', { timeout: 60_000 });
  });
});
