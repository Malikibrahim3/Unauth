import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeAddress, normalizeEmail, normalizePhone, type MerchantIdentityInsert, upsertMerchantIdentityRows } from '@/lib/shopify/identity';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';
import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';
import { enqueueShopifyOrderAuditScore, resolveMerchantIdForShop } from '@/lib/shopify/auditBridge';
import { buildShopifyOrderSignalRow } from '@/lib/shopify/orderSignals';
import { upsertMerchantClaim } from '@/lib/claims/store';
import { appendClaimEvent } from '@/lib/claims/events';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';

async function markShopifyTokenRevoked(supabase: any, shopDomain: string, now = new Date().toISOString()) {
  await supabase
    .from('shopify_merchants' as any)
    .update({ access_token: null, updated_at: now })
    .eq('shop_domain', shopDomain);
  await supabase
    .from('merchant_shopify_connections' as any)
    .update({ active: false, updated_at: now })
    .eq('shop_domain', shopDomain);
}

async function fetchShopifyCustomerIdentity(input: {
  shopDomain: string;
  customerId: string;
  supabase: any;
}) {
  const { shopDomain, customerId, supabase } = input;
  const tokenRes = await supabase
    .from('shopify_merchants' as any)
    .select('access_token')
    .eq('shop_domain', shopDomain)
    .maybeSingle();
  const accessToken = tokenRes.data?.access_token as string | null | undefined;
  if (!accessToken) return null;

  const url = `https://${shopDomain}/admin/api/2025-10/customers/${customerId}.json?fields=id,email,phone,default_address`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    await markShopifyTokenRevoked(supabase, shopDomain);
    return null;
  }
  if (!res.ok) return null;
  const payload = (await res.json()) as any;
  return payload?.customer ?? null;
}

function moneyValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function detectRefundType(payload: any, refundedAmount: number): 'full' | 'partial' | 'unknown' {
  const refundLineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [];
  const orderLineItems = Array.isArray(payload.order?.line_items) ? payload.order.line_items : [];
  if (refundLineItems.length > 0 && orderLineItems.length > 0) {
    return refundLineItems.length >= orderLineItems.length ? 'full' : 'partial';
  }

  const total = moneyValue(payload.order?.total_price ?? payload.order?.current_total_price);
  if (total !== null && refundedAmount > 0) {
    return refundedAmount >= total ? 'full' : 'partial';
  }

  return refundLineItems.length > 0 ? 'partial' : 'unknown';
}

function mapDisputeStatusToClaimStatus(status: unknown): 'escalated' | 'resolved_won' | 'resolved_lost' {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (['won', 'charge_won', 'resolved_won'].includes(normalized)) return 'resolved_won';
  if (['lost', 'accepted', 'charge_refunded', 'resolved_lost'].includes(normalized)) return 'resolved_lost';
  return 'escalated';
}

async function upsertShopifyDisputeClaim(input: {
  supabase: any;
  shopDomain: string;
  payload: any;
  topic: string;
  now: string;
}) {
  const orderId = input.payload.order_id ?? input.payload.order?.id ?? null;
  if (!orderId) return null;

  const merchantId = await resolveMerchantIdForShop(input.supabase, input.shopDomain);
  if (!merchantId) return null;

  const claim = await upsertMerchantClaim(
    input.supabase,
    {
      merchant_id: merchantId,
      shop_domain: input.shopDomain,
      shopify_order_id: String(orderId),
      claim_type: 'chargeback',
      status: mapDisputeStatusToClaimStatus(input.payload.status),
      customer_claim_reason: input.payload.reason ?? input.payload.dispute_reason ?? null,
      normalized_reason: 'dispute',
      amount_at_risk: moneyValue(input.payload.amount ?? input.payload.disputed_amount),
      currency: input.payload.currency ?? null,
      submitted_at: input.payload.created_at ?? input.now,
      detection_method: 'shopify_dispute',
      requires_merchant_review: false,
    },
    { ignoreDuplicates: input.topic === 'disputes/create' }
  );
  await appendClaimEvent(input.supabase, {
    claim_id: claim.id,
    merchant_id: merchantId,
    shop_domain: input.shopDomain,
    event_type: input.topic === 'disputes/create' ? 'claim_created' : 'status_changed',
    new_status: claim.status,
    triggered_by: 'shopify_dispute',
    metadata: {
      triggered_by: 'shopify_dispute',
      shopify_dispute_id: input.payload.id ? String(input.payload.id) : null,
      topic: input.topic,
    },
  });
  return claim;
}

export async function processWebhook(rawBody: string, shopDomain: string, topic: string, supabaseClient?: any) {
  const payload = JSON.parse(rawBody) as any;
  const now = new Date().toISOString();
  const supabase = supabaseClient ?? createServiceClient();
  const rows: MerchantIdentityInsert[] = [];
  const payloadHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');

  if (topic === 'app/uninstalled') {
    await supabase
      .from('shopify_merchants' as any)
      .update({
        access_token: null,
        uninstalled_at: now,
        updated_at: now,
      })
      .eq('shop_domain', shopDomain);
    await supabase
      .from('merchant_shopify_connections' as any)
      .update({
        active: false,
        uninstalled_at: now,
        updated_at: now,
      })
      .eq('shop_domain', shopDomain);
    return;
  }

  if (payload?.test === true) return;

  if (topic === 'orders/create' || topic === 'orders/updated') {
    const customerId = payload.customer?.id ? String(payload.customer.id) : null;
    let email = normalizeEmail(payload.email ?? payload.contact_email ?? payload.customer?.email ?? null);
    let phone = normalizePhone(payload.phone ?? payload.customer?.phone ?? null);
    let shippingAddress = normalizeAddress(payload.shipping_address ?? payload.customer?.default_address ?? null);
    let billingAddress = normalizeAddress(payload.billing_address ?? payload.customer?.default_address ?? null);

    if (customerId && (!email || !shippingAddress || !billingAddress)) {
      const hydrated = await fetchShopifyCustomerIdentity({
        shopDomain,
        customerId,
        supabase,
      });
      if (hydrated) {
        email = email ?? normalizeEmail(hydrated.email);
        phone = phone ?? normalizePhone(hydrated.phone);
        shippingAddress = shippingAddress ?? normalizeAddress(hydrated.default_address);
        billingAddress = billingAddress ?? normalizeAddress(hydrated.default_address);
      }
    }

    rows.push({
      shop_domain: shopDomain,
      source: 'order',
      source_id: String(payload.id),
      email,
      phone,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      customer_id: customerId,
      updated_at: now,
    });

    await supabase
      .from('shopify_order_signals' as any)
      .upsert(buildShopifyOrderSignalRow(shopDomain, payload, rawBody), {
        onConflict: 'shop_domain,shopify_order_id',
      });
  }

  if (topic === 'refunds/create') {
    const refundedAmount = Number(payload.transactions?.reduce((sum: number, tx: any) => {
      const amount = Number(tx?.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0) ?? 0);
    const refundType = detectRefundType(payload, Number.isFinite(refundedAmount) ? refundedAmount : 0);
    await supabase
      .from('shopify_refund_events' as any)
      .upsert({
        shop_domain: shopDomain,
        shopify_order_id: payload.order_id ? String(payload.order_id) : null,
        refund_id: String(payload.id),
        refunded_amount: Number.isFinite(refundedAmount) ? refundedAmount : 0,
        currency: payload.currency ?? null,
        refund_reason: payload.note ?? payload.reason ?? null,
        refund_type: refundType,
        refunded_line_items_count: Array.isArray(payload.refund_line_items) ? payload.refund_line_items.length : 0,
        created_at_shopify: payload.created_at ?? null,
        raw_payload_hash: payloadHash,
        updated_at: now,
      }, { onConflict: 'shop_domain,refund_id' });

    rows.push({
      shop_domain: shopDomain,
      source: 'refund',
      source_id: String(payload.id),
      email: normalizeEmail(payload.order?.email ?? payload.email),
      phone: normalizePhone(payload.order?.phone ?? payload.phone),
      shipping_address: normalizeAddress(payload.order?.shipping_address),
      billing_address: normalizeAddress(payload.order?.billing_address),
      customer_id: payload.order?.customer?.id ? String(payload.order.customer.id) : null,
      updated_at: now,
    });
  }

  if (topic === 'fulfillments/create' || topic === 'fulfillments/update') {
    const trackingNumberRaw = payload.tracking_number ?? payload.shipment_status?.tracking_number ?? null;
    const trackingNumberHash = typeof trackingNumberRaw === 'string' && trackingNumberRaw.trim()
      ? crypto.createHash('sha256').update(trackingNumberRaw.trim(), 'utf8').digest('hex')
      : null;
    const trackingUrlsCount = Array.isArray(payload.tracking_urls) ? payload.tracking_urls.length : 0;
    await supabase
      .from('shopify_fulfillment_events' as any)
      .upsert({
        shop_domain: shopDomain,
        shopify_order_id: payload.order_id ? String(payload.order_id) : null,
        fulfillment_id: String(payload.id),
        tracking_company: payload.tracking_company ?? null,
        tracking_number_hash: trackingNumberHash,
        tracking_urls_count: trackingUrlsCount,
        shipment_status: payload.shipment_status ?? null,
        status: payload.status ?? null,
        created_at_shopify: payload.created_at ?? null,
        updated_at_shopify: payload.updated_at ?? null,
        raw_payload_hash: payloadHash,
        updated_at: now,
      }, { onConflict: 'shop_domain,fulfillment_id' });
  }

  if (topic === 'orders/cancelled') {
    const merchantId = await resolveMerchantIdForShop(supabase, shopDomain);
    const orderId = payload?.id ? String(payload.id) : null;
    if (merchantId && orderId) {
      const { data: voidedClaims } = await supabase
        .from('merchant_claims' as any)
        .update({
          status: 'voided',
          updated_at: now,
        })
        .eq('merchant_id', merchantId)
        .eq('shop_domain', shopDomain)
        .eq('shopify_order_id', orderId)
        .select('id,status');
      for (const claim of voidedClaims ?? []) {
        await appendClaimEvent(supabase, {
          claim_id: claim.id,
          merchant_id: merchantId,
          shop_domain: shopDomain,
          event_type: 'status_changed',
          new_status: 'voided',
          triggered_by: 'shopify_order_cancelled',
          metadata: {
            triggered_by: 'shopify_order_cancelled',
            shopify_order_id: orderId,
          },
        });
      }
    }
  }

  if (topic === 'disputes/create' || topic === 'disputes/updated') {
    rows.push({
      shop_domain: shopDomain,
      source: 'dispute',
      source_id: String(payload.id),
      email: normalizeEmail(payload.evidence?.customer_email ?? payload.customer_email ?? null),
      phone: normalizePhone(payload.evidence?.customer_phone ?? null),
      shipping_address: null,
      billing_address: null,
      customer_id: payload.customer_id ? String(payload.customer_id) : null,
      updated_at: now,
    });
    await upsertShopifyDisputeClaim({ supabase, shopDomain, payload, topic, now });
  }

  if (rows.length) {
    await upsertMerchantIdentityRows(supabase, rows);
  }

  if (topic === 'orders/create' || topic === 'orders/updated') {
    const orderId = payload?.id ? String(payload.id) : null;
    const syncResult = await syncShopifyProfilesForShop({
      shopDomain,
      supabase,
      onlyOrderIds: orderId ? [orderId] : undefined,
    });
    console.info('Shopify profile sync result', {
      shopDomain,
      topic,
      orderId,
      groups: syncResult.groups,
      profilesCreated: syncResult.profilesCreated,
      profilesLinked: syncResult.profilesLinked,
      identitiesUpserted: syncResult.identitiesUpserted,
    });

    if (orderId) {
      enqueueShopifyOrderAuditScore({
        supabase,
        shopDomain,
        shopifyOrderId: orderId,
      });
    }
  }
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const shopDomain = request.headers.get('x-shopify-shop-domain');
  const topic = request.headers.get('x-shopify-topic');
  const webhookId = request.headers.get('x-shopify-webhook-id');
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'shopify', shopDomain ?? getClientIp(request.headers)),
    limitFromEnv('SHOPIFY_WEBHOOK_RATE_LIMIT', 1000, 60)
  );
  if (limited) return limited;

  const rawBody = await request.text();

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }
  if (!shopDomain || !topic || !webhookId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing, error: readError } = await supabase
    .from('processed_webhooks' as any)
    .select('webhook_id,status,attempts')
    .eq('webhook_id', webhookId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: 'Failed to read webhook status' }, { status: 500 });
  }

  if (existing?.status === 'completed') {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const nextAttempts = Number(existing?.attempts ?? 0) + 1;
  const { error: claimError } = await supabase
    .from('processed_webhooks' as any)
    .upsert({
      webhook_id: webhookId,
      status: 'processing',
      attempts: nextAttempts,
      last_error: null,
      topic,
      shop_domain: shopDomain,
      updated_at: new Date().toISOString(),
    });
  if (claimError) {
    return NextResponse.json({ error: 'Failed to claim webhook' }, { status: 500 });
  }

  try {
    await processWebhook(rawBody, shopDomain, topic);
    await supabase
      .from('processed_webhooks' as any)
      .update({
        status: 'completed',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('webhook_id', webhookId);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'webhook_processing_failed';
    await supabase
      .from('processed_webhooks' as any)
      .update({
        status: 'failed',
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq('webhook_id', webhookId);
    console.error('Shopify webhook processing failed', {
      webhookId,
      topic,
      shopDomain,
      message,
    });
  }

  return NextResponse.json({ ok: true });
}
