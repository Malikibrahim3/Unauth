import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeAddress, normalizeEmail, normalizePhone, type MerchantIdentityInsert, upsertMerchantIdentityRows } from '@/lib/shopify/identity';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';

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
  }

  if (topic === 'refunds/create') {
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

  void processWebhook(rawBody, shopDomain, topic).then(async () => {
    await supabase
      .from('processed_webhooks' as any)
      .update({
        status: 'completed',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('webhook_id', webhookId);
  }).catch(async (err) => {
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
  });

  return NextResponse.json({ ok: true });
}
