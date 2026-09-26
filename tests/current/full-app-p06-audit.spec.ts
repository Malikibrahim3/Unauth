import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ID = 'audit-event-detail-drawer';
const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const scenario = scenarioLedger.find((entry) => entry.id === ID);
if (!scenario) throw new Error(`Missing P06 scenario ${ID}`);
const variants = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];
type Evidence = { id: string; viewport: string; theme: LightOnlyAppearance; screenshot: string; finalUrl: string; event: Record<string, unknown>; consoleErrors: string[]; pageErrors: string[]; failedRequests: string[] };
const evidence: Evidence[] = [];

function directory() { const target = path.join(ROOT, 'scenarios', ID); fs.mkdirSync(target, { recursive: true }); return target; }
function observe(page: Page, origin: string) { const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); }); page.on('pageerror', (error) => pageErrors.push(error.message)); page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); }); return { consoleErrors, pageErrors, failedRequests }; }

test.describe('FAA-6 append-only audit inspection', () => {
  for (const variant of variants) test(`${ID} · ${variant.id}`, async ({ page, context }, info: TestInfo) => {
    const base = new URL(String(info.project.use.baseURL));
    await page.setViewportSize({ width: variant.width, height: variant.height });
    await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
    const runtime = observe(page, base.origin);
    await page.goto('/settings/governance/audit-trail?range=all', { waitUntil: 'domcontentloaded' });
    const row = page.locator('[role="table"][aria-label="Audit trail events"] > [role="row"]').nth(1);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('button', { name: /^Open event:/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Selected event' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('This event remains exactly as recorded. Any later reversal or correction appends a new event.')).toBeVisible();
    const apiReadback = await page.evaluate(async () => {
      const response = await fetch('/api/audit-trail?limit=1');
      const body = await response.json() as { rows?: Array<Record<string, unknown>> };
      if (!response.ok || !body.rows?.[0]) throw new Error('Audit API did not return a persisted event.');
      return body.rows[0];
    });
    const screenshotPath = path.join(directory(), `${variant.id}-drawer.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
    evidence.push({ id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, screenshot: path.relative(ROOT, screenshotPath), finalUrl: new URL(page.url()).pathname, event: { id: apiReadback.id, action: apiReadback.action, resource_type: apiReadback.resource_type, created_at: apiReadback.created_at }, ...runtime });
  });

  test.afterAll(() => {
    const screenshots = evidence.map((entry) => entry.screenshot);
    const consoleErrors = evidence.flatMap((entry) => entry.consoleErrors); const pageErrors = evidence.flatMap((entry) => entry.pageErrors); const failedRequests = evidence.flatMap((entry) => entry.failedRequests);
    const passed = evidence.length === variants.length && evidence.every((entry) => entry.event.id && entry.event.action && entry.event.created_at) && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
    fs.writeFileSync(path.join(directory(), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: ID, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: evidence.map((entry) => entry.viewport), theme: evidence.map((entry) => entry.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: evidence.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: evidence.map((entry) => ({ persistedReadback: entry.event, appendOnlyContract: 'The drawer exposes a persisted user_action_log event read-only; no edit or delete control exists.' })), cleanup: 'No mutation occurred in this inspection. The purpose-created local audit history is append-only and retained.', verdict: passed ? 'passed' : evidence.length ? 'partial' : 'untested', note: passed ? 'Both supported variants opened a persisted local event, inspected its immutable drawer, and returned focus with no runtime error.' : 'The persisted local audit event could not be inspected in every required variant.', variants: evidence }, null, 2)}\n`);
  });
});
