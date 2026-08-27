import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = path.join(process.cwd(), 'artifacts/ux9/ux9-7');

async function verifyFrame(page: Page, scope = 'main') {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async (context) => {
    const axe = (window as unknown as { axe: { run: (scope: string, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null }> }> } }).axe;
    const result = await axe.run(context, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical');
  }, scope);
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.locator('img').evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length)).toBe(0);
}

async function capture(page: Page, name: string) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('UX9-7 evidence requires a fixed viewport.');
  await page.screenshot({ path: path.join(evidenceDir, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: false, animations: 'disabled' });
}

test('UX9-7 public, auth, legal, and root routes stay light, responsive, and truthful', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const routes = [
    ['/landing', /The evidence gate before every refund or reship/, 'marketing-landing', 'landing'],
    ['/pricing?plan=pro', /One monthly plan/, 'pricing', 'pricing-pro-intent'],
    ['/demo?step=recommendation', /One lost parcel/, 'interactive-product-demo', 'demo-recommendation'],
    ['/signup?plan=pro&next=%2Fcases', 'Create your account', 'create-account', 'signup-pro-intent'],
    ['/login?plan=pro&next=%2Fcases', 'Sign in to Unauth', 'sign-in', 'sign-in'],
    ['/reset?next=%2Fcases', 'Reset your password', 'request-password-reset', 'password-reset-request'],
    ['/legal/privacy', 'Privacy notice approval gate', 'privacy-policy', 'privacy-gate'],
    ['/legal/data-handling', 'Data handling approval gate', 'data-handling-explainer', 'data-handling-gate'],
    ['/legal/dpa', 'Data processing addendum approval gate', 'data-processing-addendum', 'dpa-gate'],
    ['/legal/pilot-terms', 'Pilot terms approval gate', 'pilot-terms', 'pilot-terms-gate'],
    ['/ux9-phase7-missing-route', 'Page not found', 'root-not-found', 'root-not-found'],
  ] as const;

  for (const [route, heading, surfaceId, artifact] of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(`[data-surface-id="${surfaceId}"]`).first()).toBeVisible();
    await verifyFrame(page);
    await capture(page, artifact);
    expect(await page.evaluate(() => getComputedStyle(document.body).colorScheme)).not.toContain('dark');
  }

  await page.goto('/landing', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-artifact-slot="hero-gate-overview"]')).toHaveAttribute('data-artifact-state', 'ready');
  await expect(page.locator('[data-artifact-state="truthful-fallback"]')).toHaveCount(4);
  await expect(page.getByText('ARTWORK PLACEHOLDER — NOT FINAL')).toHaveCount(0);

  await page.goto('/signup?plan=pro&next=%2Fcases', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Requested plan intent' })).toContainText('1,000 credits are included each month');
  await expect(page.getByText('Account access', { exact: true })).toBeVisible();

  await page.goto('/legal/privacy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  await expect(page.locator('[data-release-status="blocked-unapproved"]')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('UX9-7 authenticated notifications, search, and Help stay task-first', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Authenticated product keeps the existing desktop-required boundary below 1024px.');
  test.setTimeout(6 * 60_000);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/notifications', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-surface-id="notifications-inbox"]').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: /Needs you/ })).toBeVisible();
  await verifyFrame(page);
  await capture(page, 'notifications-inbox');

  await page.goto('/search?q=CASE', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-surface-id="search-route"]').first()).toBeVisible();
  await expect(page.getByPlaceholder('Search cases, customers, orders')).toHaveValue('CASE');
  await verifyFrame(page);
  await capture(page, 'search-route');

  await page.goto('/help', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Help centre' })).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-surface-id="help-index"]').first()).toBeVisible();
  await page.getByPlaceholder(/Search the guides/).fill('recovery');
  await expect(page).toHaveURL(/\/help\?q=recovery/);
  await verifyFrame(page);
  await capture(page, 'help-search');

  await page.goto('/help/activation', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(page.locator('[data-surface-id="help-article"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'On this page' })).toBeVisible();
  await expect(page.locator('aside nav a').first()).toBeVisible();
  await verifyFrame(page);
  await capture(page, 'help-article');

  expect(pageErrors).toEqual([]);
});
