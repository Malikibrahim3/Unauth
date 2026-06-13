import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchBigCommerceOrder, loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';

/**
 * BigCommerce refund ingestion → v2 source_refunds, anchored to the
 * already-ingested source_orders row. Mirrors the Shopify refund path.
 * BC webhooks carry only ids, so the order is fetched via the v2 API to
 * recover the refunded amount.
 */

function moneyValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function processBigCommerceRefundWebhook(input: {
  supabase: SupabaseClient;
  storeHash: string;
  webhookPayload: Record<string, unknown>;
}): Promise<void> {
  const { supabase, storeHash, webhookPayload } = input;
  const data = webhookPayload.data as {
    id?: number | string;
    order_id?: number | string;
    refund?: { refund_id?: number | string };
  } | undefined;
  const orderId = data?.order_id ?? data?.id;
  const refundId = data?.refund?.refund_id ?? webhookPayload.id;
  if (refundId === undefined || refundId === null || orderId === undefined || orderId === null) return;

  const { data: connection, error: connectionError } = await supabase
    .from('store_connections')
    .select('id, merchant_id, credentials_encrypted')
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash)
    .maybeSingle();
  if (connectionError) throw new Error(`store_connection_lookup_failed: ${connectionError.message}`);
  if (!connection) {
    console.warn('BigCommerce refund webhook for unknown store — skipped', { storeHash });
    return;
  }

  const orderIdStr = String(orderId);
  const refundIdStr = String(refundId);

  const { data: orderRow, error: orderError } = await supabase
    .from('source_orders')
    .select('id, total_price')
    .eq('merchant_id', connection.merchant_id)
    .eq('source', 'bigcommerce')
    .eq('external_id', orderIdStr)
    .maybeSingle();
  if (orderError) throw new Error(`source_order_lookup_failed: ${orderError.message}`);
  if (!orderRow) return; // order never ingested — nothing to anchor to

  let fetchedOrder: Record<string, unknown> | null = null;
  if (typeof connection.credentials_encrypted === 'string' && connection.credentials_encrypted.trim()) {
    const accessToken = await loadBigCommerceAccessToken(connection.credentials_encrypted);
    fetchedOrder = await fetchBigCommerceOrder({ storeHash, accessToken, orderId });
  }

  const amount =
    moneyValue(webhookPayload.refunded_amount) ??
    moneyValue((webhookPayload.data as { amount?: unknown } | undefined)?.amount) ??
    moneyValue(fetchedOrder?.refunded_amount);
  const total = moneyValue(orderRow.total_price);
  const isFullRefund = amount !== null && total !== null && amount > 0 ? amount >= total : null;

  const { error } = await supabase.from('source_refunds').upsert({
    merchant_id: connection.merchant_id,
    source_order_id: orderRow.id,
    external_id: refundIdStr,
    amount,
    currency: typeof fetchedOrder?.currency_code === 'string' ? fetchedOrder.currency_code : null,
    is_full_refund: isFullRefund,
    refunded_at: new Date().toISOString(),
    raw_payload_hash: crypto.createHash('sha256').update(JSON.stringify(webhookPayload), 'utf8').digest('hex'),
  }, { onConflict: 'merchant_id,source_order_id,external_id' });
  if (error) throw new Error(`source_refund_upsert_failed: ${error.message}`);
}
