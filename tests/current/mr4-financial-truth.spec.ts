import { expect, test } from '@playwright/test';

test.describe('MR4 financial truth surfaces', () => {
  test.describe.configure({ timeout: 90_000 });

  test('renders Recovery with truthful stage, paging, and canonical-scope language', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/financials/recovery', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toContainText('Recovery board');
    await expect(page.getByRole('heading', { name: 'Recovery stages' })).toBeVisible();
    await expect(page.getByText('Provider position, received credit, match, and reconciliation remain separate.')).toBeVisible();
    await expect(page.getByText(/through stable server paging/)).toBeVisible();
    await expect(page.getByText(/unknown values|Canonical aggregate unavailable/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('renders Reconciliation without silent totals or a first-page display sample', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/financials/reconciliation', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toContainText('Reconciliation');
    await expect(page.getByRole('heading', { name: 'Financial scope' })).toBeVisible();
    await expect(page.getByText(/unknown values withheld|Canonical financial totals unavailable/)).toBeVisible();
    await expect(page.getByText(/Stable order · newest first · every row remains reachable/)).toBeVisible();
    await expect(page.getByText(/source facts|Unavailable/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('renders Losses with canonical definition metadata and visible record-limit truth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/financials/losses', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toContainText('Loss ledger');
    await expect(page.getByText(/currencies separated · unknown values withheld|Canonical financial scope unavailable/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All loss entries' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
