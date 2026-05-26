import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeAddress, normalizeEmail, normalizePhone, type MerchantIdentityInsert, upsertMerchantIdentityRows } from '@/lib/shopify/identity';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';

async function processWebhook(rawBody: string, shopDomain: string, topic: string) {
  const payload = JSON.parse(rawBody) as any;
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const rows: MerchantIdentityInsert[] = [];

  if (topic === 'orders/create' || topic === 'orders/updated') {
    rows.push({
      shop_domain: shopDomain,
      source: 'order',
      source_id: String(payload.id),
      email: normalizeEmail(payload.email),
      phone: normalizePhone(payload.phone),
      shipping_address: normalizeAddress(payload.shipping_address),
      billing_address: normalizeAddress(payload.billing_address),
      customer_id: payload.customer?.id ? String(payload.customer.id) : null,
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
  const { error: claimError } = await supabase
    .from('processed_webhooks' as any)
    .insert({ webhook_id: webhookId });
  if (claimError) {
    if ((claimError as any).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  void processWebhook(rawBody, shopDomain, topic).catch((err) => {
    console.error('Shopify webhook processing failed', err);
  });

  return NextResponse.json({ ok: true });
}
