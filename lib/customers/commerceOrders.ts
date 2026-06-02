import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/supabase/tables';

export type CanonicalCommerceOrderStats = {
  orderCount: number;
  totalValue: number;
  source: 'shopify' | 'audit_transactions' | 'profile_totals' | 'none';
};

type ShopifyIdentityRow = {
  identity_type?: string | null;
  identity_value?: string | null;
};

type ShopifySignalRow = {
  shop_domain?: string | null;
  shopify_order_id?: string | number | null;
  order_number?: string | number | null;
  total_price?: string | number | null;
};

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function isCustomerVisibleShopifyOrder(row: ShopifySignalRow): boolean {
  const orderNumber = row.order_number == null ? null : String(row.order_number).trim();
  return !orderNumber || /^\d+$/.test(orderNumber);
}

function addSignalRows(
  orderKeys: Set<string>,
  rows: ShopifySignalRow[] | null | undefined
): number {
  let totalValue = 0;
  for (const row of rows ?? []) {
    if (!isCustomerVisibleShopifyOrder(row) || row.shopify_order_id == null) continue;
    const shopDomain = String(row.shop_domain ?? '').trim();
    const orderId = String(row.shopify_order_id).trim();
    if (!shopDomain || !orderId) continue;
    const key = `${shopDomain}:${orderId}`;
    if (orderKeys.has(key)) continue;
    orderKeys.add(key);
    totalValue += Number(row.total_price ?? 0) || 0;
  }
  return totalValue;
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

export async function countShopifyCommerceOrdersForProfile(
  service: SupabaseClient,
  merchantId: string,
  profileId: string
): Promise<{ orderCount: number; totalValue: number }> {
  const { data: connections } = await service
    .from('merchant_shopify_connections' as never)
    .select('shop_domain')
    .eq('merchant_id', merchantId)
    .eq('active', true);

  const shopDomains = uniqueNonEmpty(
    ((connections ?? []) as Array<{ shop_domain?: string | null }>).map((row) => row.shop_domain)
  );
  if (shopDomains.length === 0) return { orderCount: 0, totalValue: 0 };

  const { data: identityRows } = await service
    .from(TABLES.CUSTOMER_PROFILE_IDENTITIES)
    .select('identity_type, identity_value')
    .eq('merchant_id', merchantId)
    .eq('customer_profile_id', profileId)
    .in('identity_type', ['shopify_order_id', 'shopify_customer_id']);

  const identities = (identityRows ?? []) as ShopifyIdentityRow[];
  const orderIds = uniqueNonEmpty(
    identities.flatMap((row) =>
      row.identity_type === 'shopify_order_id' ? [row.identity_value] : [],
    ),
  );
  const customerIds = uniqueNonEmpty(
    identities.flatMap((row) =>
      row.identity_type === 'shopify_customer_id' ? [row.identity_value] : [],
    ),
  );

  const orderKeys = new Set<string>();
  let totalValue = 0;

  const shopTotals = await Promise.all(
    shopDomains.map(async (shopDomain) => {
      let shopValue = 0;
      if (orderIds.length > 0) {
        const { data: byOrderId } = await service
          .from('shopify_order_signals' as never)
          .select('shop_domain, shopify_order_id, order_number, total_price')
          .eq('shop_domain', shopDomain)
          .in('shopify_order_id', orderIds);
        shopValue += addSignalRows(orderKeys, byOrderId as ShopifySignalRow[] | null);
      }

      if (customerIds.length > 0) {
        const { data: byCustomerId } = await service
          .from('shopify_order_signals' as never)
          .select('shop_domain, shopify_order_id, order_number, total_price')
          .eq('shop_domain', shopDomain)
          .in('customer_id', customerIds);
        shopValue += addSignalRows(orderKeys, byCustomerId as ShopifySignalRow[] | null);
      }
      return shopValue;
    })
  );
  totalValue += shopTotals.reduce((sum, value) => sum + value, 0);

  return { orderCount: orderKeys.size, totalValue };
}
