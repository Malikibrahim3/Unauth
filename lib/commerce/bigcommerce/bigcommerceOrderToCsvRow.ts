/**
 * Maps a BigCommerce v2 order into the CSV row shape for processCsvJob.
 */

export type BigCommerceAddress = {
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

export type BigCommerceOrderPayload = {
  id?: number | string;
  date_created?: string | null;
  total_inc_tax?: string | number | null;
  total_ex_tax?: string | number | null;
  currency_code?: string | null;
  status?: string | null;
  status_id?: number | null;
  payment_method?: string | null;
  customer_id?: number | null;
  billing_address?: BigCommerceAddress | null;
  shipping_addresses?: BigCommerceAddress[] | null;
  refunded_amount?: string | number | null;
};

export type BigCommerceOrderIdentity = {
  email?: string | null;
  phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  customer_id?: string | null;
};

function formatAddress(address: BigCommerceAddress | null | undefined): string {
  if (!address) return '';
  return [
    address.street_1,
    address.street_2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function mapBcStatusToOrderStatus(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('refund')) return 'refunded';
  if (s.includes('pending') || s.includes('awaiting')) return 'pending';
  if (s.includes('shipped') || s.includes('completed')) return 'completed';
  return 'completed';
}

function mapRefundStatus(
  status: string | null | undefined,
  refundedAmount: string | number | null | undefined,
): string {
  const s = (status ?? '').toLowerCase();
  if (s.includes('refund')) return 'full';
  const amount = Number(refundedAmount);
  if (Number.isFinite(amount) && amount > 0) return 'partial';
  return 'none';
}

export function bigcommerceOrderToCsvRow(
  order: BigCommerceOrderPayload,
  identity: BigCommerceOrderIdentity | null,
): Record<string, string | undefined> | null {
  const email =
    identity?.email?.trim() ||
    order.billing_address?.email?.trim() ||
    '';
  if (!email) return null;

  const orderId = order.id !== undefined && order.id !== null ? String(order.id) : '';
  if (!orderId) return null;

  const orderDate = order.date_created?.trim();
  if (!orderDate) return null;

  const totalRaw = order.total_inc_tax ?? order.total_ex_tax ?? '0';
  const total = String(totalRaw);

  const billingAddress =
    identity?.billing_address?.trim() || formatAddress(order.billing_address);
  const shipping =
    order.shipping_addresses?.[0] ?? null;
  const shippingAddress = identity?.shipping_address?.trim() || formatAddress(shipping);

  const customerName = [
    order.billing_address?.first_name,
    order.billing_address?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    order_id: orderId,
    order_date: orderDate,
    customer_email: email,
    customer_name: customerName || undefined,
    shipping_address: shippingAddress || undefined,
    billing_address: billingAddress || undefined,
    order_total: total,
    currency: order.currency_code?.trim() || 'USD',
    order_status: mapBcStatusToOrderStatus(order.status),
    customer_phone:
      identity?.phone?.trim() || order.billing_address?.phone?.trim() || undefined,
    refund_status: mapRefundStatus(order.status, order.refunded_amount),
    delivery_status: 'unknown',
    payment_method: order.payment_method?.trim() || undefined,
    account_id:
      identity?.customer_id?.trim() ||
      (order.customer_id ? String(order.customer_id) : undefined),
  };
}
