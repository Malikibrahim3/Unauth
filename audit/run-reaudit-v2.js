// Targeted Re-Audit v2 — Playwright (Node.js)
// Full-auth run with proper login flow

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SS_DIR = path.join(__dirname, 'screenshots/reaudit');
const EMAIL = 'reaudit-test@unauth-test.com';
const PASSWORD = 'ReauditTest2025!';

// ── Error capture ──────────────────────────────────────────────────────────
const errors = {};
let route = '/';
function logErr(type, msg) {
  (errors[route] = errors[route] || []).push({ type, msg });
}

// ── Screenshot ─────────────────────────────────────────────────────────────
let ssIdx = 1;
async function ss(page, name) {
  const file = `r${String(ssIdx).padStart(2,'0')}_${name}.png`;
  await page.screenshot({ path: path.join(SS_DIR, file), fullPage: true });
  console.log(`  📸 ${file}`);
  ssIdx++;
  return file;
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function getText(page) { return page.evaluate(() => document.body.innerText); }
async function getLinks(page) {
  return page.$$eval('a', els => els.map(a => ({ href: a.getAttribute('href') || '', text: a.innerText.trim() })));
}

async function main() {
  fs.mkdirSync(SS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Error instrumentation
  page.on('console', m => { if (m.type() === 'error') logErr('console', m.text()); });
  page.on('pageerror', e => logErr('pageerror', e.message));
  page.on('requestfailed', r => logErr('reqfailed', `${r.url()} — ${r.failure()?.errorText}`));
  const apiErrors = [];
  page.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      apiErrors.push({ route, status: r.status(), url: r.url() });
      logErr('api', `${r.status()} ${r.url()}`);
    }
  });

  const R = {}; // Results accumulator

  // ══════════════════════════════════════════════════════════════════════════
  // AREA 2 — ONBOARDING: signup surface check first (logged-out)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══ AREA 2: MERCHANT ONBOARDING (logged-out checks) ══');

  // Check landing
  route = '/';
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  R.landingFinalUrl = page.url().replace(BASE_URL, '') || '/';
  await ss(page, 'landing_page');

  // Check /signup redirect
  route = '/signup';
  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  R.signupFinalUrl = page.url().replace(BASE_URL, '');
  R.signupRedirectsToLogin = page.url().includes('/login');
  R.signupHasSignupParam = page.url().includes('signup=1');
  await ss(page, 'signup_redirect_check');

  // Check /login page for toggle and work-email copy
  route = '/login';
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const loginText = await getText(page);
  R.loginHasCreateAccountToggle = loginText.toLowerCase().includes('create account');
  R.loginHasRequestAccess = loginText.toLowerCase().includes('request access');
  await ss(page, 'login_page_default');

  // Click "Create account" toggle to show signup form
  try {
    await page.getByText('Create account', { exact: false }).last().click();
    await page.waitForTimeout(500);
    const signupText = await getText(page);
    R.workEmailCopyVisible = signupText.toLowerCase().includes('work email') || signupText.toLowerCase().includes('personal email');
    R.signupFormShowsStoreFields = signupText.toLowerCase().includes('store name') || signupText.toLowerCase().includes('platform');
    await ss(page, 'signup_form_expanded');
  } catch (e) {
    R.signupToggleError = e.message;
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────
  console.log('\n  Attempting login...');
  route = '/login';
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Fill email and password for login (not signup mode)
  await page.fill('input[type="email"]', EMAIL).catch(() => {});
  await page.fill('input[type="password"]', PASSWORD).catch(() => {});
  await page.waitForTimeout(300);

  // Submit login
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(3000);

  let loggedIn = !page.url().includes('/login') && !page.url().includes('/signup');

  // Handle onboarding redirect
  if (page.url().includes('/onboarding')) {
    console.log('  → Onboarding redirect, completing...');
    // The onboarding page - try to complete it
    await ss(page, 'onboarding_page');
    const onboardingText = await getText(page);
    R.onboardingRedirect = true;

    // Try clicking any "continue" or "skip" button
    const btns = await page.$$('button');
    for (const btn of btns) {
      const t = await btn.innerText().catch(() => '');
      if (/continue|skip|next|complete|get started/i.test(t)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1500);
        break;
      }
    }

    // Try clicking any upload/dashboard link
    const links = await page.$$('a');
    for (const link of links) {
      const t = await link.innerText().catch(() => '');
      const h = await link.getAttribute('href').catch(() => '');
      if (/dashboard|upload|skip/i.test(t) || /dashboard|upload/i.test(h)) {
        await link.click().catch(() => {});
        await page.waitForTimeout(1500);
        break;
      }
    }
    loggedIn = !page.url().includes('/login');
  }

  // If login failed, try signup
  if (!loggedIn) {
    console.log('  → Login failed, attempting signup...');
    route = '/login';
    await page.goto(`${BASE_URL}/login?signup=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Toggle to signup mode if not already
    try {
      const txt = await getText(page);
      if (!txt.toLowerCase().includes('store name')) {
        await page.getByText('Create account', { exact: false }).last().click();
        await page.waitForTimeout(500);
      }
    } catch(e) {}

    await page.fill('input[type="email"]', EMAIL).catch(() => {});
    await page.fill('input[type="password"]', PASSWORD).catch(() => {});

    // Fill store name
    const storeNameInput = await page.$('input[placeholder="Store name"], input[type="text"]');
    if (storeNameInput) await storeNameInput.fill('Reaudit Test Store').catch(() => {});

    // Fill platform select
    const selects = await page.$$('select');
    if (selects[0]) await selects[0].selectOption('shopify').catch(() => {});
    if (selects[1]) await selects[1].selectOption({ index: 1 }).catch(() => {});
    if (selects[2]) await selects[2].selectOption({ index: 1 }).catch(() => {});

    await page.waitForTimeout(400);
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(4000);
    loggedIn = !page.url().includes('/login') && !page.url().includes('/signup');
  }

  R.loggedIn = loggedIn;
  R.postLoginUrl = page.url().replace(BASE_URL, '');
  console.log(`  Login: ${loggedIn ? '✓ SUCCESS' : '✗ FAILED'} → ${R.postLoginUrl}`);

  if (loggedIn) {
    await ss(page, 'post_login_destination');
  }

  // If we're on onboarding, try to navigate away
  if (page.url().includes('/onboarding')) {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    if (page.url().includes('/login') || page.url().includes('/onboarding')) {
      R.blockedByOnboarding = true;
    }
  }

  // ── Demo API test ──────────────────────────────────────────────────────
  route = '/api/demo';
  try {
    const resp = await page.request.post(`${BASE_URL}/api/demo`);
    R.demoStatus = resp.status();
    const body = await resp.text().catch(() => '');
    R.demoBody = body.slice(0, 200);
    console.log(`  /api/demo → HTTP ${R.demoStatus}: ${R.demoBody.slice(0,100)}`);
  } catch(e) { R.demoError = e.message; }

  // Try clicking sample data button in UI
  route = '/dashboard';
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  const dashText = await getText(page).catch(() => '');
  R.dashboardReachable = !page.url().includes('/login') && !page.url().includes('/onboarding');
  R.dashboardHasSparseOverlay = /upload|get started|no orders|sample/i.test(dashText);
  await ss(page, 'dashboard_state');

  // Look for sample data / demo buttons
  const allBtns = await page.$$('button, a');
  let sampleClicked = false;
  for (const btn of allBtns) {
    const t = await btn.innerText().catch(() => '');
    if (/sample data|demo data|try sample|load sample/i.test(t)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(2000);
      sampleClicked = true;
      R.sampleDataButtonFound = true;
      await ss(page, 'after_sample_data_click');
      break;
    }
  }
  if (!sampleClicked) R.sampleDataButtonFound = false;

  // ══════════════════════════════════════════════════════════════════════════
  // AREA 3 — SHOPIFY SYNC VISIBILITY
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══ AREA 3: SHOPIFY SYNC VISIBILITY ══');
  route = '/settings/integrations';
  await page.goto(`${BASE_URL}/settings/integrations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // allow SyncStatusCard fetch
  const intUrl = page.url();
  R.integrationsUrl = intUrl.replace(BASE_URL, '');
  R.integrationsAccessible = !intUrl.includes('/login');
  await ss(page, 'settings_integrations_full');

  // Wait for the card to load (it's client-side fetched)
  await page.waitForTimeout(800);
  await ss(page, 'settings_integrations_loaded');
  const intText = await getText(page);
  R.syncCardPresent = /shopify/i.test(intText);
  R.syncCardShowsNotConnected = /not connected/i.test(intText);
  R.syncCardHasConnectCTA = /connect shopify/i.test(intText);
  R.syncCardExplainsValue = /orders|claim workflow|webhook|identity/i.test(intText);
  R.integrationsHasBackLink = /← settings|settings/i.test(intText);
  R.integrationsPageTitle = /integrations/i.test(intText);
  console.log(`  Sync card: present=${R.syncCardPresent}, not-connected=${R.syncCardShowsNotConnected}, CTA=${R.syncCardHasConnectCTA}`);

  // Check header pill (navigate somewhere that shows the header)
  route = '/customers';
  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const headerHTML = await page.evaluate(() => document.querySelector('header')?.innerHTML || '');
  R.headerPillVisible = /shopify/i.test(headerHTML);
  R.headerPillLinksToIntegrations = headerHTML.includes('/settings/integrations');
  R.headerPillText = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('header a'));
    return links.filter(a => /shopify/i.test(a.textContent || '')).map(a => a.textContent?.trim()).join(' | ');
  });
  await ss(page, 'header_shopify_pill');
  console.log(`  Header pill: visible=${R.headerPillVisible}, text="${R.headerPillText}"`);

  // ══════════════════════════════════════════════════════════════════════════
  // AREA 1 — CLAIM REVIEW WORKFLOW
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══ AREA 1: CLAIM REVIEW WORKFLOW ══');
  const CF = {
    navigatedToCustomer: false, claimPanelOpens: false, rawEnumVisible: false,
    longFloatVisible: false, orderPickerWorks: false, saveSucceeds: false,
    saveHttpStatus: null, outcomeCanSet: false, evidenceLabelled: false,
    hashHidden: false, historyUpdates: false, loadingVisible: false,
    buttonsDisabledBeforeSave: false, humanReadableLabels: false, formInlineValidation: false,
  };

  route = '/customers';
  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'customers_list');

  const custText = await getText(page);
  const custLinks = await page.$$('a[href*="/customers/"]');
  console.log(`  Found ${custLinks.length} customer link(s)`);

  if (custLinks.length > 0) {
    // Navigate to first customer
    const firstHref = await custLinks[0].getAttribute('href');
    R.firstCustomerId = firstHref?.split('/customers/')[1]?.split('/')[0];
    route = firstHref;
    await page.goto(`${BASE_URL}${firstHref}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    CF.navigatedToCustomer = true;
    await ss(page, 'customer_profile_full');

    const profileText = await getText(page);
    // Check for bad data formats
    CF.longFloatVisible = /\d+\.\d{6,}/.test(profileText);
    CF.rawEnumVisible = /post_delivery_claim_rate|postDeliveryClaimRate|missing_parcel(?!\s*:)/i.test(profileText);
    console.log(`  Raw enum: ${CF.rawEnumVisible}, Long float: ${CF.longFloatVisible}`);

    // Navigate to claims tab
    const claimsTabLinks = await page.$$('a[href*="/claims"]');
    let claimsTabClicked = false;
    for (const link of claimsTabLinks) {
      const txt = await link.innerText().catch(() => '');
      const href = await link.getAttribute('href').catch(() => '');
      if (/claim/i.test(txt) || href?.includes(`/customers/${R.firstCustomerId}/claims`)) {
        await link.click();
        await page.waitForTimeout(1200);
        claimsTabClicked = true;
        break;
      }
    }

    if (!claimsTabClicked) {
      // Try tabs/buttons
      const tabs = await page.$$('[role="tab"], button');
      for (const tab of tabs) {
        const txt = await tab.innerText().catch(() => '');
        if (/claim/i.test(txt)) {
          await tab.click();
          await page.waitForTimeout(800);
          claimsTabClicked = true;
          break;
        }
      }
    }

    if (!claimsTabClicked && R.firstCustomerId) {
      await page.goto(`${BASE_URL}/customers/${R.firstCustomerId}/claims`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
    }

    route = `/customers/${R.firstCustomerId}/claims`;
    await ss(page, 'claim_panel_initial');

    const claimPanelText = await getText(page);
    CF.claimPanelOpens = /claim/i.test(claimPanelText) && !page.url().includes('/login');
    CF.humanReadableLabels = !/missing_parcel|post_delivery_claim_rate/.test(claimPanelText);

    // Check disabled buttons (before any claim exists)
    const disabledBtns = await page.$$('button[disabled]');
    CF.buttonsDisabledBeforeSave = disabledBtns.length > 0;

    // ── Fill claim form ──────────────────────────────────────────────
    // Select claim type
    let claimTypeSet = false;
    const selects = await page.$$('select');
    for (const sel of selects) {
      const id = await sel.getAttribute('id').catch(() => '');
      const name = await sel.getAttribute('name').catch(() => '');
      const opts = await sel.$$eval('option', os => os.map(o => o.textContent?.trim()));
      if (/type|claim_type|claimType/i.test(id + name) || opts.some(o => /parcel|missing|damaged/i.test(o || ''))) {
        try { await sel.selectOption({ label: 'Missing parcel' }); claimTypeSet = true; } catch {
          try { await sel.selectOption({ index: 1 }); claimTypeSet = true; } catch {}
        }
        break;
      }
    }

    // Select order reference
    let orderSet = false;
    for (const sel of selects) {
      const name = await sel.getAttribute('name').catch(() => '');
      const id = await sel.getAttribute('id').catch(() => '');
      const placeholder = await sel.getAttribute('placeholder').catch(() => '');
      const opts = await sel.$$eval('option', os => os.map(o => o.textContent?.trim()));
      if (/order/i.test(id + name + (placeholder || '')) || opts.some(o => /order|#/i.test(o || ''))) {
        try {
          await sel.selectOption({ index: 1 });
          CF.orderPickerWorks = true;
          orderSet = true;
        } catch {}
        break;
      }
    }

    // Try text inputs for order ref
    if (!orderSet) {
      const orderInputs = await page.$$('input[placeholder*="rder"], input[name*="rder"]');
      for (const inp of orderInputs) {
        await inp.fill('#TEST-001').catch(() => {});
        CF.orderPickerWorks = true;
        break;
      }
    }

    // Fill customer reason
    const allTextareas = await page.$$('textarea');
    for (const ta of allTextareas) {
      const name = await ta.getAttribute('name').catch(() => '');
      const placeholder = await ta.getAttribute('placeholder').catch(() => '');
      if (/reason|customer/i.test(name + placeholder)) {
        await ta.fill('Customer states parcel was not delivered — reaudit test').catch(() => {});
        break;
      }
    }
    // Fill first textarea if still empty
    if (allTextareas.length > 0) {
      const val = await allTextareas[0].inputValue().catch(() => '');
      if (!val) await allTextareas[0].fill('Customer reason: parcel not received').catch(() => {});
    }

    // Fill internal notes
    for (const ta of allTextareas) {
      const name = await ta.getAttribute('name').catch(() => '');
      const placeholder = await ta.getAttribute('placeholder').catch(() => '');
      if (/note|internal/i.test(name + placeholder)) {
        await ta.fill('Internal: re-audit test note').catch(() => {});
        break;
      }
    }
    if (allTextareas.length > 1) {
      const val = await allTextareas[1].inputValue().catch(() => '');
      if (!val) await allTextareas[1].fill('Internal: re-audit test note').catch(() => {});
    }

    await ss(page, 'claim_panel_filled');

    // Listen for save API calls
    const saveResponses = [];
    const saveHandler = (r) => {
      if (r.url().includes('/api/') && ['POST','PATCH','PUT'].includes(r.request().method())) {
        saveResponses.push({ status: r.status(), url: r.url() });
      }
    };
    page.on('response', saveHandler);

    // Check for loading state during save
    let loadingDetected = false;

    // Click Save claim button
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const txt = await btn.innerText().catch(() => '');
      const disabled = await btn.evaluate(el => el.disabled).catch(() => false);
      if (/save claim|save|submit claim/i.test(txt) && !disabled) {
        await btn.click();
        // Check loading state immediately after click
        await page.waitForTimeout(200);
        const pageHtml = await page.evaluate(() => document.body.innerHTML);
        loadingDetected = /loading|spinner|animate-spin|aria-busy/i.test(pageHtml);
        CF.loadingVisible = loadingDetected;
        await page.waitForTimeout(2500);
        break;
      }
    }

    await ss(page, 'claim_save_result');
    const afterSaveText = await getText(page);

    // Determine success
    page.off('response', saveHandler);
    if (saveResponses.length > 0) {
      const last = saveResponses[saveResponses.length - 1];
      CF.saveHttpStatus = last.status;
      CF.saveSucceeds = last.status < 400;
      console.log(`  Save API: ${last.status} ${last.url}`);
    } else {
      // Heuristic from UI text
      CF.saveSucceeds = !/invalid|error|400|bad request/i.test(afterSaveText);
      console.log('  Save API: no request captured, heuristic check');
    }

    // ── Evidence field ──────────────────────────────────────────────
    const evidenceInputs = await page.$$('input[placeholder*="url" i], input[placeholder*="source" i], input[name*="url" i], input[name*="evidence" i]');
    if (evidenceInputs.length > 0) {
      const hasLabel = await evidenceInputs[0].evaluate(el => {
        const label = document.querySelector(`label[for="${el.id}"]`);
        return !!(label?.textContent?.trim());
      });
      CF.evidenceLabelled = hasLabel;
      R.evidencePlaceholder = await evidenceInputs[0].getAttribute('placeholder');
    }

    // ── Hash field ─────────────────────────────────────────────────
    const hashInput = await page.$('input[name*="hash" i], input[placeholder*="hash" i]');
    if (hashInput) {
      CF.hashHidden = await hashInput.evaluate(el => {
        return !!(el.closest('details') || el.closest('[data-state="closed"]') || getComputedStyle(el).display === 'none');
      });
    } else {
      CF.hashHidden = true; // not visible = effectively hidden
    }

    // ── History table ──────────────────────────────────────────────
    const claimHistory = await getText(page);
    CF.historyUpdates = /history|claim #|filed|open|missing parcel/i.test(claimHistory);

    console.log(`  Claim flow: save=${CF.saveSucceeds} (HTTP ${CF.saveHttpStatus}), panel=${CF.claimPanelOpens}, rawEnum=${CF.rawEnumVisible}, longFloat=${CF.longFloatVisible}`);
  } else {
    console.log('  No customers found — checking if data needs to be loaded');
    R.noCustomers = true;
  }

  R.claimFlow = CF;

  // ══════════════════════════════════════════════════════════════════════════
  // AREA 4 — OPERATIONAL READINESS: /claims page
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══ AREA 4: /claims PAGE ══');
  route = '/claims';
  await page.goto(`${BASE_URL}/claims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  R.claimsPageUrl = page.url().replace(BASE_URL, '');
  R.claimsAccessible = !page.url().includes('/login');
  await ss(page, 'claims_page_full');

  const claimsText = await getText(page);
  R.claimsHasKpiStrip = /open.*review|total at risk|resolved|total claims/i.test(claimsText);
  R.claimsHasTable = /order ref|type|status|decision|at risk/i.test(claimsText);
  R.claimsHasStatusFilter = /all|open|under review|resolved|closed/i.test(claimsText);
  R.claimsEmptyState = /no claims yet|no claims/i.test(claimsText);
  R.claimsEmptyStateHelpful = /customer profile|browse customers/i.test(claimsText);
  console.log(`  Claims page: KPI=${R.claimsHasKpiStrip}, table=${R.claimsHasTable}, filter=${R.claimsHasStatusFilter}, emptyState=${R.claimsEmptyState}`);

  // ── Check nav for Claims entry ─────────────────────────────────────────
  const navEl = await page.$('nav, aside');
  const navHTML = navEl ? await navEl.evaluate(el => el.innerHTML) : '';
  const navText = navEl ? await navEl.evaluate(el => el.innerText) : '';
  R.claimsInSidebar = /claims/i.test(navText);
  R.claimsNavHref = navHTML.match(/href="([^"]*claims[^"]*)"/)?.[1] || null;

  await ss(page, 'claims_sidebar_nav');
  console.log(`  Claims in sidebar nav: ${R.claimsInSidebar}, href: ${R.claimsNavHref}`);

  // Try clicking a claim row if one exists
  const trows = await page.$$('tbody tr');
  if (trows.length > 0) {
    const reviewLink = await page.$('a:has-text("Review")');
    if (reviewLink) {
      await reviewLink.click();
      await page.waitForTimeout(1000);
      R.claimReviewLinkWorks = true;
      await ss(page, 'claim_row_click_through');
      await page.goBack();
      await page.waitForTimeout(500);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AREA 5 — NAVIGATION & IA
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══ AREA 5: NAVIGATION & IA ══');
  const navRoutes = [
    ['dashboard', '/dashboard'],
    ['inbox', '/inbox'],
    ['claims', '/claims'],
    ['customers', '/customers'],
    ['chargebacks', '/chargebacks'],
    ['help', '/help'],
    ['settings', '/settings'],
    ['settings_integrations', '/settings/integrations'],
    ['evidence_redirect', '/evidence'],
    ['lookup_redirect', '/lookup'],
  ];

  R.navChecks = {};
  for (const [name, r] of navRoutes) {
    route = r;
    try {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(500);
      const finalUrl = page.url().replace(BASE_URL, '');
      const is404 = await page.evaluate(() =>
        document.title.includes('404') || /not.found|404/i.test(document.body.innerText.slice(0, 200))
      );
      R.navChecks[name] = { requested: r, final: finalUrl, redirected: finalUrl !== r, is404 };
      await ss(page, name);
    } catch(e) {
      R.navChecks[name] = { error: e.message };
    }
  }

  // ── Help page specific check ──────────────────────────────────────────
  route = '/help';
  await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const helpHTML = await page.evaluate(() => document.body.innerHTML);
  const helpText = await getText(page);
  R.helpHasAuditTabBar = /tab.*inbox|tab.*upload|Inbox.*Upload.*Chargebacks/i.test(helpHTML);
  R.helpHasOwnHeader = /help/i.test(helpText.slice(0, 300));
  R.helpIsClean = !R.helpHasAuditTabBar;
  await ss(page, 'help_page_close');

  // ── Settings integrations sub-tab check ──────────────────────────────
  route = '/settings';
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const settingsText = await getText(page);
  R.settingsHasIntegrationsTab = /integration/i.test(settingsText);
  await ss(page, 'settings_page');

  // ── Evidence / Lookup label-route mismatch ────────────────────────────
  R.evidenceRedirectsTo = R.navChecks.evidence_redirect?.final || 'unknown';
  R.evidenceIsSilentRedirect = R.evidenceRedirectsTo !== '/evidence';
  R.lookupRedirectsTo = R.navChecks.lookup_redirect?.final || 'unknown';
  R.lookupIsSilentRedirect = R.lookupRedirectsTo !== '/lookup';

  console.log(`  Nav checks complete:`);
  for (const [name, data] of Object.entries(R.navChecks)) {
    if (data.redirected) console.log(`    ${name}: ${data.requested} → ${data.final}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL STATE
  // ══════════════════════════════════════════════════════════════════════════
  route = '/dashboard';
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await ss(page, 'final_dashboard');

  await browser.close();

  // ── Save results ──────────────────────────────────────────────────────
  const output = { results: R, errorLog: errors, apiErrors };
  fs.writeFileSync(path.join(__dirname, 'reaudit_results_v2.json'), JSON.stringify(output, null, 2));
  console.log('\n✓ Results saved to audit/reaudit_results_v2.json');
  console.log(`✓ ${ssIdx - 1} screenshots saved to ${SS_DIR}`);

  // Error summary
  console.log('\n══ API ERRORS ══');
  apiErrors.forEach(e => console.log(`  [${e.status}] ${e.url} (on ${e.route})`));

  console.log('\n══ CONSOLE ERRORS BY ROUTE ══');
  for (const [r, errs] of Object.entries(errors)) {
    if (errs.length) {
      console.log(`  ${r}: ${errs.length} error(s)`);
      errs.slice(0, 3).forEach(e => console.log(`    [${e.type}] ${e.msg.slice(0, 100)}`));
    }
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
