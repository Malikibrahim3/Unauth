import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  type MerchantIdentityInsert,
  upsertMerchantIdentityRows,
} from '@/lib/shopify/identity';
import { upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { resolveMerchantIdForWooCommerceStore } from '@/lib/commerce/woocommerce/auditBridge';

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
  const now = new Date().toISOString();
  const orderId =
    refund.order_id !== undefined && refund.order_id !== null
      ? String(refund.order_id)
      : order?.id !== undefined && order?.id !== null
        ? String(order.id)
        : null;
  if (!orderId) return;

  const merchantId = await resolveMerchantIdForWooCommerceStore(supabase, storeKey);
  if (!merchantId) return;

  const refundId = refund.id !== undefined && refund.id !== null ? String(refund.id) : null;
  const refundedAmount = moneyValue(refund.amount) ?? 0;

  const rows: MerchantIdentityInsert[] = [];
  if (refundId) {
    rows.push({
      shop_domain: storeKey,
      source: 'refund',
      source_id: refundId,
      email: normalizeEmail(order?.billing?.email ?? null),
      phone: normalizePhone(order?.billing?.phone ?? null),
      shipping_address: normalizeAddress({
        address1: order?.shipping?.address_1,
        address2: order?.shipping?.address_2,
        city: order?.shipping?.city,
        province: order?.shipping?.state,
        zip: order?.shipping?.postcode,
        country: order?.shipping?.country,
      }),
      billing_address: null,
      customer_id: null,
      updated_at: now,
    });
  }

  if (rows.length) {
    await upsertMerchantIdentityRows(supabase, rows);
  }

  const claim = await upsertMerchantClaim(
    supabase,
    {
      merchant_id: merchantId,
      shop_domain: storeKey,
      shopify_order_id: orderId,
      order_ref: orderId,
      claim_type: 'refund_request',
      status: 'open',
      customer_claim_reason: refund.reason ?? null,
      normalized_reason: 'refund',
      amount_at_risk: refundedAmount > 0 ? refundedAmount : null,
      submitted_at: refund.date_created ?? now,
      detection_method: 'woocommerce_refund',
      requires_merchant_review: false,
    },
    { ignoreDuplicates: true },
  );

  await appendClaimEvent(supabase, {
    claim_id: claim.id,
    merchant_id: merchantId,
    shop_domain: storeKey,
    event_type: 'claim_created',
    new_status: claim.status,
    triggered_by: 'woocommerce_refund',
    metadata: {
      triggered_by: 'woocommerce_refund',
      woocommerce_refund_id: refundId,
      woocommerce_order_id: orderId,
    },
  });
}
