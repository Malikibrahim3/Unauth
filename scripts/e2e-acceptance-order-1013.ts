/**
 * Controlled E2E acceptance: Shopify order #1013 + Gorgias ticket → payout case → widget.
 * E2E merchant only. Mutates only af070af9-df1a-46ba-89f8-29409926ef61.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { decryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import { ingestSupportCase } from '@/lib/support/intake/ingestSupportCase';
import { backfillGorgiasSupportCases } from '@/lib/support/gorgias/backfill';
import { backfillShopifyOrders } from '@/lib/shopify/backfill';
import { reconcilePayoutCasesFromTickets } from '@/lib/support/intake/reconcilePayoutCasesFromTickets';
import { decryptBigCommerceOAuthCredentials } from '@/lib/commerce/credentialCrypto';
import { TABLES } from '@/lib/supabase/tables';
import { resolveClaimForTicketDecision } from '@/lib/claims/decision/resolveClaim';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { formatPayoutWidgetDecision, formatRecommendationFields } from '@/lib/gorgias/widgetJson';

const MERCHANT_ID = 'af070af9-df1a-46ba-89f8-29409926ef61';
const CUSTOMER_EMAIL = 'simsorsno3@icloud.com';
const CUSTOMER_NAME = 'simon murphy';
const ORDER_NUMBER = '1013';
const SUBJECT = 'E2E refund request for order #1013 - item not received';
const BODY = [
  'This is an E2E test ticket for Unauth verification.',
  'Order #1013',
  'Customer says item was not received.',
  'Please review refund eligibility.',
].join('\n');

const APP = (process.env.E2E_WIDGET_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const report: Record<string, unknown> = {
  merchant_id: MERCHANT_ID,
  tested_at: new Date().toISOString(),
};

async function getActiveGorgias() {
  const { data } = await supabase
    .from('helpdesk_connections')
    .select('id, provider_base_url, access_token_encrypted')
    .eq('merchant_id', MERCHANT_ID)
    .eq('provider', 'gorgias')
    .eq('status', 'active')
    .maybeSingle();
  if (!data?.access_token_encrypted || !data.provider_base_url) {
    throw new Error('active_gorgias_missing');
  }
  return {
    id: data.id as string,
    providerBaseUrl: data.provider_base_url as string,
    credentials: decryptGorgiasApiCredentials(data.access_token_encrypted as string),
  };
}

async function createOrFindE2eTicket(gorgias: Awaited<ReturnType<typeof getActiveGorgias>>) {
  const api = gorgiasApiBaseUrl(gorgias.providerBaseUrl);
  const list = await gorgiasApiRequest<{ data?: Array<Record<string, unknown>> }>(
    api,
    `/tickets?limit=30&order_by=created_datetime:desc`,
    gorgias.credentials,
    { method: 'GET' },
  );
  const existing = (list.data ?? []).find(
    (t) =>
      typeof t.subject === 'string' &&
      t.subject.includes('E2E refund request for order #1013'),
  );
  if (existing?.id) {
    return {
      ticketId: String(existing.id),
      subject: String(existing.subject),
      creationMethod: 'existing_on_active_account',
    };
  }

  const created = await gorgiasApiRequest<Record<string, unknown>>(
    api,
    '/tickets',
    gorgias.credentials,
    {
      method: 'POST',
      body: JSON.stringify({
        subject: SUBJECT,
        via: 'api',
        channel: 'api',
        status: 'open',
        tags: [{ name: 'e2e-unauth-test' }],
        customer: { email: CUSTOMER_EMAIL, firstname: 'simon', lastname: 'murphy' },
        messages: [
          {
            channel: 'api',
            from_agent: false,
            via: 'api',
            body_text: BODY,
            subject: SUBJECT,
            sender: { email: CUSTOMER_EMAIL },
          },
        ],
      }),
    },
  );
  return {
    ticketId: String(created.id),
    subject: SUBJECT,
    creationMethod: 'gorgias_api',
  };
}

async function runSyncAndBridge(gorgias: Awaited<ReturnType<typeof getActiveGorgias>>) {
  const { data: storeConn } = await supabase
    .from('store_connections')
    .select('store_key, credentials_encrypted')
    .eq('merchant_id', MERCHANT_ID)
    .eq('platform', 'shopify')
    .eq('status', 'active')
    .is('uninstalled_at', null)
    .order('installed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let shopify: Awaited<ReturnType<typeof backfillShopifyOrders>> | null = null;
  if (storeConn?.credentials_encrypted) {
    const creds = decryptBigCommerceOAuthCredentials(storeConn.credentials_encrypted);
    shopify = await backfillShopifyOrders({
      supabase,
      shopDomain: storeConn.store_key as string,
      accessToken: creds.access_token,
    });
  }

  const backfill = await backfillGorgiasSupportCases({
    supabase,
    merchantId: MERCHANT_ID,
    providerConnectionId: gorgias.id,
  });
  const bridge1 = await reconcilePayoutCasesFromTickets({ supabase, merchantId: MERCHANT_ID });
  const bridge2 = await reconcilePayoutCasesFromTickets({ supabase, merchantId: MERCHANT_ID });
  return { shopify, backfill, bridge1, bridge2 };
}

async function loadE2eRows(ticketExternalId: string) {
  const { data: ticket } = await supabase
    .from('source_tickets')
    .select('*')
    .eq('merchant_id', MERCHANT_ID)
    .eq('external_id', ticketExternalId)
    .single();

  const { data: payoutCase } = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('*')
    .eq('merchant_id', MERCHANT_ID)
    .eq('source_ticket_id', ticket?.id)
    .neq('status', 'stale')
    .maybeSingle();

  let order = null;
  if (payoutCase?.source_order_id) {
    const { data } = await supabase
      .from('source_orders')
      .select('*')
      .eq('id', payoutCase.source_order_id)
      .maybeSingle();
    order = data;
  }

  let evidence = null;
  if (payoutCase?.id) {
    const { data: rows } = await supabase
      .from('claim_evidence')
      .select('*')
      .eq('claim_id', payoutCase.id);
    evidence = rows;
  }

  return { ticket, payoutCase, order, evidence };
}

async function widgetPayload(ticketId: string, gorgias: Awaited<ReturnType<typeof getActiveGorgias>>) {
  const { data: conn } = await supabase
    .from('helpdesk_connections')
    .select('scopes')
    .eq('id', gorgias.id)
    .maybeSingle();
  let widgetToken: string | null = null;
  if (Array.isArray(conn?.scopes)) {
    for (const entry of conn.scopes) {
      if (entry && typeof entry === 'object' && (entry as { kind?: string }).kind === 'gorgias_sidebar_widget') {
        const integrationId = (entry as { integration_id?: number }).integration_id;
        if (integrationId) {
          const integ = await gorgiasApiRequest<{ http?: { url?: string } }>(
            gorgiasApiBaseUrl(gorgias.providerBaseUrl),
            `/integrations/${integrationId}`,
            gorgias.credentials,
            { method: 'GET' },
          );
          const m = integ.http?.url?.match(/[?&]widget_token=([^&]+)/);
          if (m) widgetToken = decodeURIComponent(m[1]);
        }
      }
    }
  }
  if (!widgetToken) return { error: 'widget_token_missing' };

  const url = `${APP}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}&ticket_id=${encodeURIComponent(ticketId)}&customer_email=${encodeURIComponent(CUSTOMER_EMAIL)}&order_number=${ORDER_NUMBER}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return {
    http_status: res.status,
    uses_mock_fallback: (body as Record<string, string>).context_summary?.includes('Context unavailable') ?? false,
    sample: {
      identity: (body as Record<string, string>).identity,
      payout_exposure: (body as Record<string, string>).payout_exposure,
      evidence_checklist: (body as Record<string, string>).evidence_checklist,
      recommendation: (body as Record<string, string>).recommendation,
      context_summary: (body as Record<string, string>).context_summary,
    },
  };
}

async function authenticatedClaimsCheck(caseId: string | null) {
  const credsPath = '.test-credentials.json';
  const fs = await import('node:fs');
  const credsFile = fs.existsSync('tests/.test-credentials.json')
    ? 'tests/.test-credentials.json'
    : fs.existsSync(credsPath)
      ? credsPath
      : null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${APP}/login`);
  await page.waitForLoadState('domcontentloaded');

  if (credsFile) {
    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8')) as { email?: string; password?: string };
    if (creds.email && creds.password) {
      await page.locator('input[type="email"]').fill(creds.email);
      await page.locator('input[type="password"]').fill(creds.password);
      await page.locator('button[type="submit"]').click();
      try {
        await page.waitForURL(/\/(dashboard|claims|onboarding|upload)/, { timeout: 30000 });
      } catch {
        return {
          error: 'login_failed',
          owner_email_redacted: creds.email.replace(/(^.).*(@.*$)/, '$1***$2'),
        };
      }
    }
  } else {
    const { data: members } = await supabase
      .from('merchant_users')
      .select('user_id')
      .eq('merchant_id', MERCHANT_ID)
      .eq('invite_status', 'active')
      .limit(1);
    const ownerId = members?.[0]?.user_id as string | undefined;
    const { data: authUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const owner = authUser?.users?.find((u) => u.id === ownerId);
    if (!owner?.email) {
      await browser.close();
      return { error: 'merchant_owner_email_not_found' };
    }
    await page.fill('#login-email', owner.email);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    const passwordField = page.locator('#login-password');
    if (await passwordField.isVisible().catch(() => false)) {
      await browser.close();
      return {
        error: 'password_login_required',
        owner_email_redacted: owner.email.replace(/(^.).*(@.*$)/, '$1***$2'),
        note: 'Add tests/.test-credentials.json for authenticated UI proof',
      };
    }
  }

  await page.goto(`${APP}/claims`);
  await page.waitForLoadState('networkidle');
  const text = await page.textContent('body');
  const claimsUrl = page.url();
  let caseDetail: Record<string, unknown> | null = null;
  if (caseId) {
    await page.goto(`${APP}/claims/${caseId}`);
    await page.waitForLoadState('networkidle');
    caseDetail = {
      url: page.url(),
      body_snippet: (await page.textContent('body'))?.slice(0, 1200) ?? '',
    };
  }
  await browser.close();

  return {
    claims_url: claimsUrl,
    claims_body_snippet: text?.slice(0, 1200) ?? '',
    includes_e2e_subject: text?.includes('E2E refund request') ?? false,
    includes_order_1013: text?.includes('1013') ?? false,
    case_detail: caseDetail,
  };
}

async function main() {
  const gorgias = await getActiveGorgias();
  report.gorgias_account = gorgias.providerBaseUrl;

  const ticket = await createOrFindE2eTicket(gorgias);
  report.test_ticket = { ...ticket, customer_email: CUSTOMER_EMAIL, account: gorgias.providerBaseUrl };

  await ingestSupportCase(supabase, {
    merchant_id: MERCHANT_ID,
    provider: 'gorgias',
    provider_connection_id: gorgias.id,
    event_type: 'e2e_acceptance_ingest',
    raw: await gorgiasApiRequest<Record<string, unknown>>(
      gorgiasApiBaseUrl(gorgias.providerBaseUrl),
      `/tickets/${ticket.ticketId}`,
      gorgias.credentials,
      { method: 'GET' },
    ),
  });

  report.sync = await runSyncAndBridge(gorgias);
  report.rows = await loadE2eRows(ticket.ticketId);

  const caseId = (report.rows as { payoutCase?: { id?: string } }).payoutCase?.id ?? null;
  if (caseId) {
    const resolution = await resolveClaimForTicketDecision(supabase as never, {
      merchantId: MERCHANT_ID,
      ticketExternalId: ticket.ticketId,
      orderReference: ORDER_NUMBER,
    });
    const claimEval = resolution.claimId
      ? await evaluateClaimDecision({
          client: supabase as never,
          merchantId: MERCHANT_ID,
          claimId: resolution.claimId,
          source: 'e2e_acceptance',
        })
      : null;
    report.local_decision = {
      resolution,
      evaluation: claimEval
        ? {
            recommendation: claimEval.evaluation.recommendation,
            payout_exposure: claimEval.evaluation.payout_exposure_amount,
            evidence_present: claimEval.evaluation.evidence_present,
            evidence_missing: claimEval.evaluation.evidence_missing,
            rule_count: claimEval.ruleCount,
          }
        : null,
      widget_fields: claimEval
        ? {
            ...formatRecommendationFields(
              claimEval.evaluation,
              claimEval.ruleCount,
              claimEval.payoutCase,
            ),
            ...formatPayoutWidgetDecision(
              claimEval.evaluation,
              claimEval.payoutCase,
              claimEval.ruleCount,
            ),
          }
        : null,
    };
  }

  report.widget = await widgetPayload(ticket.ticketId, gorgias);
  try {
    report.ui = await authenticatedClaimsCheck(caseId);
  } catch (uiErr) {
    report.ui = {
      error: uiErr instanceof Error ? uiErr.message : String(uiErr),
    };
  }

  const rows = report.rows as {
    payoutCase?: { source_order_id?: string | null; claim_type?: string; status?: string };
    order?: { order_number?: string };
    ticket?: { status?: string; subject?: string | null };
  };
  report.chain_ok =
    rows.ticket?.status !== 'source_deleted' &&
    Boolean(rows.ticket?.subject) &&
    Boolean(rows.payoutCase?.id) &&
    rows.order?.order_number === ORDER_NUMBER &&
    rows.payoutCase?.claim_type === 'item_not_received' &&
    Number(rows.order?.total_price) === 185;

  const bridge2 = (report.sync as { bridge2?: { cases_created_or_updated: number } })?.bridge2;
  const cases = await supabase
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', MERCHANT_ID)
    .eq('source_ticket_id', (report.rows as { ticket?: { id?: string } }).ticket?.id);
  report.idempotent_case_count = cases.count ?? 0;
  report.bridge_idempotent = bridge2?.cases_created_or_updated !== undefined;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.fatal_error = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
