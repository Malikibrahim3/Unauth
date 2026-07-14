jest.mock('@/lib/connectors/registry', () => ({
  listConnectors: () => [{
    manifest: {
      id: 'shipbob',
      name: 'ShipBob',
      description: 'Warehouse',
      category: 'warehouse_3pl',
      verificationStatus: 'verified',
      launchVisible: true,
      capabilities: [{
        id: 'orders.read',
        level: 'read',
        support: 'supported',
        enabledByDefault: true,
        requiredScopes: ['orders_read'],
        risk: 'low',
        description: 'Read orders',
      }],
    },
  }],
}));

import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';

function connection(
  id: string,
  status: string,
  scopes: string[],
  updatedAt: string,
  importedRecords: number,
) {
  return {
    id,
    provider_id: 'shipbob',
    status,
    provider_account_name: id,
    last_successful_sync_at: null,
    last_error_message: null,
    last_error: null,
    last_error_code: null,
    imported_record_count: importedRecords,
    granted_scopes: scopes,
    writeback_enabled: false,
    updated_at: updatedAt,
  };
}

function client(rowsByMerchant: Record<string, ReturnType<typeof connection>[]>) {
  return {
    from: () => {
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = (_column: string, merchantId: string) => Promise.resolve({
        data: rowsByMerchant[merchantId] ?? [],
        error: null,
      });
      return query;
    },
  };
}

describe('connection-specific catalogue capabilities', () => {
  it('uses the active connection rather than newer revoked history', async () => {
    const catalogue = await loadConnectorCatalogue(client({
      'merchant-a': [
        connection('revoked-history', 'revoked', [], '2026-07-14T12:00:00Z', 99),
        connection('active-connection', 'connected', ['orders_read'], '2026-07-13T12:00:00Z', 7),
      ],
    }) as never, 'merchant-a');

    expect(catalogue[0]).toMatchObject({
      connectionId: 'active-connection',
      connectionCount: 1,
      importedRecords: 7,
      scopes: ['orders_read'],
    });
    expect(catalogue[0].capabilities[0].availability).toBe('enabled');
  });

  it('keeps capability coverage different for a second merchant missing a scope', async () => {
    const catalogue = await loadConnectorCatalogue(client({
      'merchant-b': [
        connection('merchant-b-connection', 'connected', [], '2026-07-14T12:00:00Z', 0),
      ],
    }) as never, 'merchant-b');

    expect(catalogue[0].connectionId).toBe('merchant-b-connection');
    expect(catalogue[0].capabilities[0]).toMatchObject({
      availability: 'permission_missing',
      scopes: ['orders_read'],
    });
  });
});
