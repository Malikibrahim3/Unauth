import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseAddress } from '@/lib/identity/normalise';
import { emitIdentityObservations, type ObservationEntity } from '@/lib/identity/observations';
import { resolveIdentitiesForKeys } from '@/lib/identity/resolver';
import { fetchBigCommerceOrder, loadBigCommerceAccessToken } from '@/lib/commerce/bigcommerce/bigcommerceApi';
import type { BigCommerceAddress, BigCommerceOrderPayload } from '@/lib/commerce/bigcommerce/bigcommerceOrderToCsvRow';
import { linkCheckoutSignalsToOrder } from '@/lib/checkoutSignals/linkOrder';

/**
 * BigCommerce ingestion → v2 schema, mirroring app/api/shopify/webhooks/route.ts.
 * BC webhooks carry only ids, so we fetch the full order via the v2 API, then
 * write source_customers / source_addresses / source_orders and emit hashed
 * identity observations + resolution. Replaces the legacy merchant_identities path.
 */

function mapFinancialStatus(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!v) return 'unknown';
  if (v === 'partially refunded') return 'partially_refunded';
  if (v === 'refunded') return 'refunded';
  if (v === 'cancelled') return 'cancelled';
  if (['incomplete', 'pending', 'awaiting payment', 'manual verification required'].includes(v)) {
    return 'pending';
  }
  if ([
    'awaiting fulfillment', 'awaiting shipment', 'awaiting pickup',
    'partially shipped', 'shipped', 'completed',
  ].includes(v)) {
    return 'paid';
  }
  return 'unknown';
}

function mapFulfillmentState(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'shipped' || v === 'completed') return 'fulfilled';
  if (v === 'partially shipped') return 'partial';
  if (['awaiting fulfillment', 'awaiting shipment', 'awaiting pickup', 'awaiting payment', 'pending', 'incomplete'].includes(v)) {
    return 'unfulfilled';
  }
  return 'unknown';
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function validInetOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v || v.toLowerCase() === 'unknown') return null;
  if (IPV4_RE.test(v) && v.split('.').every((o) => Number(o) <= 255)) return v;
  if (v.includes(':') && IPV6_RE.test(v)) return v;
  return null;
}

function moneyValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readNamedField(value: unknown, key: string): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = record.name ?? record.key;
    const fieldValue = record.value;
    if (name === key && typeof fieldValue === 'string' && fieldValue.trim()) {
      return fieldValue.trim();
    }
  }
  return null;
}

function extractUnauthVisitorId(order: Record<string, unknown>): string | null {
  const visitorId =
    readNamedField(order.form_fields, '_unauth_vid') ??
    readNamedField(order.custom_fields, '_unauth_vid');
  if (!visitorId || visitorId.length > 128) return null;
  return visitorId;
}

/** Compose an address string with zip5 truncation (schema: postal_code is zip5). */
function addressParts(a: BigCommerceAddress | null | undefined) {
  if (!a || (!a.street_1 && !a.city && !a.zip)) return null;
  const zip5 = typeof a.zip === 'string' ? a.zip.trim().split('-')[0] : null;
  const composed = [a.street_1, a.street_2, a.city, a.state, zip5].filter(Boolean).join(', ');
  const normalized = normaliseAddress(composed);
  if (!normalized) return null;
  return {
    line1: a.street_1 ?? null,
    line2: a.street_2 ?? null,
    city: a.city ?? null,
    region: a.state ?? null,
    postal_code: zip5,
    country: a.country ?? null,
    phone: a.phone ?? null,
    normalized_full: normalized,
  };
}

async function insertAddress(
  supabase: SupabaseClient, merchantId: string, customerId: string | null,
  kind: 'shipping' | 'billing', a: BigCommerceAddress | null | undefined,
): Promise<{ id: string; normalized: string } | null> {
  const parts = addressParts(a);
  if (!parts) return null;
  const { data, error } = await supabase.from('source_addresses').insert({
    merchant_id: merchantId,
    source_customer_id: customerId,
    kind,
    ...parts,
  }).select('id').single();
  if (error) throw new Error(`source_address_insert_failed: ${error.message}`);
  return { id: data.id, normalized: parts.normalized_full };
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

  const { data: connection, error: connectionError } = await supabase
    .from('store_connections')
    .select('id, merchant_id, credentials_encrypted')
    .eq('platform', 'bigcommerce')
    .eq('store_key', storeHash)
    .maybeSingle();
  if (connectionError) throw new Error(`store_connection_lookup_failed: ${connectionError.message}`);
  if (!connection) {
    console.warn('BigCommerce webhook for unknown store — skipped', { storeHash });
    return;
  }
  const merchantId = connection.merchant_id;

  if (typeof connection.credentials_encrypted !== 'string' || !connection.credentials_encrypted.trim()) return;
  const accessToken = await loadBigCommerceAccessToken(connection.credentials_encrypted);

  const fetched = await fetchBigCommerceOrder({ storeHash, accessToken, orderId });
  if (!fetched) return;
  const order = fetched as BigCommerceOrderPayload;

  const now = new Date().toISOString();
  const externalId = String(order.id ?? orderId);

  // BC guest checkouts use customer_id 0 — no platform customer record.
  const platformCustomerId =
    order.customer_id != null && Number(order.customer_id) !== 0
      ? String(order.customer_id)
      : null;
  const billing = order.billing_address ?? null;
  const shipping = order.shipping_addresses?.[0] ?? null;

  let customerId: string | null = null;
  if (platformCustomerId) {
    const { data: customerRow, error } = await supabase.from('source_customers').upsert({
      merchant_id: merchantId,
      source: 'bigcommerce',
      connection_id: connection.id,
      external_id: platformCustomerId,
      email: billing?.email ?? null,
      phone: billing?.phone ?? null,
      first_name: billing?.first_name ?? null,
      last_name: billing?.last_name ?? null,
      updated_at: now,
    }, { onConflict: 'merchant_id,source,external_id' }).select('id').single();
    if (error) throw new Error(`source_customer_upsert_failed: ${error.message}`);
    customerId = customerRow.id;
  }

  const { data: existing, error: lookupError } = await supabase.from('source_orders')
    .select('id, shipping_address_id, billing_address_id')
    .eq('merchant_id', merchantId).eq('source', 'bigcommerce').eq('external_id', externalId)
    .maybeSingle();
  if (lookupError) throw new Error(`source_order_lookup_failed: ${lookupError.message}`);

  // reuse address rows on updates; create on first sight
  let shippingId = existing?.shipping_address_id ?? null;
  let billingId = existing?.billing_address_id ?? null;
  let shippingNorm: string | null = null;
  let billingNorm: string | null = null;
  if (!shippingId) {
    const r = await insertAddress(supabase, merchantId, customerId, 'shipping', shipping);
    shippingId = r?.id ?? null;
    shippingNorm = r?.normalized ?? null;
  } else {
    shippingNorm = addressParts(shipping)?.normalized_full ?? null;
  }
  if (!billingId) {
    const r = await insertAddress(supabase, merchantId, customerId, 'billing', billing);
    billingId = r?.id ?? null;
    billingNorm = r?.normalized ?? null;
  } else {
    billingNorm = addressParts(billing)?.normalized_full ?? null;
  }

  const email = billing?.email ?? null;
  const phone = billing?.phone ?? null;
  const gateway = order.payment_method ?? null;
  const rawBody = JSON.stringify(fetched);

  const { data: orderRow, error } = await supabase.from('source_orders').upsert({
    merchant_id: merchantId,
    source: 'bigcommerce',
    connection_id: connection.id,
    external_id: externalId,
    source_customer_id: customerId,
    email,
    phone,
    financial_status: mapFinancialStatus(order.status),
    fulfillment_state: mapFulfillmentState(order.status),
    total_price: moneyValue(order.total_inc_tax),
    subtotal_price: moneyValue(order.subtotal_ex_tax),
    total_discounts: moneyValue(order.discount_amount),
    currency: order.currency_code ?? null,
    payment_gateway: gateway,
    browser_ip: validInetOrNull(order.ip_address),
    shipping_address_id: shippingId,
    billing_address_id: billingId,
    line_items_count: Number.isFinite(Number(order.items_total)) ? Number(order.items_total) : null,
    note: order.customer_message ?? null,
    placed_at: order.date_created ?? now,
    raw_payload_hash: crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex'),
    updated_at: now,
  }, { onConflict: 'merchant_id,source,external_id' }).select('id').single();
  if (error) throw new Error(`source_order_upsert_failed: ${error.message}`);

  // hashed identity observations + resolution
  const entities: ObservationEntity[] = [{
    provenance: { orderId: orderRow.id },
    source: 'bigcommerce',
    observedAt: order.date_created ?? now,
    email,
    phone,
    ip: order.ip_address ?? null,
    paymentGateway: gateway,
    cardLast4: null, // BC v2 orders API does not expose card digits
    shippingNormalized: shippingNorm,
    billingNormalized: billingNorm,
    platformCustomerExternalId: platformCustomerId,
  }];
  const { signalKeys } = await emitIdentityObservations(supabase, merchantId, entities);
  await resolveIdentitiesForKeys(supabase, signalKeys);

  const visitorId = extractUnauthVisitorId(order as unknown as Record<string, unknown>);
  if (visitorId) {
    try {
      await linkCheckoutSignalsToOrder(supabase, {
        merchantId,
        platformOrderId: externalId,
        visitorId,
        platform: 'bigcommerce',
      });
    } catch (error) {
      console.error('BigCommerce checkout signal order link failed', {
        storeHash,
        orderId: externalId,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
