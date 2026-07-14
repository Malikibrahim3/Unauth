import { getIntegrationCredential, saveIntegrationCredential } from '@/lib/integrations/auth';
import { decryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { upsProvider } from '@/lib/integrations/providers/ups';

describe('connection-scoped encrypted credentials', () => {
  it('writes encrypted credentials with connection_id as the conflict target', async () => {
    let row: Record<string, unknown> | null = null;
    let conflictTarget = '';
    const client = {
      from: () => ({
        upsert: async (value: Record<string, unknown>, options: { onConflict: string }) => {
          row = value;
          conflictTarget = options.onConflict;
          return { error: null };
        },
      }),
    };
    await saveIntegrationCredential(client as never, 'merchant-a', upsProvider, {
      clientId: 'merchant-client',
      clientSecret: 'merchant-secret',
      environment: 'sandbox',
    }, { connectionId: 'connection-a' });

    expect(row).toMatchObject({
      merchant_id: 'merchant-a',
      provider_id: 'ups',
      connection_id: 'connection-a',
    });
    expect(conflictTarget).toBe('connection_id');
    expect(row?.encrypted_payload).not.toContain('merchant-secret');
    expect(decryptIntegrationCredentials(String(row?.encrypted_payload))).toMatchObject({
      clientId: 'merchant-client',
      clientSecret: 'merchant-secret',
      environment: 'sandbox',
    });
  });

  it('requires merchant, provider and connection together on reads', async () => {
    const filters: Array<[string, string]> = [];
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: string) => { filters.push([column, value]); return builder; },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    await getIntegrationCredential({ from: () => builder } as never, 'merchant-b', 'ups', {
      connectionId: 'connection-b',
    });
    expect(filters).toEqual([
      ['merchant_id', 'merchant-b'],
      ['provider_id', 'ups'],
      ['connection_id', 'connection-b'],
    ]);
  });
});
