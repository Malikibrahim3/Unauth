import {
  upsertMerchantClaim,
  upsertMerchantCaseOutcome,
  upsertClaimEvidenceItem,
} from '@/lib/claims/store';

type CapturedCall = { table: string; op: string; payload: any; opts: any };

function makeSupabaseCapture(
  options: {
    sourceOrders?: Array<{ id: string; merchant_id: string; external_id?: string; order_number?: string }>;
    existingClaims?: Array<Record<string, any>>;
    payoutCases?: Array<Record<string, any>>;
    priorDecisions?: Array<Record<string, any>>;
  } = {}
) {
  const calls: CapturedCall[] = [];
  const sourceOrders = options.sourceOrders ?? [];
  const existingClaims = options.existingClaims ?? [];
  const payoutCases = options.payoutCases ?? [];
  const priorDecisions = options.priorDecisions ?? [];

  const supabase = {
    from: (table: string) => {
      // Read path for source_orders + existing-claim lookups uses a chainable
      // builder ending in maybeSingle.
      const filters: Record<string, any> = {};
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          filters[col] = val;
          return builder;
        },
        limit: () => builder,
        order: () => builder,
        maybeSingle: async () => {
          if (table === 'source_orders') {
            const row = sourceOrders.find(
              (o) =>
                o.merchant_id === filters.merchant_id &&
                (('external_id' in filters && o.external_id === filters.external_id) ||
                  ('order_number' in filters && o.order_number === filters.order_number))
            );
            return { data: row ?? null, error: null };
          }
          if (table === 'support_payout_cases' && payoutCases.length > 0) {
            const row = payoutCases.find((c) =>
              Object.entries(filters).every(([k, v]) => c[k] === v)
            );
            return { data: row ?? null, error: null };
          }
          if (table === 'case_decisions') {
            const row = priorDecisions.find((c) =>
              Object.entries(filters).every(([k, v]) => c[k] === v)
            );
            return { data: row ?? null, error: null };
          }
          const claim = existingClaims.find((c) =>
            Object.entries(filters).every(([k, v]) => c[k] === v)
          );
          return { data: claim ?? null, error: null };
        },
        update: (payload: any) => {
          calls.push({ table, op: 'update', payload, opts: null });
          return builder;
        },
        single: async () => ({ data: { ...filters }, error: null }),
        insert: (payload: any) => {
          calls.push({ table, op: 'insert', payload, opts: null });
          return {
            select: () => ({ single: async () => ({ data: payload, error: null }) }),
          };
        },
        upsert: (payload: any, opts: any) => {
          calls.push({ table, op: 'upsert', payload, opts });
          return {
            select: () => ({
              single: async () => ({ data: payload, error: null }),
              maybeSingle: async () => ({ data: payload, error: null }),
            }),
          };
        },
      };
      return builder;
    },
  };
  return { supabase, calls };
}

describe('claims store', () => {
  it('creating claim works and links to the resolved source order', async () => {
    const { supabase, calls } = makeSupabaseCapture({
      sourceOrders: [
        {
          id: 'src-order-1',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          external_id: '1001',
        },
      ],
    });
    await upsertMerchantClaim(supabase, {
      merchant_id: '550e8400-e29b-41d4-a716-446655440000',
      shop_domain: 'unit-test.myshopify.com',
      shopify_order_id: '1001',
      claim_type: 'missing_parcel',
      status: 'open',
      amount_at_risk: 49.99,
      currency: 'USD',
    });
    const insert = calls.find((c) => c.op === 'insert');
    expect(insert?.table).toBe('support_payout_cases');
    expect(insert?.payload.source_order_id).toBe('src-order-1');
    expect(insert?.payload.customer_email).toBeUndefined();
  });

  it('adding outcome works', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertMerchantCaseOutcome(supabase, {
      claim_id: '550e8400-e29b-41d4-a716-446655440000',
      shop_domain: 'unit-test.myshopify.com',
      decision: 'full_refund',
      outcome: 'loss',
      amount_refunded: 49.99,
    });
    expect(calls[0].table).toBe('claim_outcomes');
    expect(calls[0].payload.decision).toBe('full_refund');
  });

  it('appends immutable case_decisions and case_outcomes alongside the claim_outcomes projection', async () => {
    const CASE_ID = '550e8400-e29b-41d4-a716-446655440000';
    const { supabase, calls } = makeSupabaseCapture({
      payoutCases: [{ id: CASE_ID, merchant_id: 'merchant-1', primary_currency: 'GBP' }],
    });
    await upsertMerchantCaseOutcome(supabase, {
      claim_id: CASE_ID,
      decision: 'full_refund',
      outcome: 'loss',
      amount_refunded: 49.99,
      actor_user_id: '11111111-1111-1111-1111-111111111111',
    });
    const decision = calls.find((c) => c.table === 'case_decisions' && c.op === 'insert');
    const outcome = calls.find((c) => c.table === 'case_outcomes' && c.op === 'insert');
    expect(decision?.payload).toMatchObject({
      merchant_id: 'merchant-1',
      support_payout_case_id: CASE_ID,
      decision: 'full_refund',
      amount_minor: 4999,
      currency: 'GBP',
      supersedes_decision_id: null,
      reverses_decision_id: null,
      actor_type: 'user',
    });
    expect(outcome?.payload).toMatchObject({ outcome_type: 'loss', amount_minor: 4999, currency: 'GBP' });
  });

  it('links a reversal to the prior decision without mutating it', async () => {
    const CASE_ID = '550e8400-e29b-41d4-a716-446655440000';
    const { supabase, calls } = makeSupabaseCapture({
      payoutCases: [{ id: CASE_ID, merchant_id: 'merchant-1', primary_currency: 'USD' }],
      priorDecisions: [{ id: 'decision-prior', merchant_id: 'merchant-1', support_payout_case_id: CASE_ID }],
    });
    await upsertMerchantCaseOutcome(
      supabase,
      { claim_id: CASE_ID, decision: 'denied', outcome: 'pending', notes: 'reversing prior', actor_user_id: '11111111-1111-1111-1111-111111111111' },
      { reversal: true },
    );
    const decision = calls.find((c) => c.table === 'case_decisions' && c.op === 'insert');
    expect(decision?.payload.supersedes_decision_id).toBe('decision-prior');
    expect(decision?.payload.reverses_decision_id).toBe('decision-prior');
    // Append-only: no update/delete against case_decisions.
    expect(calls.some((c) => c.table === 'case_decisions' && c.op !== 'insert')).toBe(false);
  });

  it('adding evidence item works', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertClaimEvidenceItem(supabase, {
      claim_id: '550e8400-e29b-41d4-a716-446655440000',
      merchant_id: '550e8400-e29b-41d4-a716-446655440000',
      evidence_type: 'tracking',
      source: 'shopify',
      metadata: { tracking_urls_count: 1 },
    });
    // Phase 7.1: claim evidence writes to canonical evidence_items with an
    // origin marker and source retained in source_metadata.
    expect(calls[0].table).toBe('evidence_items');
    expect(calls[0].payload.source_metadata.source).toBe('shopify');
    expect(calls[0].payload.source_metadata.origin_store).toBe('claim_evidence');
    expect(calls.some((c) => c.table === 'evidence_links')).toBe(true);
  });

  it('rejects invalid enum values', async () => {
    const { supabase } = makeSupabaseCapture();
    await expect(
      upsertMerchantClaim(supabase, {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        shop_domain: 'unit-test.myshopify.com',
        claim_type: 'fake_reason' as any,
      })
    ).rejects.toThrow();
    await expect(
      upsertMerchantCaseOutcome(supabase, {
        claim_id: '550e8400-e29b-41d4-a716-446655440000',
        shop_domain: 'unit-test.myshopify.com',
        decision: 'not_real' as any,
        outcome: 'loss',
      })
    ).rejects.toThrow();
    await expect(
      upsertClaimEvidenceItem(supabase, {
        claim_id: '550e8400-e29b-41d4-a716-446655440000',
        evidence_type: 'tracking',
        source: 'not_real' as any,
      })
    ).rejects.toThrow();
  });

  it('no PII required to create a claim', async () => {
    const { supabase } = makeSupabaseCapture({
      sourceOrders: [
        {
          id: 'src-order-2',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          external_id: '1002',
        },
      ],
    });
    await expect(
      upsertMerchantClaim(supabase, {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        shop_domain: 'unit-test.myshopify.com',
        shopify_order_id: '1002',
        claim_type: 'other',
      })
    ).resolves.toBeTruthy();
  });

  it('returns the existing claim without writing when ignoreDuplicates is set', async () => {
    const { supabase, calls } = makeSupabaseCapture({
      sourceOrders: [
        {
          id: 'src-order-2',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          external_id: '1002',
        },
      ],
      existingClaims: [
        {
          id: 'existing-claim',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          source_order_id: 'src-order-2',
          claim_type: 'other',
        },
      ],
    });
    const result = await upsertMerchantClaim(
      supabase,
      {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        shopify_order_id: '1002',
        claim_type: 'other',
      },
      { ignoreDuplicates: true }
    );
    expect(result).toMatchObject({ id: 'existing-claim' });
    expect(calls.filter((c) => c.op === 'insert' || c.op === 'update')).toHaveLength(0);
  });

  it('allows multiple payout case reasons for the same order', async () => {
    const { supabase, calls } = makeSupabaseCapture({
      sourceOrders: [
        {
          id: 'src-order-3',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          external_id: '1003',
        },
      ],
      existingClaims: [
        {
          id: 'existing-inr-case',
          merchant_id: '550e8400-e29b-41d4-a716-446655440000',
          source_order_id: 'src-order-3',
          claim_type: 'item_not_received',
        },
      ],
    });

    await upsertMerchantClaim(supabase, {
      merchant_id: '550e8400-e29b-41d4-a716-446655440000',
      shopify_order_id: '1003',
      case_reason: 'damaged_item',
      requested_action: 'replacement',
      amount_at_risk: 72,
      currency: 'GBP',
      recovery_required_evidence: ['damage_photo', 'packaging_photo'],
    });

    const insert = calls.find((c) => c.op === 'insert');
    expect(insert?.payload).toMatchObject({
      source_order_id: 'src-order-3',
      claim_type: 'damaged',
      reason_normalized: 'damaged_item',
      requested_action: 'replacement',
      amount_at_risk: 72,
      total_estimated_loss: 72,
      recovery_required_evidence: ['damage_photo', 'packaging_photo'],
    });
  });

  it('rejects claims without a merchant id or order identity', async () => {
    const { supabase } = makeSupabaseCapture();
    await expect(
      upsertMerchantClaim(supabase, {
        shopify_order_id: '1003',
        claim_type: 'other',
      })
    ).rejects.toThrow(/merchant_id is required/);

    await expect(
      upsertMerchantClaim(supabase, {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        claim_type: 'other',
      })
    ).rejects.toThrow(/Select an order/);
  });
});
