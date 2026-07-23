import { test, expect } from '@playwright/test';

/** Keep in sync with lib/navigation/appRoutes.ts sidebar registry. */
const SIDEBAR_ROUTES = [
  { href: '/dashboard', heading: 'Overview' },
  { href: '/work', heading: 'Work' },
  { href: '/claims', heading: 'Payout Control' },
  { href: '/losses', heading: 'Losses' },
  { href: '/recoveries', heading: 'Recovery' },
  { href: '/customers', heading: 'Customers' },
  { href: '/rules', heading: 'Rules' },
  { href: '/flows', heading: 'Flows' },
  { href: '/reports', heading: 'Reports' },
  { href: '/integrations', heading: 'Integrations' },
  { href: '/settings', heading: 'Account' },
] as const;

test.describe('Sidebar route matrix', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('main h1', { timeout: 60_000 });
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`navigates to ${route.href}`, async ({ page }) => {
      if (route.href === '/dashboard') {
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
    await page.locator('nav[aria-label="Main navigation"] a[href="/claims"]').first().click();
    await page.waitForURL('**/claims**', { timeout: 30_000 });
    expect(page.url()).not.toMatch(/\/customers\/?$/);
    await expect(page.locator('main h1').first()).toContainText('Payout Control', { timeout: 60_000 });
  });
});
