import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const root = process.cwd();
const auditDir = path.join(root, 'design-audit');
const screenshotDir = path.join(auditDir, 'screenshots');
const seedLog = JSON.parse(fs.readFileSync(path.join(auditDir, 'seed_log.json'), 'utf8'));

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const email = seedLog.account.email;
const password = 'SimTest2025!';
const customerIds = seedLog.customers;
const profileId = customerIds['suspicious-1'].id;
const watchlistProfileId = customerIds['critical-1'].id;
const evidencePackageId = seedLog.evidence_packages[0];

fs.mkdirSync(screenshotDir, { recursive: true });

const manifest = {
  generated_at: new Date().toISOString(),
  base_url: baseUrl,
  account: { email, merchant_id: seedLog.account.merchant_id, shop_domain: seedLog.account.shop_domain },
  captures: [],
  route_observations: [],
  console_errors: [],
};

function filePath(name) {
  return path.join(screenshotDir, name);
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

async function scrollMain(page, y) {
  await page.evaluate((targetY) => {
    const main = document.querySelector('main');
    const scroller = main && main.scrollHeight > main.clientHeight ? main : document.scrollingElement;
    scroller?.scrollTo({ top: targetY, behavior: 'instant' });
  }, y).catch(() => {});
  await page.waitForTimeout(900);
}

async function capture(page, name, label, extra = {}) {
  const p = filePath(name);
  await page.screenshot({ path: p, fullPage: false });
  manifest.captures.push({
    file: `./design-audit/screenshots/${name}`,
    label,
    url: page.url(),
    title: await page.title().catch(() => ''),
    viewport: page.viewportSize(),
    ...extra,
  });
}

async function collectObservation(page, route, label) {
  const info = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const bodyText = (main.innerText || document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1400);
    const vars = [
      '--surface-base', '--surface-raised', '--surface-overlay', '--surface-border',
      '--ink-primary', '--ink-secondary', '--ink-tertiary', '--copper-bright',
      '--copper-mid', '--bg-canvas', '--bg-surface', '--text-muted',
      '--risk-critical', '--risk-high', '--risk-medium', '--risk-low',
    ];
    const cs = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries(vars.map((v) => [v, cs.getPropertyValue(v).trim()]));
    const tables = [...document.querySelectorAll('table')].map((table) => ({
      headers: [...table.querySelectorAll('th')].map((th) => th.textContent.trim()).filter(Boolean),
      rowCount: table.querySelectorAll('tbody tr').length,
    }));
    const buttons = [...document.querySelectorAll('button,a')].slice(0, 80).map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim()).filter(Boolean);
    const inputs = [...document.querySelectorAll('input,select,textarea')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      label: el.getAttribute('aria-label') || '',
    }));
    return {
      path: location.pathname + location.search,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      bodyText,
      tokens,
      tables,
      buttons,
      inputs,
      mainScrollHeight: main.scrollHeight,
      mainClientHeight: main.clientHeight,
      bodyClass: document.body.className,
    };
  }).catch((error) => ({ error: String(error) }));
  manifest.route_observations.push({ route, label, ...info });
}

async function goto(page, route, screenshotName, label, options = {}) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForApp(page);
  if (options.waitText) {
    await page.getByText(options.waitText, { exact: false }).first().waitFor({ timeout: 10000 }).catch(() => {});
  }
  await scrollMain(page, 0);
  await capture(page, screenshotName, label, { route });
  await collectObservation(page, route, label);
}

async function maybeClickByText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  if (await locator.count().catch(() => 0)) {
    await locator.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      manifest.console_errors.push({ type: msg.type(), text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', (error) => {
    manifest.console_errors.push({ type: 'pageerror', text: error.message, url: page.url() });
  });

  await goto(page, '/', '00_root_landing_or_redirect.png', 'Root route / before auth');
  await goto(page, '/login', '00_login.png', 'Login page');
  await maybeClickByText(page, 'Create account');
  await capture(page, '00_signup_state.png', 'Signup state on login page', { route: '/login?signup-state' });
  await goto(page, '/login', '00_login_reset_for_signin.png', 'Login page reset for sign in');

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/(upload|dashboard|onboarding|login)/, { timeout: 30000 }).catch(() => {}),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  await waitForApp(page);
  await capture(page, '00_after_login_default.png', 'Default page after login', { route: new URL(page.url()).pathname });

  await goto(page, '/dashboard', '01_dashboard_overview.png', 'Dashboard overview');
  await scrollMain(page, 760);
  await capture(page, '01_dashboard_mid_scroll.png', 'Dashboard middle scroll', { route: '/dashboard' });

  await goto(page, '/inbox', '02_inbox_queue.png', 'Inbox / cases queue');
  const inboxCheckbox = page.locator('table input[type="checkbox"]').first();
  if (await inboxCheckbox.count().catch(() => 0)) {
    await inboxCheckbox.check().catch(() => {});
    await page.waitForTimeout(600);
    await capture(page, '02_inbox_bulk_selected.png', 'Inbox bulk selected state', { route: '/inbox' });
  }

  await goto(page, '/customers', '03_customers_list.png', 'Customers / clusters list');
  await maybeClickByText(page, 'Filters');
  await capture(page, '03_customers_filter_open.png', 'Customers filter controls open', { route: '/customers#filters' });
  await page.keyboard.press('Escape').catch(() => {});
  await goto(page, '/customers?q=priya', '03_customers_search_priya.png', 'Customers search result for Priya', { waitText: 'Priya' });
  await goto(page, '/customers?risk=high', '03_customers_high_risk_filter.png', 'Customers high-risk filter');

  await goto(page, `/customers/${profileId}`, '04_customer_profile_top.png', 'Customer profile top');
  await scrollMain(page, 820);
  await capture(page, '04_customer_profile_mid_dossier.png', 'Customer profile dossier / identity sections', { route: `/customers/${profileId}` });
  await scrollMain(page, 1550);
  await capture(page, '04_customer_profile_claims_orders.png', 'Customer profile claims and order history area', { route: `/customers/${profileId}` });

  await goto(page, `/customers/${profileId}/claims`, '05_customer_claim_review_route.png', 'Customer claims review route');
  await collectObservation(page, `/customers/${profileId}/claims`, 'Customer claims review route details');

  await goto(page, '/claims', '05_claims_list.png', 'Claims list');
  await goto(page, '/claims?status=open', '05_claims_open_filter.png', 'Claims open status filter');
  await goto(page, '/claims?sla=overdue', '05_claims_overdue_filter.png', 'Claims overdue filter');
  await goto(page, '/claims?status=resolved', '06_claim_history_resolved.png', 'Resolved claim history');

  await goto(page, '/reports', '07_reports.png', 'Reports');
  await goto(page, '/reports?range=90d', '07_reports_90d.png', 'Reports 90 day filter');
  await goto(page, '/settings/audit-trail', '08_audit_trail.png', 'Settings audit trail');
  await scrollMain(page, 650);
  await capture(page, '08_audit_trail_scroll.png', 'Audit trail scrolled table', { route: '/settings/audit-trail' });

  await goto(page, '/watchlist', '09_watchlist_loaded.png', 'Watchlist loaded');
  await maybeClickByText(page, 'Reginald');
  await capture(page, '09_watchlist_drawer_or_interaction.png', 'Watchlist row interaction / drawer', { route: '/watchlist#interaction' });
  await page.keyboard.press('Escape').catch(() => {});

  await goto(page, '/upload', '10_upload_flow.png', 'Upload / new audit flow');
  await maybeClickByText(page, 'Download template');
  await page.waitForTimeout(500);
  await capture(page, '10_upload_interaction_state.png', 'Upload page interaction state', { route: '/upload#interaction' });

  await goto(page, '/history', '11_audit_history.png', 'Audit history');
  await goto(page, '/chargebacks', '12_evidence_packages.png', 'Evidence packages list');
  if (evidencePackageId) {
    await goto(page, `/chargebacks/${evidencePackageId}`, '12_evidence_package_detail.png', 'Evidence package detail');
  }

  await goto(page, '/settings', '13_settings_overview.png', 'Settings overview');
  await goto(page, '/settings/account', '13_settings_account.png', 'Settings account');
  await goto(page, '/settings/integrations', '13_settings_integrations_shopify.png', 'Shopify integration status');
  await goto(page, '/settings/team', '13_settings_team.png', 'Settings team');

  await goto(page, '/onboarding', '14_onboarding_accessible_state.png', 'Onboarding route');
  await goto(page, '/new-audit', '15_new_audit_missing_route.png', 'Requested /new-audit route');
  await goto(page, '/audit-history', '15_audit_history_missing_route.png', 'Requested /audit-history route');
  await goto(page, '/evidence-packages', '15_evidence_packages_missing_route.png', 'Requested /evidence-packages route');
  await goto(page, '/settings/data-privacy', '15_settings_data_privacy_missing_route.png', 'Requested /settings/data-privacy route');

  await page.setViewportSize({ width: 1280, height: 820 });
  await goto(page, '/dashboard', '16_dashboard_1280_laptop.png', 'Dashboard at 1280 laptop viewport');
  await page.setViewportSize({ width: 1024, height: 768 });
  await goto(page, '/customers', '17_customers_1024_tablet.png', 'Customers at 1024 viewport');
  await goto(page, '/claims', '17_claims_1024_tablet.png', 'Claims at 1024 viewport');

  await fs.promises.writeFile(path.join(auditDir, 'capture_manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(JSON.stringify({ ok: true, screenshots: manifest.captures.length, observations: manifest.route_observations.length }, null, 2));
}

main().catch(async (error) => {
  await fs.promises.writeFile(path.join(auditDir, 'capture_manifest.partial.json'), JSON.stringify({ ...manifest, error: String(error?.stack || error) }, null, 2)).catch(() => {});
  console.error(error);
  process.exit(1);
});
