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
import { createFakeSupabaseClient } from '../helpers/fakeSupabaseClient';
import { TABLES } from '@/lib/supabase/tables';

function connection(
  merchantId: string,
  id: string,
  status: string,
  scopes: string[],
  updatedAt: string,
  importedRecords: number,
) {
  return {
    id,
    merchant_id: merchantId,
    provider_id: 'shipbob',
    status,
    provider_account_name: id,
    last_sync_started_at: null,
    last_sync_completed_at: null,
    last_successful_sync_at: null,
    last_verified_at: null,
    webhook_last_received_at: null,
    last_error_message: null,
    last_error: null,
    last_error_code: null,
    imported_record_count: importedRecords,
    granted_scopes: scopes,
    writeback_enabled: false,
    updated_at: updatedAt,
  };
}

describe('connection-specific catalogue capabilities', () => {
  it('uses the active connection rather than newer revoked history', async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        connection('merchant-a', 'revoked-history', 'revoked', [], '2026-07-14T12:00:00Z', 99),
        connection('merchant-a', 'active-connection', 'connected', ['orders_read'], '2026-07-13T12:00:00Z', 7),
      ],
    });
    const catalogue = await loadConnectorCatalogue(client as never, 'merchant-a');

    expect(catalogue[0]).toMatchObject({
      connectionId: 'active-connection',
      connectionCount: 1,
      importedRecords: 7,
      scopes: ['orders_read'],
    });
    expect(catalogue[0].capabilities[0].availability).toBe('enabled');
  });

  it('keeps capability coverage different for a second merchant missing a scope', async () => {
    const client = createFakeSupabaseClient({
      [TABLES.MERCHANT_INTEGRATIONS]: [
        connection('merchant-b', 'merchant-b-connection', 'connected', [], '2026-07-14T12:00:00Z', 0),
      ],
    });
    const catalogue = await loadConnectorCatalogue(client as never, 'merchant-b');

    expect(catalogue[0].connectionId).toBe('merchant-b-connection');
    expect(catalogue[0].capabilities[0]).toMatchObject({
      availability: 'permission_missing',
      scopes: ['orders_read'],
    });
  });
});
