/**
 * Regression tests for Phase 1.1 evidence generation tenant isolation.
 *
 * These use an in-memory Supabase-shaped client so the test proves query
 * behaviour without needing a live database. The fixture intentionally models
 * a customer profile visible to two tenants; the security boundary must still
 * be the caller's merchant-owned processing job IDs.
 */

import { buildEvidencePackage } from '@/lib/evidence/buildPackage';
import {
  fetchMerchantScopedCustomerProfile,
  fetchMerchantScopedCustomerTransactions,
} from '@/lib/supabase/merchantHelpers';

type Row = Record<string, any>;

const rowsByTable: Record<string, Row[]> = {
  merchants: [
    { id: 'merchant-a', user_id: 'legacy-user-a', business_name: 'Merchant A' },
    { id: 'merchant-b', user_id: 'legacy-user-b', business_name: 'Merchant B' },
  ],
  processing_jobs: [
    { id: 'job-a', merchant_id: 'merchant-a' },
    { id: 'job-b', merchant_id: 'merchant-b' },
  ],
  customer_profiles: [
    {
      id: 'profile-shared',
      merchant_ids: ['legacy-user-a', 'merchant-b'],
      emails: ['shared@example.com'],
      names: ['Shared Customer'],
      phones: [],
      addresses: ['1 Shared Street'],
      ips: ['203.0.113.10'],
      card_last4s: ['4242'],
      primary_email: 'shared@example.com',
      total_orders: 2,
      total_refund_claims: 1,
      refund_rate: 0.5,
      fastest_claim_days: null,
      avg_claim_days: null,
      refund_acceleration_score: 0,
      first_seen: '2026-01-01T00:00:00.000Z',
      last_seen: '2026-01-02T00:00:00.000Z',
      identity_signals: [],
      fraud_flags: [],
      risk_level: 'medium',
      total_merchants_seen_at: 2,
    },
  ],
  customer_profile_audit_appearances: [
    { profile_id: 'profile-shared', audit_id: 'job-a', transaction_id: 'tx-a' },
    { profile_id: 'profile-shared', audit_id: 'job-b', transaction_id: 'tx-b' },
  ],
  audit_transactions: [
    {
      id: 'tx-a',
      job_id: 'job-a',
      order_id: 'ORDER-A',
      customer_email: 'shared@example.com',
      customer_name: 'Shared Customer',
      shipping_address: '1 Shared Street',
      device_ip: '203.0.113.10',
      card_last4: '4242',
      order_value: 50,
      match_score: 70,
      risk_level: 'medium',
      identity_signals: ['email'],
      refund_claimed: false,
      refund_reason: null,
      processed_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'tx-b',
      job_id: 'job-b',
      order_id: 'ORDER-B',
      customer_email: 'shared@example.com',
      customer_name: 'Shared Customer',
      shipping_address: '1 Shared Street',
      device_ip: '203.0.113.10',
      card_last4: '4242',
      order_value: 75,
      match_score: 80,
      risk_level: 'high',
      identity_signals: ['email'],
      refund_claimed: true,
      refund_reason: 'not_received',
      processed_at: '2026-01-02T00:00:00.000Z',
    },
  ],
  customer_notes: [],
};

class QueryBuilder {
  private eqFilters: Array<[string, any]> = [];
  private inFilters: Array<[string, any[]]> = [];
  private orFilter: string | null = null;

  constructor(private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: any) {
    this.eqFilters.push([column, value]);
    return this;
  }

  in(column: string, values: any[]) {
    this.inFilters.push([column, values]);
    return this;
  }

  or(filter: string) {
    this.orFilter = filter;
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  range() {
    return this;
  }

  single() {
    const rows = this.applyFilters();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  maybeSingle() {
    return this.single();
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.applyFilters(), error: null }).then(onfulfilled, onrejected);
  }

  private applyFilters() {
    let rows = [...(rowsByTable[this.table] ?? [])];

    for (const [column, value] of this.eqFilters) {
      rows = rows.filter((row) => row[column] === value);
    }

    for (const [column, values] of this.inFilters) {
      rows = rows.filter((row) => values.includes(row[column]));
    }

    if (this.table === 'customer_profiles' && this.orFilter) {
      const allowedMerchantIds = [...this.orFilter.matchAll(/merchant_ids\.cs\.\["([^"]+)"\]/g)]
        .map((match) => match[1]);
      rows = rows.filter((row) =>
        allowedMerchantIds.some((id) => Array.isArray(row.merchant_ids) && row.merchant_ids.includes(id))
      );
    }

    return rows;
  }
}

function makeSupabase() {
  return {
    from: jest.fn((table: string) => new QueryBuilder(table)),
    rpc: jest.fn().mockResolvedValue({ data: 'UNAUTH-20260101-000001', error: null }),
  };
}

describe('evidence tenant isolation', () => {
  it('lists only the caller merchant orders for a shared customer profile', async () => {
    const supabase = makeSupabase();

    const profile = await fetchMerchantScopedCustomerProfile(
      supabase as any,
      'merchant-a',
      'profile-shared',
      'legacy-user-a'
    );
    expect(profile).not.toBeNull();

    const orders = await fetchMerchantScopedCustomerTransactions(
      supabase as any,
      'merchant-a',
      'profile-shared',
      profile!
    );

    expect(orders.map((order) => order.id)).toEqual(['tx-a']);
    expect(orders.map((order) => order.id)).not.toContain('tx-b');
  });

  it('rejects evidence generation when Tenant A submits Tenant B order id', async () => {
    const supabase = makeSupabase();

    await expect(
      buildEvidencePackage(
        'merchant-a',
        'profile-shared',
        'tx-b',
        supabase as any,
        'legacy-user-a'
      )
    ).rejects.toThrow('Disputed order not found or not owned by merchant');
  });
});
