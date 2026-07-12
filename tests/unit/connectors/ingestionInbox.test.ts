import { enqueueIngestionEvent, hashPayload } from '@/lib/connectors/ingestionInbox';

/**
 * Builds a supabase-like mock. `insertResult` drives the initial insert;
 * `existingRow` drives the post-conflict read.
 */
function makeClient(insertResult: { data: unknown; error: unknown }, existingRow?: unknown) {
  const insertBuilder: any = {
    insert: () => insertBuilder,
    select: () => insertBuilder,
    maybeSingle: async () => insertResult,
  };
  const readBuilder: any = {
    select: () => readBuilder,
    eq: () => readBuilder,
    maybeSingle: async () => ({ data: existingRow ?? null, error: null }),
  };
  let call = 0;
  const client = {
    from: () => {
      call += 1;
      return call === 1 ? (insertBuilder as any) : readBuilder;
    },
  } as any;
  return client;
}

const baseInput = {
  merchantId: 'm-1',
  sourceSystem: 'custom_oms',
  idempotencyKey: 'custom_oms/uk/ORDER-1',
  payload: { total_minor: 8400 },
};

describe('enqueueIngestionEvent', () => {
  it('enqueues a fresh event (atomic insert wins)', async () => {
    const client = makeClient({ data: { id: 'ie-1' }, error: null });
    const res = await enqueueIngestionEvent(client, baseInput);
    expect(res).toEqual({ status: 'enqueued', ingestionEventId: 'ie-1', duplicate: false });
  });

  it('detects a duplicate with an identical payload hash', async () => {
    const hash = hashPayload(baseInput.payload);
    const client = makeClient(
      { data: null, error: { code: '23505', message: 'dup' } },
      { id: 'ie-1', payload_hash: hash },
    );
    const res = await enqueueIngestionEvent(client, baseInput);
    expect(res).toEqual({ status: 'duplicate', ingestionEventId: 'ie-1', duplicate: true });
  });

  it('flags an idempotency_payload_conflict when the key is reused with a different payload', async () => {
    const client = makeClient(
      { data: null, error: { code: '23505', message: 'dup' } },
      { id: 'ie-1', payload_hash: 'a-different-hash' },
    );
    const res = await enqueueIngestionEvent(client, baseInput);
    expect(res.status).toBe('conflict');
    expect(res).toMatchObject({ duplicate: true, reason: 'idempotency_payload_conflict' });
  });

  it('throws on a non-idempotency error', async () => {
    const client = makeClient({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(enqueueIngestionEvent(client, baseInput)).rejects.toThrow(/ingestion_enqueue_failed/);
  });
});
