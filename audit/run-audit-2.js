/* eslint-disable */
// Phase 2: real CSV upload -> populated customer/claim audits.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const EVIDENCE_PATH = path.join(__dirname, 'evidence2.json');
const CSV = path.join(process.cwd(), 'tests/utils/csv-fixtures/standard.csv');
const CREDS = { email: 'audit-test@unauth-test.com', password: 'AuditTest2025!' };

const evidence = { pages: [], steps: [], timings: [], errorsByRoute: {}, limitations: [] };
let currentRoute = 'startup';
function logErr(kind, text) {
  const b = (evidence.errorsByRoute[currentRoute] ||= []);
  const line = `[${kind}] ${text}`;
  if (!b.includes(line)) b.push(line);
}
async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }); }
  catch { try { await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) }); } catch {} }
  return `${name}.png`;
}
async function visit(page, name, route, sn) {
  currentRoute = route;
  const start = Date.now();
  let status = null, dom = null, idle = null;
  try {
    const r = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = r ? r.status() : null; dom = Date.now() - start;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    idle = Date.now() - start;
  } catch (e) { evidence.limitations.push(`nav ${route}: ${e.message}`); }
  await page.waitForTimeout(500);
  const f = await shot(page, sn);
  evidence.pages.push({ name, route, url: page.url(), status, dom, idle, screenshot: `screenshots/${f}` });
  console.log(`visited ${name} ${route} status=${status} dom=${dom} idle=${idle}`);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('console', (m) => { if (m.type() === 'error') logErr('console error', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logErr('pageerror', String(e.message).slice(0, 300)));
  page.on('requestfailed', (r) => { const f = r.failure(); if (f && !/ERR_ABORTED/.test(f.errorText)) logErr('requestfailed', `${r.method()} ${r.url().slice(0,160)} — ${f.errorText}`); });
  page.on('response', (r) => { const s = r.status(); const u = r.url(); if (s >= 400 && (u.includes('/api/') || u.includes('supabase'))) logErr(`network ${s}`, `${r.request().method()} ${u.slice(0,160)}`); });

  // login
  currentRoute = '/login';
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/upload|\/onboarding/, { timeout: 30000 }).catch((e) => evidence.limitations.push(`login redirect: ${e.message}`));
  await page.waitForTimeout(1000);
  console.log('after login:', page.url());

  // upload flow
  currentRoute = '/upload';
  await page.goto(BASE + '/upload', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);
  await shot(page, '40_upload_idle');
  try {
    await page.locator('input[type="file"]').setInputFiles(CSV);
    await page.locator('[data-testid="column-mapping"]').first().waitFor({ state: 'visible', timeout: 25000 });
    await shot(page, '41_upload_mapping');
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.locator('[data-testid="upload-context"]').waitFor({ state: 'visible', timeout: 15000 });
    await shot(page, '42_upload_context');
    await page.locator('[data-testid="upload-label"]').fill('ASOS audit run');
    await page.locator('[data-testid="date-range-start"]').fill('2026-01-01').catch(() => {});
    await page.locator('[data-testid="date-range-end"]').fill('2026-03-31').catch(() => {});
    const t0 = Date.now();
    await page.locator('[data-testid="submit-upload"]').first().click();
    await shot(page, '43_upload_processing');
    try {
      await page.waitForURL(/\/audit\/[^/]+$/, { timeout: 90000, waitUntil: 'commit' });
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      evidence.timings.push({ action: 'uploadToResults', ms: Date.now() - t0 });
      evidence.steps.push({ step: 'upload', resultUrl: page.url() });
    } catch (e) {
      evidence.limitations.push(`upload did not reach results: ${e.message}`);
    }
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await shot(page, '44_audit_results');
    currentRoute = page.url().replace(BASE, '');
    // customers tab on results
    const custTab = page.getByRole('tab', { name: /Customers/i });
    if (await custTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await custTab.click(); await page.waitForTimeout(1200);
      await shot(page, '45_results_customers_tab');
    }
  } catch (e) {
    evidence.limitations.push(`upload flow error: ${e.message}`);
    await shot(page, '43_upload_error');
  }

  // populated standard pages
  await visit(page, 'Dashboard (populated)', '/dashboard', '46_dashboard_populated');
  await visit(page, 'Customers (populated)', '/customers', '47_customers_populated');

  // drill into a customer profile
  currentRoute = '/customers';
  let profileHref = null;
  const cnt = await page.locator('a[href^="/customers/"]').count();
  for (let i = 0; i < cnt; i++) {
    const h = await page.locator('a[href^="/customers/"]').nth(i).getAttribute('href');
    if (h && /\/customers\/[^/]+$/.test(h)) { profileHref = h; break; }
  }
  if (!profileHref) {
    // maybe rows are buttons / open drawers; try clicking first row
    evidence.limitations.push('No /customers/[id] link found after upload; customers may render in a drawer.');
  } else {
    await visit(page, 'Customer profile', profileHref, '48_customer_profile');
    await visit(page, 'Customer claims', profileHref + '/claims', '49_claim_panel');
    // claim workflow
    currentRoute = profileHref + '/claims';
    try {
      const reason = page.getByPlaceholder('Customer claim reason');
      if (await reason.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reason.fill('Parcel never arrived; tracking shows delivered to a different address.');
        await page.getByPlaceholder('Internal merchant notes').fill('Audit: 3rd INR claim this quarter, prior chargeback on file.');
        await shot(page, '50_claim_filled');
        let t0 = Date.now();
        await page.getByRole('button', { name: /Save claim/i }).click();
        await page.waitForTimeout(2500);
        evidence.timings.push({ action: 'saveClaim', ms: Date.now() - t0 });
        await shot(page, '51_claim_saved');
        const msg1 = await page.evaluate(() => document.body.innerText).catch(() => '');
        evidence.steps.push({ step: 'saveClaim', snippet: (msg1.match(/(saved|error|failed|unauthor|not found)[^\n]{0,80}/i) || ['(no message)'])[0] });

        // outcome
        const selects = page.locator('select'); const sc = await selects.count();
        for (let i = 0; i < sc; i++) {
          const opts = await selects.nth(i).locator('option').allTextContents();
          if (opts.includes('denied')) await selects.nth(i).selectOption('denied').catch(() => {});
          if (opts.includes('suspected_fraud')) await selects.nth(i).selectOption('suspected_fraud').catch(() => {});
        }
        await shot(page, '52_outcome_selected');
        t0 = Date.now();
        await page.getByRole('button', { name: /Save outcome/i }).click();
        await page.waitForTimeout(2500);
        evidence.timings.push({ action: 'saveOutcome', ms: Date.now() - t0 });
        await shot(page, '53_outcome_saved');
        const msg2 = await page.evaluate(() => document.body.innerText).catch(() => '');
        evidence.steps.push({ step: 'saveOutcome', snippet: (msg2.match(/(saved|error|failed|unauthor|not found)[^\n]{0,80}/i) || ['(no message)'])[0] });

        // evidence
        const evUrl = page.getByPlaceholder('evidence url');
        if (await evUrl.isVisible({ timeout: 3000 }).catch(() => false)) {
          await evUrl.fill('https://tracking.example.com/AUDIT123');
          t0 = Date.now();
          await page.getByRole('button', { name: /Save evidence/i }).click();
          await page.waitForTimeout(2500);
          evidence.timings.push({ action: 'saveEvidence', ms: Date.now() - t0 });
          await shot(page, '54_evidence_saved');
        }
      } else {
        evidence.limitations.push('Claim reason field not visible on claims page even after upload.');
      }
    } catch (e) { evidence.limitations.push(`claim workflow error: ${e.message}`); }
  }

  // populated inbox/history/reports/watchlist/chargebacks/evidence
  await visit(page, 'Inbox (populated)', '/inbox', '55_inbox_populated');
  await visit(page, 'Audit history (populated)', '/history', '56_history_populated');
  await visit(page, 'Reports (populated)', '/reports', '57_reports_populated');
  await visit(page, 'Watchlist', '/watchlist', '58_watchlist_populated');
  await visit(page, 'Evidence packages', '/chargebacks', '59_chargebacks_populated');

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2));
  console.log('\nEVIDENCE2 WRITTEN. pages:', evidence.pages.length, 'limitations:', evidence.limitations.length);
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); try { fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2)); } catch {} process.exit(1); });
