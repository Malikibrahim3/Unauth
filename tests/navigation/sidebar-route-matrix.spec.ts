import { test, expect } from '@playwright/test';
import { signIn } from '../utils/test-fixtures';

/** Keep in sync with lib/navigation/appRoutes.ts sidebar registry. */
const SIDEBAR_ROUTES = [
  { href: '/dashboard', heading: 'Dashboard' },
  { href: '/store', heading: 'Store overview' },
  { href: '/customers', heading: 'Customer intelligence' },
  { href: '/claims', heading: 'Claims' },
  { href: '/watchlist', heading: 'Watchlist' },
  { href: '/chargebacks', heading: 'Evidence packages' },
  { href: '/reports', heading: 'Reports' },
  { href: '/upload', heading: 'Historical import' },
  { href: '/history', heading: 'Import history' },
] as const;

test.describe('Sidebar route matrix', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
    await page.waitForSelector('main h1', { timeout: 15000 });
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`navigates to ${route.href}`, async ({ page }) => {
      const navLink = page.locator(`nav[aria-label="Main navigation"] a[href="${route.href}"]`).first();
      await expect(navLink).toBeVisible();

      const clickStarted = Date.now();
      await navLink.click();

      const pendingIndicator = page.locator(`nav[aria-label="Main navigation"] a[href="${route.href}"][aria-busy="true"]`);
      await expect(pendingIndicator).toBeVisible({ timeout: 150 });

      await page.waitForURL(`**${route.href}**`, { timeout: 20000 });
      await expect(page.locator('main h1').first()).toContainText(route.heading, { timeout: 20000 });

      expect(page.url()).toContain(route.href);

      const elapsed = Date.now() - clickStarted;
      if (process.env.CI && process.env.NODE_ENV === 'production') {
        expect(elapsed).toBeLessThan(8000);
      }
    });
  }

  test('claims sidebar link does not land on customers', async ({ page }) => {
    await page.locator('nav[aria-label="Main navigation"] a[href="/claims"]').first().click();
    await page.waitForURL('**/claims**', { timeout: 20000 });
    expect(page.url()).not.toMatch(/\/customers\/?$/);
    await expect(page.locator('main h1').first()).toContainText('Claims');
  });
});
