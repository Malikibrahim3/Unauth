import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(
  'artifacts/merchant-clarity-implementation/2026-09-06-p05/P05/behaviour-browser',
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const P05_MERCHANT_ID = 'd5000000-0000-4000-8000-000000000005';
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('P05 browser acceptance requires local Supabase credentials.');
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

async function seedFixture(): Promise<Fixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const fixture: Fixture = {
    merchantId: P05_MERCHANT_ID, userId: '', email: `p05-browser-${suffix}@example.invalid`,
    integrationId: randomUUID(), sourceAccountId: randomUUID(), orderId: randomUUID(),
    caseId: randomUUID(), lineIds: [randomUUID(), randomUUID()],
    claimedItemIds: [randomUUID(), randomUUID()], sourceReplacementId: randomUUID(),
    shopDomain: `p05-${suffix}.myshopify.com`,
  };
  const created = await service.auth.admin.createUser({
    email: fixture.email,
    password: `P05-${randomUUID()}-local-only`,
    email_confirm: true,
    user_metadata: { fixture: 'merchant-clarity-p05-browser' },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error('P05 browser user was not created.');
  fixture.userId = created.data.user.id;

  await checked('merchant insert', service.from('merchants').insert({
    id: fixture.merchantId, name: 'P05 browser replacement proof', is_demo: true,
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
  await checked('Shopify integration insert', service.from('merchant_integrations').insert({
    id: fixture.integrationId, merchant_id: fixture.merchantId,
    provider_id: 'shopify', category: 'commerce', status: 'connected', auth_mode: 'oauth',
    display_name: 'P05 local Shopify fixture', provider_account_id: fixture.shopDomain,
    provider_account_name: 'P05 proof store', environment: 'test', writeback_enabled: false,
    last_verified_at: new Date().toISOString(), last_verification_status: 'verified',
  }));
  await checked('source account insert', service.from('source_accounts').insert({
    id: fixture.sourceAccountId, merchant_id: fixture.merchantId,
    connection_id: fixture.integrationId, provider_id: 'shopify',
    external_account_id: fixture.shopDomain, display_name: 'P05 proof store',
    base_url: `https://${fixture.shopDomain}`, is_synthetic: true, environment: 'test',
    metadata: { fixture: 'merchant-clarity-p05-browser' },
  }));
  await checked('order insert', service.from('source_orders').insert({
    id: fixture.orderId, merchant_id: fixture.merchantId, source: 'shopify',
    source_account_id: fixture.sourceAccountId, external_id: '9000000005', order_number: 'P05-BROWSER-1005',
    financial_status: 'paid', fulfillment_state: 'delivered', total_price: 72, currency: 'GBP',
    line_items_count: 2, placed_at: '2026-09-01T10:00:00.000Z', raw_payload_hash: `sha256:p05-browser-${suffix}`,
  }));
  await checked('order lines insert', service.from('source_order_lines').insert([
    {
      id: fixture.lineIds[0], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p05-browser-line-coat', sku: 'COAT-BLK-M', product_ref: 'product-coat',
      variant_ref: 'variant-coat-black-medium', title: 'Black coat, medium', quantity: 2,
      unit_price_minor: 2800, total_minor: 5600, cost_minor: 1450, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p05-browser' },
    },
    {
      id: fixture.lineIds[1], merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
      external_id: 'p05-browser-line-hat', sku: 'HAT-NAVY', product_ref: 'product-hat',
      variant_ref: 'variant-hat-navy', title: 'Navy hat with a deliberately longer original-line title', quantity: 1,
      unit_price_minor: 1600, total_minor: 1600, cost_minor: 700, currency: 'GBP',
      raw_metadata: { fixture: 'merchant-clarity-p05-browser' },
    },
  ]));
  await checked('case insert', service.from('support_payout_cases').insert({
    id: fixture.caseId, merchant_id: fixture.merchantId, source_order_id: fixture.orderId,
    claim_type: 'damaged', status: 'pending', detection_method: 'manual',
    manual_reference: 'P05-BROWSER-CASE', reason_raw: 'Two confirmed original items arrived damaged.',
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
      metadata: { fixture: 'merchant-clarity-p05-browser' },
    },
    {
      id: fixture.claimedItemIds[1], merchant_id: fixture.merchantId,
      support_payout_case_id: fixture.caseId, source_order_line_id: fixture.lineIds[1],
      claimed_sku: 'HAT-NAVY', claimed_variant_ref: 'variant-hat-navy',
      claimed_title: 'Navy hat with a deliberately longer original-line title', claimed_quantity: 1,
      extraction_method: 'agent_selected', match_status: 'confirmed',
      match_method: 'exact_source_line', match_confidence: 1,
      confirmed_by: fixture.userId, confirmed_at: new Date().toISOString(),
      metadata: { fixture: 'merchant-clarity-p05-browser' },
    },
  ]));
  return fixture;
}

function cleanupFixture(fixture: Fixture): void {
  for (const value of [fixture.merchantId, fixture.userId, fixture.caseId]) {
    if (!/^[a-f0-9-]{36}$/.test(value)) throw new Error('Refusing P05 cleanup for an invalid fixture UUID.');
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
    raise exception 'P05 browser cleanup retained a root fixture row';
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
      raise exception 'P05 browser cleanup retained rows in %.%', row_value.table_schema, row_value.table_name;
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
    throw new Error(`P05 browser fixture cleanup failed: ${result.stderr || result.stdout}`);
  }
}

test('P05 authenticated replacement authorisation, handoff and outcome remain truthful', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  fs.mkdirSync(ROOT, { recursive: true });
  const fixture = await seedFixture();
  const baseURL = String(testInfo.project.use.baseURL);
  const secret = process.env.E2E_AUTH_SECRET ?? '';
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedLocalRequests: string[] = [];
  const interruptedLocalGets: string[] = [];
  const externalMutations: string[] = [];
  const openedProviderUrls: string[] = [];
  const requestReceipts: Array<Record<string, unknown>> = [];
  let cleanup = 'not attempted';
  let verdict: 'passed' | 'partial' = 'partial';

  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      const failure = request.failure()?.errorText ?? 'failed';
      const detail = `${request.method()} ${url.pathname}: ${failure}`;
      if (request.method() === 'GET' && failure === 'net::ERR_ABORTED') interruptedLocalGets.push(detail);
      else failedLocalRequests.push(detail);
    }
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && request.method() !== 'GET') {
      externalMutations.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(baseURL).origin });
  await context.route(`https://${fixture.shopDomain}/**`, (route) => {
    openedProviderUrls.push(route.request().url());
    return route.abort('blockedbyclient');
  });

  try {
    const auth = new URL('/api/test/e2e-auth', baseURL);
    auth.searchParams.set('secret', secret);
    auth.searchParams.set('merchant_id', fixture.merchantId);
    auth.searchParams.set('redirect', `/cases/${fixture.caseId}?tab=manage`);
    await page.goto(auth.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(new RegExp(`/cases/${fixture.caseId}`));
    await page.getByLabel('Review merchant decision').click();
    const decisionSelect = page.getByLabel('Decision', { exact: true });
    await expect(decisionSelect).toBeVisible({ timeout: 30_000 });
    await decisionSelect.selectOption('same_item_replacement');
    await page.getByLabel('Replacement quantity for Black coat, medium').fill('1');
    await page.getByLabel('Replacement quantity for Navy hat with a deliberately longer original-line title').fill('1');
    await page.getByLabel('Decision amount').fill('25.00');
    await page.getByLabel('Decision rationale').fill('Replace the two damaged original lines within the reviewed budget.');
    await expect(page.getByRole('button', { name: 'Review decision' })).toBeEnabled();

    const noWriteBefore = await checked('cancel pre-read', service.from('case_decisions')
      .select('id').eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId));
    await page.getByRole('button', { name: 'Review decision' }).click();
    const decisionDialog = page.getByRole('dialog', { name: 'Record merchant decision' });
    await expect(decisionDialog).toBeVisible();
    await expect(decisionDialog).toContainText('P05-BROWSER-1005');
    await expect(decisionDialog).toContainText('COAT-BLK-M');
    await expect(decisionDialog).toContainText('HAT-NAVY');
    await expect(decisionDialog).toContainText('£25.00');
    await page.screenshot({ path: path.join(ROOT, 'desktop-confirmation.png'), fullPage: true });
    await decisionDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(decisionDialog).toBeHidden();
    const noWriteAfter = await checked('cancel post-read', service.from('case_decisions')
      .select('id').eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId));
    expect(noWriteAfter).toEqual(noWriteBefore);

    await page.getByRole('button', { name: 'Review decision' }).click();
    const decisionResponse = page.waitForResponse((response) =>
      response.url().endsWith(`/api/claims/${fixture.caseId}/outcome`) && response.request().method() === 'POST');
    await decisionDialog.getByRole('button', { name: 'Confirm & record' }).click();
    const authorisedResponse = await decisionResponse;
    expect(authorisedResponse.ok()).toBeTruthy();
    requestReceipts.push({ path: new URL(authorisedResponse.url()).pathname, status: authorisedResponse.status() });
    await expect(page.getByText('Manual replacement handoff')).toBeVisible({ timeout: 30_000 });
    await expect(decisionSelect).toHaveValue('');
    await expect(page.getByLabel('Decision amount')).toHaveCount(0);
    await expect(page.getByLabel('Decision rationale')).toHaveValue('');
    const decision = await checked('decision read-back', service.from('case_decisions')
      .select('id,decision,action,amount_minor,currency,recommendation_snapshot')
      .eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId).single());
    expect(decision).toMatchObject({ decision: 'approved', action: 'same_item_replacement', amount_minor: 2500, currency: 'GBP' });
    const action = await checked('handoff read-back', service.from('connector_action_runs')
      .select('*').eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId)
      .eq('capability_id', 'replacement.manual_handoff').single());
    expect(action).toMatchObject({ action_state: 'handoff_ready', status: 'manual_required' });
    expect(action.payload).toMatchObject({ operation: 'replacement', external_action_performed: false, authorised_budget_minor: 2500 });
    expect(action.payload.items).toHaveLength(2);
    const refundHandoffs = await checked('refund handoff exclusion', service.from('connector_action_runs')
      .select('id').eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId).like('capability_id', 'refund.%'));
    expect(refundHandoffs).toEqual([]);

    await page.getByRole('button', { name: 'Copy instructions' }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('COAT-BLK-M');
    const actionAfterCopy = await checked('copy no-write read-back', service.from('connector_action_runs')
      .select('action_state,state_version,merchant_reported_at').eq('id', action.id).single());
    expect(actionAfterCopy).toEqual({ action_state: 'handoff_ready', state_version: 1, merchant_reported_at: null });
    const orderLink = page.getByRole('link', { name: 'Open original order' });
    await expect(orderLink).toHaveAttribute('href', `https://${fixture.shopDomain}/admin/orders/9000000005`);
    const popupPromise = context.waitForEvent('page');
    await orderLink.click();
    const popup = await popupPromise;
    await expect.poll(() => openedProviderUrls).toContain(`https://${fixture.shopDomain}/admin/orders/9000000005`);
    await popup.close();
    const actionAfterOpen = await checked('open no-write read-back', service.from('connector_action_runs')
      .select('action_state,state_version,merchant_reported_at').eq('id', action.id).single());
    expect(actionAfterOpen).toEqual(actionAfterCopy);
    await page.screenshot({ path: path.join(ROOT, 'desktop-handoff.png'), fullPage: true });

    await page.getByLabel('Shopify replacement reference').fill('shopify-browser-replacement-1005');
    await page.getByLabel('Replacement receipt note').fill('Retained local synthetic Shopify receipt.');
    const dispatchResponse = page.waitForResponse((response) =>
      response.url().endsWith(`/api/external-actions/${action.id}`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Record merchant-confirmed dispatch' }).click();
    const dispatchedResponse = await dispatchResponse;
    expect(dispatchedResponse.ok()).toBeTruthy();
    requestReceipts.push({ path: new URL(dispatchedResponse.url()).pathname, status: dispatchedResponse.status() });
    await expect(page.getByLabel('Actual replacement cost')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel('Actual replacement cost').fill('12.50');
    await page.getByLabel('Replacement cost evidence note').fill('Actual replacement cost from the retained local receipt.');
    const costResponse = page.waitForResponse((response) =>
      response.url().endsWith(`/api/claims/${fixture.caseId}/outcomes`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Record actual cost' }).click();
    const recordedCostResponse = await costResponse;
    expect(recordedCostResponse.ok()).toBeTruthy();
    requestReceipts.push({ path: new URL(recordedCostResponse.url()).pathname, status: recordedCostResponse.status() });
    await expect(page.getByText('Actual cost incurred').locator('..')).toContainText('£12.50', { timeout: 30_000 });

    await checked('source replacement insert', service.from('source_replacements').insert({
      id: fixture.sourceReplacementId, merchant_id: fixture.merchantId,
      source_account_id: fixture.sourceAccountId, source_order_id: fixture.orderId,
      support_payout_case_id: fixture.caseId, external_id: 'shopify-browser-replacement-1005',
      status: 'completed', source_status: 'fulfilled', original_line_ref: 'p05-browser-line-coat',
      replacement_line_ref: 'p05-browser-replacement-line-coat', item_value_minor: 1450,
      shipping_cost_minor: 0, currency: 'GBP', issued_at: new Date().toISOString(),
      raw_metadata: { quantity: 1, fixture: 'merchant-clarity-p05-browser' },
    }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('Review merchant decision').click();
    await expect(page.getByText('Manual replacement handoff')).toBeVisible({ timeout: 30_000 });
    const truthGrid = page.locator('[data-state-id="replacement-outcome-corroboration"]');
    await expect(truthGrid).toContainText('recorded');
    await expect(truthGrid).toContainText('observed');
    await expect(truthGrid).toContainText('£12.50');
    await expect(truthGrid).toContainText('not reconciled');
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.screenshot({ path: path.join(ROOT, 'compact-outcome.png'), fullPage: true });

    const [finalAction, costRows, corroborations, financialRows] = await Promise.all([
      checked('final action read-back', service.from('connector_action_runs').select('*').eq('id', action.id).single()),
      checked('cost outcome read-back', service.from('case_outcome_events').select('*')
        .eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId).eq('outcome_type', 'replacement')),
      checked('corroboration read-back', service.from('case_replacement_corroborations').select('*')
        .eq('merchant_id', fixture.merchantId).eq('source_replacement_id', fixture.sourceReplacementId)),
      checked('financial read-back', service.from('case_financial_entries').select('*')
        .eq('merchant_id', fixture.merchantId).eq('support_payout_case_id', fixture.caseId)),
    ]);
    expect(finalAction).toMatchObject({ action_state: 'provider_accepted', external_reference: 'shopify-browser-replacement-1005' });
    expect(finalAction.merchant_reported_at).toBeTruthy();
    expect(finalAction.observed_at).toBeTruthy();
    expect(finalAction.reconciled_at).toBeNull();
    expect(costRows).toHaveLength(1);
    expect(corroborations).toHaveLength(1);
    expect(financialRows.filter((row) => row.valuation_basis === 'replacement_actual_cost')).toHaveLength(1);
    expect(financialRows.some((row) => ['paid', 'recovered'].includes(row.state))).toBe(false);
    expect(externalMutations).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedLocalRequests).toEqual([]);
    verdict = 'passed';
  } finally {
    try {
      cleanupFixture(fixture);
      cleanup = 'Exact dedicated tenant and auth user removed; all public merchant_id rows and compatibility outcome rows verified absent.';
    } catch (error) {
      cleanup = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      fs.writeFileSync(path.join(ROOT, 'receipt.json'), `${JSON.stringify({
        schemaVersion: 2,
        evidenceSource: 'authenticated-loopback-playwright-and-local-postgres',
        scenarios: ['replacement-authorisation', 'replacement-manual-handoff', 'replacement-outcome-corroboration'],
        viewport: ['1440x900 authenticated', '1024x900 authenticated'],
        merchantFixture: fixture.merchantId,
        caseFixture: fixture.caseId,
        requestReceipts,
        consoleErrors,
        pageErrors,
        failedLocalRequests,
        interruptedLocalGets,
        externalMutations,
        cleanup,
        providerActions: false,
        remoteMigrations: false,
        verdict,
      }, null, 2)}\n`);
    }
  }
});
