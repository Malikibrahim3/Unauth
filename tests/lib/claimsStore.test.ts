import {
  upsertMerchantClaim,
  upsertMerchantCaseOutcome,
  upsertClaimEvidenceItem,
} from '@/lib/claims/store';

function makeSupabaseCapture() {
  const calls: Array<{ table: string; payload: any; opts: any }> = [];
  const supabase = {
    from: (table: string) => ({
      upsert: (payload: any, opts: any) => {
        calls.push({ table, payload, opts });
        return {
          select: () => ({
            single: async () => ({ data: payload, error: null }),
            maybeSingle: async () => ({ data: payload, error: null }),
          }),
        };
      },
    }),
  };
  return { supabase, calls };
}

describe('claims store', () => {
  it('creating claim works and links to shopify_order_id', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertMerchantClaim(supabase, {
      merchant_id: '550e8400-e29b-41d4-a716-446655440000',
      shop_domain: 'unit-test.myshopify.com',
      shopify_order_id: '1001',
      claim_type: 'missing_parcel',
      status: 'open',
      amount_at_risk: 49.99,
      currency: 'USD',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('merchant_claims');
    expect(calls[0].opts.onConflict).toBe('merchant_id,shopify_order_id');
    expect(calls[0].payload.shopify_order_id).toBe('1001');
    expect(calls[0].payload.customer_email).toBeUndefined();
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
    expect(calls[0].table).toBe('merchant_case_outcomes');
    expect(calls[0].payload.decision).toBe('full_refund');
  });

  it('adding evidence item works', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertClaimEvidenceItem(supabase, {
      claim_id: '550e8400-e29b-41d4-a716-446655440000',
      evidence_type: 'tracking',
      source: 'shopify',
      metadata: { tracking_urls_count: 1 },
    });
    expect(calls[0].table).toBe('claim_evidence_items');
    expect(calls[0].payload.source).toBe('shopify');
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
    const { supabase } = makeSupabaseCapture();
    await expect(
      upsertMerchantClaim(supabase, {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        shop_domain: 'unit-test.myshopify.com',
        shopify_order_id: '1002',
        claim_type: 'other',
      })
    ).resolves.toBeTruthy();
  });

  it('can ignore duplicates atomically on merchant/order conflict', async () => {
    const { supabase, calls } = makeSupabaseCapture();
    await upsertMerchantClaim(
      supabase,
      {
        merchant_id: '550e8400-e29b-41d4-a716-446655440000',
        shopify_order_id: '1002',
        claim_type: 'other',
      },
      { ignoreDuplicates: true }
    );
    expect(calls[0].opts).toMatchObject({
      onConflict: 'merchant_id,shopify_order_id',
      ignoreDuplicates: true,
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
