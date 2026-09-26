import type { SupabaseClient } from '@supabase/supabase-js';
import {
  corroborateReplacementHandoff,
  loadReplacementReadModel,
  recordReplacementCost,
  recordSameItemReplacement,
  reportReplacementDispatch,
} from '@/lib/claims/replacement';

type Row = Record<string, any>;

function queryClient(
  tables: Record<string, Row[]>,
  errors: Record<string, string> = {},
) {
  const rpc = jest.fn();
  return {
    rpc,
    from(table: string) {
      const filters: Array<(row: Row) => boolean> = [];
      let limit: number | null = null;
      const result = () => {
        if (errors[table]) return { data: null, error: { message: errors[table] } };
        let data = (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
        if (limit != null) data = data.slice(0, limit);
        return { data, error: null };
      };
      const chain: any = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return chain;
        },
        in: (column: string, values: unknown[]) => {
          filters.push((row) => values.includes(row[column]));
          return chain;
        },
        order: () => chain,
        limit: (value: number) => { limit = value; return chain; },
        maybeSingle: async () => {
          const response = result();
          return { ...response, data: Array.isArray(response.data) ? response.data[0] ?? null : null };
        },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
      };
      return chain;
    },
  };
}

const merchantId = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';

describe('manual same-item replacement', () => {
  it('subtracts confirmed replacements and only outstanding uncorroborated authorisations', async () => {
    const client = queryClient({
      support_payout_cases: [{ id: caseId, merchant_id: merchantId, source_order_id: 'order-1' }],
      source_orders: [{ id: 'order-1', merchant_id: merchantId, external_id: 'gid://shopify/Order/1001', order_number: '#1001', source: 'shopify', source_account_id: 'account-1', connection_id: null, currency: 'GBP' }],
      source_accounts: [{ id: 'account-1', merchant_id: merchantId, connection_id: 'connection-1', external_account_id: 'unit-test.myshopify.com', base_url: null }],
      merchant_integrations: [{ id: 'connection-1', merchant_id: merchantId, provider_id: 'shopify', provider_account_id: 'unit-test.myshopify.com', status: 'connected', last_verification_status: 'verified' }],
      case_claimed_items: [{ id: 'claimed-1', merchant_id: merchantId, support_payout_case_id: caseId, source_order_line_id: 'line-1', claimed_sku: 'SKU-1', claimed_variant_ref: 'VAR-1', claimed_title: 'Coat', claimed_quantity: 3, match_status: 'confirmed' }],
      source_order_lines: [{ id: 'line-1', merchant_id: merchantId, source_order_id: 'order-1', external_id: 'line-ext-1', sku: 'SKU-1', variant_ref: 'VAR-1', title: 'Coat', quantity: 3, cost_minor: 1200, currency: 'GBP' }],
      source_replacements: [{ id: 'replacement-1', merchant_id: merchantId, source_order_id: 'order-1', original_line_ref: 'line-ext-1', source_status: 'fulfilled', status: 'completed', raw_metadata: { quantity: 1 } }],
      case_replacement_authorisation_items: [{ id: 'auth-1', merchant_id: merchantId, case_decision_id: 'decision-1', external_action_id: 'action-1', source_order_line_id: 'line-1', quantity: 2 }],
      case_replacement_corroborations: [{ merchant_id: merchantId, replacement_authorisation_item_id: 'auth-1', quantity: 1 }],
      case_decisions: [{ id: 'decision-1', merchant_id: merchantId, reverses_decision_id: null }],
      connector_action_runs: [{ id: 'action-1', merchant_id: merchantId, support_payout_case_id: caseId, capability_id: 'replacement.manual_handoff', action_state: 'source_observed_attempt', state_version: 2, merchant_reported_at: null, observed_at: '2026-09-06T10:00:00.000Z', amount_minor: 2500, currency: 'GBP', payload: {}, created_at: '2026-09-06T09:00:00.000Z' }],
      case_outcome_events: [{ merchant_id: merchantId, support_payout_case_id: caseId, outcome_type: 'replacement', state: 'merchant_confirmed', amount_minor: 1875, currency: 'GBP', observed_at: '2026-09-06T11:00:00.000Z', metadata: { external_action_id: 'action-1' } }],
    });

    const result = await loadReplacementReadModel(client as unknown as SupabaseClient, merchantId, caseId);
    expect(result.ready).toBe(true);
    expect(result.order).toMatchObject({ reference: '#1001', providerVerified: true, providerHref: 'https://unit-test.myshopify.com/admin/orders/1001' });
    expect(result.items[0]).toMatchObject({
      orderedQuantity: 3,
      claimedQuantity: 3,
      confirmedReplacementQuantity: 1,
      outstandingAuthorisedQuantity: 1,
      availableQuantity: 1,
      costMinor: 1200,
    });
    expect(result.latestHandoff).toMatchObject({ id: 'action-1', state: 'source_observed_attempt', actualCostMinor: 1875, actualCostCurrency: 'GBP' });
  });

  it('returns unavailable rather than assuming zero when P05 storage cannot be read', async () => {
    const client = queryClient({
      support_payout_cases: [{ id: caseId, merchant_id: merchantId, source_order_id: 'order-1' }],
      source_orders: [{ id: 'order-1', merchant_id: merchantId, external_id: '1001', order_number: '#1001', source: 'shopify', source_account_id: 'account-1', currency: 'GBP' }],
      source_accounts: [{ id: 'account-1', merchant_id: merchantId, connection_id: 'connection-1', external_account_id: 'unit-test.myshopify.com' }],
      merchant_integrations: [{ id: 'connection-1', merchant_id: merchantId, provider_id: 'shopify', provider_account_id: 'unit-test.myshopify.com', status: 'connected', last_verification_status: 'verified' }],
      case_claimed_items: [{ id: 'claimed-1', merchant_id: merchantId, support_payout_case_id: caseId, source_order_line_id: 'line-1', claimed_quantity: 1, match_status: 'confirmed' }],
      source_order_lines: [{ id: 'line-1', merchant_id: merchantId, source_order_id: 'order-1', external_id: 'line-ext-1', quantity: 1 }],
      source_replacements: [], case_decisions: [], connector_action_runs: [],
    }, { case_replacement_authorisation_items: 'relation missing' });
    const result = await loadReplacementReadModel(client as unknown as SupabaseClient, merchantId, caseId);
    expect(result.ready).toBe(false);
    expect(result.unavailableReasons[0]).toContain('storage is unavailable');
    expect(result.items).toEqual([]);
  });

  it('passes exact items and budgets to the atomic authorisation RPC', async () => {
    const client = queryClient({});
    client.rpc.mockResolvedValue({
      data: { outcome_id: 'outcome-1', decision_id: 'decision-1', new_version: 4, replayed: false, action: { id: 'action-1', capability_id: 'replacement.manual_handoff' }, replacement_items: [{ sku: 'SKU-1' }] },
      error: null,
    });
    const result = await recordSameItemReplacement(client as unknown as SupabaseClient, {
      merchantId, caseId, expectedVersion: 3,
      actorUserId: '33333333-3333-4333-8333-333333333333',
      idempotencyKey: 'replacement-request-1', budgetMinor: 2500, currency: 'gbp',
      reason: 'Replace the damaged original item.', duplicateConcessionJustification: null,
      items: [{ claimed_item_id: '44444444-4444-4444-8444-444444444444', quantity: 2 }],
      recommendationSnapshot: { comparison_token: 'token' }, followedRecommendation: null,
      relatedSourceObject: { source_order_id: 'order-1' },
    });
    expect(client.rpc).toHaveBeenCalledWith('record_same_item_replacement_v1', expect.objectContaining({
      p_budget_minor: 2500,
      p_currency: 'gbp',
      p_items: [{ claimed_item_id: '44444444-4444-4444-8444-444444444444', quantity: 2 }],
    }));
    expect(result).toMatchObject({ decision: 'approved', amount_minor: 2500, currency: 'GBP', action: { id: 'action-1' } });
  });

  it('uses separate receipt and source-corroboration RPCs', async () => {
    const client = queryClient({});
    client.rpc
      .mockResolvedValueOnce({ data: { action: { id: 'action-1', action_state: 'merchant_reported_attempt' }, replayed: false }, error: null })
      .mockResolvedValueOnce({ data: { matched: true, replayed: false, action: { id: 'action-1', action_state: 'succeeded' } }, error: null });
    await reportReplacementDispatch(client as unknown as SupabaseClient, {
      merchantId, actionId: 'action-1', actorUserId: 'actor-1', expectedVersion: 1,
      idempotencyKey: 'dispatch-request-1', method: 'manual_shopify_handoff', externalReference: 'R-1001',
    });
    await corroborateReplacementHandoff(client as unknown as SupabaseClient, {
      merchantId, sourceReplacementId: 'source-replacement-1', observedAt: '2026-09-06T10:00:00.000Z',
    });
    expect(client.rpc.mock.calls[0][0]).toBe('report_replacement_dispatch_v1');
    expect(client.rpc.mock.calls[1][0]).toBe('corroborate_replacement_handoff_v1');
  });

  it('records actual cost through its own atomic outcome and ledger RPC', async () => {
    const client = queryClient({});
    client.rpc.mockResolvedValue({ data: { outcome: { id: 'outcome-1' }, financial_entry: { id: 'entry-1', state: 'confirmed_loss' }, replayed: false }, error: null });
    const result = await recordReplacementCost(client as unknown as SupabaseClient, {
      merchantId, caseId, actionId: 'action-1', actorUserId: 'actor-1',
      idempotencyKey: 'replacement-cost-1', amountMinor: 1875, currency: 'GBP',
      reason: 'Retained Shopify receipt.',
    });
    expect(client.rpc).toHaveBeenCalledWith('record_replacement_cost_v1', expect.objectContaining({
      p_action_id: 'action-1', p_amount_minor: 1875, p_currency: 'GBP',
    }));
    expect(result.financial_entry).toMatchObject({ state: 'confirmed_loss' });
  });
});
