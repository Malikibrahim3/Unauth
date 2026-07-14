import { upsertConnection } from '@/lib/connectors/connectionStore';
import { upsertCommerceStoreConnection } from '@/lib/commerce/connectionStore';

function ownershipLookupClient(tableName: string, ownerMerchantId: string) {
  let writes = 0;
  const client: any = {
    from: (table: string) => {
      expect(table).toBe(tableName);
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: { id: 'existing-connection', merchant_id: ownerMerchantId }, error: null }),
        update: () => { writes += 1; return builder; },
        insert: () => { writes += 1; return builder; },
      };
      return builder;
    },
  };
  return { client, writes: () => writes };
}

describe('provider-account ownership claims', () => {
  it('rejects a canonical account already owned by another merchant before writing', async () => {
    const { client, writes } = ownershipLookupClient('merchant_integrations', 'merchant-a');
    await expect(upsertConnection(client, {
      merchantId: 'merchant-b',
      providerId: 'shipbob',
      category: 'warehouse_3pl',
      authMode: 'oauth',
      providerAccountId: 'same-channel',
      environment: 'production',
    })).rejects.toThrow('provider_account_already_owned_by_another_merchant');
    expect(writes()).toBe(0);
  });

  it('rejects a commerce store already owned by another merchant instead of reassigning merchant_id', async () => {
    const { client, writes } = ownershipLookupClient('store_connections', 'merchant-a');
    await expect(upsertCommerceStoreConnection(client, {
      merchant_id: 'merchant-b',
      platform: 'bigcommerce',
      store_key: 'same-store',
      store_url: 'https://api.bigcommerce.com/stores/same-store/v3',
      status: 'active',
      credentials_encrypted: 'encrypted',
    })).rejects.toThrow('provider_account_already_owned_by_another_merchant');
    expect(writes()).toBe(0);
  });

  it('reconnects the same merchant account by reusing its connection and source account', async () => {
    const writes = { integrationUpdates: 0, integrationInserts: 0, sourceUpserts: 0 };
    const client: any = {
      from: (table: string) => {
        let operation = 'select';
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          or: () => builder,
          limit: () => builder,
          update: () => {
            operation = 'update';
            writes.integrationUpdates += 1;
            return builder;
          },
          insert: () => {
            operation = 'insert';
            writes.integrationInserts += 1;
            return builder;
          },
          upsert: () => {
            operation = 'upsert';
            writes.sourceUpserts += 1;
            return builder;
          },
          maybeSingle: async () => ({
            data: table === 'merchant_integrations'
              ? { id: 'existing-connection', merchant_id: 'merchant-a' }
              : null,
            error: null,
          }),
          single: async () => ({
            data: table === 'merchant_integrations'
              ? { id: 'existing-connection' }
              : { id: 'existing-source-account' },
            error: null,
            operation,
          }),
        };
        return builder;
      },
    };

    const result = await upsertConnection(client, {
      merchantId: 'merchant-a',
      providerId: 'shipbob',
      category: 'warehouse_3pl',
      authMode: 'oauth',
      providerAccountId: 'same-channel',
      environment: 'production',
    });

    expect(result).toEqual({
      connectionId: 'existing-connection',
      sourceAccountId: 'existing-source-account',
    });
    expect(writes).toEqual({ integrationUpdates: 1, integrationInserts: 0, sourceUpserts: 1 });
  });
});
