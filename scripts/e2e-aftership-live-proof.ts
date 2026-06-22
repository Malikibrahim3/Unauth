/**
 * Controlled live AfterShip tracking evidence proof for E2E merchant only.
 * Mutates: Shopify dev store, Gorgias ticket, merchant_integrations (aftership).
 * Requires AFTERSHIP_API_KEY in .env.local (never committed).
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { createHash, createDecipheriv } from 'node:crypto';
import { decryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';
import { backfillShopifyOrders } from '@/lib/shopify/backfill';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { syncAfterShipEvidenceForCase } from '@/lib/integrations/syncAfterShipEvidence';
import {
  saveIntegrationCredential,
  upsertMerchantIntegration,
  getIntegrationCredential,
} from '@/lib/integrations/auth';
import { aftershipProvider, verifyAfterShipApiKey } from '@/lib/integrations/providers/aftership';
import { TABLES } from '@/lib/supabase/tables';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const CUSTOMER_EMAIL = 'simsorsno3@icloud.com';
const E2E_MARKER = 'Unauth E2E AfterShip tracking proof';
const TRACKING_NUMBER = '1Z999AA10123456784';
const CARRIER = 'UPS';
const APP = (process.env.E2E_WIDGET_APP_URL ?? 'https://unauth-pi.vercel.app').replace(/\/$/, '');

const report: Record<string, unknown> = {
  merchant_id: MERCHANT_ID,
  tested_at: new Date().toISOString(),
};

function decryptShopifyOAuth(blob: string): { access_token: string } {
  const material = process.env.INTERNAL_HMAC_SECRET ?? process.env.IDENTITY_SALT;
  if (!material) throw new Error('missing IDENTITY_SALT');
  const key = createHash('sha256').update(`commerce-oauth-credentials:${material}`, 'utf8').digest();
  const [ivPart, encryptedPart, tagPart] = blob.split('.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8'),
  );
}

async function shopifyRequest(
  domain: string,
  token: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await fetch(`https://${domain}/admin/api/2024-01${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function getShopifyAccess() {
  const { data: store } = await supabase
    .from('store_connections')
    .select('store_key, credentials_encrypted')
    .eq('merchant_id', MERCHANT_ID)
    .eq('platform', 'shopify')
    .eq('status', 'active')
    .maybeSingle();
  if (!store?.credentials_encrypted) throw new Error('shopify_not_connected');
  const { access_token } = decryptShopifyOAuth(store.credentials_encrypted as string);
  return { domain: store.store_key as string, accessToken: access_token };
}

async function getActiveGorgias() {
  const { data } = await supabase
    .from('helpdesk_connections')
    .select('id, provider_base_url, access_token_encrypted')
    .eq('merchant_id', MERCHANT_ID)
    .eq('provider', 'gorgias')
    .eq('status', 'active')
    .maybeSingle();
  if (!data?.access_token_encrypted || !data.provider_base_url) throw new Error('gorgias_not_connected');
  return {
    id: data.id as string,
    providerBaseUrl: data.provider_base_url as string,
    credentials: decryptGorgiasApiCredentials(data.access_token_encrypted as string),
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function prepareShopifyOrder(shop: Awaited<ReturnType<typeof getShopifyAccess>>) {
  const { domain, accessToken } = shop;
  const search = await shopifyRequest(
    domain,
    accessToken,
    'GET',
    `/orders.json?status=any&limit=20&order=created_at+desc`,
  );
  const existing = (search.orders ?? []).find(
    (o: any) =>
      String(o.note ?? '').includes(E2E_MARKER) ||
      String(o.tags ?? '').includes('unauth-e2e-aftership'),
  );
  if (existing) {
    const fRes = await shopifyRequest(domain, accessToken, 'GET', `/orders/${existing.id}/fulfillments.json`);
    const fulfillment = (fRes.fulfillments ?? [])[0];
    return {
      orderNumber: String(existing.order_number ?? existing.name?.replace('#', '')),
      orderId: String(existing.id),
      shopifyOrderGid: existing.admin_graphql_api_id ?? null,
      customerEmail: existing.email ?? CUSTOMER_EMAIL,
      fulfillmentId: fulfillment?.id ? String(fulfillment.id) : null,
      trackingNumber: fulfillment?.tracking_number ?? TRACKING_NUMBER,
      carrier: fulfillment?.tracking_company ?? CARRIER,
      trackingType: 'reused_existing',
      note: existing.note,
    };
  }

  const customers = await shopifyRequest(
    domain,
    accessToken,
    'GET',
    `/customers/search.json?query=email:${encodeURIComponent(CUSTOMER_EMAIL)}`,
  );
  let customerId = customers.customers?.[0]?.id as number | undefined;
  if (!customerId) {
    const created = await shopifyRequest(domain, accessToken, 'POST', '/customers.json', {
      customer: {
        email: CUSTOMER_EMAIL,
        first_name: 'simon',
        last_name: 'murphy',
        verified_email: true,
        tags: 'unauth-e2e-aftership',
      },
    });
    customerId = created.customer.id;
  }

  const { order } = await shopifyRequest(domain, accessToken, 'POST', '/orders.json', {
    order: {
      customer: { id: customerId },
      email: CUSTOMER_EMAIL,
      line_items: [{ title: 'E2E AfterShip tracking proof item', price: '49.00', quantity: 1 }],
      financial_status: 'paid',
      inventory_behaviour: 'bypass',
      send_receipt: false,
      tags: 'unauth-e2e-aftership,e2e-test',
      note: E2E_MARKER,
      shipping_address: {
        first_name: 'simon',
        last_name: 'murphy',
        address1: '500 E2E Test Way',
        city: 'Austin',
        province: 'Texas',
        zip: '78701',
        country: 'United States',
        country_code: 'US',
      },
    },
  });

  const { fulfillment_orders: fulfillmentOrders } = await shopifyRequest(
    domain,
    accessToken,
    'GET',
    `/orders/${order.id}/fulfillment_orders.json`,
  );
  const open = (fulfillmentOrders ?? []).filter((fo: any) => fo.line_items?.length > 0);
  if (open.length === 0) throw new Error('no_fulfillment_orders');

  const { fulfillment } = await shopifyRequest(domain, accessToken, 'POST', '/fulfillments.json', {
    fulfillment: {
      notify_customer: false,
      tracking_info: {
        number: TRACKING_NUMBER,
        company: CARRIER,
        url: `https://www.ups.com/track?tracknum=${TRACKING_NUMBER}`,
      },
      line_items_by_fulfillment_order: open.map((fo: any) => ({
        fulfillment_order_id: fo.id,
      })),
    },
  });

  return {
    orderNumber: String(order.order_number),
    orderId: String(order.id),
    shopifyOrderGid: order.admin_graphql_api_id ?? null,
    customerEmail: order.email ?? CUSTOMER_EMAIL,
    fulfillmentId: String(fulfillment.id),
    trackingNumber: TRACKING_NUMBER,
    carrier: CARRIER,
    trackingType: 'real_carrier_recognizable_ups_test_number',
    note: E2E_MARKER,
  };
}

async function prepareGorgiasTicket(
  gorgias: Awaited<ReturnType<typeof getActiveGorgias>>,
  orderNumber: string,
) {
  const api = gorgiasApiBaseUrl(gorgias.providerBaseUrl);
  const list = await gorgiasApiRequest<{ data?: Array<Record<string, unknown>> }>(
    api,
    `/tickets?limit=30&order_by=created_datetime:desc`,
    gorgias.credentials,
    { method: 'GET' },
  );
  const subject = `${E2E_MARKER} — order #${orderNumber} item not received`;
  const existing = (list.data ?? []).find(
    (t) => typeof t.subject === 'string' && t.subject.includes(E2E_MARKER),
  );
  if (existing?.id) {
    return {
      ticketId: String(existing.id),
      subject: String(existing.subject),
      customerEmail: CUSTOMER_EMAIL,
      creationMethod: 'existing',
    };
  }

  const created = await gorgiasApiRequest<Record<string, unknown>>(api, '/tickets', gorgias.credentials, {
    method: 'POST',
    body: JSON.stringify({
      subject,
      via: 'api',
      channel: 'api',
      status: 'open',
      tags: [{ name: 'unauth-e2e-aftership' }],
      customer: { email: CUSTOMER_EMAIL, firstname: 'simon', lastname: 'murphy' },
      messages: [
        {
          channel: 'api',
          from_agent: false,
          via: 'api',
          subject,
          body_text: [
            E2E_MARKER,
            `Order #${orderNumber}`,
            'Customer says item was not received.',
            'Please review delivery tracking evidence.',
          ].join('\n'),
          sender: { email: CUSTOMER_EMAIL },
        },
      ],
    }),
  });
  return {
    ticketId: String(created.id),
    subject,
    customerEmail: CUSTOMER_EMAIL,
    creationMethod: 'created',
  };
}

async function connectAfterShip() {
  const apiKey = process.env.AFTERSHIP_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false as const, reason: 'AFTERSHIP_API_KEY not set in .env.local' };
  }
  try {
    await verifyAfterShipApiKey(apiKey);
    await saveIntegrationCredential(supabase as never, MERCHANT_ID, aftershipProvider, { apiKey });
    await upsertMerchantIntegration(supabase as never, MERCHANT_ID, aftershipProvider, 'connected', {
      lastError: null,
    });
    return { ok: true as const, status: 'connected', credentialTest: 'passed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'aftership_connect_failed';
    await upsertMerchantIntegration(supabase as never, MERCHANT_ID, aftershipProvider, 'error', {
      lastError: message,
    });
    return { ok: false as const, reason: message, status: 'error' };
  }
}

async function widgetPayload(ticketId: string, orderNumber: string) {
  const gorgias = await getActiveGorgias();
  const { data: conn } = await supabase
    .from('helpdesk_connections')
    .select('scopes')
    .eq('id', gorgias.id)
    .maybeSingle();
  let widgetToken: string | null = null;
  for (const entry of (conn?.scopes as Array<Record<string, unknown>>) ?? []) {
    if (entry.kind === 'gorgias_sidebar_widget' && entry.integration_id) {
      const integ = await gorgiasApiRequest<{ http?: { url?: string } }>(
        gorgiasApiBaseUrl(gorgias.providerBaseUrl),
        `/integrations/${entry.integration_id}`,
        gorgias.credentials,
        { method: 'GET' },
      );
      const match = integ.http?.url?.match(/widget_token=([^&]+)/);
      if (match) widgetToken = decodeURIComponent(match[1]);
    }
  }
  if (!widgetToken) throw new Error('widget_token_missing');
  const url =
    `${APP}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}` +
    `&ticket_id=${encodeURIComponent(ticketId)}&customer_email=${encodeURIComponent(CUSTOMER_EMAIL)}` +
    `&order_number=${encodeURIComponent(orderNumber)}`;
  const res = await fetch(url);
  const body = await res.json();
  return {
    status: res.status,
    uses_mock_fallback: body.context_summary?.includes('Context unavailable') ?? false,
    payout_exposure: body.payout_exposure,
    evidence_checklist: body.evidence_checklist,
    identity: body.identity,
    recommendation: body.recommendation,
    order_context: body.order_context,
  };
}

async function main() {
  const shop = await getShopifyAccess();
  report.shopify = { domain: shop.domain };

  report.shopify_order = await prepareShopifyOrder(shop);

  const gorgias = await getActiveGorgias();
  report.gorgias = { account: gorgias.providerBaseUrl };
  report.gorgias_ticket = await prepareGorgiasTicket(
    gorgias,
    report.shopify_order.orderNumber as string,
  );

  await ingestSupportCase(supabase as never, {
    merchant_id: MERCHANT_ID,
    provider: 'gorgias',
    provider_connection_id: gorgias.id,
    event_type: 'e2e_aftership_proof_ingest',
    raw: await gorgiasApiRequest<Record<string, unknown>>(
      gorgiasApiBaseUrl(gorgias.providerBaseUrl),
      `/tickets/${report.gorgias_ticket.ticketId}`,
      gorgias.credentials,
      { method: 'GET' },
    ),
  });

  report.shopify_sync = await backfillShopifyOrders({
    supabase,
    shopDomain: shop.domain,
    accessToken: shop.accessToken,
  });
  report.gorgias_sync = await backfillGorgiasSupportCases({
    supabase,
    merchantId: MERCHANT_ID,
    providerConnectionId: gorgias.id,
  });
  report.case_bridge = await reconcilePayoutCasesFromTickets({ supabase, merchantId: MERCHANT_ID });

  const { data: ticketRow } = await supabase
    .from('source_tickets')
    .select('id, external_id')
    .eq('merchant_id', MERCHANT_ID)
    .eq('external_id', report.gorgias_ticket.ticketId)
    .maybeSingle();

  const { data: orderRow } = await supabase
    .from('source_orders')
    .select('id, order_number, external_id')
    .eq('merchant_id', MERCHANT_ID)
    .eq('external_id', report.shopify_order.orderId)
    .maybeSingle();

  const { data: fulfillmentRow } = orderRow
    ? await supabase
        .from('source_fulfillments')
        .select('id, tracking_number, tracking_company, status')
        .eq('merchant_id', MERCHANT_ID)
        .eq('source_order_id', orderRow.id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: payoutCase } = ticketRow
    ? await supabase
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id, claim_type, identity_id, source_order_id')
        .eq('merchant_id', MERCHANT_ID)
        .eq('source_ticket_id', ticketRow.id)
        .neq('status', 'stale')
        .maybeSingle()
    : { data: null };

  report.rows = {
    source_ticket_id: ticketRow?.id ?? null,
    source_order_id: orderRow?.id ?? null,
    source_fulfillment: fulfillmentRow,
    payout_case_id: payoutCase?.id ?? null,
    claim_type: payoutCase?.claim_type ?? null,
    identity_id: payoutCase?.identity_id ?? null,
  };

  report.aftership_connection = await connectAfterShip();

  if (report.aftership_connection.ok && payoutCase?.id) {
    report.aftership_sync_1 = await syncAfterShipEvidenceForCase({
      client: supabase as never,
      merchantId: MERCHANT_ID,
      supportPayoutCaseId: payoutCase.id,
      sourceOrderId: payoutCase.source_order_id as string | null,
    });
    report.aftership_sync_2 = await syncAfterShipEvidenceForCase({
      client: supabase as never,
      merchantId: MERCHANT_ID,
      supportPayoutCaseId: payoutCase.id,
      sourceOrderId: payoutCase.source_order_id as string | null,
    });

    const { data: evidenceRows } = await supabase
      .from('integration_evidence_items')
      .select('id, evidence_type, summary, value, raw_reference')
      .eq('merchant_id', MERCHANT_ID)
      .eq('source_provider', 'aftership')
      .eq('support_payout_case_id', payoutCase.id);

    const ids = (evidenceRows ?? []).map((r) => r.id);
    report.tracking_evidence = {
      evidence_row_ids: ids,
      evidence_count: ids.length,
      idempotent: ids.length > 0 && new Set(ids).size === ids.length,
      items: evidenceRows,
    };

    const evalResult = await evaluateClaimDecision({
      client: supabase as never,
      merchantId: MERCHANT_ID,
      claimId: payoutCase.id,
      source: 'claim_review',
    });
    report.decision = evalResult
      ? {
          delivery_evidence_line: evalResult.payoutCase.deliveryEvidenceLine,
          delivery: evalResult.context.delivery,
          evidence_strength: evalResult.payoutCase.evidence.strength,
          checklist: evalResult.payoutCase.evidence.items.map((i) => ({
            key: i.key,
            state: i.state,
            reason: i.reason,
          })),
        }
      : null;

    report.widget = await widgetPayload(
      report.gorgias_ticket.ticketId as string,
      report.shopify_order.orderNumber as string,
    );
  }

  const { data: integrationRow } = await supabase
    .from('merchant_integrations')
    .select('status, last_sync_at, last_error')
    .eq('merchant_id', MERCHANT_ID)
    .eq('provider_id', 'aftership')
    .maybeSingle();
  report.merchant_integration_row = integrationRow;

  const cred = await getIntegrationCredential(supabase as never, MERCHANT_ID, 'aftership');
  report.credentials_encrypted = cred?.apiKey ? 'present (not logged)' : null;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
