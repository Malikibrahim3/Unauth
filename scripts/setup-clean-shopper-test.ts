/**
 * PRODUCTION WRITES (test data only): set up a clean, NON-COLLIDING shopper to
 * demonstrate the full Gorgias claim path end-to-end. The shopper email must NOT
 * be the Gorgias API/account email, a connected Gmail channel, the support inbox,
 * or any agent/user email (otherwise the widget's exclusion logic — correctly —
 * refuses to resolve it). See scripts/README or test notes.
 *
 * Does, in order:
 *   1. Create a Shopify order for the clean email (Admin API).
 *   2. Ingest it via the SAME production builders the order webhook uses
 *      (merchant_identities + shopify_order_signals + syncShopifyProfilesForShop)
 *      — targeted to this one order, no full store backfill.
 *   3. Create a genuine customer-authored Gorgias ticket (from_agent=false) for
 *      the clean email referencing the new order number.
 *
 * Masks emails; never prints tokens/secrets/raw payloads.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import {
  normalizeEmail,
  normalizeAddress,
  upsertMerchantIdentityRows,
  type MerchantIdentityInsert,
} from '@/lib/shopify/identity';
import { buildShopifyOrderSignalRow } from '@/lib/shopify/orderSignals';
import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const SHOP_DOMAIN = requiredControlledAccountEnv('E2E_SHOPIFY_STORE_DOMAIN');
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || '';
const SUPPORT_INBOX = 'mvr4w50490yo6z7l@email.gorgias.com';

// Clean shopper: not the API/account email (simeonmurray123@gmail.com), not a
// Gmail channel, not the support inbox. example.com is safe and non-deliverable.
const SHOPPER_EMAIL = 'inr.shopper.qa@example.com';
const SUBJECT_TEMPLATE = (n: string | number) => `Order #${n} not received`;
const BODY = "Hi, I still haven't received my order. I'd like a refund please.";

function maskEmail(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.includes('@')) return '(none)';
  const at = raw.indexOf('@');
  return `${raw.slice(0, 2)}***@${raw[at + 1]}***`;
}

async function shopifyAdmin(path: string, init: RequestInit): Promise<any> {
  const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/2025-10${path}`, {
    ...init,
    headers: { 'X-Shopify-Access-Token': ADMIN_TOKEN, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Shopify ${path} ${res.status}: ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

async function main() {
  if (!ADMIN_TOKEN) { console.error('SHOPIFY_ADMIN_API_TOKEN missing.'); process.exit(1); }
  const supabase = createServiceClient();

  // Pre-flight: guarantee the clean email does not collide with the Gorgias API account.
  const access = await getActiveGorgiasMerchantApiAccess(supabase, MERCHANT_ID);
  if (!access) { console.error('No Gorgias API access.'); process.exit(1); }
  if (normalizeEmail(access.credentials.email) === normalizeEmail(SHOPPER_EMAIL) ||
      normalizeEmail(SUPPORT_INBOX) === normalizeEmail(SHOPPER_EMAIL)) {
    console.error('Chosen shopper email collides with the Gorgias account/support inbox. Pick another.');
    process.exit(1);
  }
  console.log(`Clean shopper: ${maskEmail(SHOPPER_EMAIL)} (no collision with API/account/support inbox)\n`);

  // 1) Create a Shopify order for the clean shopper (requires write_orders scope).
  //    If the Admin token lacks that scope, fall back to referencing an existing
  //    order number so order_ref still links to a real Shopify order. The widget's
  //    "orders here" then comes from the claim-summary rollup.
  const FALLBACK_ORDER_NUMBER = '1008';
  let orderNumber = FALLBACK_ORDER_NUMBER;
  let orderId: string | null = null;
  console.log('1. Creating Shopify order…');
  try {
    const orderResp = await shopifyAdmin('/orders.json', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          email: SHOPPER_EMAIL,
          financial_status: 'paid',
          send_receipt: false,
          send_fulfillment_receipt: false,
          line_items: [{ title: 'INR Test Item', price: '1025.00', quantity: 1 }],
          customer: { email: SHOPPER_EMAIL, first_name: 'QA', last_name: 'Shopper' },
          shipping_address: {
            first_name: 'QA', last_name: 'Shopper', address1: '1 Test Way',
            city: 'London', zip: 'EC1A 1BB', country: 'United Kingdom',
          },
        },
      }),
    });
    const order = orderResp.order;
    orderId = String(order.id);
    orderNumber = String(order.order_number ?? order.name ?? '').replace('#', '');
    console.log(`   created order id=${orderId} number=#${orderNumber} total=${order.total_price}`);

    // 2) Targeted ingest via production builders (mirrors the orders/create webhook).
    console.log('2. Ingesting order into Supabase (merchant_identities + signals + profile sync)…');
    const now = new Date().toISOString();
    const idRow: MerchantIdentityInsert = {
      shop_domain: SHOP_DOMAIN,
      source: 'order',
      source_id: orderId,
      email: normalizeEmail(order.email),
      phone: null,
      shipping_address: normalizeAddress(order.shipping_address),
      billing_address: normalizeAddress(order.billing_address),
      customer_id: order.customer?.id ? String(order.customer.id) : null,
      updated_at: now,
    };
    await upsertMerchantIdentityRows(supabase, [idRow]);
    await supabase
      .from('shopify_order_signals' as never)
      .upsert(buildShopifyOrderSignalRow(SHOP_DOMAIN, order) as never, {
        onConflict: 'shop_domain,shopify_order_id',
      });
    const sync = await syncShopifyProfilesForShop({ shopDomain: SHOP_DOMAIN, supabase, onlyOrderIds: [orderId] });
    console.log(`   profile sync: ${JSON.stringify(sync)}`);
  } catch (e) {
    console.log(`   ⚠️  Shopify order creation unavailable (${(e as Error).message.slice(0, 80)})`);
    console.log(`   → Falling back to existing order #${FALLBACK_ORDER_NUMBER} for order_ref linkage.`);
    console.log('      (No merchant_identities row for the clean email; widget order count comes from claim summary.)');
  }

  // 3) Create a genuine inbound customer-authored Gorgias ticket.
  console.log('3. Creating customer-authored Gorgias ticket…');
  const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
  const creds = { email: access.credentials.email, api_key: access.credentials.api_key };
  const subject = SUBJECT_TEMPLATE(orderNumber);
  const created = await gorgiasApiRequest<Record<string, unknown>>(apiBase, '/tickets', creds, {
    method: 'POST',
    body: JSON.stringify({
      channel: 'email', via: 'email', subject,
      customer: { email: SHOPPER_EMAIL },
      messages: [{
        channel: 'email', via: 'email', from_agent: false, subject,
        body_text: BODY, body_html: `<p>${BODY}</p>`,
        sender: { email: SHOPPER_EMAIL }, receiver: { email: SUPPORT_INBOX },
        source: { type: 'email', from: { address: SHOPPER_EMAIL }, to: [{ address: SUPPORT_INBOX }] },
      }],
    }),
  });
  const ticketId = String(created.id ?? '');
  console.log(`   created ticket id=${ticketId} subject="${subject}"`);

  console.log('\n──────── Next steps ────────');
  console.log(`Shopper email : ${SHOPPER_EMAIL}`);
  console.log(`Order number  : #${orderNumber}  (shopify_order_id ${orderId})`);
  console.log(`Ticket id     : ${ticketId}`);
  console.log(`Reprocess     : scripts/reprocess-gorgias-ticket.ts ${ticketId}`);
  console.log(`Diagnose      : scripts/diagnose-customer-sync.ts (set email=${SHOPPER_EMAIL})`);
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
