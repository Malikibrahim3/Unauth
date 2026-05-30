import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  assembleClaimWidgetData,
  derivePrimaryReason,
  derivePrimaryReasonFromTypes,
  type GorgiasWidgetModel,
  type WidgetStats,
} from '@/lib/gorgias/widgetData';
import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';
import { buildGorgiasSidebarWidgetTemplate } from '@/lib/support/gorgias/registerSidebarWidget';
import { createMemoryClient } from '@/tests/lib/supabaseMemoryClient';

const NOW = '2026-05-30T00:00:00.000Z';

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
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm1' },
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm2' },
      { customer_email_hash: hash, claim_type: 'INR', is_claim: true, merchant_id: 'm2' },
      { customer_email_hash: 'other', claim_type: 'damaged', is_claim: true, merchant_id: 'm1' },
      { customer_email_hash: hash, claim_type: 'damaged', is_claim: false, merchant_id: 'm1' },
    ]);

    const reason = await derivePrimaryReason(client as unknown as SupabaseClient, hash);
    expect(reason).toEqual({ type: 'dominant', label: 'Item not received', percentage: 100 });
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
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.thisStore.orderCount).toBe(1);
    expect(result.data.thisStore.ordersCountSource).toBe('shopify_identities');
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
        nowIso: NOW,
      })
    ).toEqual({ ok: false, kind: 'error', message: 'boom' });

    expect(
      assembleClaimWidgetData({
        model: { state: 'not_found' },
        summary: null,
        primaryReason: null,
        profileUrl: null,
        nowIso: NOW,
      })
    ).toEqual({ ok: false, kind: 'not_found' });
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
      nowIso: NOW,
    });
  }

  it('renders network claim rate as a whole percentage and dominant reason', () => {
    const payload = claimWidgetToJson(okResult());
    expect(payload.claim_rate).toBe('100% this store · 75% network');
    expect(payload.primary_reason).toBe('Item not received · 100%');
    expect(payload.recent_activity).toBe('2 claims in last 90 days');
    for (const value of Object.values(payload)) {
      expect(typeof value).toBe('string');
      expect(value).not.toContain('undefined');
      expect(value).not.toContain('null');
    }
  });

  it('renders "No network history found" when network is null', () => {
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
      nowIso: NOW,
    });
    const payload = claimWidgetToJson(result);
    expect(payload.orders).toContain('No network history found');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });

  it('shows — for not_found, never null/undefined', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' });
    expect(payload.orders).toBe('Not seen at any store yet');
    expect(payload.claim_rate).toBe('—');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });
});

describe('buildGorgiasSidebarWidgetTemplate', () => {
  it('uses the exact header "Unauth Identity Intelligence" and no "fraud" wording', () => {
    const template = buildGorgiasSidebarWidgetTemplate('https://app.unauth.test');
    const json = JSON.stringify(template);
    expect(template.widgets[0].title).toBe('Unauth Identity Intelligence');
    expect(json.toLowerCase()).not.toContain('fraud');
  });
});
