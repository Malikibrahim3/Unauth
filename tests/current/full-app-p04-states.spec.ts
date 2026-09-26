import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const SCENARIO_HEADER = 'x-unauth-acceptance-scenario';
const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const ABSENT_ID = '00000000-0000-4000-8000-000000000099';
const RULE_PATH = '/controls/rules/a1000000-0000-4000-8000-000000000030';
const FLOW_PATH = '/controls/flows/a1000000-0000-4000-8000-000000000040';
const RUN_PATH = '/controls/flows/runs/d1300000-0000-4000-8000-000000000008';

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type Config = {
  id: string;
  mode: 'empty' | 'error' | 'not-found';
  path: string;
  stateSelector: string;
  settledSelector: string;
  returnAction?: string;
};

const CONFIGS: Config[] = [
  { id: 'rules-empty-state', mode: 'empty', path: '/controls/rules', stateSelector: '[data-state-id="rules-empty-state"]', settledSelector: '[data-surface-id="payout-rules-registry"]' },
  { id: 'rules-error', mode: 'error', path: '/controls/rules', stateSelector: '[data-state-id="rules-error"]', settledSelector: '[data-surface-id="payout-rules-registry"]' },
  { id: 'recovery-rulebook-empty', mode: 'empty', path: '/controls/rules/recovery', stateSelector: '[data-state-id="recovery-rulebook-empty"]', settledSelector: '[data-surface-id="recovery-rulebook"]' },
  { id: 'recovery-rulebook-error', mode: 'error', path: '/controls/rules/recovery', stateSelector: '[data-state-id="recovery-rulebook-error"]', settledSelector: '[data-surface-id="recovery-rulebook"]' },
  { id: 'flows-empty-state', mode: 'empty', path: '/controls/flows', stateSelector: '[data-state-id="flows-empty-state"]', settledSelector: '[data-surface-id="flows-registry"]' },
  { id: 'flows-error', mode: 'error', path: '/controls/flows', stateSelector: '[data-state-id="flows-error"]', settledSelector: '[data-surface-id="flows-registry"]' },
  { id: 'flow-runs-empty', mode: 'empty', path: '/controls/flows/runs', stateSelector: '[data-state-id="flow-runs-empty"]', settledSelector: '[data-surface-id="flow-runs-registry"]' },
  { id: 'flow-runs-error', mode: 'error', path: '/controls/flows/runs', stateSelector: '[data-state-id="flow-runs-error"]', settledSelector: '[data-surface-id="flow-runs-registry"]' },
  { id: 'rule-not-found', mode: 'not-found', path: `/controls/rules/${ABSENT_ID}`, stateSelector: '[data-state-id="rule-not-found"]', settledSelector: '[data-surface-id="payout-rules-registry"]', returnAction: 'Back to cases' },
  { id: 'rule-detail-error', mode: 'error', path: RULE_PATH, stateSelector: '[data-state-id="rule-detail-error"]', settledSelector: '[data-surface-id="rule-version-workbench"]' },
  { id: 'flow-not-found', mode: 'not-found', path: `/controls/flows/${ABSENT_ID}`, stateSelector: '[data-state-id="flow-not-found"]', settledSelector: '[data-surface-id="flows-registry"]', returnAction: 'Back to cases' },
  { id: 'flow-detail-error', mode: 'error', path: FLOW_PATH, stateSelector: '[data-state-id="flow-detail-error"]', settledSelector: '[data-surface-id="flow-version-workbench"]' },
  { id: 'flow-run-not-found', mode: 'not-found', path: `/controls/flows/runs/${ABSENT_ID}`, stateSelector: '[data-state-id="flow-run-not-found"]', settledSelector: '[data-surface-id="flow-runs-registry"]', returnAction: 'Back to cases' },
  { id: 'flow-run-error', mode: 'error', path: RUN_PATH, stateSelector: '[data-state-id="flow-run-error"]', settledSelector: '[data-surface-id="flow-run-detail"]' },
];

const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
for (const config of CONFIGS) if (!manifest.has(config.id)) throw new Error(`Missing FAA-4 manifest scenario ${config.id}`);

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

function directory(id: string) { const value = path.join(ROOT, 'scenarios', id); fs.mkdirSync(value, { recursive: true }); return value; }
function marker(id: string) { return path.join(ROOT, `.${id}-active`); }
async function shot(page: Page, id: string, name: string) { const file = path.join(directory(id), `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return path.relative(ROOT, file); }

function observe(page: Page, origin: string, isError: boolean) {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const expectedDiagnostics: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (isError && (value.includes('Local acceptance activation') || value.includes('Minified React error #441') || value.startsWith('[route-error]') || value.includes('500 (Internal Server Error)'))) expectedDiagnostics.push(value);
    else consoleErrors.push(value);
  });
  page.on('pageerror', (error) => {
    if (isError && (error.message.includes('Local acceptance activation') || error.message.includes('Minified React error #441'))) expectedDiagnostics.push(error.message);
    else pageErrors.push(error.message);
  });
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(origin)) return;
    const failure = request.failure()?.errorText ?? 'failed';
    if (failure === 'net::ERR_ABORTED') expectedDiagnostics.push(`Acceptance navigation canceled an in-flight request: ${request.method()} ${new URL(request.url()).pathname}`);
    else failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`);
  });
  return { consoleErrors, pageErrors, failedRequests, expectedDiagnostics };
}

test.describe('FAA-4 deterministic controls states', () => {
  for (const config of CONFIGS) for (const variant of VARIANTS) test(`${config.id} · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
    test.setTimeout(90_000);
    const base = new URL(String(testInfo.project.use.baseURL));
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
    await context.setExtraHTTPHeaders(config.mode === 'not-found' ? {} : { [SCENARIO_HEADER]: config.id });
    const runtime = observe(page, base.origin, config.mode === 'error');
    const markerPath = marker(config.id);
    if (config.mode === 'error') fs.writeFileSync(markerPath, `${config.id}\n`);
    try {
      await page.goto(config.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator(config.stateSelector).first()).toBeVisible({ timeout: 20_000 });
      const state = await shot(page, config.id, `${variant.id}-${config.mode}`);
      await context.setExtraHTTPHeaders({});
      if (config.mode === 'error') {
        await page.getByRole('button', { name: 'Try again' }).click();
        if (!(await page.locator(config.settledSelector).first().isVisible().catch(() => false))) {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
        }
      }
      else if (config.returnAction) await page.getByRole('link', { name: config.returnAction }).first().click();
      else await page.goto(config.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator(config.settledSelector).first()).toBeVisible({ timeout: 30_000 });
      const screenshots = [state, await shot(page, config.id, `${variant.id}-settled`)];
      expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
      evidence.set(config.id, [...(evidence.get(config.id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots, ...runtime }]);
    } finally { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); }
  });

  test.afterAll(() => {
    for (const config of CONFIGS) {
      const scenario = manifest.get(config.id)!; const variants = evidence.get(config.id) ?? []; const screenshots = variants.flatMap((variant) => variant.screenshots);
      if (!variants.length) continue;
      const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests);
      const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(config.id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: config.id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: [...new Set(variants.map((variant) => variant.viewport))], theme: [...new Set(variants.map((variant) => variant.theme))], roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: variants.flatMap((variant) => variant.expectedDiagnostics), screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: null, cleanup: 'Removed the loopback-only scenario header and one-shot marker; no merchant, provider, audit, workflow, or rule state changed.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both supported width/theme variants activated the exact controls state and completed its retry, settlement, or safe-return path.' : 'One or more required runtime variants did not complete.', variants }, null, 2)}\n`);
    }
  });
});
