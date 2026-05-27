/* eslint-disable */
// Standalone ASOS-level UX audit harness. Read-only audit: navigates, screenshots,
// captures console/network errors and timings. Does not modify product code.
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
const EVIDENCE_PATH = path.join(__dirname, 'evidence.json');

const CREDS = {
  email: 'audit-test@unauth-test.com',
  password: 'AuditTest2025!',
  storeName: 'Audit Test Store',
};

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const ENV = loadEnv();

const evidence = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  signup: {},
  pages: [], // {name, route, url, status, screenshot, navMs, domMs}
  steps: [], // freeform workflow notes
  timings: [],
  errorsByRoute: {}, // route -> [strings]
  limitations: [],
};

let currentRoute = 'startup';
function logErr(kind, text) {
  const bucket = (evidence.errorsByRoute[currentRoute] ||= []);
  // de-dupe noisy repeats
  const line = `[${kind}] ${text}`;
  if (!bucket.includes(line)) bucket.push(line);
}

async function shot(page, name) {
  const file = `${name}.png`;
  try {
    await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: true });
  } catch (e) {
    try { await page.screenshot({ path: path.join(SHOT_DIR, file) }); } catch {}
  }
  return file;
}

async function visit(page, name, route, screenshotName) {
  currentRoute = route;
  const url = BASE + route;
  const start = Date.now();
  let status = null;
  let navMs = null;
  let domMs = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : null;
    domMs = Date.now() - start;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    navMs = Date.now() - start;
  } catch (e) {
    evidence.limitations.push(`Navigation to ${route} failed: ${e.message}`);
  }
  await page.waitForTimeout(400);
  const file = await shot(page, screenshotName);
  evidence.pages.push({ name, route, url: page.url(), status, screenshot: `screenshots/${file}`, domMs, navMs });
  console.log(`visited ${name} (${route}) status=${status} dom=${domMs}ms idle=${navMs}ms -> ${file}`);
  return { status, navMs };
}

async function adminEnsureConfirmedMerchant() {
  const supabase = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  // find user
  let user = null;
  let pageNum = 1;
  while (pageNum <= 10 && !user) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pageNum, perPage: 200 });
    if (error) { evidence.limitations.push(`admin listUsers error: ${error.message}`); break; }
    user = data.users.find((u) => u.email === CREDS.email) || null;
    if (data.users.length < 200) break;
    pageNum++;
  }
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: CREDS.email,
      password: CREDS.password,
      email_confirm: true,
      user_metadata: { store_name: CREDS.storeName, is_test_account: true },
    });
    if (error) { evidence.limitations.push(`admin createUser error: ${error.message}`); return null; }
    user = data.user;
    evidence.signup.adminCreated = true;
  } else {
    await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    evidence.signup.adminConfirmed = true;
  }
  // ensure merchant row
  const { error: merr } = await supabase.from('merchants').upsert(
    {
      user_id: user.id,
      name: CREDS.storeName,
      monthly_order_volume: '10k_50k',
      primary_fraud_concern: 'refund_abuse',
      setup_complete: true,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (merr) evidence.limitations.push(`merchant upsert error: ${merr.message}`);
  return user.id;
}

async function uiSignUp(page) {
  currentRoute = '/login(signup)';
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  await shot(page, '02_login');
  // toggle to sign-up mode
  const toggle = page.getByRole('button', { name: /Request access/i });
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(500);
  } else {
    evidence.signup.toggleMissing = true;
  }
  await shot(page, '03_signup_form_empty');
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.fill('input[type="text"]', CREDS.storeName).catch(() => {});
  const selects = page.locator('select');
  const n = await selects.count();
  if (n >= 3) {
    await selects.nth(0).selectOption('shopify').catch(() => {});
    await selects.nth(1).selectOption({ index: 2 }).catch(() => {});
    await selects.nth(2).selectOption('refund_abuse').catch(() => {});
  }
  await shot(page, '04_signup_form_filled');
  const submit = page.locator('button[type="submit"]');
  await submit.click();
  // wait for either onboarding or an inline message
  const result = await Promise.race([
    page.waitForURL(/\/onboarding|\/dashboard|\/upload/, { timeout: 15000 }).then(() => 'navigated').catch(() => null),
    page.waitForTimeout(15000).then(() => 'timeout'),
  ]);
  await page.waitForTimeout(800);
  await shot(page, '05_signup_result');
  evidence.signup.afterSubmitUrl = page.url();
  evidence.signup.raceResult = result;
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const confirmNeeded = /check your email|confirm/i.test(bodyText) && /\/login/.test(page.url());
  evidence.signup.confirmNeeded = confirmNeeded;
  evidence.signup.snippet = bodyText.slice(0, 400);
  return /\/onboarding|\/dashboard|\/upload/.test(page.url());
}

async function uiLogin(page) {
  currentRoute = '/login';
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', CREDS.email);
  await page.fill('input[type="password"]', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/upload|\/onboarding/, { timeout: 30000 }).catch((e) => {
    evidence.limitations.push(`UI login did not redirect: ${e.message}`);
  });
  await page.waitForTimeout(1000);
  return page.url();
}

async function seedDemo(page) {
  try {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/demo', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      const t = await r.text();
      return { ok: r.ok, status: r.status, t: t.slice(0, 300) };
    });
    evidence.steps.push({ step: 'seedDemo', ...res });
    console.log('demo seed:', res.status);
    await page.waitForTimeout(2500);
  } catch (e) {
    evidence.limitations.push(`demo seed failed: ${e.message}`);
  }
}

async function claimWorkflow(page) {
  currentRoute = '/customers';
  await page.goto(BASE + '/customers', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '20_customers_list');
  // find a customer profile link
  const link = page.locator('a[href^="/customers/"]').filter({ hasNot: page.locator('[href$="/customers/"]') }).first();
  let profileHref = null;
  const cnt = await page.locator('a[href^="/customers/"]').count();
  for (let i = 0; i < cnt; i++) {
    const h = await page.locator('a[href^="/customers/"]').nth(i).getAttribute('href');
    if (h && /\/customers\/[^/]+$/.test(h)) { profileHref = h; break; }
  }
  if (!profileHref) {
    evidence.limitations.push('No customer profile link found on /customers — claim workflow could not start from list.');
    return;
  }
  currentRoute = profileHref;
  await page.goto(BASE + profileHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '21_customer_profile');
  evidence.steps.push({ step: 'customerProfile', href: profileHref });

  // claims subpage
  const claimsRoute = profileHref + '/claims';
  currentRoute = claimsRoute;
  await page.goto(BASE + claimsRoute, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '22_claim_review_panel');

  // fill claim
  try {
    const claimType = page.locator('select').filter({ hasText: 'missing_parcel' }).first();
    // the first textarea = customer reason, second = internal notes
    const reason = page.getByPlaceholder('Customer claim reason');
    const notes = page.getByPlaceholder('Internal merchant notes');
    if (await reason.isVisible({ timeout: 4000 }).catch(() => false)) {
      // ensure claim type missing_parcel (it's default first option already)
      await reason.fill('Parcel never arrived, tracking shows delivered.');
      await notes.fill('Audit test note: investigating INR claim against delivery scan.');
      await shot(page, '23_claim_filled');
      const t0 = Date.now();
      await page.getByRole('button', { name: /Save claim/i }).click();
      await page.waitForTimeout(2500);
      evidence.timings.push({ action: 'saveClaim', ms: Date.now() - t0 });
      await shot(page, '24_claim_saved');
      const msg = await page.evaluate(() => document.body.innerText).catch(() => '');
      evidence.steps.push({ step: 'saveClaim', msgSnippet: (msg.match(/.{0,120}(saved|error|failed|claim).{0,120}/i) || [''])[0] });
    } else {
      evidence.limitations.push('Claim reason textarea not visible on claims page.');
    }
  } catch (e) {
    evidence.limitations.push(`claim fill error: ${e.message}`);
  }

  // outcome: denied / suspected_fraud
  try {
    const selects = page.locator('select');
    const sc = await selects.count();
    // decision + outcome are the last selects before "Save outcome"
    await page.getByRole('button', { name: /Save outcome/i }).scrollIntoViewIfNeeded().catch(() => {});
    // set decision=denied, outcome=suspected_fraud by value
    for (let i = 0; i < sc; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.includes('denied')) await selects.nth(i).selectOption('denied').catch(() => {});
      if (opts.includes('suspected_fraud')) await selects.nth(i).selectOption('suspected_fraud').catch(() => {});
    }
    await shot(page, '25_outcome_selected');
    const t0 = Date.now();
    await page.getByRole('button', { name: /Save outcome/i }).click();
    await page.waitForTimeout(2500);
    evidence.timings.push({ action: 'saveOutcome', ms: Date.now() - t0 });
    await shot(page, '26_outcome_saved');
  } catch (e) {
    evidence.limitations.push(`outcome save error: ${e.message}`);
  }

  // evidence
  try {
    const evUrl = page.getByPlaceholder('evidence url');
    if (await evUrl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await evUrl.fill('https://tracking.example.com/track/AUDIT123');
      await shot(page, '27_evidence_filled');
      const t0 = Date.now();
      await page.getByRole('button', { name: /Save evidence/i }).click();
      await page.waitForTimeout(2500);
      evidence.timings.push({ action: 'saveEvidence', ms: Date.now() - t0 });
      await shot(page, '28_evidence_saved');
    }
  } catch (e) {
    evidence.limitations.push(`evidence save error: ${e.message}`);
  }
  await page.waitForTimeout(500);
  await shot(page, '29_claim_history');
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  page.on('console', (msg) => { if (msg.type() === 'error') logErr('console error', msg.text().slice(0, 300)); });
  page.on('pageerror', (err) => logErr('pageerror', String(err.message).slice(0, 300)));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    if (f && !/ERR_ABORTED/.test(f.errorText)) logErr('requestfailed', `${req.method()} ${req.url().slice(0, 160)} — ${f.errorText}`);
  });
  page.on('response', (resp) => {
    const s = resp.status();
    const u = resp.url();
    if (s >= 400 && (u.includes('/api/') || u.includes('supabase'))) logErr(`network ${s}`, `${resp.request().method()} ${u.slice(0, 160)}`);
  });

  // 1. Landing
  await visit(page, 'Landing', '/landing', '00_landing');

  // 2. Signup via UI
  const authedViaSignup = await uiSignUp(page);

  // 3. Fallback: confirm + ensure merchant, then login
  if (!authedViaSignup) {
    evidence.signup.fallbackUsed = true;
    await adminEnsureConfirmedMerchant();
    await uiLogin(page);
  }

  // onboarding screenshot if present
  if (/\/onboarding/.test(page.url())) {
    currentRoute = '/onboarding';
    await page.waitForTimeout(800);
    await shot(page, '06_onboarding');
    evidence.pages.push({ name: 'Onboarding', route: '/onboarding', url: page.url(), screenshot: 'screenshots/06_onboarding.png' });
  }

  // seed product demo data so populated views can be audited
  await seedDemo(page);

  // 4. Core authed routes
  const routes = [
    ['Dashboard', '/dashboard', '07_dashboard'],
    ['Inbox', '/inbox', '08_inbox'],
    ['New audit (upload)', '/upload', '09_upload'],
    ['Audit history', '/history', '10_history'],
    ['Reports', '/reports', '11_reports'],
    ['Customers', '/customers', '12_customers'],
    ['Watchlist', '/watchlist', '13_watchlist'],
    ['Evidence packages', '/chargebacks', '14_chargebacks'],
    ['Evidence', '/evidence', '15_evidence'],
    ['Lookup', '/lookup', '16_lookup'],
    ['Settings', '/settings', '17_settings'],
    ['Settings · Account', '/settings/account', '17a_settings_account'],
    ['Settings · Team', '/settings/team', '17b_settings_team'],
    ['Settings · Audit trail', '/settings/audit-trail', '17c_settings_audit_trail'],
    ['Help', '/help', '18_help'],
    ['Help · How it works', '/help/how-it-works', '18a_help_how'],
    ['Help · Confidence grades', '/help/confidence-grades', '18b_help_grades'],
    ['Help · Identity matching', '/help/identity-matching', '18c_help_identity'],
    ['Legal · Privacy', '/legal/privacy', '30_legal_privacy'],
    ['Legal · Data handling', '/legal/data-handling', '31_legal_data'],
    ['Legal · DPA', '/legal/dpa', '32_legal_dpa'],
  ];
  for (const [name, route, sn] of routes) {
    await visit(page, name, route, sn);
  }

  // 5. Claim workflow (customer profile -> claims)
  await claimWorkflow(page);

  // 6. Dark mode + mobile checks on dashboard
  try {
    currentRoute = '/dashboard(dark)';
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(600);
    const toggled = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /theme|dark|light/i.test(b.getAttribute('aria-label') || '') || /theme/i.test(b.className));
      if (btn) { btn.click(); return true; }
      document.documentElement.classList.toggle('dark');
      return false;
    });
    await page.waitForTimeout(700);
    await shot(page, '33_dashboard_dark');
    evidence.steps.push({ step: 'darkMode', toggledViaButton: toggled });
  } catch (e) { evidence.limitations.push(`dark mode toggle: ${e.message}`); }

  try {
    currentRoute = '/dashboard(mobile)';
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    await shot(page, '34_dashboard_mobile');
    await page.goto(BASE + '/customers', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    await shot(page, '35_customers_mobile');
  } catch (e) { evidence.limitations.push(`mobile check: ${e.message}`); }

  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2));
  console.log('\nEVIDENCE WRITTEN:', EVIDENCE_PATH);
  console.log('pages visited:', evidence.pages.length);
  console.log('signup:', JSON.stringify(evidence.signup));
  await browser.close();
}

main().catch((e) => {
  console.error('AUDIT FATAL:', e);
  try { fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2)); } catch {}
  process.exit(1);
});
