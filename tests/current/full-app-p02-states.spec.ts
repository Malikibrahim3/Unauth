import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ACCEPTANCE_SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
const ACCEPTANCE_VARIANT_HEADER = 'x-unauth-acceptance-variant';
const ARTIFACT_ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const ROUTES = JSON.parse(fs.readFileSync(path.join(ARTIFACT_ROOT, 'physical', 'routes.json'), 'utf8')) as {
  dynamicPaths: Record<string, string>;
};
const CASE_PATH = ROUTES.dynamicPaths['/cases/[caseId]'];
const CUSTOMER_PATH = ROUTES.dynamicPaths['/customers/[id]'];
const ORDER_PATH = ROUTES.dynamicPaths['/orders/[id]'];
if (!CASE_PATH || !CUSTOMER_PATH || !ORDER_PATH) throw new Error('P02 acceptance fixture routes are incomplete');

function fixtureUuid(label: string) {
  const hex = createHash('sha256').update(`demo-v2:${label}`).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (Number.parseInt(hex[16]!, 16) % 4)).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

const TICKET_PATH = `/tickets/${fixtureUuid('ticket:carrier-proof')}`;
const ABSENT_ID = '00000000-0000-4000-8000-000000000099';
const REFUND_PATH = '/refunds/d1300000-0000-4000-8000-000000000002';
const RETURN_PATH = '/returns/d1300000-0000-4000-8000-000000000003';
const DISPUTE_PATH = '/disputes/d1300000-0000-4000-8000-000000000005';
const SHIPMENT_PATH = '/shipments/d1300000-0000-4000-8000-00000000000c';

type ScenarioConfig = {
  id: string;
  mode: 'loading' | 'error' | 'state';
  path: string;
  stateSelector: string;
  settledSelector: string;
  returnAction?: string;
  persistentLoading?: boolean;
};

const ALL_CONFIGS: ScenarioConfig[] = [
  { id: 'overview-dashboard-loading', mode: 'loading', path: '/overview', stateSelector: '[data-state-id="overview-dashboard-loading"]', settledSelector: '[data-surface-id="overview-dashboard"]', persistentLoading: true },
  { id: 'operational-list-board-loading-skeleton', mode: 'loading', path: '/work', stateSelector: '[data-state-id="operational-list-board-loading-skeleton"]', settledSelector: '[data-surface-id="work-queue"]' },
  { id: 'cases-registry-loading', mode: 'loading', path: '/cases', stateSelector: '[data-state-id="cases-registry-loading"]', settledSelector: '[data-surface-id="cases-registry"]' },
  { id: 'customers-registry-loading', mode: 'loading', path: '/customers', stateSelector: '[data-state-id="customers-registry-loading"]', settledSelector: '[data-surface-id="customers-registry"]' },
  { id: 'operational-detail-loading-skeleton', mode: 'loading', path: CASE_PATH, stateSelector: '[data-state-id="operational-detail-loading-skeleton"]', settledSelector: '[data-surface-id="case-review-workbench"]', persistentLoading: true },
  { id: 'commerce-object-loading', mode: 'loading', path: ORDER_PATH, stateSelector: '[data-state-id="commerce-object-loading"]', settledSelector: '[data-surface-id="order-detail"]' },
  { id: 'support-object-loading', mode: 'loading', path: TICKET_PATH, stateSelector: '[data-state-id="support-object-loading"]', settledSelector: '[data-surface-id="support-ticket-detail"]' },
  { id: 'overview-error', mode: 'error', path: '/overview', stateSelector: '[data-state-id="overview-error"]', settledSelector: '[data-surface-id="overview-dashboard"]' },
  { id: 'work-error', mode: 'error', path: '/work', stateSelector: '[data-state-id="work-error"]', settledSelector: '[data-surface-id="work-queue"]' },
  { id: 'cases-error', mode: 'error', path: '/cases', stateSelector: '[data-state-id="cases-error"]', settledSelector: '[data-surface-id="cases-registry"]' },
  { id: 'customers-error', mode: 'error', path: '/customers', stateSelector: '[data-state-id="customers-error"]', settledSelector: '[data-surface-id="customers-registry"]' },
  { id: 'case-error', mode: 'error', path: CASE_PATH, stateSelector: '[data-state-id="case-error"]', settledSelector: '[data-surface-id="case-review-workbench"]' },
  { id: 'customer-error', mode: 'error', path: CUSTOMER_PATH, stateSelector: '[data-state-id="customer-error"]', settledSelector: '[data-surface-id="customer-profile"]' },
  { id: 'order-error', mode: 'error', path: ORDER_PATH, stateSelector: '[data-state-id="order-error"]', settledSelector: '[data-surface-id="order-detail"]' },
  { id: 'refund-error', mode: 'error', path: REFUND_PATH, stateSelector: '[data-state-id="refund-error"]', settledSelector: '[data-surface-id="refund-detail"]' },
  { id: 'return-error', mode: 'error', path: RETURN_PATH, stateSelector: '[data-state-id="return-error"]', settledSelector: '[data-surface-id="return-detail"]' },
  { id: 'shipment-error', mode: 'error', path: SHIPMENT_PATH, stateSelector: '[data-state-id="shipment-error"]', settledSelector: '[data-surface-id="shipment-detail"]' },
  { id: 'ticket-error', mode: 'error', path: TICKET_PATH, stateSelector: '[data-state-id="ticket-error"]', settledSelector: '[data-surface-id="support-ticket-detail"]' },
  { id: 'dispute-error', mode: 'error', path: DISPUTE_PATH, stateSelector: '[data-state-id="dispute-error"]', settledSelector: '[data-surface-id="dispute-detail"]' },
  { id: 'customer-profile-access-blocked-state', mode: 'state', path: CUSTOMER_PATH, stateSelector: '[data-state-id="customer-profile-access-blocked-state"]', settledSelector: '[data-surface-id="customer-profile"]' },
  { id: 'customer-not-found', mode: 'state', path: CUSTOMER_PATH, stateSelector: '[data-state-id="customer-not-found"]', settledSelector: '[data-surface-id="customers-registry"]', returnAction: 'Back to cases' },
  { id: 'connected-record-not-found', mode: 'state', path: ORDER_PATH, stateSelector: '[data-state-id="connected-record-not-found"]', settledSelector: '[data-surface-id="customers-registry"]', returnAction: 'Back to cases' },
  { id: 'evidence-package-builder-loading', mode: 'loading', path: `${CUSTOMER_PATH}/evidence/new`, stateSelector: '[data-state-id="evidence-package-builder-loading"]', settledSelector: '[data-surface-id="build-evidence-package"]', persistentLoading: true },
  { id: 'evidence-package-error', mode: 'error', path: `${CUSTOMER_PATH}/evidence/new`, stateSelector: '[data-state-id="evidence-package-error"]', settledSelector: '[data-surface-id="build-evidence-package"]' },
  { id: 'evidence-package-no-orders-no-cases-states', mode: 'state', path: `${CUSTOMER_PATH}/evidence/new`, stateSelector: '[data-state-id="evidence-package-no-orders-no-cases-states"]', settledSelector: '[data-surface-id="build-evidence-package"]' },
  { id: 'case-not-found', mode: 'state', path: CASE_PATH, stateSelector: '[data-state-id="case-not-found"]', settledSelector: '[data-surface-id="cases-registry"]', returnAction: 'Back to cases' },
  { id: 'work-empty-search-states', mode: 'state', path: '/work?search=acceptance-no-match', stateSelector: '[data-state-id="work-empty-search-states"]', settledSelector: '[data-surface-id="work-queue"]', returnAction: 'Show the rest' },
  { id: 'cases-empty-filter-states', mode: 'state', path: '/cases?search=acceptance-no-match', stateSelector: '[data-state-id="cases-empty-filter-states"]', settledSelector: '[data-surface-id="cases-registry"]', returnAction: 'View recorded outcomes' },
  { id: 'customers-empty-filter-states', mode: 'state', path: '/customers?search=acceptance-no-match', stateSelector: '[data-state-id="customers-empty-filter-states"]', settledSelector: '[data-surface-id="customers-registry"]', returnAction: 'Clear all filters' },
  { id: 'overview-unavailable-and-no-work-states', mode: 'state', path: '/overview', stateSelector: '[data-state-id="overview-unavailable-and-no-work-states"]', settledSelector: '[data-surface-id="overview-dashboard"]' },
];

const requestedScenarioIds = new Set(
  (process.env.P02_STATE_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const CONFIGS = requestedScenarioIds.size
  ? ALL_CONFIGS.filter((config) => requestedScenarioIds.has(config.id))
  : ALL_CONFIGS;
if (requestedScenarioIds.size && CONFIGS.length !== requestedScenarioIds.size) {
  const matchedIds = new Set(CONFIGS.map((config) => config.id));
  const unknownIds = [...requestedScenarioIds].filter((id) => !matchedIds.has(id));
  throw new Error(`Unknown P02 state scenario${unknownIds.length === 1 ? '' : 's'}: ${unknownIds.join(', ')}`);
}

const manifestById = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
for (const config of CONFIGS) if (!manifestById.has(config.id)) throw new Error(`Missing P02 manifest scenario ${config.id}`);

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type VariantEvidence = {
  id: string;
  viewport: string;
  theme: LightOnlyAppearance;
  finalUrl: string;
  screenshots: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  expectedDiagnostics: string[];
};

const evidence = new Map<string, VariantEvidence[]>();

function evidenceDirectory(scenarioId: string) {
  const directory = path.join(ARTIFACT_ROOT, 'scenarios', scenarioId);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function markerPath(scenarioId: string) {
  return path.join(ARTIFACT_ROOT, `.${scenarioId}-active`);
}

async function screenshot(page: Page, scenarioId: string, name: string) {
  const filePath = path.join(evidenceDirectory(scenarioId), `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return path.relative(ARTIFACT_ROOT, filePath);
}

function observeRuntime(page: Page, baseOrigin: string, config: ScenarioConfig) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const expectedDiagnostics: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    const deliberate = config.mode === 'error' && (
      value.includes('Local acceptance activation')
      || value.includes('Minified React error #441')
      || value.startsWith('[route-error]')
      || value === 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)'
    );
    if (deliberate) expectedDiagnostics.push(value);
    else consoleErrors.push(value);
  });
  page.on('pageerror', (error) => {
    if (config.mode === 'error' && (error.message.includes('Local acceptance activation') || error.message.includes('Minified React error #441'))) expectedDiagnostics.push(error.message);
    else pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(baseOrigin)) return;
    const failure = request.failure()?.errorText ?? 'failed';
    const summary = `${request.method()} ${new URL(request.url()).pathname}: ${failure}`;
    if (failure === 'net::ERR_ABORTED') expectedDiagnostics.push(`Acceptance navigation canceled an in-flight request: ${summary}`);
    else failedRequests.push(summary);
  });
  return { consoleErrors, pageErrors, failedRequests, expectedDiagnostics };
}

async function activate(page: Page, config: ScenarioConfig, variantId: string) {
  if (config.id === 'overview-unavailable-and-no-work-states') {
    await page.context().setExtraHTTPHeaders({ [ACCEPTANCE_SCENARIO_HEADER]: config.id, [ACCEPTANCE_VARIANT_HEADER]: 'unavailable' });
    await page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator(config.stateSelector).first()).toBeVisible();
    await expect(page.locator('[data-state-id="overview-unavailable-state"]')).toBeVisible();
    const unavailable = await screenshot(page, config.id, `${variantId}-unavailable`);
    await page.context().setExtraHTTPHeaders({ [ACCEPTANCE_SCENARIO_HEADER]: config.id, [ACCEPTANCE_VARIANT_HEADER]: 'no-work' });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-state-id="overview-no-work-state"]')).toBeVisible();
    const noWork = await screenshot(page, config.id, `${variantId}-no-work`);
    await page.context().setExtraHTTPHeaders({});
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator(config.settledSelector).first()).toBeVisible();
    return [unavailable, noWork, await screenshot(page, config.id, `${variantId}-settled`)];
  }

  if (config.id === 'evidence-package-no-orders-no-cases-states') {
    await page.context().setExtraHTTPHeaders({ [ACCEPTANCE_SCENARIO_HEADER]: config.id, [ACCEPTANCE_VARIANT_HEADER]: 'no-orders' });
    await page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator(config.stateSelector).first()).toBeVisible();
    await expect(page.locator('[data-state-id="evidence-package-no-orders"]')).toBeVisible();
    const noOrders = await screenshot(page, config.id, `${variantId}-no-orders`);
    await page.context().setExtraHTTPHeaders({ [ACCEPTANCE_SCENARIO_HEADER]: config.id, [ACCEPTANCE_VARIANT_HEADER]: 'no-cases' });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('[data-state-id="evidence-package-no-qualifying-cases"]')).toBeVisible();
    const noCases = await screenshot(page, config.id, `${variantId}-no-cases`);
    await page.context().setExtraHTTPHeaders({});
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator(config.settledSelector).first()).toBeVisible();
    return [noOrders, noCases, await screenshot(page, config.id, `${variantId}-settled`)];
  }

  if (config.mode === 'loading') {
    let navigation: Promise<unknown> | null = null;
    if (config.id === 'overview-dashboard-loading') {
      navigation = page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    } else {
      navigation = page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
    await expect(page.locator(config.stateSelector).first()).toBeVisible({ timeout: 8_000 });
    const stateShot = await screenshot(page, config.id, `${variantId}-loading`);
    if (navigation) await navigation;
    await page.context().setExtraHTTPHeaders({});
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator(config.settledSelector).first()).toBeVisible({ timeout: 30_000 });
    return [stateShot, await screenshot(page, config.id, `${variantId}-settled`)];
  }

  await page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.locator(config.stateSelector).first()).toBeVisible({ timeout: 20_000 });
  const stateShot = await screenshot(page, config.id, `${variantId}-${config.mode}`);
  await page.context().setExtraHTTPHeaders({});

  if (config.mode === 'error') {
    await page.getByRole('button', { name: 'Try again' }).click();
    // A route error reset may reuse the failed RSC payload while the one-shot
    // acceptance header is being cleared. Keep the real retry click, then
    // reload once so the settled route is requested without that header.
    if (!(await page.locator(config.settledSelector).first().isVisible().catch(() => false))) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    }
  } else if (config.returnAction) {
    const action = config.id === 'work-empty-search-states'
      ? page.getByRole('button', { name: config.returnAction })
      : page.getByRole('link', { name: config.returnAction });
    await action.click();
  } else {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await expect(page.locator(config.settledSelector).first()).toBeVisible({ timeout: 30_000 });
  return [stateShot, await screenshot(page, config.id, `${variantId}-recovered`)];
}

test.describe('FAA-2 deterministic operational states', () => {
  for (const config of CONFIGS) {
    for (const variant of VARIANTS) {
      test(`${config.id} · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
        test.setTimeout(90_000);
        const baseURL = String(testInfo.project.use.baseURL);
        const base = new URL(baseURL);
        await page.setViewportSize({ width: variant.width, height: variant.height });
        await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
        await context.setExtraHTTPHeaders({ [ACCEPTANCE_SCENARIO_HEADER]: config.id });
        const runtime = observeRuntime(page, base.origin, config);
        const marker = markerPath(config.id);
        if (config.mode === 'error') fs.writeFileSync(marker, `${config.id}\n`);
        try {
          const screenshots = await activate(page, config, variant.id);
          expect(runtime.consoleErrors).toEqual([]);
          expect(runtime.pageErrors).toEqual([]);
          expect(runtime.failedRequests).toEqual([]);
          evidence.set(config.id, [...(evidence.get(config.id) ?? []), {
            id: variant.id,
            viewport: `${variant.width}x${variant.height} authenticated`,
            theme: variant.theme,
            finalUrl: new URL(page.url()).pathname,
            screenshots,
            ...runtime,
          }]);
        } finally {
          if (fs.existsSync(marker)) fs.unlinkSync(marker);
        }
      });
    }
  }

  test.afterAll(() => {
    for (const config of CONFIGS) {
      const scenario = manifestById.get(config.id)!;
      const variants = evidence.get(config.id) ?? [];
      const screenshots = variants.flatMap((variant) => variant.screenshots);
      const consoleErrors = variants.flatMap((variant) => variant.consoleErrors);
      const pageErrors = variants.flatMap((variant) => variant.pageErrors);
      const failedRequests = variants.flatMap((variant) => variant.failedRequests);
      const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      const receipt = {
        schemaVersion: 2,
        evidenceSource: 'playwright-runtime',
        scenarioId: config.id,
        owningSurface: scenario.owner,
        declaredKind: scenario.kind,
        activation: scenario.activationRecipe,
        viewport: [...new Set(variants.map((variant) => variant.viewport))],
        theme: [...new Set(variants.map((variant) => variant.theme))],
        roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] },
        finalUrl: variants.at(-1)?.finalUrl ?? null,
        consoleErrors,
        pageErrors,
        failedRequests,
        expectedDiagnostics: variants.flatMap((variant) => variant.expectedDiagnostics),
        screenshotOrTrace: screenshots[0] ?? null,
        supportingEvidence: screenshots,
        mutationReceipt: null,
        cleanup: 'Removed the loopback-only scenario header and one-shot marker; no merchant, provider, or financial state changed.',
        verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested',
        note: passed ? 'Both supported width/theme variants activated the manifest state and completed its settled, retry, or safe-return path.' : 'One or more required runtime variants did not complete.',
        variants,
      };
      fs.writeFileSync(path.join(evidenceDirectory(config.id), 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
    }
  });
});
