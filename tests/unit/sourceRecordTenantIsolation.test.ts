import { SOURCE_RECORD_CONFLICT_TARGET, upsertSourceRecord } from '@/lib/sources/sourceRegistry';

describe('source-record tenant and account isolation', () => {
  it('persists identical external ids under independent merchant connections', async () => {
    const writes: Array<{ row: Record<string, unknown>; conflict: string }> = [];
    const client = {
      from: () => {
        const builder: any = {
          upsert: (row: Record<string, unknown>, options: { onConflict: string }) => {
            writes.push({ row, conflict: options.onConflict });
            return builder;
          },
          select: () => builder,
          single: async () => ({ data: { id: `record-${writes.length}` }, error: null }),
        };
        return builder;
      },
    };

    await upsertSourceRecord(client as never, {
      merchantId: 'merchant-a',
      connectionId: 'connection-a',
      sourceAccountId: 'account-a',
      sourceSystem: 'shipbob',
      sourceEntityType: 'order',
      externalId: 'SAME-ORDER-ID',
    });
    await upsertSourceRecord(client as never, {
      merchantId: 'merchant-b',
      connectionId: 'connection-b',
      sourceAccountId: 'account-b',
      sourceSystem: 'shipbob',
      sourceEntityType: 'order',
      externalId: 'SAME-ORDER-ID',
    });

    expect(writes.map(({ row }) => [row.merchant_id, row.connection_id, row.external_id])).toEqual([
      ['merchant-a', 'connection-a', 'SAME-ORDER-ID'],
      ['merchant-b', 'connection-b', 'SAME-ORDER-ID'],
    ]);
    expect(writes.every(({ conflict }) => conflict === SOURCE_RECORD_CONFLICT_TARGET)).toBe(true);
    expect(SOURCE_RECORD_CONFLICT_TARGET).toBe('merchant_id,connection_id,source_entity_type,external_id');
  });
});
