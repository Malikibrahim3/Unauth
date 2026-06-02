import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  type MerchantIdentityInsert,
  upsertMerchantIdentityRows,
} from '@/lib/shopify/identity';
import { fetchBigCommerceOrder, loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import { enqueueBigCommerceOrderAuditScore } from '@/lib/commerce/bigcommerce/auditBridge';
import type { BigCommerceAddress, BigCommerceOrderPayload } from '@/lib/commerce/bigcommerce/bigcommerceOrderToCsvRow';
import { loadBigCommerceCredentialsForStore } from '@/lib/commerce/bigcommerce/connectionSettings';

function bcAddressToShopifyShape(address: BigCommerceAddress | null | undefined) {
  if (!address) return null;
  return {
    address1: address.street_1 ?? null,
    address2: address.street_2 ?? null,
    city: address.city ?? null,
    province: address.state ?? null,
    zip: address.zip ?? null,
    country: address.country ?? null,
  };
}

export async function processBigCommerceOrderWebhook(input: {
  supabase: SupabaseClient;
  storeHash: string;
  webhookPayload: Record<string, unknown>;
}): Promise<void> {
  const { supabase, storeHash, webhookPayload } = input;
  const data = webhookPayload.data as { type?: string; id?: number | string } | undefined;
  const rawOrderId = data?.id ?? webhookPayload.id;
  if (rawOrderId === undefined || rawOrderId === null) return;
  if (typeof rawOrderId !== 'string' && typeof rawOrderId !== 'number') return;
  const orderId: string | number = rawOrderId;

  const credentialRow = await loadBigCommerceCredentialsForStore(supabase, storeHash);
  if (!credentialRow) return;

  const accessToken = await loadBigCommerceAccessToken(credentialRow.credentials_encrypted);

  const fetched = await fetchBigCommerceOrder({
    storeHash,
    accessToken,
    orderId,
  });
  if (!fetched) return;
  const order = fetched as BigCommerceOrderPayload;

  const now = new Date().toISOString();
  const orderIdStr = String(order.id ?? orderId);

  const email = normalizeEmail(order.billing_address?.email ?? null);
  const phone = normalizePhone(order.billing_address?.phone ?? null);
  const shippingAddress = normalizeAddress(
    bcAddressToShopifyShape(order.shipping_addresses?.[0]),
  );
  const billingAddress = normalizeAddress(bcAddressToShopifyShape(order.billing_address));

  const identityRow: MerchantIdentityInsert = {
    shop_domain: storeHash,
    source: 'order',
    source_id: orderIdStr,
    email,
    phone,
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    customer_id: order.customer_id ? String(order.customer_id) : null,
    updated_at: now,
  };

  await upsertMerchantIdentityRows(supabase, [identityRow]);

  enqueueBigCommerceOrderAuditScore({
    supabase,
    storeHash,
    order,
    identity: {
      email,
      phone,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      customer_id: order.customer_id ? String(order.customer_id) : null,
    },
  });
}
