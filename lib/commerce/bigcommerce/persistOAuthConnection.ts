import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { upsertCommerceStoreConnection } from '@/lib/commerce/connectionStore';
import { bigCommerceApiBaseUrl } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';

export async function persistBigCommerceOAuthConnection(
  serviceClient: SupabaseClient,
  params: {
    storeHash: string;
    accessToken: string;
    scope: string | null;
    merchantId: string | null;
  },
): Promise<
  | { ok: true; merchantId: string; connectionId: string }
  | { ok: false; error: 'missing_merchant' | 'connection_failed'; message?: string }
> {
  if (!params.merchantId) {
    return { ok: false, error: 'missing_merchant' };
  }

  try {
    const credentialsEncrypted = encryptBigCommerceOAuthCredentials({
      access_token: params.accessToken,
      scope: params.scope,
    });

    const row = await upsertCommerceStoreConnection(serviceClient, {
      merchant_id: params.merchantId,
      platform: 'bigcommerce',
      store_key: params.storeHash,
      store_url: bigCommerceApiBaseUrl(params.storeHash),
      status: 'active',
      credentials_encrypted: credentialsEncrypted,
      last_error: null,
      uninstalled_at: null,
    });

    return {
      ok: true,
      merchantId: params.merchantId,
      connectionId: row.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return { ok: false, error: 'connection_failed', message };
  }
}
