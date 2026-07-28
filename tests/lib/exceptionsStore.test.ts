import {
  countOpenExceptionDueBands,
  raiseException,
  settleException,
} from '@/lib/exceptions/store';

const MERCHANT = 'm-1';

/**
 * Query-builder mock. `existing` is what a scoped maybeSingle (dedup/id lookup)
 * resolves to; inserts/updates are captured. Inserted rows get a synthetic id.
 */
function makeClient(existing: Record<string, unknown> | null, opts: { insertError?: { code?: string; message: string } } = {}) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    inserts,
    updates,
    from() {
      let pendingInsert: Record<string, unknown> | null = null;
      let pendingUpdate: Record<string, unknown> | null = null;
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ['select', 'eq', 'order', 'limit']) b[m] = chain;
      b.insert = (row: Record<string, unknown>) => { pendingInsert = row; return b; };
      b.update = (row: Record<string, unknown>) => { pendingUpdate = row; return b; };
      b.maybeSingle = async () => ({ data: existing, error: null });
      b.single = async () => {
        if (opts.insertError && pendingInsert) return { data: null, error: opts.insertError };
        if (pendingInsert) { inserts.push(pendingInsert); return { data: { id: 'exc-new', status: 'open', ...pendingInsert }, error: null }; }
        if (pendingUpdate) { updates.push(pendingUpdate); return { data: { id: 'exc-1', status: pendingUpdate.status, resolution: pendingUpdate.resolution }, error: null }; }
        return { data: null, error: null };
      };
      return b;
    },
  };
  return client as never as import('@supabase/supabase-js').SupabaseClient & { inserts: typeof inserts; updates: typeof updates };
}

function makeDeadlineClient(rows: Array<{ due_at: string | null }>) {
  return {
    from() {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const method of ['select', 'eq', 'order']) builder[method] = chain;
      builder.range = async (from: number, to: number) => ({
        data: rows.slice(from, to + 1),
        count: rows.length,
        error: null,
      });
      return builder;
    },
  } as never as import('@supabase/supabase-js').SupabaseClient;
}

const base = { exceptionType: 'unmatched_refund' as const, title: 'Unmatched refund', dedupKey: 'refund:r1' };

describe('exception queue store', () => {
  it('raises a new exception', async () => {
    const client = makeClient(null);
    const result = await raiseException(client, MERCHANT, base);
    expect(result.created).toBe(true);
    expect(client.inserts[0]).toMatchObject({ merchant_id: MERCHANT, exception_type: 'unmatched_refund', dedup_key: 'refund:r1', confidence: 'probable' });
  });

  it('is idempotent — a repeat with an open dedup_key does not insert again', async () => {
    const client = makeClient({ id: 'exc-1', status: 'open' });
    const result = await raiseException(client, MERCHANT, base);
    expect(result).toEqual({ created: false, id: 'exc-1', status: 'open' });
    expect(client.inserts).toHaveLength(0);
  });

  it('does not reopen a settled exception on re-raise', async () => {
    const client = makeClient({ id: 'exc-1', status: 'resolved' });
    const result = await raiseException(client, MERCHANT, base);
    expect(result).toEqual({ created: false, id: 'exc-1', status: 'resolved' });
    expect(client.inserts).toHaveLength(0);
  });

  it('treats a unique-index race as a no-op', async () => {
    const client = makeClient(null, { insertError: { code: '23505', message: 'dup' } });
    const result = await raiseException(client, MERCHANT, base);
    expect(result.created).toBe(false);
  });

  it('settles an open exception', async () => {
    const client = makeClient({ id: 'exc-1', status: 'open' });
    const result = await settleException(client, MERCHANT, 'exc-1', { status: 'resolved', resolution: 'linked manually', resolvedBy: 'u-1' });
    expect(result.ok).toBe(true);
    expect(client.updates[0]).toMatchObject({ status: 'resolved', resolution: 'linked manually', resolved_by: 'u-1' });
  });

  it('refuses to settle an already-settled exception', async () => {
    const client = makeClient({ id: 'exc-1', status: 'dismissed' });
    const result = await settleException(client, MERCHANT, 'exc-1', { status: 'resolved', resolvedBy: 'u-1' });
    expect(result).toEqual({ ok: false, reason: 'already_settled' });
  });

  it('returns not_found for a missing/cross-merchant exception', async () => {
    const client = makeClient(null);
    expect(await settleException(client, MERCHANT, 'nope', { status: 'resolved', resolvedBy: 'u-1' })).toEqual({ ok: false, reason: 'not_found' });
  });

  it('places every open exception in one mutually exclusive deadline band', async () => {
    const client = makeDeadlineClient([
      { due_at: '2026-07-28T11:59:59.000Z' },
      { due_at: '2026-07-28T18:00:00.000Z' },
      { due_at: '2026-07-30T12:00:00.000Z' },
      { due_at: '2026-08-02T12:00:00.000Z' },
      { due_at: '2026-08-06T12:00:00.000Z' },
      { due_at: null },
      { due_at: 'not-a-date' },
    ]);

    const bands = await countOpenExceptionDueBands(
      client,
      MERCHANT,
      new Date('2026-07-28T12:00:00.000Z'),
    );

    expect(bands).toEqual({
      overdue: 1,
      'due-today': 1,
      'due-1-3': 1,
      'due-4-7': 1,
      'due-later': 1,
      'no-sla': 2,
    });
    expect(Object.values(bands).reduce((sum, count) => sum + count, 0)).toBe(7);
  });
});
