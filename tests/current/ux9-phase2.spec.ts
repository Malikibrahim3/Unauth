import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_ROOT = 'artifacts/ux9/ux9-2';

async function useTheme(page: Page, theme: 'light' | 'dark') {
  await page.context().addCookies([{
    name: 'unauth.auth-theme',
    value: theme,
    domain: 'localhost',
    path: '/',
  }]);
}

test.describe('UX9-2 task-first Cases, Customers, and evidence work', () => {
  test('Cases leads with the queue and groups advanced filters', async ({ page }) => {
    test.setTimeout(120_000);
    await useTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/cases');

    await expect(page.getByRole('heading', { level: 1, name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible();
    const registry = page.locator('.ua-case-registry');
    const analytics = page.locator('.ua-cases-analytics');
    await expect(registry).toBeVisible();
    await expect(analytics).toBeVisible();
    const [registryBox, analyticsBox] = await Promise.all([registry.boundingBox(), analytics.boundingBox()]);
    expect(registryBox?.y).toBeLessThan(analyticsBox?.y ?? 0);
    await expect(analytics).not.toHaveAttribute('open');
    await page.screenshot({ path: `${ARTIFACT_ROOT}/cases-registry-light-1280x720.png`, fullPage: true });

    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByRole('heading', { name: 'Filter cases by work question' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Can the evidence support a decision?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Can recovery move forward?' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/cases-filter-drawer-light-1280x720.png`, fullPage: true });
    await page.keyboard.press('Escape');

    const firstCase = page.locator('[data-case-id]').first();
    const caseId = await firstCase.getAttribute('data-case-id');
    expect(caseId).toBeTruthy();
    await firstCase.click();
    await expect(page.getByRole('link', { name: 'Expand case' })).toBeVisible();
    await page.getByRole('link', { name: 'Expand case' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const evidenceRegister = page.locator('#evidence-register-heading');
    const merchantDecision = page.locator('#merchant-decision-title');
    await expect(evidenceRegister).toBeVisible({ timeout: 60_000 });
    await expect(merchantDecision).toBeVisible({ timeout: 60_000 });
    const evidenceOrder = await evidenceRegister.evaluate((node) => {
      const decision = document.querySelector('#merchant-decision-title');
      return decision ? Boolean(node.compareDocumentPosition(decision) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    });
    expect(evidenceOrder).toBe(true);
    await expect(page.getByRole('button', { name: 'Review merchant decision' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record refund authorisation' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/case-workbench-light-1280x720.png`, fullPage: true });
  });

  test('Customers keeps search, list, filters, and preview continuity together', async ({ page }) => {
    test.setTimeout(120_000);
    await useTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/customers');

    await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByTestId('customers-table')).toBeVisible();
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByRole('heading', { name: 'Filter customers by operational context' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Who needs attention now?' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('customer-row').first().click();
    await expect(page.getByRole('link', { name: 'Open full profile' })).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: `${ARTIFACT_ROOT}/customer-preview-light-1280x720.png`, fullPage: true });
    const profileHref = await page.getByRole('link', { name: 'Open full profile' }).getAttribute('href');
    expect(profileHref).toMatch(/^\/customers\//);
  });

  test('The Cases registry retains the same layout and meaning in dark mode', async ({ page }) => {
    test.setTimeout(120_000);
    await useTheme(page, 'dark');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/cases');
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
    await expect(page.locator('.ua-case-registry')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/cases-registry-dark-1280x720.png`, fullPage: true });
  });
});
