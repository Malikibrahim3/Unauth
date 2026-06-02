import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeEmail,
  normalizePhone,
  type MerchantIdentityInsert,
  upsertMerchantIdentityRows,
} from '@/lib/shopify/identity';
import { upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { fetchBigCommerceOrder, loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import { resolveMerchantIdForBigCommerceStore } from '@/lib/commerce/bigcommerce/auditBridge';
import { loadBigCommerceCredentialsForStore } from '@/lib/commerce/bigcommerce/connectionSettings';

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
  if (refundId === undefined || orderId === undefined || orderId === null) return;

  const merchantId = await resolveMerchantIdForBigCommerceStore(supabase, storeHash);
  if (!merchantId) return;

  const credentialRow = await loadBigCommerceCredentialsForStore(supabase, storeHash);
  if (!credentialRow) return;

  const accessToken = await loadBigCommerceAccessToken(credentialRow.credentials_encrypted);
  const order = await fetchBigCommerceOrder({
    storeHash,
    accessToken,
    orderId,
  });

  const now = new Date().toISOString();
  const orderIdStr = String(orderId);
  const refundIdStr = String(refundId);

  const rows: MerchantIdentityInsert[] = [
    {
      shop_domain: storeHash,
      source: 'refund',
      source_id: refundIdStr,
      email: normalizeEmail(
        (order?.billing_address as { email?: string } | undefined)?.email ?? null,
      ),
      phone: normalizePhone(
        (order?.billing_address as { phone?: string } | undefined)?.phone ?? null,
      ),
      shipping_address: null,
      billing_address: null,
      customer_id: null,
      updated_at: now,
    },
  ];
  await upsertMerchantIdentityRows(supabase, rows);

  const refundedAmount =
    moneyValue(webhookPayload.refunded_amount) ??
    moneyValue((webhookPayload.data as { amount?: unknown })?.amount) ??
    moneyValue(order?.refunded_amount) ??
    0;

  const claim = await upsertMerchantClaim(
    supabase,
    {
      merchant_id: merchantId,
      shop_domain: storeHash,
      shopify_order_id: orderIdStr,
      order_ref: orderIdStr,
      claim_type: 'refund_request',
      status: 'open',
      customer_claim_reason: null,
      normalized_reason: 'refund',
      amount_at_risk: refundedAmount > 0 ? refundedAmount : null,
      submitted_at: now,
      detection_method: 'bigcommerce_refund',
      requires_merchant_review: false,
    },
    { ignoreDuplicates: true },
  );

  await appendClaimEvent(supabase, {
    claim_id: claim.id,
    merchant_id: merchantId,
    shop_domain: storeHash,
    event_type: 'claim_created',
    new_status: claim.status,
    triggered_by: 'bigcommerce_refund',
    metadata: {
      triggered_by: 'bigcommerce_refund',
      bigcommerce_refund_id: refundIdStr,
      bigcommerce_order_id: orderIdStr,
    },
  });
}
