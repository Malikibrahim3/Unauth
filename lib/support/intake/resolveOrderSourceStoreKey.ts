import type { SupabaseClient } from '@supabase/supabase-js';

import { getOrderSourceConnectionStatus } from '@/lib/commerce/connectionStatus';

/**
 * Store key for the merchant's active order source (Shopify domain, WooCommerce site URL, etc.).
 * Used when helpdesk ingest does not pass an explicit shop domain.
 */
export async function resolveOrderSourceStoreKeyForMerchant(
  serviceClient: SupabaseClient,
  merchantId: string
): Promise<string | undefined> {
  try {
    const status = await getOrderSourceConnectionStatus(serviceClient, merchantId);
    const storeKey = status.storeKey?.trim();
    return storeKey || undefined;
  } catch (error) {
    console.warn('resolveOrderSourceStoreKeyForMerchant failed', {
      merchantId,
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
