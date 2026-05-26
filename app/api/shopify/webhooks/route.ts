import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeAddress, normalizeEmail, normalizePhone, type MerchantIdentityInsert, upsertMerchantIdentityRows } from '@/lib/shopify/identity';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';
import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';

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
  if (!res.ok) return null;
  const payload = (await res.json()) as any;
  return payload?.customer ?? null;
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

    const shippingPrice = Array.isArray(payload.shipping_lines)
      ? payload.shipping_lines.reduce((sum: number, line: any) => {
          const v = Number(line?.price ?? 0);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0)
      : null;
    const riskRecommendation = payload?.risk?.recommendation ?? payload?.risk?.decision ?? null;
    const riskLevel = payload?.risk?.level ?? payload?.risk_level ?? null;
    const tagList = typeof payload.tags === 'string'
      ? payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
    await supabase
      .from('shopify_order_signals' as any)
      .upsert({
        shop_domain: shopDomain,
        shopify_order_id: String(payload.id),
        order_number: payload.order_number ? String(payload.order_number) : (payload.name ? String(payload.name) : null),
        customer_id: customerId,
        created_at_shopify: payload.created_at ?? null,
        total_price: payload.total_price ? Number(payload.total_price) : null,
        currency: payload.currency ?? null,
        financial_status: payload.financial_status ?? null,
        fulfillment_status: payload.fulfillment_status ?? null,
        cancelled_at: payload.cancelled_at ?? null,
        cancel_reason: payload.cancel_reason ?? null,
        refunds_count: Array.isArray(payload.refunds) ? payload.refunds.length : 0,
        discount_codes: Array.isArray(payload.discount_codes)
          ? payload.discount_codes.map((d: any) => ({
              code: d?.code ?? null,
              amount: d?.amount ?? null,
              type: d?.type ?? null,
            }))
          : [],
        payment_gateway_names: Array.isArray(payload.payment_gateway_names) ? payload.payment_gateway_names : [],
        shipping_country: payload.shipping_address?.country_code ?? payload.shipping_address?.country ?? null,
        billing_country: payload.billing_address?.country_code ?? payload.billing_address?.country ?? null,
        line_items_count: Array.isArray(payload.line_items) ? payload.line_items.length : 0,
        shipping_price: shippingPrice,
        source_name: payload.source_name ?? null,
        tags: tagList,
        landing_site: payload.landing_site ?? null,
        referring_site: payload.referring_site ?? null,
        risk_recommendation: riskRecommendation,
        risk_level: riskLevel,
        raw_payload_hash: payloadHash,
        updated_at: now,
      }, { onConflict: 'shop_domain,shopify_order_id' });
  }

  if (topic === 'refunds/create') {
    const refundedAmount = Number(payload.transactions?.reduce((sum: number, tx: any) => {
      const amount = Number(tx?.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0) ?? 0);
    await supabase
      .from('shopify_refund_events' as any)
      .upsert({
        shop_domain: shopDomain,
        shopify_order_id: payload.order_id ? String(payload.order_id) : null,
        refund_id: String(payload.id),
        refunded_amount: Number.isFinite(refundedAmount) ? refundedAmount : 0,
        currency: payload.currency ?? null,
        refund_reason: payload.note ?? payload.reason ?? null,
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

  if (topic === 'disputes/create') {
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
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const shopDomain = request.headers.get('x-shopify-shop-domain');
  const topic = request.headers.get('x-shopify-topic');
  const webhookId = request.headers.get('x-shopify-webhook-id');

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
