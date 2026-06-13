export type CommerceOrderMatch = {
  /** Commerce order id (stored on support_case.shopify_order_id). */
  shopify_order_id: string;
  order_number: string | null;
  customer_id: string | null;
  shop_domain: string;
  source: 'shopify_signal' | 'audit_transaction';
};

type ServiceClient = {
  from: (table: string) => Record<string, unknown>;
};

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function uniq(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

function normalizeNumericOrderRef(orderRef: string): string | null {
  const trimmed = orderRef.trim();
  const hashMatch = trimmed.match(/^#(\d+)$/);
  if (hashMatch?.[1]) return hashMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

export function matchShopifyOrdersByOrderRef(
  orders: CommerceOrderMatch[],
  orderRef: string
): CommerceOrderMatch[] {
  const trimmed = orderRef.trim();
  const numeric = normalizeNumericOrderRef(trimmed);

  return orders.filter((order) => {
    const orderNumber = order.order_number?.trim() ?? '';
    const shopifyOrderId = order.shopify_order_id.trim();
    if (shopifyOrderId === trimmed || orderNumber === trimmed) return true;
    if (numeric) {
      if (orderNumber === numeric || orderNumber === `#${numeric}`) return true;
      if (shopifyOrderId === numeric) return true;
    }
    return false;
  });
}

export function buildOrderRefLookupCandidates(orderRef: string): string[] {
  const trimmed = orderRef.trim();
  const numeric = normalizeNumericOrderRef(trimmed);
  return uniq([trimmed, numeric, numeric ? `#${numeric}` : null]);
}

function mergeOrderMatches(
  primary: CommerceOrderMatch[],
  secondary: CommerceOrderMatch[]
): CommerceOrderMatch[] {
  const byKey = new Map<string, CommerceOrderMatch>();
  for (const order of [...primary, ...secondary]) {
    const key = `${order.shop_domain}:${order.shopify_order_id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, order);
      continue;
    }
    byKey.set(key, {
      ...existing,
      order_number: existing.order_number ?? order.order_number,
      customer_id: existing.customer_id ?? order.customer_id,
      source: existing.source === 'shopify_signal' ? existing.source : order.source,
    });
  }
  return [...byKey.values()];
}

/**
 * v2: a merchant's Shopify orders live in the merchant-scoped `source_orders`
 * table (source='shopify'). The legacy `shopify_order_signals` and the separate
 * "audit_transactions" store both collapse into this single table, so we read
 * every connected-store Shopify order for the merchant and match in memory.
 * `storeKey` is the connected store domain, carried through to `shop_domain`.
 */
async function listShopifySourceOrdersForStore(
  supabase: ServiceClient,
  merchantId: string,
  storeKey: string
): Promise<CommerceOrderMatch[]> {
  const { data, error } = await (supabase.from('source_orders') as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select('external_id, order_number, source_customer_id')
    .eq('merchant_id', merchantId)
    .eq('source', 'shopify');

  if (error) throw new Error(`list_shopify_orders_failed: ${error.message}`);

  return (data ?? []).flatMap((row) => {
    const externalId = asString(row.external_id);
    if (!externalId) return [];
    return [{
      shopify_order_id: externalId,
      order_number: asString(row.order_number),
      customer_id: asString(row.source_customer_id),
      shop_domain: storeKey,
      source: 'shopify_signal' as const,
    }];
  });
}

export async function findCommerceOrdersForStoreByOrderRef(
  supabase: unknown,
  input: { merchantId: string; storeKey: string; orderRef: string }
): Promise<CommerceOrderMatch[]> {
  const client = supabase as ServiceClient;
  const orders = await listShopifySourceOrdersForStore(client, input.merchantId, input.storeKey);
  return mergeOrderMatches(matchShopifyOrdersByOrderRef(orders, input.orderRef), []);
}

export async function findCommerceOrdersForStoreByOrderId(
  supabase: unknown,
  input: { merchantId: string; storeKey: string; orderId: string }
): Promise<CommerceOrderMatch[]> {
  const client = supabase as ServiceClient;
  const orderId = input.orderId.trim();
  if (!orderId) return [];

  const orders = await listShopifySourceOrdersForStore(client, input.merchantId, input.storeKey);
  return mergeOrderMatches(orders.filter((o) => o.shopify_order_id === orderId), []);
}
