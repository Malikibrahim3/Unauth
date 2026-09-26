import { expect, test, type APIResponse, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CASE_ID = '1c753dda-f16e-450b-aa68-e81757daf266';
const IDS = ['investigation-request-modal', 'investigation-response-modal', 'investigation-lifecycle-action-modal'] as const;
if (!MERCHANT_ID || !SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Investigation acceptance environment is incomplete');
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const scenarios = new Map(IDS.map((id) => [id, scenarioLedger.find((candidate) => candidate.id === id)]));
for (const id of IDS) if (!scenarios.get(id)) throw new Error(`Missing investigation scenario ${id}`);

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type ScenarioId = typeof IDS[number];
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
const evidence = new Map<ScenarioId, VariantEvidence[]>();

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function fingerprint(value: unknown) { return createHash('sha256').update(stable(value)).digest('hex'); }
function businessState(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(businessState);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'updated_at')
      .map(([key, item]) => [key, businessState(item)]));
  }
  return value;
}
function directory(id: ScenarioId) {
  const value = path.join(ROOT, 'scenarios', id);
  fs.mkdirSync(value, { recursive: true });
  return value;
}
async function screenshot(page: Page, id: ScenarioId, name: string) {
  const file = path.join(directory(id), `${name}.png`);
  await page.screenshot({ path: file });
  return path.relative(ROOT, file);
}
function runtime(page: Page, origin: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(origin)) return;
    const failure = request.failure()?.errorText ?? 'failed';
    if (failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`);
  });
  return { consoleErrors, pageErrors, failedRequests };
}
async function rows(table: string, filters: Record<string, string>) {
  let query = service.from(table).select('*');
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const result = await query;
  if (result.error) throw result.error;
  return [...(result.data ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
}
async function relatedState() {
  const [investigations, evidenceItems, tasks, claim] = await Promise.all([
    rows('case_clarification_requests', { merchant_id: MERCHANT_ID, support_payout_case_id: CASE_ID }),
    rows('evidence_items', { merchant_id: MERCHANT_ID, claim_id: CASE_ID }),
    rows('work_tasks', { merchant_id: MERCHANT_ID, support_payout_case_id: CASE_ID }),
    rows('support_payout_cases', { merchant_id: MERCHANT_ID, id: CASE_ID }),
  ]);
  return { investigations, evidenceItems, tasks, claim };
}
async function responseJson(response: APIResponse) {
  if (!response.ok()) throw new Error(`Investigation request failed (${response.status()}): ${await response.text()}`);
  return await response.json() as Record<string, any>;
}
async function replay(page: Page, response: APIResponse) {
  const request = response.request();
  const key = request.headers()['idempotency-key'];
  expect(key).toBeTruthy();
  const replayed = await page.request.fetch(request.url(), {
    method: request.method(),
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    data: request.postDataJSON(),
  });
  expect(replayed.ok()).toBeTruthy();
  return { key, status: replayed.status(), body: await replayed.json() as Record<string, unknown> };
}
async function restoreClaim(row: Record<string, any> | undefined) {
  if (!row) return;
  const { id, merchant_id: merchantId, created_at: _createdAt, updated_at: _updatedAt, ...fields } = row;
  const result = await service.from('support_payout_cases').update(fields).eq('id', id).eq('merchant_id', merchantId);
  if (result.error) throw result.error;
}
async function cleanup(created: { investigationId?: string; evidenceIds: string[]; taskIds: string[]; claimPre?: Record<string, any> }) {
  let evidenceIds = [...created.evidenceIds];
  let taskIds = [...created.taskIds];
  if (created.investigationId) {
    const [relatedEvidence, relatedTasks] = await Promise.all([
      service.from('evidence_items').select('id').eq('merchant_id', MERCHANT_ID)
        .or(`source_record_id.eq.${created.investigationId},source_metadata->>investigation_id.eq.${created.investigationId}`),
      service.from('work_tasks').select('id').eq('merchant_id', MERCHANT_ID)
        .contains('source_metadata', { investigation_id: created.investigationId }),
    ]);
    if (relatedEvidence.error) throw relatedEvidence.error;
    if (relatedTasks.error) throw relatedTasks.error;
    evidenceIds = [...new Set([...evidenceIds, ...(relatedEvidence.data ?? []).map((row) => row.id)])];
    taskIds = [...new Set([...taskIds, ...(relatedTasks.data ?? []).map((row) => row.id)])];
  }
  if (evidenceIds.length) {
    const result = await service.from('evidence_items').delete().in('id', evidenceIds);
    if (result.error) throw result.error;
  }
  if (taskIds.length) {
    const result = await service.from('work_tasks').delete().in('id', taskIds);
    if (result.error) throw result.error;
  }
  if (created.investigationId) {
    const result = await service.from('case_clarification_requests').delete().eq('id', created.investigationId).eq('merchant_id', MERCHANT_ID);
    if (result.error) throw result.error;
  }
  await restoreClaim(created.claimPre);
}

test.describe.serial('FAA-2 local investigation workflows', () => {
  for (const variant of VARIANTS) {
    test(`investigation lifecycle · ${variant.id}`, async ({ page, context }, testInfo: TestInfo) => {
      test.setTimeout(120_000);
      const base = new URL(String(testInfo.project.use.baseURL));
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
      const observed = runtime(page, base.origin);
      const externalMutations: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.origin !== base.origin && request.method() !== 'GET') externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`);
      });
      const pre = await relatedState();
      const preFingerprint = fingerprint(businessState(pre));
      const preInvestigationIds = new Set(pre.investigations.map((row) => row.id));
      const preEvidenceIds = new Set(pre.evidenceItems.map((row) => row.id));
      const preTaskIds = new Set(pre.tasks.map((row) => row.id));
      const unique = randomUUID();
      const created = { investigationId: undefined as string | undefined, evidenceIds: [] as string[], taskIds: [] as string[], claimPre: pre.claim[0] };
      try {
        await page.goto(`/cases/${CASE_ID}?tab=responsibility`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'Resolve the material evidence gap' })).toBeVisible({ timeout: 20_000 });
        const openButton = page.getByRole('button', { name: /New request|Review request draft/ }).first();
        await openButton.click();
        await expect(page.locator('[data-overlay-id="investigation-request-modal"]')).toBeVisible();
        await page.getByLabel('Material evidence gap').fill(`FAA2 local evidence gap ${unique}`);
        await page.getByLabel('Requested evidence').fill('local fixture record, internal timeline');
        await page.getByLabel('Request summary').fill('Local acceptance investigation request');
        await page.getByLabel('Recipient').fill('acceptance@local.invalid');
        await page.getByLabel('Subject').fill(`FAA2 local request ${unique}`);
        await page.getByLabel('Request body').fill('This is an isolated local acceptance request. Nothing should be sent.');
        const override = page.getByLabel('Override rationale');
        if (await override.count()) await override.fill('Local acceptance uses an isolated factual question.');
        const requestShot = await screenshot(page, 'investigation-request-modal', `${variant.id}-draft-confirmation`);
        const createWait = page.waitForResponse((candidate) => candidate.url().endsWith(`/api/claims/${CASE_ID}/investigations`) && candidate.request().method() === 'POST');
        await page.getByRole('button', { name: 'Save draft' }).click();
        const createResponse = await createWait;
        const createBody = await responseJson(createResponse);
        const investigation = createBody.investigation as Record<string, any>;
        created.investigationId = investigation.id;
        const createReplay = await replay(page, createResponse);
        expect(createReplay.body.investigation).toMatchObject({ id: investigation.id });
        await expect(page.locator(`#investigation-${investigation.id}`)).toBeVisible();

        const card = page.locator(`#investigation-${investigation.id}`);
        await card.getByRole('button', { name: 'Mark sent' }).click();
        await expect(page.locator('[data-overlay-id="investigation-lifecycle-action-modal"]')).toBeVisible();
        await page.getByLabel('Response due').fill('2026-09-10T12:00');
        const lifecycleShot = await screenshot(page, 'investigation-lifecycle-action-modal', `${variant.id}-manual-send-confirmation`);
        const markWait = page.waitForResponse((candidate) => candidate.url().endsWith(`/investigations/${investigation.id}/mark-sent`) && candidate.request().method() === 'POST');
        await page.getByRole('button', { name: 'Mark request sent' }).click();
        const markResponse = await markWait;
        const marked = (await responseJson(markResponse)).investigation as Record<string, any>;
        const markReplay = await replay(page, markResponse);
        expect(markReplay.body.investigation).toMatchObject({ id: investigation.id, status: 'waiting_response' });
        await expect(card.getByRole('button', { name: 'Record response' })).toBeVisible();

        await card.getByRole('button', { name: 'Record response' }).click();
        await expect(page.locator('[data-overlay-id="investigation-response-modal"]')).toBeVisible();
        await page.getByLabel('Outcome').selectOption('inconclusive');
        await page.getByLabel('Response summary').fill(`Local fixture response ${unique}`);
        await page.getByLabel('Full response (optional)').fill('Recorded from the local acceptance fixture; no partner was contacted.');
        await page.getByLabel('Responder name').fill('Local acceptance fixture');
        const responseShot = await screenshot(page, 'investigation-response-modal', `${variant.id}-response-confirmation`);
        const responseWait = page.waitForResponse((candidate) => candidate.url().endsWith(`/investigations/${investigation.id}/response`) && candidate.request().method() === 'POST');
        await page.locator('[data-overlay-id="investigation-response-modal"]').getByRole('button', { name: 'Record response' }).click();
        const recordedResponse = await responseWait;
        const responseBody = await responseJson(recordedResponse);
        const responseReplay = await replay(page, recordedResponse);
        expect(responseReplay.body.investigation).toMatchObject({ id: investigation.id, status: 'response_received' });
        await expect(card.getByRole('button', { name: 'Mark reviewed' })).toBeVisible();

        await card.getByRole('button', { name: 'Mark reviewed' }).click();
        await expect(page.locator('[data-overlay-id="investigation-lifecycle-action-modal"]')).toBeVisible();
        const closeWait = page.waitForResponse((candidate) => candidate.url().endsWith(`/investigations/${investigation.id}/close`) && candidate.request().method() === 'POST');
        await page.getByRole('button', { name: 'Close reviewed response' }).click();
        const closeResponse = await closeWait;
        const closed = (await responseJson(closeResponse)).investigation as Record<string, any>;
        const closeReplay = await replay(page, closeResponse);
        expect(closeReplay.body.investigation).toMatchObject({ id: investigation.id, status: 'closed' });
        expect(closed.state_version).toBeGreaterThan(marked.state_version);

        const persisted = await relatedState();
        const persistedInvestigation = persisted.investigations.find((row) => row.id === investigation.id);
        expect(persistedInvestigation).toMatchObject({ status: 'closed', response_outcome: 'inconclusive' });
        const advisoryReevaluationChangedBusinessState = fingerprint(businessState(persisted.claim)) !== fingerprint(businessState(pre.claim));
        created.evidenceIds = persisted.evidenceItems.filter((row) => !preEvidenceIds.has(row.id)).map((row) => row.id);
        created.taskIds = persisted.tasks.filter((row) => !preTaskIds.has(row.id)).map((row) => row.id);
        expect(externalMutations).toEqual([]);
        expect(observed.consoleErrors).toEqual([]);
        expect(observed.pageErrors).toEqual([]);
        expect(observed.failedRequests).toEqual([]);

        await cleanup(created);
        const post = await relatedState();
        expect(post.investigations.map((row) => row.id).filter((id) => !preInvestigationIds.has(id))).toEqual([]);
        expect(fingerprint(businessState(post))).toBe(preFingerprint);
        const shared = {
          merchantId: MERCHANT_ID,
          actorId: investigation.created_by,
          canonicalRole: 'owner',
          delegatedGrants: [],
          preStateFingerprint: preFingerprint,
          persistedReadBack: { investigationId: investigation.id, finalStatus: persistedInvestigation?.status, responseOutcome: persistedInvestigation?.response_outcome },
          auditOrVersionConsequence: { initialVersion: investigation.state_version, finalVersion: closed.state_version, durableAuditRetained: true, semanticDomainEventsRetained: true },
          externalActions: { provider: false, email: false, billing: false, previewDeployment: false },
          cleanupAction: { investigationId: investigation.id, evidenceIds: created.evidenceIds, taskIds: created.taskIds },
          postCleanupFingerprint: fingerprint(businessState(post)),
          advisoryReevaluationChangedBusinessState,
          invariantException: 'Durable audit, semantic domain events, and database-managed updated_at timestamps are intentionally retained; all mutable investigation, evidence, task, case decision, money, and advisory business fields returned to prestate.',
        };
        const finalUrl = new URL(page.url()).pathname;
        const common = { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl, ...observed };
        evidence.set('investigation-request-modal', [...(evidence.get('investigation-request-modal') ?? []), {
          ...common, screenshots: [requestShot], mutationReceipt: { ...shared, request: { method: 'POST', path: `/api/claims/${CASE_ID}/investigations`, idempotencyKey: createReplay.key, redactedPayload: { subject: '[local acceptance subject]', recipient: 'acceptance@local.invalid' } }, visibleResult: 'Draft saved with explicit no-send copy and appeared in the case timeline.', replayResult: { status: createReplay.status, sameInvestigationId: true } },
        }]);
        evidence.set('investigation-lifecycle-action-modal', [...(evidence.get('investigation-lifecycle-action-modal') ?? []), {
          ...common, screenshots: [lifecycleShot], mutationReceipt: { ...shared, request: { method: 'POST', paths: [`/investigations/${investigation.id}/mark-sent`, `/investigations/${investigation.id}/close`], idempotencyKeys: [markReplay.key, closeReplay.key], redactedPayload: { source_channel: 'manual', close: 'reviewed response' } }, visibleResult: 'Manual bookkeeping moved the local request to waiting and closure moved the reviewed response to closed.', replayResult: { markSentStatus: markReplay.status, closeStatus: closeReplay.status, sameInvestigationId: true } },
        }]);
        evidence.set('investigation-response-modal', [...(evidence.get('investigation-response-modal') ?? []), {
          ...common, screenshots: [responseShot], mutationReceipt: { ...shared, request: { method: 'POST', path: `/investigations/${investigation.id}/response`, idempotencyKey: responseReplay.key, redactedPayload: { outcome: 'inconclusive', responder: '[local fixture]' } }, visibleResult: 'The response appeared as factual evidence while the copy kept it distinct from the merchant decision.', replayResult: { status: responseReplay.status, sameInvestigationId: true }, projectionStatus: { evidence: responseBody.evidence_status, reevaluation: responseBody.reevaluation_status } },
        }]);
        created.investigationId = undefined;
        created.evidenceIds = [];
        created.taskIds = [];
        created.claimPre = undefined;
      } finally {
        await cleanup(created).catch(() => undefined);
      }
    });
  }

  test.afterAll(() => {
    for (const id of IDS) {
      const scenario = scenarios.get(id)!;
      const variants = evidence.get(id) ?? [];
      const screenshots = variants.flatMap((variant) => variant.screenshots);
      const consoleErrors = variants.flatMap((variant) => variant.consoleErrors);
      const pageErrors = variants.flatMap((variant) => variant.pageErrors);
      const failedRequests = variants.flatMap((variant) => variant.failedRequests);
      const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(id), 'receipt.json'), `${JSON.stringify({
        schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: id,
        owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe,
        viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme),
        roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null,
        consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null,
        supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt),
        cleanup: 'Removed mutable local investigation, projected evidence, and generated Work tasks; preserved only durable audit and semantic domain events.',
        verdict: passed ? 'passed' : variants.length ? 'partial' : 'blocked',
        note: passed ? 'Both required variants submitted, read back, replayed, and cleaned the local-only investigation workflow without provider, email, money, or decision action.' : 'The safe local investigation workflow did not complete in every required variant.',
        variants,
      }, null, 2)}\n`);
    }
  });
});
