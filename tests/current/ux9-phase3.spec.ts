import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_ROOT = 'artifacts/ux9/ux9-3';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

async function useTheme(page: Page, theme: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'unauth.auth-theme', value: theme, url: BASE_URL }]);
}

async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.describe('UX9-3 task-first onboarding, sources, imports, and setup', () => {
  test('Sources leads with task groups and retains provider truth in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await useTheme(page, 'light');
    await page.goto('/sources/connected');
    await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What needs attention now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready to connect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Not available yet' })).toBeVisible();
    const [catalogue, readiness] = await Promise.all([
      page.getByRole('heading', { name: 'What needs attention now' }).boundingBox(),
      page.getByRole('heading', { name: 'Minimum evidence stack' }).boundingBox(),
    ]);
    expect(catalogue?.y).toBeLessThan(readiness?.y ?? 0);
    await expectNoOverflow(page);
    await page.screenshot({ path: `${ARTIFACT_ROOT}/connected-sources-light-1280x720.png`, fullPage: true });

    await page.goto('/sources/browse');
    await expect(page.getByRole('heading', { name: 'Find a source to connect' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/source-catalogue-light-1280x720.png`, fullPage: true });
    await page.getByRole('searchbox', { name: 'Search providers' }).fill('no-provider-with-this-name');
    await expect(page.getByRole('heading', { name: 'No sources match these filters' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/source-catalogue-no-results-light-1280x720.png`, fullPage: true });

    await useTheme(page, 'dark');
    await page.goto('/sources/connected');
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
    await expect(page.getByRole('heading', { name: 'Ready to connect' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/connected-sources-dark-1280x720.png`, fullPage: true });
  });

  test('Source detail explains capability, configuration, usability, returned data, freshness, and safe actions', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await useTheme(page, 'light');
    await page.goto('/sources/shopify');
    await expect(page.getByRole('heading', { name: 'Current source position' })).toBeVisible();
    for (const term of ['Capability', 'Workspace', 'Usability', 'Returned data', 'Freshness', 'Next action']) {
      await expect(page.getByText(term, { exact: true }).first()).toBeVisible();
    }
    await page.screenshot({ path: `${ARTIFACT_ROOT}/source-detail-light-1280x720.png`, fullPage: true });

    await useTheme(page, 'dark');
    await page.reload();
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
    await page.screenshot({ path: `${ARTIFACT_ROOT}/source-detail-dark-1280x720.png`, fullPage: true });
  });

  test('Generic setup keeps seven resumable steps and provider activation last', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await useTheme(page, 'light');
    await page.goto('/sources/setup/bigcommerce?step=provider');
    const progress = page.getByRole('list', { name: 'BigCommerce setup stages' });
    await expect(progress).toBeVisible();
    await expect(progress.getByRole('link')).toHaveCount(7);
    await expect(page.getByText(/Only the final activation region can change connection state/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'BigCommerce', exact: true })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/generic-seven-step-provider-light-1280x720.png`, fullPage: true });

    await page.goto('/sources/setup/bigcommerce?step=review');
    await expect(page.getByRole('heading', { name: 'Verification checks' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/generic-seven-step-review-light-1280x720.png`, fullPage: true });

    await page.goto('/sources/setup/shopify');
    await expect(page.getByRole('heading', { level: 1, name: 'Connect Shopify' })).toBeVisible();
    const connect = page.getByRole('button', { name: /(?:Connect|Reconnect) Shopify/ }).first();
    if (await connect.count()) {
      await connect.click();
      const modal = page.getByRole('dialog', { name: /Connect Shopify/ });
      await expect(modal).toBeVisible();
      await expect(modal.getByText(/first sync starts only after Shopify confirms access/i)).toBeVisible();
      await page.screenshot({ path: `${ARTIFACT_ROOT}/connect-shopify-modal-light-1280x720.png`, fullPage: false });
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: `${ARTIFACT_ROOT}/provider-specific-shopify-light-1280x720.png`, fullPage: true });
  });

  test('Imports separates history, validation, commit review, and immutable outcome', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await useTheme(page, 'light');
    await page.goto('/sources/imports');
    await expect(page.getByRole('heading', { level: 1, name: 'Imports' })).toBeVisible();
    await expect(page.getByText(/Nothing is committed until you approve it/)).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/csv-imports-history-light-1280x720.png`, fullPage: true });

    await page.goto('/sources/imports?step=upload');
    await page.getByText('Paste CSV text instead', { exact: true }).click();
    await page.locator('textarea:visible').fill('external_id,currency,total_minor');
    await page.getByRole('button', { name: 'Continue to mapping' }).click();
    await page.getByRole('button', { name: 'Validate rows', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Validate records|Review and commit/ })).toBeVisible();
    await expect(page.getByText('Every row passed validation.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review commit' })).toBeDisabled();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/import-validation-empty-light-1280x720.png`, fullPage: true });

    await page.goto('/sources/imports/d1300000-0000-4000-8000-00000000000d');
    await expect(page.getByRole('heading', { name: /Import job/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What happened, in order' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Retained mapping snapshot' })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/import-job-route-light-1280x720.png`, fullPage: true });
  });

  test('ShipBob selection handles long searchable channel lists without changing connection state', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/integrations/shipbob/selection?selection=ux9-fixture', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          environment: 'production',
          expiresAt: '2026-08-25T18:00:00.000Z',
          accounts: Array.from({ length: 36 }, (_, index) => ({ id: `channel-${String(index + 1).padStart(2, '0')}`, name: `UK fulfilment channel ${index + 1}` })),
        }),
      });
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/sources/setup/shipbob/select?selection=ux9-fixture&returnTo=%2Fsources%2Fshipbob');
    await expect(page.getByRole('heading', { name: 'Choose a ShipBob channel' })).toBeVisible();
    await expect(page.getByText('36 of 36 channels')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search ShipBob channels' }).fill('channel 36');
    await expect(page.getByText('1 of 36 channels')).toBeVisible();
    await expect(page.getByText('UK fulfilment channel 36')).toBeVisible();
    await expectNoOverflow(page);
    await page.screenshot({ path: `${ARTIFACT_ROOT}/shipbob-channel-search-light-1280x720.png`, fullPage: true });
  });

  test('Onboarding keeps one focused responsive step, explicit deferral, and truthful summary', async ({ page }) => {
    test.setTimeout(120_000);
    const auth = new URL('/api/test/e2e-auth', BASE_URL);
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET ?? '');
    auth.searchParams.set('merchant_id', process.env.E2E_MERCHANT_ID ?? 'd1300000-0000-4000-8000-000000000100');
    auth.searchParams.set('redirect', '/onboarding?step=profile&ux9State=profile-complete');
    await page.goto(auth.toString());
    await expect(page).toHaveURL(/\/onboarding/);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: 'Tell us about this workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Skip for now/ })).toBeVisible();
    await expectNoOverflow(page);
    await page.screenshot({ path: `${ARTIFACT_ROOT}/onboarding-profile-light-390x844.png`, fullPage: true });

    await page.route('**/api/account/setup', async (route) => {
      const body = route.request().postDataJSON() as { deferOnboarding?: boolean } | null;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body?.deferOnboarding ? { onboardingDeferred: true } : { profileComplete: true }) });
    });
    await page.getByLabel('Store name').fill('UX9 Fictional Outfitters');
    await page.getByLabel('Commerce platform').selectOption('shopify');
    await page.getByLabel('Monthly order volume').selectOption({ index: 1 });
    await page.getByLabel('Primary post-purchase concern').selectOption({ index: 1 });
    await page.getByRole('button', { name: /^Save and/ }).click();
    await expect(page.getByRole('heading', { name: 'Connect your sources' })).toBeVisible();
    await expect(page.locator('[data-state-id="workspace-onboarding-shopify-connection"]')).toBeVisible();
    await expect(page.locator('[data-state-id="workspace-onboarding-helpdesk-connection"]')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/onboarding-connections-light-390x844.png`, fullPage: true });

    await page.getByRole('button', { name: 'Setup summary' }).click();
    await expect(page.getByRole('heading', { name: 'Review setup' })).toBeVisible();
    await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/onboarding-summary-light-390x844.png`, fullPage: true });

    const loadingPage = await page.context().newPage();
    const loadingErrors: string[] = [];
    loadingPage.on('pageerror', (error) => loadingErrors.push(error.message));
    await loadingPage.setViewportSize({ width: 1440, height: 900 });
    await loadingPage.goto('/onboarding?ux9State=loading', { waitUntil: 'domcontentloaded' });
    await expect(loadingPage.locator('[data-state-id="onboarding-loading"]')).toBeVisible();
    await loadingPage.screenshot({ path: `${ARTIFACT_ROOT}/onboarding-loading-light-1440x900.png`, fullPage: true });
    await loadingPage.close();
    expect(loadingErrors).toEqual([]);
  });
});
