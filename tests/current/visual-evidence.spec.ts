import { expect, test } from '@playwright/test';
import path from 'path';

const ROUTES = [
  ['overview', '/dashboard'],
  ['work', '/work'],
  ['payout-control', '/claims'],
  ['losses', '/losses'],
  ['recoveries', '/recoveries'],
  ['customers', '/customers'],
  ['rules', '/rules'],
  ['flows', '/flows'],
  ['integrations', '/integrations'],
  ['reports', '/reports'],
  ['notifications', '/notifications'],
  ['settings', '/settings/account'],
] as const;

const EVIDENCE_DIRECTORY = path.join(
  process.cwd(),
  'docs/audit-evidence/2026-07-13-remediation/final',
);

for (const [name, route] of ROUTES) {
  test(`${name} desktop and mobile release evidence`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(EVIDENCE_DIRECTORY, `${name}-desktop.png`),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(EVIDENCE_DIRECTORY, `${name}-mobile.png`),
      fullPage: true,
    });
  });
}

test('customer detail and connected objects release evidence', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'View', exact: true }).first().click();
  const profileLink = page.getByRole('link', { name: 'Open full customer profile' });
  await expect(profileLink).toBeVisible({ timeout: 30_000 });
  const profileHref = await profileLink.getAttribute('href');
  expect(profileHref).toBeTruthy();
  await page.goto(profileHref!, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Connected orders' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(EVIDENCE_DIRECTORY, 'customer-detail-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(EVIDENCE_DIRECTORY, 'customer-detail-mobile.png'),
    fullPage: true,
  });
});
