// Targeted Re-Audit Script — Playwright (Node.js)
// Tests only the 5 changed areas since the original audit

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots/reaudit');
const EMAIL = 'reaudit-test@unauth-test.com';
const PASSWORD = 'ReauditTest2025!';
const STORE_NAME = 'Reaudit Test Store';

// Error log per route
const errorLog = {};
let currentRoute = '/';

function logError(type, msg) {
  if (!errorLog[currentRoute]) errorLog[currentRoute] = [];
  errorLog[currentRoute].push({ type, msg, ts: new Date().toISOString() });
}

let ssIndex = 1;
async function visitElementsSequentially(elements, visit) {
  const step = async (index) => {
    if (index >= elements.length) return undefined;
    const result = await visit(elements[index], index);
    if (result !== undefined && result !== false) return result;
    return step(index + 1);
  };
  return step(0);
}

async function screenshot(page, name) {
  const padded = String(ssIndex).padStart(2, '0');
  const filename = `r${padded}_${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  ssIndex++;
  return filename;
}

function maskEmail(email) {
  if (!email) return email;
  const [user, domain] = email.split('@');
  return `${user[0]}***@${domain ? domain.replace(/./g, '*') : '***'}`;
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Error instrumentation
  page.on('console', msg => {
    if (msg.type() === 'error') logError('console_error', msg.text());
  });
  page.on('pageerror', err => logError('page_error', err.message));
  page.on('requestfailed', req => {
    logError('request_failed', `${req.url()} — ${req.failure()?.errorText || 'unknown'}`);
  });
  page.on('response', resp => {
    if (resp.status() >= 400 && resp.url().includes('/api/')) {
      logError('api_error', `${resp.status()} ${resp.url()}`);
    }
  });

  const results = {};

  // ─── AREA 2: MERCHANT ONBOARDING ─────────────────────────────────────────
  console.log('\n══ AREA 2: MERCHANT ONBOARDING ══');
  currentRoute = '/';

  // Check landing page
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const landingUrl = page.url();
  results.landingUrl = landingUrl;
  await screenshot(page, 'landing_page');

  // Check /signup redirect
  currentRoute = '/signup';
  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const signupUrl = page.url();
  results.signupRedirectsTo = signupUrl;
  results.signupRedirectsToLoginSignup = signupUrl.includes('/login') && signupUrl.includes('signup');
  await screenshot(page, 'signup_redirect');

  // Look for toggle / "Create account" label
  const pageText = await page.evaluate(() => document.body.innerText);
  results.hasCreateAccountLabel = pageText.toLowerCase().includes('create account');
  results.hasRequestAccessLabel = pageText.toLowerCase().includes('request access');
  results.workEmailMentioned = pageText.toLowerCase().includes('work email') || pageText.toLowerCase().includes('business email');
  await screenshot(page, 'login_signup_toggle');

  // Try signup — if account exists, login instead
  let loggedIn = false;
  let signupWorked = false;

  // First try login
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Fill email
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      await emailInput.fill(EMAIL);
    }
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    if (passwordInput) {
      await passwordInput.fill(PASSWORD);
    }

    // Click login
    const loginBtn = await page.$('button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForTimeout(2000);
    }

    const afterLogin = page.url();
    if (!afterLogin.includes('/login') && !afterLogin.includes('/signup')) {
      loggedIn = true;
      results.loginSuccess = true;
      results.loginMethod = 'existing_account';
      console.log('  ✓ Logged in with existing account');
    }
  } catch (e) {
    console.log('  Login attempt failed:', e.message);
  }

  if (!loggedIn) {
    // Try signup with toggle
    try {
      await page.goto(`${BASE_URL}/login?signup=1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Look for signup toggle
      const toggleBtns = await page.$$('button');
      await visitElementsSequentially(toggleBtns, async (btn) => {
        const txt = await btn.innerText().catch(() => '');
        if (txt.toLowerCase().includes('create account') || txt.toLowerCase().includes('sign up')) {
          await btn.click();
          await page.waitForTimeout(500);
          return true;
        }
      });

      const emailInput = await page.$('input[type="email"], input[name="email"]');
      if (emailInput) await emailInput.fill(EMAIL);

      const passwordInput = await page.$('input[type="password"], input[name="password"]');
      if (passwordInput) await passwordInput.fill(PASSWORD);

      // Fill store name if present
      const storeInput = await page.$('input[name="storeName"], input[placeholder*="store"], input[placeholder*="Store"]');
      if (storeInput) await storeInput.fill(STORE_NAME);

      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }

      const afterSignup = page.url();
      if (!afterSignup.includes('/login') && !afterSignup.includes('/signup')) {
        loggedIn = true;
        signupWorked = true;
        results.loginSuccess = true;
        results.loginMethod = 'new_signup';
      }
    } catch (e) {
      console.log('  Signup attempt failed:', e.message);
    }
  }

  results.loggedIn = loggedIn;
  if (loggedIn) {
    await screenshot(page, 'post_login_dashboard');
  }

  // Test sample data / demo
  currentRoute = '/api/demo';
  let demoStatus = null;
  let demoError = null;
  try {
    const resp = await page.request.post(`${BASE_URL}/api/demo`);
    demoStatus = resp.status();
    const body = await resp.text().catch(() => '');
    demoError = body.slice(0, 200);
    results.demoApiStatus = demoStatus;
    results.demoApiBody = demoError;
    console.log(`  /api/demo → HTTP ${demoStatus}`);
  } catch (e) {
    results.demoApiError = e.message;
    console.log('  /api/demo request failed:', e.message);
  }

  // Also try clicking any "sample data" button on dashboard
  if (loggedIn) {
    currentRoute = '/dashboard';
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyTxt = await page.evaluate(() => document.body.innerText);
    results.dashboardHasSampleDataButton = bodyTxt.toLowerCase().includes('sample') || bodyTxt.toLowerCase().includes('demo');

    // Look for and click sample data button
    const allBtns = await page.$$('button, a');
    let sampleBtn = null;
    const matchedSampleBtn = await visitElementsSequentially(allBtns, async (btn) => {
      const txt = await btn.innerText().catch(() => '');
      if (txt.toLowerCase().includes('sample') || txt.toLowerCase().includes('demo data') || txt.toLowerCase().includes('try ')) {
        return btn;
      }
    });
    sampleBtn = matchedSampleBtn ?? null;

    if (sampleBtn) {
      await sampleBtn.click();
      await page.waitForTimeout(2000);
      results.clickedSampleDataBtn = true;
      await screenshot(page, 'after_sample_data_click');
    } else {
      results.clickedSampleDataBtn = false;
      await screenshot(page, 'dashboard_no_sample_btn');
    }

    // Check sparse overlay
    const dashText = await page.evaluate(() => document.body.innerText);
    results.dashboardHasSparseOverlay = dashText.toLowerCase().includes('upload') || dashText.toLowerCase().includes('get started') || dashText.toLowerCase().includes('no orders');
  }

  results.area2 = {
    signupRedirects: results.signupRedirectsToLoginSignup,
    hasCreateAccountLabel: results.hasCreateAccountLabel,
    workEmailExplained: results.workEmailMentioned,
    demoSucceeds: demoStatus === 200 || demoStatus === 201,
    demoStatus,
  };
  console.log('  Area 2 data:', JSON.stringify(results.area2));

  // ─── AREA 3: SHOPIFY SYNC VISIBILITY ─────────────────────────────────────
  console.log('\n══ AREA 3: SHOPIFY SYNC VISIBILITY ══');
  currentRoute = '/settings/integrations';

  await page.goto(`${BASE_URL}/settings/integrations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const intUrl = page.url();
  results.integrationsRouteWorks = !intUrl.includes('404') && !intUrl.includes('error');
  await screenshot(page, 'settings_integrations_full');

  const intText = await page.evaluate(() => document.body.innerText);
  results.hasSyncStatusCard = intText.toLowerCase().includes('sync') || intText.toLowerCase().includes('shopify');
  results.hasConnectionStatus = intText.toLowerCase().includes('connect') || intText.toLowerCase().includes('status');
  results.hasLastSynced = intText.toLowerCase().includes('last sync') || intText.toLowerCase().includes('synced');
  results.hasRecordCount = /\d+\s*(orders|customers|records)/i.test(intText);
  results.hasConnectCTA = intText.toLowerCase().includes('connect') || intText.toLowerCase().includes('install');
  results.integrationsExplainsWhat = intText.toLowerCase().includes('shopify') && intText.length > 200;

  // Check header pill / dashboard link
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const [dashboardText, dashboardLinks] = await Promise.all([
    page.evaluate(() => document.body.innerText),
    page.$$eval('a', (els) => els.map((a) => ({ href: a.href, text: a.innerText.trim() }))),
  ]);
  results.headerPillToIntegrations = dashboardLinks.some(l => l.href.includes('/settings/integrations') || l.href.includes('integrations'));
  results.headerPillText = dashboardLinks.flatMap((l) => (l.href.includes('integrations') ? [l.text] : [])).join(', ');

  await screenshot(page, 'dashboard_header_pill');

  results.area3 = {
    routeWorks: results.integrationsRouteWorks,
    hasSyncCard: results.hasSyncStatusCard,
    hasStatus: results.hasConnectionStatus,
    hasLastSynced: results.hasLastSynced,
    hasConnectCTA: results.hasConnectCTA,
    headerPillExists: results.headerPillToIntegrations,
  };
  console.log('  Area 3 data:', JSON.stringify(results.area3));

  // ─── AREA 1: CLAIM REVIEW WORKFLOW ────────────────────────────────────────
  console.log('\n══ AREA 1: CLAIM REVIEW WORKFLOW ══');
  currentRoute = '/customers';

  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await screenshot(page, 'customers_list');

  const customersText = await page.evaluate(() => document.body.innerText);
  results.hasCustomers = !customersText.toLowerCase().includes('no customers') && !customersText.toLowerCase().includes('no orders');

  // Navigate to first customer
  let claimFlowResults = {
    navigatedToCustomer: false,
    claimPanelOpens: false,
    rawEnumVisible: false,
    longFloatVisible: false,
    orderPickerWorks: false,
    saveSuceeeds: false,
    saveHttpStatus: null,
    outcomeSetWorks: false,
    evidenceFieldLabelled: false,
    hashFieldHidden: false,
    historyTableUpdates: false,
    loadingStateVisible: false,
    buttonsDisabled: false,
    humanReadableLabels: false,
    panelVisuallyConsistent: false,
  };

  try {
    // Click on first customer row or card
    const customerLinks = await page.$$('a[href*="/customers/"]');
    if (customerLinks.length > 0) {
      const firstCustomer = customerLinks[0];
      const href = await firstCustomer.getAttribute('href');
      results.firstCustomerHref = href;
      await firstCustomer.click();
      await page.waitForTimeout(1500);
      claimFlowResults.navigatedToCustomer = true;
      currentRoute = href;
      await screenshot(page, 'customer_profile');

      // Check risk score format
      const profileText = await page.evaluate(() => document.body.innerText);
      claimFlowResults.longFloatVisible = /\d+\.\d{5,}/.test(profileText);
      claimFlowResults.rawEnumVisible = /post_delivery_claim_rate|postDeliveryClaimRate|missing_parcel|order_picker/i.test(profileText);

      // Navigate to claims tab
      const claimsLinks = await page.$$('a[href*="/claims"], button');
      let claimsTabFound = false;
      claimsTabFound = Boolean(await visitElementsSequentially(claimsLinks, async (link) => {
        const txt = await link.innerText().catch(() => '');
        if (txt.toLowerCase().includes('claim')) {
          await link.click();
          await page.waitForTimeout(1000);
          return true;
        }
      }));

      if (!claimsTabFound) {
        // Try navigating directly
        const customerId = href.split('/customers/')[1]?.split('/')[0];
        if (customerId) {
          await page.goto(`${BASE_URL}/customers/${customerId}/claims`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(1000);
        }
      }

      await screenshot(page, 'claim_panel_before_fill');
      const claimPanelText = await page.evaluate(() => document.body.innerText);
      claimFlowResults.claimPanelOpens = claimPanelText.toLowerCase().includes('claim');

      // Check for buttons disabled state
      const disabledBtns = await page.$$('button[disabled]');
      claimFlowResults.buttonsDisabled = disabledBtns.length > 0;

      // Check human-readable labels
      claimFlowResults.humanReadableLabels = !claimPanelText.toLowerCase().includes('missing_parcel') &&
        !claimPanelText.toLowerCase().includes('post_delivery') &&
        claimPanelText.toLowerCase().includes('claim');

      // Try to fill claim type
      const claimTypeSelects = await page.$$('select, [role="combobox"], [role="listbox"]');
      let claimTypeSet = false;
      claimTypeSet = Boolean(await visitElementsSequentially(claimTypeSelects, async (sel) => {
        const label = await sel.evaluate(el => {
          const label = document.querySelector(`label[for="${el.id}"]`);
          return label?.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
        });
        if (label.toLowerCase().includes('type') || label.toLowerCase().includes('claim')) {
          try {
            await sel.selectOption({ label: 'Missing parcel' });
            return true;
          } catch {
            try { await sel.selectOption({ label: 'missing_parcel' }); return true; } catch {}
            try { await sel.selectOption({ index: 1 }); return true; } catch {}
          }
        }
      }));

      // Also try clicking a select with combobox
      if (!claimTypeSet) {
        const allSelects = await page.$$('select');
        if (allSelects.length > 0) {
          try {
            await allSelects[0].selectOption({ index: 1 });
            claimTypeSet = true;
          } catch (e) {}
        }
      }

      // Order reference picker
      const orderInputs = await page.$$('input[placeholder*="order"], input[name*="order"], select[name*="order"]');
      if (orderInputs.length > 0) {
        try {
          const orderInput = orderInputs[0];
          const tagName = await orderInput.evaluate(el => el.tagName);
          if (tagName === 'SELECT') {
            await orderInput.selectOption({ index: 1 });
          } else {
            await orderInput.fill('#TEST-001');
          }
          claimFlowResults.orderPickerWorks = true;
        } catch (e) {}
      }

      // Customer reason
      const reasonInputs = await page.$$('input[name*="reason"], textarea[name*="reason"], textarea[placeholder*="reason"]');
      if (reasonInputs.length > 0) {
        await reasonInputs[0].fill('Customer states parcel was not delivered');
      }

      // Internal notes
      const notesInputs = await page.$$('textarea[name*="note"], textarea[placeholder*="note"], input[name*="note"]');
      if (notesInputs.length > 0) {
        await notesInputs[0].fill('Re-audit test claim — internal notes');
      }

      await screenshot(page, 'claim_panel_filled');

      // Check loading state visibility (look for spinner/loading classes)
      const hasLoadingElements = await page.evaluate(() => {
        return !!(document.querySelector('[class*="loading"], [class*="spinner"], [aria-busy="true"]'));
      });
      claimFlowResults.loadingStateVisible = hasLoadingElements;

      // Track network requests for save
      const saveRequests = [];
      page.on('response', resp => {
        if (resp.url().includes('/api/') && ['POST', 'PATCH', 'PUT'].includes(resp.request().method())) {
          saveRequests.push({ url: resp.url(), status: resp.status() });
        }
      });

      // Click Save
      const saveButtons = await page.$$('button[type="submit"], button');
      let saveClicked = false;
      saveClicked = Boolean(await visitElementsSequentially(saveButtons, async (btn) => {
        const txt = await btn.innerText().catch(() => '');
        if (txt.toLowerCase().includes('save') || txt.toLowerCase().includes('submit')) {
          await btn.click();
          await page.waitForTimeout(2000);
          return true;
        }
      }));

      if (saveClicked) {
        await screenshot(page, 'claim_save_result');
        const afterSaveText = await page.evaluate(() => document.body.innerText);
        claimFlowResults.saveSuceeeds = !afterSaveText.toLowerCase().includes('invalid claim') &&
          !afterSaveText.toLowerCase().includes('http 400') &&
          !afterSaveText.toLowerCase().includes('bad request');

        // Check save request statuses
        if (saveRequests.length > 0) {
          const lastSave = saveRequests[saveRequests.length - 1];
          claimFlowResults.saveHttpStatus = lastSave.status;
          claimFlowResults.saveSuceeeds = lastSave.status < 400;
        }
      }

      // Check evidence field label
      const evidenceFields = await page.$$('input[placeholder*="evidence"], input[placeholder*="url"], input[name*="evidence"], input[name*="url"]');
      if (evidenceFields.length > 0) {
        const placeholder = await evidenceFields[0].getAttribute('placeholder');
        const name = await evidenceFields[0].getAttribute('name');
        // Check if there's a proper label (not just placeholder as label)
        const hasLabel = await evidenceFields[0].evaluate(el => {
          const label = document.querySelector(`label[for="${el.id}"]`);
          return !!(label && label.innerText.trim().length > 0);
        });
        claimFlowResults.evidenceFieldLabelled = hasLabel;
        results.evidencePlaceholder = placeholder;
      }

      // Check hash field in advanced/disclosure
      const hashField = await page.$('input[name*="hash"], input[placeholder*="hash"]');
      if (hashField) {
        const isHidden = await hashField.evaluate(el => {
          const details = el.closest('details');
          const summary = el.closest('[data-state="closed"]');
          return !!(details || summary);
        });
        claimFlowResults.hashFieldHidden = isHidden;
      } else {
        claimFlowResults.hashFieldHidden = true; // Field not visible = hidden
      }

      // Check history table
      const historyText = await page.evaluate(() => document.body.innerText);
      claimFlowResults.historyTableUpdates = historyText.toLowerCase().includes('history') || historyText.toLowerCase().includes('claim #');

    } else {
      console.log('  No customer links found — need to upload CSV first');
      results.noCustomers = true;
    }
  } catch (e) {
    console.log('  Claim flow error:', e.message);
    results.claimFlowError = e.message;
  }

  results.claimFlow = claimFlowResults;
  console.log('  Claim flow results:', JSON.stringify(claimFlowResults, null, 2));

  // ─── AREA 4: OPERATIONAL READINESS / CLAIMS PAGE ─────────────────────────
  console.log('\n══ AREA 4: OPERATIONAL READINESS / CLAIMS PAGE ══');
  currentRoute = '/claims';

  await page.goto(`${BASE_URL}/claims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const claimsUrl = page.url();
  results.claimsRouteWorks = !claimsUrl.includes('404') && !claimsUrl.includes('error') && !claimsUrl.includes('not-found');
  await screenshot(page, 'claims_page_full');

  const claimsText = await page.evaluate(() => document.body.innerText);
  results.claimsHasKpiStrip = /open|value at risk|resolution|total/i.test(claimsText);
  results.claimsHasTable = claimsText.toLowerCase().includes('status') || claimsText.toLowerCase().includes('claim type');
  results.claimsHasFilter = claimsText.toLowerCase().includes('filter') || claimsText.toLowerCase().includes('all claims');
  results.claimsEmptyStateHelpful = claimsText.toLowerCase().includes('no claim') || claimsText.toLowerCase().includes('claim') && claimsText.toLowerCase().includes('review');

  // Check nav for Claims
  const navLinks = await page.$$eval('nav a, [role="navigation"] a', els => els.map(a => ({
    href: a.getAttribute('href'),
    text: a.innerText.trim()
  })));
  results.claimsInNav = navLinks.some(l => l.href?.includes('/claims') || l.text.toLowerCase() === 'claims');
  results.claimsNavText = navLinks.flatMap((l) => (l.href?.includes('/claims') ? [l.text] : [])).join(', ');

  await screenshot(page, 'claims_nav_check');

  // Try to click a claim row
  const claimRows = await page.$$('tr[role="row"], [class*="row"], tbody tr');
  if (claimRows.length > 1) { // skip header row
    try {
      await claimRows[1].click();
      await page.waitForTimeout(1000);
      const afterClick = page.url();
      results.claimRowClickThrough = true;
      results.claimClickUrl = afterClick;
      await screenshot(page, 'claim_row_click_through');
    } catch (e) {}
  }

  results.area4 = {
    routeWorks: results.claimsRouteWorks,
    hasKpiStrip: results.claimsHasKpiStrip,
    hasTable: results.claimsHasTable,
    hasFilter: results.claimsHasFilter,
    claimsInNav: results.claimsInNav,
    emptyStateHelpful: results.claimsEmptyStateHelpful,
  };
  console.log('  Area 4 data:', JSON.stringify(results.area4));

  // ─── AREA 5: NAVIGATION & IA ──────────────────────────────────────────────
  console.log('\n══ AREA 5: NAVIGATION & IA ══');

  const navAreas = [
    { route: '/dashboard', name: 'dashboard' },
    { route: '/customers', name: 'customers' },
    { route: '/inbox', name: 'inbox' },
    { route: '/claims', name: 'claims' },
    { route: '/help', name: 'help' },
    { route: '/settings', name: 'settings' },
    { route: '/settings/integrations', name: 'settings_integrations' },
    { route: '/evidence', name: 'evidence_redirect' },
    { route: '/lookup', name: 'lookup_redirect' },
    { route: '/chargebacks', name: 'chargebacks' },
  ];

  results.navResults = {};
  const visitNavArea = async (index) => {
    if (index >= navAreas.length) return;
    const area = navAreas[index];
    currentRoute = area.route;
    try {
      await page.goto(`${BASE_URL}${area.route}`, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(600);
      const finalUrl = page.url();
      const is404 = await page.evaluate(() => document.title.includes('404') || document.body.innerText.includes('404') || document.body.innerText.toLowerCase().includes('not found'));
      results.navResults[area.name] = {
        requestedUrl: area.route,
        finalUrl: finalUrl.replace(BASE_URL, ''),
        redirected: !finalUrl.includes(area.route),
        is404,
      };
      await screenshot(page, area.name);
    } catch (e) {
      results.navResults[area.name] = { error: e.message };
    }
    return visitNavArea(index + 1);
  };
  await visitNavArea(0);

  // Check /help specifically for tab bar
  currentRoute = '/help';
  await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const [helpText, helpHTML] = await Promise.all([
    page.evaluate(() => document.body.innerText),
    page.evaluate(() => document.body.innerHTML),
  ]);
  results.helpHasTabBar = helpHTML.includes('tab') && (helpText.includes('Inbox') || helpText.includes('Upload') || helpText.includes('Chargebacks'));
  results.helpHasBreadcrumb = helpText.toLowerCase().includes('help') && (helpHTML.includes('breadcrumb') || helpHTML.includes('nav'));
  results.helpIsClean = !results.helpHasTabBar;
  await screenshot(page, 'help_page_detail');

  // Check /evidence redirect
  currentRoute = '/evidence';
  await page.goto(`${BASE_URL}/evidence`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const evidenceUrl = page.url();
  results.evidenceRedirectsTo = evidenceUrl.replace(BASE_URL, '');
  results.evidenceIsSilentRedirect = !evidenceUrl.includes('/evidence');

  // Check /lookup redirect
  currentRoute = '/lookup';
  await page.goto(`${BASE_URL}/lookup`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const lookupUrl = page.url();
  results.lookupRedirectsTo = lookupUrl.replace(BASE_URL, '');
  results.lookupIsSilentRedirect = !lookupUrl.includes('/lookup');

  // Check settings has integrations sub-tab
  currentRoute = '/settings';
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const settingsText = await page.evaluate(() => document.body.innerText);
  results.settingsHasIntegrationsTab = settingsText.toLowerCase().includes('integration');
  await screenshot(page, 'settings_page');

  results.area5 = {
    helpIsClean: results.helpIsClean,
    settingsHasIntegrations: results.settingsHasIntegrationsTab,
    evidenceSilentRedirect: results.evidenceIsSilentRedirect,
    lookupSilentRedirect: results.lookupIsSilentRedirect,
    claimsInNav: results.claimsInNav,
  };
  console.log('  Area 5 data:', JSON.stringify(results.area5));

  // ─── FINAL SCREENSHOT — FULL NAV ─────────────────────────────────────────
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await screenshot(page, 'final_dashboard_nav');

  await browser.close();

  // ─── WRITE RESULTS ────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'reaudit_results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ results, errorLog }, null, 2));
  console.log(`\n✓ Results saved to ${outputPath}`);
  console.log(`✓ Screenshots saved to ${SCREENSHOT_DIR}`);
  console.log('\n══ ERROR LOG SUMMARY ══');
  for (const [route, errors] of Object.entries(errorLog)) {
    if (errors.length > 0) {
      console.log(`  ${route}: ${errors.length} error(s)`);
      errors.forEach(e => console.log(`    [${e.type}] ${e.msg.slice(0, 120)}`));
    }
  }
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
