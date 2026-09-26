import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.join(
  process.cwd(),
  'artifacts/merchant-clarity-implementation/2026-09-06-p02/P02/runtime',
);
const verify = expect.configure({ timeout: 30_000 });

test.describe('P02 financial scope and stage truth', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(() => {
    fs.mkdirSync(outputDir, { recursive: true });
  });

  test('keeps the cited loss list and detail amounts coherent', async ({ page }) => {
    await page.goto('/financials/losses?range=all&search=89c8a498&currency=GBP', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText(/all recorded history inclusive to/)).toBeVisible();
    await verify(page.getByText(/exclusive · Europe\/London · case submitted/)).toBeVisible();
    const citedRow = page.getByRole('link', { name: 'Loss #35272' }).locator('..');
    await verify(citedRow).toBeVisible();
    await verify(citedRow.getByText('£0.00', { exact: true })).toHaveCount(3);
    await page.screenshot({ path: path.join(outputDir, 'loss-list-cited-record.png'), fullPage: true });

    await page.goto('/financials/losses/89c8a498-efc9-4f2c-8ce9-a42d78435272', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText('ORDER EXPOSURE', { exact: true })).toBeVisible();
    await verify(page.getByText('separate from recorded loss', { exact: true })).toBeVisible();
    await verify(page.getByText('CONFIRMED LOSS', { exact: true })).toBeVisible();
    await verify(page.getByText('append-only ledger fact', { exact: true })).toBeVisible();
    await verify(page.getByText('FINAL NET LOSS', { exact: true })).toBeVisible();
    await verify(page.getByText('verified zero received', { exact: true })).toBeVisible();
    await verify(page.getByText('£0.00 − £0.00', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'loss-detail-cited-record.png'), fullPage: true });
  });

  test('uses one recoverability definition in case preview and detail', async ({ page }) => {
    await page.goto('/cases?search=ALG-048027&selected=878924b3-58f1-402b-906e-59fe2d6f4dcc', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText('RECOVERABLE', { exact: true }).last()).toBeVisible();
    await verify(page.getByText('£73,600.00', { exact: true }).last()).toBeVisible();
    expect(await page.getByText('£73,600.00', { exact: true }).count()).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: path.join(outputDir, 'case-preview-recoverability.png'), fullPage: true });

    await page.goto('/cases/878924b3-58f1-402b-906e-59fe2d6f4dcc', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText('Eligible recovery from Northgate Logistics', { exact: true })).toBeVisible();
    await verify(page.getByText('Received and matched', { exact: true })).toBeVisible();
    await verify(page.getByText('Reconciled', { exact: true })).toBeVisible();
    expect(await page.getByText('£73,600.00', { exact: true }).count()).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: path.join(outputDir, 'case-detail-recoverability.png'), fullPage: true });
  });

  test('changes reconciliation populations by month and blocks an incomplete close', async ({ page }) => {
    await page.goto('/financials/reconciliation?period=2026-08&action=close', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText('August 2026', { exact: true }).first()).toBeVisible();
    await verify(page.getByText('939 unmatched · currencies remain separate', { exact: true })).toBeVisible();
    await verify(page.locator('main')).toContainText(
      '2026-07-31T23:00:00.000Z inclusive → 2026-08-31T23:00:00.000Z exclusive · Europe/London',
    );
    await verify(page.getByText('CLOSE BLOCKED')).toBeVisible();
    await verify(page.getByRole('button', { name: 'Close period', exact: true })).toBeDisabled();
    await page.screenshot({ path: path.join(outputDir, 'reconciliation-august-close-blocked.png'), fullPage: true });

    await page.goto('/financials/reconciliation?period=2026-07', { waitUntil: 'domcontentloaded' });
    await verify(page.getByText('July 2026', { exact: true }).first()).toBeVisible();
    await verify(page.getByText('0 unmatched · currencies remain separate', { exact: true })).toBeVisible();
    await verify(page.getByText(/No open differences in this scope/).first()).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'reconciliation-july-empty.png'), fullPage: true });
  });

  test('shows a reconciled report equation with distinct stages', async ({ page }) => {
    await page.goto('/financials/reports?range=30d&currency=GBP', { waitUntil: 'domcontentloaded' });
    await verify(page.locator('main')).toContainText('Received and matched');
    await verify(page.locator('main')).toContainText('£32,449.80 − £15,842.16 = £16,607.64');
    await verify(page.locator('main')).toContainText('Written off remains a separate merchant classification');
    await page.screenshot({ path: path.join(outputDir, 'reports-money-bridge.png'), fullPage: true });
  });
});
