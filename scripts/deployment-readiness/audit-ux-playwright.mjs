import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const outDir = path.resolve('reports/deployment-readiness/screenshots');
const evidencePath = path.resolve('reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json');
fs.mkdirSync(outDir, { recursive: true });

const credentialsPath = path.resolve('tests/.test-credentials.json');
const fixturePath = path.resolve('tests/utils/csv-fixtures/minimal.csv');

async function safeShot(page, name, notes, actions = []) {
  const file = path.join(outDir, `${String(notes.length + 1).padStart(2, '0')}-${name}.png`);
  const entry = { name, url: page.url(), screenshot: path.relative(process.cwd(), file), actions, textSample: '' };
  try {
    entry.textSample = (await page.locator('body').innerText({ timeout: 3000 })).replace(/\s+/g, ' ').slice(0, 1000);
  } catch {}
  await page.screenshot({ path: file, fullPage: true });
  notes.push(entry);
}

const EXPECTED_SCREENSHOT_COUNT = 13;

async function login(page, notes) {
  // Check that server is reachable first
  try {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (err) {
    notes.push({ name: 'auth-skipped', error: `Server unreachable at ${baseURL}: ${err.message}` });
    return false;
  }

  if (!fs.existsSync(credentialsPath)) {
    notes.push({ name: 'auth-skipped', error: 'tests/.test-credentials.json not found' });
    return false;
  }
  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  await page.waitForTimeout(1500);
  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');
  await email.fill(String(creds.email ?? ''));
  await password.fill(String(creds.password ?? ''));
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|onboarding|upload)/, { timeout: 30000 });
  return true;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const notes = [];

  try {
    const authed = await login(page, notes);
    if (authed) {
      await page.goto(`${baseURL}/dashboard`);
      await safeShot(page, 'dashboard', notes, ['Viewed dashboard']);

      await page.goto(`${baseURL}/upload`);
      await safeShot(page, 'upload-empty', notes, ['Viewed upload page']);
      if (fs.existsSync(fixturePath)) {
        try {
          await page.locator('input[type="file"]').setInputFiles(fixturePath);
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return text.includes('We found') || text.includes('Column mapping') || text.includes('Upload context');
          }, { timeout: 20000 });
          await safeShot(page, 'upload-mapping', notes, ['Selected minimal CSV', 'Observed mapping/data-quality step']);
          const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
          if (await continueButton.isVisible({ timeout: 2000 })) {
            await continueButton.click();
            await safeShot(page, 'upload-context', notes, ['Clicked Continue to upload context']);
          }
        } catch (err) {
          notes.push({
            name: 'upload-mapping-error',
            message: err instanceof Error ? err.message : String(err),
            url: page.url(),
          });
        }
      }

      await page.goto(`${baseURL}/history`);
      await safeShot(page, 'history', notes, ['Viewed audit history']);
      const auditLink = page.locator('a[href^="/audit/"]').first();
      if (await auditLink.isVisible({ timeout: 5000 })) {
        await auditLink.click();
        await page.waitForURL(/\/audit\//, { timeout: 15000 });
        await safeShot(page, 'audit-results', notes, ['Opened latest audit result']);
        const customerTab = page.getByRole('button', { name: /customers/i }).or(page.getByRole('link', { name: /customers/i })).first();
        if (await customerTab.isVisible({ timeout: 3000 })) {
          await customerTab.click();
          await page.waitForTimeout(750);
          await safeShot(page, 'audit-customers-tab', notes, ['Opened audit customers tab']);
        }
        const viewCustomer = page.getByRole('link', { name: /view/i }).first();
        if (await viewCustomer.isVisible({ timeout: 3000 })) {
          await viewCustomer.click();
          await page.waitForTimeout(1500);
          await safeShot(page, 'audit-customer-drawer', notes, ['Clicked first customer View']);
        }
      }

      await page.goto(`${baseURL}/customers`);
      await safeShot(page, 'customers-list', notes, ['Viewed global customers list']);
      const customerRow = page.locator('[data-testid="customer-row"], table tbody tr').first();
      if (await customerRow.isVisible({ timeout: 5000 })) {
        await customerRow.click();
        await page.waitForTimeout(1500);
        await safeShot(page, 'customer-drawer-or-profile', notes, ['Clicked first customer row']);
      }

      await page.goto(`${baseURL}/watchlist`);
      await safeShot(page, 'watchlist', notes, ['Viewed watchlist']);
      await page.goto(`${baseURL}/chargebacks`);
      await safeShot(page, 'evidence-packages', notes, ['Viewed evidence packages']);
      await page.goto(`${baseURL}/settings`);
      await safeShot(page, 'settings', notes, ['Viewed settings']);
    }
  } catch (err) {
    notes.push({ name: 'playwright-error', message: err instanceof Error ? err.message : String(err), url: page.url() });
  } finally {
    await browser.close();
  }

  fs.writeFileSync(evidencePath, `${JSON.stringify({ baseURL, notes }, null, 2)}\n`);
  console.log(`Wrote ${notes.length} UX evidence entries to ${evidencePath}`);

  // Fail closed — any of the following conditions cause a non-zero exit:
  const errors = notes.filter(n =>
    n.name === 'playwright-error' ||
    n.name === 'auth-skipped' ||
    n.error ||
    n.name?.endsWith('-error')
  );

  if (errors.length > 0) {
    console.error(`\n[audit:ux] FAIL — ${errors.length} error(s) recorded:`);
    for (const e of errors) console.error('  -', e.name, e.message ?? e.error ?? '');
    process.exitCode = 1;
    return;
  }

  const screenshotCount = notes.filter(n => n.screenshot).length;
  if (screenshotCount < EXPECTED_SCREENSHOT_COUNT) {
    console.error(
      `\n[audit:ux] FAIL — only ${screenshotCount} screenshot(s) written, expected at least ${EXPECTED_SCREENSHOT_COUNT}.`
    );
    process.exitCode = 1;
    return;
  }

  const dashboardEntry = notes.find(
    (n) => typeof n.name === 'string' && n.name === 'dashboard'
  );
  const dashboardText = String(dashboardEntry?.textSample ?? '');
  if (
    dashboardText.includes('CUSTOMERS TO REVIEW Unavailable') ||
    dashboardText.includes('Count could not be loaded')
  ) {
    console.error(
      '\n[audit:ux] FAIL — dashboard review queue metric is unavailable in happy-path capture.'
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\n[audit:ux] PASS — ${screenshotCount} screenshots, 0 errors.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
