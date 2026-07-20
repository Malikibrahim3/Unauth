import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseAddress } from '@/lib/identity/normalise';
import { emitIdentityObservations, signalsForEntity, type ObservationEntity } from '@/lib/identity/observations';
import { resolveIdentitiesForKeys } from '@/lib/identity/resolver';
import { resolveMerchantCustomer } from '@/lib/identity/merchantCustomerResolver';
import type { WooCommerceOrderPayload } from '@/lib/commerce/woocommerce/orderTypes';
import { linkCheckoutSignalsToOrder } from '@/lib/checkoutSignals/linkOrder';

/**
 * WooCommerce ingestion → v2 schema, mirroring app/api/shopify/webhooks/route.ts:
 * source_customers / source_addresses / source_orders + hashed identity
 * observations + resolution. Replaces the legacy merchant_identities path.
 */

function mapFinancialStatus(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'pending') return 'pending';
  if (v === 'processing' || v === 'completed') return 'paid';
  if (v === 'on-hold') return 'authorized';
  if (v === 'refunded') return 'refunded';
  if (v === 'cancelled') return 'cancelled';
  return 'unknown';
}

function mapFulfillmentState(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'completed') return 'fulfilled';
  if (['pending', 'processing', 'on-hold'].includes(v)) return 'unfulfilled';
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

function extractUnauthVisitorId(payload: WooCommerceOrderPayload): string | null {
  const meta = (payload as WooCommerceOrderPayload & {
    meta_data?: Array<{ key?: string; value?: unknown }> | null;
  }).meta_data;
  if (!Array.isArray(meta)) return null;
  const item = meta.find((entry) => entry?.key === '_unauth_visitor_id' || entry?.key === '_unauth_vid');
  const visitorId = typeof item?.value === 'string' ? item.value.trim() : null;
  if (!visitorId || visitorId.length > 128) return null;
  return visitorId;
}

type WooAddress = {
  address_1?: string | null; address_2?: string | null; city?: string | null;
  state?: string | null; postcode?: string | null; country?: string | null;
  phone?: string | null;
};

/** Compose an address string with zip5 truncation (schema: postal_code is zip5). */
function addressParts(a: WooAddress | null | undefined) {
  if (!a || (!a.address_1 && !a.city && !a.postcode)) return null;
  const zip5 = typeof a.postcode === 'string' ? a.postcode.trim().split('-')[0] : null;
  const composed = [a.address_1, a.address_2, a.city, a.state, zip5].filter(Boolean).join(', ');
  const normalized = normaliseAddress(composed);
  if (!normalized) return null;
  return {
    line1: a.address_1 ?? null,
    line2: a.address_2 ?? null,
    city: a.city ?? null,
    region: a.state ?? null,
    postal_code: zip5,
    country: a.country ?? null,
    phone: a.phone ?? null,
    normalized_full: normalized,
  };
}

async function resolveStoreConnection(supabase: SupabaseClient, storeKey: string) {
  const { data, error } = await supabase
    .from('store_connections')
    .select('id, merchant_id')
    .eq('platform', 'woocommerce')
    .eq('store_key', storeKey)
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .maybeSingle();
  if (error) throw new Error(`store_connection_lookup_failed: ${error.message}`);
  return data ?? null;
}

async function insertAddress(
  supabase: SupabaseClient, merchantId: string, customerId: string | null,
  kind: 'shipping' | 'billing', a: WooAddress | null | undefined,
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

export async function processWooCommerceOrderWebhook(input: {
  supabase: SupabaseClient;
  storeKey: string;
  payload: WooCommerceOrderPayload;
}): Promise<void> {
  const { supabase, storeKey, payload } = input;
  const now = new Date().toISOString();
  const externalId = payload.id !== undefined && payload.id !== null ? String(payload.id) : null;
  if (!externalId) return;

  const connection = await resolveStoreConnection(supabase, storeKey);
  if (!connection) {
    console.warn('WooCommerce webhook for unknown store — skipped', { storeKey });
    return;
  }
  const merchantId = connection.merchant_id;

  // Woo guest checkouts use customer_id 0 — no platform customer record.
  const platformCustomerId =
    payload.customer_id != null && Number(payload.customer_id) !== 0
      ? String(payload.customer_id)
      : null;

  let customerId: string | null = null;
  if (platformCustomerId) {
    const { data, error } = await supabase.from('source_customers').upsert({
      merchant_id: merchantId,
      source: 'woocommerce',
      connection_id: connection.id,
      external_id: platformCustomerId,
      email: payload.billing?.email ?? null,
      phone: payload.billing?.phone ?? null,
      first_name: payload.billing?.first_name ?? null,
      last_name: payload.billing?.last_name ?? null,
      updated_at: now,
    }, { onConflict: 'merchant_id,source,connection_id,external_id' }).select('id').single();
    if (error) throw new Error(`source_customer_upsert_failed: ${error.message}`);
    customerId = data.id;
  }

  const { data: existing, error: lookupError } = await supabase.from('source_orders')
    .select('id, shipping_address_id, billing_address_id')
    .eq('merchant_id', merchantId).eq('source', 'woocommerce').eq('connection_id', connection.id).eq('external_id', externalId)
    .maybeSingle();
  if (lookupError) throw new Error(`source_order_lookup_failed: ${lookupError.message}`);

  // reuse address rows on updates; create on first sight
  let shippingId = existing?.shipping_address_id ?? null;
  let billingId = existing?.billing_address_id ?? null;
  let shippingNorm: string | null = null;
  let billingNorm: string | null = null;
  if (!shippingId) {
    const r = await insertAddress(supabase, merchantId, customerId, 'shipping', payload.shipping);
    shippingId = r?.id ?? null;
    shippingNorm = r?.normalized ?? null;
  } else {
    shippingNorm = addressParts(payload.shipping)?.normalized_full ?? null;
  }
  if (!billingId) {
    const r = await insertAddress(supabase, merchantId, customerId, 'billing', payload.billing);
    billingId = r?.id ?? null;
    billingNorm = r?.normalized ?? null;
  } else {
    billingNorm = addressParts(payload.billing)?.normalized_full ?? null;
  }

  const email = payload.billing?.email ?? null;
  const phone = payload.billing?.phone ?? null;
  const gateway = payload.payment_method ?? null;
  const rawBody = JSON.stringify(payload);

  const { data: orderRow, error } = await supabase.from('source_orders').upsert({
    merchant_id: merchantId,
    source: 'woocommerce',
    connection_id: connection.id,
    external_id: externalId,
    order_number: payload.number ?? null,
    source_customer_id: customerId,
    email,
    phone,
    financial_status: mapFinancialStatus(payload.status),
    fulfillment_state: mapFulfillmentState(payload.status),
    total_price: moneyValue(payload.total),
    total_discounts: moneyValue(payload.discount_total),
    currency: payload.currency ?? null,
    payment_gateway: gateway,
    browser_ip: validInetOrNull(payload.customer_ip_address),
    user_agent: payload.customer_user_agent ?? null,
    shipping_address_id: shippingId,
    billing_address_id: billingId,
    line_items_count: Array.isArray(payload.line_items) ? payload.line_items.length : null,
    note: payload.customer_note ?? null,
    placed_at: payload.date_created ?? now,
    raw_payload_hash: crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex'),
    updated_at: now,
  }, { onConflict: 'merchant_id,source,connection_id,source_account_id,external_id' }).select('id').single();
  if (error) throw new Error(`source_order_upsert_failed: ${error.message}`);

  // hashed identity observations + resolution
  const entities: ObservationEntity[] = [{
    provenance: { orderId: orderRow.id },
    source: 'woocommerce',
    sourceAccountKey: connection.id,
    observedAt: payload.date_created ?? now,
    email,
    phone,
    ip: payload.customer_ip_address ?? null,
    paymentGateway: gateway,
    cardLast4: null, // Woo REST payloads do not expose card digits
    shippingNormalized: shippingNorm,
    billingNormalized: billingNorm,
    platformCustomerExternalId: platformCustomerId,
  }];
  const { signalKeys } = await emitIdentityObservations(supabase, merchantId, entities);
  await resolveIdentitiesForKeys(supabase, signalKeys);
  try {
    await resolveMerchantCustomer(
      supabase,
      {
        merchantId,
        entityType: 'source_order',
        entityId: orderRow.id as string,
        source: 'woocommerce',
        sourceAccountKey: connection.id,
        observedAt: payload.date_created ?? now,
        email,
      },
      typeof signalsForEntity === 'function' ? signalsForEntity(entities[0]) : signalKeys,
    );
    if (customerId) {
      await resolveMerchantCustomer(
        supabase,
        {
          merchantId,
          entityType: 'source_customer',
          entityId: customerId,
          source: 'woocommerce',
          sourceAccountKey: connection.id,
          observedAt: payload.date_created ?? now,
          email,
        },
        typeof signalsForEntity === 'function' ? signalsForEntity(entities[0]) : signalKeys,
      );
    }
  } catch (error) {
    console.error('merchant_local_customer_resolution_failed', {
      merchantId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const visitorId = extractUnauthVisitorId(payload);
  if (visitorId) {
    try {
      await linkCheckoutSignalsToOrder(supabase, {
        merchantId,
        platformOrderId: externalId,
        visitorId,
        platform: 'woocommerce',
      });
    } catch (error) {
      console.error('WooCommerce checkout signal order link failed', {
        storeKey,
        orderId: externalId,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
