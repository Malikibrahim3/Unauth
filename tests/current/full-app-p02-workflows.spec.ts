import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ARTIFACT_ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!MERCHANT_ID || !SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('P02 workflow acceptance environment is incomplete');

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const scenario = scenarioLedger.find((candidate) => candidate.id === 'saved-work-views');
if (!scenario) throw new Error('Missing saved-work-views manifest scenario');

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
  mutationReceipt: Record<string, unknown>;
};

const evidence: VariantEvidence[] = [];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value: unknown) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function directory() {
  const value = path.join(ARTIFACT_ROOT, 'scenarios', scenario!.id);
  fs.mkdirSync(value, { recursive: true });
  return value;
}

async function screenshot(page: Page, name: string) {
  const file = path.join(directory(), `${name}.png`);
  await page.screenshot({ path: file });
  return path.relative(ARTIFACT_ROOT, file);
}

function observeRuntime(page: Page, baseOrigin: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(baseOrigin)) return;
    const failure = request.failure()?.errorText ?? 'failed';
    if (failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`);
  });
  return { consoleErrors, pageErrors, failedRequests };
}

async function activeViews(page: Page) {
  const response = await page.request.get('/api/work/views');
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { views?: Array<Record<string, unknown>> };
  return [...(body.views ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

test.describe.serial('FAA-2 local operational workflows', () => {
  for (const variant of VARIANTS) {
    test(`saved-work-views · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
      test.setTimeout(90_000);
      const base = new URL(String(testInfo.project.use.baseURL));
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
      const runtime = observeRuntime(page, base.origin);
      const uniqueName = `FAA2 ${variant.id} ${randomUUID()}`;
      const preState = await activeViews(page);
      const preStateFingerprint = fingerprint(preState);
      const forbiddenExternalRequests: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.origin !== base.origin && request.method() !== 'GET') forbiddenExternalRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      });

      let createdId: string | null = null;
      try {
        await page.goto('/work?view=unassigned&search=acceptance-view&priority=high&sort=priority', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('combobox', { name: 'Saved Work view' })).toBeVisible();
        await page.getByRole('button', { name: 'Save view' }).click();
        await page.getByRole('textbox', { name: 'Saved view name' }).fill(uniqueName);
        const createResponse = page.waitForResponse((response) => response.url().endsWith('/api/work/views') && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        const response = await createResponse;
        expect(response.status()).toBe(201);
        const created = await response.json() as { view: { id: string; owner_user_id: string; definition: Record<string, unknown> } };
        createdId = created.view.id;
        await expect(page.getByRole('option', { name: uniqueName })).toHaveCount(1);

        await page.getByRole('combobox', { name: 'Saved Work view' }).selectOption(createdId);
        await expect(page).toHaveURL(/savedView=/);
        const applied = new URL(page.url());
        expect(applied.searchParams.get('view')).toBe('unassigned');
        expect(applied.searchParams.get('search')).toBe('acceptance-view');
        expect(applied.searchParams.get('priority')).toBe('high');
        expect(applied.searchParams.get('sort')).toBe('priority');

        const readBack = await activeViews(page);
        const persisted = readBack.find((view) => view.id === createdId);
        expect(persisted).toMatchObject({
          id: createdId,
          name: uniqueName,
          definition: { view: 'unassigned', search: 'acceptance-view', priority: 'high', sort: 'priority' },
          is_shared: false,
        });
        const createdShot = await screenshot(page, `${variant.id}-saved-view-applied`);

        const deleteResponse = page.waitForResponse((candidate) => candidate.url().endsWith(`/api/work/views/${createdId}`) && candidate.request().method() === 'DELETE');
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        expect((await deleteResponse).ok()).toBeTruthy();
        await expect(page.getByRole('option', { name: uniqueName })).toHaveCount(0);
        const postState = await activeViews(page);
        expect(fingerprint(postState)).toBe(preStateFingerprint);

        const { data: tombstone, error: tombstoneError } = await service
          .from('work_saved_views')
          .select('id,merchant_id,owner_user_id,name,definition,is_shared,deleted_at')
          .eq('merchant_id', MERCHANT_ID)
          .eq('id', createdId)
          .single();
        expect(tombstoneError).toBeNull();
        expect(tombstone?.deleted_at).toBeTruthy();
        expect(forbiddenExternalRequests).toEqual([]);
        expect(runtime.consoleErrors).toEqual([]);
        expect(runtime.pageErrors).toEqual([]);
        expect(runtime.failedRequests).toEqual([]);

        const cleanedShot = await screenshot(page, `${variant.id}-saved-view-cleaned`);
        evidence.push({
          id: variant.id,
          viewport: `${variant.width}x${variant.height} authenticated`,
          theme: variant.theme,
          finalUrl: new URL(page.url()).pathname,
          screenshots: [createdShot, cleanedShot],
          ...runtime,
          mutationReceipt: {
            scenarioId: scenario!.id,
            merchantId: MERCHANT_ID,
            actorId: created.view.owner_user_id,
            canonicalRole: 'owner',
            delegatedGrants: [],
            preStateFingerprint,
            request: {
              method: 'POST',
              path: '/api/work/views',
              idempotencyKey: null,
              redactedPayload: { name: '[unique local acceptance name]', definition: created.view.definition, isShared: false },
            },
            visibleResult: 'The created view appeared, applied its URL-backed filters, and exposed its owner-authorized Delete action.',
            persistedReadBack: { id: createdId, definition: persisted?.definition, isShared: persisted?.is_shared },
            auditOrVersionConsequence: 'The canonical row was soft-deleted and retained as a timestamped tombstone.',
            externalActions: { provider: false, email: false, billing: false, previewDeployment: false },
            replayResult: 'Not applicable: this existing create contract does not accept an idempotency key; uniqueness protects active owner/name pairs.',
            cleanupAction: `DELETE /api/work/views/${createdId}`,
            postCleanupFingerprint: fingerprint(postState),
            invariantException: { retainedTombstoneId: tombstone?.id, deletedAtPresent: Boolean(tombstone?.deleted_at) },
          },
        });
        createdId = null;
      } finally {
        if (createdId) await page.request.delete(`/api/work/views/${createdId}`).catch(() => undefined);
      }
    });
  }

  test.afterAll(() => {
    const screenshots = evidence.flatMap((variant) => variant.screenshots);
    const consoleErrors = evidence.flatMap((variant) => variant.consoleErrors);
    const pageErrors = evidence.flatMap((variant) => variant.pageErrors);
    const failedRequests = evidence.flatMap((variant) => variant.failedRequests);
    const passed = evidence.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
    const receipt = {
      schemaVersion: 2,
      evidenceSource: 'playwright-runtime',
      scenarioId: scenario!.id,
      owningSurface: scenario!.owner,
      declaredKind: scenario!.kind,
      activation: scenario!.activationRecipe,
      viewport: evidence.map((variant) => variant.viewport),
      theme: evidence.map((variant) => variant.theme),
      roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] },
      finalUrl: evidence.at(-1)?.finalUrl ?? null,
      consoleErrors,
      pageErrors,
      failedRequests,
      expectedDiagnostics: [],
      screenshotOrTrace: screenshots[0] ?? null,
      supportingEvidence: screenshots,
      mutationReceipt: evidence.map((variant) => variant.mutationReceipt),
      cleanup: 'Each created local saved view was soft-deleted through its canonical API; the active API fingerprint returned exactly to prestate and timestamped tombstones were retained.',
      verdict: passed ? 'passed' : evidence.length ? 'partial' : 'untested',
      note: passed ? 'Both required width/theme variants created, persisted, applied, read back, and safely soft-deleted an isolated local saved view.' : 'One or more required workflow variants did not complete.',
      variants: evidence,
    };
    fs.writeFileSync(path.join(directory(), 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  });
});
