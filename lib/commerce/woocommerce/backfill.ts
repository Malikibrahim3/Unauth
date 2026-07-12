import type { SupabaseClient } from '@supabase/supabase-js';
import { integrationBackfillSinceIso } from '@/lib/integrations/backfillWindow';
import type { WooCommerceRestCredentials } from '@/lib/commerce/credentialCrypto';
import { wooCommerceApiFetch } from '@/lib/commerce/woocommerce/woocommerceApi';
import { processWooCommerceOrderWebhook } from '@/lib/commerce/woocommerce/processOrderWebhook';
import type { WooCommerceOrderPayload } from '@/lib/commerce/woocommerce/orderTypes';

const PAGE_SIZE = 100;

export type WooCommerceOrderBackfillResult = {
  pages: number;
  orders: number;
};

export async function backfillWooCommerceOrders(input: {
  supabase: SupabaseClient;
  storeUrl: string;
  storeKey: string;
  credentials: WooCommerceRestCredentials;
}): Promise<WooCommerceOrderBackfillResult> {
  const since = integrationBackfillSinceIso();
  let page = 1;
  let pages = 0;
  let orders = 0;

  while (true) {
    const path =
      `/wp-json/wc/v3/orders?after=${encodeURIComponent(since)}` +
      `&per_page=${PAGE_SIZE}&page=${page}&orderby=date&order=asc`;
    const res = await wooCommerceApiFetch(input.storeUrl, input.credentials, path);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `woocommerce_orders_list_failed (${res.status}): ${body.slice(0, 400)}`,
      );
    }

    const batch = (await res.json()) as WooCommerceOrderPayload[];
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    pages += 1;

    for (const order of batch) {
      orders += 1;
      await processWooCommerceOrderWebhook({
        supabase: input.supabase,
        storeKey: input.storeKey,
        payload: order,
      });
    }

    const totalPages = Number.parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10);
    if (!Number.isFinite(totalPages) || page >= totalPages) {
      break;
    }
    page += 1;
  }

  return { pages, orders };
}
