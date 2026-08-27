import { test, expect } from '@playwright/test';

/** Keep in sync with lib/navigation/appRoutes.ts sidebar registry. */
const SIDEBAR_ROUTES = [
  { href: '/overview', heading: 'Operating position' },
  { href: '/work', heading: 'Work' },
  { href: '/cases', heading: 'Cases' },
  { href: '/customers', heading: 'Customers' },
  { href: '/financials/losses', heading: 'Loss ledger' },
  { href: '/financials/recovery', heading: 'Recovery board' },
  { href: '/financials/reconciliation', heading: 'Reconciliation' },
  { href: '/financials/reports', heading: 'Reports' },
  { href: '/controls/rules', heading: 'Payout rules' },
  { href: '/controls/flows', heading: 'Flows' },
  { href: '/sources/connected', heading: 'Sources' },
  { href: '/sources/imports', heading: 'Imports' },
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
      const navLink = page.locator(`aside[aria-label="Workspace navigation"] a[href="${route.href}"]`).first();
      await expect(navLink).toBeVisible();

      const clickStarted = Date.now();
      await navLink.click();

      const pendingIndicator = page.locator(`aside[aria-label="Workspace navigation"] a[href="${route.href}"][aria-busy="true"]`).first();
      await expect.poll(async () => {
        const navigationPending = await pendingIndicator.isVisible();
        const destinationAlreadyLoaded = new URL(page.url()).pathname === route.href;
        return navigationPending || destinationAlreadyLoaded;
      }, { timeout: 1_000 }).toBe(true);

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
    await page.locator('aside[aria-label="Workspace navigation"] a[href="/cases"]').first().click();
    await page.waitForURL('**/cases**', { timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/customers\/?$/);
    await expect(page.locator('main h1').first()).toContainText('Cases', { timeout: 60_000 });
  });
});
