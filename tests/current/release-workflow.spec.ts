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
    await expect(
      page.getByText(
        "You're viewing demo data. Connect your store to see real data.",
        { exact: true },
      ),
    ).toBeVisible();

    await page.goto('/customers?q=ZZZ_RELEASE_NO_MATCH', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'No customers found' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear all filters' })).toBeVisible();

    await page.goto('/sources/imports', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText('No CSV import jobs recorded yet.', { exact: true }),
    ).toBeVisible();

    await page.goto('/sources/connected', { waitUntil: 'domcontentloaded' });
    const partialProvider = page.locator('a[href="/sources/csv_import"]');
    await expect(partialProvider).toContainText('Not connected');
    await expect(page.getByText('Live', { exact: true })).toHaveCount(0);
    await page.goto('/sources/csv_import', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/sources\/csv_import$/);
    await expect(page.getByText('Commerce · Partial', { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Search (⌘K)' }).click();
    await page
      .getByLabel('Search customers, cases, and evidence')
      .fill('ZZZ_RELEASE_NO_RESULT');
    await expect(page.getByText(/No results for/)).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press('Escape');
  });

  test('case-to-evidence-to-recovery-to-report journey stays connected', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await blockAutomaticPrefetch(page);
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });
    const caseLink = page.locator('main a[href^="/cases/"]').first();
    await expect(caseLink).toBeVisible();
    const caseHref = await caseLink.getAttribute('href');
    expect(caseHref).toBeTruthy();

    await page.goto(caseHref!, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByText('Evidence on file', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: /Recommendation|Review gate/ }),
    ).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Record decision' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Financial history' })).toBeVisible();
    await expect(page.getByText('Recovery / Chase-Up', { exact: true })).toBeVisible();
    await expect(page.getByText('Event timeline', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open customer profile' })).toBeVisible();

    const customerHref = await page
      .getByRole('link', { name: 'Open customer profile' })
      .getAttribute('href');
    expect(customerHref).toBeTruthy();
    await page.goto(customerHref!, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/customers\//);
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
    await expect(page.getByRole('heading', { level: 1, name: 'Losses' })).toBeVisible();
    await expect(page.getByText('£0.00', { exact: true }).first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/\b[a-z]+_[a-z_]+\b/);

    await page.goto('/financials/reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
    await expect(page.locator('main a[href^="/financials/reports/records"]').first()).toBeVisible();
  });
});
