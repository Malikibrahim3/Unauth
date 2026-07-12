/**
 * Canonical status vocabularies + helpers.
 *
 * The existing DB enums (order_financial_status, fulfillment_state) ARE the
 * canonical commerce vocabulary — do not rename them. Provider-native strings
 * are preserved separately as `source_status`; this module maps them to the
 * canonical vocab and exposes semantic helpers so call sites compare through a
 * function instead of hardcoding enum literals (which produced the latent
 * `'completed'` fulfilment bug — 'completed' is NOT a valid fulfillment_state).
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §3 / §21.4.
 */

export const ORDER_FINANCIAL_STATUSES = [
  'pending', 'authorized', 'paid', 'partially_paid', 'partially_refunded',
  'refunded', 'voided', 'cancelled', 'unknown',
] as const;
export type OrderFinancialStatus = (typeof ORDER_FINANCIAL_STATUSES)[number];

export const FULFILLMENT_STATES = [
  'unfulfilled', 'partial', 'fulfilled', 'delivered', 'in_transit',
  'failure', 'returned', 'unknown',
] as const;
export type FulfillmentState = (typeof FULFILLMENT_STATES)[number];

export const SHIPMENT_STATUSES = [
  'pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception',
  'returned', 'unknown',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// ── Semantic helpers (use these, never inline literal comparisons) ──

export function isRefundedFinancialStatus(status: string | null | undefined): boolean {
  return status === 'refunded' || status === 'partially_refunded';
}

export function isPaidFinancialStatus(status: string | null | undefined): boolean {
  return status === 'paid' || status === 'partially_paid';
}

export function isDeliveredFulfillment(state: string | null | undefined): boolean {
  return state === 'delivered';
}

export function isDeliveredShipment(status: string | null | undefined): boolean {
  return status === 'delivered';
}

// ── Provider → canonical mappers (preserve provider string as source_status) ──

const SHOPIFY_FINANCIAL: Record<string, OrderFinancialStatus> = {
  pending: 'pending', authorized: 'authorized', paid: 'paid',
  partially_paid: 'partially_paid', partially_refunded: 'partially_refunded',
  refunded: 'refunded', voided: 'voided',
};

export function mapShopifyFinancialStatus(raw: string | null | undefined): OrderFinancialStatus {
  if (!raw) return 'unknown';
  return SHOPIFY_FINANCIAL[raw.toLowerCase()] ?? 'unknown';
}

const SHOPIFY_FULFILLMENT: Record<string, FulfillmentState> = {
  fulfilled: 'fulfilled', partial: 'partial', restocked: 'returned',
  // Shopify sends null/'' for unfulfilled orders.
};

export function mapShopifyFulfillmentStatus(raw: string | null | undefined): FulfillmentState {
  if (!raw) return 'unfulfilled';
  return SHOPIFY_FULFILLMENT[raw.toLowerCase()] ?? 'unknown';
}

const CARRIER_SHIPMENT: Record<string, ShipmentStatus> = {
  delivered: 'delivered', in_transit: 'in_transit', intransit: 'in_transit',
  out_for_delivery: 'out_for_delivery', exception: 'exception',
  returned: 'returned', pending: 'pending', info_received: 'pending',
};

export function mapCarrierShipmentStatus(raw: string | null | undefined): ShipmentStatus {
  if (!raw) return 'unknown';
  return CARRIER_SHIPMENT[raw.toLowerCase().replace(/[\s-]/g, '_')] ?? 'unknown';
}
