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
      page.getByRole('heading', { name: 'No customers found' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear all filters' })).toBeVisible();

    await page.goto('/sources/imports', { waitUntil: 'domcontentloaded' });
    const emptyImportState = page.getByText('No import jobs yet', { exact: true });
    const importHistory = page.getByRole('listbox', { name: 'Import jobs' });
    await expect(emptyImportState.or(importHistory)).toBeVisible();
    if (await emptyImportState.isVisible()) {
      await expect(
        page.getByText('Upload a CSV file to create the first immutable validation run.', { exact: true }),
      ).toBeVisible();
    } else {
      await expect(importHistory.getByRole('option').first()).toBeVisible();
      await expect(page.getByText('Nothing is committed until you approve it.', { exact: false })).toBeVisible();
    }

    await page.goto('/sources/connected', { waitUntil: 'domcontentloaded' });
    const partialProvider = page.getByRole('article').filter({
      has: page.getByRole('button', { name: 'Inspect CSV / manual import source' }),
    });
    await expect(partialProvider).toContainText('Partial');
    await expect(partialProvider).toContainText('Not connected');
    await expect(page.getByText('Live', { exact: true })).toHaveCount(0);
    await page.goto('/sources/csv_import', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/sources\/csv_import$/);
    await expect(page.getByRole('heading', { level: 1, name: 'CSV / manual import' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Disconnected', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Runtime verification pending · \d+ lifecycle checks/)).toBeVisible();
    await expect(page.getByText('No sync history is inferred from connection state.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Search and navigate' }).click();
    await page
      .getByLabel('Search records or navigate')
      .fill('ZZZ_RELEASE_NO_RESULT');
    await expect(
      page.getByText('No matching records or destinations', { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press('Escape');
  });

  test('case-to-evidence-to-recovery-to-report journey stays connected', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await blockAutomaticPrefetch(page);
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });
    const firstCaseRow = page.locator('main button[data-case-id]').first();
    await expect(firstCaseRow).toBeVisible();
    await firstCaseRow.click();
    const expandCaseLink = page.getByRole('link', { name: 'Expand case' });
    await expect(expandCaseLink).toBeVisible();
    const caseHref = await expandCaseLink.getAttribute('href');
    expect(caseHref).toBeTruthy();

    await page.goto(caseHref!, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Case truth lanes' })).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'Recommendation → decision → external result → money' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evidence and readiness' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nine hard claim gates' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record refund authorisation' })).toBeVisible();

    await page.getByRole('button', { name: 'Recovery' }).click();
    await expect(page.getByRole('heading', { name: 'Financial history' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /External claim and money outcome|Recovery not opened/ }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Activity' }).click();
    await expect(page.getByRole('heading', { name: 'Combined case activity' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Customer profile' })).toBeVisible();

    const customerHref = await page
      .getByRole('link', { name: 'Customer profile' })
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
    await expect(page.getByText('£0', { exact: true }).first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/\b[a-z]+_[a-z_]+\b/);

    await page.goto('/financials/reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
    await expect(page.locator('main a[href^="/financials/reports/records"]').first()).toBeVisible();
  });
});
