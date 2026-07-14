/**
 * Prove authenticated /claims + case detail for the E2E order #1013 payout case.
 * Requires local dev server with E2E_AUTH_SECRET set (never enabled in production).
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const CASE_ID = requiredControlledAccountEnv('E2E_CASE_ID');
const TICKET_ID = requiredControlledAccountEnv('E2E_TICKET_ID');
const ORDER_NUMBER = requiredControlledAccountEnv('E2E_ORDER_NUMBER');
const CUSTOMER_EMAIL = requiredControlledAccountEnv('E2E_CUSTOMER_EMAIL');
const APP = (process.env.E2E_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const E2E_AUTH_SECRET = process.env.E2E_AUTH_SECRET ?? '';

const report: Record<string, unknown> = {
  merchant_id: MERCHANT_ID,
  case_id: CASE_ID,
  tested_at: new Date().toISOString(),
};

function redactEmail(email: string): string {
  return email.replace(/(^.).*(@.*$)/, '$1***$2');
}

async function establishSession(page: import('playwright').Page, redirect: string) {
  if (!E2E_AUTH_SECRET.trim()) {
    throw new Error('E2E_AUTH_SECRET is required for local E2E auth');
  }
  const authUrl =
    `${APP}/api/test/e2e-auth?secret=${encodeURIComponent(E2E_AUTH_SECRET)}` +
    `&merchant_id=${encodeURIComponent(MERCHANT_ID)}` +
    `&redirect=${encodeURIComponent(redirect)}`;
  const res = await page.goto(authUrl, { waitUntil: 'networkidle', timeout: 60000 });
  return {
    final_url: page.url(),
    redirected_to_login: page.url().includes('/login'),
    auth_status: res?.status() ?? null,
  };
}

async function main() {
  if (!E2E_AUTH_SECRET.trim()) {
    report.error = 'E2E_AUTH_SECRET_missing';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: member } = await supabase
    .from('merchant_users')
    .select('user_id')
    .eq('merchant_id', MERCHANT_ID)
    .eq('invite_status', 'active')
    .limit(1)
    .maybeSingle();
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const owner = users?.users?.find((u) => u.id === member?.user_id);

  report.auth_method = 'local_test_only_e2e_auth_route';
  report.owner_email_redacted = owner?.email ? redactEmail(owner.email) : null;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  report.claims_auth = await establishSession(page, '/claims');
  await page.waitForSelector('text=67818375', { timeout: 30000 }).catch(() => null);
  const claimsText = (await page.textContent('body')) ?? '';
  report.claims = {
    url: page.url(),
    on_login_page: page.url().includes('/login'),
    includes_case_id: claimsText.includes(CASE_ID.slice(0, 8)),
    includes_ticket: claimsText.includes(TICKET_ID),
    includes_order: claimsText.includes(ORDER_NUMBER),
    includes_customer_email: claimsText.includes(CUSTOMER_EMAIL),
    includes_inr: /not received|item not received/i.test(claimsText),
    includes_open: /\bopen\b/i.test(claimsText),
    body_snippet: claimsText.replace(/\s+/g, ' ').slice(0, 1500),
  };

  report.detail_auth = await establishSession(page, `/claims/${CASE_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=item_not_received', { timeout: 30000 }).catch(() => null);
  await page.waitForSelector('text=67818375', { timeout: 30000 }).catch(() => null);
  const detailText = (await page.textContent('body')) ?? '';

  const apiDetail = await page.evaluate(async (caseId) => {
    const res = await fetch(`/api/claims/${caseId}`, { credentials: 'include' });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: await res.json() };
  }, CASE_ID);
  report.case_detail_api = apiDetail;
  report.case_detail = {
    url: page.url(),
    on_login_page: page.url().includes('/login'),
    includes_ticket: detailText.includes(TICKET_ID),
    includes_order: detailText.includes(ORDER_NUMBER),
    includes_185: detailText.includes('185'),
    includes_customer_email: detailText.includes(CUSTOMER_EMAIL),
    includes_inr: /not received|item not received/i.test(detailText),
    includes_evidence: /evidence/i.test(detailText),
    includes_tracking_gap: /tracking|delivery|not connected|missing/i.test(detailText),
    body_snippet: detailText.replace(/\s+/g, ' ').slice(0, 2000),
  };

  await browser.close();

  const claimEval = await evaluateClaimDecision({
    client: supabase as never,
    merchantId: MERCHANT_ID,
    claimId: CASE_ID,
    source: 'e2e_surface_proof',
  });
  report.evidence_eval = claimEval
    ? {
        recommendation: claimEval.evaluation.recommendation,
        evidence_present: claimEval.evaluation.evidence_present,
        evidence_missing: claimEval.evaluation.evidence_missing,
        payout_exposure: claimEval.evaluation.payout_exposure_amount,
      }
    : null;

  const { data: caseRow } = await supabase
    .from('support_payout_cases')
    .select('identity_id')
    .eq('id', CASE_ID)
    .maybeSingle();
  report.identity = {
    case_identity_id: caseRow?.identity_id ?? null,
    note: 'Identity linkage is follow-up unless UI/widget blocked',
  };

  report.ui_ok =
    !(report.claims_auth as { redirected_to_login?: boolean }).redirected_to_login &&
    !(report.claims as { on_login_page?: boolean }).on_login_page &&
    (report.claims as { includes_ticket?: boolean }).includes_ticket === true &&
    (report.claims as { includes_order?: boolean }).includes_order === true &&
    !(report.case_detail as { on_login_page?: boolean }).on_login_page &&
    (report.case_detail as { includes_evidence?: boolean }).includes_evidence === true &&
    (report.case_detail as { includes_185?: boolean }).includes_185 === true &&
    (apiDetail as { ok?: boolean }).ok === true;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  report.fatal_error = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
