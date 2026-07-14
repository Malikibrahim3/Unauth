import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = path.join(
  process.cwd(),
  'design-evidence',
  '2026-07-14-authenticated-craft-completion',
);

async function capture(page: Page, name: string) {
  await expect(page.locator('.ua-app, .ua-auth-surface')).toBeVisible({ timeout: 20_000 });
  const masks = [
    page.locator('aside').getByText(/\S+@\S+/),
    page.locator('text=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i'),
  ];
  if (name === '08-customers') masks.push(page.locator('[data-testid="customer-row"] td:first-child'));
  if (name === '09-customer-detail') masks.push(page.locator('main h1').first());
  if (name === '18-customer-drawer') masks.push(page.getByRole('dialog').getByRole('heading').first());
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, `${name}.png`),
    animations: 'disabled',
    mask: masks,
    maskColor: '#d8d8d2',
  });
}

async function visitAndCapture(page: Page, route: string, name: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await capture(page, name);
}

test('capture the final authenticated visual evidence set', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  const routes = [
    ['/dashboard', '01-shell-overview'],
    ['/work', '02-work'],
    ['/claims', '03-payout-control'],
    ['/work?view=integration-exceptions', '05-exceptions'],
    ['/losses', '06-losses'],
    ['/recoveries', '07-recovery'],
    ['/customers', '08-customers'],
    ['/rules', '10-rules'],
    ['/flows', '11-flows'],
    ['/reports', '12-reports'],
    ['/integrations', '13-integrations'],
    ['/settings/account', '14-settings'],
    ['/notifications', '15-notifications'],
    ['/audit-running?email=masked%40example.test', '16-setup-progress'],
  ] as const;

  for (const [route, name] of routes) await visitAndCapture(page, route, name);

  let caseHref: string | null = null;
  await page.goto('/claims');
  caseHref = await page.locator('main a[href^="/claims/"]').first().getAttribute('href');
  expect(caseHref).toBeTruthy();
  await page.goto(caseHref!, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).not.toHaveText('Payout case', { timeout: 20_000 });
  await expect(page.getByText('Loading payout exposure…')).toHaveCount(0, { timeout: 20_000 });
  await capture(page, '04-case-detail');

  if (!caseHref) {
    await page.goto('/claims');
    caseHref = await page.locator('main a[href^="/claims/"]').first().getAttribute('href');
    if (caseHref) await page.goto(caseHref);
  }
  const objectLinks = page.locator('main a[href^="/orders/"], main a[href^="/shipments/"], main a[href^="/refunds/"], main a[href^="/returns/"]');
  const objectHref = await objectLinks.count() ? await objectLinks.first().getAttribute('href') : null;
  await visitAndCapture(page, objectHref ?? '/orders/00000000-0000-4000-8000-000000000000', '17-object-detail');

  await page.goto('/customers');
  await page.getByTestId('customer-row').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Open full profile' })).toBeVisible();
  await capture(page, '18-customer-drawer');
  const customerHref = await page.getByRole('dialog').getByRole('link', { name: 'Open full profile' }).getAttribute('href');
  expect(customerHref).toBeTruthy();
  await visitAndCapture(page, customerHref!, '09-customer-detail');

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Search (⌘K)' }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await capture(page, '19-command-modal');

  await visitAndCapture(page, '/customers?q=ZZZ_NO_MATCH_REDESIGN_EVIDENCE', '20-empty-state');
  await visitAndCapture(page, '/integrations/example', '21-error-state');

  await page.setViewportSize({ width: 1024, height: 900 });
  await visitAndCapture(page, '/dashboard', '22-tablet-overview');
  await page.setViewportSize({ width: 1280, height: 900 });
  await visitAndCapture(page, '/dashboard', '25-laptop-overview');
  await page.setViewportSize({ width: 390, height: 844 });
  await visitAndCapture(page, '/dashboard', '23-mobile-overview');
  // Force a fresh document so overlay state from the command-palette evidence
  // cannot intercept the mobile navigation control.
  await page.goto('/dashboard?evidence=mobile-nav');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await capture(page, '24-mobile-navigation');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/settings/account');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await visitAndCapture(page, '/dashboard', '26-dark-overview');
});
