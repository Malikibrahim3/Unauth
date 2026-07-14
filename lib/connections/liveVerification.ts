import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';
import {
  decryptGorgiasApiCredentials,
} from '@/lib/support/gorgias/credentialCrypto';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  GorgiasSidebarRegistrationError,
} from '@/lib/support/gorgias/registerSidebarWidget';

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
  id: string;
  provider_base_url: string | null;
  access_token_encrypted: string | null;
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

  const { error } = await client.from(table).update(patch as never).eq('id', id);
  if (error) throw new Error(`persist_live_verification_failed: ${error.message}`);
}

export type MerchantLiveHealth = {
  shopify: LiveVerificationResult | null;
  gorgias: LiveVerificationResult | null;
};

/** Verify the legacy credential stores used by the live Shopify/Gorgias flows. */
export async function verifyMerchantLiveConnections(
  client: SupabaseClient,
  merchantId: string,
): Promise<MerchantLiveHealth> {
  const [stores, helpdesks] = await Promise.all([
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
  ]);

  const shopifyRow = (stores.data?.[0] ?? null) as ShopifyVerificationRow | null;
  const gorgiasRow = (helpdesks.data?.[0] ?? null) as GorgiasVerificationRow | null;
  const [shopify, gorgias] = await Promise.all([
    shopifyRow ? verifyShopifyConnection(shopifyRow) : Promise.resolve(null),
    gorgiasRow ? verifyGorgiasConnection(gorgiasRow) : Promise.resolve(null),
  ]);
  const checkedAt = new Date().toISOString();

  await Promise.all([
    shopifyRow && shopify
      ? persistLiveVerification(client, 'store_connections', shopifyRow.id, shopifyRow.status, shopify, checkedAt)
      : Promise.resolve(),
    gorgiasRow && gorgias
      ? persistLiveVerification(client, 'helpdesk_connections', gorgiasRow.id, gorgiasRow.status, gorgias, checkedAt)
      : Promise.resolve(),
  ]);

  return { shopify, gorgias };
}
