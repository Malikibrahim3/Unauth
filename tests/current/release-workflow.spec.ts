import { expect, test, type Page } from '@playwright/test';

async function blockAutomaticPrefetch(page: Page) {
  await page.route(/(?:\?|&)_rsc=/, async (route) => {
    if (await route.request().headerValue('next-router-prefetch') === '1') {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test.describe('release merchant workflow and states', () => {
  test('demo, no-result, empty-import and partial-provider states are truthful', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await blockAutomaticPrefetch(page);
    await page.goto('/overview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Operating position' })).toBeVisible();
    await expect(page.getByText("You're viewing demo data.", { exact: false })).toHaveCount(0);

    await page.goto('/customers?search=ZZZ_RELEASE_NO_MATCH', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByText('No customers found', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear all filters' })).toBeVisible();

    await page.goto('/sources/imports', { waitUntil: 'domcontentloaded' });
    const importSurface = page.locator('[data-source-import][data-state-id="import-history"]');
    const emptyImportState = page.getByText('No import jobs are recorded.', { exact: true });
    await expect(importSurface).toBeVisible();
    if (await emptyImportState.isVisible()) {
      await expect(importSurface).toContainText('No import jobs are recorded.');
    } else {
      await expect(importSurface.getByText(/jobs shown · loaded history$/, { exact: false })).toBeVisible();
    }

    await page.goto('/sources/connected', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-state-id="connected-sources-empty"]')).toContainText('No source connections are recorded');
    await expect(page.getByRole('link', { name: 'Browse catalogue', exact: true })).toBeVisible();
    await expect(page.getByText('Live', { exact: true })).toHaveCount(0);
    await page.goto('/sources/csv_import', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/sources\/csv_import$/);
    await expect(page.locator('[data-surface-id="source-detail"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-state-id="source-unavailable"]')).toBeVisible();
    await expect(page.getByText('CSV / manual import', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('NOT CONNECTED', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('No provider scope list is retained.', { exact: true })).toBeVisible();
    await expect(page.getByText('RECENT IMPORTS', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Search and navigate' }).click();
    await page
      .getByLabel('Search records or navigate')
      .fill('ZZZ_RELEASE_NO_RESULT');
    await expect(
      page.getByText('No matching records', { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press('Escape');
  });

  test('case-to-evidence-to-recovery-to-report journey stays connected', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await blockAutomaticPrefetch(page);
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });
    const firstCaseRow = page.locator('main [data-case-id]').first();
    await expect(firstCaseRow).toBeVisible();
    await expect(firstCaseRow).toHaveAttribute('role', 'row');
    await expect(firstCaseRow).toHaveAttribute('tabindex', '0');
    await firstCaseRow.click();
    const expandCaseLink = page.getByRole('link', { name: 'Open case review', exact: true });
    await expect(expandCaseLink).toBeVisible();
    const caseHref = await expandCaseLink.getAttribute('href');
    expect(caseHref).toBeTruthy();

    await page.goto(caseHref!, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Case file tabs' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Evidence', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recommendation', exact: true })).toBeVisible();
    await expect(page.getByText('PROVIDER GATES', { exact: true })).toBeVisible();
    await expect(page.getByText('MONEY & RECOVERY', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review merchant decision' })).toBeVisible();

    await page.getByRole('button', { name: 'Recovery' }).click();
    await expect(page.getByText('RECOVERY ROUTE', { exact: true })).toBeVisible();
    await expect(page.getByText('CLAIM, RESPONSE & CREDIT', { exact: true })).toBeVisible();
    await expect(page.getByText('Provider approval, receipt, matching, and reconciliation remain separate recorded stages.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Audit', exact: true }).click();
    await expect(page.getByText('AUDIT TIMELINE', { exact: true })).toBeVisible();
    await expect(page.getByText('Corrections append new events. Nothing here is edited or removed.', { exact: true })).toBeVisible();

    await expect(page.getByText(/Omar Hughes says /)).toBeVisible();
    await page.goto('/customers?search=Omar%20Hughes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Customers', exact: true }).first()).toBeVisible();
    const customerHref = await page
      .getByRole('region', { name: 'Customer registry' })
      .getByRole('link', { name: /^Open .+$/ })
      .first()
      .getAttribute('href');
    expect(customerHref).toBeTruthy();
    await page.goto(customerHref!, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/customers(?:\/|$)/);
    await expect(page.locator('main h1').first()).toBeVisible();

    await page.goto('/financials/recovery', { waitUntil: 'domcontentloaded' });
    const recoveryLink = page.locator('main a[href^="/financials/recovery/"]').first();
    await expect(recoveryLink).toBeVisible();
    const recoveryHref = await recoveryLink.getAttribute('href');
    expect(recoveryHref).toBeTruthy();
    await page.goto(recoveryHref!, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/financials\/recovery\//, { timeout: 30_000 });
    await expect(page.locator('main h1').first()).toBeVisible();

    await page.goto('/financials/losses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Loss ledger' })).toBeVisible();
    const lossLedger = page.locator('[data-surface-id="loss-ledger"]');
    await expect(lossLedger).toBeVisible();
    await expect(lossLedger.getByText('Confirmed loss', { exact: true })).toBeVisible();
    await expect(lossLedger.getByText(/^\d[\d,]* cases · submission-date scope$/)).toBeVisible();
    await expect(lossLedger.getByText('ENTRIES', { exact: true })).toBeVisible();
    await expect(lossLedger.getByText('Canonical total · Last 30 days', { exact: true })).toBeVisible();
    await expect(lossLedger.locator('[data-state-id="loss-chart-ledger-unavailable-states"]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/\b[a-z]+_[a-z_]+\b/);

    await page.goto('/financials/reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
    await expect(page.locator('main a[href^="/financials/reports/records"]').first()).toBeVisible();
  });
});
