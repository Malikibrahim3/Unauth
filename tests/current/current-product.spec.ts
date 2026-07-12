import { expect, test, type Page } from '@playwright/test';

const CURRENT_ROUTES = [
  { path: '/dashboard', heading: 'Payout overview' },
  { path: '/work', heading: 'Work' },
  { path: '/exceptions', heading: 'Exception queue' },
  { path: '/claims', heading: 'Payout Control' },
  { path: '/losses', heading: 'Losses' },
  { path: '/recoveries', heading: 'Recovery board' },
  { path: '/customers', heading: 'Customers' },
  { path: '/rules', heading: 'Rules and Flows' },
  { path: '/reports', heading: 'Payout reports' },
  { path: '/integrations', heading: 'Integrations' },
  { path: '/settings/team', heading: 'Team management' },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.describe('current merchant experience', () => {
  for (const route of CURRENT_ROUTES) {
    test(`${route.path} renders the current product surface`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
      await expect(page.getByText('Loading page', { exact: true })).toHaveCount(0);
      await expectNoDocumentOverflow(page);
    });
  }

  test('reconciliation exceptions link to a complete case workspace', async ({ page }) => {
    await page.goto('/exceptions');
    await expect(page.getByRole('heading', { level: 1, name: 'Exception queue' })).toBeVisible();
    await expect(page.getByText('Loading exception queue…', { exact: true })).toHaveCount(0);
    const caseLinks = page.locator('article a[href^="/claims/"]');
    const count = await caseLinks.count();
    test.skip(count === 0, 'The safe E2E merchant currently has no open reconciliation exception.');
    const href = await caseLinks.first().getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!);
    await expect(page.getByText('Claim evidence context', { exact: true })).toBeVisible();
    await expect(page.getByText('Manage case', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Case comments' })).toBeVisible();
    await expect(page.getByText('Event timeline', { exact: true })).toBeVisible();
  });

  test('command search opens and returns current navigation results', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Search (⌘K)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    const input = page.getByLabel('Search customers, audits, evidence packages');
    await input.fill('recoveries');
    await expect.poll(() => dialog.getByText('Recoveries', { exact: true }).count()).toBeGreaterThan(0);
    await input.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();
  });

  test('current CSV intake validates a canonical row without committing it', async ({ page }) => {
    await page.goto('/integrations/imports');
    await expect(page.getByRole('heading', { level: 1, name: 'Import records' })).toBeVisible();
    await page.locator('textarea').fill('external_id,currency,total_minor\nE2E-VALIDATE-ONLY,GBP,8400');
    const mappingRows = page.locator('.space-y-1 > .flex');
    await expect(mappingRows).toHaveCount(3);
    await mappingRows.nth(0).locator('select').selectOption('external_id');
    await mappingRows.nth(1).locator('select').selectOption('currency');
    await mappingRows.nth(2).locator('select').selectOption('total_minor');
    await page.getByRole('button', { name: 'Validate' }).click();
    await expect(page.getByText('1 valid · 0 errors · 0 duplicates skipped · 1 rows', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import valid rows' })).toBeEnabled();
  });

  test('integration centre resolves health and preserves truthful source status', async ({ page }) => {
    await page.goto('/integrations');
    await expect(page.getByText('Connection health', { exact: true })).toBeVisible();
    await expect(page.getByText('Loading connection health…', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Shopify connection verified, current, and syncing Required' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gorgias connection current with a healthy webhook Required' })).toBeVisible();
    await expect(page.getByText('Shopify', { exact: true })).toBeVisible();
    await expect(page.getByText('Gorgias', { exact: true })).toBeVisible();
  });

  test('reports expose operational metrics and underlying-record navigation', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { level: 1, name: 'Payout reports' })).toBeVisible();
    await expect(page.getByText('Decision completion', { exact: true })).toBeVisible();
    await expect(page.getByText('Recovery win rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Source coverage', { exact: true }).first()).toBeVisible();
  });
});
