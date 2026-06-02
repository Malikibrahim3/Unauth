import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  type MerchantIdentityInsert,
  upsertMerchantIdentityRows,
} from '@/lib/shopify/identity';
import { enqueueWooCommerceOrderAuditScore } from '@/lib/commerce/woocommerce/auditBridge';
import type { WooCommerceOrderPayload } from '@/lib/commerce/woocommerce/woocommerceOrderToCsvRow';

export async function processWooCommerceOrderWebhook(input: {
  supabase: SupabaseClient;
  storeKey: string;
  payload: WooCommerceOrderPayload;
}): Promise<void> {
  const { supabase, storeKey, payload } = input;
  const now = new Date().toISOString();
  const orderId = payload.id !== undefined && payload.id !== null ? String(payload.id) : null;
  if (!orderId) return;

  const email = normalizeEmail(payload.billing?.email ?? null);
  const phone = normalizePhone(payload.billing?.phone ?? null);
  const shippingAddress = normalizeAddress({
    address1: payload.shipping?.address_1,
    address2: payload.shipping?.address_2,
    city: payload.shipping?.city,
    province: payload.shipping?.state,
    zip: payload.shipping?.postcode,
    country: payload.shipping?.country,
  });
  const billingAddress = normalizeAddress({
    address1: payload.billing?.address_1,
    address2: payload.billing?.address_2,
    city: payload.billing?.city,
    province: payload.billing?.state,
    zip: payload.billing?.postcode,
    country: payload.billing?.country,
  });

  const identityRow: MerchantIdentityInsert = {
    shop_domain: storeKey,
    source: 'order',
    source_id: orderId,
    email,
    phone,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    customer_id: payload.customer_id ? String(payload.customer_id) : null,
    updated_at: now,
  };

  await upsertMerchantIdentityRows(supabase, [identityRow]);

  enqueueWooCommerceOrderAuditScore({
    supabase,
    storeKey,
    order: payload,
    identity: {
      email,
      phone,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      customer_id: payload.customer_id ? String(payload.customer_id) : null,
    },
  });
}
