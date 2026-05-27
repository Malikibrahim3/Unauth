/* eslint-disable */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const EVIDENCE_PATH = path.join(__dirname, 'evidence3.json');
const CSV = path.join(process.cwd(), 'tests/utils/csv-fixtures/standard.csv');
const CREDS = { email: 'audit-test@unauth-test.com', password: 'AuditTest2025!' };
const ev = { pages: [], steps: [], timings: [], errorsByRoute: {}, limitations: [] };
let cur = 'startup';
const logErr = (k, t) => { const b = (ev.errorsByRoute[cur] ||= []); const l = `[${k}] ${t}`; if (!b.includes(l)) b.push(l); };
async function shot(p, n) { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`), fullPage: true }); } catch { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`) }); } catch {} } return `${n}.png`; }
async function visit(p, name, route, sn) {
  cur = route; const s = Date.now(); let st = null, dom = null, idle = null;
  try { const r = await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 }); st = r ? r.status() : null; dom = Date.now() - s; await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); idle = Date.now() - s; }
  catch (e) { ev.limitations.push(`nav ${route}: ${e.message}`); }
  await p.waitForTimeout(500); const f = await shot(p, sn);
  ev.pages.push({ name, route, url: p.url(), status: st, dom, idle, screenshot: `screenshots/${f}` });
  console.log(`visited ${name} ${route} status=${st} dom=${dom} idle=${idle}`);
}
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('console', (m) => { if (m.type() === 'error') logErr('console error', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logErr('pageerror', String(e.message).slice(0, 300)));
  page.on('requestfailed', (r) => { const f = r.failure(); if (f && !/ERR_ABORTED/.test(f.errorText)) logErr('requestfailed', `${r.method()} ${r.url().slice(0,160)} — ${f.errorText}`); });
  page.on('response', (r) => { const s = r.status(), u = r.url(); if (s >= 400 && (u.includes('/api/') || u.includes('supabase'))) logErr(`network ${s}`, `${r.request().method()} ${u.slice(0,160)}`); });

  cur = '/login';
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/upload|\/onboarding/, { timeout: 30000 }).catch((e) => ev.limitations.push(`login: ${e.message}`));
  await page.waitForTimeout(1200);
  console.log('after login:', page.url());

  // skip onboarding if present
  if (/\/onboarding/.test(page.url())) {
    cur = '/onboarding';
    const skip = page.getByRole('button', { name: /^Skip/i });
    if (await skip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skip.click();
      await page.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      ev.steps.push({ step: 'skippedOnboarding', url: page.url() });
    }
  }

  // upload flow
  cur = '/upload';
  await page.goto(BASE + '/upload', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await shot(page, '40_upload_idle');
  try {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });
    await fileInput.setInputFiles(CSV);
    await page.locator('[data-testid="column-mapping"]').first().waitFor({ state: 'visible', timeout: 30000 });
    await shot(page, '41_upload_mapping');
    await page.getByRole('button', { name: /^Continue/i }).first().click();
    await page.locator('[data-testid="upload-context"]').waitFor({ state: 'visible', timeout: 15000 });
    await shot(page, '42_upload_context');
    await page.locator('[data-testid="upload-label"]').fill('ASOS audit run');
    await page.locator('[data-testid="date-range-start"]').fill('2026-01-01').catch(() => {});
    await page.locator('[data-testid="date-range-end"]').fill('2026-03-31').catch(() => {});
    const t0 = Date.now();
    await page.locator('[data-testid="submit-upload"]').first().click();
    await shot(page, '43_upload_processing');
    try {
      await page.waitForURL(/\/audit\/[^/]+$/, { timeout: 120000, waitUntil: 'commit' });
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      ev.timings.push({ action: 'uploadToResults', ms: Date.now() - t0 });
      ev.steps.push({ step: 'upload', resultUrl: page.url() });
      console.log('upload results:', page.url(), 'in', Date.now() - t0, 'ms');
    } catch (e) { ev.limitations.push(`upload->results: ${e.message}`); }
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await shot(page, '44_audit_results');
    cur = page.url().replace(BASE, '');
    const tabs = ['Customers', 'Transactions', 'Data quality'];
    for (const tname of tabs) {
      const t = page.getByRole('tab', { name: new RegExp(tname, 'i') });
      if (await t.isVisible({ timeout: 3000 }).catch(() => false)) {
        await t.click(); await page.waitForTimeout(1000);
        await shot(page, `45_results_${tname.replace(/\s+/g, '_').toLowerCase()}`);
      }
    }
  } catch (e) { ev.limitations.push(`upload flow: ${e.message}`); await shot(page, '43_upload_error'); }

  await visit(page, 'Dashboard (populated)', '/dashboard', '46_dashboard_populated');
  await visit(page, 'Customers (populated)', '/customers', '47_customers_populated');

  // find profile link
  cur = '/customers';
  let href = null;
  const cnt = await page.locator('a[href^="/customers/"]').count();
  for (let i = 0; i < cnt; i++) { const h = await page.locator('a[href^="/customers/"]').nth(i).getAttribute('href'); if (h && /\/customers\/[^/]+$/.test(h)) { href = h; break; } }
  if (!href) {
    // try clicking first table row to open drawer
    const row = page.locator('table tbody tr, [role="row"]').first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) { await row.click().catch(() => {}); await page.waitForTimeout(1000); await shot(page, '48_customer_drawer'); }
    ev.limitations.push('No /customers/[id] anchor; captured row/drawer instead.');
    // try to read href from current url if navigated
    if (/\/customers\/[^/]+$/.test(page.url())) href = page.url().replace(BASE, '');
  }
  if (href) {
    await visit(page, 'Customer profile', href, '48_customer_profile');
    await visit(page, 'Customer claims', href + '/claims', '49_claim_panel');
    cur = href + '/claims';
    try {
      const reason = page.getByPlaceholder('Customer claim reason');
      if (await reason.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reason.fill('Parcel never arrived; tracking shows delivered to a different address.');
        await page.getByPlaceholder('Internal merchant notes').fill('Audit: repeat INR claimant, prior chargeback on file.');
        await shot(page, '50_claim_filled');
        let t0 = Date.now();
        await page.getByRole('button', { name: /Save claim/i }).click(); await page.waitForTimeout(2500);
        ev.timings.push({ action: 'saveClaim', ms: Date.now() - t0 });
        await shot(page, '51_claim_saved');
        ev.steps.push({ step: 'saveClaim', snippet: ((await page.evaluate(() => document.body.innerText).catch(() => '')).match(/(saved|error|failed|unauthor|not found|created)[^\n]{0,90}/i) || ['(none)'])[0] });
        const sel = page.locator('select'); const sc = await sel.count();
        for (let i = 0; i < sc; i++) { const o = await sel.nth(i).locator('option').allTextContents(); if (o.includes('denied')) await sel.nth(i).selectOption('denied').catch(() => {}); if (o.includes('suspected_fraud')) await sel.nth(i).selectOption('suspected_fraud').catch(() => {}); }
        await shot(page, '52_outcome_selected');
        t0 = Date.now();
        await page.getByRole('button', { name: /Save outcome/i }).click(); await page.waitForTimeout(2500);
        ev.timings.push({ action: 'saveOutcome', ms: Date.now() - t0 });
        await shot(page, '53_outcome_saved');
        ev.steps.push({ step: 'saveOutcome', snippet: ((await page.evaluate(() => document.body.innerText).catch(() => '')).match(/(saved|error|failed|unauthor|not found)[^\n]{0,90}/i) || ['(none)'])[0] });
        const evUrl = page.getByPlaceholder('evidence url');
        if (await evUrl.isVisible({ timeout: 3000 }).catch(() => false)) { await evUrl.fill('https://tracking.example.com/AUDIT123'); t0 = Date.now(); await page.getByRole('button', { name: /Save evidence/i }).click(); await page.waitForTimeout(2500); ev.timings.push({ action: 'saveEvidence', ms: Date.now() - t0 }); await shot(page, '54_evidence_saved'); }
      } else ev.limitations.push('Claim reason field not visible on claims page.');
    } catch (e) { ev.limitations.push(`claim workflow: ${e.message}`); }
  }

  await visit(page, 'Inbox (populated)', '/inbox', '55_inbox_populated');
  await visit(page, 'Audit history (populated)', '/history', '56_history_populated');
  await visit(page, 'Reports (populated)', '/reports', '57_reports_populated');
  await visit(page, 'Watchlist', '/watchlist', '58_watchlist');
  await visit(page, 'Evidence packages', '/chargebacks', '59_chargebacks');

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2));
  console.log('\nDONE pages:', ev.pages.length, 'limitations:', ev.limitations.length, 'timings:', JSON.stringify(ev.timings));
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); try { fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2)); } catch {} process.exit(1); });
