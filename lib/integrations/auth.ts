import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { getCategoryApplicabilityMap, providerAppliesToMerchant } from '@/lib/integrations/applicability';
import { getIntegrationProvider, INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import type {
  IntegrationConnectionStatus,
  IntegrationCredentialPayload,
  IntegrationProvider,
  ProviderConnectionView,
} from '@/lib/integrations/types';

type IntegrationRow = {
  provider_id: string;
  status: IntegrationConnectionStatus | string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

function activeStatus(status: string | null | undefined): IntegrationConnectionStatus {
  if (status === 'connected' || status === 'active') return 'connected';
  if (status === 'error' || status === 'connection_error') return 'connection_error';
  if (status === 'syncing' || status === 'disabled') return status;
  return 'not_connected';
}

export async function getStoredIntegrationViews(
  client: SupabaseClient,
  merchantId: string,
): Promise<ProviderConnectionView[]> {
  const [{ data: integrationRows }, { data: shopifyRows }, { data: gorgiasRows }] = await Promise.all([
    client
      .from('merchant_integrations')
      .select('provider_id,status,last_sync_at,last_error')
      .eq('merchant_id', merchantId),
    client
      .from('store_connections')
      .select('platform,store_key,status,last_sync_at,last_error')
      .eq('merchant_id', merchantId)
      .eq('platform', 'shopify')
      .limit(1),
    client
      .from('helpdesk_connections')
      .select('provider,provider_account_name,provider_account_id,status,last_sync_at,last_error')
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .limit(1),
  ]);
  const applicability = await getCategoryApplicabilityMap(client, merchantId);

  const integrationByProvider = new Map(
    ((integrationRows ?? []) as IntegrationRow[]).map((row) => [row.provider_id, row]),
  );
  const shopify = shopifyRows?.[0] as any;
  const gorgias = gorgiasRows?.[0] as any;

  return INTEGRATION_PROVIDERS.filter((provider) => providerAppliesToMerchant(provider, applicability)).map((provider) => {
    if (provider.id === 'shopify') {
      return {
        ...provider,
        status: activeStatus(shopify?.status),
        lastSyncAt: shopify?.last_sync_at ?? null,
        lastError: shopify?.last_error ?? null,
        detail: shopify?.store_key ?? null,
      };
    }
    if (provider.id === 'gorgias') {
      return {
        ...provider,
        status: activeStatus(gorgias?.status),
        lastSyncAt: gorgias?.last_sync_at ?? null,
        lastError: gorgias?.last_error ?? null,
        detail: gorgias?.provider_account_name ?? gorgias?.provider_account_id ?? null,
      };
    }
    const row = integrationByProvider.get(provider.id);
    return {
      ...provider,
      status: provider.buildStatus === 'slot_only' ? 'not_connected' : activeStatus(row?.status),
      lastSyncAt: row?.last_sync_at ?? null,
      lastError: row?.last_error ?? null,
      detail: null,
    };
  });
}

export async function upsertMerchantIntegration(
  client: SupabaseClient,
  merchantId: string,
  provider: IntegrationProvider,
  status: IntegrationConnectionStatus,
  fields: { lastError?: string | null; lastSyncAt?: string | null } = {},
): Promise<void> {
  const { error } = await client
    .from('merchant_integrations')
    .upsert(
      {
        merchant_id: merchantId,
        provider_id: provider.id,
        category: provider.category,
        status,
        auth_mode: provider.authMode,
        last_sync_at: fields.lastSyncAt ?? null,
        last_error: fields.lastError ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,provider_id' },
    );
  if (error) throw new Error(`merchant_integration_upsert_failed: ${error.message}`);
}

export async function saveIntegrationCredential(
  client: SupabaseClient,
  merchantId: string,
  provider: IntegrationProvider,
  payload: IntegrationCredentialPayload,
  fields: { scopes?: string[]; expiresAt?: string | null } = {},
): Promise<void> {
  const encryptedPayload = encryptIntegrationCredentials(payload);
  const { error } = await client
    .from('integration_credentials')
    .upsert(
      {
        merchant_id: merchantId,
        provider_id: provider.id,
        encrypted_payload: encryptedPayload,
        scopes: fields.scopes ?? [],
        expires_at: fields.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,provider_id' },
    );
  if (error) throw new Error(`integration_credential_upsert_failed: ${error.message}`);
}

export async function getIntegrationCredential(
  client: SupabaseClient,
  merchantId: string,
  providerId: string,
): Promise<IntegrationCredentialPayload | null> {
  const { data, error } = await client
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('merchant_id', merchantId)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (error) throw new Error(`integration_credential_lookup_failed: ${error.message}`);
  if (!data?.encrypted_payload) return null;
  return decryptIntegrationCredentials(data.encrypted_payload);
}

export async function disconnectIntegration(
  client: SupabaseClient,
  merchantId: string,
  providerId: string,
): Promise<void> {
  const provider = getIntegrationProvider(providerId);
  if (!provider) throw new Error('unknown_provider');
  const { error: credentialError } = await client
    .from('integration_credentials')
    .delete()
    .eq('merchant_id', merchantId)
    .eq('provider_id', providerId);
  if (credentialError) throw new Error(`integration_credential_delete_failed: ${credentialError.message}`);
  await upsertMerchantIntegration(client, merchantId, provider, 'not_connected', { lastError: null });
}

export async function getShopifyCredential(
  client: SupabaseClient,
  merchantId: string,
): Promise<{ shopDomain: string; accessToken: string } | null> {
  const { data, error } = await client
    .from('store_connections')
    .select('store_key,credentials_encrypted,status')
    .eq('merchant_id', merchantId)
    .eq('platform', 'shopify')
    .neq('status', 'revoked')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`shopify_connection_lookup_failed: ${error.message}`);
  if (!data?.credentials_encrypted || !data?.store_key) return null;
  const credentials = decryptBigCommerceOAuthCredentials(data.credentials_encrypted);
  return { shopDomain: data.store_key, accessToken: credentials.access_token };
}

export function assertLiveProvider(provider: IntegrationProvider): void {
  if (provider.buildStatus === 'slot_only') {
    throw new Error('provider_is_slot_only');
  }
}
