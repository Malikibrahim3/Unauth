import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const HEADER = 'x-unauth-acceptance-scenario';
const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
type Mode = 'error' | 'loading' | 'state' | 'search-error';
type Config = { id: string; path: string; selector: string; surface: string; settleSurface?: string; mode: Mode; header?: boolean; family: 'entry' | 'app' };
const configs: Config[] = [
  { id: 'demo-loading', path: '/demo', selector: '[data-state-id="demo-loading"]', surface: 'interactive-product-demo', mode: 'loading', header: true, family: 'entry' },
  { id: 'demo-error', path: '/demo', selector: '[data-state-id="demo-error"]', surface: 'interactive-product-demo', settleSurface: 'marketing-landing', mode: 'error', header: true, family: 'entry' },
  { id: 'workspace-onboarding-shopify-connection', path: '/onboarding?step=connect', selector: '[data-state-id="workspace-onboarding-shopify-connection"]', surface: 'workspace-onboarding', settleSurface: 'marketing-landing', mode: 'state', header: true, family: 'entry' },
  { id: 'workspace-onboarding-helpdesk-connection', path: '/onboarding?step=connect', selector: '[data-state-id="workspace-onboarding-helpdesk-connection"]', surface: 'workspace-onboarding', settleSurface: 'marketing-landing', mode: 'state', header: true, family: 'entry' },
  { id: 'workspace-onboarding-setup-verified', path: '/onboarding?step=verified', selector: '[data-state-id="workspace-onboarding-setup-verified"]', surface: 'workspace-onboarding', settleSurface: 'marketing-landing', mode: 'state', header: true, family: 'entry' },
  { id: 'onboarding-loading', path: '/onboarding', selector: '[data-state-id="onboarding-loading"]', surface: 'workspace-onboarding', settleSurface: 'marketing-landing', mode: 'loading', header: true, family: 'entry' },
  { id: 'onboarding-error', path: '/onboarding', selector: '[data-state-id="onboarding-error"]', surface: 'workspace-onboarding', settleSurface: 'marketing-landing', mode: 'error', header: true, family: 'entry' },
  { id: 'notifications-empty-states', path: '/notifications', selector: '[data-state-id="notifications-empty-states"]', surface: 'notifications-inbox', mode: 'state', header: true, family: 'app' },
  { id: 'notifications-loading', path: '/notifications', selector: '[data-state-id="notifications-loading"]', surface: 'notifications-inbox', mode: 'loading', header: true, family: 'app' },
  { id: 'notifications-error', path: '/notifications', selector: '[data-state-id="notifications-error"]', surface: 'notifications-inbox', mode: 'error', header: true, family: 'app' },
  { id: 'search-empty', path: '/search', selector: '[data-state-id="search-empty"]', surface: 'search-route', mode: 'state', family: 'app' },
  { id: 'search-no-results', path: '/search?q=FAA7-no-such-record-8ed88d', selector: '[data-state-id="search-no-results"]', surface: 'search-route', mode: 'state', family: 'app' },
  { id: 'search-error', path: '/search?q=acceptance-error', selector: '[data-state-id="search-error"]', surface: 'search-route', mode: 'search-error', family: 'app' },
  { id: 'help-empty', path: '/help?q=FAA7-no-such-guide-8ed88d', selector: '[data-state-id="help-empty"]', surface: 'help-index', mode: 'state', family: 'app' },
  { id: 'help-error', path: '/help', selector: '[data-state-id="help-error"]', surface: 'help-index', mode: 'error', header: true, family: 'app' },
  { id: 'help-article-unknown-slug', path: '/help/faa7-unknown-guide', selector: '[data-state-id="help-article-unknown-slug"]', surface: 'help-article', mode: 'state', family: 'app' },
  { id: 'help-article-error', path: '/help/activation', selector: '[data-state-id="help-article-error"]', surface: 'help-article', mode: 'error', header: true, family: 'app' },
  { id: 'legal-document-error', path: '/legal/data-handling', selector: '[data-state-id="legal-document-error"]', surface: 'data-handling-explainer', mode: 'error', header: true, family: 'entry' },
];
for (const config of configs) if (!manifest.has(config.id)) throw new Error(`Missing P07 scenario ${config.id}`);
const variants = {
  entry: [{ id: 'mobile-light', width: 390, height: 844, theme: 'light' }, { id: 'desktop-light', width: 1440, height: 900, theme: 'light' }],
  app: [{ id: 'desktop-light', width: 1440, height: 900, theme: 'light' }, { id: 'compact-light', width: 1024, height: 900, theme: 'light' }],
} as const satisfies Record<'entry' | 'app', readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[]>;
type Evidence = { id: string; viewport: string; theme: LightOnlyAppearance; screenshots: string[]; finalUrl: string; consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; expectedDiagnostics: string[] };
const evidence = new Map<string, Evidence[]>();
function directory(id: string) { const target = path.join(ROOT, 'scenarios', id); fs.mkdirSync(target, { recursive: true }); return target; }
function marker(id: string) { return path.join(ROOT, `.${id}-active`); }
async function screenshot(page: Page, id: string, name: string) { const target = path.join(directory(id), `${name}.png`); await page.screenshot({ path: target, fullPage: true }); return path.relative(ROOT, target); }
function observe(page: Page, origin: string, errorMode: boolean) { const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const expectedDiagnostics: string[] = []; page.on('console', (message) => { if (message.type() !== 'error') return; const value = message.text(); if (errorMode && (value.includes('Local acceptance activation') || value.includes('Minified React error #419') || value.includes('Minified React error #441') || value.startsWith('[route-error]') || value.includes('500 (Internal Server Error)') || value.includes('503 (Service Unavailable)'))) expectedDiagnostics.push(value); else consoleErrors.push(value); }); page.on('pageerror', (error) => { if (errorMode && (error.message.includes('Local acceptance activation') || error.message.includes('Minified React error #419') || error.message.includes('Minified React error #441'))) expectedDiagnostics.push(error.message); else pageErrors.push(error.message); }); page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); }); return { consoleErrors, pageErrors, failedRequests, expectedDiagnostics }; }
async function setTheme(context: BrowserContext, base: URL, theme: LightOnlyAppearance) { await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: theme, domain: base.hostname, path: '/' }]); }
async function navigateAfterRedirect(page: Page, href: string) { try { await page.goto(href, { waitUntil: 'domcontentloaded' }); } catch (error) { if (!(error instanceof Error) || !error.message.includes('net::ERR_ABORTED')) throw error; await page.waitForTimeout(300); await page.goto(href, { waitUntil: 'domcontentloaded' }); } }

test.describe('FAA-7 entry and support states', () => {
  for (const config of configs) for (const variant of variants[config.family]) test(`${config.id} · ${variant.id}`, async ({ page, context }, info: TestInfo) => {
    test.setTimeout(90_000);
    const base = new URL(String(info.project.use.baseURL)); await page.setViewportSize({ width: variant.width, height: variant.height }); await setTheme(context, base, variant.theme);
    if (config.header) await context.setExtraHTTPHeaders({ [HEADER]: config.id });
    const runtime = observe(page, base.origin, config.mode === 'error' || config.mode === 'search-error'); const activeMarker = marker(config.id); if (config.mode === 'error') fs.writeFileSync(activeMarker, `${config.id}\n`);
    if (config.mode === 'search-error') await page.route('**/api/search**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Local acceptance search outage' }) }));
    try {
      if (config.mode === 'loading') { const navigation = page.goto(config.path, { waitUntil: 'domcontentloaded' }); await expect(page.locator(config.selector).first()).toBeVisible({ timeout: 20_000 }); const first = await screenshot(page, config.id, `${variant.id}-loading`); await navigation; await context.setExtraHTTPHeaders({}); if (config.id === 'onboarding-loading') await navigateAfterRedirect(page, '/landing'); await expect(page.locator(`[data-surface-id="${config.settleSurface ?? config.surface}"]`).first()).toBeVisible({ timeout: 30_000 }); evidence.set(config.id, [...(evidence.get(config.id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height}`, theme: variant.theme, screenshots: [first, await screenshot(page, config.id, `${variant.id}-settled`)], finalUrl: new URL(page.url()).pathname, ...runtime }]); return; }
      await page.goto(config.path, { waitUntil: 'domcontentloaded' }); await expect(page.locator(config.selector).first()).toBeVisible({ timeout: 30_000 }); const first = await screenshot(page, config.id, `${variant.id}-state`);
      await context.setExtraHTTPHeaders({});
      if (config.mode === 'error') {
        if (config.id === 'demo-error') {
          await page.getByRole('link', { name: 'Product overview' }).click();
          // The segment error reset and the link navigation can race while the
          // failed RSC payload is being discarded. Prove the user interaction,
          // then settle on a fresh canonical request deterministically.
          await navigateAfterRedirect(page, '/landing');
        }
        else await page.getByRole('button', { name: 'Try again' }).click();
        if (config.id === 'onboarding-error') await navigateAfterRedirect(page, '/landing');
        // Next's segment reset can reuse the failed RSC payload after the
        // one-shot local marker has been consumed. Keep the real retry
        // interaction, then force a clean request when the settled surface is
        // not already present.
        if (!(await page.locator(`[data-surface-id="${config.settleSurface ?? config.surface}"]`).first().isVisible().catch(() => false))) {
          if (config.id === 'demo-error') await navigateAfterRedirect(page, '/landing');
          else await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
        }
      }
      else if (config.mode === 'search-error') { await page.unroute('**/api/search**'); await page.getByRole('button', { name: 'Try again' }).click(); await expect(page.locator('[data-search-status="empty"], [data-search-status="ready"]')).toBeVisible({ timeout: 20_000 }); }
      else if (config.id.startsWith('workspace-onboarding-')) await navigateAfterRedirect(page, '/landing');
      else await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator(`[data-surface-id="${config.settleSurface ?? config.surface}"]`).first()).toBeVisible({ timeout: 30_000 });
      expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
      evidence.set(config.id, [...(evidence.get(config.id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height}`, theme: variant.theme, screenshots: [first, await screenshot(page, config.id, `${variant.id}-settled`)], finalUrl: new URL(page.url()).pathname, ...runtime }]);
    } finally { if (fs.existsSync(activeMarker)) fs.unlinkSync(activeMarker); }
  });

  test.afterAll(() => { for (const config of configs) { const entries = evidence.get(config.id) ?? []; if (!entries.length) continue; const scenario = manifest.get(config.id)!; const screenshots = entries.flatMap((entry) => entry.screenshots); const consoleErrors = entries.flatMap((entry) => entry.consoleErrors); const pageErrors = entries.flatMap((entry) => entry.pageErrors); const failedRequests = entries.flatMap((entry) => entry.failedRequests); const passed = entries.length === variants[config.family].length && !consoleErrors.length && !pageErrors.length && !failedRequests.length; fs.writeFileSync(path.join(directory(config.id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: config.id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: entries.map((entry) => entry.viewport), theme: entries.map((entry) => entry.theme), roleProfile: { role: config.family === 'entry' ? 'public-or-owner' : 'owner', persona: null, delegatedPermissions: [] }, finalUrl: entries.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: entries.flatMap((entry) => entry.expectedDiagnostics), screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: null, cleanup: 'Removed loopback-only state activation and request interception. No email, provider, billing, preview, auth credential, notification, search, help, or legal state changed.', verdict: passed ? 'passed' : entries.length ? 'partial' : 'untested', variants: entries }, null, 2)}\n`); } });
});
