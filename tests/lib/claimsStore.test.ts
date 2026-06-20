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
  } = {}
) {
  const calls: CapturedCall[] = [];
  const sourceOrders = options.sourceOrders ?? [];
  const existingClaims = options.existingClaims ?? [];

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

  it('adding evidence item works', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertClaimEvidenceItem(supabase, {
      claim_id: '550e8400-e29b-41d4-a716-446655440000',
      merchant_id: '550e8400-e29b-41d4-a716-446655440000',
      evidence_type: 'tracking',
      source: 'shopify',
      metadata: { tracking_urls_count: 1 },
    });
    expect(calls[0].table).toBe('claim_evidence');
    expect(calls[0].payload.metadata.source).toBe('shopify');
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
