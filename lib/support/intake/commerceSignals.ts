/**
 * Extracts order-level and identity signals from a raw helpdesk ticket payload
 * (primarily the Gorgias + Shopify integration shape). Pure functions only.
 *
 * Identity values are returned RAW here; hashing happens in the store layer
 * (upsertCustomerIdentitySignals) so the PII-hashing policy stays centralised.
 */
import { diffDays } from '@/lib/support/intake/store';

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return null;
}

function readPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** First order-like object found across the conventional integration paths. */
function resolveOrder(ticket: Record<string, unknown>): Record<string, unknown> | null {
  const candidates = [
    readPath(ticket, ['integrations', 'shopify', 'order']),
    readPath(ticket, ['shopify', 'order']),
    ticket.order,
    readPath(ticket, ['meta', 'order']),
  ];
  for (const candidate of candidates) {
    const obj = asObject(candidate);
    if (obj) return obj;
  }
  return null;
}

function resolveCustomer(
  ticket: Record<string, unknown>,
  order: Record<string, unknown> | null
): Record<string, unknown> | null {
  const ticketCustomer = asObject(ticket.customer);
  const orderCustomer = asObject(order?.customer);
  if (ticketCustomer && orderCustomer) {
    // Ticket-level fields win; order-level customer fields (e.g. orders_count) fill gaps.
    return { ...orderCustomer, ...ticketCustomer };
  }
  return ticketCustomer ?? orderCustomer ?? null;
}

/** Flatten a Shopify-style address object into a normalisable string. */
function addressToString(addr: unknown): string | null {
  const obj = asObject(addr);
  if (!obj) return asString(addr);
  const parts = [
    obj.address1,
    obj.address2,
    obj.city,
    obj.province ?? obj.state,
    obj.zip ?? obj.postal_code,
    obj.country,
  ]
    .map((p) => asString(p))
    .filter((p): p is string => !!p);
  return parts.length ? parts.join(' ') : null;
}

export type ExtractedOrderContext = {
  order_ref: string | null;
  order_value: number | null;
  order_created_at: string | null;
  fulfillment_status_at_claim: string | null;
  delivery_status_at_claim: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  days_since_order_at_claim: number | null;
  days_since_delivery_at_claim: number | null;
  payment_method: string | null;
  discount_code_used: boolean | null;
  discount_amount: number | null;
  is_first_order: boolean | null;
  shipping_equals_billing: boolean | null;
  was_refunded_previously: boolean | null;
  refund_amount_requested: number | null;
  refund_amount_approved: number | null;
  partial_refund: boolean | null;
};

export type ExtractedIdentitySignals = {
  phone: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  ip_address: string | null;
  device_fingerprint: string | null;
  customer_account_type: 'guest' | 'registered' | null;
  account_created_at: string | null;
};

export type ExtractedCommerceSignals = {
  claimed_at: string | null;
  order: ExtractedOrderContext;
  identity: ExtractedIdentitySignals;
};

export function resolveClaimedAt(ticket: Record<string, unknown>): string | null {
  return (
    asString(ticket.created_datetime) ??
    asString(ticket.created_at) ??
    asString(ticket.updated_datetime) ??
    asString(ticket.updated_at)
  );
}

export function extractCommerceSignals(rawTicket: unknown): ExtractedCommerceSignals {
  const ticket = asObject(rawTicket) ?? {};
  const order = resolveOrder(ticket);
  const customer = resolveCustomer(ticket, order);
  const claimedAt = resolveClaimedAt(ticket);

  const fulfillment = asObject(order?.fulfillment) ?? asObject(readPath(order ?? {}, ['fulfillments', '0']));
  const orderCreatedAt = asString(order?.created_at ?? order?.order_created_at);
  const deliveredAt = asString(
    order?.delivered_at ?? readPath(order ?? {}, ['delivery', 'delivered_at']) ?? fulfillment?.delivered_at
  );

  const shippingAddress = order?.shipping_address ?? customer?.shipping_address ?? customer?.address;
  const billingAddress = order?.billing_address ?? customer?.billing_address;

  const explicitShipEqualsBilling = asBoolean(order?.shipping_equals_billing);
  const shippingStr = addressToString(shippingAddress);
  const billingStr = addressToString(billingAddress);
  const shippingEqualsBilling =
    explicitShipEqualsBilling ??
    (shippingStr && billingStr ? shippingStr.toLowerCase() === billingStr.toLowerCase() : null);

  const ordersCount = asNumber(customer?.orders_count);
  const isFirstOrder =
    asBoolean(order?.is_first_order) ?? (ordersCount != null ? ordersCount <= 1 : null);

  const discountCodes = order?.discount_codes;
  const discountCodeUsed =
    asBoolean(order?.discount_code_used) ??
    (Array.isArray(discountCodes) ? discountCodes.length > 0 : null);

  const refunds = order?.refunds;
  const wasRefundedPreviously =
    asBoolean(order?.was_refunded_previously) ??
    (Array.isArray(refunds) ? refunds.length > 0 : null);

  const accountType =
    (asString(customer?.account_type)?.toLowerCase() as 'guest' | 'registered' | undefined) ??
    (customer ? (asString(customer.id) ? 'registered' : 'guest') : null);

  return {
    claimed_at: claimedAt,
    order: {
      order_ref: asString(order?.name ?? order?.order_number ?? order?.id),
      order_value: asNumber(order?.total_price ?? order?.total ?? order?.value),
      order_created_at: orderCreatedAt,
      fulfillment_status_at_claim: asString(order?.fulfillment_status ?? fulfillment?.status),
      delivery_status_at_claim: asString(
        order?.delivery_status ?? order?.shipment_status ?? fulfillment?.shipment_status
      ),
      shipping_carrier: asString(
        order?.shipping_carrier ?? order?.carrier ?? fulfillment?.tracking_company
      ),
      tracking_number: asString(order?.tracking_number ?? fulfillment?.tracking_number),
      days_since_order_at_claim: diffDays(orderCreatedAt, claimedAt),
      days_since_delivery_at_claim: diffDays(deliveredAt, claimedAt),
      payment_method: asString(order?.payment_method),
      discount_code_used: discountCodeUsed,
      discount_amount: asNumber(order?.total_discounts ?? order?.discount_amount),
      is_first_order: isFirstOrder,
      shipping_equals_billing: shippingEqualsBilling,
      was_refunded_previously: wasRefundedPreviously,
      refund_amount_requested: asNumber(
        ticket.refund_amount_requested ?? order?.refund_amount_requested
      ),
      refund_amount_approved: asNumber(order?.refund_amount_approved),
      partial_refund: asBoolean(order?.partial_refund),
    },
    identity: {
      phone: asString(customer?.phone ?? order?.phone ?? readPath(shippingAddress, ['phone'])),
      shipping_address: shippingStr,
      billing_address: billingStr,
      ip_address: asString(
        order?.browser_ip ?? readPath(ticket, ['meta', 'ip']) ?? ticket.client_ip ?? readPath(ticket, ['meta', 'ip_address'])
      ),
      device_fingerprint: asString(
        readPath(ticket, ['meta', 'device_fingerprint']) ??
          readPath(ticket, ['integrations', 'device_fingerprint'])
      ),
      customer_account_type: accountType ?? null,
      account_created_at: asString(customer?.created_at ?? customer?.account_created_at),
    },
  };
}

/** Count of orders the customer has at this merchant, if exposed by the payload. */
export function extractOrdersAtMerchant(rawTicket: unknown): number | null {
  const ticket = asObject(rawTicket) ?? {};
  const order = resolveOrder(ticket);
  const customer = resolveCustomer(ticket, order);
  return asNumber(customer?.orders_count);
}
