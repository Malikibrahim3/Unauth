import { expect, test, type TestInfo } from '@playwright/test';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import type { LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';
import {
  SCENARIO_HEADER,
  authenticateFixture,
  captureScenario,
  requireRemainingClosurePlan,
  runtimeObserver,
  setLightOnlyAppearance,
  writeScenarioReceipt,
  type RemainingFixturePlan,
} from './remainingClosureHelpers';

const variants = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];
const scenarios = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
const evidence = new Map<string, Array<Record<string, unknown>>>();
let plan: RemainingFixturePlan;

function retain(id: string, entry: Record<string, unknown>) {
  evidence.set(id, [...(evidence.get(id) ?? []), entry]);
}

function receipt(id: string, note: string) {
  const variantsForScenario = evidence.get(id) ?? [];
  const runtimeFailures = variantsForScenario.flatMap((entry) => [
    ...((entry.consoleErrors as string[] | undefined) ?? []),
    ...((entry.pageErrors as string[] | undefined) ?? []),
    ...((entry.failedRequests as string[] | undefined) ?? []),
  ]);
  const scenario = scenarios.get(id);
  writeScenarioReceipt(id, {
    schemaVersion: 1,
    evidenceSource: 'playwright-runtime',
    scenarioId: id,
    owningSurface: scenario?.owner ?? null,
    declaredKind: scenario?.kind ?? null,
    localOnly: true,
    fixture: plan.fixture,
    runId: plan.runId,
    variants: variantsForScenario,
    runtimeFailures,
    verdict: variantsForScenario.length === variants.length && runtimeFailures.length === 0 ? 'passed' : 'partial',
    cleanup: 'No state fixture or product mutation was made by this state-only spec. The purpose-created merchants are removed by exact marker-checked teardown.',
    note,
  });
}

test.beforeAll(() => {
  plan = requireRemainingClosurePlan();
  for (const id of ['api-keys-empty', 'audit-trail-empty', 'billing-unavailable']) {
    if (!scenarios.has(id)) throw new Error(`Manifest scenario ${id} is missing.`);
  }
});

test.describe('FAR-1 independent remaining P06 states', () => {
  for (const variant of variants) {
    test(`api-keys-empty · ${variant.id}`, async ({ page, context }, info: TestInfo) => {
      const baseURL = String(info.project.use.baseURL);
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await setLightOnlyAppearance(context, baseURL, variant.theme);
      await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/developers/api-access');
      const runtime = runtimeObserver(page, baseURL);

      await expect(page.locator('[data-state-id="api-keys-empty"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Create a key' })).toBeEnabled();
      await expect(page.getByText('Enterprise API access is not enabled')).toHaveCount(0);
      const readback = await page.evaluate(async () => {
        const response = await fetch('/api/settings/api-keys');
        return { status: response.status, body: await response.json() as { keys?: unknown[] } };
      });
      expect(readback.status).toBe(200);
      expect(readback.body.keys).toEqual([]);
      const screenshot = await captureScenario(page, 'api-keys-empty', `${variant.id}.png`);
      expect(runtime.consoleErrors).toEqual([]);
      expect(runtime.pageErrors).toEqual([]);
      expect(runtime.failedRequests).toEqual([]);
      retain('api-keys-empty', {
        viewport: `${variant.width}x${variant.height}`,
        theme: variant.theme,
        finalUrl: new URL(page.url()).pathname,
        screenshot,
        apiReadback: { status: readback.status, keyCount: readback.body.keys?.length ?? null },
        ...runtime,
      });
    });

    test(`audit-trail-empty · ${variant.id}`, async ({ page, context }, info: TestInfo) => {
      const baseURL = String(info.project.use.baseURL);
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await setLightOnlyAppearance(context, baseURL, variant.theme);
      await authenticateFixture(page, baseURL, plan.fixtures.settings, '/settings/governance/audit-trail?range=all');
      await context.setExtraHTTPHeaders({ [SCENARIO_HEADER]: 'audit-trail-empty' });
      const runtime = runtimeObserver(page, baseURL);
      await page.goto('/settings/governance/audit-trail?range=all', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-state-id="audit-trail-empty"]')).toBeVisible({ timeout: 30_000 });
      const readback = await page.evaluate(async () => {
        const response = await fetch('/api/audit-trail?limit=200');
        return { status: response.status, body: await response.json() as { rows?: unknown[]; total?: number } };
      });
      expect(readback).toMatchObject({ status: 200, body: { rows: [], total: 0 } });
      const screenshot = await captureScenario(page, 'audit-trail-empty', `${variant.id}.png`);
      expect(runtime.consoleErrors).toEqual([]);
      expect(runtime.pageErrors).toEqual([]);
      expect(runtime.failedRequests).toEqual([]);
      const cleanRuntime = {
        consoleErrors: [...runtime.consoleErrors],
        pageErrors: [...runtime.pageErrors],
        failedRequests: [...runtime.failedRequests],
      };

      // A client-side filtered empty result is not the canonical empty API state.
      await context.setExtraHTTPHeaders({});
      await context.route('**/api/audit-trail*', async (route) => {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          rows: [{
            id: 'fixture-event', actor_user_id: null, action: 'fixture_event', resource_type: 'system', resource_id: null,
            metadata: {}, created_at: '2026-08-31T00:00:00.000Z',
          }], total: 1,
        }) });
      });
      await page.goto('/settings/governance/audit-trail?range=all&search=definitely-no-match', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('No events match these filters.')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-state-id="audit-trail-empty"]')).toHaveCount(0);
      await context.unroute('**/api/audit-trail*');

      await context.route('**/api/audit-trail*', async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic local read failure' }) });
      });
      await page.goto('/settings/governance/audit-trail?range=all', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('alert').filter({ hasText: 'Synthetic local read failure' })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-state-id="audit-trail-empty"]')).toHaveCount(0);
      await context.unroute('**/api/audit-trail*');

      retain('audit-trail-empty', {
        viewport: `${variant.width}x${variant.height}`,
        theme: variant.theme,
        finalUrl: '/settings/governance/audit-trail',
        screenshot,
        apiReadback: { status: readback.status, rows: readback.body.rows?.length ?? null, total: readback.body.total ?? null },
        negatives: { filteredEmptyDistinct: true, requestErrorDistinct: true },
        ...cleanRuntime,
      });
    });

    test(`billing-unavailable · ${variant.id}`, async ({ page, context }, info: TestInfo) => {
      const baseURL = String(info.project.use.baseURL);
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await setLightOnlyAppearance(context, baseURL, variant.theme);
      await authenticateFixture(page, baseURL, plan.fixtures.privacy, '/settings/billing');
      const runtime = runtimeObserver(page, baseURL);

      await expect(page.locator('[data-state-id="billing-unavailable"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Billing unavailable')).toBeVisible();
      await expect(page.getByText('Monthly left')).toHaveCount(0);
      const readback = await page.evaluate(async () => {
        const response = await fetch('/api/billing');
        return { status: response.status, body: await response.json() as { status?: string } };
      });
      expect(readback).toEqual({ status: 200, body: { status: 'not_configured' } });
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.locator('[data-state-id="billing-unavailable"]')).toBeVisible();
      const screenshot = await captureScenario(page, 'billing-unavailable', `${variant.id}.png`);
      expect(runtime.consoleErrors).toEqual([]);
      expect(runtime.pageErrors).toEqual([]);
      expect(runtime.failedRequests).toEqual([]);
      retain('billing-unavailable', {
        viewport: `${variant.width}x${variant.height}`,
        theme: variant.theme,
        finalUrl: new URL(page.url()).pathname,
        screenshot,
        apiReadback: readback,
        retry: 'remained unavailable with no plan, balance, or payment values',
        ...runtime,
      });
    });
  }

  test.afterAll(() => {
    receipt('api-keys-empty', 'An eligible active Scale-shaped fixture returned the canonical successful empty keys response and retained the create control.');
    receipt('audit-trail-empty', 'The local-only route guard returned the canonical successful empty response only under its exact scenario, while filtered and error states remained distinct.');
    receipt('billing-unavailable', 'The purpose-created no-billing fixture returned the existing not_configured contract and remained unavailable after retry.');
  });
});
