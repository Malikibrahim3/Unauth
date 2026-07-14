import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getIntegrationCredential,
  saveIntegrationCredential,
} from '@/lib/integrations/auth';
import { fedexProvider, exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { upsProvider, exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';
import type { IntegrationCredentialPayload } from '@/lib/integrations/types';

type CarrierId = 'ups' | 'fedex';

/** Exchanges merchant-owned client credentials for a fresh, connection-scoped carrier token. */
export async function refreshCarrierCredentials(
  client: SupabaseClient,
  input: { merchantId: string; connectionId: string; providerId: CarrierId },
): Promise<IntegrationCredentialPayload | null> {
  const credentials = await getIntegrationCredential(
    client,
    input.merchantId,
    input.providerId,
    { connectionId: input.connectionId },
  );
  if (!credentials?.clientId || !credentials?.clientSecret) return null;
  const { data: connection, error } = await client.from('merchant_integrations')
    .select('environment')
    .eq('id', input.connectionId)
    .eq('merchant_id', input.merchantId)
    .eq('provider_id', input.providerId)
    .maybeSingle();
  if (error) throw new Error(`carrier_connection_lookup_failed:${error.message}`);
  if (!connection) return null;
  const connectionEnvironment: 'sandbox' | 'production' = connection.environment === 'sandbox' ? 'sandbox' : 'production';
  const credentialEnvironment: 'sandbox' | 'production' = credentials.environment === 'sandbox' ? 'sandbox' : 'production';
  if (connectionEnvironment !== credentialEnvironment) throw new Error('carrier_connection_environment_mismatch');

  const token = input.providerId === 'ups'
    ? await exchangeUpsClientCredentials({
        clientId: String(credentials.clientId),
        clientSecret: String(credentials.clientSecret),
        environment: connectionEnvironment,
      })
    : await exchangeFedExClientCredentials({
        clientId: String(credentials.clientId),
        clientSecret: String(credentials.clientSecret),
        environment: connectionEnvironment,
      });
  const refreshed = { ...credentials, accessToken: token.accessToken, environment: connectionEnvironment };
  await saveIntegrationCredential(
    client,
    input.merchantId,
    input.providerId === 'ups' ? upsProvider : fedexProvider,
    refreshed,
    {
      connectionId: input.connectionId,
      scopes: ['tracking', 'proof_of_delivery'],
      expiresAt: token.expiresAt,
    },
  );
  return refreshed;
}
