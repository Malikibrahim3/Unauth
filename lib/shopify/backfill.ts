import { normalizeAddress, normalizeEmail, normalizePhone, upsertMerchantIdentityRows, type MerchantIdentityInsert, type ShopifyAddress } from '@/lib/shopify/identity';

type ShopifyOrder = {
  id: number;
  email?: string | null;
  shipping_address?: ShopifyAddress | null;
  billing_address?: ShopifyAddress | null;
  created_at?: string | null;
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
): Promise<T[]> {
  const rows: T[] = [];
  let nextUrl: string | null = firstUrl;

  while (nextUrl) {
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

  return rows;
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
    `${base}/orders.json?status=any&limit=250&fields=id,email,shipping_address,billing_address,created_at&created_at_min=` +
    encodeURIComponent(createdAtMin);

  const orders = await fetchAllPages<ShopifyOrder>(ordersUrl, accessToken, 'orders');

  const now = new Date().toISOString();
  const rows: MerchantIdentityInsert[] = [
    ...orders.map((order) => ({
      shop_domain: shopDomain,
      source: 'order' as const,
      source_id: String(order.id),
      email: normalizeEmail(order.email),
      phone: null,
      shipping_address: normalizeAddress(order.shipping_address),
      billing_address: normalizeAddress(order.billing_address),
      customer_id: null,
      updated_at: now,
    })),
  ];

  if (!rows.length) return { orders: 0, inserted: 0 };

  await upsertMerchantIdentityRows(supabase, rows);

  return { orders: orders.length, inserted: rows.length };
}
