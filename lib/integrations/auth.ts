import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { getCategoryApplicabilityMap, providerAppliesToMerchant } from '@/lib/integrations/applicability';
import { getIntegrationProvider, INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { deriveSyncState } from '@/lib/integrations/syncState';
import type {
  IntegrationConnectionStatus,
  IntegrationCredentialPayload,
  IntegrationProvider,
  ProviderConnectionView,
} from '@/lib/integrations/types';

type IntegrationRow = {
  provider_id: string;
  status: IntegrationConnectionStatus | string | null;
  provider_account_id: string | null;
  provider_account_name: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  last_sync_started_at: string | null;
  last_sync_completed_at: string | null;
  last_successful_sync_at: string | null;
  imported_record_count: number | null;
  last_error_code: string | null;
};

type ShopifyConnectionRow = {
  platform: string | null;
  store_key: string | null;
  status: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  installed_at: string | null;
};

/** Pick the most recently installed Shopify connection for this merchant. */
export function pickLatestShopifyConnection(rows: ShopifyConnectionRow[]): ShopifyConnectionRow | null {
  return [...rows].sort((a, b) => {
    const aTime = a.installed_at ? Date.parse(a.installed_at) : 0;
    const bTime = b.installed_at ? Date.parse(b.installed_at) : 0;
    return bTime - aTime;
  })[0] ?? null;
}

function activeStatus(status: string | null | undefined): IntegrationConnectionStatus {
  if (status === 'connected' || status === 'active') return 'connected';
  if (status === 'error' || status === 'connection_error') return 'connection_error';
  if (status === 'degraded') return 'degraded';
  if (status === 'revoked') return 'revoked';
  if (status === 'syncing' || status === 'disabled') return status;
  return 'not_connected';
}

export async function getStoredIntegrationViews(
  client: SupabaseClient,
  merchantId: string,
): Promise<ProviderConnectionView[]> {
  const [{ data: integrationRows }, { data: shopifyRows }, { data: gorgiasRows }, shopifyOrders] = await Promise.all([
    client
      .from('merchant_integrations')
      .select('provider_id,status,provider_account_id,provider_account_name,last_sync_at,last_error,last_sync_started_at,last_sync_completed_at,last_successful_sync_at,imported_record_count,last_error_code')
      .eq('merchant_id', merchantId),
    client
      .from('store_connections')
      .select('platform,store_key,status,last_sync_at,last_error,installed_at')
      .eq('merchant_id', merchantId)
      .eq('platform', 'shopify')
      .order('installed_at', { ascending: false })
      .limit(1),
    client
      .from('helpdesk_connections')
      .select('provider,provider_account_name,provider_account_id,status,last_sync_at,last_error')
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .limit(1),
    client
      .from('source_orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify'),
  ]);
  const applicability = await getCategoryApplicabilityMap(client, merchantId);

  const integrationByProvider = new Map(
    ((integrationRows ?? []) as IntegrationRow[]).map((row) => [row.provider_id, row]),
  );
  const shopify = pickLatestShopifyConnection((shopifyRows ?? []) as ShopifyConnectionRow[]);
  const shopifyIntegration = ((integrationRows ?? []) as IntegrationRow[]).find(
    (row) => row.provider_id === 'shopify' && row.provider_account_id === shopify?.store_key,
  );
  const gorgias = gorgiasRows?.[0] as any;

  return INTEGRATION_PROVIDERS.filter((provider) => providerAppliesToMerchant(provider, applicability)).map((provider) => {
    if (provider.id === 'shopify') {
      return {
        ...provider,
        status: activeStatus(shopify?.status),
        lastSyncAt: shopify?.last_sync_at ?? shopifyIntegration?.last_sync_at ?? null,
        lastError: shopify?.last_error ?? shopifyIntegration?.last_error ?? null,
        detail: shopify?.store_key ?? null,
        importedRecordCount: shopifyOrders.count ?? shopifyIntegration?.imported_record_count ?? null,
        ...(shopifyIntegration
          ? {
              syncState: deriveSyncState({
                status: activeStatus(shopify?.status),
                lastSyncStartedAt: shopifyIntegration.last_sync_started_at,
                lastSyncCompletedAt: shopifyIntegration.last_sync_completed_at ?? shopify?.last_sync_at ?? null,
                lastSuccessfulSyncAt: shopifyIntegration.last_successful_sync_at ?? shopify?.last_sync_at ?? null,
                importedRecordCount: shopifyOrders.count ?? shopifyIntegration.imported_record_count,
                lastErrorCode: shopifyIntegration.last_error_code,
              }),
            }
          : {}),
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
      detail: row?.provider_account_name ?? row?.provider_account_id ?? null,
      ...(row && activeStatus(row.status) !== 'not_connected'
        ? {
            syncState: deriveSyncState({
              status: row.status,
              lastSyncStartedAt: row.last_sync_started_at,
              lastSyncCompletedAt: row.last_sync_completed_at,
              lastSuccessfulSyncAt: row.last_successful_sync_at,
              importedRecordCount: row.imported_record_count,
              lastErrorCode: row.last_error_code,
            }),
            importedRecordCount: row.imported_record_count ?? null,
          }
        : {}),
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
        provider_account_id: null,
        category: provider.category,
        status,
        auth_mode: provider.authMode,
        last_sync_at: fields.lastSyncAt ?? null,
        last_error: fields.lastError ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_id,provider_id,provider_account_id' },
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
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .order('installed_at', { ascending: false })
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
