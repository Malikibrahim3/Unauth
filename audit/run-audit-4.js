/* eslint-disable */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const EVIDENCE_PATH = path.join(__dirname, 'evidence4.json');
const PROFILE = '2f3d94f9-a537-4b1c-b37f-499f196d4745';
const CREDS = { email: 'audit-test@unauth-test.com', password: 'AuditTest2025!' };
const ev = { pages: [], steps: [], timings: [], errorsByRoute: {}, limitations: [] };
let cur = 'startup';
const logErr = (k, t) => { const b = (ev.errorsByRoute[cur] ||= []); const l = `[${k}] ${t}`; if (!b.includes(l)) b.push(l); };
async function shot(p, n) { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`), fullPage: true }); } catch { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`) }); } catch {} } return `${n}.png`; }
async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('console', (m) => { if (m.type() === 'error') logErr('console error', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logErr('pageerror', String(e.message).slice(0, 300)));
  page.on('response', (r) => { const s = r.status(), u = r.url(); if (s >= 400 && (u.includes('/api/') || u.includes('supabase'))) logErr(`network ${s}`, `${r.request().method()} ${u.slice(0,160)}`); });

  cur = '/login';
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/upload|\/onboarding/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  cur = `/customers/${PROFILE}`;
  const s = Date.now();
  await page.goto(BASE + `/customers/${PROFILE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  ev.timings.push({ action: 'customerProfileLoad', ms: Date.now() - s });
  await page.waitForTimeout(800);
  await shot(page, '48_customer_profile');
  ev.pages.push({ name: 'Customer profile', route: cur, url: page.url(), screenshot: 'screenshots/48_customer_profile.png' });

  cur = `/customers/${PROFILE}/claims`;
  await page.goto(BASE + `/customers/${PROFILE}/claims`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '49_claim_panel');
  ev.pages.push({ name: 'Claim review', route: cur, url: page.url(), screenshot: 'screenshots/49_claim_panel.png' });

  try {
    const reason = page.getByPlaceholder('Customer claim reason');
    if (await reason.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reason.fill('Parcel never arrived; tracking shows delivered to a different address.');
      await page.getByPlaceholder('Internal merchant notes').fill('Audit: repeat INR claimant, prior chargeback on file.');
      await shot(page, '50_claim_filled');
      let t0 = Date.now();
      await page.getByRole('button', { name: /Save claim/i }).click(); await page.waitForTimeout(3000);
      ev.timings.push({ action: 'saveClaim', ms: Date.now() - t0 });
      await shot(page, '51_claim_saved');
      ev.steps.push({ step: 'saveClaim', snippet: ((await page.evaluate(() => document.body.innerText).catch(() => '')).match(/(saved|error|failed|unauthor|not found|created|missing)[^\n]{0,100}/i) || ['(none)'])[0] });

      const sel = page.locator('select'); const sc = await sel.count();
      for (let i = 0; i < sc; i++) { const o = await sel.nth(i).locator('option').allTextContents(); if (o.includes('denied')) await sel.nth(i).selectOption('denied').catch(() => {}); if (o.includes('suspected_fraud')) await sel.nth(i).selectOption('suspected_fraud').catch(() => {}); }
      await shot(page, '52_outcome_selected');
      t0 = Date.now();
      await page.getByRole('button', { name: /Save outcome/i }).click(); await page.waitForTimeout(3000);
      ev.timings.push({ action: 'saveOutcome', ms: Date.now() - t0 });
      await shot(page, '53_outcome_saved');
      ev.steps.push({ step: 'saveOutcome', snippet: ((await page.evaluate(() => document.body.innerText).catch(() => '')).match(/(saved|error|failed|unauthor|not found)[^\n]{0,100}/i) || ['(none)'])[0] });

      const evUrl = page.getByPlaceholder('evidence url');
      if (await evUrl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await evUrl.fill('https://tracking.example.com/AUDIT123');
        const ev2 = page.getByPlaceholder('evidence hash'); await ev2.fill('sha256-auditdemo').catch(() => {});
        await shot(page, '53b_evidence_filled');
        t0 = Date.now();
        await page.getByRole('button', { name: /Save evidence/i }).click(); await page.waitForTimeout(3000);
        ev.timings.push({ action: 'saveEvidence', ms: Date.now() - t0 });
        await shot(page, '54_evidence_saved');
      }
      // reload to show claim history
      await page.goto(BASE + `/customers/${PROFILE}/claims`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, '55_claim_history');
    } else ev.limitations.push('Claim reason field not visible.');
  } catch (e) { ev.limitations.push(`claim workflow: ${e.message}`); }

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2));
  console.log('DONE. timings:', JSON.stringify(ev.timings), 'steps:', JSON.stringify(ev.steps), 'lim:', JSON.stringify(ev.limitations), 'errs:', JSON.stringify(ev.errorsByRoute));
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); try { fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2)); } catch {} process.exit(1); });
