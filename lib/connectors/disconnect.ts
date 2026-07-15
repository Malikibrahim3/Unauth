/**
 * Provider-neutral disconnect. Dispatches by connection CATEGORY (a data
 * attribute) rather than hardcoded provider IDs, and always mirrors the
 * disconnection onto the canonical merchant_integrations row.
 *
 * commerce  -> store_connections (all commerce providers, not just Shopify)
 * helpdesk  -> helpdesk_connections (all helpdesk providers, not just Gorgias)
 * other     -> integration_credentials + merchant_integrations (disconnectIntegration)
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §5.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { disconnectIntegration, getIntegrationCredential, resolveActiveIntegrationConnectionId } from '@/lib/integrations/auth';
import { getConnector } from '@/lib/connectors/registry';
import type { IntegrationCategory } from '@/lib/integrations/types';

export type DisconnectableProvider = { id: string; category: IntegrationCategory };

export async function disconnectProviderConnection(
  client: SupabaseClient,
  merchantId: string,
  provider: DisconnectableProvider,
  requestedConnectionId?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const connectionId = requestedConnectionId ?? await resolveActiveIntegrationConnectionId(
    client,
    merchantId,
    provider.id,
  );
  if (!connectionId) throw new Error('active_provider_connection_not_found');
  const { data: connection, error: connectionLookupError } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .select('id,provider_account_id')
    .eq('id', connectionId)
    .eq('merchant_id', merchantId)
    .eq('provider_id', provider.id)
    .maybeSingle();
  if (connectionLookupError) throw new Error(`connection_lookup_failed: ${connectionLookupError.message}`);
  if (!connection) throw new Error('provider_connection_not_found');
  const { data: sourceAccount } = await client.from(TABLES.SOURCE_ACCOUNTS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('connection_id', connectionId)
    .limit(1)
    .maybeSingle();

  // Give the connector adapter a chance to clean up provider-side state
  // (e.g. webhook subscriptions) while credentials still exist. Best-effort:
  // provider-side cleanup failure never blocks the merchant's disconnect.
  const adapter = getConnector(provider.id);
  if (adapter && provider.category !== 'commerce' && provider.category !== 'helpdesk') {
    try {
      const credentials = await getIntegrationCredential(client, merchantId, provider.id, { connectionId });
      if (credentials) {
        await adapter.disconnect({ client, merchantId, connectionId, sourceAccountId: sourceAccount?.id ?? null, credentials });
      }
    } catch {
      // Ignore — the local disconnect below is the source of truth.
    }
  }

  if (provider.category === 'commerce') {
    const { error } = await client
      .from('store_connections')
      .update({ status: 'revoked', uninstalled_at: now })
      .eq('merchant_id', merchantId)
      .eq('platform', provider.id)
      .eq('store_key', connection.provider_account_id);
    if (error) throw new Error(`store_connection_disconnect_failed: ${error.message}`);
  } else if (provider.category === 'helpdesk') {
    const { error } = await client
      .from('helpdesk_connections')
      .update({ status: 'revoked' })
      .eq('merchant_id', merchantId)
      .eq('provider', provider.id)
      .eq('provider_account_id', connection.provider_account_id);
    if (error) throw new Error(`helpdesk_connection_disconnect_failed: ${error.message}`);
  } else {
    await disconnectIntegration(client, merchantId, provider.id, connectionId);
  }

  // Canonical mirror: mark the merchant_integrations row revoked + disconnected.
  const { error: canonicalError } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .update({
      status: 'revoked',
      disconnected_at: now,
      subscribed: false,
      webhook_status: 'disconnected',
      updated_at: now,
    })
    .eq('id', connectionId)
    .eq('merchant_id', merchantId)
    .eq('provider_id', provider.id);
  if (canonicalError) {
    throw new Error(`canonical_connection_disconnect_failed: ${canonicalError.message}`);
  }
}
