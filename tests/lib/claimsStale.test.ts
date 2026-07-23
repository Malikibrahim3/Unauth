import { flagAgedPendingClaims } from '@/lib/claims/stale';

function makeClient(rows: any[]) {
  const events: any[] = [];
  const state = { rows, events };
  return {
    state,
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn !== 'flag_aged_payout_case') return { data: null, error: null };
      events.push({ fn, ...args });
      return { data: { flagged: true, replayed: false }, error: null };
    },
    from(table: string) {
      if (table === 'claim_events') {
        return {
          insert(payload: any) {
            events.push(payload);
            return { select: () => ({ single: async () => ({ data: payload, error: null }) }) };
          },
        };
      }
      if (table !== 'support_payout_cases') throw new Error(`unexpected table ${table}`);
      const filters: Array<(row: any) => boolean> = [];
      let updatePayload: any = null;
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => {
          filters.push((row) => row[col] === val);
          return chain;
        },
        lt: (col: string, val: any) => {
          filters.push((row) => String(row[col]) < String(val));
          return chain;
        },
        limit: () => chain,
        update: (payload: any) => {
          updatePayload = payload;
          return chain;
        },
        maybeSingle: async () => {
          const row = rows.find((candidate) => filters.every((filter) => filter(candidate)));
          if (row && updatePayload) Object.assign(row, updatePayload);
          return { data: row ?? null, error: null };
        },
        then: (resolve: any) => {
          const data = rows.filter((row) => filters.every((filter) => filter(row)));
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return chain;
    },
  };
}

describe('aged pending-case attention', () => {
  it('flags old pending work without changing its business lifecycle', async () => {
    const client = makeClient([
      {
        id: 'claim-old',
        merchant_id: 'merchant-1',
        shop_domain: 'shop.myshopify.com',
        status: 'pending',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'claim-new',
        merchant_id: 'merchant-1',
        shop_domain: 'shop.myshopify.com',
        status: 'pending',
        updated_at: '2026-05-25T00:00:00.000Z',
      },
    ]);

    const result = await flagAgedPendingClaims(client, { now: new Date('2026-06-01T12:00:00.000Z') });

    expect(result).toEqual({ scanned: 1, flagged: 1 });
    expect(client.state.rows[0].status).toBe('pending');
    expect(client.state.events).toEqual([
      expect.objectContaining({
        fn: 'flag_aged_payout_case',
        p_case_id: 'claim-old',
        p_merchant_id: 'merchant-1',
        p_idempotency_key: expect.stringContaining('aged-pending:claim-old:'),
      }),
    ]);
  });
});
