jest.mock('@/lib/integrations/auth', () => ({
  disconnectIntegration: jest.fn(async () => {}),
  getIntegrationCredential: jest.fn(async () => null),
  resolveActiveIntegrationConnectionId: jest.fn(async () => 'connection-1'),
}));

import { disconnectProviderConnection } from '@/lib/connectors/disconnect';
import { disconnectIntegration } from '@/lib/integrations/auth';

type Update = { table: string; patch: any; eqs: Array<[string, string]> };

function makeClient() {
  const updates: Update[] = [];
  const client: any = {
    from: (table: string) => {
      const rec: Update = { table, patch: null, eqs: [] };
      const builder: any = {
        update: (patch: any) => { rec.patch = patch; return builder; },
        select: () => builder,
        eq: (c: string, v: string) => { rec.eqs.push([c, v]); return builder; },
        limit: () => builder,
        maybeSingle: async () => ({
          data: table === 'merchant_integrations'
            ? { id: 'connection-1', provider_account_id: 'account-1' }
            : table === 'source_accounts'
              ? { id: 'source-account-1' }
              : null,
          error: null,
        }),
        then: (resolve: (value: { error: null }) => unknown) => {
          if (rec.patch) updates.push(rec);
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
  return { client, updates };
}

const M = 'm-1';

describe('disconnectProviderConnection', () => {
  beforeEach(() => (disconnectIntegration as jest.Mock).mockClear());

  it('commerce → store_connections revoked + canonical mirror', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'shopify', category: 'commerce' }, 'connection-1');
    const store = updates.find((u) => u.table === 'store_connections');
    const canon = updates.find((u) => u.table === 'merchant_integrations');
    expect(store?.patch.status).toBe('revoked');
    expect(store?.eqs).toContainEqual(['platform', 'shopify']);
    expect(store?.eqs).toContainEqual(['store_key', 'account-1']);
    expect(canon?.patch.status).toBe('revoked');
    expect(canon?.patch.disconnected_at).toBeTruthy();
    expect(canon?.patch.subscribed).toBe(false);
    expect(canon?.patch.webhook_status).toBe('disconnected');
    expect(disconnectIntegration).not.toHaveBeenCalled();
  });

  it('commerce dispatch is not Shopify-specific (works for woocommerce)', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'woocommerce', category: 'commerce' }, 'connection-1');
    expect(updates.find((u) => u.table === 'store_connections')?.eqs).toContainEqual(['platform', 'woocommerce']);
  });

  it('helpdesk → helpdesk_connections revoked + canonical mirror', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'zendesk', category: 'helpdesk' }, 'connection-1');
    const hd = updates.find((u) => u.table === 'helpdesk_connections');
    expect(hd?.patch.status).toBe('revoked');
    expect(hd?.eqs).toContainEqual(['provider', 'zendesk']);
    expect(updates.find((u) => u.table === 'merchant_integrations')?.patch.status).toBe('revoked');
  });

  it('other category → disconnectIntegration + canonical mirror', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'ups', category: 'carrier' }, 'connection-1');
    expect(disconnectIntegration).toHaveBeenCalledWith(client, M, 'ups', 'connection-1');
    expect(updates.find((u) => u.table === 'merchant_integrations')?.patch.disconnected_at).toBeTruthy();
     expect(updates.find((u) => u.table === 'merchant_integrations')?.patch.subscribed).toBe(false);
    expect(updates.some((u) => u.table === 'source_records')).toBe(false);
  });

  it('rejects a direct connection ID that does not belong to the merchant', async () => {
    const client: any = {
      from: (table: string) => {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({
            data: table === 'merchant_integrations' ? null : null,
            error: null,
          }),
        };
        return builder;
      },
    };
    await expect(disconnectProviderConnection(
      client,
      'merchant-a',
      { id: 'ups', category: 'carrier' },
      'merchant-b-connection',
    )).rejects.toThrow('provider_connection_not_found');
    expect(disconnectIntegration).not.toHaveBeenCalled();
  });
});
