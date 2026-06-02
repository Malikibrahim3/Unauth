import type { SupabaseClient } from '@supabase/supabase-js';

export async function persistShopifyOAuthConnection(
  serviceClient: SupabaseClient,
  params: {
    shop: string;
    accessToken: string;
    merchantId: string | null;
  },
): Promise<
  | { ok: true; merchantId: string }
  | { ok: false; error: 'missing_merchant' | 'connection_failed' | 'merchant_token_failed'; message?: string }
> {
  const now = new Date().toISOString();
  const { error: merchantTokenError } = await serviceClient
    .from('shopify_merchants' as never)
    .upsert(
      {
        shop_domain: params.shop,
        access_token: params.accessToken,
        uninstalled_at: null,
        updated_at: now,
      },
      { onConflict: 'shop_domain' },
    );

  if (merchantTokenError) {
    return { ok: false, error: 'merchant_token_failed', message: merchantTokenError.message };
  }

  if (!params.merchantId) {
    return { ok: false, error: 'missing_merchant' };
  }

  const { error: mappingError } = await serviceClient
    .from('merchant_shopify_connections' as never)
    .upsert(
      {
        merchant_id: params.merchantId,
        shop_domain: params.shop,
        active: true,
        uninstalled_at: null,
        updated_at: now,
      },
      { onConflict: 'merchant_id,shop_domain' },
    );

  if (mappingError) {
    return { ok: false, error: 'connection_failed', message: mappingError.message };
  }

  return { ok: true, merchantId: params.merchantId };
}
