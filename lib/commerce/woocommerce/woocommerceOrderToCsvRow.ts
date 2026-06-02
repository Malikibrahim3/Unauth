/**
 * Maps a WooCommerce REST order payload into the CSV row shape for processCsvJob.
 */

export type WooCommerceOrderPayload = {
  id?: number | string;
  number?: string | null;
  date_created?: string | null;
  total?: string | null;
  currency?: string | null;
  status?: string | null;
  billing?: {
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  shipping?: {
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  payment_method?: string | null;
  payment_method_title?: string | null;
  customer_id?: number | null;
  refunds?: Array<{ id?: number | string }> | null;
};

export type WooCommerceOrderIdentity = {
  email?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  customer_id?: string | null;
};

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function mapWcStatusToOrderStatus(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'cancelled' || s === 'trash') return 'cancelled';
  if (s === 'refunded') return 'refunded';
  if (s === 'failed') return 'cancelled';
  if (s === 'pending' || s === 'on-hold') return 'pending';
  return 'completed';
}

function mapRefundStatus(
  status: string | null | undefined,
  refunds: WooCommerceOrderPayload['refunds'],
): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'refunded') return 'full';
  if (Array.isArray(refunds) && refunds.length > 0) return 'partial';
  return 'none';
}

export function woocommerceOrderToCsvRow(
  order: WooCommerceOrderPayload,
  identity: WooCommerceOrderIdentity | null,
): Record<string, string | undefined> | null {
  const email =
    identity?.email?.trim() ||
    order.billing?.email?.trim() ||
    '';
  if (!email) return null;

  const orderId = order.id !== undefined && order.id !== null ? String(order.id) : '';
  if (!orderId) return null;

  const orderDate = order.date_created?.trim();
  if (!orderDate) return null;

  const billingAddress =
    identity?.billing_address?.trim() ||
    formatAddress([
      order.billing?.address_1,
      order.billing?.address_2,
      order.billing?.city,
      order.billing?.state,
      order.billing?.postcode,
      order.billing?.country,
    ]);

  const shippingAddress =
    identity?.shipping_address?.trim() ||
    formatAddress([
      order.shipping?.address_1,
      order.shipping?.address_2,
      order.shipping?.city,
      order.shipping?.state,
      order.shipping?.postcode,
      order.shipping?.country,
    ]);

  const paymentMethod =
    order.payment_method_title?.trim() || order.payment_method?.trim() || undefined;

  return {
    order_id: orderId,
    order_date: orderDate,
    customer_email: email,
    customer_name: formatAddress([
      order.billing?.first_name,
      order.billing?.last_name,
    ]) || undefined,
    shipping_address: shippingAddress || undefined,
    billing_address: billingAddress || undefined,
    order_total: order.total?.trim() || '0',
    currency: order.currency?.trim() || 'USD',
    order_status: mapWcStatusToOrderStatus(order.status),
    customer_phone: identity?.phone?.trim() || order.billing?.phone?.trim() || undefined,
    refund_status: mapRefundStatus(order.status, order.refunds),
    delivery_status: 'unknown',
    payment_method: paymentMethod,
    account_id:
      identity?.customer_id?.trim() ||
      (order.customer_id ? String(order.customer_id) : undefined),
  };
}
