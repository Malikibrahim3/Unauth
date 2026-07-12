import { validateEventEnvelope } from '@/lib/api/v1/ingest/eventSchema';

jest.mock('@/lib/connectors/ingestionInbox', () => ({
  enqueueIngestionEvent: jest.fn(),
}));
import { enqueueIngestionEvent } from '@/lib/connectors/ingestionInbox';
import { acceptEvent, buildEventIdempotencyKey } from '@/lib/api/v1/ingest/acceptEvent';

const validEnvelope = {
  id: 'evt-1',
  type: 'order.created',
  occurred_at: '2026-07-11T10:00:00Z',
  source: { system: 'custom_oms', account_id: 'uk-store', record_id: 'ORDER-1001' },
  data: { external_id: 'ORDER-1001', currency: 'GBP' },
  schema_version: 1,
};

describe('validateEventEnvelope', () => {
  it('accepts a well-formed envelope', () => {
    const r = validateEventEnvelope(validEnvelope);
    expect(r.ok).toBe(true);
  });

  it('rejects an unsupported event type', () => {
    const r = validateEventEnvelope({ ...validEnvelope, type: 'order.exploded' });
    expect(r.ok).toBe(false);
  });

  it('rejects data missing external_id', () => {
    const r = validateEventEnvelope({ ...validEnvelope, data: { currency: 'GBP' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field.includes('external_id'))).toBe(true);
  });

  it('rejects an order.created without currency', () => {
    const r = validateEventEnvelope({ ...validEnvelope, data: { external_id: 'O1' } });
    expect(r.ok).toBe(false);
  });

  it('accepts an offset timestamp', () => {
    const r = validateEventEnvelope({ ...validEnvelope, occurred_at: '2026-07-11T10:00:00+01:00' });
    expect(r.ok).toBe(true);
  });
});

describe('buildEventIdempotencyKey', () => {
  it('keys on source system/account + event id', () => {
    expect(buildEventIdempotencyKey(validEnvelope as any)).toBe('custom_oms:uk-store:evt-1');
  });
});

describe('acceptEvent', () => {
  beforeEach(() => (enqueueIngestionEvent as jest.Mock).mockReset());

  it('returns 202 for a freshly enqueued event', async () => {
    (enqueueIngestionEvent as jest.Mock).mockResolvedValue({ status: 'enqueued', ingestionEventId: 'ie-1', duplicate: false });
    const res = await acceptEvent({} as any, 'm-1', validEnvelope as any);
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ ingestion_event_id: 'ie-1', duplicate: false });
  });

  it('returns 202 duplicate for a replay', async () => {
    (enqueueIngestionEvent as jest.Mock).mockResolvedValue({ status: 'duplicate', ingestionEventId: 'ie-1', duplicate: true });
    const res = await acceptEvent({} as any, 'm-1', validEnvelope as any);
    expect(res.status).toBe(202);
    expect((res.body as any).duplicate).toBe(true);
  });

  it('returns 409 and records a health issue on a payload conflict', async () => {
    (enqueueIngestionEvent as jest.Mock).mockResolvedValue({ status: 'conflict', ingestionEventId: 'ie-1', duplicate: true, reason: 'idempotency_payload_conflict' });
    const inserted: any[] = [];
    const client = { from: () => ({ insert: (row: any) => { inserted.push(row); return { then: (r: any) => r({ error: null }) }; } }) } as any;
    const res = await acceptEvent(client, 'm-1', validEnvelope as any);
    expect(res.status).toBe(409);
    expect((res.body as any).error).toBe('idempotency_payload_conflict');
    expect(inserted[0]).toMatchObject({ code: 'idempotency_payload_conflict', merchant_id: 'm-1' });
  });
});
