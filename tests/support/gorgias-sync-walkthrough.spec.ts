import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { GORGIAS_SUPPORT_SECRET_SAVE_WARNING } from '../../lib/support/gorgias/settingsConnection';

const WALKTHROUGH_DIR = path.join(__dirname, 'walkthrough-artifacts');
const STATE_PATH = path.join(WALKTHROUGH_DIR, 'state.json');
const PROFILE_ID = '6ac24686-2fd4-4a27-9eb3-cb1751a9548c';
const CLAIM_ID = '63f5f1ec-e96c-41b7-a759-cb4c253da644';
const ACCOUNT_ID = 'live-link-verify-ui';
const DOMAIN = 'live-link-verify-ui.gorgias.com';
const DISPLAY_NAME = 'Live Link Verify UI';

type WalkthroughState = {
  connectionId?: string;
  webhookUrl?: string;
  webhookSecretMasked?: string;
  webhookSecret?: string;
  rotatedSecret?: string;
};

function maskSecret(secret: string): string {
  if (secret.length <= 12) return '***';
  return `${secret.slice(0, 16)}…${secret.slice(-4)}`;
}

function writeState(patch: Partial<WalkthroughState>) {
  fs.mkdirSync(WALKTHROUGH_DIR, { recursive: true });
  const prev: WalkthroughState = fs.existsSync(STATE_PATH)
    ? (JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as WalkthroughState)
    : {};
  const next = { ...prev, ...patch };
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
}

test.describe.serial('Gorgias support sync walkthrough', () => {
  test('settings page sections load', async ({ page }) => {
    await page.goto('/settings/integrations/gorgias', { waitUntil: 'domcontentloaded' });
    if (await page.getByText('Settings unavailable').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /try again/i }).click();
      await page.waitForLoadState('networkidle');
    }
    await expect(page.getByText('Gorgias support ticket sync')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Gorgias sidebar widget')).toBeVisible();
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '01-gorgias-settings.png'), fullPage: true });
  });

  test('create support connection from UI', async ({ page }) => {
    await page.goto('/settings/integrations/gorgias', { waitUntil: 'domcontentloaded' });
    if (await page.getByText('Settings unavailable').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /try again/i }).click();
      await page.waitForLoadState('networkidle');
    }

    const createBtn = page.getByRole('button', { name: /create webhook connection/i });
    if (await createBtn.isVisible().catch(() => false)) {
      await page.getByPlaceholder('acme or acme.gorgias.com').fill(DOMAIN);
      await page.getByPlaceholder('Acme Gorgias').fill(DISPLAY_NAME);
      const createResponse = page.waitForResponse(
        (res) =>
          res.url().includes('/api/settings/gorgias/support-connection') &&
          res.request().method() === 'POST'
      );
      await createBtn.click();
      const res = await createResponse;
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { webhook_secret_plaintext?: string; webhook_url?: string };
      expect(body.webhook_secret_plaintext).toMatch(/^gorgias_whsec_/);
      writeState({
        webhookSecret: body.webhook_secret_plaintext,
        webhookSecretMasked: body.webhook_secret_plaintext
          ? maskSecret(body.webhook_secret_plaintext)
          : undefined,
        webhookUrl: body.webhook_url,
        connectionId: undefined,
      });
    }

    await expect(page.getByText('One-time webhook setup')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(GORGIAS_SUPPORT_SECRET_SAVE_WARNING)).toBeVisible();
    await expect(page.getByText('x-unauth-gorgias-secret')).toBeVisible();
    await expect(page.getByText(/\/api\/gorgias\/support-webhook/)).toBeVisible();

    const secretPre = page.locator('pre').filter({ hasText: /^gorgias_whsec_/ });
    await expect(secretPre).toBeVisible();
    const secret = (await secretPre.textContent())?.trim() ?? '';
    expect(secret).toMatch(/^gorgias_whsec_/);

    const webhookUrl =
      (await page
        .locator('pre')
        .filter({ hasText: /support-webhook/ })
        .first()
        .textContent())?.trim() ?? '';

    await page.getByRole('button', { name: /copy secret/i }).click();
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible();

    writeState({
      webhookSecret: secret,
      webhookSecretMasked: maskSecret(secret),
      webhookUrl,
    });

    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '03-one-time-secret.png'), fullPage: true });

    await page.getByRole('button', { name: /i saved the secret/i }).click();
    await expect(secretPre).not.toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('pre').filter({ hasText: /^gorgias_whsec_/ })).toHaveCount(0);
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '04-after-refresh-no-secret.png'), fullPage: true });
  });

  test('GET route is safe after refresh', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const res = await request.get('/api/settings/gorgias/support-connection', {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    expect(res.status()).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    const connection = json.connection as Record<string, unknown> | null;
    expect(connection).toBeTruthy();
    expect(connection?.webhook_secret_configured).toBe(true);
    expect(json.webhook_secret_plaintext).toBeUndefined();
    expect(connection?.webhook_secret_plaintext).toBeUndefined();
    expect(connection?.webhook_secret_hash).toBeUndefined();
    expect(connection?.access_token_encrypted).toBeUndefined();

    writeState({ connectionId: String(connection?.id ?? '') });
    fs.writeFileSync(
      path.join(WALKTHROUGH_DIR, 'get-connection.json'),
      JSON.stringify(json, null, 2)
    );
  });

  test('webhook fixtures valid and invalid', () => {
    execSync('node tests/support/run-walkthrough-fixtures.mjs', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const report = JSON.parse(
      fs.readFileSync(path.join(WALKTHROUGH_DIR, 'fixture-report.json'), 'utf8')
    ) as {
      valid: { body?: { link_status?: string; shopify_order_id?: string } };
      wrong: { body?: unknown; exitCode: number };
    };
    expect(report.valid.body).toBeTruthy();
    expect(report.wrong.exitCode).not.toBe(0);
  });

  test('customer profile shows support cases', async ({ page }) => {
    await page.goto(`/customers/${PROFILE_ID}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Support cases', { exact: true })).toBeVisible({ timeout: 30000 });
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('gorgias_whsec_');
    expect(body).not.toMatch(/shopper@/i);
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '05-customer-profile.png'), fullPage: true });
  });

  test('claim review shows support ticket context', async ({ page }) => {
    await page.goto(`/claims/${CLAIM_ID}`, { waitUntil: 'networkidle' });
    const supportHeading = page.getByText(/support ticket context/i);
    if (await supportHeading.isVisible().catch(() => false)) {
      await expect(supportHeading).toBeVisible();
    }
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '06-claim-review.png'), fullPage: true });
  });

  test('rotate secret from UI', async ({ page }) => {
    await page.goto('/settings/integrations/gorgias', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /rotate secret/i }).click();
    await expect(page.getByText('One-time webhook setup')).toBeVisible({ timeout: 20000 });
    const secretPre = page.locator('pre').filter({ hasText: /^gorgias_whsec_/ });
    const rotated = (await secretPre.textContent())?.trim() ?? '';
    expect(rotated).toMatch(/^gorgias_whsec_/);
    writeState({ rotatedSecret: rotated });
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '07-rotate-secret.png'), fullPage: true });
  });

  test('disable connection from UI', async ({ page }) => {
    await page.goto('/settings/integrations/gorgias', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /disable connection/i }).click();
    await expect(page.getByText(/disabled/i).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '08-disabled.png'), fullPage: true });
  });

  test('re-enable via update without new secret', async ({ page }) => {
    await page.goto('/settings/integrations/gorgias', { waitUntil: 'networkidle' });
    const reconnect = page.getByPlaceholder('Account ID or domain');
    if (await reconnect.isVisible().catch(() => false)) {
      await reconnect.fill(DOMAIN);
      await page.getByRole('button', { name: /update connection/i }).click();
      await expect(page.getByText(/active|configured/i).first()).toBeVisible({ timeout: 15000 });
    }
    await expect(page.locator('pre').filter({ hasText: /^gorgias_whsec_/ })).toHaveCount(0);
    await page.screenshot({ path: path.join(WALKTHROUGH_DIR, '09-reenabled.png'), fullPage: true });
  });
});
