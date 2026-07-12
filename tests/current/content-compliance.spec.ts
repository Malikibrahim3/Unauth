import { expect, test } from '@playwright/test';

const MERCHANT_ROUTES = [
  '/dashboard', '/work', '/exceptions', '/claims', '/losses', '/recoveries',
  '/customers', '/rules', '/reports', '/integrations', '/integrations/imports',
];

test('current merchant surfaces avoid banned and internal failure language', async ({ page }) => {
  for (const route of MERCHANT_ROUTES) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const text = await page.locator('main').innerText();
    expect(text, `${route} exposes banned legacy language`).not.toMatch(/\bfraud\b/i);
    expect(text, `${route} exposes an internal stack trace`).not.toMatch(/\bat\s+\S+\.(?:ts|tsx|js):\d+/i);
    expect(text, `${route} rendered a generic failure state`).not.toContain('Something went wrong');
  }
});
