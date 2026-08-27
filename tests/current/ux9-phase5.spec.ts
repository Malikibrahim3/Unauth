import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = path.join(process.cwd(), 'artifacts/ux9/ux9-5');

async function ready(page: Page, route: string, heading: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(evidenceDir, `${name}-light-1280x720.png`), fullPage: false });
}

test('UX9-5 representative production surfaces remain truthful and error-free', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await ready(page, '/controls/rules', 'Payout rules');
  await expect(page.getByText('Rules recommend, they never decide.', { exact: true })).toBeVisible();
  await capture(page, 'rules-registry');
  const newRule = page.getByRole('link', { name: 'New rule' });
  if (await newRule.count()) {
    await newRule.click();
    await expect(page.getByRole('dialog', { name: 'New payout rule' })).toBeVisible();
    await expect(page.getByLabel('Rule draft steps')).toContainText('1Goal2Conditions3Recommendation4Review');
    await capture(page, 'rule-builder-draft');
    await page.keyboard.press('Escape');
  }

  await ready(page, '/controls/rules/recovery', 'Recovery rulebook');
  await capture(page, 'recovery-rulebook');

  await ready(page, '/controls/flows', 'Flows');
  await expect(page.getByText('Flows move work, they don\'t decide outcomes.', { exact: true })).toBeVisible();
  await capture(page, 'flows-registry');
  const newFlow = page.getByRole('link', { name: 'New flow' });
  if (await newFlow.count()) {
    await newFlow.click();
    await expect(page.getByRole('dialog', { name: 'New flow draft' })).toBeVisible();
    await expect(page.getByText('Live publication is unavailable in the pilot.')).toBeVisible();
    await capture(page, 'new-flow-draft');
    await page.keyboard.press('Escape');
  }

  await ready(page, '/controls/flows/runs', 'Flow runs');
  await expect(page.getByRole('table', { name: 'Flow run records' }).or(page.getByText('No historical flow runs'))).toBeVisible();
  await capture(page, 'flow-runs-registry');
  const runLinks = page.locator('main a[href^="/controls/flows/runs/"]');
  const runHref = await runLinks.count() ? await runLinks.first().getAttribute('href') : null;
  if (runHref) {
    await page.goto(runHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Execution trace' })).toBeVisible();
    await capture(page, 'flow-run-detail');
  }

  await ready(page, '/customers?sort=orders', 'Customers');
  const customerHref = await page.getByTestId('customer-row').first().getAttribute('data-row-key');
  expect(customerHref).toBeTruthy();
  await page.goto(`/customers/${customerHref}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).toBeVisible();
  const connectedHref = await page.locator('main a[href^="/orders/"], main a[href^="/tickets/"], main a[href^="/shipments/"], main a[href^="/refunds/"], main a[href^="/returns/"], main a[href^="/disputes/"]').first().getAttribute('href');
  expect(connectedHref).toBeTruthy();
  await page.goto(connectedHref!, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Record relationship' })).toBeVisible();
  await capture(page, 'connected-record-detail');

  await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'dark', url: new URL(page.url()).origin }]);
  await ready(page, '/controls/rules?new=1', 'Payout rules');
  const darkBuilder = page.getByRole('dialog', { name: 'New payout rule' });
  await expect(darkBuilder).toBeVisible();
  await expect(page.locator('.ua-overlay-host')).toHaveAttribute('data-auth-theme', 'dark');
  await expect(darkBuilder).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: path.join(evidenceDir, 'rule-builder-draft-dark-1280x720.png'), fullPage: false });

  expect(pageErrors).toEqual([]);
});
