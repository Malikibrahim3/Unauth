import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_ROOT = 'artifacts/ux9/ux9-4';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'light', url: BASE_URL }]);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

async function y(page: Page, text: string) {
  const box = await page.getByText(text, { exact: false }).first().boundingBox();
  expect(box).not.toBeNull();
  return box?.y ?? Number.POSITIVE_INFINITY;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.describe('UX9-4 task-first financial operations', () => {
  test('Overview leads with current attention before financial analysis in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/overview');
    await expect(page.getByRole('heading', { level: 1, name: 'Operating position' })).toBeVisible();
    expect(await y(page, 'Needs attention now')).toBeLessThan(await y(page, 'Exposure intake and resolution'));
    await expect(page.getByRole('region', { name: 'What needs attention' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${ARTIFACT_ROOT}/overview-task-first-light-1280x720.png`, fullPage: true });

    await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'dark', url: BASE_URL }]);
    await page.reload();
    await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
    await page.screenshot({ path: `${ARTIFACT_ROOT}/overview-task-first-dark-1280x720.png`, fullPage: true });
  });

  test('Work groups system and saved views while preserving URL-backed expert controls', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/work?view=overdue&priority=high&sort=deadline');
    await expect(page.getByRole('navigation', { name: 'Work views' })).toBeVisible();
    await expect(page.getByText('System views', { exact: true })).toBeVisible();
    const filters = page.locator('details').filter({ hasText: /^Filters/ });
    await expect(filters).toHaveAttribute('open', '');
    await expect(page.getByLabel('Priority')).toHaveValue('high');
    await expect(page.getByRole('combobox', { name: 'Saved Work view' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${ARTIFACT_ROOT}/work-grouped-views-light-1280x720.png`, fullPage: true });
  });

  test('Loss, recovery and reconciliation put registries before secondary analytics', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/financials/losses?range=30d&currency=GBP');
    await expect(page.getByRole('heading', { name: 'Loss entries requiring financial review' })).toBeVisible();
    expect(await y(page, 'Loss entries requiring financial review')).toBeLessThan(await y(page, 'Analyse realised loss by cause'));
    await page.screenshot({ path: `${ARTIFACT_ROOT}/loss-ledger-task-first-light-1280x720.png`, fullPage: true });

    await page.goto('/financials/recovery?currency=GBP');
    await expect(page.getByRole('heading', { name: /Next recovery work/ })).toBeVisible();
    expect(await y(page, 'Next recovery work')).toBeLessThan(await y(page, 'Review 30-day recovery outcomes'));
    await page.screenshot({ path: `${ARTIFACT_ROOT}/recovery-board-task-first-light-1280x720.png`, fullPage: true });

    const recoveryLink = page.locator('a[href^="/financials/recovery/"]').first();
    if (await recoveryLink.count()) {
      await Promise.all([
        page.waitForURL(/\/financials\/recovery\/[^/?]+/, { timeout: 30_000 }),
        recoveryLink.click(),
      ]);
      await expect(page.getByRole('heading', { name: 'External result to reconciled money' })).toBeVisible({ timeout: 30_000 });
      for (const label of ['Provider position', 'Received credit', 'Matched credit', 'Reconciled money']) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }
      await page.screenshot({ path: `${ARTIFACT_ROOT}/recovery-detail-money-chain-light-1280x720.png`, fullPage: true });
    }

    await page.goto('/financials/reconciliation?currency=GBP');
    await expect(page.getByRole('heading', { name: /Exceptions requiring review|Open exceptions/ })).toBeVisible();
    expect(await y(page, 'Exceptions requiring review')).toBeLessThan(await y(page, 'Analyse match quality and source variance'));
    await page.screenshot({ path: `${ARTIFACT_ROOT}/reconciliation-task-first-light-1280x720.png`, fullPage: true });
  });

  test('Reports leads with merchant questions and preserves scoped drill-through', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/financials/reports?range=30d&currency=GBP');
    await expect(page.getByRole('heading', { name: 'Open a report' })).toBeVisible();
    expect(await y(page, 'Open a report')).toBeLessThan(await y(page, 'How did requested value become final net loss?'));
    await expect(page.getByText(/Each report inherits this range, timezone and currency scope/)).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_ROOT}/reports-question-first-light-1280x720.png`, fullPage: true });

    await page.getByRole('link', { name: /Financial performance/ }).first().click();
    await expect(page).toHaveURL(/\/financials\/reports\/financial\?.*range=30d.*currency=GBP/);
    await expect(page.getByRole('heading', { name: 'How did requested value become final net loss?' })).toBeVisible();
  });
});
