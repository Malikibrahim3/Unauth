import { normalizeAddress, normalizeEmail, normalizePhone, upsertMerchantIdentityRows, type MerchantIdentityInsert, type ShopifyAddress } from '@/lib/shopify/identity';
import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';
import { buildShopifyOrderSignalRow, type ShopifyOrderWebhookPayload } from '@/lib/shopify/orderSignals';

type ShopifyOrder = ShopifyOrderWebhookPayload & {
  shipping_address?: ShopifyAddress | null;
  billing_address?: ShopifyAddress | null;
};

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
    const res = await fetch(nextUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

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
  supabase: any;
}) {
  const { shopDomain, accessToken, supabase } = input;
  const since = new Date();
  since.setMonth(since.getMonth() - 24);
  const createdAtMin = since.toISOString();
  const apiVersion = '2025-10';

  const base = `https://${shopDomain}/admin/api/${apiVersion}`;
  const ordersUrl =
    `${base}/orders.json?status=any&limit=250&created_at_min=` + encodeURIComponent(createdAtMin);

  const { rows: orders, pages } = await fetchAllPages<ShopifyOrder>(ordersUrl, accessToken, 'orders');

  const now = new Date().toISOString();
  const rows: MerchantIdentityInsert[] = orders.map((order) => ({
      shop_domain: shopDomain,
      source: 'order' as const,
      source_id: String(order.id),
      email: normalizeEmail(order.email),
      phone: null,
      shipping_address: normalizeAddress(order.shipping_address),
      billing_address: normalizeAddress(order.billing_address),
      customer_id: null,
      updated_at: now,
  }));

  if (!rows.length) return { orders: 0, inserted: 0 };

  const ordersWithNoIdentitySignals = rows.filter(
    (row) => !row.email && !row.shipping_address && !row.billing_address
  ).length;

  await upsertMerchantIdentityRows(supabase, rows);

  const signalRows = orders.map((order) => buildShopifyOrderSignalRow(shopDomain, order));
  const signalBatchSize = 250;
  const signalBatches = Array.from({ length: Math.ceil(signalRows.length / signalBatchSize) }, (_, i) =>
    signalRows.slice(i * signalBatchSize, i * signalBatchSize + signalBatchSize)
  );
  await Promise.all(
    signalBatches.map(async (batch) => {
      const { error: signalError } = await supabase
        .from('shopify_order_signals' as never)
        .upsert(batch as never, { onConflict: 'shop_domain,shopify_order_id' });
      if (signalError) {
        throw new Error(`shopify_order_signals_backfill_failed: ${signalError.message}`);
      }
    })
  );

  await syncShopifyProfilesForShop({ shopDomain, supabase });

  return {
    pages_fetched: pages,
    orders: orders.length,
    inserted: rows.length,
    orders_with_no_identity_fields: ordersWithNoIdentitySignals,
    signals_upserted: signalRows.length,
  };
}
