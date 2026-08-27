import type { SupabaseClient } from '@supabase/supabase-js';
import {
  actionRequestFingerprint,
  observeShopifyRefundForExternalAction,
  prepareDecisionHandoff,
  shopifyAdminOrderHref,
} from '@/lib/claims/externalAction';
import { TABLES } from '@/lib/supabase/tables';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

function seededClient(verification = 'verified') {
  return createMemoryClient(new Map([
    [TABLES.SOURCE_ORDERS, [{
      id: 'order-1',
      merchant_id: 'merchant-1',
      source: 'shopify',
      source_account_id: 'account-1',
      external_id: 'gid://shopify/Order/123456789',
      order_number: '#1042',
    }]],
    [TABLES.SOURCE_ACCOUNTS, [{
      id: 'account-1',
      merchant_id: 'merchant-1',
      connection_id: 'connection-1',
      provider_id: 'shopify',
      external_account_id: 'merchant-one.myshopify.com',
      display_name: 'Merchant One',
      base_url: 'https://merchant-one.myshopify.com',
      environment: 'production',
    }]],
    [TABLES.MERCHANT_INTEGRATIONS, [{
      id: 'connection-1',
      merchant_id: 'merchant-1',
      provider_id: 'shopify',
      provider_account_id: 'merchant-one.myshopify.com',
      provider_account_name: 'Merchant One',
      status: 'connected',
      environment: 'production',
      last_verification_status: verification,
      last_verified_at: '2026-08-23T09:00:00.000Z',
    }]],
    [TABLES.CASE_CLAIMED_ITEMS, [{
      id: 'item-1',
      merchant_id: 'merchant-1',
      support_payout_case_id: 'case-1',
      source_order_line_id: 'line-1',
      claimed_sku: 'SKU-1',
      claimed_quantity: 1,
      created_at: '2026-08-23T09:00:00.000Z',
    }]],
  ]));
}

const handoffInput = {
  merchantId: 'merchant-1',
  actorUserId: 'user-1',
  caseId: 'case-1',
  sourceOrderId: 'order-1',
  requestedAction: 'refund',
  issueReason: 'Parcel not received',
  decision: {
    id: 'decision-1',
    decision: 'partial_refund',
    amountMinor: 2500,
    currency: 'GBP',
  },
};

describe('merchant decision assisted handoff', () => {
  it('creates one exact, immutable manual handoff without asserting provider action', async () => {
    const client = seededClient();
    const first = await prepareDecisionHandoff(client as unknown as SupabaseClient, handoffInput);
    const replay = await prepareDecisionHandoff(client as unknown as SupabaseClient, handoffInput);

    expect(first.status).toBe('handoff_ready');
    expect(replay.status).toBe('handoff_ready');
    const rows = client.__store.get(TABLES.CONNECTOR_ACTION_RUNS) ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      merchant_id: 'merchant-1',
      connection_id: 'connection-1',
      support_payout_case_id: 'case-1',
      capability_id: 'refund.manual_handoff',
      external_record_id: 'gid://shopify/Order/123456789',
      status: 'manual_required',
      action_state: 'handoff_ready',
      state_version: 1,
      requested_operation: 'refund',
      amount_minor: 2500,
      currency: 'GBP',
      request_fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      idempotency_key: 'case-handoff:decision-1',
      result: expect.objectContaining({
        action_state: 'handoff_ready',
        external_action_performed: false,
        provider_response: null,
      }),
      payload: expect.objectContaining({
        contract_version: 'case-assisted-handoff-v1',
        operation: 'refund',
        scope: 'partial',
        amount_minor: 2500,
        currency: 'GBP',
        source_object: expect.objectContaining({
          provider_href: 'https://merchant-one.myshopify.com/admin/orders/123456789',
        }),
      }),
    });
  });

  it('keeps the handoff unavailable when the source account is not currently verified', async () => {
    const client = seededClient('failed');
    const result = await prepareDecisionHandoff(client as unknown as SupabaseClient, handoffInput);

    expect(result).toMatchObject({ status: 'unavailable', action: null });
    expect(client.__store.get(TABLES.CONNECTOR_ACTION_RUNS) ?? []).toHaveLength(0);
  });

  it('only creates safe Shopify Admin order URLs and stable fingerprints', () => {
    expect(shopifyAdminOrderHref('merchant-one.myshopify.com', 'gid://shopify/Order/123')).toBe(
      'https://merchant-one.myshopify.com/admin/orders/123',
    );
    expect(shopifyAdminOrderHref('merchant-one.myshopify.com.evil.test', '123')).toBeNull();
    expect(shopifyAdminOrderHref('merchant-one.myshopify.com', 'not-an-order')).toBeNull();
    expect(actionRequestFingerprint({ b: 2, a: { d: 4, c: 3 } })).toBe(
      actionRequestFingerprint({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it('advances a source-observed successful refund through acceptance, success and reconciliation', async () => {
    let stateVersion = 1;
    const action = {
      id: 'action-1',
      action_state: 'merchant_reported_attempt',
      state_version: stateVersion,
      amount_minor: 2500,
      currency: 'GBP',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [action], error: null }),
    };
    const rpc = jest.fn().mockImplementation(async (_name: string, args: Record<string, unknown>) => {
      stateVersion += 1;
      return {
        data: { action: { ...action, action_state: args.p_target_state, state_version: stateVersion }, replayed: false },
        error: null,
      };
    });
    const client = { from: jest.fn(() => query), rpc } as unknown as SupabaseClient;

    const result = await observeShopifyRefundForExternalAction(client, {
      merchantId: 'merchant-1',
      caseId: 'case-1',
      sourceOrderExternalId: 'gid://shopify/Order/123456789',
      amountMinor: 2500,
      currency: 'GBP',
      refundExternalId: 'refund-1',
      transactionState: 'success',
      observedAt: '2026-08-23T12:00:00.000Z',
      domainEventId: 'event-1',
    });

    expect(rpc.mock.calls.map(([, args]) => [args.p_target_state, args.p_authority])).toEqual([
      ['source_observed_attempt', 'source'],
      ['provider_accepted', 'source'],
      ['succeeded', 'source'],
      ['reconciled', 'system'],
    ]);
    expect(result).toMatchObject({ action_state: 'reconciled', state_version: 5 });
  });
});
