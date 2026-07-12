import {
  upsertSourceRecord,
  SOURCE_RECORD_CONFLICT_TARGET,
} from '@/lib/sources/sourceRegistry';

function makeClient() {
  const calls: any = {};
  const builder: any = {
    upsert: jest.fn((row: any, opts: any) => {
      calls.row = row;
      calls.opts = opts;
      return builder;
    }),
    select: jest.fn(() => builder),
    single: jest.fn(async () => ({ data: { id: 'sr-1', ...calls.row }, error: null })),
  };
  const client = { from: jest.fn(() => builder) } as any;
  return { client, builder, calls };
}

describe('upsertSourceRecord', () => {
  it('upserts with the account-scoped conflict target so two accounts never collide', async () => {
    const { client, builder, calls } = makeClient();
    await upsertSourceRecord(client, {
      merchantId: 'm-1',
      connectionId: 'conn-uk',
      sourceSystem: 'shopify',
      sourceEntityType: 'order',
      externalId: 'ORDER-1001',
      canonicalEntityType: 'order',
      canonicalEntityId: 'o-1',
    });

    expect(client.from).toHaveBeenCalledWith('source_records');
    expect(calls.opts).toEqual({ onConflict: SOURCE_RECORD_CONFLICT_TARGET });
    expect(SOURCE_RECORD_CONFLICT_TARGET).toBe(
      'merchant_id,connection_id,source_entity_type,external_id',
    );
    expect(calls.row).toMatchObject({
      merchant_id: 'm-1',
      connection_id: 'conn-uk',
      source_system: 'shopify',
      source_entity_type: 'order',
      external_id: 'ORDER-1001',
      sync_state: 'current',
      freshness_state: 'fresh',
    });
    expect(builder.select).toHaveBeenCalled();
  });

  it('defaults connection/account to null for synthetic (manual/CSV/API) records', async () => {
    const { client, calls } = makeClient();
    await upsertSourceRecord(client, {
      merchantId: 'm-1',
      sourceSystem: 'csv_import',
      sourceEntityType: 'order',
      externalId: 'CSV-1',
    });
    expect(calls.row.connection_id).toBeNull();
    expect(calls.row.source_account_id).toBeNull();
  });

  it('throws on error', async () => {
    const builder: any = {
      upsert: jest.fn(() => builder),
      select: jest.fn(() => builder),
      single: jest.fn(async () => ({ data: null, error: { message: 'dup' } })),
    };
    const client = { from: jest.fn(() => builder) } as any;
    await expect(
      upsertSourceRecord(client, {
        merchantId: 'm-1',
        sourceSystem: 'shopify',
        sourceEntityType: 'order',
        externalId: 'X',
      }),
    ).rejects.toEqual({ message: 'dup' });
  });
});
