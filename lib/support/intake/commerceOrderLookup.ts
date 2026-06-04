import { TABLES } from '@/lib/supabase/tables';

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

async function listShopifySignalOrdersForStore(
  supabase: ServiceClient,
  storeKey: string
): Promise<CommerceOrderMatch[]> {
  const { data, error } = await (supabase.from('shopify_order_signals') as {
    select: (columns: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select('shopify_order_id, order_number, customer_id, shop_domain')
    .eq('shop_domain', storeKey);

  if (error) throw new Error(`list_shopify_orders_failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    shopify_order_id: String(row.shopify_order_id),
    order_number: asString(row.order_number),
    customer_id: asString(row.customer_id),
    shop_domain: String(row.shop_domain),
    source: 'shopify_signal' as const,
  }));
}

async function findAuditOrdersByOrderIds(
  supabase: ServiceClient,
  merchantId: string,
  storeKey: string,
  orderIds: string[]
): Promise<CommerceOrderMatch[]> {
  if (orderIds.length === 0) return [];

  const { data, error } = await (supabase.from(TABLES.AUDIT_TRANSACTIONS) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          in: (col3: string, vals: string[]) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select('order_id, shop_domain')
    .eq('merchant_id', merchantId)
    .eq('shop_domain', storeKey)
    .in('order_id', orderIds);

  if (error) throw new Error(`list_audit_orders_failed: ${error.message}`);

  const seen = new Set<string>();
  const matches: CommerceOrderMatch[] = [];
  for (const row of data ?? []) {
    const orderId = asString(row.order_id);
    const shopDomain = asString(row.shop_domain) ?? storeKey;
    if (!orderId) continue;
    const key = `${shopDomain}:${orderId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      shopify_order_id: orderId,
      order_number: orderId,
      customer_id: null,
      shop_domain: shopDomain,
      source: 'audit_transaction',
    });
  }
  return matches;
}

export async function findCommerceOrdersForStoreByOrderRef(
  supabase: unknown,
  input: { merchantId: string; storeKey: string; orderRef: string }
): Promise<CommerceOrderMatch[]> {
  const client = supabase as ServiceClient;
  const [signalOrders, auditOrders] = await Promise.all([
    listShopifySignalOrdersForStore(client, input.storeKey),
    findAuditOrdersByOrderIds(
      client,
      input.merchantId,
      input.storeKey,
      buildOrderRefLookupCandidates(input.orderRef)
    ),
  ]);

  const signalMatches = matchShopifyOrdersByOrderRef(signalOrders, input.orderRef);
  const auditMatches = matchShopifyOrdersByOrderRef(auditOrders, input.orderRef);
  return mergeOrderMatches(signalMatches, auditMatches);
}

export async function findCommerceOrdersForStoreByOrderId(
  supabase: unknown,
  input: { merchantId: string; storeKey: string; orderId: string }
): Promise<CommerceOrderMatch[]> {
  const client = supabase as ServiceClient;
  const orderId = input.orderId.trim();
  if (!orderId) return [];

  const [signalOrders, auditOrders] = await Promise.all([
    listShopifySignalOrdersForStore(client, input.storeKey),
    findAuditOrdersByOrderIds(client, input.merchantId, input.storeKey, [orderId]),
  ]);

  const signalMatches = signalOrders.filter((o) => o.shopify_order_id === orderId);
  const auditMatches = auditOrders.filter((o) => o.shopify_order_id === orderId);
  return mergeOrderMatches(signalMatches, auditMatches);
}
