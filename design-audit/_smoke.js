/* eslint-disable */
// Smoke test: validate Playwright + login + onboarding-bypass + data render.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const CREDS = { email: 'simulation@unauth-test.com', password: 'SimTest2025!' };

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/upload|\/onboarding|\/inbox/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const afterLogin = page.url();

  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT_DIR, '_smoke_dashboard.png'), fullPage: true });
  const dashUrl = page.url();
  const bodyLen = (await page.evaluate(() => document.body.innerText).catch(() => '')).length;

  await page.goto(BASE + '/claims', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const claimsText = await page.evaluate(() => document.body.innerText).catch(() => '');
  await page.screenshot({ path: path.join(SHOT_DIR, '_smoke_claims.png'), fullPage: true });

  console.log(JSON.stringify({
    afterLogin, dashUrl, dashBodyLen: bodyLen,
    claimsHasPriya: /Priya|Reginald|missing|claim/i.test(claimsText),
    claimsTextSample: claimsText.replace(/\s+/g, ' ').slice(0, 300),
    consoleErrors: consoleErrors.slice(0, 8),
  }, null, 2));
  await browser.close();
})().catch((e) => { console.error('SMOKE FATAL:', e.message); process.exit(1); });
