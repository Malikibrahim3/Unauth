import { assessCE3Eligibility } from '@/lib/evidence/ce3';
import type { Ce3SignalHashes } from '@/lib/identity/ce3SignalHashes';
import { TABLES } from '@/lib/supabase/tables';

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

    const rowsByTable: Record<string, Record<string, unknown>[]> = {
      [TABLES.MERCHANTS]: [{ id: 'merchant-a', user_id: 'user-a', business_name: 'Merchant A' }],
      [TABLES.SOURCE_CUSTOMERS]: [
        {
          id: 'profile-1',
          merchant_id: 'merchant-a',
          email: 'cust@example.com',
          phone: null,
          first_name: 'Customer',
          last_name: null,
          account_created_at: '2023-01-01T00:00:00.000Z',
          created_at: '2023-01-01T00:00:00.000Z',
        },
      ],
      [TABLES.SOURCE_ADDRESSES]: [
        {
          id: 'address-1',
          merchant_id: 'merchant-a',
          line1: '1 Main St',
          line2: null,
          city: 'London',
          region: null,
          postal_code: 'SW1A 1AA',
          country: 'GB',
          normalized_full: '1 main st london sw1a 1aa gb',
        },
      ],
      [TABLES.SOURCE_ORDERS]: [
        {
          id: 'tx-1',
          merchant_id: 'merchant-a',
          source_customer_id: 'profile-1',
          external_id: 'ORD-1',
          order_number: 'ORD-1',
          email: 'cust@example.com',
          phone: null,
          financial_status: 'paid',
          fulfillment_state: 'fulfilled',
          total_price: 40,
          currency: 'USD',
          card_last4: '4242',
          browser_ip: '203.0.113.1',
          shipping_address_id: 'address-1',
          // ~137 days before the dispute → inside the 120–365 day window
          placed_at: '2025-01-15T00:00:00.000Z',
          ingested_at: '2025-01-15T00:00:00.000Z',
        },
        {
          id: 'tx-2',
          merchant_id: 'merchant-a',
          source_customer_id: 'profile-1',
          external_id: 'ORD-2',
          order_number: 'ORD-2',
          email: 'cust@example.com',
          phone: null,
          financial_status: 'paid',
          fulfillment_state: 'fulfilled',
          total_price: 55,
          currency: 'USD',
          card_last4: '4242',
          browser_ip: '203.0.113.1',
          shipping_address_id: 'address-1',
          // ~168 days before the dispute → inside the 120–365 day window
          placed_at: '2024-12-15T00:00:00.000Z',
          ingested_at: '2024-12-15T00:00:00.000Z',
        },
        {
          id: 'tx-disputed',
          merchant_id: 'merchant-a',
          source_customer_id: 'profile-1',
          external_id: 'ORD-D',
          order_number: 'ORD-D',
          email: 'cust@example.com',
          phone: null,
          financial_status: 'paid',
          fulfillment_state: 'fulfilled',
          total_price: 99,
          currency: 'USD',
          card_last4: '4242',
          browser_ip: '203.0.113.1',
          shipping_address_id: 'address-1',
          placed_at: '2025-06-01T12:00:00.000Z',
          ingested_at: '2025-06-01T12:00:00.000Z',
        },
      ],
      [TABLES.MERCHANT_CLAIMS]: [],
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
        void this.orFilter;
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
