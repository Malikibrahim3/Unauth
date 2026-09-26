import { expect, test } from '@playwright/test';

test.describe('light-only appearance boundaries', () => {
  test('authenticated product pages are light-only and expose no appearance control', async ({ page }) => {
    await page.goto('/overview');
    const product = page.locator('[data-unauth-ui="supplied-package"]');
    await expect(product).not.toHaveAttribute('data-auth-theme', /.+/);
    await expect(product).toHaveCSS('color-scheme', 'light');

    await page.goto('/settings/workspace/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    await expect(page.getByRole('group', { name: /theme|appearance/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveCount(0);
  });

  test('keeps public and entry routes light when a legacy cookie is present', async ({ page }) => {
    await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'dark', domain: 'localhost', path: '/' }]);
    await page.goto('/landing');
    await expect(page.locator('[data-landing-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.+/);

    await page.goto('/login');
    const entry = page.locator('[data-unauth-ui="supplied-package"]');
    await expect(entry).toHaveCSS('color-scheme', 'light');
    await expect(entry).toHaveCSS('background-color', 'rgb(246, 244, 241)');
  });
});
