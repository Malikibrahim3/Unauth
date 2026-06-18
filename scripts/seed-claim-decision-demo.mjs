/**
 * Focused seed for the claim decision workflow demo.
 *
 * Creates one realistic INR case: delivered order, Gorgias ticket, linked claim,
 * prior INR history, merchant rule → Manual review, no customer evidence.
 *
 * Usage:
 *   node scripts/seed-claim-decision-demo.mjs
 *   node scripts/seed-claim-decision-demo.mjs --reset
 *   node scripts/seed-claim-decision-demo.mjs --verify-only
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

process.chdir(repoRoot);

function loadEnvFile() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile();

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
});

const require = createRequire(import.meta.url);
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(repoRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require('ts-node/register/transpile-only');

const { hashIdentifier } = require('../lib/identity/hash.ts');
const { normaliseEmail } = require('../lib/identity/normalise.ts');
const { encryptGorgiasApiCredentials } = require('../lib/support/gorgias/credentialCrypto.ts');
const { hashWidgetToken } = require('../lib/api/widgetTokens.ts');
const { resolveClaimForTicketDecision } = require('../lib/claims/decision/resolveClaim.ts');
const { evaluateClaimDecision } = require('../lib/claims/decision/evaluate.ts');
const { formatClaimDecisionRecommendation } = require('../lib/claims/decision/format.ts');

const DEMO_EMAIL = 'claim-decision@unauth.app';
const DEMO_PASSWORD = 'UnauthDemo2026!';
const STORE_NAME = 'Unauth Claim Decision Demo';
const SHOP_DOMAIN = 'unauth-claim-decision-demo.myshopify.com';
const CUSTOMER_EMAIL = 'maya.demoinr@unauth-demo.test';
const TICKET_EXTERNAL_ID = 'GOR-DEMO-INR-9001';
const ORDER_NUMBER = 'AU-DEMO-008842';
const ANCHOR = new Date('2026-06-10T12:00:00.000Z');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(msg, extra) {
  if (extra === undefined) console.log(`[claim-decision-demo] ${msg}`);
  else console.log(`[claim-decision-demo] ${msg}`, extra);
}

function sha(label) {
  return createHash('sha256').update(`claim-decision-demo:${label}`).digest('hex');
}

function uuid(label) {
  const hex = sha(label).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function daysAgo(days, hour = 10) {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - Math.floor(days));
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

const IDS = {
  merchant: uuid('merchant:claim-decision-demo'),
  store: uuid('store:claim-decision-demo'),
  helpdesk: uuid('helpdesk:claim-decision-demo'),
  apiKey: uuid('api-key:claim-decision-demo'),
  widgetToken: uuid('widget-token:claim-decision-demo'),
  identity: uuid('identity:maya-demo'),
  customer: uuid('customer:maya-demo'),
  order: uuid('order:maya-current'),
  fulfillment: uuid('fulfillment:maya-current'),
  ticket: uuid('ticket:maya-inr'),
  claimCurrent: uuid('claim:maya-current-inr'),
  claimPrior1: uuid('claim:maya-prior-inr-1'),
  claimPrior2: uuid('claim:maya-prior-inr-2'),
  rule: uuid('rule:inr-delivered-prior'),
};

const WIDGET_TOKEN_PLAINTEXT = `unauth_wt_${sha('widget-plaintext').slice(0, 32)}`;

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser() {
  const existing = await findUser(DEMO_EMAIL);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { setup_complete: true, store_name: STORE_NAME, claim_decision_demo: true },
    });
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { setup_complete: true, store_name: STORE_NAME, claim_decision_demo: true },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user.id;
}

async function ensureMerchant(userId) {
  const { error: merchantError } = await supabase.from('merchants').upsert({
    id: IDS.merchant,
    name: STORE_NAME,
    is_demo: true,
    is_internal: false,
    settings: {
      setup_complete: true,
      platform: 'shopify',
      claim_decision_demo: true,
    },
  }, { onConflict: 'id' });
  if (merchantError) throw merchantError;

  const { error: memberError } = await supabase.from('merchant_users').upsert({
    merchant_id: IDS.merchant,
    user_id: userId,
    invited_email: DEMO_EMAIL,
    role: 'owner',
    invite_status: 'active',
    accepted_at: daysAgo(90),
  }, { onConflict: 'merchant_id,invited_email' });
  if (memberError) throw memberError;

  return IDS.merchant;
}

async function resetDemoMerchantData(merchantId) {
  const claimIds = [IDS.claimCurrent, IDS.claimPrior1, IDS.claimPrior2];
  await supabase.from('rule_evaluations').delete().eq('merchant_id', merchantId);
  await supabase.from('claim_evidence').delete().in('claim_id', claimIds);
  await supabase.from('claim_outcomes').delete().in('claim_id', claimIds);
  await supabase.from('claim_events').delete().in('claim_id', claimIds);
  await supabase.from('claims').delete().in('id', claimIds);
  await supabase.from('source_tickets').delete().eq('id', IDS.ticket);
  await supabase.from('source_fulfillments').delete().eq('id', IDS.fulfillment);
  await supabase.from('source_orders').delete().eq('id', IDS.order);
  await supabase.from('source_customers').delete().eq('id', IDS.customer);
  await supabase.from('merchant_rules').delete().eq('merchant_id', merchantId);
}

async function ensureConnections(merchantId) {
  await supabase.from('store_connections').delete().eq('platform', 'shopify').eq('store_key', SHOP_DOMAIN);
  await supabase.from('helpdesk_connections').delete().eq('provider', 'gorgias').eq('provider_account_id', 'unauth-claim-decision-gorgias');

  const { error: storeError } = await supabase.from('store_connections').upsert({
    id: IDS.store,
    merchant_id: merchantId,
    platform: 'shopify',
    store_key: SHOP_DOMAIN,
    store_url: `https://${SHOP_DOMAIN}`,
    status: 'active',
    credentials_encrypted: 'claim-decision-demo-placeholder-token',
    scopes: ['read_orders', 'read_customers'],
    installed_at: daysAgo(180),
    last_sync_at: daysAgo(0.5),
  }, { onConflict: 'id' });
  if (storeError) throw storeError;

  const { error: helpdeskError } = await supabase.from('helpdesk_connections').upsert({
    id: IDS.helpdesk,
    merchant_id: merchantId,
    provider: 'gorgias',
    provider_account_id: 'unauth-claim-decision-gorgias',
    provider_account_name: 'Unauth Claim Decision Support',
    provider_base_url: 'https://unauth-claim-decision.gorgias.com',
    status: 'active',
    access_token_encrypted: encryptGorgiasApiCredentials({
      email: 'support@unauth-claim-decision.test',
      api_key: 'claim-decision-demo-gorgias-key',
    }),
    scopes: ['openid', 'tickets:read', 'tickets:write'],
    last_sync_at: daysAgo(0.5),
  }, { onConflict: 'id' });
  if (helpdeskError) throw helpdeskError;
}

async function ensureSubscription(merchantId) {
  const periodStart = new Date(ANCHOR);
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const { data: existingSub } = await supabase.from('merchant_subscriptions').select('id').eq('merchant_id', merchantId).maybeSingle();
  if (!existingSub) {
    await supabase.from('merchant_subscriptions').insert({
      merchant_id: merchantId,
      plan_id: 'growth',
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      context_credits_monthly: 5000,
      cancel_at_period_end: false,
    });
  }

  await supabase.from('merchant_credits').upsert({
    merchant_id: merchantId,
    monthly_credits_remaining: 4000,
    topup_credits_remaining: 500,
    cycle_reset_at: periodEnd.toISOString(),
    last_reset_at: periodStart.toISOString(),
    updated_at: ANCHOR.toISOString(),
  }, { onConflict: 'merchant_id' });
}

async function ensureWidgetToken(merchantId) {
  const keyHash = createHash('sha256').update('claim-decision-demo-api-key', 'utf8').digest('hex');
  await supabase.from('merchant_api_keys').upsert({
    id: IDS.apiKey,
    merchant_id: merchantId,
    name: 'Claim decision demo widget',
    key_hash: keyHash,
    key_prefix: 'cd_demo_',
    rate_limit_per_minute: 120,
    revoked_at: null,
  }, { onConflict: 'id' });

  await supabase.from('merchant_widget_tokens').upsert({
    id: IDS.widgetToken,
    merchant_id: merchantId,
    api_key_id: IDS.apiKey,
    token_hash: hashWidgetToken(WIDGET_TOKEN_PLAINTEXT),
    token_prefix: WIDGET_TOKEN_PLAINTEXT.slice(0, 18),
    revoked_at: null,
  }, { onConflict: 'id' });
}

async function ensureIdentityGraph() {
  const now = daysAgo(0, 12);
  const emailNorm = normaliseEmail(CUSTOMER_EMAIL);
  const emailHash = hashIdentifier(emailNorm);

  await supabase.from('identities').upsert({
    id: IDS.identity,
    confidence_grade: 'probable',
    confidence_score: 72,
    merchant_count: 1,
    signal_count: 4,
    first_seen_at: daysAgo(400),
    last_seen_at: now,
    created_at: daysAgo(400),
    updated_at: now,
  }, { onConflict: 'id' });

  await supabase.from('identity_members').upsert({
    identity_id: IDS.identity,
    identifier_type: 'email',
    identifier_hash: emailHash,
    identifier_value_masked: CUSTOMER_EMAIL.replace(/(.{2}).+(@.+)/, '$1***$2'),
    first_seen_at: daysAgo(400),
    last_seen_at: now,
  }, { onConflict: 'identity_id,identifier_type,identifier_hash' });

  await supabase.from('identity_profiles').upsert({
    identity_id: IDS.identity,
    total_orders: 6,
    total_claims: 3,
    total_chargebacks: 0,
    total_refund_amount: 168.5,
    claim_rate: 0.5,
    claim_type_counts: { item_not_received: 3 },
    merchant_count: 1,
    first_seen_at: daysAgo(400),
    last_seen_at: now,
    refreshed_at: now,
  }, { onConflict: 'identity_id' });
}

async function seedCoreEntities(merchantId) {
  const placedAt = daysAgo(18, 14);
  const deliveredAt = daysAgo(12, 16);

  await supabase.from('source_customers').upsert({
    id: IDS.customer,
    merchant_id: merchantId,
    source: 'shopify',
    connection_id: IDS.store,
    external_id: 'SHOP-CUST-MAYA-DEMO',
    email: CUSTOMER_EMAIL,
    phone: '+447700900501',
    first_name: 'Maya',
    last_name: 'Chen',
    orders_count: 6,
    total_spent: 512.4,
    account_created_at: daysAgo(400),
  }, { onConflict: 'id' });

  await supabase.from('source_orders').upsert({
    id: IDS.order,
    merchant_id: merchantId,
    source: 'shopify',
    connection_id: IDS.store,
    external_id: ORDER_NUMBER,
    order_number: ORDER_NUMBER,
    source_customer_id: IDS.customer,
    email: CUSTOMER_EMAIL,
    phone: '+447700900501',
    financial_status: 'paid',
    fulfillment_state: 'delivered',
    total_price: 84.2,
    currency: 'GBP',
    payment_gateway: 'shopify_payments',
    card_last4: '4242',
    placed_at: placedAt,
  }, { onConflict: 'id' });

  await supabase.from('source_fulfillments').upsert({
    id: IDS.fulfillment,
    merchant_id: merchantId,
    source_order_id: IDS.order,
    external_id: `FUL-${ORDER_NUMBER}`,
    status: 'success',
    shipment_status: 'delivered',
    tracking_company: 'Royal Mail',
    tracking_number: 'RM884200199GB',
    occurred_at: deliveredAt,
  }, { onConflict: 'id' });

  await supabase.from('source_tickets').upsert({
    id: IDS.ticket,
    merchant_id: merchantId,
    provider: 'gorgias',
    connection_id: IDS.helpdesk,
    external_id: TICKET_EXTERNAL_ID,
    subject: 'Package never arrived — tracking says delivered',
    channel: 'email',
    status: 'open',
    tags: ['refund-request', 'missing-parcel'],
    linked_order_external_ids: [ORDER_NUMBER],
    source_customer_id: IDS.customer,
    opened_at_provider: daysAgo(2, 9),
    created_at_provider: daysAgo(2, 9),
    message_count: 4,
    customer_reply_count: 2,
  }, { onConflict: 'id' });

  const priorSubmitted1 = daysAgo(120, 11);
  const priorSubmitted2 = daysAgo(45, 11);
  const currentSubmitted = daysAgo(2, 10);

  const priorClaims = [
    {
      id: IDS.claimPrior1,
      status: 'resolved_denied',
      submitted_at: priorSubmitted1,
      amount_at_risk: 62.5,
      reason_raw: 'Prior INR — tracking showed delivered, claim denied.',
    },
    {
      id: IDS.claimPrior2,
      status: 'resolved_refunded',
      submitted_at: priorSubmitted2,
      amount_at_risk: 54.0,
      reason_raw: 'Prior INR — partial goodwill refund after review.',
    },
  ];

  for (const prior of priorClaims) {
    await supabase.from('claims').upsert({
      id: prior.id,
      merchant_id: merchantId,
      identity_id: IDS.identity,
      source_order_id: IDS.order,
      source_ticket_id: null,
      claim_type: 'item_not_received',
      status: prior.status,
      detection_method: 'manual',
      detection_detail: {
        claim_type_confidence: 0.88,
        classification_source: 'demo_seed',
        classifier_claim_type: 'item_not_received',
      },
      reason_raw: prior.reason_raw,
      reason_normalized: 'Item not received',
      amount_at_risk: prior.amount_at_risk,
      currency: 'GBP',
      requires_review: false,
      submitted_at: prior.submitted_at,
      created_at: prior.submitted_at,
      updated_at: prior.submitted_at,
    }, { onConflict: 'id' });

    await supabase.from('claim_outcomes').upsert({
      id: uuid(`outcome:${prior.id}`),
      claim_id: prior.id,
      decision: prior.status === 'resolved_denied' ? 'denied' : 'full_refund',
      outcome: prior.status === 'resolved_denied' ? 'suspected_fraud' : 'legitimate',
      amount_refunded: prior.status === 'resolved_refunded' ? prior.amount_at_risk : null,
      notes: 'Demo prior INR outcome.',
      decided_at: prior.submitted_at,
    }, { onConflict: 'id' });
  }

  await supabase.from('claims').upsert({
    id: IDS.claimCurrent,
    merchant_id: merchantId,
    identity_id: IDS.identity,
    source_order_id: IDS.order,
    source_ticket_id: IDS.ticket,
    claim_type: 'item_not_received',
    status: 'open',
    detection_method: 'tag',
    detection_detail: {
      claim_type_confidence: 0.92,
      classification_source: 'tag',
      classifier_claim_type: 'item_not_received',
      keyword_matched: 'never arrived',
    },
    reason_raw: 'Customer says the package never arrived although tracking shows delivered.',
    reason_normalized: 'Item not received',
    amount_at_risk: 84.2,
    currency: 'GBP',
    requires_review: true,
    submitted_at: currentSubmitted,
    created_at: currentSubmitted,
    updated_at: currentSubmitted,
  }, { onConflict: 'id' });

  await supabase.from('claim_events').upsert({
    id: uuid('event:claim-current-created'),
    claim_id: IDS.claimCurrent,
    merchant_id: merchantId,
    event_type: 'created',
    to_status: 'open',
    note: 'Claim created from Gorgias ticket (demo seed).',
    metadata: { seed: 'claim_decision_demo' },
    created_at: currentSubmitted,
  }, { onConflict: 'id' });

  // No customer evidence on current claim — rule should fire on has_customer_evidence = false.
  // Prior claims may have tracking evidence; current claim relies on fulfillment sync at evaluation.

  await supabase.from('merchant_rules').upsert({
    id: IDS.rule,
    merchant_id: merchantId,
    name: 'INR delivered — request evidence',
    description: 'Delivered INR with prior same-type claims and no customer evidence → manual review.',
    is_active: true,
    priority: 0,
    condition_operator: 'and',
    action: 'manual_review',
    conditions: [
      { id: 'c1', field: 'claim_type', operator: 'eq', value: 'item_not_received' },
      { id: 'c2', field: 'delivery_status', operator: 'eq', value: 'delivered' },
      { id: 'c3', field: 'merchant_prior_same_type_claim_count', operator: 'gte', value: 1 },
      { id: 'c4', field: 'has_customer_evidence', operator: 'eq', value: false },
    ],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

async function runVerification(merchantId) {
  const checks = [];

  const resolution = await resolveClaimForTicketDecision(supabase, {
    merchantId,
    ticketExternalId: TICKET_EXTERNAL_ID,
    orderReference: ORDER_NUMBER,
    claimType: 'item_not_received',
  });
  checks.push({
    name: 'resolveClaimForTicketDecision → resolved',
    pass: resolution.status === 'resolved' && resolution.claimId === IDS.claimCurrent,
    detail: resolution,
  });

  const widgetEval = await evaluateClaimDecision({
    client: supabase,
    merchantId,
    claimId: IDS.claimCurrent,
    source: 'gorgias_widget',
  });
  const widgetFormatted = widgetEval
    ? formatClaimDecisionRecommendation(widgetEval.evaluation, widgetEval.ruleCount)
    : null;
  checks.push({
    name: 'evaluateClaimDecision (widget) → manual_review',
    pass: widgetEval?.evaluation.recommendation === 'manual_review',
    detail: {
      recommendation: widgetEval?.evaluation.recommendation,
      ruleName: widgetEval?.evaluation.rule_name,
      auditStatus: widgetEval?.auditStatus,
      formattedLabel: widgetFormatted?.recommendationLabel,
    },
  });

  const appEval = await evaluateClaimDecision({
    client: supabase,
    merchantId,
    claimId: IDS.claimCurrent,
    source: 'claim_review',
  });
  checks.push({
    name: 'evaluateClaimDecision (in-app) matches widget',
    pass:
      appEval?.evaluation.recommendation === widgetEval?.evaluation.recommendation
      && appEval?.evaluation.rule_id === widgetEval?.evaluation.rule_id,
    detail: {
      widget: widgetEval?.evaluation.recommendation,
      app: appEval?.evaluation.recommendation,
      auditStatus: appEval?.auditStatus,
    },
  });

  const { data: audits } = await supabase
    .from('rule_evaluations')
    .select('id, claim_id, source_ticket_id, evaluation_source, dedupe_key, signals_hash, rules_hash, justification_summary, recommendation, rule_id, matched_conditions')
    .eq('merchant_id', merchantId)
    .eq('claim_id', IDS.claimCurrent)
    .order('evaluated_at', { ascending: false })
    .limit(3);

  const latestAudit = audits?.[0] ?? null;
  checks.push({
    name: 'audit row has claim_id + source_ticket_id + hashes',
    pass: Boolean(
      latestAudit?.claim_id
      && latestAudit?.source_ticket_id === IDS.ticket
      && latestAudit?.dedupe_key
      && latestAudit?.signals_hash
      && latestAudit?.rules_hash,
    ),
    detail: latestAudit,
  });

  const dedupeEval = await evaluateClaimDecision({
    client: supabase,
    merchantId,
    claimId: IDS.claimCurrent,
    source: 'gorgias_widget',
  });
  checks.push({
    name: 'duplicate widget refresh dedupes audit',
    pass: dedupeEval?.auditStatus === 'deduped',
    detail: { auditStatus: dedupeEval?.auditStatus },
  });

  const matchedPlain = widgetFormatted?.matchedConditions?.map((c) => c.label) ?? [];
  checks.push({
    name: 'matched conditions are plain language',
    pass: matchedPlain.some((l) => /claim type/i.test(l)) && matchedPlain.some((l) => /evidence/i.test(l)),
    detail: matchedPlain,
  });

  const allPass = checks.every((c) => c.pass);
  return { allPass, checks, widgetFormatted, resolution };
}

function buildSummary(merchantId, verification) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    ok: verification.allPass,
    login: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    merchant_id: merchantId,
    identifiers: {
      customer_email: CUSTOMER_EMAIL,
      identity_id: IDS.identity,
      ticket_external_id: TICKET_EXTERNAL_ID,
      order_number: ORDER_NUMBER,
      claim_id: IDS.claimCurrent,
      rule_id: IDS.rule,
    },
    widget: {
      token: WIDGET_TOKEN_PLAINTEXT,
      url: `${appBase}/api/gorgias/widget?widget_token=${encodeURIComponent(WIDGET_TOKEN_PLAINTEXT)}&email=${encodeURIComponent(CUSTOMER_EMAIL)}&ticket_id=${encodeURIComponent(TICKET_EXTERNAL_ID)}&order_number=${encodeURIComponent(ORDER_NUMBER)}`,
      expected_recommendation: 'Manual review',
      expected_rule: 'INR delivered — request evidence',
    },
    in_app: {
      url: `${appBase}/customers/${IDS.identity}/claims?claimId=${IDS.claimCurrent}`,
      expected_recommendation: 'Manual review',
    },
    verification: verification.checks,
    matched_conditions: verification.widgetFormatted?.matchedConditions ?? [],
  };
}

async function main() {
  const reset = process.argv.includes('--reset');
  const verifyOnly = process.argv.includes('--verify-only');

  const userId = await ensureUser();
  const merchantId = await ensureMerchant(userId);

  if (!verifyOnly) {
    if (reset) {
      log('Resetting demo merchant entities…');
      await resetDemoMerchantData(merchantId);
    }
    log('Ensuring connections, subscription, widget token…');
    await ensureConnections(merchantId);
    await ensureSubscription(merchantId);
    await ensureWidgetToken(merchantId);
    await ensureIdentityGraph();
    log('Seeding demo claim scenario…');
    await seedCoreEntities(merchantId);
  }

  log('Running verification…');
  const verification = await runVerification(merchantId);
  const summary = buildSummary(merchantId, verification);

  const logPath = path.join(repoRoot, 'scripts/claim-decision-demo-log.json');
  fs.writeFileSync(logPath, JSON.stringify(summary, null, 2));

  for (const check of verification.checks) {
    log(`${check.pass ? 'PASS' : 'FAIL'} — ${check.name}`, check.pass ? undefined : check.detail);
  }

  console.log(JSON.stringify(summary, null, 2));

  if (!verification.allPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[claim-decision-demo] fatal', err);
  process.exit(1);
});
