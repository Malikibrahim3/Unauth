import type { SupabaseClient } from '@supabase/supabase-js';
import { loadShopifyPaymentsReadModel } from '@/lib/financial/paymentAuthority';
import { TABLES } from '@/lib/supabase/tables';

function clientWith(rows: Record<string, Array<Record<string, unknown>>>) {
  return {
    from(table: string) {
      const result = { data: rows[table] ?? [], count: (rows[table] ?? []).length, error: null };
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => Promise.resolve(result) };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe('MR4 payment authority read model', () => {
  it('projects source-backed payment, refund, and dispute facts', async () => {
    const model = await loadShopifyPaymentsReadModel(clientWith({
      [TABLES.SOURCE_PAYMENTS]: [{ id: 'p1', external_id: 'pay-1', source_record_id: 'sr1', status: 'captured', source_status: 'paid', amount_minor: 1200, currency: 'GBP', captured_at: '2026-08-20T10:00:00Z', updated_at: '2026-08-20T10:05:00Z' }],
      [TABLES.SOURCE_REFUNDS]: [{ id: 'r1', external_id: 'refund-1', amount: '2.50', currency: 'GBP', refunded_at: '2026-08-21T10:00:00Z', ingested_at: '2026-08-21T10:05:00Z' }],
      [TABLES.SOURCE_DISPUTES]: [{ id: 'd1', external_id: 'dispute-1', amount: '4.00', currency: 'GBP', status: 'lost', initiated_at: '2026-08-19T10:00:00Z', finalized_at: null, ingested_at: '2026-08-22T10:05:00Z' }],
    }));
    expect(model.facts.map((row) => row.family)).toEqual(expect.arrayContaining(['payment', 'refund', 'dispute_debit']));
    expect(model.currencies).toEqual(['GBP']);
  });

  it('does not turn absent fees, credits, or settlements into zero facts', async () => {
    const model = await loadShopifyPaymentsReadModel(clientWith({}));
    expect(model.facts).toEqual([]);
    expect(model.coverage.every((row) => row.state === 'unavailable' && row.recordCount === null)).toBe(true);
    expect(model.complete).toBe(false);
  });

  it('marks a capped family partial instead of complete', async () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({ id: `p${index}`, external_id: `pay-${index}`, source_record_id: `sr-${index}`, status: 'captured', source_status: 'paid', amount_minor: 100, currency: 'GBP', captured_at: '2026-08-20T10:00:00Z', updated_at: '2026-08-20T10:05:00Z' }));
    const client = {
      from(table: string) {
        const data = table === TABLES.SOURCE_PAYMENTS ? rows : [];
        const result = { data, count: table === TABLES.SOURCE_PAYMENTS ? 5001 : 0, error: null };
        const query = { select: () => query, eq: () => query, order: () => query, limit: () => Promise.resolve(result) };
        return query;
      },
    } as unknown as SupabaseClient;
    const model = await loadShopifyPaymentsReadModel(client);
    expect(model.coverage.find((row) => row.family === 'payment')?.state).toBe('partial');
    expect(model.complete).toBe(false);
  });
});
