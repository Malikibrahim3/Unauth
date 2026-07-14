import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { upsertConnection } from '@/lib/connectors/connectionStore';

/**
 * Persist a Shopify OAuth connection into the v2 `store_connections` table.
 *
 * v2 stores a single row per (platform, store_key) with the access token
 * encrypted in `credentials_encrypted` (no more plaintext `shopify_merchants`).
 * The OAuth access-token encryption scheme is shared with other OAuth platforms
 * (see lib/commerce/credentialCrypto.ts).
 */
export async function persistShopifyOAuthConnection(
  serviceClient: SupabaseClient,
  params: {
    shop: string;
    accessToken: string;
    scope?: string | null;
    merchantId: string | null;
  },
): Promise<
  | { ok: true; merchantId: string }
  | { ok: false; error: 'missing_merchant' | 'connection_failed' | 'merchant_token_failed'; message?: string }
> {
  if (!params.merchantId) {
    // store_connections.merchant_id is NOT NULL, so we cannot persist credentials
    // without a resolved merchant in v2.
    return { ok: false, error: 'missing_merchant' };
  }

  const now = new Date().toISOString();
  let credentialsEncrypted: string;
  try {
    credentialsEncrypted = encryptBigCommerceOAuthCredentials({
      access_token: params.accessToken,
      scope: params.scope ?? null,
    });
  } catch (err) {
    return {
      ok: false,
      error: 'merchant_token_failed',
      message: err instanceof Error ? err.message : 'credential_encrypt_failed',
    };
  }
  const scopes = params.scope
    ? params.scope.split(',').map((scope) => scope.trim()).filter(Boolean)
    : [];

  const storeValues = {
    store_url: `https://${params.shop}`,
    status: 'active',
    credentials_encrypted: credentialsEncrypted,
    scopes,
    uninstalled_at: null,
    last_error: null,
    updated_at: now,
  };
  const { data: existingStore, error: lookupError } = await serviceClient
    .from('store_connections')
    .select('id,merchant_id')
    .eq('platform', 'shopify')
    .eq('store_key', params.shop)
    .limit(1)
    .maybeSingle();
  if (lookupError) {
    return { ok: false, error: 'connection_failed', message: lookupError.message };
  }
  if (existingStore && existingStore.merchant_id !== params.merchantId) {
    return { ok: false, error: 'connection_failed', message: 'provider_account_already_owned_by_another_merchant' };
  }
  const { error } = existingStore
    ? await serviceClient
        .from('store_connections')
        .update(storeValues)
        .eq('id', existingStore.id)
        .eq('merchant_id', params.merchantId)
    : await serviceClient.from('store_connections').insert({
        merchant_id: params.merchantId,
        platform: 'shopify',
        store_key: params.shop,
        ...storeValues,
      });

  if (error) {
    return { ok: false, error: 'connection_failed', message: error.message };
  }

  // Keep the source-agnostic Integration Centre row in sync with the
  // commerce-specific credential row. Without this mirror, a successful
  // Shopify OAuth flow can still appear disconnected in the main Integrations
  // view because that view reads merchant_integrations.
  try {
    const { connectionId } = await upsertConnection(serviceClient, {
      merchantId: params.merchantId,
      providerId: 'shopify',
      category: 'commerce',
      authMode: 'oauth',
      status: 'connected',
      providerAccountId: params.shop,
      providerAccountName: params.shop,
      providerBaseUrl: `https://${params.shop}`,
      displayName: params.shop,
      grantedScopes: scopes,
      connectorVersion: '2026-01',
      environment: 'production',
    });
    const { error: metadataError } = await serviceClient
      .from('merchant_integrations')
      .update({
        authentication_mode: 'oauth',
        connection_created_at: now,
        disconnected_at: null,
        last_error: null,
        last_error_code: null,
        last_error_message: null,
        last_error_at: null,
      })
      .eq('id', connectionId)
      .eq('merchant_id', params.merchantId);
    if (metadataError) throw metadataError;
  } catch (canonicalError) {
    return {
      ok: false,
      error: 'connection_failed',
      message: canonicalError instanceof Error ? canonicalError.message : 'canonical_connection_failed',
    };
  }

  return { ok: true, merchantId: params.merchantId };
}
