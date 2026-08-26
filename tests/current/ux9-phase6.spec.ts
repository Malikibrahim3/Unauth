import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = path.join(process.cwd(), 'artifacts/ux9/ux9-6');

async function ready(page: Page, route: string, heading: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Setting authority and impact' })).toContainText('Who can change it');
  await expect(page.getByRole('region', { name: 'Setting authority and impact' })).toContainText('Current state');
  await expect(page.getByRole('region', { name: 'Setting authority and impact' })).toContainText('Save behavior');
  await expect(page.getByRole('region', { name: 'Setting authority and impact' })).toContainText('Impact');
}

async function verifyFrame(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: string, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null }> }> } }).axe;
    const result = await axe.run('main', {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical');
  });
  expect(violations).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function capture(page: Page, name: string, theme = 'light') {
  await page.screenshot({ path: path.join(evidenceDir, `${name}-${theme}-1280x720.png`), fullPage: false });
}

test('UX9-6 settings and governance stay task-first, truthful, and error-free', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const routes = [
    ['/settings/workspace/account', 'Account', 'account'],
    ['/settings/workspace/team', 'Team', 'team'],
    ['/settings/product/platform', 'Defaults', 'platform-defaults'],
    ['/settings/product/notifications', 'Notification preferences', 'notification-preferences'],
    ['/settings/developers/api-access', 'API access', 'api-access'],
    ['/settings/governance/audit-trail', 'Audit trail', 'audit-trail'],
    ['/settings/legal/data-privacy', 'Data privacy', 'data-privacy'],
    ['/settings/legal/agreements', 'Agreements', 'agreements'],
    ['/settings/billing', 'Billing', 'billing'],
  ] as const;

  for (const [route, heading, artifact] of routes) {
    await ready(page, route, heading);
    await verifyFrame(page);
    await capture(page, artifact);
  }

  await ready(page, '/settings/workspace/team', 'Team');
  const invite = page.getByRole('button', { name: 'Invite member' });
  if (await invite.isEnabled()) {
    await invite.click();
    await expect(page.getByRole('dialog', { name: 'Invite team member' })).toBeVisible();
    await expect(page.getByText('Ownership is transferred separately and cannot be invited.')).toBeVisible();
    await capture(page, 'invite-member-modal');
    await page.keyboard.press('Escape');
  }

  await ready(page, '/settings/legal/agreements', 'Agreements');
  await page.getByRole('button', { name: 'Upload an agreement' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Upload an agreement' })).toBeVisible();
  await expect(page.getByText('Uploading stores a source document but never activates extracted terms.')).toBeVisible();
  await capture(page, 'agreement-upload-modal');
  await page.keyboard.press('Escape');

  await page.context().addCookies([{ name: 'unauth.auth-theme', value: 'dark', url: new URL(page.url()).origin }]);
  await ready(page, '/settings/workspace/account', 'Account');
  await expect(page.locator('.uo-product.ua-desktop-boundary')).toHaveAttribute('data-auth-theme', 'dark');
  await verifyFrame(page);
  await capture(page, 'account', 'dark');

  await page.setViewportSize({ width: 1024, height: 768 });
  await ready(page, '/settings/governance/audit-trail', 'Audit trail');
  await verifyFrame(page);

  expect(pageErrors).toEqual([]);
});
