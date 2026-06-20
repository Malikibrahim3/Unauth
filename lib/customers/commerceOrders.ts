import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type CanonicalCommerceOrderStats = {
  orderCount: number;
  totalValue: number;
  source: 'shopify' | 'audit_transactions' | 'profile_totals' | 'none';
};

type SourceOrderRow = {
  external_id?: string | null;
  order_number?: string | number | null;
  total_price?: string | number | null;
};

function isCustomerVisibleOrder(row: SourceOrderRow): boolean {
  const orderNumber = row.order_number == null ? null : String(row.order_number).trim();
  return !orderNumber || /^\d+$/.test(orderNumber);
}

export function deriveCanonicalCommerceOrderStats(input: {
  shopifyOrderCount: number;
  shopifyTotalValue: number;
  auditTransactions: Array<{ order_id?: string | null; order_value?: string | number | null }>;
  profileTotalOrders?: number | null;
}): CanonicalCommerceOrderStats {
  if (input.shopifyOrderCount > 0) {
    return {
      orderCount: input.shopifyOrderCount,
      totalValue: input.shopifyTotalValue,
      source: 'shopify',
    };
  }

  const auditOrders = new Map<string, number>();
  for (const tx of input.auditTransactions) {
    const orderId = tx.order_id?.trim();
    if (!orderId || auditOrders.has(orderId)) continue;
    auditOrders.set(orderId, Number(tx.order_value ?? 0) || 0);
  }
  if (auditOrders.size > 0) {
    return {
      orderCount: auditOrders.size,
      totalValue: Array.from(auditOrders.values()).reduce((sum, value) => sum + value, 0),
      source: 'audit_transactions',
    };
  }

  const profileTotalOrders = Math.max(0, Number(input.profileTotalOrders ?? 0));
  if (profileTotalOrders > 0) {
    return {
      orderCount: profileTotalOrders,
      totalValue: 0,
      source: 'profile_totals',
    };
  }

  return { orderCount: 0, totalValue: 0, source: 'none' };
}

/**
 * Count the merchant's own Shopify orders for an identity.
 *
 * v2: a merchant's orders live in the merchant-scoped `source_orders` table.
 * The only first-class identity↔order linkage is `claims.identity_id` ->
 * `claims.source_order_id`, so we resolve the identity's linked Shopify orders
 * through the merchant's claims and read the order rows from `source_orders`.
 * (The legacy `merchant_shopify_connections` / `customer_profile_identities` /
 * `shopify_order_signals` tables were dropped in the v2 cutover.)
 */
export async function countShopifyCommerceOrdersForProfile(
  service: SupabaseClient,
  merchantId: string,
  profileId: string
): Promise<{ orderCount: number; totalValue: number }> {
  const { data: claimRows } = await service
    .from(TABLES.MERCHANT_CLAIMS)
    .select('source_order_id')
    .eq('merchant_id', merchantId)
    .eq('identity_id', profileId)
    .not('source_order_id', 'is', null);

  const sourceOrderIds = Array.from(
    new Set(
      ((claimRows ?? []) as Array<{ source_order_id: string | null }>)
        .flatMap((row) => (row.source_order_id ? [row.source_order_id] : [])),
    ),
  );
  if (sourceOrderIds.length === 0) return { orderCount: 0, totalValue: 0 };

  const { data: orderRows } = await service
    .from('source_orders')
    .select('external_id, order_number, total_price')
    .eq('merchant_id', merchantId)
    .eq('source', 'shopify')
    .in('id', sourceOrderIds);

  const orderKeys = new Set<string>();
  let totalValue = 0;
  for (const row of (orderRows ?? []) as SourceOrderRow[]) {
    if (!isCustomerVisibleOrder(row)) continue;
    const externalId = String(row.external_id ?? '').trim();
    if (!externalId || orderKeys.has(externalId)) continue;
    orderKeys.add(externalId);
    totalValue += Number(row.total_price ?? 0) || 0;
  }

  return { orderCount: orderKeys.size, totalValue };
}
