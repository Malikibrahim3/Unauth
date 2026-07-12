import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';

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

  const { error } = await serviceClient
    .from('store_connections')
    .upsert(
      {
        merchant_id: params.merchantId,
        platform: 'shopify',
        store_key: params.shop,
        store_url: `https://${params.shop}`,
        status: 'active',
        credentials_encrypted: credentialsEncrypted,
        scopes,
        uninstalled_at: null,
        last_error: null,
        updated_at: now,
      },
      { onConflict: 'platform,store_key' },
    );

  if (error) {
    return { ok: false, error: 'connection_failed', message: error.message };
  }

  // Keep the source-agnostic Integration Centre row in sync with the
  // commerce-specific credential row. Without this mirror, a successful
  // Shopify OAuth flow can still appear disconnected in the main Integrations
  // view because that view reads merchant_integrations.
  const { error: canonicalError } = await serviceClient
    .from('merchant_integrations')
    .upsert(
      {
        merchant_id: params.merchantId,
        provider_id: 'shopify',
        category: 'commerce',
        auth_mode: 'oauth',
        authentication_mode: 'oauth',
        status: 'connected',
        provider_account_id: params.shop,
        provider_account_name: params.shop,
        provider_base_url: `https://${params.shop}`,
        display_name: params.shop,
        granted_scopes: scopes,
        connector_version: '2026-01',
        connection_created_at: now,
        disconnected_at: null,
        last_error: null,
        last_error_code: null,
        last_error_message: null,
        last_error_at: null,
        updated_at: now,
      },
      { onConflict: 'merchant_id,provider_id,provider_account_id' },
    );

  if (canonicalError) {
    return { ok: false, error: 'connection_failed', message: canonicalError.message };
  }

  return { ok: true, merchantId: params.merchantId };
}
