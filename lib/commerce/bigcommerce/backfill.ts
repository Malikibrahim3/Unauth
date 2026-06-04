import type { SupabaseClient } from '@supabase/supabase-js';
import { integrationBackfillSinceIso } from '@/lib/integrations/backfillWindow';
import { bigCommerceApiFetch } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import { processBigCommerceOrderWebhook } from '@/lib/commerce/bigcommerce/processOrderWebhook';

const PAGE_SIZE = 250;

export type BigCommerceOrderBackfillResult = {
  pages: number;
  orders: number;
};

export async function backfillBigCommerceOrders(input: {
  supabase: SupabaseClient;
  storeHash: string;
  accessToken: string;
}): Promise<BigCommerceOrderBackfillResult> {
  const since = integrationBackfillSinceIso();
  let page = 1;
  let pages = 0;
  let orders = 0;

  while (true) {
    const path =
      `/v2/orders?min_date_created=${encodeURIComponent(since)}` +
      `&limit=${PAGE_SIZE}&page=${page}`;
    const res = await bigCommerceApiFetch(input.storeHash, input.accessToken, path);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `bigcommerce_orders_list_failed (${res.status}): ${body.slice(0, 400)}`,
      );
    }

    const batch = (await res.json()) as Array<{ id?: number | string }>;
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    pages += 1;

    for (const summary of batch) {
      const orderId = summary.id;
      if (orderId === undefined || orderId === null) {
        continue;
      }
      orders += 1;
      await processBigCommerceOrderWebhook({
        supabase: input.supabase,
        storeHash: input.storeHash,
        webhookPayload: { data: { type: 'order', id: orderId } },
      });
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return { pages, orders };
}
