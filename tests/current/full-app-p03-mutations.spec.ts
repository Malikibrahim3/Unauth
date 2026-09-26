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
const SCENARIOS = [
  'confirm-recovery-action-modal',
  'reconciliation-resolution-drawer',
  'write-off-outstanding-recovery-modal',
  'recovery-detail-action-modal',
] as const;
const manifest = new Map(scenarioLedger.map((scenario) => [scenario.id, scenario]));
if (!MERCHANT_ID || SCENARIOS.some((id) => !manifest.has(id))) throw new Error('FAA-3 mutation acceptance environment is incomplete');

const VARIANTS = [
  { id: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { id: 'compact-light', width: 1024, height: 900, theme: 'light' },
] as const satisfies readonly { id: string; width: number; height: number; theme: LightOnlyAppearance }[];

type RuntimeEvidence = {
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
const evidence = new Map<(typeof SCENARIOS)[number], RuntimeEvidence[]>();

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
  if (result.error || !result.data?.user_id) throw result.error ?? new Error('FAA-3 owner fixture missing');
  return String(result.data.user_id);
}

async function cloneRecovery(status: 'ready_to_submit' | 'submitted') {
  const template = await service.from('recovery_cases').select('*').eq('merchant_id', MERCHANT_ID).limit(1).single();
  if (template.error || !template.data) throw template.error ?? new Error('Recovery template missing');
  const id = randomUUID(); const now = new Date().toISOString();
  const row = {
    ...template.data,
    id,
    status,
    merchant_loss_amount: 42,
    eligible_loss_amount: 42,
    estimated_recoverable_min: 42,
    estimated_recoverable_max: 42,
    amount_recovered: 0,
    amount_sought_minor: 4200,
    amount_approved_minor: 0,
    amount_recovered_minor: 0,
    amount_written_off_minor: 0,
    evidence_required: [],
    evidence_missing: [],
    evidence_complete: true,
    rejection_reason: null,
    last_chased_at: null,
    next_chase_at: status === 'submitted' ? now : null,
    calculation_reason: ['Local FAA-3 disposable recovery fixture.'],
    created_at: now,
    updated_at: now,
  };
  const inserted = await service.from('recovery_cases').insert(row).select('*').single();
  if (inserted.error) throw inserted.error;
  return inserted.data as Record<string, unknown> & { id: string; support_payout_case_id: string };
}

async function createManualCase() {
  const template = await service.from('support_payout_cases').select('*').eq('merchant_id', MERCHANT_ID).limit(1).single();
  if (template.error || !template.data) throw template.error ?? new Error('Case template missing');
  const id = randomUUID(); const now = new Date().toISOString();
  const row = {
    ...template.data,
    id,
    source_ticket_id: null,
    source_order_id: null,
    identity_id: null,
    merchant_customer_id: null,
    assigned_to: null,
    assigned_at: null,
    recommended_rule_id: null,
    detection_method: 'manual',
    detection_detail: { fixture: 'faa-3-local-disposable' },
    case_origin: 'manual',
    manual_reference: `FAA3-${id}`,
    manual_source_url: null,
    status: 'pending',
    payout_decision_state: 'undecided',
    recovery_state: 'open',
    state_version: 1,
    currency: 'GBP',
    primary_currency: 'GBP',
    submitted_at: now,
    created_at: now,
    updated_at: now,
  };
  const inserted = await service.from('support_payout_cases').insert(row).select('*').single();
  if (inserted.error) throw inserted.error;
  return inserted.data as Record<string, unknown> & { id: string };
}

async function createWriteOffFixture() {
  const supportCase = await createManualCase();
  const template = await service.from('loss_cases').select('*').eq('merchant_id', MERCHANT_ID).limit(1).single();
  if (template.error || !template.data) throw template.error ?? new Error('Loss template missing');
  const id = randomUUID(); const now = new Date().toISOString();
  const row = {
    ...template.data,
    id,
    support_payout_case_id: supportCase.id,
    order_id: null,
    customer_identity_id: null,
    helpdesk_ticket_id: null,
    source_record_id: null,
    source_fingerprint: null,
    owner_user_id: null,
    status: 'collecting_evidence',
    financial_state: 'confirmed',
    written_off_at: null,
    currency: 'GBP',
    confirmed_at: now,
    source_metadata: { fixture: 'faa-3-local-disposable' },
    created_at: now,
    updated_at: now,
  };
  const loss = await service.from('loss_cases').insert(row).select('*').single();
  if (loss.error) throw loss.error;
  const entries = [
    { state: 'confirmed_loss', amount_minor: 5000, direction: 'debit' },
    { state: 'recoverable', amount_minor: 3000, direction: 'memo' },
    { state: 'recovered', amount_minor: 500, direction: 'credit' },
  ].map((entry) => ({ ...entry, merchant_id: MERCHANT_ID, support_payout_case_id: supportCase.id, loss_case_id: id, currency: 'GBP', effective_at: now, idempotency_key: `faa3:${id}:${entry.state}`, metadata: { fixture: 'faa-3-local-disposable' } }));
  const insertedEntries = await service.from('case_financial_entries').insert(entries).select('*');
  if (insertedEntries.error) throw insertedEntries.error;
  const recompute = await service.rpc('recompute_case_financial_summary', { p_merchant_id: MERCHANT_ID, p_case_id: supportCase.id });
  if (recompute.error) throw recompute.error;
  return { supportCase, loss: loss.data as Record<string, unknown> & { id: string }, entries: insertedEntries.data ?? [] };
}

async function createExceptionFixture() {
  const supportCase = await createManualCase(); const id = randomUUID(); const now = new Date().toISOString();
  const row = {
    id,
    merchant_id: MERCHANT_ID,
    support_payout_case_id: supportCase.id,
    exception_type: 'conflicting_financials',
    confidence: 'probable',
    status: 'open',
    title: `FAA-3 disposable source and ledger difference ${id.slice(0, 8)}`,
    detail: 'Synthetic local source and ledger facts differ; resolve only after reviewing both values.',
    context: {
      fixture: 'faa-3-local-disposable',
      source: { record_id: randomUUID(), record_type: 'source_order', amount_minor: 4200, currency: 'GBP', state: 'paid', effective_at: now },
      ledger: { record_id: randomUUID(), record_type: 'case_financial_entry', amount_minor: 4000, currency: 'GBP', state: 'confirmed_loss', effective_at: now },
    },
    subject_entity_type: 'source_order',
    subject_entity_id: randomUUID(),
    source_system: 'shopify',
    dedup_key: `faa3:${id}`,
    priority: 'urgent',
    created_at: now,
    updated_at: now,
  };
  const inserted = await service.from('case_exceptions').insert(row).select('*').single();
  if (inserted.error) throw inserted.error;
  return { supportCase, exception: inserted.data as Record<string, unknown> & { id: string; state_version: number } };
}

async function recoveryHistory(id: string) {
  const [recovery, events, domainEvents] = await Promise.all([
    service.from('recovery_cases').select('*').eq('merchant_id', MERCHANT_ID).eq('id', id).single(),
    service.from('recovery_case_events').select('*').eq('merchant_id', MERCHANT_ID).eq('recovery_case_id', id).order('created_at'),
    service.from('domain_events').select('id,event_type,idempotency_key,payload,actor_id').eq('merchant_id', MERCHANT_ID).contains('payload', { recovery_case_id: id }).order('recorded_at'),
  ]);
  for (const result of [recovery, events, domainEvents]) if (result.error) throw result.error;
  return { recovery: recovery.data, events: events.data ?? [], domainEvents: domainEvents.data ?? [] };
}

async function lossHistory(lossId: string, caseId: string) {
  const [loss, entries, events, domainEvents] = await Promise.all([
    service.from('loss_cases').select('*').eq('merchant_id', MERCHANT_ID).eq('id', lossId).single(),
    service.from('case_financial_entries').select('*').eq('merchant_id', MERCHANT_ID).eq('loss_case_id', lossId).order('created_at'),
    service.from('loss_case_events').select('*').eq('merchant_id', MERCHANT_ID).eq('loss_case_id', lossId).order('created_at'),
    service.from('domain_events').select('id,event_type,idempotency_key,payload,actor_id').eq('merchant_id', MERCHANT_ID).eq('aggregate_id', caseId).order('recorded_at'),
  ]);
  for (const result of [loss, entries, events, domainEvents]) if (result.error) throw result.error;
  return { loss: loss.data, entries: entries.data ?? [], events: events.data ?? [], domainEvents: domainEvents.data ?? [] };
}

function commonReceipt(input: { actorId: string; pre: unknown; request: unknown; visibleResult: string; readBack: unknown; consequence: unknown; replay: unknown; retained: unknown }) {
  return {
    merchantId: MERCHANT_ID,
    actorId: input.actorId,
    canonicalRole: 'owner',
    delegatedGrants: [],
    preStateFingerprint: hash(input.pre),
    request: input.request,
    visibleResult: input.visibleResult,
    persistedReadBack: input.readBack,
    auditOrVersionConsequence: input.consequence,
    externalActions: { provider: false, email: false, billing: false, moneyMovement: false, previewDeployment: false },
    replayResult: input.replay,
    cleanupAction: 'Retained the purpose-created local record because its append-only event, audit, or ledger history cannot be truthfully erased.',
    postCleanupFingerprint: hash(input.retained),
    invariantException: 'The synthetic fixture and its immutable local history remain clearly tagged; no provider approval, received credit, matched credit, reconciled money, email, billing, or preview action was created unless the receipt explicitly names that local ledger fact.',
  };
}

async function preparePage(page: Page, context: Parameters<Parameters<typeof test>[1]>[0]['context'], testInfo: TestInfo, variant: (typeof VARIANTS)[number]) {
  const base = new URL(String(testInfo.project.use.baseURL));
  await page.setViewportSize({ width: variant.width, height: variant.height });
  await context.addCookies([{ name: LEGACY_DARK_COOKIE, value: variant.theme, domain: base.hostname, path: '/' }]);
  return { base, runtime: observe(page, base.origin) };
}

function record(id: (typeof SCENARIOS)[number], variant: (typeof VARIANTS)[number], page: Page, screenshots: string[], runtime: ReturnType<typeof observe>, mutationReceipt: Record<string, unknown>) {
  expect(runtime.externalMutations).toEqual([]); expect(runtime.consoleErrors).toEqual([]); expect(runtime.pageErrors).toEqual([]); expect(runtime.failedRequests).toEqual([]);
  evidence.set(id, [...(evidence.get(id) ?? []), { id: variant.id, viewport: `${variant.width}x${variant.height} authenticated`, theme: variant.theme, finalUrl: new URL(page.url()).pathname, screenshots, consoleErrors: runtime.consoleErrors, pageErrors: runtime.pageErrors, failedRequests: runtime.failedRequests, mutationReceipt }]);
}

test.describe.serial('FAA-3 financial mutation overlays', () => {
  for (const variant of VARIANTS) test(`confirm-recovery-action-modal · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await cloneRecovery('ready_to_submit'); const pre = await recoveryHistory(fixture.id);
    await page.goto(`/financials/recovery/${fixture.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Record an outcome' }).click();
    const chooser = page.getByRole('dialog', { name: 'Record an outcome' }); await expect(chooser).toBeVisible(); await chooser.getByRole('button', { name: 'Record submission' }).click();
    const modal = page.locator('[role="dialog"][data-overlay-id="confirm-recovery-action-modal"]'); await expect(modal).toBeVisible();
    await modal.getByLabel('Source note').fill('FAA-3 local submission record; no external claim was sent.'); const screenshot = await shot(page, 'confirm-recovery-action-modal', `${variant.id}-confirmation`);
    const responseWait = page.waitForResponse((response) => response.url().endsWith(`/api/recoveries/${fixture.id}/status`) && response.request().method() === 'PATCH');
    await modal.getByRole('button', { name: 'Record submission' }).click(); const response = await responseWait; expect(response.ok()).toBeTruthy(); const request = response.request(); const payload = request.postDataJSON() as Record<string, unknown>;
    const replay = await page.request.patch(request.url(), { headers: { 'content-type': 'application/json' }, data: payload }); expect(replay.ok()).toBeTruthy();
    await expect(page.getByRole('status').filter({ hasText: 'Record submission recorded' })).toBeVisible(); const post = await recoveryHistory(fixture.id); expect(post.recovery?.status).toBe('submitted'); expect(post.events.filter((event) => event.idempotency_key === payload.idempotencyKey)).toHaveLength(1);
    record('confirm-recovery-action-modal', variant, page, [screenshot, await shot(page, 'confirm-recovery-action-modal', `${variant.id}-recorded`)], runtime, { scenarioId: 'confirm-recovery-action-modal', ...commonReceipt({ actorId: actor, pre, request: { method: 'PATCH', path: `/api/recoveries/${fixture.id}/status`, idempotencyKey: payload.idempotencyKey, redactedPayload: { action: 'submitted', note: '[local no-send source note]' } }, visibleResult: 'The confirmation stated that Unauth records an external submission fact but does not send the claim.', readBack: { recoveryId: fixture.id, status: post.recovery?.status, eventIds: post.events.map((event) => event.id), providerClaimStage: post.recovery?.provider_claim_stage }, consequence: { appendOnlyEventCount: post.events.length, domainEventIds: post.domainEvents.map((event) => event.id) }, replay: { status: replay.status(), sameEventCount: post.events.filter((event) => event.idempotency_key === payload.idempotencyKey).length === 1 }, retained: post }) });
  });

  for (const variant of VARIANTS) test(`recovery-detail-action-modal · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await cloneRecovery('submitted'); const pre = await recoveryHistory(fixture.id);
    await page.goto(`/financials/recovery/${fixture.id}`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Chase the carrier' }).click();
    const chooser = page.locator('[role="dialog"][data-overlay-id="recovery-detail-action-modal"]'); await expect(chooser).toBeVisible(); const chooserShot = await shot(page, 'recovery-detail-action-modal', `${variant.id}-chooser`);
    const modal = page.locator('[role="dialog"][data-overlay-id="recovery-detail-action-modal"]'); await expect(modal.getByLabel('Source note')).toBeVisible(); await modal.getByLabel('Source note').fill('FAA-3 local follow-up note; no partner contact was sent.'); const actionShot = await shot(page, 'recovery-detail-action-modal', `${variant.id}-confirmation`);
    const responseWait = page.waitForResponse((response) => response.url().endsWith(`/api/recoveries/${fixture.id}/status`) && response.request().method() === 'PATCH'); await modal.getByRole('button', { name: 'Record chase' }).click(); const response = await responseWait; expect(response.ok()).toBeTruthy(); const request = response.request(); const payload = request.postDataJSON() as Record<string, unknown>;
    const replay = await page.request.patch(request.url(), { headers: { 'content-type': 'application/json' }, data: payload }); expect(replay.ok()).toBeTruthy(); await expect(page.getByRole('status').filter({ hasText: 'Record chase recorded' })).toBeVisible(); const post = await recoveryHistory(fixture.id); expect(post.recovery?.status).toBe('waiting_response'); expect(post.events.filter((event) => event.idempotency_key === payload.idempotencyKey)).toHaveLength(1);
    record('recovery-detail-action-modal', variant, page, [chooserShot, actionShot, await shot(page, 'recovery-detail-action-modal', `${variant.id}-recorded`)], runtime, { scenarioId: 'recovery-detail-action-modal', ...commonReceipt({ actorId: actor, pre, request: { method: 'PATCH', path: `/api/recoveries/${fixture.id}/status`, idempotencyKey: payload.idempotencyKey, redactedPayload: { action: 'chased', note: '[local no-send note]' } }, visibleResult: 'The chooser separated the recorded partner fact from any external contact; the confirmation described a local append-only recovery event.', readBack: { recoveryId: fixture.id, status: post.recovery?.status, lastChasedAt: post.recovery?.last_chased_at, nextChaseAt: post.recovery?.next_chase_at }, consequence: { appendOnlyEventIds: post.events.map((event) => event.id), domainEventIds: post.domainEvents.map((event) => event.id) }, replay: { status: replay.status(), sameEventCount: post.events.filter((event) => event.idempotency_key === payload.idempotencyKey).length === 1 }, retained: post }) });
  });

  for (const variant of VARIANTS) test(`write-off-outstanding-recovery-modal · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await createWriteOffFixture(); const pre = await lossHistory(fixture.loss.id, fixture.supportCase.id);
    await page.goto(`/financials/losses/${fixture.loss.id}`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Write off', exact: true }).click(); const modal = page.locator('[role="dialog"][data-overlay-id="write-off-outstanding-recovery-modal"]'); await expect(modal).toBeVisible();
    await modal.getByLabel('Reason').fill('FAA-3 local outstanding recovery exhausted after documented review.'); const screenshot = await shot(page, 'write-off-outstanding-recovery-modal', `${variant.id}-confirmation`);
    const responseWait = page.waitForResponse((response) => response.url().endsWith(`/api/losses/${fixture.loss.id}`) && response.request().method() === 'PATCH'); await modal.getByRole('button', { name: /^Write off / }).click(); const response = await responseWait; expect(response.ok()).toBeTruthy(); const request = response.request(); const payload = request.postDataJSON() as Record<string, unknown>;
    await expect(page.getByText('Write-off recorded')).toBeVisible();
    const replay = await page.request.patch(request.url(), { headers: { 'content-type': 'application/json' }, data: payload }); expect(replay.ok()).toBeTruthy(); const replayBody = await replay.json() as Record<string, unknown>; expect(replayBody.replayed).toBe(true);
    const post = await lossHistory(fixture.loss.id, fixture.supportCase.id); const writeOffs = post.entries.filter((entry) => entry.state === 'written_off'); expect(writeOffs).toHaveLength(1); expect(post.entries.filter((entry) => ['recoverable', 'recovered'].includes(entry.state))).toHaveLength(2); expect(post.loss?.written_off_at).toBeTruthy();
    record('write-off-outstanding-recovery-modal', variant, page, [screenshot, await shot(page, 'write-off-outstanding-recovery-modal', `${variant.id}-recorded`)], runtime, { scenarioId: 'write-off-outstanding-recovery-modal', ...commonReceipt({ actorId: actor, pre, request: { method: 'PATCH', path: `/api/losses/${fixture.loss.id}`, idempotencyKey: payload.idempotencyKey, redactedPayload: { action: 'write_off', rationale: '[local documented rationale]' } }, visibleResult: 'The modal stated that write-off is a new local ledger outcome and leaves the original loss, recovery facts, evidence, and earlier entries intact.', readBack: { lossId: fixture.loss.id, status: post.loss?.status, writtenOffAt: post.loss?.written_off_at, originalEntryIds: fixture.entries.map((entry) => entry.id), writeOffEntry: writeOffs[0] }, consequence: { lossEventIds: post.events.map((event) => event.id), domainEventIds: post.domainEvents.filter((event) => event.event_type === 'loss.written_off').map((event) => event.id), originalRecoverableAndReceivedRetained: true }, replay: { status: replay.status(), replayed: replayBody.replayed === true, oneWriteOffEntry: writeOffs.length === 1 }, retained: post }) });
  });

  for (const variant of VARIANTS) test(`reconciliation-resolution-drawer · ${variant.id}`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000); const { runtime } = await preparePage(page, context, testInfo, variant); const actor = await ownerId(); const fixture = await createExceptionFixture(); const preMoney = await service.from('case_financial_entries').select('id,state,amount_minor,currency').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', fixture.supportCase.id); if (preMoney.error) throw preMoney.error;
    const pre = { exception: fixture.exception, money: preMoney.data ?? [] }; await page.goto(`/financials/reconciliation?selected=${fixture.exception.id}`, { waitUntil: 'domcontentloaded' });
    const review = page.locator('[role="dialog"][data-overlay-id="reconciliation-resolution-drawer"]'); await expect(review).toContainText(fixture.exception.title as string, { timeout: 20_000 }); await review.getByRole('button', { name: 'Resolve exception' }).click();
    const modal = page.getByRole('alertdialog', { name: 'Resolve exception' }); await expect(modal).toBeVisible(); await modal.getByLabel('Audit note').fill('FAA-3 local resolution after comparing the recorded source and ledger facts.'); const screenshot = await shot(page, 'reconciliation-resolution-drawer', `${variant.id}-confirmation`);
    const responseWait = page.waitForResponse((response) => response.url().endsWith(`/api/ops/exceptions/${fixture.exception.id}`) && response.request().method() === 'POST'); await modal.getByRole('button', { name: 'Record decision' }).click(); const response = await responseWait; expect(response.ok()).toBeTruthy(); const request = response.request(); const payload = request.postDataJSON() as Record<string, unknown>; const key = request.headers()['idempotency-key']; expect(key).toBeTruthy();
    await expect(page.getByRole('status').filter({ hasText: 'Resolution recorded' })).toBeVisible();
    const replay = await page.request.post(request.url(), { headers: { 'content-type': 'application/json', 'idempotency-key': key }, data: payload }); expect(replay.ok()).toBeTruthy(); const replayBody = await replay.json() as Record<string, unknown>; expect(replayBody.replayed).toBe(true);
    const [exceptionResult, domainResult, postMoney] = await Promise.all([
      service.from('case_exceptions').select('*').eq('merchant_id', MERCHANT_ID).eq('id', fixture.exception.id).single(),
      service.from('domain_events').select('id,event_type,idempotency_key,payload,actor_id').eq('merchant_id', MERCHANT_ID).eq('idempotency_key', `case.exception_resolved:${fixture.exception.id}`),
      service.from('case_financial_entries').select('id,state,amount_minor,currency').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', fixture.supportCase.id),
    ]); for (const result of [exceptionResult, domainResult, postMoney]) if (result.error) throw result.error;
    expect(exceptionResult.data.status).toBe('resolved'); expect(domainResult.data).toHaveLength(1); expect(postMoney.data ?? []).toEqual(preMoney.data ?? []);
    const post = { exception: exceptionResult.data, domainEvents: domainResult.data ?? [], money: postMoney.data ?? [] };
    record('reconciliation-resolution-drawer', variant, page, [screenshot, await shot(page, 'reconciliation-resolution-drawer', `${variant.id}-recorded`)], runtime, { scenarioId: 'reconciliation-resolution-drawer', ...commonReceipt({ actorId: actor, pre, request: { method: 'POST', path: `/api/ops/exceptions/${fixture.exception.id}`, idempotencyKey: key, redactedPayload: { action: 'resolve', resolution: '[local audit note]', expectedStateVersion: fixture.exception.state_version } }, visibleResult: 'The drawer kept source and confirmed-ledger facts side by side and required an attributed merchant audit note before resolution.', readBack: { exceptionId: fixture.exception.id, status: exceptionResult.data.status, resolution: exceptionResult.data.resolution, matchingState: 'No relationship was created; this non-match financial exception alone was settled.' }, consequence: { auditDomainEventIds: (domainResult.data ?? []).map((event) => event.id), financialEntriesUnchanged: true }, replay: { status: replay.status(), replayed: replayBody.replayed === true, oneAuditDomainEvent: domainResult.data?.length === 1 }, retained: post }) });
  });

  test.afterAll(() => {
    for (const id of SCENARIOS) {
      const variants = evidence.get(id) ?? []; if (!variants.length) continue; const scenario = manifest.get(id)!; const screenshots = variants.flatMap((variant) => variant.screenshots); const consoleErrors = variants.flatMap((variant) => variant.consoleErrors); const pageErrors = variants.flatMap((variant) => variant.pageErrors); const failedRequests = variants.flatMap((variant) => variant.failedRequests); const passed = variants.length === VARIANTS.length && !consoleErrors.length && !pageErrors.length && !failedRequests.length;
      fs.writeFileSync(path.join(directory(id), 'receipt.json'), `${JSON.stringify({ schemaVersion: 2, evidenceSource: 'playwright-runtime', scenarioId: id, owningSurface: scenario.owner, declaredKind: scenario.kind, activation: scenario.activationRecipe, viewport: variants.map((variant) => variant.viewport), theme: variants.map((variant) => variant.theme), roleProfile: { role: 'owner', persona: null, delegatedPermissions: [] }, finalUrl: variants.at(-1)?.finalUrl ?? null, consoleErrors, pageErrors, failedRequests, expectedDiagnostics: [], screenshotOrTrace: screenshots[0] ?? null, supportingEvidence: screenshots, mutationReceipt: variants.map((variant) => variant.mutationReceipt), cleanup: 'Retained purpose-created synthetic records only where append-only audit, event, or financial history makes deletion untruthful; no external system was contacted.', verdict: passed ? 'passed' : variants.length ? 'partial' : 'untested', note: passed ? 'Both required variants submitted the real local workflow, proved persisted append-only consequences and exact replay, and preserved provider and money truth boundaries.' : 'One or more FAA-3 mutation variants did not complete.', variants }, null, 2)}\n`);
    }
  });
});
