/**
 * E2E audit for Gorgias widget + context credits (read-only except credit spends).
 * Redacts emails in output. Requires .env.local with Supabase + optional Gorgias API.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { requiredControlledAccountEnv } from '@/scripts/e2e/controlledAccountEnv';
import { getContextCreditSnapshot } from '@/lib/billing/contextCredits';
import { hashWidgetToken } from '@/lib/api/widgetTokens';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT_ID = requiredControlledAccountEnv('E2E_MERCHANT_ID');
const TICKET_ID = process.argv[2]?.trim() || '63291904';
const SHOPPER_EMAIL = process.argv[3]?.trim() || 'simeonmurray123@gmail.com';
const INTEGRATION_ID = Number(requiredControlledAccountEnv('E2E_GORGIAS_WIDGET_INTEGRATION_ID'));

const APP = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const LEAK_PATTERNS = [
  /\b\d+ orders\b/i,
  /\b\d+ claims\b/i,
  /\d+% this store/i,
  /DEFINITE|PROBABLE|POSSIBLE/,
  /CE 3\.0 evidence available/i,
  /Item not received · \d+%/i,
  /watchlist/i,
  /fraudster/i,
  /high-risk/i,
  /suspicious customer/i,
];

function scanLeaks(value: unknown): string[] {
  const s = JSON.stringify(value);
  return LEAK_PATTERNS.filter((r) => r.test(s)).map((r) => r.source);
}

function redact(s: string): string {
  return s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
}

async function main(): Promise<void> {
  const sb = createServiceClient();
  const snapBefore = await getContextCreditSnapshot(sb, MERCHANT_ID);
  console.log('SETUP_CREDITS_BEFORE', {
    tier: snapBefore.tier,
    allowance: snapBefore.allowance,
    used: snapBefore.used,
    remaining: snapBefore.remaining,
    allowanceConfigured: snapBefore.allowanceConfigured,
  });

  const baseUrl = process.env.GORGIAS_BASE_URL;
  const gorgiasEmail = process.env.GORGIAS_API_EMAIL;
  const gorgiasToken = process.env.GORGIAS_API_TOKEN;
  if (!baseUrl || !gorgiasEmail || !gorgiasToken) {
    console.error('Missing GORGIAS_BASE_URL / GORGIAS_API_EMAIL / GORGIAS_API_TOKEN');
    process.exit(1);
  }

  const api = gorgiasApiBaseUrl(baseUrl);
  const creds = { email: gorgiasEmail, api_key: gorgiasToken };
  const integ = await gorgiasApiRequest<{ http?: { url?: string } }>(
    api,
    `/integrations/${INTEGRATION_ID}`,
    creds,
    { method: 'GET' },
  );
  const registeredUrl = integ.http?.url?.trim();
  if (!registeredUrl) {
    console.error('Integration has no http.url');
    process.exit(1);
  }

  const tokenMatch = registeredUrl.match(/[?&]widget_token=([^&]+)/);
  if (!tokenMatch) {
    console.error('No widget_token in integration URL');
    process.exit(1);
  }
  const widgetToken = decodeURIComponent(tokenMatch[1]);

  const widgetUrl = new URL(registeredUrl);
  widgetUrl.searchParams.set('email', SHOPPER_EMAIL);
  widgetUrl.searchParams.set('customer_email', SHOPPER_EMAIL);
  widgetUrl.searchParams.set('ticket_id', TICKET_ID);

  const wRes = await fetch(widgetUrl.toString(), { headers: { Accept: 'application/json' } });
  const widget = (await wRes.json()) as Record<string, string>;
  console.log('TEST1_SAFE_PREVIEW', {
    status: wRes.status,
    identity: widget.identity,
    claims: widget.claims,
    has_basic_unlock: Boolean(widget.basic_unlock_url),
    has_full_unlock: Boolean(widget.full_unlock_url),
    has_evidence_unlock: Boolean(widget.evidence_unlock_url),
    leaks: scanLeaks(widget),
  });

  const htmlNoTicket = await fetch(
    `${APP}/api/gorgias/widget?widget_token=${encodeURIComponent(widgetToken)}&email=${encodeURIComponent(SHOPPER_EMAIL)}&format=html`,
  ).then((r) => r.text());
  console.log('TEST1b_HTML_NO_TICKET', {
    leaks: LEAK_PATTERNS.filter((r) => r.test(htmlNoTicket)).map((r) => r.source),
    has_claim_context_title: htmlNoTicket.includes('Unauth claim context'),
  });

  async function unlockCase(label: string, url: string) {
    const res = await fetch(url, { headers: { Accept: 'text/html' } });
    const html = await res.text();
    return {
      label,
      status: res.status,
      creditsSpent: (html.match(/Credits spent: (\d+)/) ?? [])[1] ?? null,
      hasStoreBlock: html.includes('Store context'),
      hasNetworkBlock: html.includes('Pseudonymous network'),
      has402: /requires \d+ credit/.test(html),
      has403: /paid plans/i.test(html),
      leaks: scanLeaks(html),
      snippet: redact(html).slice(0, 280),
    };
  }

  if (widget.basic_unlock_url) {
    console.log('TEST2_BASIC', await unlockCase('basic', widget.basic_unlock_url));
  }
  if (widget.full_unlock_url) {
    console.log('TEST3_FULL', await unlockCase('full', widget.full_unlock_url));
  }
  if (widget.evidence_unlock_url) {
    console.log('TEST4_EVIDENCE', await unlockCase('evidence', widget.evidence_unlock_url));
  }

  const snapAfter = await getContextCreditSnapshot(sb, MERCHANT_ID);
  console.log('CREDITS_AFTER', { used: snapAfter.used, remaining: snapAfter.remaining });

  const { data: audits } = await sb
    .from('access_audit_log')
    .select('query_type, result_returned, lookup_type, matched_merchant_count')
    .eq('merchant_id', MERCHANT_ID)
    .eq('lookup_type', 'gorgias_widget_unlock')
    .order('created_at', { ascending: false })
    .limit(8);
  console.log('AUDIT_LOG_RECENT', audits);

  const noScopeRes = await fetch(
    `${APP}/api/gorgias/widget/unlock/action?contextType=basic_context&widget_token=${encodeURIComponent(widgetToken)}&email=${encodeURIComponent(SHOPPER_EMAIL)}`,
  );
  console.log('TEST7_NO_SCOPE', { status: noScopeRes.status, body: redact((await noScopeRes.text()).slice(0, 240)) });

  const { data: tokenRow } = await sb
    .from('merchant_widget_tokens')
    .select('merchant_id')
    .eq('token_hash', hashWidgetToken(widgetToken))
    .maybeSingle();
  console.log('TOKEN_MERCHANT', tokenRow?.merchant_id === MERCHANT_ID ? 'match' : 'mismatch');

  const { data: conn } = await sb
    .from('support_provider_connections')
    .select('status')
    .eq('merchant_id', MERCHANT_ID)
    .eq('provider', 'gorgias')
    .limit(1)
    .maybeSingle();
  console.log('GORGIAS_CONN_STATUS', conn?.status ?? 'none');
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
