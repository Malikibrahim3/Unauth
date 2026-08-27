/**
 * Creates the shareable fictional enterprise demo tenant and then delegates
 * the high-volume case dataset to the canonical big-merchant seeder.
 *
 * This account is intentionally synthetic. It uses .test domains, is_demo=true,
 * and synthetic connector metadata so no provider credentials are mistaken for
 * a real company connection.
 *
 * Usage:
 *   node scripts/seed-enterprise-demo.mjs
 *   SEED_OWNER_PASSWORD='...' node scripts/seed-enterprise-demo.mjs
 *   node scripts/seed-enterprise-demo.mjs --verify-only
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const MERCHANT_ID = '4f5a8c25-6dcb-4b90-9e16-3a91c27d8f44';
const MEMBERSHIP_ID = '7e2c6f19-1b4a-4d83-a6f0-9c5e2b7a8d31';
const COMPANY_NAME = 'Asterlane Commerce Group';
const LEGACY_COMPANY_NAME = 'Asterlane Commerce Group (Demo)';
const OWNER_EMAIL = 'demo@asterlane-demo.test';
const DEFAULT_OWNER_PASSWORD = 'AsterlaneDemo2026!';
const OWNER_NAME = 'Avery Mercer';
const SEED_TAG = 'asterlane-enterprise-demo';
const SEED_PREFIX = 'seed-asterlane-enterprise';
const CUSTOMER_EMAIL_DOMAIN = 'asterlane-demo.test';
const ORDER_NUMBER_PREFIX = 'ALG';
const STORE_DOMAIN = 'asterlane-commerce-demo.myshopify.test';
const BACKGROUND_ORDER_COUNT = 50_000;
const OPERATIONAL_CASE_COUNT = 392;
const RESET_ONLY = process.argv.includes('--reset');
const VERIFY_ONLY = process.argv.includes('--verify-only');

const ANCHOR = new Date();
ANCHOR.setUTCMinutes(0, 0, 0);

function daysAgoIso(days, hour = 10) {
  const date = new Date(ANCHOR);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function daysFromAnchorIso(days, hour = 10) {
  const date = new Date(ANCHOR);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function uuid(label) {
  const hex = createHash('sha256').update(`${SEED_TAG}:${label}`).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function checked(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label} failed: ${error.message}`);
  return data;
}

const RULES = [
  {
    key: 'chargeback',
    name: 'Chargeback-related case',
    description: 'Route payment disputes into a review queue with a complete evidence pack.',
    action: 'manual_review',
    priority: 95,
    conditions: [{ field: 'claim_type', operator: 'equals', value: 'chargeback' }],
  },
  {
    key: 'recoverablePartnerLoss',
    name: 'Recoverable partner loss',
    description: 'Recommend recovery work when a carrier, fulfilment partner, or supplier owns the loss.',
    action: 'approve',
    priority: 85,
    conditions: [{ field: 'recoverability', operator: 'equals', value: 'recoverable' }],
  },
  {
    key: 'lowValue',
    name: 'Low-value request',
    description: 'Keep low-value service recovery proportionate and fast.',
    action: 'approve',
    priority: 20,
    conditions: [{ field: 'amount_at_risk', operator: 'less_than', value: 50 }],
  },
  {
    key: 'deliveredProof',
    name: 'Delivered with proof of delivery',
    description: 'Deny a delivery claim when verified proof of delivery is present.',
    action: 'deny',
    priority: 90,
    conditions: [{ field: 'required_evidence', operator: 'contains', value: 'proof_of_delivery' }],
  },
  {
    key: 'missingDeliveryEvidence',
    name: 'Missing delivery evidence',
    description: 'Hold the payout decision until carrier delivery evidence is complete.',
    action: 'manual_review',
    priority: 80,
    conditions: [{ field: 'claim_type', operator: 'equals', value: 'item_not_received' }],
  },
  {
    key: 'damagedNoEvidence',
    name: 'Damaged item missing customer evidence',
    description: 'Request customer photos before approving a damage resolution.',
    action: 'manual_review',
    priority: 75,
    conditions: [{ field: 'claim_type', operator: 'equals', value: 'damaged' }],
  },
  {
    key: 'highValue',
    name: 'High-value payout requires manual review',
    description: 'Route higher exposure cases to an analyst before payout.',
    action: 'manual_review',
    priority: 100,
    conditions: [{ field: 'amount_at_risk', operator: 'greater_than', value: 150_000 }],
  },
].map((rule, index) => ({
  ...rule,
  id: uuid(`rule:${rule.key}`),
  versionId: uuid(`rule-version:${rule.key}`),
  createdAt: daysAgoIso(180 - index * 9, 11),
  updatedAt: daysAgoIso(3, 11),
}));

async function ensureOwner() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`auth list failed: ${listError.message}`);

  const emailUser = list.users.find((user) => user.email?.toLowerCase() === OWNER_EMAIL);
  if (emailUser) {
    const memberships = await checked(
      'owner membership lookup',
      supabase.from('merchant_users').select('merchant_id').eq('user_id', emailUser.id),
    );
    const foreignMembership = (memberships ?? []).find((membership) => membership.merchant_id !== MERCHANT_ID);
    if (foreignMembership) {
      throw new Error(`Demo owner email is already attached to merchant ${foreignMembership.merchant_id}.`);
    }
  }
  const existing = emailUser;
  const password = process.env.SEED_OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD;
  const metadata = {
    ...(existing?.user_metadata ?? {}),
    full_name: OWNER_NAME,
    role: 'owner',
    is_demo: true,
    active_merchant_id: MERCHANT_ID,
    setup_complete: true,
    store_name: COMPANY_NAME,
    platform: 'shopify',
    monthly_order_volume: 'over_250k',
    primary_fraud_concern: 'all',
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: OWNER_EMAIL,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw new Error(`auth update failed: ${error.message}`);
    return { user: data.user, password: null };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`auth create failed: ${error.message}`);
  return { user: data.user, password };
}

async function ensureMerchant() {
  const existing = await checked(
    'merchant lookup',
    supabase.from('merchants').select('id,name,is_demo').eq('id', MERCHANT_ID).maybeSingle(),
  );
  if (existing && ![COMPANY_NAME, LEGACY_COMPANY_NAME].includes(existing.name)) {
    throw new Error(`Deterministic Asterlane merchant id is already used by ${existing.name}.`);
  }
  await checked('merchant upsert', supabase.from('merchants').upsert({
    id: MERCHANT_ID,
    name: COMPANY_NAME,
    is_demo: true,
    is_internal: false,
    settings: {
      platform: 'shopify',
      currency: 'GBP',
      timezone: 'Europe/London',
      store_domain: STORE_DOMAIN,
      setup_complete: true,
      onboarding_profile_complete: true,
      monthly_order_volume: 'over_250k',
      primary_fraud_concern: 'all',
      dataset_version: 1,
      demo_seed: SEED_TAG,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }));
}

async function ensureMembership(ownerId) {
  await checked('merchant membership upsert', supabase.from('merchant_users').upsert({
    id: MEMBERSHIP_ID,
    merchant_id: MERCHANT_ID,
    user_id: ownerId,
    invited_email: OWNER_EMAIL,
    role: 'owner',
    invite_status: 'active',
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'id' }));
}

async function ensureRules(ownerId) {
  const ruleRows = RULES.map((rule) => ({
    id: rule.id,
    merchant_id: MERCHANT_ID,
    name: rule.name,
    description: rule.description,
    is_active: true,
    priority: rule.priority,
    conditions: rule.conditions,
    action: rule.action,
    condition_operator: 'and',
    is_default_template: false,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
  }));
  await checked('merchant rules upsert', supabase.from('merchant_rules').upsert(ruleRows, { onConflict: 'id' }));

  const existingVersions = await checked(
    'merchant rule versions lookup',
    supabase
      .from('merchant_rule_versions')
      .select('id,merchant_rule_id,version,status,name,description,conditions,action,condition_operator,priority')
      .eq('merchant_id', MERCHANT_ID)
      .in('merchant_rule_id', RULES.map((rule) => rule.id)),
  );
  const versionRows = RULES.flatMap((rule) => {
    const latest = (existingVersions ?? [])
      .filter((version) => version.merchant_rule_id === rule.id)
      .sort((a, b) => b.version - a.version)[0];
    const unchanged = latest
      && latest.status === 'published'
      && latest.name === rule.name
      && latest.description === rule.description
      && latest.action === rule.action
      && latest.condition_operator === 'and'
      && latest.priority === rule.priority
      && canonicalJson(latest.conditions) === canonicalJson(rule.conditions);
    if (unchanged) return [];
    const version = latest ? latest.version + 1 : 1;
    return [{
      id: version === 1 ? rule.versionId : uuid(`rule-version:${rule.key}:v${version}`),
      merchant_id: MERCHANT_ID,
      merchant_rule_id: rule.id,
      version,
      status: 'draft',
      name: rule.name,
      description: rule.description,
      conditions: rule.conditions,
      action: rule.action,
      condition_operator: 'and',
      priority: rule.priority,
      created_by: ownerId,
      published_by: null,
      supersedes_version_id: latest?.id ?? null,
      created_at: new Date().toISOString(),
      published_at: null,
    }];
  });
  if (versionRows.length > 0) {
    await checked('merchant rule versions insert', supabase.from('merchant_rule_versions').insert(versionRows));
    for (const version of versionRows) {
      await checked(
        'merchant rule version publish',
        supabase.rpc('publish_merchant_rule_version', {
          p_merchant_id: MERCHANT_ID,
          p_rule_id: version.merchant_rule_id,
          p_actor_id: ownerId,
        }),
      );
    }
  }
}

async function ensureBilling() {
  const subscription = await checked(
    'subscription lookup',
    supabase.from('merchant_subscriptions').select('id').eq('merchant_id', MERCHANT_ID).limit(1).maybeSingle(),
  );
  const subscriptionPayload = {
    merchant_id: MERCHANT_ID,
    plan_id: 'growth',
    status: 'active',
    current_period_start: daysAgoIso(12, 0),
    current_period_end: daysFromAnchorIso(18, 0),
    updated_at: new Date().toISOString(),
  };
  if (subscription?.id) {
    await checked('subscription update', supabase.from('merchant_subscriptions').update(subscriptionPayload).eq('id', subscription.id));
  } else {
    await checked('subscription insert', supabase.from('merchant_subscriptions').insert(subscriptionPayload));
  }

  await checked('credits upsert', supabase.from('merchant_credits').upsert({
    merchant_id: MERCHANT_ID,
    monthly_credits_remaining: 3400,
    topup_credits_remaining: 500,
    cycle_reset_at: daysFromAnchorIso(18, 0),
    last_reset_at: daysAgoIso(12, 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'merchant_id' }));
}

async function ensureConnections() {
  const syncAt = daysAgoIso(0, 9);
  const connectionRows = [
    {
      id: uuid('integration:shopify'),
      merchant_id: MERCHANT_ID,
      provider_id: 'shopify',
      category: 'commerce',
      status: 'connected',
      auth_mode: 'oauth',
      last_sync_at: syncAt,
      last_sync_started_at: daysAgoIso(0, 8),
      last_sync_completed_at: syncAt,
      last_successful_sync_at: syncAt,
      data_fresh_through: syncAt,
      webhook_status: 'active',
      webhook_last_received_at: syncAt,
      imported_record_count: BACKGROUND_ORDER_COUNT + OPERATIONAL_CASE_COUNT,
      display_name: 'Asterlane Commerce storefront',
      provider_account_id: 'asterlane-shopify-demo',
      provider_account_name: 'Asterlane Commerce online store',
      provider_base_url: 'https://asterlane-commerce-demo.myshopify.test',
      capabilities_snapshot: { read: true, read_disputes: true, read_settlements: true, writeback: false, synthetic: true },
      granted_scopes: ['read_orders', 'read_customers', 'read_fulfillments', 'read_shopify_payments_disputes'],
      subscribed: true,
      environment: 'production',
      connector_version: 'demo-2026.08',
      connection_created_at: daysAgoIso(240, 10),
      last_verified_at: syncAt,
      last_verification_status: 'verified',
      last_error_code: null,
      last_error_message: null,
      last_error: null,
      last_error_at: null,
      updated_at: syncAt,
    },
    {
      id: uuid('integration:gorgias'),
      merchant_id: MERCHANT_ID,
      provider_id: 'gorgias',
      category: 'helpdesk',
      status: 'connected',
      auth_mode: 'oauth',
      last_sync_at: syncAt,
      last_sync_started_at: daysAgoIso(0, 8),
      last_sync_completed_at: syncAt,
      imported_record_count: OPERATIONAL_CASE_COUNT,
      display_name: 'Asterlane Support workspace',
      provider_account_id: 'asterlane-gorgias-demo',
      provider_account_name: 'Asterlane Commerce Support',
      provider_base_url: 'https://asterlane-commerce-demo.gorgias.test',
      capabilities_snapshot: { read: true, writeback: false, synthetic: true },
      granted_scopes: ['read:tickets', 'read:customers'],
      subscribed: true,
      environment: 'production',
      connector_version: 'demo-2026.08',
      connection_created_at: daysAgoIso(240, 10),
      last_verified_at: syncAt,
      last_verification_status: 'verified',
      last_error_code: null,
      last_error_message: null,
      last_error: null,
      last_error_at: null,
      updated_at: syncAt,
    },
    {
      id: uuid('integration:shipbob'),
      merchant_id: MERCHANT_ID,
      provider_id: 'shipbob',
      category: 'warehouse_3pl',
      status: 'connected',
      auth_mode: 'oauth',
      last_sync_at: syncAt,
      last_sync_started_at: daysAgoIso(0, 7),
      last_sync_completed_at: syncAt,
      last_successful_sync_at: syncAt,
      data_fresh_through: syncAt,
      imported_record_count: OPERATIONAL_CASE_COUNT,
      display_name: 'Asterlane fulfilment network',
      provider_account_id: 'asterlane-shipbob-demo',
      provider_account_name: 'Asterlane UK Fulfilment',
      provider_base_url: 'https://asterlane-fulfilment.test',
      capabilities_snapshot: { read: true, writeback: false, synthetic: true },
      granted_scopes: ['read_orders', 'read_shipments'],
      subscribed: true,
      environment: 'production',
      connector_version: 'demo-2026.08',
      connection_created_at: daysAgoIso(210, 10),
      last_verified_at: syncAt,
      last_verification_status: 'verified',
      last_error_code: null,
      last_error_message: null,
      last_error: null,
      last_error_at: null,
      updated_at: syncAt,
    },
    {
      id: uuid('integration:ups'),
      merchant_id: MERCHANT_ID,
      provider_id: 'ups',
      category: 'carrier',
      status: 'connected',
      auth_mode: 'api_key',
      display_name: 'Asterlane carrier evidence',
      provider_account_id: 'asterlane-ups-demo',
      provider_account_name: 'Asterlane UPS business account',
      provider_base_url: 'https://asterlane-carrier-evidence.test',
      capabilities_snapshot: { read: true, writeback: false, synthetic: true, on_demand_evidence: true },
      granted_scopes: ['tracking', 'tracking_events', 'proof_of_delivery', 'signature'],
      last_sync_at: syncAt,
      last_sync_started_at: daysAgoIso(0, 8),
      last_sync_completed_at: syncAt,
      last_successful_sync_at: syncAt,
      data_fresh_through: syncAt,
      imported_record_count: OPERATIONAL_CASE_COUNT,
      subscribed: false,
      environment: 'production',
      connector_version: 'demo-2026.08',
      connection_created_at: daysAgoIso(190, 10),
      last_verified_at: syncAt,
      last_verification_status: 'verified',
      last_error_code: null,
      last_error_message: null,
      last_error: null,
      last_error_at: null,
      updated_at: syncAt,
    },
  ];
  await checked('merchant integrations upsert', supabase.from('merchant_integrations').upsert(connectionRows, { onConflict: 'id' }));

  await checked('store connection upsert', supabase.from('store_connections').upsert({
    id: uuid('legacy:shopify'),
    merchant_id: MERCHANT_ID,
    platform: 'shopify',
    store_key: STORE_DOMAIN,
    store_url: `https://${STORE_DOMAIN}`,
    status: 'active',
    credentials_encrypted: 'demo-synthetic-no-live-credentials',
    scopes: ['read_orders', 'read_customers', 'read_fulfillments', 'read_shopify_payments_disputes'],
    installed_at: daysAgoIso(240, 10),
    last_sync_at: syncAt,
    collector_metadata: { account_name: 'Asterlane Commerce online store', synthetic: true, payment_disputes: true },
    last_verified_at: syncAt,
    last_verification_status: 'verified',
    updated_at: syncAt,
  }, { onConflict: 'id' }));

  await checked('helpdesk connection upsert', supabase.from('helpdesk_connections').upsert({
    id: uuid('legacy:gorgias'),
    merchant_id: MERCHANT_ID,
    provider: 'gorgias',
    provider_account_id: 'asterlane-gorgias-demo',
    provider_account_name: 'Asterlane Commerce Support',
    provider_base_url: 'https://asterlane-commerce-demo.gorgias.test',
    status: 'active',
    access_token_encrypted: 'demo-synthetic-no-live-credentials',
    scopes: [
      'read:tickets',
      'read:customers',
      { kind: 'gorgias_sidebar_widget', integration_id: 7401, widget_id: 9521, registered_at: syncAt },
      { kind: 'gorgias_support_webhook', integration_id: 7402, registered_at: syncAt },
    ],
    last_sync_at: syncAt,
    webhook_secret_hash: 'demo-synthetic-webhook',
    webhook_secret_rotated_at: syncAt,
    last_verified_at: syncAt,
    last_verification_status: 'verified',
    updated_at: syncAt,
  }, { onConflict: 'id' }));
}

async function main() {
  let user;
  let password = null;
  if (VERIFY_ONLY) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(`auth list failed: ${error.message}`);
    user = data.users.find((candidate) => candidate.email?.toLowerCase() === OWNER_EMAIL) ?? null;
    if (!user) throw new Error(`Existing Asterlane demo owner ${OWNER_EMAIL} was not found.`);
  } else {
    ({ user, password } = await ensureOwner());
  }
  if (!user?.id) throw new Error('Auth user was created without an id.');
  if (!VERIFY_ONLY) {
    await ensureMerchant();
    await ensureMembership(user.id);
    await ensureRules(user.id);
    await ensureBilling();
    await ensureConnections();
  }

  process.env.SEED_MERCHANT_ID = MERCHANT_ID;
  process.env.SEED_TAG = SEED_TAG;
  process.env.SEED_PREFIX = SEED_PREFIX;
  process.env.SEED_CUSTOMER_EMAIL_DOMAIN = CUSTOMER_EMAIL_DOMAIN;
  process.env.SEED_CUSTOMER_COUNT = '10000';
  process.env.SEED_BACKGROUND_ORDER_COUNT = String(BACKGROUND_ORDER_COUNT);
  process.env.SEED_CASE_AMOUNT_SCALE = '1000';
  process.env.SEED_ORDER_NUMBER_PREFIX = ORDER_NUMBER_PREFIX;
  process.env.SEED_SOURCE_SYSTEM = 'shopify';
  process.env.SEED_SOURCE_NAME = 'asterlane_demo_import';
  process.env.SEED_SOURCE_LABEL = SEED_TAG;
  process.env.SEED_RECIPIENT_USER_ID = user.id;
  process.env.SEED_USE_GENERATED_RULE_IDS = '1';

  await import(pathToFileURL(path.join(__dirname, 'seed-simeon-big-merchant.mjs')).href);

  console.log(`\nAsterlane demo login\nEmail: ${OWNER_EMAIL}\nPassword: ${password ? 'created from the existing demo credential source' : 'unchanged'}\nWorkspace: ${COMPANY_NAME}\nMerchant ID: ${MERCHANT_ID}`);
  console.log(`Mode: ${RESET_ONLY ? 'reset-only' : VERIFY_ONLY ? 'verify-only' : 'seeded'} · synthetic connections are marked as demo data.`);
}

main().catch((error) => {
  console.error(`Enterprise demo seed failed: ${error?.message ?? error}`);
  process.exit(1);
});
