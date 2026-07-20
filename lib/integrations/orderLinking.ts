import type { SupabaseClient } from '@supabase/supabase-js';

type LinkedTracking = {
  trackingNumber: string;
  carrier: string | null;
};

type SourceOrderLink = {
  source: string;
  external_id: string;
  order_number: string | null;
};

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function trackingForOrder(
  client: SupabaseClient,
  merchantId: string,
  sourceOrderId: string,
): Promise<LinkedTracking | null> {
  const { data: fulfillment, error: fulfillmentError } = await client
    .from('source_fulfillments')
    .select('tracking_number,tracking_company')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .not('tracking_number', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fulfillmentError) {
    throw new Error(`carrier_tracking_fulfillment_lookup_failed:${fulfillmentError.message}`);
  }
  const fulfillmentTracking = clean(fulfillment?.tracking_number);
  if (fulfillmentTracking) {
    return {
      trackingNumber: fulfillmentTracking,
      carrier: clean(fulfillment?.tracking_company),
    };
  }

  const { data: shipment, error: shipmentError } = await client
    .from('source_shipments')
    .select('tracking_number,carrier')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', sourceOrderId)
    .not('tracking_number', 'is', null)
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (shipmentError) {
    throw new Error(`carrier_tracking_shipment_lookup_failed:${shipmentError.message}`);
  }
  const shipmentTracking = clean(shipment?.tracking_number);
  return shipmentTracking
    ? { trackingNumber: shipmentTracking, carrier: clean(shipment?.carrier) }
    : null;
}

async function linkedOrderId(
  client: SupabaseClient,
  merchantId: string,
  order: SourceOrderLink,
): Promise<string | null> {
  if (order.source === 'shopify') {
    const reference = clean(order.external_id);
    if (!reference) return null;
    const { data, error } = await client
      .from('source_orders')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('source', 'shipbob')
      .eq('order_number', reference)
      .limit(1);
    if (error) throw new Error(`linked_shipbob_order_lookup_failed:${error.message}`);
    return data?.[0]?.id ?? null;
  }

  if (order.source === 'shipbob') {
    const reference = clean(order.order_number);
    if (!reference) return null;
    const { data, error } = await client
      .from('source_orders')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('source', 'shopify')
      .eq('external_id', reference)
      .limit(1);
    if (error) throw new Error(`linked_shopify_order_lookup_failed:${error.message}`);
    return data?.[0]?.id ?? null;
  }

  return null;
}

/**
 * Resolve carrier tracking from either provider's copy of the order. ShipBob
 * stores Shopify's external order id as its reference/order_number, so this
 * also crosses that deterministic link before declaring tracking unavailable.
 */
export async function resolveLinkedCarrierTracking(
  client: SupabaseClient,
  merchantId: string,
  sourceOrderId?: string,
  provided?: string,
): Promise<LinkedTracking | null> {
  const providedTracking = clean(provided);
  if (providedTracking) return { trackingNumber: providedTracking, carrier: null };
  if (!sourceOrderId) return null;

  const direct = await trackingForOrder(client, merchantId, sourceOrderId);
  if (direct) return direct;

  const { data: order, error } = await client
    .from('source_orders')
    .select('source,external_id,order_number')
    .eq('merchant_id', merchantId)
    .eq('id', sourceOrderId)
    .maybeSingle();
  if (error) throw new Error(`source_order_link_lookup_failed:${error.message}`);
  if (!order) return null;

  const counterpartId = await linkedOrderId(client, merchantId, order as SourceOrderLink);
  return counterpartId ? trackingForOrder(client, merchantId, counterpartId) : null;
}

/** Resolve the merchant reference ShipBob receives for a canonical order. */
export async function resolveShipBobOrderReference(
  client: SupabaseClient,
  merchantId: string,
  sourceOrderId?: string,
  provided?: string,
): Promise<string | null> {
  const providedReference = clean(provided)?.replace(/^#/, '') ?? null;
  if (providedReference) return providedReference;
  if (!sourceOrderId) return null;

  const { data, error } = await client
    .from('source_orders')
    .select('source,external_id,order_number')
    .eq('merchant_id', merchantId)
    .eq('id', sourceOrderId)
    .maybeSingle();
  if (error) throw new Error(`shipbob_order_reference_lookup_failed:${error.message}`);
  if (!data) return null;

  if (data.source === 'shopify') return clean(data.external_id) ?? clean(data.order_number);
  if (data.source === 'shipbob') return clean(data.order_number) ?? clean(data.external_id);
  return clean(data.external_id) ?? clean(data.order_number);
}
