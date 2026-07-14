/**
 * READ-ONLY production diagnostic for a single customer/order/ticket.
 *
 * Traces one shopper across the Shopify -> Supabase identity/profile/claim
 * tables to locate where the data chain breaks. Performs NO writes.
 *
 * Usage:
 *   npx ts-node --transpile-only --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/diagnose-customer-sync.ts
 *
 * Safety:
 *   - SELECT-only Supabase queries; GET-only Gorgias API call.
 *   - Emails are masked in output. Email hashes are truncated.
 *   - Never prints salts, service-role keys, tokens, webhook secrets, or raw payloads.
 *
 * This is a standalone tool (see CLAUDE.md "Scripts" rule) and intentionally
 * inlines a copy of normaliseEmail rather than importing the production stack.
 */
import { config as loadEnv } from 'dotenv';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

// ---- Test case under investigation -----------------------------------------
// Override email/order via argv: `… diagnose-customer-sync.ts <email> [#order]`
// or env DIAG_EMAIL / DIAG_ORDER.
const TARGET = {
  email: process.argv[2]?.trim() || process.env.DIAG_EMAIL?.trim() || '',
  shopDomain: process.env.E2E_SHOPIFY_STORE_DOMAIN?.trim() || '',
  orderName: process.argv[3]?.trim() || process.env.DIAG_ORDER?.trim() || '',
  gorgiasIntegrationId: process.env.E2E_GORGIAS_WIDGET_INTEGRATION_ID?.trim() || '',
};
if (Object.values(TARGET).some((value) => !value)) {
  throw new Error('DIAG_EMAIL, DIAG_ORDER, E2E_SHOPIFY_STORE_DOMAIN, and E2E_GORGIAS_WIDGET_INTEGRATION_ID are required');
}

// ---- env (names only logged, never values) ---------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IDENTITY_SALT = process.env.IDENTITY_SALT || '';
const GORGIAS_BASE_URL = (process.env.GORGIAS_BASE_URL || '').replace(/\/$/, '');
const GORGIAS_API_EMAIL = process.env.GORGIAS_API_EMAIL || '';
const GORGIAS_API_TOKEN = process.env.GORGIAS_API_TOKEN || '';

// ---- helpers ----------------------------------------------------------------
const DOT_IGNORING_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me', 'fastmail.com', 'fastmail.fm',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk',
  'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
]);

function normaliseEmail(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const at = lower.indexOf('@');
  if (at < 1 || at === lower.length - 1) return null;
  const plusStripped = lower.slice(0, at).split('+')[0];
  const domain = lower.slice(at + 1);
  const localPart = DOT_IGNORING_DOMAINS.has(domain)
    ? plusStripped.replace(/\./g, '')
    : plusStripped;
  if (!localPart) return null;
  return `${localPart}@${domain}`;
}

function maskEmail(raw: string | null): string {
  if (!raw) return '(none)';
  const at = raw.indexOf('@');
  if (at < 1) return '***';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const shownLocal = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '***';
  const dot = domain.lastIndexOf('.');
  const shownDomain = dot > 0 ? domain[0] + '***' + domain.slice(dot) : domain[0] + '***';
  return `${shownLocal}@${shownDomain}`;
}

const hashId = (value: string) =>
  createHmac('sha256', IDENTITY_SALT).update(value).digest('hex');
const short = (h: string) => `${h.slice(0, 8)}…(${h.length})`;

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️ ';
const mark = (ok: boolean) => (ok ? PASS : FAIL);

function section(title: string) {
  console.log(`\n${'─'.repeat(68)}\n${title}\n${'─'.repeat(68)}`);
}

async function main() {
  const missing = [
    ['SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
    ['IDENTITY_SALT', IDENTITY_SALT],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const normEmail = normaliseEmail(TARGET.email)!;
  const emailHash = hashId(normEmail);

  console.log('Read-only customer/order/claim sync diagnostic');
  console.log(`  Supabase host : ${new URL(SUPABASE_URL).host}`);
  console.log(`  Target email  : ${maskEmail(TARGET.email)} (normalised: ${maskEmail(normEmail)})`);
  console.log(`  Email hash    : ${short(emailHash)}`);
  console.log(`  Store         : ${TARGET.shopDomain}`);
  console.log(`  Order         : ${TARGET.orderName}`);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    try { return await fn(); }
    catch (e) { console.log(`   ${WARN}query error (${label}): ${(e as Error).message}`); return null; }
  };

  // 1) merchant id(s) for the store ------------------------------------------
  section('1. Merchant ID for store');
  let merchantIds: string[] = [];
  const conn = await safe('merchant_shopify_connections', async () => {
    const { data, error } = await sb
      .from('merchant_shopify_connections')
      .select('merchant_id, active, shop_domain')
      .eq('shop_domain', TARGET.shopDomain);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  if (conn && conn.length) {
    merchantIds = Array.from(new Set(conn.map((r: any) => String(r.merchant_id))));
    for (const r of conn) console.log(`   ${mark(true)} merchant_id=${r.merchant_id} active=${r.active}`);
  } else {
    console.log(`   ${FAIL} No merchant_shopify_connections row for ${TARGET.shopDomain}`);
  }
  const merchantSet = new Set(merchantIds);

  // resolve numeric Shopify order id for #1008 via shopify_order_signals -------
  section('2. shopify_order_signals — order ' + TARGET.orderName);
  let orderIds: string[] = [];
  const signals = await safe('shopify_order_signals', async () => {
    const { data, error } = await sb
      .from('shopify_order_signals')
      .select('shopify_order_id, order_number, customer_id, risk_level, refunds_count, total_price, created_at_shopify')
      .eq('shop_domain', TARGET.shopDomain);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  if (signals) {
    const wanted = new Set([TARGET.orderName, TARGET.orderName.replace('#', '')]);
    const matches = signals.filter((r: any) => wanted.has(String(r.order_number ?? '')));
    console.log(`   store rows: ${signals.length} total | order_number='${TARGET.orderName}' matches: ${matches.length}`);
    const show = matches.length ? matches : signals.slice(0, 3);
    for (const r of show) {
      console.log(`   ${mark(matches.length > 0)} order_id=${r.shopify_order_id} number=${r.order_number ?? '(null)'} cust=${r.customer_id ?? '(null)'} risk=${r.risk_level} refunds=${r.refunds_count} total=${r.total_price ?? '?'}`);
    }
    orderIds = matches.map((r: any) => String(r.shopify_order_id));
    if (!matches.length) console.log(`   ${WARN}No order_name='${TARGET.orderName}' in shopify_order_signals (showing first 3 above for context)`);
  }

  // 3) merchant_identities for email/order ------------------------------------
  section('3. merchant_identities — email / order');
  const idByEmail = await safe('merchant_identities(email)', async () => {
    const { data, error } = await sb
      .from('merchant_identities')
      .select('source, source_id, email, customer_id, shop_domain')
      .eq('shop_domain', TARGET.shopDomain)
      .eq('email', normEmail);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  console.log(`   by normalised email: ${mark(!!(idByEmail && idByEmail.length))} ${idByEmail?.length ?? 0} row(s)`);
  for (const r of idByEmail ?? []) console.log(`      source=${r.source} source_id=${r.source_id} email=${maskEmail(r.email)} cust=${r.customer_id ?? '(null)'}`);
  if (orderIds.length) {
    const idByOrder = await safe('merchant_identities(order)', async () => {
      const { data, error } = await sb
        .from('merchant_identities')
        .select('source, source_id, email, customer_id')
        .eq('shop_domain', TARGET.shopDomain)
        .in('source_id', orderIds);
      if (error) throw new Error(error.message);
      return data ?? [];
    });
    console.log(`   by order id(${orderIds.join(',')}): ${mark(!!(idByOrder && idByOrder.length))} ${idByOrder?.length ?? 0} row(s)`);
    for (const r of idByOrder ?? []) console.log(`      source=${r.source} source_id=${r.source_id} email=${maskEmail(r.email)} cust=${r.customer_id ?? '(null)'}`);
  }

  // 4) customer_profiles by email ---------------------------------------------
  section('4. customer_profiles — email');
  const profByPrimary = await safe('customer_profiles(primary_email)', async () => {
    const { data, error } = await sb
      .from('customer_profiles')
      .select('id, primary_email, emails, merchant_ids, risk_level, risk_score, total_orders')
      .eq('primary_email', normEmail);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  // emails-array containment — emails is a text[]; use overlaps to avoid jsonb cast errors.
  const profByArray = await safe('customer_profiles(emails overlaps)', async () => {
    const { data, error } = await sb
      .from('customer_profiles')
      .select('id, primary_email, emails, merchant_ids, risk_level, risk_score, total_orders')
      .overlaps('emails', [normEmail]);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  const profMap = new Map<string, any>();
  for (const r of [...(profByPrimary ?? []), ...(profByArray ?? [])]) profMap.set(r.id, r);
  const profiles = [...profMap.values()];
  console.log(`   primary_email match: ${profByPrimary?.length ?? 0} | emails[] contains: ${profByArray?.length ?? 0} | unique: ${profiles.length}`);
  let scopedProfileFound = false;
  for (const p of profiles) {
    const mids = Array.isArray(p.merchant_ids) ? p.merchant_ids.map(String) : [];
    const scoped = mids.some((m: string) => merchantSet.has(m));
    if (scoped) scopedProfileFound = true;
    console.log(`   ${mark(scoped)} profile=${p.id} primary=${maskEmail(p.primary_email)} merchant_scoped=${scoped} risk=${p.risk_level}/${p.risk_score} orders=${p.total_orders} merchant_ids=[${mids.join(',')}]`);
  }
  if (!profiles.length) console.log(`   ${FAIL} No customer_profiles row matches this email at all`);
  else if (!scopedProfileFound) console.log(`   ${FAIL} Profile exists but NOT scoped to merchant(s) [${merchantIds.join(',')}] — widget lookup will treat as not-found`);

  // 5) customer_profile_identities link ---------------------------------------
  section('5. customer_profile_identities — link');
  for (const mid of merchantIds.length ? merchantIds : ['(no-merchant)']) {
    if (mid === '(no-merchant)') break;
    const links = await safe('customer_profile_identities', async () => {
      const ors: string[] = [`and(identity_type.eq.email,identity_value.eq.${normEmail})`];
      for (const oid of orderIds) ors.push(`and(identity_type.eq.shopify_order_id,identity_value.eq.${oid})`);
      const { data, error } = await sb
        .from('customer_profile_identities')
        .select('customer_profile_id, identity_type, identity_value, merchant_id, source')
        .eq('merchant_id', mid)
        .or(ors.join(','));
      if (error) throw new Error(error.message);
      return data ?? [];
    });
    console.log(`   merchant ${mid}: ${mark(!!(links && links.length))} ${links?.length ?? 0} link(s)`);
    for (const l of links ?? []) {
      const val = l.identity_type === 'email' ? maskEmail(l.identity_value) : l.identity_value;
      console.log(`      type=${l.identity_type} value=${val} profile=${l.customer_profile_id} source=${l.source}`);
    }
  }

  // 6+7) support_case_intake for the INR ticket -------------------------------
  section('6/7. support_case_intake — INR ticket');
  const intake = await safe('support_case_intake', async () => {
    const { data, error } = await sb
      .from('support_case_intake')
      .select('id, merchant_id, provider, external_case_id, order_ref, is_claim, claim_type, claim_type_confidence, claim_reason, case_status, customer_email_hash, created_at_provider, updated_at_provider')
      .eq('customer_email_hash', emailHash);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  if (intake && intake.length) {
    for (const r of intake) {
      const scoped = merchantSet.has(String(r.merchant_id));
      const isINR = String(r.claim_type ?? '').toUpperCase() === 'INR';
      console.log(`   ${mark(true)} case=${r.id} merchant=${r.merchant_id}${scoped ? '' : ' (NOT scoped!)'} provider=${r.provider} external_case=${r.external_case_id} order_ref=${r.order_ref ?? '(null)'}`);
      console.log(`      ${mark(!!r.is_claim)} is_claim=${r.is_claim}  ${mark(isINR)} claim_type=${r.claim_type ?? '(null)'} (conf=${r.claim_type_confidence ?? '?'}) reason=${r.claim_reason ?? '(null)'} status=${r.case_status ?? '?'}`);
    }
  } else {
    console.log(`   ${FAIL} No support_case_intake row for email hash ${short(emailHash)} (INR ticket never ingested under shopper email)`);
  }

  // 8) customer_claim_summary -------------------------------------------------
  section('8. customer_claim_summary');
  const summary = await safe('customer_claim_summary', async () => {
    const { data, error } = await sb
      .from('customer_claim_summary')
      .select('merchant_id, customer_email_hash, total_orders, total_claims, claim_rate, primary_reason, last_claim_at, updated_at')
      .eq('customer_email_hash', emailHash);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
  if (summary && summary.length) {
    for (const r of summary) {
      const scoped = merchantSet.has(String(r.merchant_id));
      console.log(`   ${mark(scoped)} merchant=${r.merchant_id} orders=${r.total_orders} claims=${r.total_claims} rate=${r.claim_rate} primary=${r.primary_reason ?? '(null)'} last=${r.last_claim_at ?? '(null)'} updated=${r.updated_at}`);
    }
  } else {
    console.log(`   ${FAIL} No customer_claim_summary row for this customer`);
  }

  // 9) Gorgias HTTP integration URL params ------------------------------------
  section('9. Gorgias integration ' + TARGET.gorgiasIntegrationId + ' — widget URL params');
  if (!GORGIAS_BASE_URL || !GORGIAS_API_EMAIL || !GORGIAS_API_TOKEN) {
    console.log(`   ${WARN}Skipped — GORGIAS_BASE_URL / GORGIAS_API_EMAIL / GORGIAS_API_TOKEN not all set locally`);
  } else {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${GORGIAS_API_EMAIL}:${GORGIAS_API_TOKEN}`).toString('base64');
      const res = await fetch(`${GORGIAS_BASE_URL}/api/integrations/${TARGET.gorgiasIntegrationId}`, {
        method: 'GET',
        headers: { Authorization: authHeader, Accept: 'application/json' },
      });
      console.log(`   HTTP ${res.status}`);
      if (res.ok) {
        const body: any = await res.json();
        // The widget URL can live in a few shapes depending on integration type.
        const blob = JSON.stringify(body?.http ?? body ?? {});
        const url = (blob.match(/https?:\/\/[^"'\\ ]+\/api\/gorgias\/widget[^"'\\ ]*/) || [])[0] || '(widget URL not found in integration body)';
        const checks: Array<[string, RegExp]> = [
          ['email={{ticket.sender.email}}', /email=\{\{\s*ticket\.sender\.email\s*\}\}/],
          ['customer_email={{ticket.customer.email}}', /customer_email=\{\{\s*ticket\.customer\.email\s*\}\}/],
          ['ticket_id={{ticket.id}}', /ticket_id=\{\{\s*ticket\.id\s*\}\}/],
        ];
        // redact any token-ish query value before printing
        const redactedUrl = url.replace(/(wt|token|widget_token)=[^&]+/gi, '$1=***');
        console.log(`   widget URL: ${redactedUrl}`);
        for (const [label, re] of checks) console.log(`   ${mark(re.test(blob))} contains ${label}`);
      } else {
        console.log(`   ${WARN}Could not read integration (status ${res.status}). Body omitted.`);
      }
    } catch (e) {
      console.log(`   ${WARN}Gorgias API call failed: ${(e as Error).message}`);
    }
  }

  // 10) Vercel logs -----------------------------------------------------------
  section('10. Vercel logs (widget / support-webhook 200)');
  console.log('   ⓘ  Not queryable from this script (no Vercel token in env / log API is time-windowed).');
  console.log('      Run manually:  vercel logs <deployment-url> | grep -E "gorgias/(widget|support-webhook)"');

  // ---- verdict --------------------------------------------------------------
  section('VERDICT — where the chain breaks');
  const hasIdentity = !!(idByEmail && idByEmail.length);
  const hasProfile = scopedProfileFound;
  const hasIntake = !!(intake && intake.length);
  console.log(`   merchant resolved ........ ${mark(merchantIds.length > 0)}`);
  console.log(`   order in signals ......... ${mark(orderIds.length > 0)}`);
  console.log(`   merchant_identities ...... ${mark(hasIdentity)}`);
  console.log(`   customer_profiles (scoped) ${mark(hasProfile)}`);
  console.log(`   support_case_intake ...... ${mark(hasIntake)}`);
  console.log('');
  if (hasIdentity && !hasProfile) {
    console.log(`   ${FAIL} BREAK: Shopify identity/order data present but NO merchant-scoped customer_profiles row.`);
    console.log('         => This is the "1 order but no matching profile" divergence. Profile sync gap.');
  } else if (!hasIdentity && orderIds.length === 0) {
    console.log(`   ${FAIL} BREAK: Order ${TARGET.orderName} never reached Supabase at all (no signals, no identity).`);
    console.log('         => Webhook not received / store not backfilled for this order.');
  } else if (hasProfile) {
    console.log(`   ${PASS} Profile chain intact. If the widget still says not-found, suspect the EMAIL the widget`);
    console.log('         resolves (integration URL / sender vs customer) — see section 9.');
  }
  console.log('\nDone. No writes performed.');
}

main().catch((e) => { console.error('Fatal:', (e as Error).message); process.exit(1); });
