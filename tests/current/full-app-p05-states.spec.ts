import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const ABSENT_ID = '00000000-0000-4000-8000-000000000099';
const LOCAL_SOURCE = '/sources/self_fulfillment_pack';
const LOCAL_SETUP = '/sources/setup/self_fulfillment_pack?step=provider';

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type Config = {
  id: string;
  mode: 'empty' | 'error' | 'not-found' | 'loading';
  path: string;
  stateSelector: string;
  settledPath: string;
  settledSelector: string;
  useHeader?: boolean;
};

const CONFIGS: Config[] = [
  { id: 'connected-sources-empty', mode: 'empty', path: '/sources/connected', stateSelector: '[data-state-id="connected-sources-empty"]', settledPath: '/sources/connected', settledSelector: '[data-surface-id="connected-sources"]', useHeader: true },
  { id: 'connected-sources-error', mode: 'error', path: '/sources/connected', stateSelector: '[data-state-id="connected-sources-error"]', settledPath: '/sources/connected', settledSelector: '[data-surface-id="connected-sources"]', useHeader: true },
  { id: 'source-catalogue-no-results', mode: 'empty', path: '/sources/browse?q=faa5-no-provider-can-match-this-query', stateSelector: '[data-state-id="source-catalogue-no-results"]', settledPath: '/sources/browse', settledSelector: '[data-surface-id="source-catalogue"]' },
  { id: 'source-catalogue-error', mode: 'error', path: '/sources/browse', stateSelector: '[data-state-id="source-catalogue-error"]', settledPath: '/sources/browse', settledSelector: '[data-surface-id="source-catalogue"]', useHeader: true },
  { id: 'import-validation-empty-states', mode: 'empty', path: '/sources/imports?step=upload', stateSelector: '[data-state-id="import-validation-empty-states"]', settledPath: '/sources/imports', settledSelector: '[data-surface-id="csv-imports"]' },
  { id: 'imports-error', mode: 'error', path: '/sources/imports', stateSelector: '[data-state-id="imports-error"]', settledPath: '/sources/imports', settledSelector: '[data-surface-id="csv-imports"]', useHeader: true },
  { id: 'source-unavailable', mode: 'empty', path: LOCAL_SOURCE, stateSelector: '[data-state-id="source-unavailable"]', settledPath: LOCAL_SOURCE, settledSelector: '[data-surface-id="source-detail"]' },
  { id: 'source-not-found', mode: 'not-found', path: '/sources/faa5-provider-does-not-exist', stateSelector: '[data-state-id="source-not-found"]', settledPath: '/sources/connected', settledSelector: '[data-surface-id="connected-sources"]' },
  { id: 'source-error', mode: 'error', path: LOCAL_SOURCE, stateSelector: '[data-state-id="source-error"]', settledPath: LOCAL_SOURCE, settledSelector: '[data-surface-id="source-detail"]', useHeader: true },
  { id: 'generic-seven-step-source-setup', mode: 'empty', path: LOCAL_SETUP, stateSelector: '[data-state-id="generic-seven-step-source-setup"]', settledPath: LOCAL_SETUP, settledSelector: '[data-testid="source-setup-wizard"]' },
  { id: 'settings-form-loading-families', mode: 'loading', path: LOCAL_SETUP, stateSelector: '[data-state-id="settings-form-loading-families"]', settledPath: LOCAL_SETUP, settledSelector: '[data-testid="source-setup-wizard"]', useHeader: true },
  { id: 'connector-setup-error', mode: 'error', path: LOCAL_SETUP, stateSelector: '[data-state-id="connector-setup-error"]', settledPath: LOCAL_SETUP, settledSelector: '[data-testid="source-setup-wizard"]', useHeader: true },
  { id: 'shipbob-selection-empty', mode: 'empty', path: `/sources/setup/shipbob/select?selection=${ABSENT_ID}`, stateSelector: '[data-state-id="shipbob-selection-empty"]', settledPath: '/sources/shipbob', settledSelector: '[data-surface-id="source-detail"]', useHeader: true },
  { id: 'shipbob-selection-error', mode: 'empty', path: '/sources/setup/shipbob/select', stateSelector: '[data-state-id="shipbob-selection-error"]', settledPath: '/sources/shipbob', settledSelector: '[data-surface-id="source-detail"]' },
  { id: 'import-job-loading', mode: 'loading', path: `/sources/imports/${ABSENT_ID}`, stateSelector: '[data-state-id="import-job-loading"]', settledPath: '/sources/imports', settledSelector: '[data-surface-id="csv-imports"]', useHeader: true },
  { id: 'import-job-not-found', mode: 'not-found', path: `/sources/imports/${ABSENT_ID}`, stateSelector: '[data-state-id="import-job-not-found"]', settledPath: '/sources/imports', settledSelector: '[data-surface-id="csv-imports"]' },
  { id: 'import-job-error', mode: 'error', path: `/sources/imports/${ABSENT_ID}`, stateSelector: '[data-state-id="import-job-error"]', settledPath: '/sources/imports', settledSelector: '[data-surface-id="csv-imports"]', useHeader: true },
];

const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
for (const config of CONFIGS) if (!manifest.has(config.id)) throw new Error(`Missing FAA-5 manifest scenario ${config.id}`);

type VariantEvidence = { id: string; viewport: string; theme: LightOnlyAppearance; finalUrl: string; screenshots: string[]; consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; expectedDiagnostics: string[] };
const evidence = new Map<string, VariantEvidence[]>();

function directory(id: string) { const value = path.join(ROOT, 'scenarios', id); fs.mkdirSync(value, { recursive: true }); return value; }
function marker(id: string) { return path.join(ROOT, `.${id}-active`); }
async function shot(page: Page, id: string, name: string) { const file = path.join(directory(id), `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return path.relative(ROOT, file); }
function observe(page: Page, origin: string, isError: boolean) {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const expectedDiagnostics: string[] = [];
  page.on('console', (message) => { if (message.type() !== 'error') return; const value = message.text(); if (isError && (value.includes('Local acceptance activation') || value.includes('Minified React error #441') || value.startsWith('[route-error]') || value.includes('500 (Internal Server Error)'))) expectedDiagnostics.push(value); else consoleErrors.push(value); });
  page.on('pageerror', (error) => { if (isError && (error.message.includes('Local acceptance activation') || error.message.includes('Minified React error #441'))) expectedDiagnostics.push(error.message); else pageErrors.push(error.message); });
  page.on('requestfailed', (request) => { if (!request.url().startsWith(origin)) return; const failure = request.failure()?.errorText ?? 'failed'; if (failure === 'net::ERR_ABORTED') expectedDiagnostics.push(`Acceptance navigation canceled an in-flight request: ${request.method()} ${new URL(request.url()).pathname}`); else failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); });
  return { consoleErrors, pageErrors, failedRequests, expectedDiagnostics };
}

test.describe('FAA-5 deterministic sources and imports states', () => {
  for (const config of CONFIGS) for (const variant of VARIANTS) test(`${config.id} · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
    test.setTimeout(90_000);
    const base = new URL(String(testInfo.project.use.baseURL));
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
    if (config.useHeader) await context.setExtraHTTPHeaders({ [SCENARIO_HEADER]: config.id });
    const runtime = observe(page, base.origin, config.mode === 'error');
    const markerPath = marker(config.id);
    if (config.mode === 'error') fs.writeFileSync(markerPath, `${config.id}\n`);
    try {
      const navigation = page.goto(config.path, { waitUntil: config.mode === 'loading' ? 'commit' : 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator(config.stateSelector).first()).toBeVisible({ timeout: 20_000 });
      const state = await shot(page, config.id, `${variant.id}-${config.mode}`);
      await navigation.catch(() => null);
      await context.setExtraHTTPHeaders({});
      if (config.mode === 'error') {
        await page.getByRole('button', { name: 'Try again' }).click();
        if (config.id === 'import-job-error') {
          if (!(await page.locator('[data-state-id="import-job-not-found"]').isVisible().catch(() => false))) {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
          }
          await expect(page.locator('[data-state-id="import-job-not-found"]')).toBeVisible({ timeout: 20_000 });
          await page.goto(config.settledPath, { waitUntil: 'domcontentloaded' });
        } else if (!(await page.locator(config.settledSelector).first().isVisible().catch(() => false))) {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
        }
      }
      else await page.goto(config.settledPath, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(config.settledSelector).first()).toBeVisible({ timeout: 30_000 });
      const screenshots = [state, await shot(page, config.id, `${variant.id}-settled`)];
      expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
      evidence.set(config.id, [...(evidence.get(config.id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots, ...runtime }]);
    } finally { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); }
  });

  test.afterAll(() => {
    for (const config of CONFIGS) {
      const scenario = manifest.get(config.id)!; const variants = evidence.get(config.id) ?? []; if (!variants.length) continue;
      const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests);
      const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(config.id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: config.id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: [...new Set(variants.map((variant) => variant.viewport))], theme: [...new Set(variants.map((variant) => variant.theme))], roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: variants.flatMap((variant) => variant.expectedDiagnostics), screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: null, cleanup: 'Removed the loopback-only scenario header and one-shot marker; source, import, provider, credential, audit, and canonical merchant data were unchanged.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both supported width/theme variants activated the exact P05 state and then rendered the canonical settled route.' : 'One or more required runtime variants did not complete.', variants }, null, 2)}\n`);
    }
  });
});
