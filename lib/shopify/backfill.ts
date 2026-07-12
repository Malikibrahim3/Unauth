import { integrationBackfillSinceIso } from '@/lib/integrations/backfillWindow';
import { processShopifyOrderPayload } from '@/lib/shopify/ingest';
import { SHOPIFY_REST_API_VERSION } from '@/lib/shopify/apiVersion';

type ShopifyOrder = Record<string, any> & { id?: string | number | null };

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const [urlPart, relPart] = part.split(';').map((s) => s.trim());
    if (relPart === 'rel="next"') {
      return urlPart.replace(/^<|>$/g, '');
    }
  }
  return null;
}

function retryAfterMs(value: string | null): number | null {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RATE_LIMIT_RETRIES = 6;

async function fetchWithRateLimitRetry(url: string, accessToken: string): Promise<Response> {
  let res: Response;
  for (let attempt = 0; ; attempt += 1) {
    res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return res;
    await sleep(retryAfterMs(res.headers.get('retry-after')) ?? 2 ** attempt * 500);
  }
}

async function fetchAllPages<T>(
  firstUrl: string,
  accessToken: string,
  key: 'orders'
): Promise<{ rows: T[]; pages: number }> {
  const rows: T[] = [];
  let nextUrl: string | null = firstUrl;
  let pages = 0;

  while (nextUrl) {
    pages += 1;
    const res = await fetchWithRateLimitRetry(nextUrl, accessToken);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shopify ${key} fetch failed (${res.status}): ${body.slice(0, 400)}`);
    }

    const payload = (await res.json()) as Record<string, unknown>;
    const chunk = (payload[key] as T[] | undefined) ?? [];
    rows.push(...chunk);
    nextUrl = parseNextLink(res.headers.get('link'));
  }

  return { rows, pages };
}

export async function backfillShopifyMerchantIdentities(input: {
  shopDomain: string;
  accessToken: string;
  merchantId?: string;
  supabase: any;
}) {
  return backfillShopifyOrders(input);
}

export async function backfillShopifyOrders(input: {
  shopDomain: string;
  accessToken: string;
  merchantId?: string;
  supabase: any;
}) {
  const { shopDomain, accessToken, merchantId, supabase } = input;
  const createdAtMin = integrationBackfillSinceIso();
  const base = `https://${shopDomain}/admin/api/${SHOPIFY_REST_API_VERSION}`;
  const ordersUrl =
    `${base}/orders.json?status=any&limit=250&order=created_at%20asc&created_at_min=` +
    encodeURIComponent(createdAtMin);

  const { rows: orders, pages } = await fetchAllPages<ShopifyOrder>(ordersUrl, accessToken, 'orders');

  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  let ordersWithNoIdentityFields = 0;

  for (const order of orders) {
    if (order.id === undefined || order.id === null) {
      skipped += 1;
      continue;
    }

    const hasIdentity =
      Boolean(order.email ?? order.contact_email ?? order.customer?.email) ||
      Boolean(order.phone ?? order.customer?.phone) ||
      Boolean(order.shipping_address ?? order.customer?.default_address) ||
      Boolean(order.billing_address);
    if (!hasIdentity) ordersWithNoIdentityFields += 1;

    try {
      const result = await processShopifyOrderPayload({
        supabase,
        shopDomain,
        payload: order,
        rawBody: JSON.stringify(order),
        ingestEmbeddedResources: true,
      });
      if (result.ingested) ingested += 1;
      else skipped += 1;
    } catch (error) {
      errors += 1;
      console.error('Shopify historical order ingest failed', {
        shopDomain,
        orderId: String(order.id),
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  const now = new Date().toISOString();
  await supabase
    .from('store_connections')
    .update({
      last_sync_at: now,
      updated_at: now,
      last_error:
        errors > 0
          ? `shopify_backfill_partial: ${errors} order(s) failed`
          : null,
    })
    .eq('platform', 'shopify')
    .eq('store_key', shopDomain);

  if (merchantId) {
    await supabase
      .from('merchant_integrations')
      .update({
        status: errors > 0 ? 'degraded' : 'connected',
        imported_record_count: orders.length,
        last_sync_at: now,
        last_sync_completed_at: now,
        last_successful_sync_at: errors === 0 ? now : null,
        last_error: errors > 0 ? `shopify_backfill_partial: ${errors} order(s) failed` : null,
        last_error_code: errors > 0 ? 'shopify_backfill_partial' : null,
        last_error_message: errors > 0 ? `${errors} order(s) failed` : null,
        last_error_at: errors > 0 ? now : null,
        updated_at: now,
      })
      .eq('merchant_id', merchantId)
      .eq('provider_id', 'shopify')
      .eq('provider_account_id', shopDomain);
  }

  if (orders.length > 0 && ingested === 0 && errors > 0) {
    throw new Error(`shopify_backfill_failed: ${errors} order(s) failed`);
  }

  return {
    pages_fetched: pages,
    orders: orders.length,
    inserted: ingested,
    source_orders_upserted: ingested,
    skipped,
    errors,
    orders_with_no_identity_fields: ordersWithNoIdentityFields,
    signals_upserted: 0,
  };
}
