import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { getCategoryApplicabilityMap, providerAppliesToMerchant } from '@/lib/integrations/applicability';
import { getIntegrationProvider, INTEGRATION_PROVIDERS } from '@/lib/integrations/registry';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { deriveSyncState } from '@/lib/integrations/syncState';
import { upsertConnection } from '@/lib/connectors/connectionStore';
import { publicConnectionErrorMessage } from '@/lib/integrations/publicErrors';
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
  updated_at: string | null;
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

const ACTIVE_CONNECTION_STATUSES = new Set(['pending', 'connected', 'active', 'degraded', 'syncing']);

/** Prefer the one active connection allowed by policy, otherwise show the newest history row. */
export function pickPreferredIntegrationConnection(rows: IntegrationRow[]): IntegrationRow | null {
  return [...rows].sort((a, b) => {
    const activeDelta = Number(ACTIVE_CONNECTION_STATUSES.has(b.status ?? ''))
      - Number(ACTIVE_CONNECTION_STATUSES.has(a.status ?? ''));
    if (activeDelta !== 0) return activeDelta;
    return (b.updated_at ? Date.parse(b.updated_at) : 0) - (a.updated_at ? Date.parse(a.updated_at) : 0);
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
      .select('provider_id,status,provider_account_id,provider_account_name,last_sync_at,last_error,last_sync_started_at,last_sync_completed_at,last_successful_sync_at,imported_record_count,last_error_code,updated_at')
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
      .select('provider,provider_account_name,provider_account_id,status,last_sync_at,last_error,updated_at')
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .order('updated_at', { ascending: false })
      .limit(1),
    client
      .from('source_orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify'),
  ]);
  const applicability = await getCategoryApplicabilityMap(client, merchantId);

  const groupedIntegrationRows = ((integrationRows ?? []) as IntegrationRow[]).reduce<Map<string, IntegrationRow[]>>(
    (grouped, row) => grouped.set(row.provider_id, [...(grouped.get(row.provider_id) ?? []), row]),
    new Map(),
  );
  const integrationByProvider = new Map(
    [...groupedIntegrationRows.entries()].map(([providerId, rows]) => [providerId, pickPreferredIntegrationConnection(rows)]),
  );
  const shopify = pickLatestShopifyConnection((shopifyRows ?? []) as ShopifyConnectionRow[]);
  const shopifyIntegration = pickPreferredIntegrationConnection(
    ((integrationRows ?? []) as IntegrationRow[]).filter(
      (row) => row.provider_id === 'shopify' && row.provider_account_id === shopify?.store_key,
    ),
  );
  const gorgias = gorgiasRows?.[0] as any;

  return INTEGRATION_PROVIDERS.filter((provider) => providerAppliesToMerchant(provider, applicability)).map((provider) => {
    if (provider.id === 'shopify') {
      return {
        ...provider,
        status: activeStatus(shopify?.status),
        lastSyncAt: shopify?.last_sync_at ?? shopifyIntegration?.last_sync_at ?? null,
        lastError: publicConnectionErrorMessage(shopify?.last_error, shopifyIntegration?.last_error),
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
        lastError: publicConnectionErrorMessage(gorgias?.last_error),
        detail: gorgias?.provider_account_name ?? gorgias?.provider_account_id ?? null,
      };
    }
    const row = integrationByProvider.get(provider.id);
    return {
      ...provider,
      status: provider.buildStatus === 'slot_only' ? 'not_connected' : activeStatus(row?.status),
      lastSyncAt: row?.last_sync_at ?? null,
      lastError: publicConnectionErrorMessage(row?.last_error_code, row?.last_error),
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
  fields: {
    connectionId?: string;
    providerAccountId?: string | null;
    providerAccountName?: string | null;
    providerBaseUrl?: string | null;
    environment?: 'sandbox' | 'production';
    grantedScopes?: string[];
    lastError?: string | null;
    lastSyncAt?: string | null;
  } = {},
): Promise<string> {
  let connectionId = fields.connectionId ?? null;
  if (!connectionId && fields.providerAccountId === undefined) {
    const { data, error } = await client
      .from('merchant_integrations')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('provider_id', provider.id)
      .in('status', ['pending', 'connected', 'degraded', 'syncing'])
      .limit(2);
    if (error) throw new Error(`merchant_integration_lookup_failed: ${error.message}`);
    if ((data?.length ?? 0) > 1) throw new Error('provider_connection_policy_violated');
    connectionId = data?.[0]?.id ?? null;
  }

  if (!connectionId) {
    const created = await upsertConnection(client, {
      merchantId,
      providerId: provider.id,
      category: provider.category,
      authMode: provider.authMode,
      status: status === 'not_connected' || status === 'connection_error' ? 'error' : status,
      providerAccountId: fields.providerAccountId ?? null,
      providerAccountName: fields.providerAccountName ?? null,
      providerBaseUrl: fields.providerBaseUrl ?? null,
      displayName: fields.providerAccountName ?? provider.name,
      environment: fields.environment,
      grantedScopes: fields.grantedScopes,
    });
    connectionId = created.connectionId;
  }

  const { error } = await client
    .from('merchant_integrations')
    .update({
      status,
      last_sync_at: fields.lastSyncAt ?? null,
      last_error: fields.lastError ?? null,
      environment: fields.environment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('merchant_id', merchantId)
    .eq('provider_id', provider.id);
  if (error) throw new Error(`merchant_integration_update_failed: ${error.message}`);
  return connectionId;
}

export async function saveIntegrationCredential(
  client: SupabaseClient,
  merchantId: string,
  provider: IntegrationProvider,
  payload: IntegrationCredentialPayload,
  fields: { connectionId: string; scopes?: string[]; expiresAt?: string | null },
): Promise<void> {
  const encryptedPayload = encryptIntegrationCredentials(payload);
  const { error } = await client
    .from('integration_credentials')
    .upsert(
      {
        merchant_id: merchantId,
        provider_id: provider.id,
        connection_id: fields.connectionId,
        encrypted_payload: encryptedPayload,
        scopes: fields.scopes ?? [],
        expires_at: fields.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'connection_id' },
    );
  if (error) throw new Error(`integration_credential_upsert_failed: ${error.message}`);
}

export async function getIntegrationCredential(
  client: SupabaseClient,
  merchantId: string,
  providerId: string,
  options: { connectionId?: string | null } = {},
): Promise<IntegrationCredentialPayload | null> {
  const connectionId = options.connectionId ?? await resolveActiveIntegrationConnectionId(
    client,
    merchantId,
    providerId,
  );
  if (!connectionId) return null;
  const { data, error } = await client
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('merchant_id', merchantId)
    .eq('provider_id', providerId)
    .eq('connection_id', connectionId)
    .maybeSingle();
  if (error) throw new Error(`integration_credential_lookup_failed: ${error.message}`);
  if (!data?.encrypted_payload) return null;
  return decryptIntegrationCredentials(data.encrypted_payload);
}

export async function disconnectIntegration(
  client: SupabaseClient,
  merchantId: string,
  providerId: string,
  connectionId: string,
): Promise<void> {
  const provider = getIntegrationProvider(providerId);
  if (!provider) throw new Error('unknown_provider');
  const { error: credentialError } = await client
    .from('integration_credentials')
    .delete()
    .eq('merchant_id', merchantId)
    .eq('provider_id', providerId)
    .eq('connection_id', connectionId);
  if (credentialError) throw new Error(`integration_credential_delete_failed: ${credentialError.message}`);
  const { error: connectionError } = await client.from('merchant_integrations').update({
    status: 'not_connected',
    disconnected_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', connectionId).eq('merchant_id', merchantId).eq('provider_id', providerId);
  if (connectionError) throw new Error(`merchant_integration_disconnect_failed: ${connectionError.message}`);
}

export async function resolveActiveIntegrationConnectionId(
  client: SupabaseClient,
  merchantId: string,
  providerId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('merchant_integrations')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('provider_id', providerId)
    .in('status', ['pending', 'connected', 'degraded', 'syncing'])
    .limit(2);
  if (error) throw new Error(`active_connection_lookup_failed: ${error.message}`);
  if ((data?.length ?? 0) > 1) throw new Error('provider_connection_policy_violated');
  return data?.[0]?.id ?? null;
}

export async function getShopifyCredential(
  client: SupabaseClient,
  merchantId: string,
): Promise<{ connectionId: string; shopDomain: string; accessToken: string } | null> {
  const { data, error } = await client
    .from('store_connections')
    .select('id,store_key,credentials_encrypted,status')
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
  return { connectionId: data.id, shopDomain: data.store_key, accessToken: credentials.access_token };
}

export function assertLiveProvider(provider: IntegrationProvider): void {
  if (provider.buildStatus === 'slot_only') {
    throw new Error('provider_is_slot_only');
  }
}
