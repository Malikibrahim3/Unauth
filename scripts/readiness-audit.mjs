import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(root, 'screenshots', `readiness-${stamp}`);
const csvDir = path.join(root, 'test-data', 'audit');
const password = `UnauthAudit!2026-${Date.now()}`;

const markers = {
  A: ['UNA-A-', '@example-audit.test', 'Loop Street', 'dev-a-risk', 'TRACK-A-'],
  B: ['UNA-B-', '@example-audit.test', 'Orbit Way', 'dev-b-risk', 'TRACK-B-'],
};

const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  accounts: [],
  uploads: [],
  routeChecks: [],
  csvTests: [],
  tenantChecks: [],
  piiFindings: [],
  console: [],
  network: [],
  screenshots: [],
  storage: {},
  accessibility: [],
  performance: [],
  cleanup: [],
};

function rel(p) {
  return path.relative(root, p);
}

function redacted(text) {
  return String(text)
    .replace(/(eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,})/g, '[JWT_REDACTED]')
    .replace(/(sb-[a-zA-Z0-9_-]{20,})/g, '[SUPABASE_TOKEN_REDACTED]')
    .replace(/([a-zA-Z0-9_-]{32,})/g, (m) => (m.includes('-') ? m : '[LONG_TOKEN_REDACTED]'));
}

async function screenshot(page, name, fullPage = true) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage }).catch(() => {});
  report.screenshots.push(rel(file));
  return file;
}

function attachCapture(page, label) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning' || /error|failed|supabase|upload|audit/i.test(text)) {
      report.console.push({ label, type: msg.type(), url: page.url(), text: redacted(text).slice(0, 1200) });
    }
  });
  page.on('pageerror', (err) => {
    report.console.push({ label, type: 'pageerror', url: page.url(), text: redacted(err.stack || err.message).slice(0, 1600) });
  });
  page.on('requestfailed', (req) => {
    report.network.push({ label, type: 'requestfailed', url: req.url(), method: req.method(), failure: req.failure()?.errorText });
  });
  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400) {
      report.network.push({ label, type: 'http-error', url, status, method: res.request().method() });
    }
    if (url.includes('/api/') && status < 500) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (/json|text/.test(ct)) {
          const body = (await res.text()).slice(0, 50000);
          const exposed = [];
          for (const m of [...markers.A, ...markers.B]) {
            if (body.includes(m)) exposed.push(m);
          }
          if (exposed.length) {
            report.piiFindings.push({ label, url, status, markers: exposed, sample: redacted(body).slice(0, 800) });
          }
        }
      } catch {
        /* response body already consumed or unavailable */
      }
    }
  });
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 8000 }).catch((e) => `[[BODY_READ_FAILED ${e.message}]]`);
}

async function clickText(page, text, exact = false) {
  const loc = page.getByText(text, { exact });
  await loc.click({ timeout: 10000 });
}

async function signUpMerchant(browser, key, storeName) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  attachCapture(page, key);
  const email = `codex-readiness-${key.toLowerCase()}-${Date.now()}@example.com`;
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await screenshot(page, `${key}-01-login`);
  await clickText(page, 'Request access', true);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[placeholder="Store name"]').fill(storeName);
  await page.locator('select').nth(0).selectOption('shopify');
  await page.locator('select').nth(1).selectOption('10k_50k');
  await page.locator('select').nth(2).selectOption('refund_abuse');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForTimeout(2500);
  const after = { url: page.url(), text: await bodyText(page) };
  report.accounts.push({ key, email, storeName, password, signupResult: after.url, signupText: after.text.slice(0, 500) });
  await screenshot(page, `${key}-02-after-signup`);
  return { key, email, storeName, context, page };
}

async function completeOnboarding(account) {
  const { page, key } = account;
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  report.routeChecks.push({ key, path: '/dashboard before onboarding', finalURL: page.url(), text: (await bodyText(page)).slice(0, 500) });
  await screenshot(page, `${key}-03-onboarding-gate`);
  if (page.url().includes('/onboarding')) {
    for (const label of ['Review flagged customers', 'Generate an evidence package', 'Set up chargeback integration', 'Invite a team member']) {
      await page.getByText(label, { exact: true }).click().catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.getByText('Upload your first audit', { exact: true }).click().catch(() => {});
    const selects = page.locator('select');
    if (await selects.count()) {
      await selects.nth(0).selectOption('shopify').catch(() => {});
      await selects.nth(1).selectOption('10k_50k').catch(() => {});
      await selects.nth(2).selectOption('refund_abuse').catch(() => {});
    }
    await page.getByRole('button', { name: 'Upload first audit' }).click();
    await page.waitForTimeout(2000);
  }
  await screenshot(page, `${key}-04-upload-empty`);
}

async function routeSweep(page, key, suffix = 'empty') {
  const routes = [
    '/dashboard', '/upload', '/history', '/reports', '/inbox', '/customers',
    '/watchlist', '/chargebacks', '/clusters', '/graph', '/lookup', '/global',
    '/evidence', '/saved', '/help', '/help/csv-export', '/help/identity-matching',
    '/settings/account', '/settings/team', '/settings/audit-trail',
  ];
  for (const route of routes) {
    const start = Date.now();
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(700);
    const text = await bodyText(page);
    report.routeChecks.push({
      key,
      route,
      suffix,
      finalURL: page.url(),
      ms: Date.now() - start,
      hasAccessDenied: /access denied|permission denied|unauthori[sz]ed/i.test(text),
      hasPlaceholder: /coming soon|placeholder|lorem|todo|not implemented/i.test(text),
      text: text.slice(0, 900),
    });
  }
  await screenshot(page, `${key}-routes-${suffix}`);
}

async function inspectStorage(page, key) {
  const data = await page.evaluate(() => {
    const ls = {};
    const ss = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ls[k] = localStorage.getItem(k)?.slice(0, 2000);
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      ss[k] = sessionStorage.getItem(k)?.slice(0, 2000);
    }
    return { localStorage: ls, sessionStorage: ss, cookieNames: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean) };
  });
  report.storage[key] = data;
}

async function uploadCsv(account, filename, options = {}) {
  const { page, key } = account;
  const filePath = path.join(csvDir, filename);
  const expected = options.expected || 'inspect';
  await page.goto(`${baseURL}/upload`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await page.waitForTimeout(1800);
  await screenshot(page, `${key}-upload-${filename.replace(/[^a-z0-9]+/gi, '-')}-selected`);
  let text = await bodyText(page);
  const csvResult = { key, filename, expected, selectedText: text.slice(0, 1200), result: 'not-run', runId: null, finalURL: page.url(), notes: '' };

  if (options.doRun) {
    const continueButton = page.getByRole('button', { name: 'Continue →' });
    if (await continueButton.isEnabled().catch(() => false)) {
      await continueButton.click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="upload-label"]').fill(options.label || `${key} audit ${filename}`).catch(() => {});
      await page.locator('[data-testid="date-range-start"]').fill('2026-05-01').catch(() => {});
      await page.locator('[data-testid="date-range-end"]').fill('2026-05-14').catch(() => {});
      await screenshot(page, `${key}-upload-${filename.replace(/[^a-z0-9]+/gi, '-')}-context`);
      await page.getByTestId('submit-upload').click();
      const deadline = Date.now() + (options.timeoutMs || 150000);
      let last = '';
      while (Date.now() < deadline) {
        await page.waitForTimeout(3000);
        last = await bodyText(page);
        const url = page.url();
        const match = url.match(/\/audit\/([0-9a-f-]{20,})/i);
        if (match) {
          csvResult.result = 'complete';
          csvResult.runId = match[1];
          csvResult.finalURL = url;
          csvResult.notes = last.slice(0, 1000);
          await screenshot(page, `${key}-upload-${filename.replace(/[^a-z0-9]+/gi, '-')}-complete`);
          break;
        }
        if (/could not|failed|error|duplicate|already uploaded|technical details/i.test(last)) {
          csvResult.result = /already uploaded/i.test(last) ? 'duplicate-warning' : 'error';
          csvResult.finalURL = url;
          csvResult.notes = last.slice(0, 1000);
          await screenshot(page, `${key}-upload-${filename.replace(/[^a-z0-9]+/gi, '-')}-error`);
          if (csvResult.result === 'error') break;
        }
      }
      if (csvResult.result === 'not-run') {
        csvResult.result = 'timeout';
        csvResult.notes = (await bodyText(page)).slice(0, 1200);
        await screenshot(page, `${key}-upload-${filename.replace(/[^a-z0-9]+/gi, '-')}-timeout`);
      }
    } else {
      csvResult.result = 'blocked-before-submit';
      csvResult.notes = text.slice(0, 1200);
    }
  } else {
    csvResult.result = /required field|unmapped|could not|empty|not look like|Please upload/i.test(text) ? 'validation-shown' : 'accepted-or-unclear';
    csvResult.notes = text.slice(0, 1200);
  }
  report.csvTests.push(csvResult);
  report.uploads.push(csvResult);
  return csvResult;
}

async function directFetch(page, pathOrURL) {
  return page.evaluate(async (u) => {
    const res = await fetch(u, { cache: 'no-store' });
    const text = await res.text();
    return { status: res.status, url: res.url, text: text.slice(0, 5000) };
  }, pathOrURL);
}

async function tenantIsolation(accountA, accountB, runA, runB) {
  const checks = [
    { actor: 'B', account: accountB, target: `/audit/${runA.runId}`, name: 'B visiting A audit page' },
    { actor: 'A', account: accountA, target: `/audit/${runB.runId}`, name: 'A visiting B audit page' },
    { actor: 'B', account: accountB, target: `/api/audit/${runA.runId}/progress`, name: 'B fetching A progress API' },
    { actor: 'A', account: accountA, target: `/api/audit/${runB.runId}/progress`, name: 'A fetching B progress API' },
  ];
  for (const check of checks) {
    if (!check.target.includes('null') && !check.target.includes('undefined')) {
      if (check.target.startsWith('/api/')) {
        const res = await directFetch(check.account.page, check.target);
        report.tenantChecks.push({ ...check, result: res.status, leakedA: markers.A.some((m) => res.text.includes(m)), leakedB: markers.B.some((m) => res.text.includes(m)), text: redacted(res.text).slice(0, 700) });
      } else {
        await check.account.page.goto(`${baseURL}${check.target}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await check.account.page.waitForTimeout(1000);
        const text = await bodyText(check.account.page);
        report.tenantChecks.push({ ...check, finalURL: check.account.page.url(), leakedA: markers.A.some((m) => text.includes(m)), leakedB: markers.B.some((m) => text.includes(m)), has404: /404|not found/i.test(text), hasDenied: /access denied|permission/i.test(text), text: text.slice(0, 1000) });
        await screenshot(check.account.page, `${check.actor}-tenant-${check.name.replace(/[^a-z0-9]+/gi, '-')}`);
      }
    }
  }
}

async function securityNegativeChecks(account) {
  const { page, key } = account;
  const paths = ['/api/inbox', '/api/watchlist', '/api/customers/search?q=UNA-A', '/api/lookup/remaining'];
  for (const p of paths) {
    const res = await directFetch(page, p);
    report.routeChecks.push({ key, route: p, suffix: 'api-authenticated', status: res.status, text: redacted(res.text).slice(0, 900) });
  }
}

async function accessibilitySmoke(page, key) {
  await page.goto(`${baseURL}/upload`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 18; i++) await page.keyboard.press('Tab');
  const active = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, text: el?.textContent?.slice(0, 120), aria: el?.getAttribute('aria-label'), outline: getComputedStyle(el).outlineStyle };
  });
  report.accessibility.push({ key, page: '/upload', activeAfterTabs: active });
}

async function mobileSmoke(account) {
  const context = await account.context.browser().newContext({ viewport: { width: 390, height: 844 }, storageState: await account.context.storageState() });
  const page = await context.newPage();
  attachCapture(page, `${account.key}-mobile`);
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await screenshot(page, `${account.key}-mobile-dashboard`, true);
  report.routeChecks.push({ key: account.key, route: '/dashboard', suffix: 'mobile', finalURL: page.url(), text: (await bodyText(page)).slice(0, 900) });
  await page.goto(`${baseURL}/upload`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await screenshot(page, `${account.key}-mobile-upload`, true);
  report.routeChecks.push({ key: account.key, route: '/upload', suffix: 'mobile', finalURL: page.url(), text: (await bodyText(page)).slice(0, 900) });
  await context.close();
}

async function loggedOutChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  attachCapture(page, 'logged-out');
  for (const route of ['/dashboard', '/upload', '/history', '/customers', '/settings/account', '/audit/00000000-0000-0000-0000-000000000000']) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(500);
    report.routeChecks.push({ key: 'logged-out', route, finalURL: page.url(), text: (await bodyText(page)).slice(0, 500) });
  }
  const api = await directFetch(page, '/api/watchlist');
  report.routeChecks.push({ key: 'logged-out', route: '/api/watchlist', status: api.status, text: api.text.slice(0, 500) });
  await context.close();
}

async function cleanupAccount(account) {
  const { page, key } = account;
  try {
    await page.goto(`${baseURL}/settings/account`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[placeholder="DELETE"]').fill('DELETE');
    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.waitForTimeout(4000);
    report.cleanup.push({ key, attempted: true, finalURL: page.url(), text: (await bodyText(page)).slice(0, 500) });
  } catch (error) {
    report.cleanup.push({ key, attempted: true, error: error.message });
  }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await loggedOutChecks(browser);

    const accountA = await signUpMerchant(browser, 'A', `Codex Audit A ${stamp.slice(0, 10)}`);
    await completeOnboarding(accountA);
    await routeSweep(accountA.page, 'A', 'empty');
    await inspectStorage(accountA.page, 'A-empty');

    const invalids = [
      'invalid-empty.csv',
      'not-really-csv.csv',
      'invalid-missing-required.csv',
      'invalid-headers-only.csv',
      'invalid-formula-script.csv',
      'messy-realistic.csv',
    ];
    for (const file of invalids) {
      await uploadCsv(accountA, file, { expected: 'validation only' });
    }

    const runA = await uploadCsv(accountA, 'merchant-a-valid.csv', { doRun: true, label: `Merchant A ${stamp}` });
    await routeSweep(accountA.page, 'A', 'after-valid-upload');
    await securityNegativeChecks(accountA);
    await accessibilitySmoke(accountA.page, 'A');
    await mobileSmoke(accountA);

    const accountB = await signUpMerchant(browser, 'B', `Codex Audit B ${stamp.slice(0, 10)}`);
    await completeOnboarding(accountB);
    const runB = await uploadCsv(accountB, 'merchant-b-valid.csv', { doRun: true, label: `Merchant B ${stamp}` });
    await routeSweep(accountB.page, 'B', 'after-valid-upload');
    await inspectStorage(accountB.page, 'B-after-upload');

    await tenantIsolation(accountA, accountB, runA, runB);

    await uploadCsv(accountA, 'merchant-a-valid.csv', { doRun: true, label: `Duplicate A ${stamp}`, timeoutMs: 45000 });
    await uploadCsv(accountA, 'guardrail-26-rows.csv', { doRun: true, label: `Guardrail A ${stamp}`, timeoutMs: 90000 });
    await inspectStorage(accountA.page, 'A-after-all');

    await cleanupAccount(accountB);
    await cleanupAccount(accountA);

    report.completedAt = new Date().toISOString();
  } finally {
    await browser.close();
    const file = path.join(outDir, 'readiness-audit-results.json');
    await fs.writeFile(file, JSON.stringify(report, null, 2));
    console.log(file);
  }
}

main().catch(async (error) => {
  report.fatal = { message: error.message, stack: error.stack };
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, 'readiness-audit-results.json');
  await fs.writeFile(file, JSON.stringify(report, null, 2));
  console.error(error);
  console.log(file);
  process.exit(1);
});
