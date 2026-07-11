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
import { disconnectIntegration } from '@/lib/integrations/auth';
import type { IntegrationCategory } from '@/lib/integrations/types';

export type DisconnectableProvider = { id: string; category: IntegrationCategory };

export async function disconnectProviderConnection(
  client: SupabaseClient,
  merchantId: string,
  provider: DisconnectableProvider,
): Promise<void> {
  const now = new Date().toISOString();

  if (provider.category === 'commerce') {
    const { error } = await client
      .from('store_connections')
      .update({ status: 'revoked', uninstalled_at: now })
      .eq('merchant_id', merchantId)
      .eq('platform', provider.id);
    if (error) throw new Error(`store_connection_disconnect_failed: ${error.message}`);
  } else if (provider.category === 'helpdesk') {
    const { error } = await client
      .from('helpdesk_connections')
      .update({ status: 'revoked' })
      .eq('merchant_id', merchantId)
      .eq('provider', provider.id);
    if (error) throw new Error(`helpdesk_connection_disconnect_failed: ${error.message}`);
  } else {
    await disconnectIntegration(client, merchantId, provider.id);
  }

  // Canonical mirror: mark the merchant_integrations row revoked + disconnected.
  const { error: canonicalError } = await client
    .from(TABLES.MERCHANT_INTEGRATIONS)
    .update({ status: 'revoked', disconnected_at: now, updated_at: now })
    .eq('merchant_id', merchantId)
    .eq('provider_id', provider.id);
  if (canonicalError) {
    throw new Error(`canonical_connection_disconnect_failed: ${canonicalError.message}`);
  }
}
