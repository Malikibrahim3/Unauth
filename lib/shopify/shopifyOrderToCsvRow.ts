/**
 * Maps Shopify order signal + identity rows into the CSV row shape consumed by
 * the fraud pipeline (validate → normalise → score → audit_transactions).
 */

export type ShopifyOrderSignalRow = {
  shop_domain: string;
  shopify_order_id: string;
  order_number?: string | null;
  created_at_shopify?: string | null;
  total_price?: number | string | null;
  currency?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  refunds_count?: number | null;
  payment_gateway_names?: unknown;
  shipping_country?: string | null;
  risk_level?: string | null;
};

export type ShopifyOrderIdentityRow = {
  email?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  customer_id?: string | null;
};

function paymentGatewaysToMethod(gateways: unknown): string | undefined {
  if (!Array.isArray(gateways) || gateways.length === 0) return undefined;
  return gateways
    .flatMap((g) => {
      const v = typeof g === 'string' ? g.trim() : '';
      return v ? [v] : [];
    })
    .join(', ');
}

function mapFinancialToOrderStatus(
  financialStatus: string | null | undefined,
  cancelledAt: string | null | undefined
): string {
  if (cancelledAt) return 'cancelled';
  const s = (financialStatus ?? '').toLowerCase();
  if (s === 'refunded' || s === 'partially_refunded') return 'refunded';
  if (s === 'voided') return 'cancelled';
  if (s === 'pending') return 'pending';
  return 'completed';
}

function mapRefundStatus(
  financialStatus: string | null | undefined,
  refundsCount: number | null | undefined
): string {
  const s = (financialStatus ?? '').toLowerCase();
  if (s === 'refunded') return 'full';
  if (s === 'partially_refunded') return 'partial';
  if ((refundsCount ?? 0) > 0) return 'partial';
  return 'none';
}

function mapFulfillmentToDelivery(fulfillmentStatus: string | null | undefined): string {
  const s = (fulfillmentStatus ?? '').toLowerCase();
  if (s === 'fulfilled') return 'delivered';
  if (s === 'partial') return 'in_transit';
  if (s === 'unfulfilled' || s === '') return 'pending';
  return 'unknown';
}

/**
 * Build a CSV-shaped row for the scoring pipeline. Returns null when required
 * fields are missing (no email → cannot score into audit_transactions).
 */
export function shopifyOrderToCsvRow(
  signal: ShopifyOrderSignalRow,
  identity: ShopifyOrderIdentityRow | null
): Record<string, string | undefined> | null {
  const email = identity?.email?.trim() ?? '';
  if (!email) return null;

  const orderDate = signal.created_at_shopify?.trim();
  if (!orderDate) return null;

  const total =
    signal.total_price === null || signal.total_price === undefined
      ? '0'
      : String(signal.total_price);

  const shippingAddress =
    identity?.shipping_address?.trim() ||
    (signal.shipping_country ? `Country: ${signal.shipping_country}` : '');

  return {
    order_id: signal.shopify_order_id,
    order_date: orderDate,
    customer_email: email,
    customer_name: '',
    shipping_address: shippingAddress || undefined,
    billing_address: identity?.billing_address?.trim() || undefined,
    order_total: total,
    currency: signal.currency?.trim() || 'USD',
    order_status: mapFinancialToOrderStatus(signal.financial_status, signal.cancelled_at),
    customer_phone: identity?.phone?.trim() || undefined,
    refund_status: mapRefundStatus(signal.financial_status, signal.refunds_count ?? 0),
    delivery_status: mapFulfillmentToDelivery(signal.fulfillment_status),
    payment_method: paymentGatewaysToMethod(signal.payment_gateway_names),
    account_id: identity?.customer_id?.trim() || undefined,
  };
}
