import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { getIntegrationCredential } from '@/lib/integrations/auth';
import { refreshCarrierCredentials } from '@/lib/integrations/providers/carrierCredentials';
import { verifyShipBobPat } from '@/lib/integrations/providers/shipbob';
import { refreshShipBobCredentialsIfNeeded } from '@/lib/integrations/providers/shipbobOAuth';
import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';
import {
  decryptGorgiasApiCredentials,
} from '@/lib/support/gorgias/credentialCrypto';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  GorgiasSidebarRegistrationError,
} from '@/lib/support/gorgias/registerSidebarWidget';
import { env } from '@/lib/utils/env';

export type LiveVerificationStatus = 'verified' | 'failed' | 'inconclusive';

export type LiveVerificationResult = {
  status: LiveVerificationStatus;
  reason?: string;
};

export type ShopifyVerificationRow = {
  id: string;
  store_key: string | null;
  credentials_encrypted: string | null;
  status: string | null;
  uninstalled_at?: string | null;
};

export type GorgiasVerificationRow = {
  merchant_id?: string;
  id: string;
  provider_base_url: string | null;
  access_token_encrypted: string | null;
  status: string | null;
};

export type MerchantIntegrationVerificationRow = {
  id: string;
  merchant_id: string;
  provider_id: 'shipbob' | 'ups' | 'fedex';
  provider_account_id: string | null;
  environment: string | null;
  status: string | null;
};

const PROBE_TIMEOUT_MS = 8_000;
// Legacy v2 connection tables use connection_status: active|disabled|revoked|error.
const CHECKABLE_STATUSES = ['active', 'error'];

async function withProbeTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function withProbeDeadline<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('probe_timeout')), PROBE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function classifiedProviderFailure(error: unknown): LiveVerificationResult {
  const message = error instanceof Error ? error.message : '';
  const statusMatch = message.match(/(?:^|:|\s)(\d{3})(?=\D|$)/);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (/missing_credential|credential_missing|access_token_missing/.test(message)) {
    return { status: 'failed', reason: 'missing_credentials' };
  }
  if (/environment_mismatch/.test(message)) {
    return { status: 'failed', reason: 'environment_mismatch' };
  }
  if (/account_selection_required|channel_missing|account_unavailable/.test(message)) {
    return { status: 'failed', reason: 'provider_account_unavailable' };
  }
  if (
    status === 401
    || status === 403
    || /auth_failed|invalid_client|invalid_grant|token_refresh_failed/.test(message)
  ) {
    return { status: 'failed', reason: 'credentials_revoked' };
  }
  if (status === 429 || /rate_limited/.test(message)) {
    return { status: 'inconclusive', reason: 'provider_rate_limited' };
  }
  if ((status !== null && status >= 500) || /probe_timeout/.test(message)) {
    return { status: 'inconclusive', reason: 'provider_unavailable' };
  }
  if (status !== null && status >= 400) {
    return { status: 'failed', reason: 'provider_rejected' };
  }
  return { status: 'inconclusive', reason: 'network_or_timeout' };
}

type IntegrationProbeDependencies = {
  refreshCarrierCredentials: typeof refreshCarrierCredentials;
  getIntegrationCredential: typeof getIntegrationCredential;
  refreshShipBobCredentialsIfNeeded: typeof refreshShipBobCredentialsIfNeeded;
  verifyShipBobPat: typeof verifyShipBobPat;
};

const DEFAULT_INTEGRATION_PROBE_DEPENDENCIES: IntegrationProbeDependencies = {
  refreshCarrierCredentials,
  getIntegrationCredential,
  refreshShipBobCredentialsIfNeeded,
  verifyShipBobPat,
};

/** Verify one exact merchant-owned provider connection without exposing credential or provider response text. */
export async function verifyMerchantIntegrationConnection(
  client: SupabaseClient,
  row: MerchantIntegrationVerificationRow,
  dependencies: IntegrationProbeDependencies = DEFAULT_INTEGRATION_PROBE_DEPENDENCIES,
): Promise<LiveVerificationResult> {
  try {
    if (row.provider_id === 'ups' || row.provider_id === 'fedex') {
      const credentials = await withProbeDeadline(dependencies.refreshCarrierCredentials(client, {
        merchantId: row.merchant_id,
        connectionId: row.id,
        providerId: row.provider_id,
      }));
      return credentials
        ? { status: 'verified' }
        : { status: 'failed', reason: 'missing_credentials' };
    }

    const credentials = env.SHIPBOB_OAUTH_CLIENT_ID && env.SHIPBOB_OAUTH_CLIENT_SECRET
      ? await withProbeDeadline(dependencies.refreshShipBobCredentialsIfNeeded(
          client,
          row.merchant_id,
          {
            connectionId: row.id,
            clientId: env.SHIPBOB_OAUTH_CLIENT_ID,
            clientSecret: env.SHIPBOB_OAUTH_CLIENT_SECRET,
          },
        ))
      : await dependencies.getIntegrationCredential(client, row.merchant_id, 'shipbob', {
          connectionId: row.id,
        });
    const token = typeof credentials?.accessToken === 'string'
      ? credentials.accessToken
      : typeof credentials?.apiKey === 'string'
        ? credentials.apiKey
        : '';
    if (!token) return { status: 'failed', reason: 'missing_credentials' };
    const storedEnvironment = credentials?.environment === 'sandbox' ? 'sandbox' : 'production';
    const connectionEnvironment = row.environment === 'sandbox' ? 'sandbox' : 'production';
    if (storedEnvironment !== connectionEnvironment) {
      return { status: 'failed', reason: 'environment_mismatch' };
    }
    if (!row.provider_account_id) {
      return { status: 'failed', reason: 'provider_account_unavailable' };
    }
    const access = await withProbeDeadline(dependencies.verifyShipBobPat(
      token,
      connectionEnvironment === 'sandbox',
      row.provider_account_id,
    ));
    const accountAvailable = access.channels.some((channel) => channel.id === row.provider_account_id);
    return accountAvailable
      ? { status: 'verified' }
      : { status: 'failed', reason: 'provider_account_unavailable' };
  } catch (error) {
    return classifiedProviderFailure(error);
  }
}

export async function verifyShopifyConnection(
  row: ShopifyVerificationRow,
): Promise<LiveVerificationResult> {
  if (row.uninstalled_at) return { status: 'failed', reason: 'app_uninstalled' };
  if (!row.credentials_encrypted || !row.store_key) {
    return { status: 'failed', reason: 'missing_credentials' };
  }

  let accessToken: string;
  try {
    accessToken = decryptBigCommerceOAuthCredentials(row.credentials_encrypted).access_token;
  } catch {
    return { status: 'failed', reason: 'decrypt_failed' };
  }

  try {
    const response = await withProbeTimeout((signal) => fetch(
      `https://${row.store_key}/admin/api/${SHOPIFY_REST_API_VERSION}/shop.json`,
      {
        headers: { 'X-Shopify-Access-Token': accessToken },
        cache: 'no-store',
        signal,
      },
    ));
    if (response.ok) return { status: 'verified' };
    if (response.status >= 500 || response.status === 429) return { status: 'inconclusive', reason: `shopify_${response.status}` };
    return { status: 'failed', reason: `shopify_${response.status}` };
  } catch {
    return { status: 'inconclusive', reason: 'network_or_timeout' };
  }
}

export async function verifyGorgiasConnection(
  row: GorgiasVerificationRow,
): Promise<LiveVerificationResult> {
  if (!row.access_token_encrypted || !row.provider_base_url) {
    return { status: 'failed', reason: 'missing_credentials' };
  }

  let credentials: { email: string; api_key: string };
  try {
    credentials = decryptGorgiasApiCredentials(row.access_token_encrypted);
  } catch {
    return { status: 'failed', reason: 'decrypt_failed' };
  }

  try {
    await withProbeTimeout((signal) => gorgiasApiRequest<unknown>(
      gorgiasApiBaseUrl(row.provider_base_url as string),
      '/users/me',
      credentials,
      { method: 'GET', signal },
    ));
    return { status: 'verified' };
  } catch (error) {
    if (error instanceof GorgiasSidebarRegistrationError) {
      if (error.status === 401 || error.status === 403) {
        return { status: 'failed', reason: 'credentials_revoked' };
      }
      if (error.status >= 500 || error.status === 429 || error.status === 0) {
        return { status: 'inconclusive', reason: `gorgias_${error.status || 'network'}` };
      }
      return { status: 'failed', reason: `gorgias_${error.status}` };
    }
    return { status: 'inconclusive', reason: 'network_or_timeout' };
  }
}

type VerificationTable = 'store_connections' | 'helpdesk_connections' | 'merchant_integrations';

/** Persist a probe without treating an inconclusive network result as a failure. */
export async function persistLiveVerification(
  client: SupabaseClient,
  table: VerificationTable,
  merchantId: string,
  id: string,
  currentStatus: string | null,
  result: LiveVerificationResult,
  checkedAt = new Date().toISOString(),
): Promise<void> {
  const patch: Record<string, unknown> = {
    last_verified_at: checkedAt,
    last_verification_status: result.status,
    last_verification_error: result.reason ?? null,
    updated_at: checkedAt,
  };

  if (result.status === 'verified') {
    patch.status = table === 'merchant_integrations' ? 'connected' : 'active';
    patch.last_error = null;
  } else if (result.status === 'failed') {
    patch.status = 'error';
    patch.last_error = `verification_failed: ${result.reason ?? 'unknown'}`;
    if (table === 'merchant_integrations') {
      patch.last_error_message = patch.last_error;
      patch.last_error_code = 'connection_verification_failed';
      patch.last_error_at = checkedAt;
    }
  } else if (currentStatus) {
    patch.status = currentStatus;
  }

  const { error } = await client.from(table)
    .update(patch as never)
    .eq('id', id)
    .eq('merchant_id', merchantId);
  if (error) {
    // Allow a safe rolling deployment where application code reaches Vercel
    // before the additive verification-column migration reaches PostgREST.
    // Only this known schema-cache condition is ignored; every other write
    // failure remains fatal and the checklist still requires the migration.
    if (
      error.code === 'PGRST204'
      && /last_verification_(status|error)|last_verified_at/.test(error.message)
    ) return;
    throw new Error(`persist_live_verification_failed: ${error.message}`);
  }
}

export type MerchantLiveHealth = {
  shopify: LiveVerificationResult | null;
  gorgias: LiveVerificationResult | null;
  shipbob: LiveVerificationResult | null;
  ups: LiveVerificationResult | null;
  fedex: LiveVerificationResult | null;
};

/** Verify the legacy credential stores used by the live Shopify/Gorgias flows. */
export async function verifyMerchantLiveConnections(
  client: SupabaseClient,
  merchantId: string,
): Promise<MerchantLiveHealth> {
  const [stores, helpdesks, integrations] = await Promise.all([
    client.from('store_connections')
      .select('id,store_key,credentials_encrypted,status,uninstalled_at')
      .eq('merchant_id', merchantId)
      .eq('platform', 'shopify')
      .in('status', CHECKABLE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1),
    client.from('helpdesk_connections')
      .select('id,provider_base_url,access_token_encrypted,status')
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .in('status', CHECKABLE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1),
    client.from('merchant_integrations')
      .select('id,merchant_id,provider_id,provider_account_id,environment,status')
      .eq('merchant_id', merchantId)
      .in('provider_id', ['shipbob', 'ups', 'fedex'])
      .in('status', ['connected', 'active', 'degraded', 'error'])
      .order('updated_at', { ascending: false }),
  ]);

  const shopifyRow = (stores.data?.[0] ?? null) as ShopifyVerificationRow | null;
  const gorgiasRow = (helpdesks.data?.[0] ?? null) as GorgiasVerificationRow | null;
  const integrationRows = (integrations.data ?? []) as MerchantIntegrationVerificationRow[];
  const byProvider = new Map<string, MerchantIntegrationVerificationRow>();
  for (const row of integrationRows) {
    if (!byProvider.has(row.provider_id)) byProvider.set(row.provider_id, row);
  }
  const shipbobRow = byProvider.get('shipbob') ?? null;
  const upsRow = byProvider.get('ups') ?? null;
  const fedexRow = byProvider.get('fedex') ?? null;
  const [shopify, gorgias, shipbob, ups, fedex] = await Promise.all([
    shopifyRow ? verifyShopifyConnection(shopifyRow) : Promise.resolve(null),
    gorgiasRow ? verifyGorgiasConnection(gorgiasRow) : Promise.resolve(null),
    shipbobRow ? verifyMerchantIntegrationConnection(client, shipbobRow) : Promise.resolve(null),
    upsRow ? verifyMerchantIntegrationConnection(client, upsRow) : Promise.resolve(null),
    fedexRow ? verifyMerchantIntegrationConnection(client, fedexRow) : Promise.resolve(null),
  ]);
  const checkedAt = new Date().toISOString();

  await Promise.all([
    shopifyRow && shopify
      ? persistLiveVerification(client, 'store_connections', merchantId, shopifyRow.id, shopifyRow.status, shopify, checkedAt)
      : Promise.resolve(),
    gorgiasRow && gorgias
      ? persistLiveVerification(client, 'helpdesk_connections', merchantId, gorgiasRow.id, gorgiasRow.status, gorgias, checkedAt)
      : Promise.resolve(),
    shipbobRow && shipbob
      ? persistLiveVerification(client, 'merchant_integrations', merchantId, shipbobRow.id, shipbobRow.status, shipbob, checkedAt)
      : Promise.resolve(),
    upsRow && ups
      ? persistLiveVerification(client, 'merchant_integrations', merchantId, upsRow.id, upsRow.status, ups, checkedAt)
      : Promise.resolve(),
    fedexRow && fedex
      ? persistLiveVerification(client, 'merchant_integrations', merchantId, fedexRow.id, fedexRow.status, fedex, checkedAt)
      : Promise.resolve(),
  ]);

  return { shopify, gorgias, shipbob, ups, fedex };
}
