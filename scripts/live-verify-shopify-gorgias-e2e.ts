/**
 * Live verification: Shopify + Gorgias → visible Unauth cases (E2E merchant only).
 * Uses stored merchant credentials only (not env GORGIAS_API_TOKEN / SHOPIFY_ADMIN_API_TOKEN).
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { decryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import {
  gorgiasApiBaseUrl,
  gorgiasApiRequest,
  GorgiasSidebarRegistrationError,
} from '@/lib/support/gorgias/registerSidebarWidget';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';
import { backfillShopifyOrders } from '@/lib/shopify/backfill';
import { reconcileDeletedGorgiasTickets } from '@/lib/support/gorgias/reconcileDeletedTickets';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';
import { verifyGorgiasStoredCredentials } from '@/lib/support/gorgias/verifyStoredCredentials';
import { TABLES } from '@/lib/supabase/tables';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const APP = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Report = Record<string, unknown>;

const report: Report = {
  merchant_id: MERCHANT_ID,
  tested_at: new Date().toISOString(),
};

function assertMerchantScoped(table: string, rows: Array<{ merchant_id?: string }>) {
  for (const row of rows) {
    if (row.merchant_id && row.merchant_id !== MERCHANT_ID) {
      throw new Error(`cross_merchant_leak:${table}:${row.merchant_id}`);
    }
  }
}

async function step1GorgiasAccount() {
  const { data: connections } = await supabase
    .from('helpdesk_connections')
    .select('id,status,provider,provider_base_url,provider_account_id,provider_account_name,access_token_encrypted,last_error,last_sync_at')
    .eq('merchant_id', MERCHANT_ID)
    .eq('provider', 'gorgias');
  assertMerchantScoped('helpdesk_connections', connections ?? []);

  const active = (connections ?? []).find((c) => c.status === 'active');
  report.step1_connections = connections;
  if (!active?.access_token_encrypted || !active.provider_base_url) {
    report.step1_gorgias = { credential_status: 'reconnect_required', reason: 'no_active_credentials' };
    return null;
  }

  const credentials = decryptGorgiasApiCredentials(active.access_token_encrypted);
  let account: Record<string, unknown> | null = null;
  let credentialStatus = 'ok';
  try {
    account = await gorgiasApiRequest<Record<string, unknown>>(
      gorgiasApiBaseUrl(active.provider_base_url),
      '/account',
      credentials,
      { method: 'GET' },
    );
  } catch (error) {
    credentialStatus = 'reconnect_required';
    report.step1_gorgias = {
      active_connection_id: active.id,
      db_domain: active.provider_base_url,
      credential_status: credentialStatus,
      http_status: error instanceof GorgiasSidebarRegistrationError ? error.status : null,
      detail: error instanceof Error ? error.message : String(error),
    };
    return null;
  }

  const accountDomain =
    typeof account?.domain === 'string'
      ? account.domain
      : typeof account?.name === 'string'
        ? account.name
        : null;

  report.step1_gorgias = {
    active_connection_id: active.id,
    db_domain: active.provider_base_url,
    db_account_id: active.provider_account_id,
    credential_status: credentialStatus,
    gorgias_account: {
      domain: accountDomain,
      id: account?.id ?? null,
      name: account?.name ?? null,
    },
    domain_matches_db: active.provider_base_url.includes(String(accountDomain ?? '').replace(/^https?:\/\//, '').split('.')[0]),
  };

  return { active, credentials };
}

async function step2LiveTickets(access: { active: { id: string; provider_base_url: string }; credentials: { email: string; api_key: string } }) {
  const apiBase = gorgiasApiBaseUrl(access.active.provider_base_url);
  const page = await gorgiasApiRequest<{ data?: Array<Record<string, unknown>> }>(
    apiBase,
    '/tickets?limit=5&order_by=created_datetime:desc',
    access.credentials,
    { method: 'GET' },
  );

  const liveTickets = (page.data ?? []).map((t) => ({
    id: String(t.id ?? ''),
    subject: typeof t.subject === 'string' ? t.subject : null,
    status: typeof t.status === 'string' ? t.status : null,
    created_datetime: t.created_datetime ?? null,
    customer_email:
      typeof (t.customer as Record<string, unknown> | undefined)?.email === 'string'
        ? (t.customer as Record<string, unknown>).email
        : null,
  }));

  const pick = liveTickets.find((t) => t.subject && t.customer_email) ?? liveTickets[0];
  if (!pick?.id) {
    report.step2 = { error: 'no_live_tickets_on_active_account', live_sample: liveTickets };
    return null;
  }

  const liveFull = await fetchGorgiasTicketById({
    providerBaseUrl: access.active.provider_base_url,
    credentials: access.credentials,
    ticketId: pick.id,
  });

  const ingest = await ingestSupportCase(supabase, {
    merchant_id: MERCHANT_ID,
    provider: 'gorgias',
    provider_connection_id: access.active.id,
    event_type: 'live_verify_ingest',
    raw: liveFull,
  });

  const { data: dbRow } = await supabase
    .from('source_tickets')
    .select('id,external_id,subject,status,message_count,updated_at_provider,merchant_id')
    .eq('merchant_id', MERCHANT_ID)
    .eq('external_id', pick.id)
    .single();

  report.step2 = {
    live_ticket_used: pick,
    db_after_ingest: dbRow,
    ingest_result: {
      support_case_id: ingest.support_case_id,
      support_payout_case_id: ingest.support_payout_case_id,
      is_claim: ingest.is_claim,
    },
    subject_populated: Boolean(dbRow?.subject),
    note: 'Did not use 64706015/67446971 unless they appear in active account listing',
  };

  return pick;
}

async function step3GorgiasSync(access: { active: { id: string }; credentials: { email: string; api_key: string } }) {
  const beforeCases = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', MERCHANT_ID);

  const backfill = await backfillGorgiasSupportCases({
    supabase,
    merchantId: MERCHANT_ID,
    providerConnectionId: access.active.id,
  });

  const bridge1 = await reconcilePayoutCasesFromTickets({ supabase, merchantId: MERCHANT_ID });
  const bridge2 = await reconcilePayoutCasesFromTickets({ supabase, merchantId: MERCHANT_ID });

  const afterCases = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', MERCHANT_ID);

  const { data: deletedTickets } = await supabase
    .from('source_tickets')
    .select('external_id,status')
    .eq('merchant_id', MERCHANT_ID)
    .eq('status', 'source_deleted');

  report.step3 = {
    backfill,
    bridge_first_run: bridge1,
    bridge_second_run: bridge2,
    idempotent_case_count: beforeCases.count === afterCases.count && bridge2.cases_created_or_updated <= bridge1.cases_created_or_updated,
    payout_cases_before: beforeCases.count,
    payout_cases_after: afterCases.count,
    source_deleted_tickets: deletedTickets,
  };
}

async function step4ShopifySync() {
  const { data: storeConn } = await supabase
    .from('store_connections')
    .select('store_key,credentials_encrypted,last_sync_at,merchant_id,status')
    .eq('merchant_id', MERCHANT_ID)
    .eq('platform', 'shopify')
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!storeConn?.credentials_encrypted) {
    report.step4 = { error: 'shopify_not_connected' };
    return;
  }

  const beforeSync = storeConn.last_sync_at;
  const beforeOrderCount = await supabase
    .from('source_orders')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', MERCHANT_ID);

  const creds = decryptBigCommerceOAuthCredentials(storeConn.credentials_encrypted);
  const shopResult = await backfillShopifyOrders({
    supabase,
    shopDomain: storeConn.store_key,
    accessToken: creds.access_token,
  });

  const { data: storeAfter } = await supabase
    .from('store_connections')
    .select('last_sync_at')
    .eq('merchant_id', MERCHANT_ID)
    .eq('platform', 'shopify')
    .single();

  const afterOrderCount = await supabase
    .from('source_orders')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', MERCHANT_ID);

  const { data: order1013 } = await supabase
    .from('source_orders')
    .select('id,order_number,external_id,total_price,currency,source,job_id,source_customer_id')
    .eq('merchant_id', MERCHANT_ID)
    .eq('order_number', '1013')
    .maybeSingle();

  // Live newest order from Shopify API
  const shopDomain = storeConn.store_key;
  const liveRes = await fetch(
    `https://${shopDomain}/admin/api/2025-10/orders.json?status=any&limit=1&order=created_at%20desc`,
    { headers: { 'X-Shopify-Access-Token': creds.access_token, Accept: 'application/json' } },
  );
  const livePayload = liveRes.ok ? ((await liveRes.json()) as { orders?: Array<{ order_number?: number; id?: number }> }) : null;
  const newestLive = livePayload?.orders?.[0];

  report.step4 = {
    store_domain: shopDomain,
    credential_status: liveRes.ok ? 'ok' : `shopify_http_${liveRes.status}`,
    before_sync_at: beforeSync,
    after_sync_at: storeAfter?.last_sync_at,
    shop_result: shopResult,
    order_rows_before: beforeOrderCount.count,
    order_rows_after: afterOrderCount.count,
    duplicates_created: (afterOrderCount.count ?? 0) > (beforeOrderCount.count ?? 0),
    order_1013: order1013,
    newest_shopify_order_live: newestLive
      ? { order_number: newestLive.order_number, external_id: String(newestLive.id) }
      : null,
    credential_source: 'store_connections.credentials_encrypted',
  };
}

async function step5LinkedCase() {
  const { data: cases } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select(
      'id,merchant_id,status,claim_type,source_ticket_id,source_order_id,identity_id,amount_at_risk,currency,reason_normalized,detection_detail,requires_review',
    )
    .eq('merchant_id', MERCHANT_ID)
    .order('created_at', { ascending: false })
    .limit(5);

  const enriched = [];
  for (const c of cases ?? []) {
    const ticket = c.source_ticket_id
      ? (
          await supabase
            .from('source_tickets')
            .select('external_id,subject,status,linked_order_external_ids,source_customer_id')
            .eq('id', c.source_ticket_id)
            .maybeSingle()
        ).data
      : null;
    const order = c.source_order_id
      ? (
          await supabase
            .from('source_orders')
            .select('order_number,external_id,total_price,currency')
            .eq('id', c.source_order_id)
            .maybeSingle()
        ).data
      : null;
    const customer = ticket?.source_customer_id
      ? (
          await supabase
            .from('source_customers')
            .select('email,first_name,last_name')
            .eq('id', ticket.source_customer_id)
            .maybeSingle()
        ).data
      : null;

    let evidence: unknown = null;
    if (c.id) {
      const { data: ev } = await supabase
        .from('claim_decision_evidence')
        .select('evidence_state,checklist')
        .eq('claim_id', c.id)
        .maybeSingle();
      evidence = ev;
    }

    enriched.push({ case: c, ticket, order, customer, evidence });
  }

  report.step5 = {
    payout_cases: enriched,
    identities_count: (
      await supabase.from('identity_signals').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID)
    ).count,
  };
}

async function step6UiReadiness() {
  const { data: claimsList, count } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id,claim_type,status,source_ticket_id,source_order_id,amount_at_risk,updated_at', { count: 'exact' })
    .eq('merchant_id', MERCHANT_ID)
    .order('updated_at', { ascending: false })
    .limit(25);

  const firstCaseId = claimsList?.[0]?.id;
  let claimsHttp: { status: number; location?: string } | null = null;
  try {
    const res = await fetch(`${APP}/claims`, { redirect: 'manual' });
    claimsHttp = { status: res.status, location: res.headers.get('location') ?? undefined };
  } catch (e) {
    claimsHttp = { status: 0, location: e instanceof Error ? e.message : 'fetch_failed' };
  }

  report.step6 = {
    claims_db_count: count,
    claims_db_sample: claimsList,
    claims_route_http: claimsHttp,
    claims_visible_without_db: count != null && count > 0 ? 'requires_auth_session_to_confirm_ui' : false,
    first_case_detail_route: firstCaseId ? `/claims/${firstCaseId}` : null,
    customers_sample: (
      await supabase
        .from('source_customers')
        .select('id,email,first_name,last_name')
        .eq('merchant_id', MERCHANT_ID)
        .limit(5)
    ).data,
    identities_count: (
      await supabase.from('identity_signals').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID)
    ).count,
  };
}

async function step7Widget(access: { active: { provider_base_url: string; scopes?: unknown }; credentials: { email: string; api_key: string } }, ticketId: string, customerEmail: string) {
  const { data: conn } = await supabase
    .from('helpdesk_connections')
    .select('scopes')
    .eq('merchant_id', MERCHANT_ID)
    .eq('status', 'active')
    .eq('provider', 'gorgias')
    .maybeSingle();

  let widgetToken: string | null = null;
  const scopes = conn?.scopes;
  if (Array.isArray(scopes)) {
    for (const entry of scopes) {
      if (entry && typeof entry === 'object' && (entry as { kind?: string }).kind === 'gorgias_sidebar_widget') {
        const integrationId = (entry as { integration_id?: number }).integration_id;
        if (integrationId) {
          const integ = await gorgiasApiRequest<{ http?: { url?: string } }>(
            gorgiasApiBaseUrl(access.active.provider_base_url),
            `/integrations/${integrationId}`,
            access.credentials,
            { method: 'GET' },
          );
          const url = integ.http?.url ?? '';
          const m = url.match(/[?&]widget_token=([^&]+)/);
          if (m) widgetToken = decodeURIComponent(m[1]);
        }
      }
    }
  }

  if (!widgetToken) {
    report.step7 = { error: 'widget_token_not_found_in_gorgias_integration' };
    return;
  }

  const widgetUrl = `${APP}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}&ticket_id=${encodeURIComponent(ticketId)}&customer_email=${encodeURIComponent(customerEmail)}&format=json`;
  const res = await fetch(widgetUrl, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));

  report.step7 = {
    widget_url_sanitized: widgetUrl.replace(widgetToken, '<widget_token>'),
    http_status: res.status,
    response_keys: Object.keys(body as object),
    response_sample: {
      identity: (body as Record<string, string>).identity,
      payout_exposure: (body as Record<string, string>).payout_exposure,
      recommendation: (body as Record<string, string>).recommendation,
      evidence_checklist: (body as Record<string, string>).evidence_checklist,
      context_summary: (body as Record<string, string>).context_summary,
      cta_label: (body as Record<string, string>).cta_label,
    },
    uses_mock_fallback: (body as Record<string, string>).context_summary?.includes('Context unavailable'),
  };
}

async function main() {
  const only = process.argv.includes('--shopify-only') ? 'shopify' : process.argv.includes('--widget-only') ? 'widget' : 'all';

  const access = await step1GorgiasAccount();
  if (!access && only !== 'shopify') {
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  if (only === 'shopify') {
    await step4ShopifySync();
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (only === 'widget' && access) {
    await step7Widget(access, process.argv[2] ?? '67446971', process.argv[3] ?? 'notice@email.anthropic.com');
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const ticket = await step2LiveTickets(access!);
  await step3GorgiasSync(access!);
  await step4ShopifySync();
  await step5LinkedCase();
  await step6UiReadiness();

  if (ticket?.id && ticket.customer_email) {
    await step7Widget(access!, ticket.id, ticket.customer_email);
  } else {
    report.step7 = { skipped: 'no_ticket_with_email_for_widget' };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.fatal_error = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
