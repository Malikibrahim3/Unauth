import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(
  'artifacts/merchant-clarity-implementation/2026-09-06-p07/P07/browser',
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const P07_MERCHANT_ID = 'd7000000-0000-4000-8000-000000000007';
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('P07 browser acceptance requires local Supabase credentials.');
if (!['127.0.0.1', 'localhost'].includes(new URL(SUPABASE_URL).hostname) || process.env.RELEASE_E2E_LOCAL !== '1' || process.env.VERCEL_ENV === 'production') throw new Error('Disposable acceptance requires loopback non-production mode');
const service = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Fixture = {
  merchantId: string;
  userId: string;
  email: string;
  integrationId: string;
  sourceAccountId: string;
  orderId: string;
  caseId: string;
  lineIds: [string, string];
  claimedItemIds: [string, string];
  sourceReplacementId: string;
  shopDomain: string;
};

async function checked<T>(label: string, request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const result = await request;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function seedFixture(withRecords = true): Promise<Fixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const fixture: Fixture = {
    merchantId: P07_MERCHANT_ID, userId: '', email: `p07-browser-${suffix}@example.invalid`,
    integrationId: randomUUID(), sourceAccountId: randomUUID(), orderId: randomUUID(),
    caseId: randomUUID(), lineIds: [randomUUID(), randomUUID()],
    claimedItemIds: [randomUUID(), randomUUID()], sourceReplacementId: randomUUID(),
    shopDomain: `p07-${suffix}.myshopify.com`,
  };
  const created = await service.auth.admin.createUser({
    email: fixture.email,
    password: `P07-${randomUUID()}-local-only`,
    email_confirm: true,
    user_metadata: { fixture: 'merchant-clarity-p07-browser' },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error('P07 browser user was not created.');
  fixture.userId = created.data.user.id;

  await checked('merchant insert', service.from('merchants').insert({
    id: fixture.merchantId, name: 'P07 browser replacement proof', is_demo: true,
    settings: {
      platform: 'shopify', monthly_order_volume: 'under_1000',
      primary_fraud_concern: 'damage', onboarding_profile_complete: true,
      setup_complete: true, timezone: 'Europe/London',
    },
  }));
  await checked('owner membership insert', service.from('merchant_users').insert({
    merchant_id: fixture.merchantId, user_id: fixture.userId, invited_email: fixture.email,
    role: 'owner', invite_status: 'active', accepted_at: new Date().toISOString(),
  }));
  if (!withRecords) return fixture;
  await checked('Shopify integration insert', service.from('merchant_integrations').insert({
    id: fixture.integrationId, merchant_id: fixture.merchantId,
    provider_id: 'shopify', category: 'commerce', status: 'connected', auth_mode: 'oauth',
    display_name: 'P07 local Shopify fixture', provider_account_id: fixture.shopDomain,
    provider_account_name: 'P07 proof store', environment: 'test', writeback_enabled: false,
    last_verified_at: new Date().toISOString(), last_verification_status: 'verified',
  }));
  await checked('source account insert', service.from('source_accounts').insert({
    id: fixture.sourceAccountId, merchant_id: fixture.merchantId,
    connection_id: fixture.integrationId, provider_id: 'shopify',
    external_account_id: fixture.shopDomain, display_name: 'P07 proof store',
    base_url: `https://${fixture.shopDomain}`, is_synthetic: true, environment: 'test',
    metadata: { fixture: 'merchant-clarity-p07-browser' },
  }));
  await checked('order insert', service.from('source_orders').insert({
    id: fixture.orderId, merchant_id: fixture.merchantId, source: 'shopify',
    source_account_id: fixture.sourceAccountId, external_id: '9000000005', order_number: 'P07-BROWSER-1005',
    financial_status: 'paid', fulfillment_state: 'delivered', total_price: 72, currency: 'GBP',
    line_items_count: 2, placed_at: '2026-09-01T10:00:00.000Z', raw_payload_hash: `sha256:p07-browser-${suffix}`,
  }));
  await checked('order lines insert', service.from('source_order_lines').insert([
    {
      id: fixture.lineIds[0], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p07-browser-line-coat', sku: 'COAT-BLK-M', product_ref: 'product-coat',
      variant_ref: 'variant-coat-black-medium', title: 'Black coat, medium', quantity: 2,
      unit_price_minor: 2800, total_minor: 5600, cost_minor: 1450, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p07-browser' },
    },
    {
      id: fixture.lineIds[1], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p07-browser-line-hat', sku: 'HAT-NAVY', product_ref: 'product-hat',
      variant_ref: 'variant-hat-navy', title: 'Navy hat with a deliberately longer original-line title', quantity: 1,
      unit_price_minor: 1600, total_minor: 1600, cost_minor: 700, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p07-browser' },
    },
  ]));
  await checked('case insert', service.from('support_payout_cases').insert({
    id: fixture.caseId, merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
    claim_type: 'damaged', status: 'pending', detection_method: 'manual',
    manual_reference: 'P07-BROWSER-CASE', reason_raw: 'Two confirmed original items arrived damaged.',
    reason_normalized: 'confirmed original items damaged', amount_at_risk: 72,
    currency: 'GBP', primary_currency: 'GBP', requested_action: 'replacement',
    state_version: 1, next_action: 'Compare available resolutions',
    next_action_reason: 'The merchant must review exact item identity and budget.',
  }));
  await checked('claimed items insert', service.from('case_claimed_items').insert([
    {
      id: fixture.claimedItemIds[0], merchant_id: fixture.merchantId,
      support_payout_case_id: fixture.caseId, source_order_line_id: fixture.lineIds[0],
      claimed_sku: 'COAT-BLK-M', claimed_variant_ref: 'variant-coat-black-medium',
      claimed_title: 'Black coat, medium', claimed_quantity: 2,
      extraction_method: 'agent_selected', match_status: 'confirmed',
      match_method: 'exact_source_line', match_confidence: 1,
      confirmed_by: fixture.userId, confirmed_at: new Date().toISOString(),
      metadata: { fixture: 'merchant-clarity-p07-browser' },
    },
    {
      id: fixture.claimedItemIds[1], merchant_id: fixture.merchantId,
      support_payout_case_id: fixture.caseId, source_order_line_id: fixture.lineIds[1],
      claimed_sku: 'HAT-NAVY', claimed_variant_ref: 'variant-hat-navy',
      claimed_title: 'Navy hat with a deliberately longer original-line title', claimed_quantity: 1,
      extraction_method: 'agent_selected', match_status: 'confirmed',
      match_method: 'exact_source_line', match_confidence: 1,
      confirmed_by: fixture.userId, confirmed_at: new Date().toISOString(),
      metadata: { fixture: 'merchant-clarity-p07-browser' },
    },
  ]));
  return fixture;
}

function cleanupFixture(fixture: Fixture): void {
  for (const value of [fixture.merchantId, fixture.userId, fixture.caseId]) {
    if (!/^[a-f0-9-]{36}$/.test(value)) throw new Error('Refusing P07 cleanup for an invalid fixture UUID.');
  }
  const sql = String.raw`
\set ON_ERROR_STOP on
set session_replication_role = replica;
delete from public.claim_outcomes where claim_id = '${fixture.caseId}'::uuid;
do $cleanup$
declare row_value record;
begin
  for row_value in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'merchant_id'
      and table_name in (
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      )
    group by table_schema, table_name
  loop
    execute format('delete from %I.%I where merchant_id = $1', row_value.table_schema, row_value.table_name)
      using '${fixture.merchantId}'::uuid;
  end loop;
  delete from public.merchants where id = '${fixture.merchantId}'::uuid;
  delete from auth.users where id = '${fixture.userId}'::uuid;
end;
$cleanup$;
set session_replication_role = origin;
do $verify$
declare row_value record; retained bigint;
begin
  if exists (select 1 from public.merchants where id = '${fixture.merchantId}'::uuid)
     or exists (select 1 from auth.users where id = '${fixture.userId}'::uuid)
     or exists (select 1 from public.claim_outcomes where claim_id = '${fixture.caseId}'::uuid) then
    raise exception 'P07 browser cleanup retained a root fixture row';
  end if;
  for row_value in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'merchant_id'
      and table_name in (
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      )
    group by table_schema, table_name
  loop
    execute format('select count(*) from %I.%I where merchant_id = $1', row_value.table_schema, row_value.table_name)
      into retained using '${fixture.merchantId}'::uuid;
    if retained <> 0 then
      raise exception 'P07 browser cleanup retained rows in %.%', row_value.table_schema, row_value.table_name;
    end if;
  end loop;
end;
$verify$;
`;
  const result = spawnSync('docker', [
    'exec', '-e', 'PGPASSWORD=postgres', '-i', 'supabase_db_Unauth',
    'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`P07 browser fixture cleanup failed: ${result.stderr || result.stdout}`);
  }
}


test('P07 Work lifecycle, recovery stage populations and incomplete claim preparation', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  fs.mkdirSync(ROOT, { recursive: true });
  const fixture = await seedFixture();
  const taskIds = Array.from({ length: 14 }, () => randomUUID());
  const recoveryId = randomUUID();
  const lossId = randomUUID();
  const packPaths: string[] = [];
  const report: Record<string, unknown> = { fixture: fixture.merchantId, cleanup: 'pending' };
  await context.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  try {
    await checked('loss fixture', service.from('loss_cases').insert({ id: lossId, merchant_id: fixture.merchantId, support_payout_case_id: fixture.caseId, case_category: 'delivery_loss', case_type: 'carrier_loss', recovery_route: 'carrier_claim', status: 'approved', currency: 'GBP', financial_state: 'confirmed' }));
    await checked('recovery fixture', service.from('recovery_cases').insert({ id: recoveryId, merchant_id: fixture.merchantId, loss_case_id: lossId, support_payout_case_id: fixture.caseId, recovery_type: 'carrier_claim', owner_type: 'carrier', status: 'evidence_needed', currency: 'GBP', amount_sought_minor: 1200, evidence_missing: ['tracking'], evidence_required: ['tracking'], claim_readiness: 'evidence_needed' }));
    await checked('Work fixtures', service.from('work_tasks').insert(taskIds.map((id, index) => ({ id, merchant_id: fixture.merchantId, support_payout_case_id: fixture.caseId, recovery_case_id: recoveryId, title: `P07 task ${String(index).padStart(2, '0')}`, description: 'Collect missing tracking before a manual recovery handoff', status: index === 12 ? 'cancelled' : index === 13 ? 'completed' : 'open', priority: 'high', task_kind: 'provider_chase', due_at: '2026-09-08T12:00:00Z', owner_user_id: fixture.userId }))));
    const auth = new URL('/api/test/e2e-auth', String(testInfo.project.use.baseURL));
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET!); auth.searchParams.set('merchant_id', fixture.merchantId); auth.searchParams.set('redirect', '/work');
    await page.goto(auth.toString());
    await expect(page.locator('[data-work-item-id]')).toHaveCount(10);
    const before = process.env.P07_CAPTURE_BEFORE === '1';
    if (before) {
      for (const [name, url] of [['work', '/work'], ['recovery', '/financials/recovery'], ['claim', `/financials/recovery/new?case=${fixture.caseId}`]]) {
        await page.goto(url); await page.screenshot({ path: path.join(ROOT, `${name}-before.png`) });
      }
      report.before = 'captured from retained P06 build'; return;
    }
    await expect(page.getByText('P07 task 12', { exact: true })).toHaveCount(0);
    await expect(page.getByText('P07 task 13', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Selected work actions')).toHaveCount(0);
    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: width === 1024 ? 600 : 720 });
      await page.screenshot({ path: path.join(ROOT, `work-${width}.png`) });
    }
    await page.getByRole('link', { name: 'Show next 2 items' }).click();
    await expect(page.locator('[data-work-item-id]')).toHaveCount(2);
    await page.getByRole('checkbox').first().click();
    const selectedId = await page.locator('[data-selected="true"]').getAttribute('data-work-item-id');
    await page.getByRole('button', { name: 'Snooze 1 day', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    const unchanged = await checked('cancel read-back', service.from('work_tasks').select('state_version,snoozed_until').eq('id', selectedId).single());
    expect(unchanged).toMatchObject({ state_version: 1, snoozed_until: null });
    await page.getByRole('button', { name: 'Start task', exact: true }).click();
    const requested = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes('/api/work-tasks/'));
    await page.getByRole('button', { name: 'Confirm task update', exact: true }).click();
    const request = await requested;
    await expect(page.getByText(/1 task updates recorded/)).toBeVisible();
    const replay = await page.request.patch(`/api/work-tasks/${selectedId}`, { data: request.postDataJSON(), headers: { 'idempotency-key': request.headers()['idempotency-key'] } });
    expect(replay.status()).toBe(200);
    const task = await checked('task read-back', service.from('work_tasks').select('status,state_version').eq('id', selectedId).single());
    expect(task).toMatchObject({ status: 'in_progress', state_version: 2 });
    const stale = await page.request.patch(`/api/work-tasks/${selectedId}`, { data: { action: 'complete', expectedVersion: 1 }, headers: { 'idempotency-key': randomUUID() } });
    report.stale = { status: stale.status(), body: await stale.json() };
    const foreign = await page.request.patch(`/api/work-tasks/${randomUUID()}`, { data: { action: 'start', expectedVersion: 1 }, headers: { 'idempotency-key': randomUUID() } });
    expect(foreign.status()).toBe(404);
    const completed = await page.request.patch(`/api/work-tasks/${selectedId}`, { data: { action: 'complete', expectedVersion: 2 }, headers: { 'idempotency-key': randomUUID() } });
    expect(completed.status()).toBe(200);
    expect(await checked('completion read-back', service.from('work_tasks').select('status,state_version').eq('id', selectedId).single())).toMatchObject({ status: 'completed', state_version: 3 });
    const snoozeId = taskIds.slice(0, 12).find(id => id !== selectedId)!;
    const until = new Date(Date.now() + 86400000).toISOString();
    const snoozed = await page.request.patch(`/api/work-tasks/${snoozeId}`, { data: { action: 'snooze', expectedVersion: 1, until }, headers: { 'idempotency-key': randomUUID() } });
    expect(snoozed.status()).toBe(200);
    const snoozeResult = await checked('snooze read-back', service.from('work_tasks').select('status,state_version,snoozed_until,owner_user_id').eq('id', snoozeId).single());
    expect(snoozeResult).toMatchObject({ status: 'open', state_version: 2, owner_user_id: fixture.userId });
    expect(Date.parse(snoozeResult.snoozed_until)).toBe(Date.parse(until));
    const events = await checked('task audit', service.from('domain_events').select('id').eq('merchant_id', fixture.merchantId).eq('aggregate_id', selectedId).eq('event_type', 'work_task.start'));
    expect(events).toHaveLength(1);
    expect(await checked('case independence', service.from('support_payout_cases').select('status,state_version').eq('id', fixture.caseId).single())).toMatchObject({ status: 'pending', state_version: 1 });
    expect(await checked('recovery independence', service.from('recovery_cases').select('status,amount_recovered_minor').eq('id', recoveryId).single())).toMatchObject({ status: 'evidence_needed', amount_recovered_minor: 0 });
    await page.goto('/financials/recovery?search=no-such-route');
    await expect(page.getByRole('link', { name: 'READY 1', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'READY 1', exact: true }).click();
    await expect(page).toHaveURL(/stage=ready_to_file/);
    await expect(page.getByText(/REC-/).first()).toBeVisible();
    await page.screenshot({ path: path.join(ROOT, 'recovery-stage.png') });
    await page.goto(`/financials/recovery/new?case=${fixture.caseId}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prepare final pack' })).toBeDisabled();
    await expect(page.getByLabel('Missing claim inputs')).toContainText('tracking');
    await expect(page.getByRole('dialog')).not.toContainText('was last observed in carrier custody');
    await page.getByLabel('Merchant notes').fill('Local merchant note, not independently verified.');
    await page.screenshot({ path: path.join(ROOT, 'incomplete-claim.png') });
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('/claim-packs')) {
        const key = request.headers()['idempotency-key'];
        if (key && /^[a-f0-9-]{36}$/.test(key)) packPaths.push(...['claim-pack.pdf', 'claim-pack.zip'].map(name => `recovery-claim-packs/${fixture.merchantId}/${recoveryId}/${key}/${name}`));
      }
    });
    const saveRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/claim-packs'));
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    const savedRequest = await saveRequest;
    await expect(page.getByText('Draft claim pack saved with its source manifest and hashes.')).toBeVisible({ timeout: 30000 });
    const saved = await checked('draft pack read-back', service.from('recovery_claim_packs').select('state,manifest').eq('merchant_id', fixture.merchantId).eq('recovery_case_id', recoveryId).single());
    expect(saved.state).toBe('draft');
    expect(saved.manifest.merchantNotes).toBe('Local merchant note, not independently verified.');
    expect(saved.manifest.issueSummary).not.toContain('was last observed in carrier custody');
    const savedReplay = await page.request.post(`/api/recoveries/${recoveryId}/claim-packs`, { data: savedRequest.postDataJSON(), headers: { 'idempotency-key': savedRequest.headers()['idempotency-key'] } });
    expect(savedReplay.status()).toBe(200);
    report.pack = 'draft manifest and merchant notes persisted; identical replay reused the pack';

    const blocked = await page.request.post(`/api/recoveries/${recoveryId}/claim-packs`, { data: { finalize: true }, headers: { 'idempotency-key': randomUUID() } });
    expect(blocked.status()).toBe(422);
    await page.keyboard.press('Escape'); await expect(page).toHaveURL(/\/financials\/recovery$/);
    expect(stale.status()).toBe(409);
    report.lifecycle = 'cancel, start, completion, snooze, replay, stale rejection, missing-target rejection, audit and independent case/recovery read-back passed';
    report.browser = 'three desktop widths, pagination, stage scope navigation, incomplete narrative and hard gate passed';
  } finally { if (packPaths.length) await checked('pack artifact cleanup', service.storage.from('evidence-packages').remove(packPaths)); cleanupFixture(fixture); report.cleanup = 'verified absent'; fs.writeFileSync(path.join(ROOT, process.env.P07_CAPTURE_BEFORE === '1' ? 'before.json' : 'acceptance.json'), JSON.stringify(report, null, 2)); }
});
