import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(
  'artifacts/merchant-clarity-implementation/2026-09-06-repair-through-p06/browser',
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const P06_MERCHANT_ID = 'd6000000-0000-4000-8000-000000000006';
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('P06 browser acceptance requires local Supabase credentials.');
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
    merchantId: P06_MERCHANT_ID, userId: '', email: `p06-browser-${suffix}@example.invalid`,
    integrationId: randomUUID(), sourceAccountId: randomUUID(), orderId: randomUUID(),
    caseId: randomUUID(), lineIds: [randomUUID(), randomUUID()],
    claimedItemIds: [randomUUID(), randomUUID()], sourceReplacementId: randomUUID(),
    shopDomain: `p06-${suffix}.myshopify.com`,
  };
  const created = await service.auth.admin.createUser({
    email: fixture.email,
    password: `P06-${randomUUID()}-local-only`,
    email_confirm: true,
    user_metadata: { fixture: 'merchant-clarity-p06-browser' },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error('P06 browser user was not created.');
  fixture.userId = created.data.user.id;

  await checked('merchant insert', service.from('merchants').insert({
    id: fixture.merchantId, name: 'P06 browser replacement proof', is_demo: true,
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
    display_name: 'P06 local Shopify fixture', provider_account_id: fixture.shopDomain,
    provider_account_name: 'P06 proof store', environment: 'test', writeback_enabled: false,
    last_verified_at: new Date().toISOString(), last_verification_status: 'verified',
  }));
  await checked('source account insert', service.from('source_accounts').insert({
    id: fixture.sourceAccountId, merchant_id: fixture.merchantId,
    connection_id: fixture.integrationId, provider_id: 'shopify',
    external_account_id: fixture.shopDomain, display_name: 'P06 proof store',
    base_url: `https://${fixture.shopDomain}`, is_synthetic: true, environment: 'test',
    metadata: { fixture: 'merchant-clarity-p06-browser' },
  }));
  await checked('order insert', service.from('source_orders').insert({
    id: fixture.orderId, merchant_id: fixture.merchantId, source: 'shopify',
    source_account_id: fixture.sourceAccountId, external_id: '9000000005', order_number: 'P06-BROWSER-1005',
    financial_status: 'paid', fulfillment_state: 'delivered', total_price: 72, currency: 'GBP',
    line_items_count: 2, placed_at: '2026-09-01T10:00:00.000Z', raw_payload_hash: `sha256:p06-browser-${suffix}`,
  }));
  await checked('order lines insert', service.from('source_order_lines').insert([
    {
      id: fixture.lineIds[0], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p06-browser-line-coat', sku: 'COAT-BLK-M', product_ref: 'product-coat',
      variant_ref: 'variant-coat-black-medium', title: 'Black coat, medium', quantity: 2,
      unit_price_minor: 2800, total_minor: 5600, cost_minor: 1450, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p06-browser' },
    },
    {
      id: fixture.lineIds[1], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p06-browser-line-hat', sku: 'HAT-NAVY', product_ref: 'product-hat',
      variant_ref: 'variant-hat-navy', title: 'Navy hat with a deliberately longer original-line title', quantity: 1,
      unit_price_minor: 1600, total_minor: 1600, cost_minor: 700, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p06-browser' },
    },
  ]));
  await checked('case insert', service.from('support_payout_cases').insert({
    id: fixture.caseId, merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
    claim_type: 'damaged', status: 'pending', detection_method: 'manual',
    manual_reference: 'P06-BROWSER-CASE', reason_raw: 'Two confirmed original items arrived damaged.',
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
      metadata: { fixture: 'merchant-clarity-p06-browser' },
    },
    {
      id: fixture.claimedItemIds[1], merchant_id: fixture.merchantId,
      support_payout_case_id: fixture.caseId, source_order_line_id: fixture.lineIds[1],
      claimed_sku: 'HAT-NAVY', claimed_variant_ref: 'variant-hat-navy',
      claimed_title: 'Navy hat with a deliberately longer original-line title', claimed_quantity: 1,
      extraction_method: 'agent_selected', match_status: 'confirmed',
      match_method: 'exact_source_line', match_confidence: 1,
      confirmed_by: fixture.userId, confirmed_at: new Date().toISOString(),
      metadata: { fixture: 'merchant-clarity-p06-browser' },
    },
  ]));
  return fixture;
}

function cleanupFixture(fixture: Fixture): void {
  for (const value of [fixture.merchantId, fixture.userId, fixture.caseId]) {
    if (!/^[a-f0-9-]{36}$/.test(value)) throw new Error('Refusing P06 cleanup for an invalid fixture UUID.');
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
    raise exception 'P06 browser cleanup retained a root fixture row';
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
      raise exception 'P06 browser cleanup retained rows in %.%', row_value.table_schema, row_value.table_name;
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
    throw new Error(`P06 browser fixture cleanup failed: ${result.stderr || result.stdout}`);
  }
}


test('P06 authenticated setup, import review, retry, read-back and cleanup', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  fs.mkdirSync(ROOT, { recursive: true });
  const fixture = await seedFixture();
  const report: Record<string, unknown> = { fixture: fixture.merchantId, checks: [], cleanup: 'pending' };
  const checks = report.checks as string[];
  await context.route(/^https?:\/\//, route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  try {
    const auth = new URL('/api/test/e2e-auth', String(testInfo.project.use.baseURL));
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET!);
    auth.searchParams.set('merchant_id', fixture.merchantId);
    auth.searchParams.set('redirect', '/sources/imports');
    await page.goto(auth.toString());
    await expect(page).toHaveURL(/\/sources\/imports$/);
    await expect(page.getByText('No import jobs are recorded.')).toBeVisible();
    await page.getByRole('button', { name: 'Upload a file', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Maximum 20 MB/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Upload a file', exact: true })).toBeFocused();
    checks.push('Upload guidance, Escape, focus return and no-write cancellation');
    expect((await checked('no jobs before confirm', service.from('sync_jobs').select('id').eq('merchant_id', fixture.merchantId))).length).toBe(0);
    await page.getByRole('button', { name: 'Upload a file', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'repair-proof.csv', mimeType: 'text/csv', buffer: Buffer.from('external_id,currency,total_minor\nrepair-good,GBP,1299\nrepair-good,GBP,1299\nrepair-held,,400') });
    await page.getByRole('button', { name: 'Review import', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.screenshot({ path: path.join(ROOT, 'import-review.png'), fullPage: true });
    const committed = page.waitForResponse(response => response.url().endsWith('/api/imports/csv/commit'));
    await page.getByRole('button', { name: 'Post validated rows' }).click();
    const response = await committed;
    const result = await response.json();
    report.commitStatus = response.status(); report.commitResult = result;
    expect(response.status(), JSON.stringify(result)).toBe(201);
    expect(result.persisted).toBe(1);
    expect(result.duplicates_skipped).toBe(1);
    expect(result.error_count).toBeGreaterThan(0);
    const stored = await checked('job read-back', service.from('sync_jobs').select('id,status,processed_rows,failed_rows').eq('merchant_id', fixture.merchantId).eq('id', result.job_id).single());
    expect(stored.status).toBe('completed');
    expect(stored.processed_rows).toBe(1);
    const replay = await page.request.post('/api/imports/csv/commit', { data: response.request().postDataJSON() });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).replayed).toBe(true);
    expect((await checked('single job after replay', service.from('sync_jobs').select('id').eq('merchant_id', fixture.merchantId))).length).toBe(1);
    checks.push('Valid, duplicate and held rows; persisted job and same-identity replay without duplicate jobs');
    const imported = await checked('canonical read-back', service.from('source_orders').select('total_price,currency').eq('merchant_id', fixture.merchantId).eq('external_id', 'repair-good'));
    expect(imported).toEqual([{ total_price: 12.99, currency: 'GBP' }]);
    await page.goto(`/sources/imports/${result.job_id}`);
    await expect(page.getByRole('link', { name: 'Download error report' })).toBeVisible();
    const errors = await page.request.get(`/api/imports/${result.job_id}/errors`);
    expect(errors.status()).toBe(200);
    expect(await errors.text()).toContain('currency');
    await page.goto(`/sources/imports/${result.job_id}?step=mapping`);
    await expect(page.getByRole('dialog', { name: 'Mapping repair' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(new RegExp(`/sources/imports/${result.job_id}$`));
    checks.push('Import detail, real error download and mapping-repair Escape');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/sources/setup/shopify?step=permissions');
    await expect(page.getByText('Declared operations')).toBeVisible();
    await page.screenshot({ path: path.join(ROOT, 'source-permissions-1280.png'), fullPage: true });
    await page.goto('/sources/setup/chrome?step=activate');
    await expect(page.locator('[data-setup-state="activate"]')).toBeVisible();
    checks.push('1280x720 source permission text and unconfigured activation destination');
    await page.goto('/settings/agreements');
    await page.getByRole('button', { name: 'Upload an agreement' }).click();
    await expect(page.getByRole('dialog')).toContainText('PDF only, up to 10 MB');
    await page.screenshot({ path: path.join(ROOT, 'agreement-guidance.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await checked('agreement cancel', service.from('agreements').select('id').eq('merchant_id', fixture.merchantId))).length).toBe(0);
    checks.push('Empty agreement guidance, Escape and cancellation without upload');
    report.verdict = 'passed';
  } finally {
    cleanupFixture(fixture);
    report.cleanup = 'verified absent';
    fs.writeFileSync(path.join(ROOT, 'receipt.json'), JSON.stringify(report, null, 2));
  }
});

test('P03/P04 compact review cancellation, decision snapshot, replay and order identity', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  const fixture = await seedFixture();
  const report: Record<string, unknown> = { fixture: fixture.merchantId, cleanup: 'pending' };
  const foreignOrderId = randomUUID();
  try {
    await context.route(/^https?:\/\//, route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const auth = new URL('/api/test/e2e-auth', String(testInfo.project.use.baseURL));
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET!);
    auth.searchParams.set('merchant_id', fixture.merchantId);
    auth.searchParams.set('redirect', `/cases/${fixture.caseId}`);
    await page.goto(auth.toString());
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.getByRole('button', { name: 'Review merchant decision' }).click();
    await page.getByLabel('Decision', { exact: true }).selectOption('escalate');
    await page.getByLabel('Decision rationale').fill('Disposable P04 review requires another reviewer. No payout is authorised.');
    await page.getByRole('button', { name: 'Review decision', exact: true }).click();
    const confirmation = page.locator('[data-overlay-id="record-merchant-decision-modal"]');
    await expect(confirmation).toBeVisible();
    await page.screenshot({ path: path.join(ROOT, 'case-review-1024x600.png'), fullPage: true });
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await checked('cancel decisions', service.from('case_decisions').select('id').eq('merchant_id', fixture.merchantId))).length).toBe(0);
    await page.getByRole('button', { name: 'Review decision', exact: true }).click();
    const saved = page.waitForResponse(r => r.url().endsWith(`/api/claims/${fixture.caseId}/outcome`) && r.request().method() === 'POST');
    await confirmation.getByRole('button', { name: 'Confirm & record' }).click();
    const response = await saved;
    expect(response.ok(), await response.text()).toBe(true);
    const request = response.request();
    const replay = await page.request.post(`/api/claims/${fixture.caseId}/outcome`, { data: request.postDataJSON(), headers: { 'idempotency-key': request.headers()['idempotency-key'] } });
    expect(replay.ok(), await replay.text()).toBe(true);
    expect((await replay.json()).replayed).toBe(true);
    const decisions = await checked('decision snapshot', service.from('case_decisions').select('*').eq('merchant_id', fixture.merchantId));
    expect(decisions).toHaveLength(1);
    expect(JSON.stringify(decisions[0])).toContain('resolution-comparison-v1');
    report.decisionId = decisions[0].id;
    report.cancelNoWrite = true; report.replay = true; report.immutableComparison = true;
    await checked('repeated order reference', service.from('source_orders').insert({
      id: foreignOrderId, merchant_id: fixture.merchantId, source: 'manual', external_id: 'P04-REPEAT', order_number: 'P06-BROWSER-1005', currency: 'USD', total_price: 19,
    }));
    await page.goto(`/orders/${fixture.orderId}`);
    await expect(page.locator('main')).toContainText('72.00');
    await page.goto(`/orders/${foreignOrderId}`);
    await expect(page.locator('main')).toContainText('19.00');
    await page.screenshot({ path: path.join(ROOT, 'repeated-order-reference.png'), fullPage: true });
    report.repeatedOrderIdentity = true;
    report.verdict = 'passed';
  } finally {
    cleanupFixture(fixture);
    report.cleanup = 'verified absent';
    fs.writeFileSync(path.join(ROOT, 'case-receipt.json'), JSON.stringify(report, null, 2));
  }
});

test('P06 seven onboarding destinations use persisted observations and survive reload', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const fixture = await seedFixture(false);
  const report: Record<string, unknown> = { checks: [], cleanup: 'pending' };
  const checks = report.checks as string[];
  try {
    await checked('incomplete setup', service.from('merchants').update({ settings: { platform: 'shopify', onboarding_profile_complete: true, setup_complete: false, timezone: 'Europe/London' } }).eq('id', fixture.merchantId));
    const auth = new URL('/api/test/e2e-auth', String(testInfo.project.use.baseURL));
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET!);
    auth.searchParams.set('merchant_id', fixture.merchantId);
    auth.searchParams.set('redirect', '/onboarding?step=ready');
    await page.goto(auth.toString());
    async function assertTask(label: string) {
      await page.goto('/onboarding?step=ready');
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
      checks.push(label);
    }
    await assertTask('Connect Shopify');
    await checked('local connection observation', service.from('store_connections').insert({ merchant_id: fixture.merchantId, platform: 'shopify', store_key: fixture.shopDomain, status: 'active', credentials_encrypted: 'synthetic-local-observation-not-a-provider-token' }));
    await assertTask('Import order history');
    const jobId = randomUUID();
    await checked('failed job', service.from('sync_jobs').insert({ id: jobId, merchant_id: fixture.merchantId, job_kind: 'initial_import', source: 'shopify', status: 'failed', total_rows: 0, processed_rows: 0, failed_rows: 0 }));
    await assertTask('Fix import');
    await checked('running job', service.from('sync_jobs').update({ status: 'running' }).eq('id', jobId));
    await assertTask('View import progress');
    await checked('empty completed job', service.from('sync_jobs').update({ status: 'completed' }).eq('id', jobId));
    await assertTask('Check import coverage');
    await expect(page.getByText(/0 rows returned/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Check import coverage', exact: true })).toBeVisible();
    await checked('usable loss', service.from('loss_cases').insert({ merchant_id: fixture.merchantId, case_category: 'damaged_goods', case_type: 'damaged', recovery_route: 'needs_more_evidence', currency: 'GBP' }));
    await assertTask('Review imported losses');
    await checked('actionable case', service.from('support_payout_cases').insert({ id: fixture.caseId, merchant_id: fixture.merchantId, claim_type: 'damaged', status: 'pending', detection_method: 'manual', manual_reference: 'P06-ONBOARDING', currency: 'GBP', amount_at_risk: 12 }));
    await assertTask('Review your first case');
    await checked('partial failed import', service.from('sync_jobs').update({ status: 'failed', total_rows: 2, processed_rows: 1, failed_rows: 1 }).eq('id', jobId));
    await assertTask('Review your first case');
    await page.screenshot({ path: path.join(ROOT, 'onboarding-partial-usable.png'), fullPage: true });
    report.verdict = 'passed';
  } finally {
    cleanupFixture(fixture);
    report.cleanup = 'verified absent';
    fs.writeFileSync(path.join(ROOT, 'onboarding-receipt.json'), JSON.stringify(report, null, 2));
  }
});

test('P01/P03 workspace switch refreshes identity and sign-out preserves another session', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(120_000);
  const fixture = await seedFixture(false);
  const second = { ...fixture, merchantId: 'd6100000-0000-4000-8000-000000000006', userId: randomUUID(), caseId: randomUUID() };
  const otherContext = await browser.newContext();
  const report: Record<string, unknown> = { cleanup: 'pending' };
  try {
    await checked('second workspace', service.from('merchants').insert({ id: second.merchantId, name: 'P01 second disposable workspace', is_demo: true, settings: { platform: 'shopify', onboarding_profile_complete: true, setup_complete: true } }));
    await checked('second membership', service.from('merchant_users').insert({ merchant_id: second.merchantId, user_id: fixture.userId, invited_email: fixture.email, role: 'owner', invite_status: 'active' }));
    const auth = new URL('/api/test/e2e-auth', String(testInfo.project.use.baseURL));
    auth.searchParams.set('secret', process.env.E2E_AUTH_SECRET!);
    auth.searchParams.set('merchant_id', fixture.merchantId);
    auth.searchParams.set('redirect', '/sources/imports');
    await page.goto(auth.toString());
    // Establish the initial context through the same permissioned workspace boundary.
    expect((await page.request.post('/api/workspace', { data: { merchantId: fixture.merchantId } })).ok()).toBe(true);
    await page.goto('/sources/imports');
    await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('P01 second disposable workspace');
    await page.getByRole('button', { name: 'Switch workspace', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('P06 browser replacement proof');
    report.workspaceSwitch = 'both directions with document refresh';
    const otherPage = await otherContext.newPage();
    await otherPage.goto(auth.toString());
    expect((await otherPage.request.post(new URL('/api/workspace', String(testInfo.project.use.baseURL)).toString(), { data: { merchantId: fixture.merchantId } })).ok()).toBe(true);
    await otherPage.goto(new URL('/sources/imports', String(testInfo.project.use.baseURL)).toString());
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByRole('menu', { name: 'Account and session' })).toContainText(fixture.email);
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    expect((await page.request.get('/api/imports/00000000-0000-4000-8000-000000000000')).status()).toBe(401);
    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/sources\/imports$/);
    report.signout = 'first session cleared; independently authenticated second session retained';
    report.verdict = 'passed';
  } finally {
    await otherContext.close();
    cleanupFixture(second);
    cleanupFixture(fixture);
    report.cleanup = 'both disposable merchants absent';
    fs.writeFileSync(path.join(ROOT, 'workspace-session-receipt.json'), JSON.stringify(report, null, 2));
  }
});
