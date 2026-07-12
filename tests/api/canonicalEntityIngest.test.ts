import { orderRowFromCanonical, customerRow } from '@/lib/api/v1/ingest/entitySchemas';

jest.mock('@/lib/sources/sourceRegistry', () => ({ upsertSourceRecord: jest.fn(async () => ({ id: 'sr-1' })) }));
jest.mock('@/lib/events/domainEventStore', () => ({ recordDomainEvent: jest.fn(async () => ({ id: 'ev-1' })) }));
import { upsertSourceRecord } from '@/lib/sources/sourceRegistry';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { upsertCanonicalEntity, API_SOURCE } from '@/lib/api/v1/ingest/upsertEntity';

describe('entity row mappers', () => {
  it('maps a canonical order to a source_orders row (same normalization as connectors)', () => {
    const { row } = orderRowFromCanonical({ external_id: 'O1', currency: 'gbp', total_minor: 8400, financial_status: 'paid', fulfillment_status: 'unfulfilled', lines: [] });
    expect(row).toMatchObject({ financial_status: 'paid', fulfillment_state: 'unfulfilled', currency: 'GBP', total_price: 84 });
  });

  it('rejects an invalid order (no partial row)', () => {
    const { row, errors } = orderRowFromCanonical({ external_id: 'O1', currency: 'GB', lines: [] });
    expect(row).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('maps a customer row without dropping contact fields', () => {
    expect((customerRow({ external_id: 'C1', email: 'a@b.com', name: 'A' }).raw_metadata as any).email).toBe('a@b.com');
  });
});

function makeClient(existing: unknown) {
  const upserts: any[] = [];
  const client: any = {
    from: (_t: string) => ({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }) }) }),
      upsert: (row: any, opts: any) => { upserts.push({ row, opts }); return { select: () => ({ single: async () => ({ data: { id: 'ent-1' }, error: null }) }) }; },
    }),
  };
  return { client, upserts };
}

const config = { table: 'source_orders', sourceEntityType: 'order', canonicalEntityType: 'order', eventType: 'order.created' as const, conflictTarget: 'merchant_id,source,external_id' };

describe('upsertCanonicalEntity', () => {
  beforeEach(() => { (upsertSourceRecord as jest.Mock).mockClear(); (recordDomainEvent as jest.Mock).mockClear(); });

  it('creates a new entity, registers provenance, emits a domain event', async () => {
    const { client, upserts } = makeClient(null);
    const res = await upsertCanonicalEntity(client, 'm-1', config, { externalId: 'O1', row: { currency: 'GBP' }, idempotencyKey: 'k1' });
    expect(res).toEqual({ id: 'ent-1', source_record_id: 'sr-1', result: 'created', domain_event_ids: ['ev-1'] });
    expect(upserts[0].row).toMatchObject({ merchant_id: 'm-1', source: API_SOURCE, external_id: 'O1' });
    expect(upsertSourceRecord).toHaveBeenCalledWith(client, expect.objectContaining({ canonicalEntityId: 'ent-1', sourceEntityType: 'order' }));
    expect(recordDomainEvent).toHaveBeenCalledWith(client, expect.objectContaining({ idempotencyKey: 'api:order:k1' }));
  });

  it('reports updated when the natural key already exists', async () => {
    const { client } = makeClient({ id: 'ent-1' });
    const res = await upsertCanonicalEntity(client, 'm-1', config, { externalId: 'O1', row: {}, idempotencyKey: 'k1' });
    expect(res.result).toBe('updated');
  });
});
