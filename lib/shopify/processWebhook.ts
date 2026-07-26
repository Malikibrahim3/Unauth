import { processShopifyWebhook } from '@/lib/shopify/ingest';
import type { createServiceClient } from '@/lib/supabase/server';

export async function processWebhook(
  rawBody: string,
  shopDomain: string,
  topic: string,
  supabaseClient?: ReturnType<typeof createServiceClient>,
) {
  return processShopifyWebhook({
    rawBody,
    shopDomain,
    topic,
    supabaseClient,
  });
}
