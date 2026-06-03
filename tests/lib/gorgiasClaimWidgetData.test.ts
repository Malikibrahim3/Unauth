import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  assembleClaimWidgetData,
  countShopifyOrdersAtMerchant,
  countStoreRecentClaims,
  derivePrimaryReason,
  derivePrimaryReasonFromTypes,
  readThisStoreSummary,
  type GorgiasWidgetModel,
  type WidgetStats,
} from '@/lib/gorgias/widgetData';
import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';
import { buildGorgiasSidebarWidgetTemplate } from '@/lib/support/gorgias/registerSidebarWidget';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

const NOW = '2026-05-30T00:00:00.000Z';

const emptyStoreClaimFields = {
  storePrimaryReason: null,
  storeRecentClaimCount: 0,
} as const;

function merchantProfileModel(stats: WidgetStats | null): GorgiasWidgetModel {
  return {
    state: 'merchant_profile',
    profileId: 'profile-1',
    riskLevel: 'low',
    riskScore: 10,
    fraudFlags: [],
    identityConfidenceGrade: null,
    profileUrl: 'https://app.unauth.test/customers/profile-1',
    stats,
  };
}

function summaryRow(over: Partial<{ total_orders: number; total_claims: number; claim_rate: number; last_claim_at: string | null; updated_at: string | null }> = {}) {
  return {
    total_orders: over.total_orders ?? 0,
    total_claims: over.total_claims ?? 0,
    claim_rate: over.claim_rate ?? 0,
    last_claim_at: over.last_claim_at ?? null,
    updated_at: over.updated_at ?? NOW,
  };
}

describe('derivePrimaryReasonFromTypes', () => {
  it('returns dominant when one type is >50%', () => {
    expect(derivePrimaryReasonFromTypes(['INR', 'INR', 'INR'])).toEqual({
      type: 'dominant',
      label: 'Item not received',
      percentage: 100,
    });
  });

  it('returns varied when no type reaches 50%', () => {
    // 2-2-1 across 5 claims: top is 40% (<50%) → varied with 3 distinct reasons.
    const result = derivePrimaryReasonFromTypes(['INR', 'INR', 'damaged', 'damaged', 'wrong_item']);
    expect(result).toEqual({ type: 'varied', reasonCount: 3 });
  });

  it('returns varied when top reason is exactly 50% (2-1-1 distribution)', () => {
    // 4 claims, 3 reasons: INR=2 (50%), damaged=1, wrong_item=1. Exactly 50% → varied.
    const result = derivePrimaryReasonFromTypes(['INR', 'INR', 'damaged', 'wrong_item']);
    expect(result).toEqual({ type: 'varied', reasonCount: 3 });
  });

  it('returns null for zero claims', () => {
    expect(derivePrimaryReasonFromTypes([])).toBeNull();
  });
});

describe('derivePrimaryReason (support_case_intake query)', () => {
  it('counts claim_type across all merchants for the identity', async () => {
    const client = createMemoryClient();
    const hash = 'emailhash-1';
    const store = client.__store;
    store.set(TABLES.SUPPORT_CASE_INTAKE, [
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm1', requires_merchant_review: false },
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm2', requires_merchant_review: false },
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm2', requires_merchant_review: false },
      { customer_email_hash: hash, claim_type: 'damaged', is_claim: true, merchant_id: 'm3', requires_merchant_review: true },
      { customer_email_hash: 'other', claim_type: 'damaged', is_claim: true, merchant_id: 'm1', requires_merchant_review: false },
      { customer_email_hash: hash, claim_type: 'damaged', is_claim: false, merchant_id: 'm1', requires_merchant_review: false },
    ]);

    const reason = await derivePrimaryReason(client as unknown as SupabaseClient, hash);
    expect(reason).toEqual({ type: 'dominant', label: 'Item not received', percentage: 100 });
  });
});

describe('countStoreRecentClaims (support_case_intake query)', () => {
  it('filters recent claims on created_at_provider (the column that exists)', async () => {
    const gteCalls: Array<{ column: string }> = [];
    let countReturned = 1;
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.gte = (column: string) => {
      gteCalls.push({ column });
      return Promise.resolve({ count: countReturned, error: null });
    };
    const service = { from: () => builder } as unknown as SupabaseClient;

    const n = await countStoreRecentClaims(service, 'm1', 'emailhash-1');
    expect(n).toBe(1);
    // Must NOT query a non-existent `created_at` column (would error → silent 0).
    expect(gteCalls).toEqual([{ column: 'created_at_provider' }]);
  });
});

describe('readThisStoreSummary', () => {
  it('does not trust stale cached claims that now require merchant review', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    const hash = 'emailhash-1';
    store.set(TABLES.CUSTOMER_CLAIM_SUMMARY, [
      summaryRow({
        total_orders: 10,
        total_claims: 1,
        claim_rate: 0.1,
        last_claim_at: '2026-05-31T09:42:00.000Z',
      }) as unknown as Record<string, unknown>,
    ]);
    store.get(TABLES.CUSTOMER_CLAIM_SUMMARY)![0].merchant_id = 'm1';
    store.get(TABLES.CUSTOMER_CLAIM_SUMMARY)![0].customer_email_hash = hash;
    store.set(TABLES.SUPPORT_CASE_INTAKE, [
      {
        merchant_id: 'm1',
        customer_email_hash: hash,
        is_claim: true,
        requires_merchant_review: true,
        claim_type: 'INR',
        created_at_provider: '2026-05-31T09:42:00.000Z',
      },
    ]);

    const summary = await readThisStoreSummary(client as unknown as SupabaseClient, 'm1', hash);

    expect(summary).toMatchObject({
      total_orders: 10,
      total_claims: 0,
      claim_rate: 0,
      last_claim_at: null,
    });
  });

  it('recomputes cached claim counts from confirmed support-intake rows', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    const hash = 'emailhash-1';
    store.set(TABLES.CUSTOMER_CLAIM_SUMMARY, [
      {
        ...summaryRow({ total_orders: 10, total_claims: 3, claim_rate: 0.3 }),
        merchant_id: 'm1',
        customer_email_hash: hash,
      },
    ]);
    store.set(TABLES.SUPPORT_CASE_INTAKE, [
      {
        merchant_id: 'm1',
        customer_email_hash: hash,
        is_claim: true,
        requires_merchant_review: false,
        claim_type: 'INR',
        created_at_provider: '2026-05-29T09:42:00.000Z',
      },
      {
        merchant_id: 'm1',
        customer_email_hash: hash,
        is_claim: true,
        requires_merchant_review: false,
        claim_type: 'damaged',
        created_at_provider: '2026-05-31T09:42:00.000Z',
      },
      {
        merchant_id: 'm1',
        customer_email_hash: hash,
        is_claim: true,
        requires_merchant_review: true,
        claim_type: 'wrong_item',
        created_at_provider: '2026-06-01T09:42:00.000Z',
      },
    ]);

    const summary = await readThisStoreSummary(client as unknown as SupabaseClient, 'm1', hash);

    expect(summary).toMatchObject({
      total_orders: 10,
      total_claims: 2,
      claim_rate: 0.2,
      last_claim_at: '2026-05-31T09:42:00.000Z',
    });
  });
});

describe('countShopifyOrdersAtMerchant', () => {
  it('counts all Shopify orders through the linked Shopify customer id', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    store.set('merchant_shopify_connections', [
      { merchant_id: 'm1', shop_domain: 's.myshopify.com', active: true },
    ]);
    store.set(TABLES.CUSTOMER_PROFILE_IDENTITIES, [
      {
        merchant_id: 'm1',
        identity_type: 'email',
        identity_value: 'shopper@example.com',
        customer_profile_id: 'profile-1',
      },
      {
        merchant_id: 'm1',
        identity_type: 'shopify_customer_id',
        identity_value: 'shopify-customer-1',
        customer_profile_id: 'profile-1',
      },
    ]);
    store.set(
      'shopify_order_signals',
      Array.from({ length: 7 }, (_, i) => ({
        shop_domain: 's.myshopify.com',
        shopify_order_id: `order-${i + 1}`,
        order_number: String(1000 + i + 1),
        customer_id: 'shopify-customer-1',
      }))
    );
    store.set('merchant_identities', [
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'order-1',
        email: 'shopper@example.com',
      },
    ]);

    await expect(
      countShopifyOrdersAtMerchant(
        client as unknown as SupabaseClient,
        'm1',
        'shopper@example.com'
      )
    ).resolves.toBe(7);
  });

  it('uses the broader merged profile count when the ticket email has fewer direct orders', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    store.set('merchant_shopify_connections', [
      { merchant_id: 'm1', shop_domain: 's.myshopify.com', active: true },
    ]);
    store.set(TABLES.CUSTOMER_PROFILE_IDENTITIES, [
      {
        merchant_id: 'm1',
        identity_type: 'email',
        identity_value: 'shopper@example.com',
        customer_profile_id: 'profile-1',
      },
      {
        merchant_id: 'm1',
        identity_type: 'shopify_customer_id',
        identity_value: 'ticket-email-customer',
        customer_profile_id: 'profile-1',
      },
      {
        merchant_id: 'm1',
        identity_type: 'shopify_customer_id',
        identity_value: 'merged-other-email-customer',
        customer_profile_id: 'profile-1',
      },
    ]);
    store.set('merchant_identities', [
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'order-1',
        email: 'shopper@example.com',
        customer_id: 'ticket-email-customer',
      },
    ]);
    store.set('shopify_order_signals', [
      ...Array.from({ length: 7 }, (_, i) => ({
        shop_domain: 's.myshopify.com',
        shopify_order_id: `ticket-order-${i + 1}`,
        order_number: String(1000 + i + 1),
        customer_id: 'ticket-email-customer',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        shop_domain: 's.myshopify.com',
        shopify_order_id: `other-order-${i + 1}`,
        order_number: String(2000 + i + 1),
        customer_id: 'merged-other-email-customer',
      })),
    ]);

    await expect(
      countShopifyOrdersAtMerchant(
        client as unknown as SupabaseClient,
        'm1',
        'shopper@example.com'
      )
    ).resolves.toBe(12);
  });

  it('ignores synthetic non-Shopify order-number rows in signal counts', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    store.set('merchant_shopify_connections', [
      { merchant_id: 'm1', shop_domain: 's.myshopify.com', active: true },
    ]);
    store.set(TABLES.CUSTOMER_PROFILE_IDENTITIES, []);
    store.set('merchant_identities', [
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'real-order-1',
        email: 'shopper@example.com',
        customer_id: 'ticket-email-customer',
      },
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'synthetic-order-1',
        email: 'shopper@example.com',
        customer_id: 'ticket-email-customer',
      },
    ]);
    store.set('shopify_order_signals', [
      {
        shop_domain: 's.myshopify.com',
        shopify_order_id: 'real-order-1',
        order_number: '1011',
        customer_id: 'ticket-email-customer',
      },
      {
        shop_domain: 's.myshopify.com',
        shopify_order_id: 'synthetic-order-1',
        order_number: 'T-865935',
        customer_id: 'ticket-email-customer',
      },
    ]);

    await expect(
      countShopifyOrdersAtMerchant(
        client as unknown as SupabaseClient,
        'm1',
        'shopper@example.com'
      )
    ).resolves.toBe(1);
  });

  it('falls back to direct merchant identity email rows when no profile link exists', async () => {
    const client = createMemoryClient();
    const store = client.__store;
    store.set('merchant_shopify_connections', [
      { merchant_id: 'm1', shop_domain: 's.myshopify.com', active: true },
    ]);
    store.set(TABLES.CUSTOMER_PROFILE_IDENTITIES, []);
    store.set('shopify_order_signals', []);
    store.set('merchant_identities', [
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'order-1',
        email: 'shopper@example.com',
      },
      {
        shop_domain: 's.myshopify.com',
        source: 'order',
        source_id: 'order-2',
        email: 'shopper@example.com',
      },
    ]);

    await expect(
      countShopifyOrdersAtMerchant(
        client as unknown as SupabaseClient,
        'm1',
        'shopper@example.com'
      )
    ).resolves.toBe(2);
  });
});

describe('assembleClaimWidgetData', () => {
  it('scenario A: 0 claims this store, 3 INR claims across network', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 1,
        storeClaims: 0,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 4,
        networkClaims: 3,
        networkMerchants: 2,
        networkRecentClaims: 1,
      }),
      summary: summaryRow({ total_orders: 1, total_claims: 0, claim_rate: 0 }),
      primaryReason: derivePrimaryReasonFromTypes(['INR', 'INR', 'INR']),
      profileUrl: 'https://app.unauth.test/customers/profile-1',
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.claimRate).toBe(0);
    expect(result.data.network?.claimRate).toBe(0.75);
    expect(result.data.network?.primaryReason).toEqual({
      type: 'dominant',
      label: 'Item not received',
      percentage: 100,
    });
  });

  it('scenario C: no cross-merchant footprint → network is null', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 3,
        storeClaims: 1,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 3,
        networkClaims: 1,
        networkMerchants: 1, // only this merchant
        networkRecentClaims: 0,
      }),
      summary: summaryRow({ total_orders: 3, total_claims: 1, claim_rate: 0.33 }),
      primaryReason: null,
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.network).toBeNull();
  });

  it('scenario D: 2 recent of 5 network claims', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 2,
        storeClaims: 1,
        primaryReason: null,
        storeRecentClaims: 1,
        networkOrders: 10,
        networkClaims: 5,
        networkMerchants: 3,
        networkRecentClaims: 2,
      }),
      summary: summaryRow({ total_orders: 2, total_claims: 1, claim_rate: 0.5 }),
      primaryReason: derivePrimaryReasonFromTypes(['INR', 'INR', 'INR', 'damaged', 'wrong_item']),
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.network?.recentClaimCount).toBe(2);
    expect(result.data.network?.claimCount).toBe(5);
  });

  it('scenario E: zero claims anywhere → primaryReason null, both rates 0', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 3,
        storeClaims: 0,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 5,
        networkClaims: 0,
        networkMerchants: 2,
        networkRecentClaims: 0,
      }),
      summary: summaryRow({ total_orders: 3, total_claims: 0, claim_rate: 0 }),
      primaryReason: null,
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.claimRate).toBe(0);
    expect(result.data.network?.claimRate).toBe(0);
    expect(result.data.network?.primaryReason).toBeNull();
  });

  it('prefers Shopify order count over audit stats when both are present', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 9,
        storeClaims: 0,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 9,
        networkClaims: 0,
        networkMerchants: 1,
        networkRecentClaims: 0,
      }),
      summary: null,
      primaryReason: null,
      profileUrl: null,
      nowIso: NOW,
      shopifyOrderCount: 1,
      ...emptyStoreClaimFields,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.orderCount).toBe(1);
    expect(result.data.thisStore.ordersCountSource).toBe('shopify_identities');
  });

  it('uses Shopify order count as the denominator when claim summary order count is stale', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 12,
        storeClaims: 1,
        primaryReason: null,
        storeRecentClaims: 1,
        networkOrders: 12,
        networkClaims: 1,
        networkMerchants: 1,
        networkRecentClaims: 1,
      }),
      summary: summaryRow({ total_orders: 1, total_claims: 1, claim_rate: 1 }),
      primaryReason: null,
      storePrimaryReason: derivePrimaryReasonFromTypes(['INR']),
      storeRecentClaimCount: 1,
      profileUrl: null,
      nowIso: NOW,
      shopifyOrderCount: 7,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.orderCount).toBe(7);
    expect(result.data.thisStore.claimCount).toBe(1);
    expect(result.data.thisStore.claimRate).toBe(0.14);
    expect(result.data.thisStore.ordersCountSource).toBe('shopify_identities');

    const payload = claimWidgetToJson(result, undefined, { allowDetailedPreview: true });
    expect(payload.orders).toBe('7 linked orders here · No cross-store history found');
    expect(payload.claim_rate).toBe('14% this store');
    expect(payload.primary_reason).toBe('Item not received · 100%');
    expect(payload.recent_activity).toBe('1 claim in last 90 days');
  });

  it('uses audit transaction stats when claim summary and Shopify rows are missing', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 1,
        storeClaims: 0,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 1,
        networkClaims: 0,
        networkMerchants: 1,
        networkRecentClaims: 0,
      }),
      summary: null,
      primaryReason: null,
      profileUrl: null,
      nowIso: NOW,
      shopifyOrderCount: 0,
      ...emptyStoreClaimFields,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.orderCount).toBe(1);
    expect(result.data.thisStore.ordersCountSource).toBe('audit_transactions');
    expect(result.data.thisStore.claimRate).toBe(0);
  });

  it('falls back to Shopify identity order count when summary and profile stats are unavailable', () => {
    const result = assembleClaimWidgetData({
      model: { ...merchantProfileModel(null), stats: null },
      summary: null,
      primaryReason: null,
      profileUrl: null,
      nowIso: NOW,
      shopifyOrderCount: 1,
      ...emptyStoreClaimFields,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.orderCount).toBe(1);
    expect(result.data.thisStore.ordersCountSource).toBe('shopify_identities');
  });

  it('maps error and not_found models', () => {
    expect(
      assembleClaimWidgetData({
        model: { state: 'error', message: 'boom' },
        summary: null,
        primaryReason: null,
        profileUrl: null,
        ...emptyStoreClaimFields,
        nowIso: NOW,
      })
    ).toEqual({ ok: false, kind: 'error', message: 'boom' });

    expect(
      assembleClaimWidgetData({
        model: { state: 'not_found' },
        summary: null,
        primaryReason: null,
        profileUrl: null,
        ...emptyStoreClaimFields,
        nowIso: NOW,
      })
    ).toEqual({ ok: false, kind: 'not_found' });

    const withShopify = assembleClaimWidgetData({
      model: { state: 'not_found' },
      summary: null,
      primaryReason: null,
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
      shopifyOrderCount: 1,
    });
    expect(withShopify.ok).toBe(true);
    if (withShopify.ok) {
      expect(withShopify.data.thisStore.orderCount).toBe(1);
    }
  });
});

describe('claimWidgetToJson', () => {
  function okResult(over: { thisStore?: Partial<WidgetStats>; network?: unknown } = {}) {
    return assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 1,
        storeClaims: 1,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 4,
        networkClaims: 3,
        networkMerchants: 2,
        networkRecentClaims: 2,
      }),
      summary: summaryRow({ total_orders: 1, total_claims: 1, claim_rate: 1 }),
      primaryReason: derivePrimaryReasonFromTypes(['INR', 'INR', 'INR']),
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });
  }

  it('renders network claim rate as a whole percentage and dominant reason', () => {
    const payload = claimWidgetToJson(okResult(), undefined, { allowDetailedPreview: true });
    expect(payload.claim_rate).toBe('100% this store · 75% network');
    expect(payload.primary_reason).toBe('Item not received · 100%');
    expect(payload.recent_activity).toBe('2 claims in last 90 days');
    for (const value of Object.values(payload)) {
      expect(typeof value).toBe('string');
      expect(value).not.toContain('undefined');
      expect(value).not.toContain('null');
    }
  });

  it('renders "No network history found" when network is null and the count is not Shopify-linked', () => {
    const result = assembleClaimWidgetData({
      model: merchantProfileModel({
        storeOrders: 2,
        storeClaims: 0,
        primaryReason: null,
        storeRecentClaims: 0,
        networkOrders: 2,
        networkClaims: 0,
        networkMerchants: 1,
        networkRecentClaims: 0,
      }),
      summary: summaryRow({ total_orders: 2, total_claims: 0, claim_rate: 0 }),
      primaryReason: null,
      profileUrl: null,
      ...emptyStoreClaimFields,
      nowIso: NOW,
    });
    const payload = claimWidgetToJson(result, undefined, { allowDetailedPreview: true });
    expect(payload.orders).toContain('No network history found');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });

  it('shows credit-gated copy for not_found by default', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' });
    expect(payload.identity).toBe('Context available for this ticket');
    expect(payload.orders).toContain('2 credits');
    for (const value of Object.values(payload)) {
      expect(typeof value).toBe('string');
      expect(value).not.toContain('undefined');
    }
  });

  it('shows legacy not_found copy only in diagnostic preview mode', () => {
    const payload = claimWidgetToJson(
      { ok: false, kind: 'not_found' },
      undefined,
      { allowDetailedPreview: true },
    );
    expect(payload.orders).toBe('Not seen at any store yet');
    expect(payload.claim_rate).toBe('—');
  });
});

describe('buildGorgiasSidebarWidgetTemplate', () => {
  it('uses context-unlock card title and row labels without legacy risk wording', () => {
    const template = buildGorgiasSidebarWidgetTemplate('https://app.unauth.test');
    const json = JSON.stringify(template);
    expect(template.widgets[0].title).toBe('Unauth claim context');
    const rowTitles = template.widgets[0].widgets.map((w: { title: string }) => w.title);
    expect(rowTitles).toEqual([
      'Case context',
      'Basic context',
      'Full context',
      'Evidence summary',
      'Store context',
      'Network context',
      'Review note',
      'Data safety',
    ]);
    expect(json).not.toContain('Claims on record');
    expect(json).not.toContain('Claim rate');
    expect(json).not.toContain('Identity Intelligence');
    expect(template.widgets[0].meta.custom.links[0]).toEqual({
      url: '{{basic_unlock_url}}',
      label: '{{basic_unlock_label}}',
    });
    expect(template.widgets[0].meta.custom.links[3]).toEqual({
      url: '{{cta_url}}',
      label: '{{cta_label}}',
    });
    expect(json).not.toContain('View full profile in Unauth');
    expect(json.toLowerCase()).not.toContain('fraud');
  });
});
