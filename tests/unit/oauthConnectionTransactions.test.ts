import {
  beginOAuthConnectionTransaction,
  consumeOAuthConnectionTransaction,
} from '@/lib/integrations/oauthTransactions';

describe('OAuth connection transaction ledger', () => {
  it('stores only a state hash and binds tenant, user, provider, callback, environment and account', async () => {
    let inserted: Record<string, unknown> | null = null;
    const client = {
      from: (table: string) => {
        expect(table).toBe('oauth_connection_transactions');
        return {
          insert: async (row: Record<string, unknown>) => {
            inserted = row;
            return { error: null };
          },
        };
      },
    };

    const state = await beginOAuthConnectionTransaction(client as never, {
      merchantId: 'merchant-a',
      userId: 'user-a',
      providerId: 'shopify',
      environment: 'production',
      callbackUrl: 'https://app.example/api/shopify/callback',
      providerAccountHint: 'merchant-a.myshopify.com',
    });

    expect(state.length).toBeGreaterThanOrEqual(32);
    expect(inserted).toMatchObject({
      merchant_id: 'merchant-a',
      user_id: 'user-a',
      provider_id: 'shopify',
      environment: 'production',
      callback_url: 'https://app.example/api/shopify/callback',
      provider_account_hint: 'merchant-a.myshopify.com',
    });
    expect(inserted?.state_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(inserted)).not.toContain(state);
  });

  it('atomically scopes consume and returns the bound merchant', async () => {
    const filters: Array<[string, unknown]> = [];
    const row = {
      merchant_id: 'merchant-b', user_id: 'user-b', provider_id: 'shopify',
      environment: 'production', callback_url: 'https://app.example/api/shopify/callback',
      provider_account_hint: 'merchant-b.myshopify.com', expires_at: '2099-01-01T00:00:00.000Z',
    };
    const builder: any = {
      eq: (column: string, value: unknown) => { filters.push([column, value]); return builder; },
      is: (column: string, value: unknown) => { filters.push([column, value]); return builder; },
      gt: (column: string, value: unknown) => { filters.push([column, value]); return builder; },
      select: () => builder,
      maybeSingle: async () => ({ data: row, error: null }),
    };
    const client = { from: () => ({ update: () => builder }) };

    const result = await consumeOAuthConnectionTransaction(client as never, {
      state: 'opaque-state-with-at-least-thirty-two-bytes',
      userId: 'user-b',
      providerId: 'shopify',
      callbackUrl: 'https://app.example/api/shopify/callback',
      providerAccountId: 'merchant-b.myshopify.com',
    });

    expect(result.merchantId).toBe('merchant-b');
    expect(filters).toEqual(expect.arrayContaining([
      ['user_id', 'user-b'],
      ['provider_id', 'shopify'],
      ['callback_url', 'https://app.example/api/shopify/callback'],
      ['provider_account_hint', 'merchant-b.myshopify.com'],
      ['consumed_at', null],
    ]));
  });

  it('rejects an expired or replayed transaction without revealing which condition failed', async () => {
    const builder: any = {
      eq: () => builder,
      is: () => builder,
      gt: () => builder,
      select: () => builder,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const client = { from: () => ({ update: () => builder }) };

    await expect(consumeOAuthConnectionTransaction(client as never, {
      state: 'opaque-state-with-at-least-thirty-two-bytes',
      userId: 'user-a',
      providerId: 'shopify',
      callbackUrl: 'https://app.example/api/shopify/callback',
    })).rejects.toThrow('oauth_transaction_invalid_expired_or_replayed');
  });
});
