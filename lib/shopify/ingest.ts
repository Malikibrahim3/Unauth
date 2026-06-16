import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { linkCheckoutSignalsToOrder } from '@/lib/checkoutSignals/linkOrder';
import { normaliseAddress, normaliseCard } from '@/lib/identity/normalise';
import { emitIdentityObservations, type ObservationEntity } from '@/lib/identity/observations';
import { linkClaimToIdentity, resolveIdentitiesForKeys } from '@/lib/identity/resolver';

type ServiceClient = SupabaseClient;

const FINANCIAL_STATUSES = new Set([
  'pending',
  'authorized',
  'paid',
  'partially_paid',
  'partially_refunded',
  'refunded',
  'voided',
  'cancelled',
]);

type ShopifyAddress = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country_code?: string | null;
  country?: string | null;
  phone?: string | null;
};

function mapFinancialStatus(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return FINANCIAL_STATUSES.has(v) ? v : 'unknown';
}

function mapFulfillmentState(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!v) return 'unfulfilled';
  if (v === 'fulfilled') return 'fulfilled';
  if (v === 'partial') return 'partial';
  if (v === 'restocked') return 'returned';
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

function tagsToArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
}

function readAttributeValue(value: unknown, key: string): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const itemKey = record.name ?? record.key;
      if (itemKey === key && typeof record.value === 'string' && record.value.trim()) {
        return record.value.trim();
      }
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const direct = record[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }
  return null;
}

function extractUnauthVisitorId(payload: Record<string, unknown>): string | null {
  const value =
    readAttributeValue(payload.note_attributes, '_unauth_vid') ??
    readAttributeValue(payload.cart_attributes, '_unauth_vid') ??
    readAttributeValue(payload.attributes, '_unauth_vid');
  if (!value || value.length > 128) return null;
  return value;
}

function addressParts(a: ShopifyAddress | null | undefined) {
  if (!a || (!a.address1 && !a.city && !a.zip)) return null;
  const zip5 = typeof a.zip === 'string' ? a.zip.trim().split('-')[0] : null;
  const composed = [a.address1, a.address2, a.city, a.province_code ?? a.province, zip5]
    .filter(Boolean)
    .join(', ');
  const normalized = normaliseAddress(composed);
  if (!normalized) return null;
  return {
    line1: a.address1 ?? null,
    line2: a.address2 ?? null,
    city: a.city ?? null,
    region: a.province_code ?? a.province ?? null,
    postal_code: zip5,
    country: a.country_code ?? a.country ?? null,
    phone: a.phone ?? null,
    normalized_full: normalized,
  };
}

async function resolveStoreConnection(supabase: ServiceClient, shopDomain: string) {
  const { data, error } = await supabase
    .from('store_connections')
    .select('id, merchant_id, status')
    .eq('platform', 'shopify')
    .eq('store_key', shopDomain)
    .maybeSingle();
  if (error) throw new Error(`store_connection_lookup_failed: ${error.message}`);
  return data ?? null;
}

async function insertAddress(
  supabase: ServiceClient,
  merchantId: string,
  customerId: string | null,
  kind: 'shipping' | 'billing',
  a: ShopifyAddress | null | undefined,
): Promise<{ id: string; normalized: string } | null> {
  const parts = addressParts(a);
  if (!parts) return null;
  const { data, error } = await supabase
    .from('source_addresses')
    .insert({
      merchant_id: merchantId,
      source_customer_id: customerId,
      kind,
      ...parts,
    })
    .select('id')
    .single();
  if (error) throw new Error(`source_address_insert_failed: ${error.message}`);
  return { id: data.id, normalized: parts.normalized_full };
}

async function upsertSourceCustomer(
  supabase: ServiceClient,
  merchantId: string,
  connectionId: string,
  payload: Record<string, any>,
  now: string,
): Promise<string | null> {
  const c = payload.customer;
  if (!c?.id) return null;
  const { data, error } = await supabase
    .from('source_customers')
    .upsert(
      {
        merchant_id: merchantId,
        source: 'shopify',
        connection_id: connectionId,
        external_id: String(c.id),
        email: c.email ?? payload.email ?? payload.contact_email ?? null,
        phone: c.phone ?? payload.phone ?? null,
        first_name: c.first_name ?? null,
        last_name: c.last_name ?? null,
        verified_email: typeof c.verified_email === 'boolean' ? c.verified_email : null,
        account_created_at: c.created_at ?? null,
        orders_count: Number.isFinite(Number(c.orders_count)) ? Number(c.orders_count) : null,
        total_spent: moneyValue(c.total_spent),
        tags: tagsToArray(c.tags),
        updated_at: now,
      },
      { onConflict: 'merchant_id,source,external_id' },
    )
    .select('id')
    .single();
  if (error) throw new Error(`source_customer_upsert_failed: ${error.message}`);
  return data.id;
}

async function findOrderByExternalId(supabase: ServiceClient, merchantId: string, externalId: string) {
  const { data, error } = await supabase
    .from('source_orders')
    .select('id, shipping_address_id, billing_address_id')
    .eq('merchant_id', merchantId)
    .eq('source', 'shopify')
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw new Error(`source_order_lookup_failed: ${error.message}`);
  return data ?? null;
}

async function processOrderTopic(
  supabase: ServiceClient,
  merchantId: string,
  connectionId: string,
  payload: Record<string, any>,
  rawBody: string,
  now: string,
) {
  const externalId = String(payload.id);
  const customerId = await upsertSourceCustomer(supabase, merchantId, connectionId, payload, now);
  const existing = await findOrderByExternalId(supabase, merchantId, externalId);

  let shippingId = existing?.shipping_address_id ?? null;
  let billingId = existing?.billing_address_id ?? null;
  let shippingNorm: string | null = null;
  let billingNorm: string | null = null;
  if (!shippingId) {
    const r = await insertAddress(
      supabase,
      merchantId,
      customerId,
      'shipping',
      payload.shipping_address ?? payload.customer?.default_address,
    );
    shippingId = r?.id ?? null;
    shippingNorm = r?.normalized ?? null;
  } else {
    shippingNorm = addressParts(payload.shipping_address ?? payload.customer?.default_address)?.normalized_full ?? null;
  }
  if (!billingId) {
    const r = await insertAddress(
      supabase,
      merchantId,
      customerId,
      'billing',
      payload.billing_address ?? payload.customer?.default_address,
    );
    billingId = r?.id ?? null;
    billingNorm = r?.normalized ?? null;
  } else {
    billingNorm = addressParts(payload.billing_address ?? payload.customer?.default_address)?.normalized_full ?? null;
  }

  const gateway = payload.payment_gateway_names?.[0] ?? payload.gateway ?? null;
  const cardLast4 = normaliseCard(payload.payment_details?.credit_card_number ?? null) || null;
  const email = payload.email ?? payload.contact_email ?? payload.customer?.email ?? null;
  const phone = payload.phone ?? payload.customer?.phone ?? null;

  const { data: orderRow, error } = await supabase
    .from('source_orders')
    .upsert(
      {
        merchant_id: merchantId,
        source: 'shopify',
        connection_id: connectionId,
        external_id: externalId,
        order_number: payload.order_number != null ? String(payload.order_number) : (payload.name ?? null),
        source_customer_id: customerId,
        email,
        phone,
        customer_email: email,
        customer_name: [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(' ') || null,
        financial_status: mapFinancialStatus(payload.financial_status),
        fulfillment_state: mapFulfillmentState(payload.fulfillment_status),
        total_price: moneyValue(payload.total_price ?? payload.current_total_price),
        order_value: moneyValue(payload.total_price ?? payload.current_total_price),
        subtotal_price: moneyValue(payload.subtotal_price ?? payload.current_subtotal_price),
        total_discounts: moneyValue(payload.total_discounts ?? payload.current_total_discounts),
        currency: payload.currency ?? null,
        discount_codes: Array.isArray(payload.discount_codes) ? payload.discount_codes : [],
        payment_gateway: gateway,
        card_last4: cardLast4,
        browser_ip: validInetOrNull(payload.browser_ip ?? payload.client_details?.browser_ip),
        user_agent: payload.client_details?.user_agent ?? null,
        accept_language: payload.client_details?.accept_language ?? null,
        landing_site: payload.landing_site ?? null,
        referring_site: payload.referring_site ?? null,
        source_name: payload.source_name ?? null,
        shipping_address_id: shippingId,
        billing_address_id: billingId,
        line_items_count: Array.isArray(payload.line_items) ? payload.line_items.length : null,
        note: payload.note ?? null,
        tags: tagsToArray(payload.tags),
        placed_at: payload.created_at ?? now,
        processed_at: payload.processed_at ?? null,
        cancelled_at: payload.cancelled_at ?? null,
        cancel_reason: payload.cancel_reason ?? null,
        raw_payload_hash: crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex'),
        updated_at: now,
      },
      { onConflict: 'merchant_id,source,external_id' },
    )
    .select('id')
    .single();
  if (error) throw new Error(`source_order_upsert_failed: ${error.message}`);

  const entities: ObservationEntity[] = [
    {
      provenance: { orderId: orderRow.id },
      source: 'shopify',
      observedAt: payload.created_at ?? now,
      email,
      phone,
      ip: payload.browser_ip ?? payload.client_details?.browser_ip ?? null,
      paymentGateway: gateway,
      cardLast4,
      shippingNormalized: shippingNorm,
      billingNormalized: billingNorm,
      platformCustomerExternalId: payload.customer?.id ? String(payload.customer.id) : null,
    },
  ];
  if (customerId && payload.customer) {
    entities.push({
      provenance: { customerId },
      source: 'shopify',
      observedAt: payload.customer.created_at ?? null,
      email: payload.customer.email ?? email,
      phone: payload.customer.phone ?? phone,
      platformCustomerExternalId: String(payload.customer.id),
    });
  }
  const { signalKeys } = await emitIdentityObservations(supabase, merchantId, entities);
  await resolveIdentitiesForKeys(supabase, signalKeys);
}

function detectRefundType(payload: Record<string, any>, refundedAmount: number): boolean | null {
  const refundLineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [];
  const orderLineItems = Array.isArray(payload.order?.line_items) ? payload.order.line_items : [];
  if (refundLineItems.length > 0 && orderLineItems.length > 0) {
    return refundLineItems.length >= orderLineItems.length;
  }
  const total = moneyValue(payload.order?.total_price ?? payload.order?.current_total_price);
  if (total !== null && refundedAmount > 0) return refundedAmount >= total;
  return null;
}

async function processRefundTopic(
  supabase: ServiceClient,
  merchantId: string,
  payload: Record<string, any>,
  rawBody: string,
) {
  const orderExternalId = payload.order_id != null ? String(payload.order_id) : null;
  if (!orderExternalId) return;
  const order = await findOrderByExternalId(supabase, merchantId, orderExternalId);
  if (!order) return;
  const refundedAmount = Number(
    payload.transactions?.reduce((sum: number, tx: any) => {
      const amount = Number(tx?.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0) ?? 0,
  );
  const { error } = await supabase
    .from('source_refunds')
    .upsert(
      {
        merchant_id: merchantId,
        source_order_id: order.id,
        external_id: String(payload.id),
        amount: Number.isFinite(refundedAmount) ? refundedAmount : null,
        currency: payload.currency ?? payload.order?.currency ?? null,
        reason: payload.note ?? payload.reason ?? null,
        is_full_refund: detectRefundType(payload, refundedAmount),
        refunded_at: payload.created_at ?? null,
        raw_payload_hash: crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex'),
      },
      { onConflict: 'merchant_id,source_order_id,external_id' },
    );
  if (error) throw new Error(`source_refund_upsert_failed: ${error.message}`);
}

async function processFulfillmentTopic(
  supabase: ServiceClient,
  merchantId: string,
  payload: Record<string, any>,
) {
  const orderExternalId = payload.order_id != null ? String(payload.order_id) : null;
  if (!orderExternalId) return;
  const order = await findOrderByExternalId(supabase, merchantId, orderExternalId);
  if (!order) return;
  const { error } = await supabase
    .from('source_fulfillments')
    .upsert(
      {
        merchant_id: merchantId,
        source_order_id: order.id,
        external_id: String(payload.id),
        status: payload.status ?? null,
        shipment_status: typeof payload.shipment_status === 'string' ? payload.shipment_status : null,
        tracking_company: payload.tracking_company ?? null,
        tracking_number: payload.tracking_number ?? null,
        occurred_at: payload.created_at ?? null,
        updated_at_source: payload.updated_at ?? null,
      },
      { onConflict: 'merchant_id,source_order_id,external_id' },
    );
  if (error) throw new Error(`source_fulfillment_upsert_failed: ${error.message}`);
}

function mapDisputeStatusToClaimStatus(status: unknown): 'escalated' | 'resolved_won' | 'resolved_lost' {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (['won', 'charge_won', 'resolved_won'].includes(normalized)) return 'resolved_won';
  if (['lost', 'accepted', 'charge_refunded', 'resolved_lost'].includes(normalized)) return 'resolved_lost';
  return 'escalated';
}

async function processDisputeTopic(
  supabase: ServiceClient,
  merchantId: string,
  payload: Record<string, any>,
  topic: string,
  now: string,
) {
  const orderExternalId =
    payload.order_id != null
      ? String(payload.order_id)
      : payload.order?.id != null
        ? String(payload.order.id)
        : null;
  if (!orderExternalId || payload.id == null) return;
  const order = await findOrderByExternalId(supabase, merchantId, orderExternalId);

  const { error: de } = await supabase
    .from('source_disputes')
    .upsert(
      {
        merchant_id: merchantId,
        source_order_id: order?.id ?? null,
        external_id: String(payload.id),
        dispute_type: payload.type ?? 'chargeback',
        reason: payload.reason ?? payload.dispute_reason ?? null,
        amount: moneyValue(payload.amount ?? payload.disputed_amount),
        currency: payload.currency ?? null,
        status: typeof payload.status === 'string' ? payload.status : null,
        initiated_at: payload.created_at ?? null,
        finalized_at: payload.finalized_on ?? null,
      },
      { onConflict: 'merchant_id,external_id' },
    );
  if (de) throw new Error(`source_dispute_upsert_failed: ${de.message}`);

  if (!order) return;

  const claimStatus = mapDisputeStatusToClaimStatus(payload.status);
  const { data: existingClaim, error: ce } = await supabase
    .from('claims')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source_order_id', order.id)
    .eq('claim_type', 'chargeback')
    .eq('detection_method', 'platform_dispute')
    .maybeSingle();
  if (ce) throw new Error(`claim_lookup_failed: ${ce.message}`);

  if (existingClaim) {
    if (topic === 'disputes/update' || topic === 'disputes/updated') {
      const { error } = await supabase
        .from('claims')
        .update({ status: claimStatus, updated_at: now })
        .eq('id', existingClaim.id);
      if (error) throw new Error(`claim_update_failed: ${error.message}`);
    }
    return;
  }

  const { data: claim, error: ci } = await supabase
    .from('claims')
    .insert({
      merchant_id: merchantId,
      source_order_id: order.id,
      claim_type: 'chargeback',
      status: claimStatus,
      detection_method: 'platform_dispute',
      detection_detail: { shopify_dispute_id: String(payload.id), topic },
      reason_raw: payload.reason ?? payload.dispute_reason ?? null,
      reason_normalized: 'dispute',
      amount_at_risk: moneyValue(payload.amount ?? payload.disputed_amount),
      currency: payload.currency ?? null,
      submitted_at: payload.created_at ?? now,
    })
    .select('id')
    .single();
  if (ci) throw new Error(`claim_insert_failed: ${ci.message}`);

  const { error: ee } = await supabase.from('claim_events').insert({
    claim_id: claim.id,
    merchant_id: merchantId,
    event_type: 'created',
    to_status: claimStatus,
    metadata: { triggered_by: 'shopify_dispute', shopify_dispute_id: String(payload.id), topic },
  });
  if (ee) throw new Error(`claim_event_insert_failed: ${ee.message}`);

  await linkClaimToIdentity(supabase, claim.id, order.id);
}

async function processCancellationTopic(
  supabase: ServiceClient,
  merchantId: string,
  payload: Record<string, any>,
  now: string,
) {
  const externalId = payload?.id != null ? String(payload.id) : null;
  if (!externalId) return;
  const order = await findOrderByExternalId(supabase, merchantId, externalId);
  if (!order) return;
  const { error } = await supabase
    .from('source_orders')
    .update({
      cancelled_at: payload.cancelled_at ?? now,
      cancel_reason: payload.cancel_reason ?? null,
      financial_status: mapFinancialStatus(payload.financial_status ?? 'cancelled'),
      updated_at: now,
    })
    .eq('id', order.id);
  if (error) throw new Error(`order_cancel_update_failed: ${error.message}`);
  const { error: ve } = await supabase
    .from('claims')
    .update({ status: 'voided', updated_at: now })
    .eq('merchant_id', merchantId)
    .eq('source_order_id', order.id)
    .in('status', ['pending', 'open', 'escalated']);
  if (ve) throw new Error(`claim_void_failed: ${ve.message}`);
}

async function ingestEmbeddedOrderChildren(
  supabase: ServiceClient,
  merchantId: string,
  orderPayload: Record<string, any>,
) {
  const orderId = orderPayload.id != null ? String(orderPayload.id) : null;
  if (!orderId) return;
  const refunds = Array.isArray(orderPayload.refunds) ? orderPayload.refunds : [];
  for (const refund of refunds) {
    if (!refund || typeof refund !== 'object') continue;
    const payload = { ...refund, order_id: (refund as Record<string, unknown>).order_id ?? orderId, order: orderPayload };
    await processRefundTopic(supabase, merchantId, payload, JSON.stringify(payload));
  }

  const fulfillments = Array.isArray(orderPayload.fulfillments) ? orderPayload.fulfillments : [];
  for (const fulfillment of fulfillments) {
    if (!fulfillment || typeof fulfillment !== 'object') continue;
    const payload = { ...fulfillment, order_id: (fulfillment as Record<string, unknown>).order_id ?? orderId };
    await processFulfillmentTopic(supabase, merchantId, payload);
  }
}

export async function processShopifyOrderPayload(input: {
  supabase: ServiceClient;
  shopDomain: string;
  payload: Record<string, any>;
  rawBody?: string;
  ingestEmbeddedResources?: boolean;
}): Promise<{ ingested: boolean; merchantId: string | null; connectionId: string | null }> {
  const now = new Date().toISOString();
  const connection = await resolveStoreConnection(input.supabase, input.shopDomain);
  if (!connection) {
    console.warn('Shopify order for unknown store skipped', { shopDomain: input.shopDomain });
    return { ingested: false, merchantId: null, connectionId: null };
  }
  if (input.payload?.id == null) {
    return { ingested: false, merchantId: connection.merchant_id, connectionId: connection.id };
  }

  const rawBody = input.rawBody ?? JSON.stringify(input.payload);
  await processOrderTopic(input.supabase, connection.merchant_id, connection.id, input.payload, rawBody, now);
  if (input.ingestEmbeddedResources) {
    await ingestEmbeddedOrderChildren(input.supabase, connection.merchant_id, input.payload);
  }
  return { ingested: true, merchantId: connection.merchant_id, connectionId: connection.id };
}

export async function processShopifyWebhook(input: {
  rawBody: string;
  shopDomain: string;
  topic: string;
  supabaseClient?: ServiceClient;
}): Promise<void> {
  const payload = JSON.parse(input.rawBody) as Record<string, any>;
  if (payload?.test === true) return;
  const now = new Date().toISOString();
  const supabase = input.supabaseClient ?? createServiceClient();

  const connection = await resolveStoreConnection(supabase, input.shopDomain);
  if (!connection) {
    console.warn('Shopify webhook for unknown store skipped', { shopDomain: input.shopDomain, topic: input.topic });
    return;
  }

  if (input.topic === 'app/uninstalled') {
    const { error } = await supabase
      .from('store_connections')
      .update({
        status: 'revoked',
        uninstalled_at: now,
        updated_at: now,
      })
      .eq('id', connection.id);
    if (error) throw new Error(`store_connection_uninstall_failed: ${error.message}`);
    return;
  }

  if (input.topic === 'orders/create' || input.topic === 'orders/updated') {
    if (payload?.id == null) return;
    await processOrderTopic(supabase, connection.merchant_id, connection.id, payload, input.rawBody, now);
    await ingestEmbeddedOrderChildren(supabase, connection.merchant_id, payload);
    const visitorId = extractUnauthVisitorId(payload);
    if (visitorId) {
      try {
        await linkCheckoutSignalsToOrder(supabase, {
          merchantId: connection.merchant_id,
          platformOrderId: String(payload.id),
          visitorId,
          platform: 'shopify',
        });
      } catch (error) {
        console.error('Shopify checkout signal order link failed', {
          shopDomain: input.shopDomain,
          orderId: String(payload.id),
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  } else if (input.topic === 'refunds/create') {
    await processRefundTopic(supabase, connection.merchant_id, payload, input.rawBody);
  } else if (input.topic === 'fulfillments/create' || input.topic === 'fulfillments/update') {
    await processFulfillmentTopic(supabase, connection.merchant_id, payload);
  } else if (input.topic === 'orders/cancelled') {
    await processCancellationTopic(supabase, connection.merchant_id, payload, now);
  } else if (input.topic === 'disputes/create' || input.topic === 'disputes/update' || input.topic === 'disputes/updated') {
    await processDisputeTopic(supabase, connection.merchant_id, payload, input.topic, now);
  }
}
