jest.mock('@/lib/api/v1/ingest/upsertEntity', () => ({
  upsertCanonicalEntity: jest.fn(async () => ({ id: 'ent-1', source_record_id: 'sr-1', result: 'created', domain_event_ids: ['ev-1'] })),
  API_SOURCE: 'manual',
}));
import { upsertCanonicalEntity } from '@/lib/api/v1/ingest/upsertEntity';
import { commitCsvImport } from '@/lib/imports/csv/commitImport';
import type { ProcessedRow } from '@/lib/imports/csv/processor';

const order = {
  externalId: 'ORDER-1', orderNumber: '1001', currency: 'GBP', totalMinor: 8400, subtotalMinor: 8000,
  financialStatus: 'paid', sourceFinancialStatus: 'paid', fulfillmentStatus: 'unfulfilled', sourceFulfillmentStatus: 'unfulfilled',
  placedAt: null, customer: { externalId: null, email: 'a@b.com', name: 'A', phone: null }, lines: [],
};

describe('commitCsvImport', () => {
  beforeEach(() => (upsertCanonicalEntity as jest.Mock).mockClear());

  it('persists each valid order via the shared canonical upsert with a job-scoped idempotency key', async () => {
    const valid: ProcessedRow[] = [{ row: 1, externalId: 'ORDER-1', entity: order }];
    const res = await commitCsvImport({} as any, 'm-1', 'orders', valid, 'job-9');
    expect(res).toEqual({ persisted: 1, skipped: 0, datasetSupported: true });
    const call = (upsertCanonicalEntity as jest.Mock).mock.calls[0];
    expect(call[2]).toMatchObject({ table: 'source_orders', canonicalEntityType: 'order' });
    expect(call[3]).toMatchObject({ externalId: 'ORDER-1', idempotencyKey: 'csv:job-9:ORDER-1' });
    expect((call[3].row as any).total_price).toBe(84);
  });

  it('reports an unsupported dataset without persisting (refunds persistence is Phase 7)', async () => {
    const res = await commitCsvImport({} as any, 'm-1', 'refunds', [{ row: 1, externalId: 'R1', entity: {} }], 'job-9');
    expect(res).toEqual({ persisted: 0, skipped: 1, datasetSupported: false });
    expect(upsertCanonicalEntity).not.toHaveBeenCalled();
  });
});
