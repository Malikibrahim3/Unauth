import { expect, test } from '@playwright/test';
import { signIn } from '../utils/test-fixtures';

test.describe('Customer drawer', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('clicking a customer row opens a visible right-hand drawer', async ({ page }) => {
    await page.goto('/customers');
    await page.waitForSelector('[data-testid="customer-row"]', { timeout: 15000 });

    await page.locator('[data-testid="customer-row"]').first().click();

    const drawer = page.locator('[data-testid="customer-drawer"]').first();
    await expect(drawer).toBeVisible({ timeout: 10000 });

    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(500);
    expect(box!.x + box!.width).toBeGreaterThan(900);
    await expect(drawer.getByText('Customer summary')).toBeVisible();
  });
});
