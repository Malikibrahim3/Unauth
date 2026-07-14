jest.mock('@/lib/integrations/auth', () => ({
  disconnectIntegration: jest.fn(async () => {}),
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
        // Both callers apply exactly two .eq() filters; the 2nd resolves the query.
        eq: (c: string, v: string) => {
          rec.eqs.push([c, v]);
          if (rec.eqs.length >= 2) { updates.push(rec); return Promise.resolve({ error: null }); }
          return builder;
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
    await disconnectProviderConnection(client, M, { id: 'shopify', category: 'commerce' });
    const store = updates.find((u) => u.table === 'store_connections');
    const canon = updates.find((u) => u.table === 'merchant_integrations');
    expect(store?.patch.status).toBe('revoked');
    expect(store?.eqs).toContainEqual(['platform', 'shopify']);
    expect(canon?.patch.status).toBe('revoked');
    expect(canon?.patch.disconnected_at).toBeTruthy();
    expect(disconnectIntegration).not.toHaveBeenCalled();
  });

  it('commerce dispatch is not Shopify-specific (works for woocommerce)', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'woocommerce', category: 'commerce' });
    expect(updates.find((u) => u.table === 'store_connections')?.eqs).toContainEqual(['platform', 'woocommerce']);
  });

  it('helpdesk → helpdesk_connections revoked + canonical mirror', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'zendesk', category: 'helpdesk' });
    const hd = updates.find((u) => u.table === 'helpdesk_connections');
    expect(hd?.patch.status).toBe('revoked');
    expect(hd?.eqs).toContainEqual(['provider', 'zendesk']);
    expect(updates.find((u) => u.table === 'merchant_integrations')?.patch.status).toBe('revoked');
  });

  it('other category → disconnectIntegration + canonical mirror', async () => {
    const { client, updates } = makeClient();
    await disconnectProviderConnection(client, M, { id: 'ups', category: 'carrier' });
    expect(disconnectIntegration).toHaveBeenCalledWith(client, M, 'ups');
    expect(updates.find((u) => u.table === 'merchant_integrations')?.patch.disconnected_at).toBeTruthy();
  });
});
