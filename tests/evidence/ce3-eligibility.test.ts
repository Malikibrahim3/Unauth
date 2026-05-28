import { assessCE3Eligibility } from '@/lib/evidence/ce3';
import type { Ce3SignalHashes } from '@/lib/identity/ce3SignalHashes';

const DISPUTED_DATE = new Date('2025-06-01T12:00:00.000Z');
const DISPUTED_ID = 'disputed-tx';

// Disputed order carries all four CE3.0 core elements (plus a non-core email).
const D: Ce3SignalHashes = {
  deviceMatch: 'h_dev',
  ipCluster: 'h_ip',
  addressCluster: 'h_addr',
  accountLink: 'h_acc',
  emailVariant: 'h_em',
};

function prior(
  id: string,
  daysBeforeDispute: number,
  signalHashes: Ce3SignalHashes,
  refund_status: string | null = 'none'
) {
  const d = new Date(DISPUTED_DATE);
  d.setDate(d.getDate() - daysBeforeDispute);
  return {
    order_id: id,
    order_date: d.toISOString(),
    refund_status,
    signalHashes,
  };
}

describe('assessCE3Eligibility — Visa CE3.0 core-element rules', () => {
  it('T1 — two priors with ≥2 core matches incl. IP/Device within window are eligible', () => {
    const A = prior('prior-a', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });
    const C = prior('prior-c', 170, { ipCluster: 'h_ip', addressCluster: 'h_addr' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [A, C]);
    expect(result.eligible).toBe(true);
    expect(result.mandatorySatisfied).toBe(true);
  });

  it('T2 — email is NOT a CE3.0 core element and cannot count toward the two matches', () => {
    // Each prior shares only device + email; email is non-core, so effectively 1 core match.
    const A = prior('prior-a', 150, { deviceMatch: 'h_dev', emailVariant: 'h_em' });
    const B = prior('prior-b', 160, { deviceMatch: 'h_dev', emailVariant: 'h_em' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [A, B]);
    expect(result.eligible).toBe(false);
    const a = result.priorTransactions.find(p => p.orderId === 'prior-a');
    expect(a!.matchingSignals).toEqual(['deviceMatch']);
  });

  it('T3 — mandatory element: shipping + user ID alone (no IP/Device) is not eligible', () => {
    const A = prior('prior-a', 150, { addressCluster: 'h_addr', accountLink: 'h_acc' });
    const B = prior('prior-b', 160, { addressCluster: 'h_addr', accountLink: 'h_acc' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [A, B]);
    expect(result.eligible).toBe(false);
    expect(result.mandatorySatisfied).toBe(false);
  });

  it('T4 — 120–365 day window: priors older than 365 days are excluded', () => {
    const old1 = prior('old-1', 400, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });
    const old2 = prior('old-2', 500, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [old1, old2]);
    expect(result.eligible).toBe(false);
    expect(result.priorTransactions.every(p => p.withinWindow)).toBe(false);
  });

  it('T5 — 120-day floor: priors more recent than 120 days are excluded', () => {
    const recent = prior('recent', 100, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });
    const ok = prior('ok', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [recent, ok]);
    expect(result.eligible).toBe(false);
  });

  it('T6 — undisputed gate excludes refunded priors', () => {
    const refunded = prior('refunded', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' }, 'full');
    const good = prior('good', 160, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [refunded, good]);
    expect(result.eligible).toBe(false);
  });

  it('T7 — empty never matches empty', () => {
    const emptyPrior = prior('empty', 150, {});
    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, {}, [emptyPrior]);
    expect(result.eligible).toBe(false);
  });

  it('T8 — disputed order excluded from its own prior set', () => {
    const self = {
      order_id: DISPUTED_ID,
      order_date: DISPUTED_DATE.toISOString(),
      refund_status: 'none',
      signalHashes: { ...D },
    };
    const other = prior('other', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [self, other]);
    expect(result.eligible).toBe(false);
    expect(result.priorTransactions.some(p => p.orderId === DISPUTED_ID)).toBe(false);
  });

  it('T9 — same-PAN mismatch disqualifies an otherwise-qualifying prior', () => {
    const A = { ...prior('prior-a', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' }), paymentCredential: '4242' };
    const B = { ...prior('prior-b', 160, { deviceMatch: 'h_dev', ipCluster: 'h_ip' }), paymentCredential: '9999' };

    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [A, B], {
      disputedPaymentCredential: '4242',
    });
    expect(result.eligible).toBe(false);
    expect(result.paymentCredential).toBe('mismatch');
  });

  it('T10 — match matrix exposes the four core elements', () => {
    const A = prior('prior-a', 150, { deviceMatch: 'h_dev', ipCluster: 'h_ip' });
    const C = prior('prior-c', 170, { ipCluster: 'h_ip', addressCluster: 'h_addr' });
    const result = assessCE3Eligibility(DISPUTED_ID, DISPUTED_DATE, D, [A, C]);
    expect(result.matchMatrix.map(m => m.element)).toEqual([
      'accountLink',
      'ipCluster',
      'addressCluster',
      'deviceMatch',
    ]);
    expect(result.matchMatrix.filter(m => m.isMandatory).map(m => m.element)).toEqual([
      'ipCluster',
      'deviceMatch',
    ]);
  });
});

describe('buildEvidencePackage CE3 path', () => {
  it('does not throw for a valid disputed order with ce3_signal_hashes', async () => {
    const { buildEvidencePackage } = await import('@/lib/evidence/buildPackage');

    const shared = {
      deviceMatch: 'h_dev',
      ipCluster: 'h_ip',
      addressCluster: 'h_addr',
      accountLink: 'h_acc',
      emailVariant: 'h_em',
    };

    const rowsByTable: Record<string, Record<string, unknown>[]> = {
      merchants: [{ id: 'merchant-a', user_id: 'user-a', business_name: 'Merchant A' }],
      processing_jobs: [{ id: 'job-a', merchant_id: 'merchant-a', hidden_by_merchant: false }],
      customer_profiles: [
        {
          id: 'profile-1',
          merchant_ids: ['merchant-a'],
          emails: ['cust@example.com'],
          names: ['Customer'],
          phones: [],
          addresses: ['1 Main St'],
          ips: ['203.0.113.1'],
          card_last4s: ['4242'],
          primary_email: 'cust@example.com',
          total_orders: 3,
          total_refund_claims: 1,
          refund_rate: 0.33,
          first_seen: '2023-01-01T00:00:00.000Z',
          last_seen: '2025-06-01T00:00:00.000Z',
          fraud_flags: [],
          risk_level: 'high',
          total_merchants_seen_at: 1,
        },
      ],
      customer_profile_audit_appearances: [
        { profile_id: 'profile-1', audit_id: 'job-a', transaction_id: 'tx-1' },
        { profile_id: 'profile-1', audit_id: 'job-a', transaction_id: 'tx-2' },
        { profile_id: 'profile-1', audit_id: 'job-a', transaction_id: 'tx-disputed' },
      ],
      audit_transactions: [
        {
          id: 'tx-1',
          job_id: 'job-a',
          order_id: 'ORD-1',
          customer_email: 'cust@example.com',
          customer_name: 'Customer',
          shipping_address: '1 Main St',
          device_ip: '203.0.113.1',
          card_last4: '4242',
          order_value: 40,
          match_score: 50,
          risk_level: 'low',
          ce3_signal_hashes: { deviceMatch: 'h_dev', ipCluster: 'h_ip' },
          refund_claimed: false,
          // ~137 days before the dispute → inside the 120–365 day window
          order_date: '2025-01-15T00:00:00.000Z',
          processed_at: '2025-06-02T00:00:00.000Z',
        },
        {
          id: 'tx-2',
          job_id: 'job-a',
          order_id: 'ORD-2',
          customer_email: 'cust@example.com',
          customer_name: 'Customer',
          shipping_address: '1 Main St',
          device_ip: '203.0.113.1',
          card_last4: '4242',
          order_value: 55,
          match_score: 50,
          risk_level: 'low',
          ce3_signal_hashes: { deviceMatch: 'h_dev', ipCluster: 'h_ip', addressCluster: 'h_addr' },
          refund_claimed: false,
          // ~168 days before the dispute → inside the 120–365 day window
          order_date: '2024-12-15T00:00:00.000Z',
          processed_at: '2025-06-02T00:00:00.000Z',
        },
        {
          id: 'tx-disputed',
          job_id: 'job-a',
          order_id: 'ORD-D',
          customer_email: 'cust@example.com',
          customer_name: 'Customer',
          shipping_address: '1 Main St',
          device_ip: '203.0.113.1',
          card_last4: '4242',
          order_value: 99,
          match_score: 80,
          risk_level: 'high',
          ce3_signal_hashes: shared,
          refund_claimed: true,
          order_date: '2025-06-01T12:00:00.000Z',
          processed_at: '2025-06-02T00:00:00.000Z',
        },
      ],
      customer_notes: [],
    };

    class QueryBuilder {
      private eqFilters: Array<[string, unknown]> = [];
      private inFilters: Array<[string, unknown[]]> = [];
      private orFilter: string | null = null;
      constructor(private readonly table: string) {}
      select() { return this; }
      eq(column: string, value: unknown) { this.eqFilters.push([column, value]); return this; }
      in(column: string, values: unknown[]) { this.inFilters.push([column, values]); return this; }
      or(filter: string) { this.orFilter = filter; return this; }
      order() { return this; }
      limit() { return this; }
      range() { return this; }
      single() {
        const rows = this.applyFilters();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      }
      maybeSingle() { return this.single(); }
      then(onfulfilled?: (v: { data: Record<string, unknown>[]; error: null }) => unknown) {
        return Promise.resolve({ data: this.applyFilters(), error: null }).then(onfulfilled);
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
          const allowed = [...this.orFilter.matchAll(/merchant_ids\.cs\.\["([^"]+)"\]/g)].map((m) => m[1]);
          rows = rows.filter((row) =>
            allowed.some((id) => Array.isArray(row.merchant_ids) && (row.merchant_ids as string[]).includes(id))
          );
        }
        return rows;
      }
    }

    const supabase = {
      from: (table: string) => new QueryBuilder(table),
      rpc: jest.fn().mockResolvedValue({ data: 'UNAUTH-TEST-000001', error: null }),
    };

    const pkg = await buildEvidencePackage(
      'merchant-a',
      'profile-1',
      'tx-disputed',
      supabase as never,
      'user-a',
    );

    expect(pkg.disputedOrder.orderId).toBe('ORD-D');
    expect(pkg.ce3.eligible).toBe(true);
    expect(pkg.disputedOrder.currency).toBe('USD');
  });
});
