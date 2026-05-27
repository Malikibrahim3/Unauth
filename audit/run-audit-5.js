/* eslint-disable */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const EVIDENCE_PATH = path.join(__dirname, 'evidence5.json');
const CREDS = { email: 'audit-test@unauth-test.com', password: 'AuditTest2025!' };
const ev = { pages: [], errorsByRoute: {}, limitations: [] };
let cur = 'startup';
const logErr = (k, t) => { const b = (ev.errorsByRoute[cur] ||= []); const l = `[${k}] ${t}`; if (!b.includes(l)) b.push(l); };
async function shot(p, n) { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`), fullPage: true }); } catch { try { await p.screenshot({ path: path.join(SHOT_DIR, `${n}.png`) }); } catch {} } return `${n}.png`; }
async function visit(p, name, route, sn) {
  cur = route; const s = Date.now(); let st = null, dom = null, idle = null;
  try { const r = await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 }); st = r ? r.status() : null; dom = Date.now() - s; await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); idle = Date.now() - s; }
  catch (e) { ev.limitations.push(`nav ${route}: ${e.message}`); }
  await p.waitForTimeout(500); const f = await shot(p, sn);
  ev.pages.push({ name, route, url: p.url(), status: st, dom, idle, screenshot: `screenshots/${f}` });
  console.log(`visited ${name} ${route} status=${st} dom=${dom} idle=${idle} url=${p.url()}`);
}
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
  console.log('after login:', page.url());

  const routes = [
    ['Settings', '/settings', '17_settings'],
    ['Settings · Account', '/settings/account', '17a_settings_account'],
    ['Settings · Team', '/settings/team', '17b_settings_team'],
    ['Settings · Audit trail', '/settings/audit-trail', '17c_settings_audit_trail'],
    ['Evidence', '/evidence', '15_evidence'],
    ['Lookup', '/lookup', '16_lookup'],
    ['Help', '/help', '18_help'],
    ['Help · How it works', '/help/how-it-works', '18a_help_how'],
    ['Help · Confidence grades', '/help/confidence-grades', '18b_help_grades'],
    ['Help · Identity matching', '/help/identity-matching', '18c_help_identity'],
    ['Reports', '/reports', '11_reports'],
    ['Audit history', '/history', '10_history'],
  ];
  for (const [n, r, s] of routes) await visit(page, n, r, s);

  // dark mode
  try {
    cur = '/dashboard(dark)';
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    const toggled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => /theme|dark|light|toggle/i.test((x.getAttribute('aria-label') || '') + ' ' + x.className));
      if (b) { b.click(); return true; }
      return false;
    });
    await page.waitForTimeout(900);
    await shot(page, '33_dashboard_dark');
    ev.pages.push({ name: 'Dashboard dark', route: '/dashboard', toggled, screenshot: 'screenshots/33_dashboard_dark.png' });
  } catch (e) { ev.limitations.push(`dark: ${e.message}`); }

  // mobile
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    cur = '/dashboard(mobile)';
    await page.goto(BASE + '/mobile-unsupported', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '36_mobile_unsupported');
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    await shot(page, '34_dashboard_mobile');
    await page.goto(BASE + '/customers', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    await shot(page, '35_customers_mobile');
  } catch (e) { ev.limitations.push(`mobile: ${e.message}`); }

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2));
  console.log('DONE pages:', ev.pages.length, 'errs:', JSON.stringify(ev.errorsByRoute));
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); try { fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(ev, null, 2)); } catch {} process.exit(1); });
