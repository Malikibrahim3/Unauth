import { expect, test } from '@playwright/test';

test.describe('light-first theme boundaries', () => {
  test('defaults authenticated product pages to light and keeps the choice in Appearance', async ({ page }) => {
    await page.context().clearCookies({ name: 'unauth.auth-theme' });
    await page.goto('/overview');
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'light');

    await page.goto('/settings/workspace/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Workspace theme' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
    await page.reload();
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
  });

  test('keeps public and entry routes light while authenticated dark is selected', async ({ page }) => {
    await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'dark', domain: 'localhost', path: '/' }]);

    await page.goto('/landing');
    await expect(page.locator('[data-landing-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.+/);

    await page.goto('/login');
    await expect(page.locator('.uo-entry')).toHaveCSS('color-scheme', 'light');
    await expect(page.locator('.uo-entry')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
  });
});
