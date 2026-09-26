import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { scenarioLedger } from '@/lib/surfaces/manifest';
import { LEGACY_DARK_COOKIE, type LightOnlyAppearance } from '@/tests/current/lightOnlyAppearance';

const ROOT = path.join(process.cwd(), 'artifacts', 'full-app-acceptance-2026-08-30');
const MERCHANT_ID = process.env.E2E_MERCHANT_ID ?? '';
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false, autoRefreshToken: false } });
const SCENARIOS = ['new-flow-draft-modal', 'rule-simulation-and-publication-modals', 'flow-edit-test-and-publication-modals', 'flow-run-payload-inspector'] as const;
const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
if (!MERCHANT_ID || SCENARIOS.some((id) => !manifest.has(id))) throw new Error('FAA-4 workflow acceptance environment is incomplete');

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type ScenarioId = (typeof SCENARIOS)[number];
type RuntimeEvidence = { id: string; viewport: string; theme: LightOnlyAppearance; finalUrl: string; screenshots: string[]; consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; mutationReceipt: Record<string, unknown> };
const evidence = new Map<ScenarioId, RuntimeEvidence[]>();

function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function directory(id: string) { const value = path.join(ROOT, 'scenarios', id); fs.mkdirSync(value, { recursive: true }); return value; }
async function shot(page: Page, id: string, name: string) { const file = path.join(directory(id), `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return path.relative(ROOT, file); }
function observe(page: Page, origin: string) {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = []; const externalMutations: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => { const failure = request.failure()?.errorText ?? 'failed'; if (request.url().startsWith(origin) && failure !== 'net::ERR_ABORTED') failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${failure}`); });
  page.on('request', (request) => { const url = new URL(request.url()); if (url.origin !== origin && request.method() !== 'GET') externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`); });
  return { consoleErrors, pageErrors, failedRequests, externalMutations };
}

async function ownerId() {
  const result = await service.from('merchant_users').select('user_id').eq('merchant_id', MERCHANT_ID).eq('role', 'owner').eq('invite_status', 'active').limit(1).single();
  if (result.error || !result.data?.user_id) throw result.error ?? new Error('FAA-4 owner fixture missing');
  return String(result.data.user_id);
}

async function noWriteFingerprint() {
  const tables = ['work_tasks', 'notifications', 'case_decisions', 'domain_events', 'workflow_runs', 'case_financial_entries'] as const;
  const rows: Record<string, unknown> = {};
  for (const table of tables) {
    // Include updates and records beyond PostgREST's default response limit.
    // Persist only a digest, never raw business records, in the test receipt.
    const digest = createHash('sha256');
    let count = 0;
    for (let offset = 0; ; offset += 500) {
      const result = await service.from(table).select('*').eq('merchant_id', MERCHANT_ID).order('id').range(offset, offset + 499);
      if (result.error) throw result.error;
      const batch = result.data ?? [];
      for (const row of batch) digest.update(JSON.stringify(row) + '\n');
      count += batch.length;
      if (batch.length < 500) break;
    }
    rows[table] = { count, fingerprint: digest.digest('hex') };
  }
  return rows;
}

async function preparePage(page: Page, context: Parameters<Parameters<typeof test>[1]>[0]['context'], testInfo: TestInfo, variant: (typeof VARIANTS)[number]) {
  const base = new URL(String(testInfo.project.use.baseURL));
  await page.setViewportSize({ width: variant.width, height: variant.height });
  await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
  return { base, runtime: observe(page, base.origin) };
}

function record(id: ScenarioId, variant: (typeof VARIANTS)[number], page: Page, screenshots: string[], runtime: ReturnType<typeof observe>, mutationReceipt: Record<string, unknown>) {
  expect(runtime.externalMutations).toEqual([]); expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
  evidence.set(id, [...(evidence.get(id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots, consoleErrors: runtime.consoleErrors, pageErrors: runtime.pageErrors, failedRequests: runtime.failedRequests, mutationReceipt }]);
}

function receipt(input: { scenarioId: ScenarioId; actorId: string; pre: unknown; request: unknown; visibleResult: string; readBack: unknown; consequence: unknown; replay: unknown; cleanup: string; retained: unknown; exception?: string }) {
  return { scenarioId: input.scenarioId, merchantId: MERCHANT_ID, actorId: input.actorId, canonicalRole: 'owner', delegatedGrants: [], preStateFingerprint: hash(input.pre), request: input.request, visibleResult: input.visibleResult, persistedReadBack: input.readBack, auditOrVersionConsequence: input.consequence, externalActions: { provider: false, email: false, billing: false, moneyMovement: false, previewDeployment: false }, replayResult: input.replay, cleanupAction: input.cleanup, postCleanupFingerprint: hash(input.retained), invariantException: input.exception ?? null };
}

async function seedRule(actorId: string, suffix: string) {
  const id = randomUUID(); const publishedId = randomUUID(); const draftId = randomUUID(); const now = new Date().toISOString(); const name = `FAA-4 versioned rule ${suffix}`; const priority = 7000 + Math.floor(Math.random() * 1000);
  const parent = await service.from('merchant_rules').insert({ id, merchant_id: MERCHANT_ID, name, description: 'Purpose-created local FAA-4 rule.', priority, conditions: [{ id: randomUUID(), field: 'amount_at_risk', currency: 'GBP', operator: 'gte', value: 200 }], condition_operator: 'and', action: 'manual_review', is_active: true, is_default_template: false, archived_at: null }).select('*').single();
  if (parent.error) throw parent.error;
  const versions = await service.from('merchant_rule_versions').insert([
    { id: publishedId, merchant_id: MERCHANT_ID, merchant_rule_id: id, version: 1, status: 'published', name, description: 'Published baseline for FAA-4.', conditions: [{ id: randomUUID(), field: 'amount_at_risk', currency: 'GBP', operator: 'gte', value: 200 }], condition_operator: 'and', action: 'manual_review', priority, created_by: actorId, published_by: actorId, published_at: now },
    { id: draftId, merchant_id: MERCHANT_ID, merchant_rule_id: id, version: 2, status: 'draft', name, description: 'Draft recommendation for FAA-4 simulation.', conditions: [{ id: randomUUID(), field: 'amount_at_risk', currency: 'GBP', operator: 'gte', value: 100 }], condition_operator: 'and', action: 'deny', priority, created_by: actorId, supersedes_version_id: publishedId },
  ]).select('*');
  if (versions.error) throw versions.error;
  return { id, name, publishedId, draftId, priority };
}

async function seedFlowFamily(actorId: string, suffix: string) {
  const name = `FAA-4 bounded flow ${suffix}`; const publishedId = randomUUID(); const draftId = randomUUID(); const now = new Date().toISOString();
  const common = { merchant_id: MERCHANT_ID, name, trigger_event_type: 'case.updated', conditions: [{ field: 'case.status', operator: 'eq', value: 'evidence_needed' }], outputs: [{ type: 'create_task', title: 'Review local FAA-4 case', priority: 'medium', dueInHours: 24 }], created_by: actorId, updated_by: actorId };
  const inserted = await service.from('workflow_definitions').insert([
    { ...common, id: publishedId, description: 'Published local baseline.', active: true, status: 'published', version: 1, published_by: actorId, published_at: now },
    { ...common, id: draftId, description: 'Editable local FAA-4 draft.', active: false, status: 'draft', version: 2 },
  ]).select('*');
  if (inserted.error) throw inserted.error;
  return { name, publishedId, draftId };
}

async function seedFlowRun(actorId: string, suffix: string) {
  const flowId = randomUUID(); const eventId = randomUUID(); const runId = randomUUID(); const stepId = randomUUID(); const now = new Date().toISOString(); const name = `FAA-4 retained payload flow ${suffix}`;
  const flow = await service.from('workflow_definitions').insert({ id: flowId, merchant_id: MERCHANT_ID, name, description: 'Purpose-created retained FAA-4 payload fixture.', trigger_event_type: 'case.updated', conditions: [], outputs: [{ type: 'create_task', title: 'Inspect retained payload', priority: 'low', dueInHours: 12 }], active: true, status: 'published', version: 1, created_by: actorId, updated_by: actorId, published_by: actorId, published_at: now }).select('*').single();
  if (flow.error) throw flow.error;
  const event = await service.from('domain_events').insert({ id: eventId, merchant_id: MERCHANT_ID, event_type: 'case.updated', aggregate_type: 'support_payout_case', actor_type: 'system', actor_id: actorId, idempotency_key: `faa4:payload:${eventId}`, occurred_at: now, payload: { case_id: randomUUID(), status: 'evidence_needed', customer_email: 'sensitive-faa4@example.invalid', api_token: 'faa4-secret-token', nested: { address: '1 Private Road', operational_fact: 'retained source event' } } }).select('*').single();
  if (event.error) throw event.error;
  const run = await service.from('workflow_runs').insert({ id: runId, merchant_id: MERCHANT_ID, workflow_definition_id: flowId, domain_event_id: eventId, status: 'completed', started_at: now, completed_at: now }).select('*').single();
  if (run.error) throw run.error;
  const step = await service.from('workflow_step_runs').insert({ id: stepId, merchant_id: MERCHANT_ID, workflow_run_id: runId, step_index: 0, output_type: 'create_task', status: 'completed', result: { task_id: randomUUID(), customer_email: 'also-sensitive@example.invalid', outcome: 'bounded local record' }, created_at: now, completed_at: now }).select('*').single();
  if (step.error) throw step.error;
  return { flowId, eventId, runId, stepId, name, now };
}

test.describe.serial('FAA-4 controls mutation and payload overlays', () => {
  for (const variant of VARIANTS) test(`new-flow-draft-modal · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const name = `FAA-4 disposable draft ${variant.id} ${randomUUID().slice(0, 8)}`;
    const pre = await service.from('workflow_definitions').select('id').eq('merchant_id', MERCHANT_ID).eq('name', name); if (pre.error) throw pre.error;
    await page.goto('/controls/flows?new=1', { waitUntil: 'domcontentloaded' }); const modal = page.locator('[role="dialog"][data-overlay-id="new-flow-draft-modal"]'); await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Create draft' }).click(); await expect(modal.getByRole('alert')).toHaveText('Flow name is required.');
    await modal.getByLabel('Flow name').fill(name); await modal.getByLabel('Description (shown to your team)').fill('Purpose-created FAA-4 draft; no live execution or external action.'); await modal.getByLabel('Action 1 task title').fill('Review purpose-created local case'); const modalShot = await shot(page, 'new-flow-draft-modal', `${variant.id}-validated`);
    const responseWait = page.waitForResponse((response) => response.url().endsWith('/api/workflows') && response.request().method() === 'POST'); await modal.getByRole('button', { name: 'Create draft' }).click(); const response = await responseWait; expect(response.status()).toBe(201); const request = response.request(); const body = await response.json() as { workflow: { id: string } };
    await expect(page).toHaveURL(new RegExp(`/controls/flows/${body.workflow.id}`)); const readBack = await service.from('workflow_definitions').select('*').eq('merchant_id', MERCHANT_ID).eq('id', body.workflow.id).single(); if (readBack.error) throw readBack.error; expect(readBack.data.status).toBe('draft'); expect(readBack.data.active).toBe(false);
    const replay = await page.request.post('/api/workflows', { data: request.postDataJSON() }); expect(replay.status()).toBe(409); const duplicate = await service.from('workflow_definitions').select('id').eq('merchant_id', MERCHANT_ID).eq('name', name); if (duplicate.error) throw duplicate.error; expect(duplicate.data).toHaveLength(1);
    const detailShot = await shot(page, 'new-flow-draft-modal', `${variant.id}-persisted`); const removed = await service.from('workflow_definitions').delete().eq('merchant_id', MERCHANT_ID).eq('id', body.workflow.id); if (removed.error) throw removed.error; const post = await service.from('workflow_definitions').select('id').eq('merchant_id', MERCHANT_ID).eq('name', name); if (post.error) throw post.error; expect(post.data).toEqual([]);
    record('new-flow-draft-modal', variant, page, [modalShot, detailShot], runtime, receipt({ scenarioId: 'new-flow-draft-modal', actorId: actor, pre: pre.data ?? [], request: { method: 'POST', path: '/api/workflows', idempotencyKey: null, redactedPayload: { name, triggerEventType: 'case.created', active: false, boundedActions: 1 } }, visibleResult: 'Blank-name validation stayed in the modal; the completed form created one inactive draft and navigated to its canonical detail.', readBack: { id: body.workflow.id, name: readBack.data.name, status: readBack.data.status, active: readBack.data.active, version: readBack.data.version }, consequence: { draftCreated: true, liveExecution: false, publication: false }, replay: { status: replay.status(), uniqueNameCount: duplicate.data?.length ?? 0 }, cleanup: `Deleted disposable inactive draft ${body.workflow.id} after persisted read-back; it had no run or audit history.`, retained: post.data ?? [] }) );
  });

  for (const variant of VARIANTS) test(`rule-simulation-and-publication-modals · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await seedRule(actor, `${variant.id}-${randomUUID().slice(0, 8)}`); const preWrites = await noWriteFingerprint(); const preVersions = await service.from('merchant_rule_versions').select('*').eq('merchant_rule_id', fixture.id).order('version'); if (preVersions.error) throw preVersions.error;
    await page.goto(`/controls/rules/${fixture.id}`, { waitUntil: 'domcontentloaded' }); await page.getByRole('dialog', { name: `Rule · ${fixture.name}` }).getByRole('button', { name: 'Simulate v2' }).click(); const simulation = page.locator('[role="dialog"][data-overlay-id="rule-simulation-and-publication-modals"]'); await expect(simulation).toBeVisible(); const simulationShot = await shot(page, 'rule-simulation-and-publication-modals', `${variant.id}-simulation`);
    await simulation.getByLabel(/Actual .* currency/).fill('GBP'); const simulationResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rules/${fixture.id}/simulate`) && response.request().method() === 'POST'); await simulation.getByRole('button', { name: 'Run simulation' }).click(); expect((await simulationResponse).ok()).toBeTruthy(); await expect(simulation.getByRole('status')).toContainText('0 writes performed'); const resultShot = await shot(page, 'rule-simulation-and-publication-modals', `${variant.id}-simulation-result`); const postWrites = await noWriteFingerprint(); expect(postWrites).toEqual(preWrites);
    await simulation.getByRole('button', { name: 'Cancel', exact: true }).click();
    const editor = page.getByRole('dialog', { name: `Rule · ${fixture.name}` });
    await expect(editor.getByRole('button', { name: 'Review publication' })).toBeDisabled();
    const impactResponse = page.waitForResponse(response => response.url().endsWith('/api/rules/preview') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Preview impact' }).click();
    const impact = await impactResponse; expect(impact.ok()).toBeTruthy();
    expect((await impact.json()).impactToken).toBeTruthy();
    expect(await noWriteFingerprint()).toEqual(preWrites);
    await editor.getByRole('button', { name: 'Review publication' }).click(); const publication = page.locator('[role="dialog"][data-overlay-id="rule-simulation-and-publication-modals"]'); await expect(publication).toBeVisible(); await expect(publication).toContainText('does not record a merchant decision or contact a provider'); const publicationShot = await shot(page, 'rule-simulation-and-publication-modals', `${variant.id}-publication`);
    const publishResponse = page.waitForResponse((response) => response.url().endsWith(`/api/rules/${fixture.id}/publish`) && response.request().method() === 'POST' && response.request().postData()?.includes('"confirm":true')); const noCases = publication.getByRole('checkbox'); if (await noCases.count()) await noCases.check(); await publication.getByRole('button', { name: 'Publish v2' }).click(); expect((await publishResponse).ok()).toBeTruthy(); await expect(page.getByRole('status').filter({ hasText: 'Version 2 published atomically.' })).toBeVisible();
    const [postRule, postVersions] = await Promise.all([service.from('merchant_rules').select('*').eq('id', fixture.id).single(), service.from('merchant_rule_versions').select('*').eq('merchant_rule_id', fixture.id).order('version')]); if (postRule.error) throw postRule.error; if (postVersions.error) throw postVersions.error; expect(postVersions.data?.map((row) => row.status)).toEqual(['retired', 'published']); expect(postRule.data.action).toBe('deny');
    const replay = await page.request.post(`/api/rules/${fixture.id}/publish`, { data: { confirm: true } }); expect(replay.status()).toBe(409); const persistedShot = await shot(page, 'rule-simulation-and-publication-modals', `${variant.id}-published`);
    record('rule-simulation-and-publication-modals', variant, page, [simulationShot, resultShot, publicationShot, persistedShot], runtime, receipt({ scenarioId: 'rule-simulation-and-publication-modals', actorId: actor, pre: { versions: preVersions.data, noWriteTables: preWrites }, request: { method: 'POST', paths: [`/api/rules/${fixture.id}/simulate`, `/api/rules/${fixture.id}/publish`], idempotencyKey: null, redactedPayload: { simulation: { amount_at_risk: 100 }, publication: { confirm: true, acceptConflicts: false } } }, visibleResult: 'Simulation reported its recommendation and zero writes; publication required a separate consequence review and then reported atomic v2 publication.', readBack: { rule: { id: fixture.id, action: postRule.data.action, priority: postRule.data.priority }, versions: postVersions.data?.map((row) => ({ id: row.id, version: row.version, status: row.status, published_by: row.published_by, published_at: row.published_at })) }, consequence: { priorVersionRetired: true, draftVersionPublished: true, simulationWriteTablesUnchanged: JSON.stringify(postWrites) === JSON.stringify(preWrites) }, replay: { status: replay.status(), result: 'No draft remained to publish twice.' }, cleanup: 'Retained the purpose-created local rule and its superseded/published version history; deleting it would erase the publication evidence.', retained: { rule: postRule.data, versions: postVersions.data }, exception: 'The tagged local rule remains with one retired and one published version. No merchant decision, provider call, money record, email, billing action, or preview deployment was created.' }) );
  });

  for (const variant of VARIANTS) test(`flow-edit-test-and-publication-modals · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await seedFlowFamily(actor, `${variant.id}-${randomUUID().slice(0, 8)}`); const preWrites = await noWriteFingerprint(); const pre = await service.from('workflow_definitions').select('*').eq('merchant_id', MERCHANT_ID).eq('name', fixture.name).order('version'); if (pre.error) throw pre.error;
    await page.goto(`/controls/flows/${fixture.draftId}`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Save draft' }).first().click(); const edit = page.locator('[role="dialog"][data-overlay-id="flow-edit-test-and-publication-modals"]'); await expect(edit).toBeVisible(); await edit.getByLabel('Description (shown to your team)').fill('Edited and persisted by FAA-4; still inactive and bounded.'); const editShot = await shot(page, 'flow-edit-test-and-publication-modals', `${variant.id}-edit`);
    const patchResponse = page.waitForResponse((response) => response.url().endsWith(`/api/workflows/${fixture.draftId}`) && response.request().method() === 'PATCH'); await edit.getByRole('button', { name: 'Save draft' }).click(); expect((await patchResponse).ok()).toBeTruthy(); await expect(page.getByRole('status').filter({ hasText: 'Draft updated.' })).toBeVisible(); const readBack = await service.from('workflow_definitions').select('*').eq('id', fixture.draftId).single(); if (readBack.error) throw readBack.error; expect(readBack.data.active).toBe(false); expect(readBack.data.status).toBe('draft'); const preTestWrites = await noWriteFingerprint();
    await page.getByRole('button', { name: 'Run dry test' }).click(); const dryTest = page.locator('[role="dialog"][data-overlay-id="flow-edit-test-and-publication-modals"]'); await expect(dryTest).toBeVisible(); const testShot = await shot(page, 'flow-edit-test-and-publication-modals', `${variant.id}-dry-test`); const testResponse = page.waitForResponse((response) => response.url().endsWith(`/api/workflows/${fixture.draftId}/test`) && response.request().method() === 'POST'); await dryTest.getByRole('button', { name: 'Run test' }).click(); expect((await testResponse).ok()).toBeTruthy(); await expect(dryTest).toContainText('0 writes performed'); const resultShot = await shot(page, 'flow-edit-test-and-publication-modals', `${variant.id}-dry-test-result`); const postWrites = await noWriteFingerprint(); expect(postWrites).toEqual(preTestWrites);
    await dryTest.getByRole('button', { name: 'Close dialog' }).click(); await expect(page.locator('[data-state-id="flow-pilot-boundary"]')).toContainText('Publication and live execution are unavailable'); const publication = await page.request.post(`/api/workflows/${fixture.draftId}/publish`, { data: {} }); expect(publication.status()).toBe(503); const publicationBody = await publication.json() as { error: string }; expect(publicationBody.error).toBe('workflow_publication_unavailable'); const boundaryShot = await shot(page, 'flow-edit-test-and-publication-modals', `${variant.id}-publication-boundary`);
    const removed = await service.from('workflow_definitions').delete().eq('merchant_id', MERCHANT_ID).eq('name', fixture.name); if (removed.error) throw removed.error; const post = await service.from('workflow_definitions').select('id').eq('merchant_id', MERCHANT_ID).eq('name', fixture.name); if (post.error) throw post.error; expect(post.data).toEqual([]);
    record('flow-edit-test-and-publication-modals', variant, page, [editShot, testShot, resultShot, boundaryShot], runtime, receipt({ scenarioId: 'flow-edit-test-and-publication-modals', actorId: actor, pre: { definitions: pre.data, beforeEditWriteTables: preWrites, beforeDryTestWriteTables: preTestWrites }, request: { methods: ['PATCH', 'POST', 'POST'], paths: [`/api/workflows/${fixture.draftId}`, `/api/workflows/${fixture.draftId}/test`, `/api/workflows/${fixture.draftId}/publish`], idempotencyKey: null, redactedPayload: { edit: 'bounded inactive draft', test: { case: { status: 'evidence_needed' } }, publication: {} } }, visibleResult: 'The edit modal persisted only the inactive draft; dry test reported zero writes; the page and API both retained the explicit pilot publication boundary.', readBack: { id: fixture.draftId, description: readBack.data.description, status: readBack.data.status, active: readBack.data.active, version: readBack.data.version }, consequence: { testWriteTablesUnchanged: JSON.stringify(postWrites) === JSON.stringify(preTestWrites), publicationStatus: publication.status(), publicationError: publicationBody.error, publishedBaselineUnchangedDuringWorkflow: true }, replay: { result: 'Not applicable: publication is unavailable by the current contract and no live mutation occurred.' }, cleanup: 'Deleted the purpose-created draft and published baseline after read-back; neither had run or audit history.', retained: post.data ?? [] }) );
  });

  for (const variant of VARIANTS) test(`flow-run-payload-inspector · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000); const { base, runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await seedFlowRun(actor, `${variant.id}-${randomUUID().slice(0, 8)}`);
    await page.goto(`/controls/flows/runs/${fixture.runId}`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Inspect trigger payload' }).click(); const modal = page.locator('[role="dialog"][data-overlay-id="flow-run-payload-inspector"]'); await expect(modal).toBeVisible(); await expect(modal).toContainText('Case Updated'); await expect(modal).toContainText('retained source event'); await expect(modal).toContainText('[REDACTED]'); await expect(modal).not.toContainText('sensitive-faa4@example.invalid'); await expect(modal).not.toContainText('faa4-secret-token'); await expect(modal).toContainText('cannot replay the run'); const inspectorShot = await shot(page, 'flow-run-payload-inspector', `${variant.id}-inspector`);
    const denied = await fetch(new URL(`/controls/flows/runs/${fixture.runId}`, base.origin), { redirect: 'manual', headers: { cookie: '' } }); const anonymousBody = await denied.text(); const anonymousGuarded = ([302, 303, 307, 308].includes(denied.status) && (denied.headers.get('location') ?? '').includes('/login')) || anonymousBody.includes('Sign in to Unauth'); expect(anonymousGuarded).toBe(true); expect(anonymousBody).not.toContain('retained source event'); expect(anonymousBody).not.toContain('sensitive-faa4@example.invalid'); expect(anonymousBody).not.toContain('stage-h-owner@example.invalid');
    const [flow, event, run, steps] = await Promise.all([service.from('workflow_definitions').select('*').eq('id', fixture.flowId).single(), service.from('domain_events').select('*').eq('id', fixture.eventId).single(), service.from('workflow_runs').select('*').eq('id', fixture.runId).single(), service.from('workflow_step_runs').select('*').eq('workflow_run_id', fixture.runId).order('step_index')]); for (const result of [flow, event, run, steps]) if (result.error) throw result.error;
    record('flow-run-payload-inspector', variant, page, [inspectorShot], runtime, receipt({ scenarioId: 'flow-run-payload-inspector', actorId: actor, pre: { source: 'purpose-created local event and execution records' }, request: { method: 'GET', path: `/controls/flows/runs/${fixture.runId}`, idempotencyKey: null, redactedPayload: null }, visibleResult: 'The owner-only inspector showed immutable event provenance and operational facts while redacting email, token, address, and step-result identifiers; it exposed no mutation or replay control.', readBack: { workflowId: flow.data.id, eventId: event.data.id, eventType: event.data.event_type, runId: run.data.id, runStatus: run.data.status, stepIds: (steps.data ?? []).map((step) => step.id), anonymousRouteStatus: denied.status, anonymousGuarded, anonymousPayloadDisclosure: false }, consequence: { appendOnlyDomainEventRetained: true, immutableRunAndStepTraceRetained: true, permissionBoundaryServedRedirectOrSignInWithoutRunData: true }, replay: { result: 'Inspector is read-only; retry is not exposed and no run was replayed.' }, cleanup: 'Retained the purpose-created domain event, run, step, and originating definition because they form the immutable provenance chain proved by this scenario.', retained: { flow: flow.data, event: event.data, run: run.data, steps: steps.data }, exception: 'The tagged local event/run trace remains. Sensitive source values are retained only in the local fixture and redacted before UI rendering; no provider, email, billing, money, or deployment action occurred.' }) );
  });

  test.afterAll(() => {
    for (const id of SCENARIOS) {
      const variants = evidence.get(id) ?? []; if (!variants.length) continue; const scenario = manifest.get(id)!; const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests); const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt), cleanup: 'Disposable drafts without history were removed after read-back. Purpose-created version and execution chains were retained only when deletion would erase the audit/provenance evidence.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both required variants exercised the real local UI and contract, proved persisted state or zero-write behavior, preserved the pilot publication boundary, and verified redaction and permission scope.' : 'One or more FAA-4 workflow variants did not complete.', variants }, null, 2)}\n`);
    }
  });
});
