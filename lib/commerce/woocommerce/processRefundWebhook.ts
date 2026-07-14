import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * WooCommerce refund ingestion → v2 source_refunds, anchored to the
 * already-ingested source_orders row. Mirrors the Shopify refund path.
 */

type WooCommerceRefundPayload = {
  id?: number | string;
  reason?: string | null;
  amount?: string | null;
  date_created?: string | null;
  order_id?: number | string;
  line_items?: unknown[];
};

type WooCommerceOrderRefundContext = {
  id?: number | string;
  billing?: { email?: string | null; phone?: string | null };
  shipping?: {
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  };
};

function moneyValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function processWooCommerceRefundWebhook(input: {
  supabase: SupabaseClient;
  storeKey: string;
  refund: WooCommerceRefundPayload;
  order?: WooCommerceOrderRefundContext | null;
}): Promise<void> {
  const { supabase, storeKey, refund, order } = input;
  const orderExternalId =
    refund.order_id !== undefined && refund.order_id !== null
      ? String(refund.order_id)
      : order?.id !== undefined && order?.id !== null
        ? String(order.id)
        : null;
  const refundId = refund.id !== undefined && refund.id !== null ? String(refund.id) : null;
  if (!orderExternalId || !refundId) return;

  const { data: connection, error: connectionError } = await supabase
    .from('store_connections')
    .select('id, merchant_id')
    .eq('platform', 'woocommerce')
    .eq('store_key', storeKey)
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .maybeSingle();
  if (connectionError) throw new Error(`store_connection_lookup_failed: ${connectionError.message}`);
  if (!connection) {
    console.warn('WooCommerce refund webhook for unknown store — skipped', { storeKey });
    return;
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('source_orders')
    .select('id, total_price')
    .eq('merchant_id', connection.merchant_id)
    .eq('source', 'woocommerce')
    .eq('connection_id', connection.id)
    .eq('external_id', orderExternalId)
    .maybeSingle();
  if (orderError) throw new Error(`source_order_lookup_failed: ${orderError.message}`);
  if (!orderRow) return; // order never ingested — nothing to anchor to

  // Woo sends refund amounts as positive strings; full refund when it covers the order total.
  const amount = moneyValue(refund.amount);
  const total = moneyValue(orderRow.total_price);
  const isFullRefund = amount !== null && total !== null && amount > 0 ? amount >= total : null;

  const { error } = await supabase.from('source_refunds').upsert({
    merchant_id: connection.merchant_id,
    source_order_id: orderRow.id,
    external_id: refundId,
    amount,
    reason: refund.reason ?? null,
    is_full_refund: isFullRefund,
    refunded_at: refund.date_created ?? null,
    raw_payload_hash: crypto.createHash('sha256').update(JSON.stringify(refund), 'utf8').digest('hex'),
  }, { onConflict: 'merchant_id,source_order_id,external_id' });
  if (error) throw new Error(`source_refund_upsert_failed: ${error.message}`);
}
