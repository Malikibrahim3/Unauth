/**
 * Full v2 presentation demo — large-store scale with clear bad-actor segments.
 *
 * Usage:
 *   node scripts/seed-presentation-demo.mjs              # full Aurora reseed
 *   node scripts/seed-presentation-demo.mjs --resume     # observations + resolve
 *   node scripts/seed-presentation-demo.mjs --claims-only
 *   node scripts/seed-presentation-demo.mjs --cross-merchant  # sibling merchants + network villains
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

const { emitIdentityObservations } = require('../lib/identity/observations.ts');
const { resolveIdentitiesForKeys } = require('../lib/identity/resolver.ts');
const { hashIdentifier } = require('../lib/identity/hash.ts');
const { normaliseEmail, normaliseAddress } = require('../lib/identity/normalise.ts');
const { encryptGorgiasApiCredentials } = require('../lib/support/gorgias/credentialCrypto.ts');

const DEMO_EMAIL = 'presentation@unauth.app';
const DEMO_PASSWORD = 'UnauthDemo2026!';
const STORE_NAME = 'Aurora Outfitters UK';
const SHOP_DOMAIN = 'aurora-outfitters-demo.myshopify.com';
const ANCHOR = new Date('2026-06-10T12:00:00.000Z');
const BULK_CUSTOMER_COUNT = 3400;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rand = mulberry32(160610);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const CITIES = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow', 'Liverpool', 'Cardiff', 'Newcastle'];
const STREETS = ['High Street', 'Market Road', 'Station Lane', 'King Street', 'Queen Street', 'Canal Yard', 'Dock Road', 'Elm Grove', 'Park Avenue', 'Church Road'];
const FIRST = ['Amelia', 'Noah', 'Sophie', 'Priya', 'Owen', 'Reginald', 'Lara', 'Ethan', 'Maya', 'Jonas', 'Leah', 'Oscar', 'Sofia', 'Nathan', 'Iris', 'Daniel', 'Zara', 'Felix', 'Imani', 'Rafael'];
const LAST = ['King', 'Patel', 'Evans', 'Mehta', 'Clarke', 'Osei', 'Hughes', 'Lewis', 'Bennett', 'Hart', 'Foster', 'Cole', 'Rahman', 'Morgan', 'Wallace', 'Reed', 'Stone', 'Turner', 'Shaw', 'Murray'];

/** Named bad actors — easy to find in demo searches */
const BAD_ACTORS = [
  { key: 'villain-reginald', name: 'Reginald Osei', email: 'reginald.osei@aurora-demo.test', phone: '+447700900110', address: '31 Canal Yard, Manchester M4 6EF', segment: 'Serial INR fraudster', risk: 'critical', orders: 24, refunds: 16, claims: 11, chargebacks: 2, watchlist: true, status: 'under_review', card: '4891', ip: '82.14.88.12', note: '7 denied INR claims in 90 days. Cross-merchant match on file. Escalate before any refund.' },
  { key: 'villain-lara', name: 'Lara Hughes', email: 'lara.hughes@aurora-demo.test', phone: '+447700900111', address: '77 Dock Road, London E16 2QU', segment: 'Chargeback after denial', risk: 'critical', orders: 19, refunds: 11, claims: 9, chargebacks: 3, watchlist: true, status: 'under_review', card: '5522', ip: '82.14.88.13', note: 'Denied missing-parcel claim then filed issuer chargeback. Evidence package ready.' },
  { key: 'villain-priya', name: 'Priya Mehta', email: 'priya.mehta@aurora-demo.test', phone: '+447700900107', address: '14 Falcon House, London E1 6AN', segment: 'Rapid INR velocity', risk: 'critical', orders: 17, refunds: 12, claims: 8, chargebacks: 0, watchlist: true, status: 'under_review', card: '4418', ip: '82.14.88.14', note: '4 INR claims in 14 days. GPS mismatch on 2 deliveries.' },
  { key: 'villain-owen', name: 'Owen Clarke', email: 'owen.clarke@aurora-demo.test', phone: '+447700900108', address: '89 Canal Yard, Birmingham B1 1AA', segment: 'Duplicate claim abuse', risk: 'high', orders: 14, refunds: 8, claims: 7, chargebacks: 1, watchlist: true, status: 'under_review', card: '4477', ip: '82.14.88.15', note: 'Reopened resolved claim on same order. Duplicate-prevention flag.' },
  { key: 'villain-vince', name: 'Vince Moreno', email: 'vince.moreno@aurora-demo.test', phone: '+447700900201', address: '12 Warehouse Mews, London E1 7AA', segment: 'Address cluster fraud', risk: 'critical', orders: 21, refunds: 14, claims: 10, chargebacks: 1, watchlist: true, status: 'under_review', card: '4891', ip: '82.14.88.12', note: 'Shares address + card with Reginald Osei ring. Suspected organised refund abuse.' },
  { key: 'villain-tara', name: 'Tara Singh', email: 'tara.singh@aurora-demo.test', phone: '+447700900202', address: '12 Warehouse Mews, London E1 7AA', segment: 'Address cluster fraud', risk: 'critical', orders: 18, refunds: 12, claims: 9, chargebacks: 0, watchlist: true, status: 'under_review', card: '4891', ip: '82.14.88.12', note: 'Same shipping cluster as Vince Moreno / Reginald Osei. Do not approve refunds.' },
  { key: 'villain-felix', name: 'Felix Marsh', email: 'felix.marsh@aurora-demo.test', phone: '+447700900203', address: '200 Bishopsgate, London EC2M 4NR', segment: 'Email alias rotation', risk: 'high', orders: 16, refunds: 9, claims: 6, chargebacks: 0, watchlist: true, status: 'contacted', card: '5102', ip: '203.0.113.44', note: 'Uses 6 email aliases tied to one device fingerprint.' },
  { key: 'villain-nina', name: 'Nina Kowalski', email: 'nina.kowalski@aurora-demo.test', phone: '+447700900204', address: '44 Deansgate, Manchester M3 2BW', segment: 'Return abuse', risk: 'high', orders: 22, refunds: 15, claims: 5, chargebacks: 0, watchlist: false, status: 'under_review', card: '3782', ip: '82.16.44.90', note: '68% refund rate on £8k+ LTV. Return labels scanned but items missing from warehouse.' },
  { key: 'villain-james', name: 'James Porter', email: 'james.porter@aurora-demo.test', phone: '+447700900205', address: '9 Broad Street, Birmingham B1 2EA', segment: 'Denial then chargeback', risk: 'critical', orders: 13, refunds: 7, claims: 6, chargebacks: 2, watchlist: true, status: 'under_review', card: '6011', ip: '82.18.22.17', note: 'Chargeback filed 48h after INR denial. Acquirer dispute in progress.' },
  { key: 'villain-chloe', name: 'Chloe Hart', email: 'chloe.hart@aurora-demo.test', phone: '+447700900206', address: '18 George Street, Edinburgh EH2 2PF', segment: 'High-value INR', risk: 'critical', orders: 15, refunds: 9, claims: 7, chargebacks: 1, watchlist: true, status: 'under_review', card: '4242', ip: '82.20.11.55', note: '£4,200 at risk across open claims. AOV £280+. Manager review required.' },
  { key: 'villain-amir', name: 'Amir Rashid', email: 'amir.rashid@aurora-demo.test', phone: '+447700900207', address: '3 Paradise Street, Liverpool L1 3EU', segment: 'Repeat watchlist', risk: 'high', orders: 20, refunds: 11, claims: 8, chargebacks: 0, watchlist: true, status: 'under_review', card: '4539', ip: '82.22.77.31', note: 'Previously watchlisted at 2 other merchants in network.' },
  { key: 'villain-sienna', name: 'Sienna Blake', email: 'sienna.blake@aurora-demo.test', phone: '+447700900208', address: '6 Queen Street, Cardiff CF10 2BJ', segment: 'New account burst', risk: 'high', orders: 8, refunds: 6, claims: 5, chargebacks: 0, watchlist: true, status: 'new', card: '4921', ip: '82.24.90.18', note: 'Account 11 days old. 5 INR claims already. Classic bust-out pattern.' },
];

const LOYAL_SAMPLES = [
  { key: 'loyal-amelia', name: 'Amelia King', email: 'amelia.king@aurora-demo.test', phone: '+447700900101', address: '41 Wycliffe Road, London SW11 5QR', risk: 'low', orders: 34, refunds: 1, claims: 0, chargebacks: 0, watchlist: false, status: 'cleared', segment: 'VIP loyal' },
  { key: 'loyal-noah', name: 'Noah Patel', email: 'noah.patel@aurora-demo.test', phone: '+447700900102', address: '18 York Place, Bristol BS8 1AH', risk: 'low', orders: 21, refunds: 2, claims: 1, chargebacks: 0, watchlist: false, status: 'cleared', segment: 'Long-tenured' },
  { key: 'returns-sophie', name: 'Sophie Evans', email: 'sophie.evans@aurora-demo.test', phone: '+447700900104', address: '27 Castle Street, Cardiff CF10 1BT', risk: 'medium', orders: 42, refunds: 14, claims: 4, chargebacks: 0, watchlist: false, status: 'under_review', segment: 'High-return legitimate' },
];

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function log(msg, extra) {
  if (extra === undefined) console.log(`[presentation-seed] ${msg}`);
  else console.log(`[presentation-seed] ${msg}`, extra);
}

function sha(label) {
  return createHash('sha256').update(`presentation-demo:${label}`).digest('hex');
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

function money(v) {
  return Number(v.toFixed(2));
}

function segmentForIndex(i) {
  if (i % 53 === 0) return 'critical';
  if (i % 19 === 0) return 'high';
  if (i % 6 === 0) return 'medium';
  return 'low';
}

function buildBulkProfiles(count) {
  return Array.from({ length: count }, (_, idx) => {
    const i = idx + 1;
    const risk = segmentForIndex(i);
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 5) % LAST.length];
    const city = CITIES[i % CITIES.length];
    const street = STREETS[(i * 3) % STREETS.length];
    let orders;
    let claims;
    let chargebacks;
    let watchlist;
    let status;

    switch (risk) {
      case 'critical':
        orders = 12 + (i % 14);
        claims = 5 + (i % 6);
        chargebacks = i % 4 === 0 ? 1 : 0;
        watchlist = true;
        status = 'under_review';
        break;
      case 'high':
        orders = 8 + (i % 12);
        claims = 2 + (i % 4);
        chargebacks = i % 9 === 0 ? 1 : 0;
        watchlist = i % 3 === 0;
        status = i % 2 === 0 ? 'under_review' : 'contacted';
        break;
      case 'medium':
        orders = 4 + (i % 12);
        claims = i % 3 === 0 ? 1 : 0;
        chargebacks = 0;
        watchlist = false;
        status = i % 2 === 0 ? 'cleared' : 'contacted';
        break;
      default:
        orders = 1 + (i % 9);
        claims = 0;
        chargebacks = 0;
        watchlist = false;
        status = 'cleared';
    }

    return {
      key: `bulk-${String(i).padStart(4, '0')}`,
      name: `${first} ${last}`,
      email: `shopper.${String(i).padStart(4, '0')}@aurora-demo.test`,
      phone: `+4477${String(1000000 + i).slice(-7)}`,
      address: `${(i % 220) + 1} ${street}, ${city}, UK`,
      risk,
      orders,
      refunds: Math.min(claims + (risk === 'medium' ? i % 3 : 0), orders - 1),
      claims,
      chargebacks,
      watchlist,
      status,
      segment: risk === 'low' ? 'Regular shopper' : `${risk} risk bulk segment`,
      card: String(4000 + (i * 37) % 6000).slice(-4),
      ip: `10.${(i % 200) + 10}.${(i % 240) + 10}.${(i % 200) + 20}`,
      note: null,
    };
  });
}

const ALL_PROFILES = [...BAD_ACTORS, ...LOYAL_SAMPLES, ...buildBulkProfiles(BULK_CUSTOMER_COUNT)];

function orderValueFor(profile, orderIndex) {
  const base = profile.risk === 'critical' ? 140 : profile.risk === 'high' ? 95 : profile.risk === 'medium' ? 65 : 42;
  const spread = profile.risk === 'critical' ? 520 : profile.risk === 'high' ? 280 : profile.risk === 'medium' ? 160 : 110;
  const jitter = (profile.key.length * 17 + orderIndex * 43) % spread;
  return money(base + jitter);
}

function ltvFor(profile) {
  let total = 0;
  for (let o = 0; o < profile.orders; o += 1) total += orderValueFor(profile, o);
  return money(total);
}

function gradeForRisk(risk) {
  if (risk === 'critical') return 'definite';
  if (risk === 'high') return 'probable';
  if (risk === 'medium') return 'possible';
  return 'weak';
}

function matchForRisk(risk) {
  if (risk === 'critical') return 'definite';
  if (risk === 'high') return 'probable';
  if (risk === 'medium') return 'candidate';
  return 'none';
}

function identityScoreFor(risk) {
  if (risk === 'critical') return 92 + Math.floor(rand() * 8);
  if (risk === 'high') return 74 + Math.floor(rand() * 14);
  if (risk === 'medium') return 48 + Math.floor(rand() * 18);
  return 8 + Math.floor(rand() * 28);
}

function riskRank(risk) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[risk] ?? 0;
}

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
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { setup_complete: true, store_name: STORE_NAME, seeded_demo: true, presentation_demo: true },
    });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { setup_complete: true, store_name: STORE_NAME, seeded_demo: true, presentation_demo: true },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user.id;
}

async function ensureMerchant(userId) {
  const merchantId = uuid('merchant:aurora-presentation-v2');
  const { data: existingMember } = await supabase
    .from('merchant_users')
    .select('merchant_id, merchants(id,name,is_demo)')
    .eq('user_id', userId)
    .eq('invite_status', 'active')
    .maybeSingle();

  // Always use the v2 merchant id so reseeds start clean (old claims are append-only).
  if (existingMember && existingMember.merchant_id !== merchantId) {
    await supabase
      .from('merchant_users')
      .update({ invite_status: 'revoked' })
      .eq('merchant_id', existingMember.merchant_id)
      .eq('user_id', userId);
  }

  const { error: merchantError } = await supabase.from('merchants').upsert({
    id: merchantId,
    name: STORE_NAME,
    is_demo: true,
    is_internal: false,
    settings: {
      setup_complete: true,
      platform: 'shopify',
      monthly_order_volume: 'over_250k',
      primary_fraud_concern: 'inr_claims',
      presentation_demo: true,
    },
  }, { onConflict: 'id' });
  if (merchantError) throw merchantError;

  const { error: memberError } = await supabase.from('merchant_users').upsert({
    merchant_id: merchantId,
    user_id: userId,
    invited_email: DEMO_EMAIL,
    role: 'owner',
    invite_status: 'active',
    accepted_at: daysAgo(120),
  }, { onConflict: 'merchant_id,invited_email' });
  if (memberError) throw memberError;

  return { merchantId };
}

async function deleteMerchantData(merchantId) {
  const { data: claims } = await supabase.from('support_payout_cases').select('id').eq('merchant_id', merchantId);
  const claimIds = (claims ?? []).map((c) => c.id);
  if (claimIds.length) {
    for (let i = 0; i < claimIds.length; i += 200) {
      const slice = claimIds.slice(i, i + 200);
      await supabase.from('claim_evidence').delete().in('claim_id', slice);
      await supabase.from('claim_outcomes').delete().in('claim_id', slice);
    }
    await supabase.from('support_payout_cases').delete().eq('merchant_id', merchantId);
  }
  await supabase.from('source_tickets').delete().eq('merchant_id', merchantId);
  await supabase.from('identity_notes').delete().eq('merchant_id', merchantId);
  await supabase.from('merchant_identity_state').delete().eq('merchant_id', merchantId);
  await supabase.from('customer_identity_signals').delete().eq('merchant_id', merchantId);
  await supabase.from('identity_edges').delete().eq('merchant_id', merchantId);

  for (let round = 0; round < 80; round += 1) {
    const { data: orderRows } = await supabase.from('source_orders').select('id').eq('merchant_id', merchantId).limit(400);
    if (!orderRows?.length) break;
    await supabase.from('source_orders').delete().in('id', orderRows.map((r) => r.id));
  }
  for (let round = 0; round < 20; round += 1) {
    const { data: customerRows } = await supabase.from('source_customers').select('id').eq('merchant_id', merchantId).limit(500);
    if (!customerRows?.length) break;
    await supabase.from('source_customers').delete().in('id', customerRows.map((r) => r.id));
  }
  await supabase.from('source_addresses').delete().eq('merchant_id', merchantId);
  await supabase.from('sync_jobs').delete().eq('merchant_id', merchantId);
  await supabase.from('store_connections').delete().eq('merchant_id', merchantId);
  await supabase.from('helpdesk_connections').delete().eq('merchant_id', merchantId);
}

async function chunkedInsert(table, rows, size = 250) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table} insert failed at ${i}: ${error.message}`);
  }
}

async function ensureConnections(merchantId) {
  // store_key is globally unique — release from any prior demo merchant
  await supabase.from('store_connections').delete().eq('platform', 'shopify').eq('store_key', SHOP_DOMAIN);
  await supabase.from('helpdesk_connections').delete().eq('provider', 'gorgias').eq('provider_account_id', 'aurora-demo-gorgias');

  const storeId = uuid('store:shopify:v2');
  const { error: storeError } = await supabase.from('store_connections').upsert({
    id: storeId,
    merchant_id: merchantId,
    platform: 'shopify',
    store_key: SHOP_DOMAIN,
    store_url: `https://${SHOP_DOMAIN}`,
    status: 'active',
    credentials_encrypted: 'presentation-demo-placeholder-token',
    scopes: ['read_orders', 'read_customers'],
    installed_at: daysAgo(540),
    last_sync_at: daysAgo(0.2),
  }, { onConflict: 'id' });
  if (storeError) throw storeError;

  const helpdeskId = uuid('helpdesk:gorgias:v2');
  const { error: helpdeskError } = await supabase.from('helpdesk_connections').upsert({
    id: helpdeskId,
    merchant_id: merchantId,
    provider: 'gorgias',
    provider_account_id: 'aurora-demo-gorgias',
    provider_account_name: 'Aurora Outfitters Support',
    provider_base_url: 'https://aurora-demo.gorgias.com',
    status: 'active',
    access_token_encrypted: encryptGorgiasApiCredentials({
      email: 'support@aurora-outfitters-demo.test',
      api_key: 'presentation-demo-gorgias-key',
    }),
    scopes: ['openid', 'tickets:read', 'tickets:write'],
    last_sync_at: daysAgo(0.3),
  }, { onConflict: 'id' });
  if (helpdeskError) throw helpdeskError;

  return { storeId, helpdeskId };
}

async function ensureSubscription(merchantId) {
  const periodStart = new Date(ANCHOR);
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const { data: existingSub } = await supabase.from('merchant_subscriptions').select('id').eq('merchant_id', merchantId).maybeSingle();
  if (!existingSub) {
    const { error } = await supabase.from('merchant_subscriptions').insert({
      merchant_id: merchantId,
      plan_id: 'growth',
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      context_credits_monthly: 5000,
      cancel_at_period_end: false,
    });
    if (error) throw error;
  }

  const { error: creditsError } = await supabase.from('merchant_credits').upsert({
    merchant_id: merchantId,
    monthly_credits_remaining: 4200,
    topup_credits_remaining: 500,
    cycle_reset_at: periodEnd.toISOString(),
    last_reset_at: periodStart.toISOString(),
    updated_at: ANCHOR.toISOString(),
  }, { onConflict: 'merchant_id' });
  if (creditsError) throw creditsError;
}

async function ensureTeamInvites(merchantId, ownerUserId) {
  const invites = [
    { email: 'fraud.ops@aurora-demo.test', role: 'admin' },
    { email: 'analyst@aurora-demo.test', role: 'analyst' },
    { email: 'finance@aurora-demo.test', role: 'viewer' },
    { email: 'support.lead@aurora-demo.test', role: 'analyst' },
  ];
  for (const invite of invites) {
    await supabase.from('merchant_users').upsert({
      merchant_id: merchantId,
      invited_email: invite.email,
      role: invite.role,
      invite_status: 'pending',
      invited_by: ownerUserId,
    }, { onConflict: 'merchant_id,invited_email' });
  }
}

async function seedCustomersOrdersJobs(merchantId, storeId) {
  const jobSpecs = [
    { label: 'Q3 2025 historical backfill', daysAgo: 240, rows: 0 },
    { label: 'Q4 2025 holiday peak audit', daysAgo: 180, rows: 0 },
    { label: 'Jan 2026 new year audit', daysAgo: 120, rows: 0 },
    { label: 'Feb 2026 spring collection', daysAgo: 90, rows: 0 },
    { label: 'Mar 2026 mid-season audit', daysAgo: 60, rows: 0 },
    { label: 'Apr 2026 spring sale', daysAgo: 45, rows: 0 },
    { label: 'May 2026 pre-summer audit', daysAgo: 28, rows: 0 },
    { label: 'Jun 2026 current week sync', daysAgo: 7, rows: 0 },
  ];

  const jobs = jobSpecs.map((spec, i) => ({
    id: uuid(`job:${i}`),
    merchant_id: merchantId,
    job_kind: 'csv_audit',
    source: 'csv',
    status: 'completed',
    label: `${STORE_NAME} — ${spec.label}`,
    total_rows: 0,
    processed_rows: 0,
    failed_rows: i === 3 ? 14 : 0,
    hidden: false,
    completed_at: daysAgo(spec.daysAgo - 1, 11),
    created_at: daysAgo(spec.daysAgo, 9),
    updated_at: daysAgo(spec.daysAgo - 1, 11),
  }));

  const customers = [];
  const orders = [];
  const orderByProfileKey = new Map();
  const observationEntities = [];
  let orderSeq = 0;

  for (const profile of ALL_PROFILES) {
    const customerId = uuid(`customer:${profile.key}`);
    const [firstName, ...rest] = profile.name.split(' ');
    const lastName = rest.join(' ') || 'Customer';
    const externalId = `SHOP-CUST-${profile.key}`;
    const ltv = ltvFor(profile);

    customers.push({
      id: customerId,
      merchant_id: merchantId,
      source: 'shopify',
      connection_id: storeId,
      external_id: externalId,
      email: profile.email,
      phone: profile.phone,
      first_name: firstName,
      last_name: lastName,
      orders_count: profile.orders,
      total_spent: ltv,
      account_created_at: profile.key.includes('sienna') ? daysAgo(11) : daysAgo(200 + (ALL_PROFILES.indexOf(profile) % 500)),
    });

    const profileOrders = [];
    for (let o = 0; o < profile.orders; o += 1) {
      orderSeq += 1;
      const orderId = uuid(`order:${profile.key}:${o}`);
      const externalOrderId = `AU-${String(orderSeq).padStart(6, '0')}`;
      const placedAt = daysAgo(320 - (orderSeq % 300), 8 + (o % 8));
      const totalPrice = orderValueFor(profile, o);
      const job = jobs[Math.min(jobs.length - 1, Math.floor((orderSeq % 8000) / 1000))];
      const grade = gradeForRisk(profile.risk);
      const card = profile.card ?? String(4100 + ALL_PROFILES.indexOf(profile) * 17).slice(-4);
      const ip = profile.ip ?? `82.${30 + (ALL_PROFILES.indexOf(profile) % 200)}.${20 + (o % 200)}.${10 + (ALL_PROFILES.indexOf(profile) % 180)}`;

      orders.push({
        id: orderId,
        merchant_id: merchantId,
        source: orderSeq % 17 === 0 ? 'shopify' : 'csv',
        connection_id: storeId,
        job_id: job.id,
        external_id: externalOrderId,
        order_number: externalOrderId,
        source_customer_id: customerId,
        email: profile.email,
        phone: profile.phone,
        financial_status: o < profile.refunds ? 'partially_refunded' : 'paid',
        fulfillment_state: 'delivered',
        total_price: totalPrice,
        currency: 'GBP',
        payment_gateway: 'shopify_payments',
        card_last4: card,
        browser_ip: ip,
        placed_at: placedAt,
        ingested_at: placedAt,
        customer_email: profile.email,
        customer_name: profile.name,
        order_value: totalPrice,
        processed_at: placedAt,
        identity_confidence_grade: grade,
        match_status: matchForRisk(profile.risk),
        identity_score: identityScoreFor(profile.risk),
        dismissed_by_merchant: profile.risk === 'low' && o === 0 && ALL_PROFILES.indexOf(profile) % 11 === 0,
      });

      profileOrders.push({ id: orderId, external_id: externalOrderId, suffix: String(o + 1).padStart(3, '0'), totalPrice, placedAt });
      observationEntities.push({
        provenance: { orderId },
        source: orderSeq % 17 === 0 ? 'shopify' : 'csv',
        observedAt: placedAt,
        email: profile.email,
        phone: profile.phone,
        ip,
        paymentGateway: 'shopify_payments',
        cardLast4: card,
        shippingNormalized: normaliseAddress(profile.address),
        billingNormalized: normaliseAddress(profile.address),
        platformCustomerExternalId: externalId,
      });
    }
    orderByProfileKey.set(profile.key, profileOrders);
  }

  for (const job of jobs) {
    const rows = orders.filter((o) => o.job_id === job.id);
    job.total_rows = rows.length;
    job.processed_rows = rows.length;
  }

  log('Inserting sync jobs…', { jobs: jobs.length });
  await chunkedInsert('sync_jobs', jobs);
  log('Inserting customers…', { customers: customers.length });
  await chunkedInsert('source_customers', customers);
  log('Inserting orders…', { orders: orders.length });
  await chunkedInsert('source_orders', orders, 300);

  const totalGmv = money(orders.reduce((sum, o) => sum + o.total_price, 0));
  return { jobs, orderByProfileKey, observationEntities, totalGmv, orderCount: orders.length };
}

async function emitObservationsBatched(merchantId, entities) {
  const CHUNK = 100;
  let totalSignals = 0;
  const allKeys = new Map();
  for (let i = 0; i < entities.length; i += CHUNK) {
    const batch = entities.slice(i, i + CHUNK);
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const emit = await emitIdentityObservations(supabase, merchantId, batch);
        totalSignals += emit.signals;
        for (const k of emit.signalKeys) allKeys.set(`${k.type}|${k.hash}`, k);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    if (lastError) throw lastError;
    if (i > 0 && i % 1000 === 0) log(`  observations ${Math.min(i + CHUNK, entities.length)}/${entities.length}`);
  }
  return { signals: totalSignals, signalKeys: [...allKeys.values()] };
}

async function loadObservationEntitiesFromOrders(merchantId, storeId) {
  const entities = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('source_orders')
      .select('id, email, phone, browser_ip, payment_gateway, card_last4, placed_at, source, source_customer_id')
      .eq('merchant_id', merchantId)
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;

    const customerIds = [...new Set(data.map((o) => o.source_customer_id).filter(Boolean))];
    const { data: customers } = await supabase
      .from('source_customers')
      .select('id, external_id, email')
      .in('id', customerIds);
    const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

    const profileByEmail = new Map(ALL_PROFILES.map((p) => [p.email.toLowerCase(), p]));

    for (const order of data) {
      const profile = profileByEmail.get((order.email ?? '').toLowerCase());
      const customer = order.source_customer_id ? customerById.get(order.source_customer_id) : null;
      entities.push({
        provenance: { orderId: order.id },
        source: order.source === 'shopify' ? 'shopify' : 'csv',
        observedAt: order.placed_at,
        email: order.email,
        phone: order.phone,
        ip: order.browser_ip,
        paymentGateway: order.payment_gateway ?? 'shopify_payments',
        cardLast4: order.card_last4,
        shippingNormalized: profile ? normaliseAddress(profile.address) : null,
        billingNormalized: profile ? normaliseAddress(profile.address) : null,
        platformCustomerExternalId: customer?.external_id ?? null,
      });
    }
    if (data.length < PAGE) break;
  }
  return entities;
}

async function loadOrderByProfileKey(merchantId) {
  const map = new Map();
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('source_orders')
      .select('id, external_id, total_price, placed_at, email')
      .eq('merchant_id', merchantId)
      .order('placed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;

    const emailToKey = new Map(ALL_PROFILES.map((p) => [p.email.toLowerCase(), p.key]));
    for (const row of data) {
      const key = emailToKey.get((row.email ?? '').toLowerCase());
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push({
        id: row.id,
        external_id: row.external_id,
        suffix: row.external_id.slice(-3),
        totalPrice: Number(row.total_price),
        placedAt: row.placed_at,
      });
      map.set(key, list);
    }
    if (data.length < PAGE) break;
  }
  return map;
}

async function buildIdentityIdByEmail(emails) {
  const map = new Map();
  const hashes = emails.map((email) => {
    const norm = normaliseEmail(email);
    return norm ? { email, hash: hashIdentifier(norm) } : null;
  }).filter(Boolean);

  for (let i = 0; i < hashes.length; i += 200) {
    const batch = hashes.slice(i, i + 200);
    const { data, error } = await supabase
      .from('identity_members')
      .select('identity_id, identifier_hash')
      .eq('identifier_type', 'email')
      .in('identifier_hash', batch.map((b) => b.hash));
    if (error) throw error;
    const byHash = new Map((data ?? []).map((r) => [r.identifier_hash, r.identity_id]));
    for (const { email, hash } of batch) {
      const id = byHash.get(hash);
      if (id) map.set(email.toLowerCase(), id);
    }
  }
  return map;
}

const CLAIM_TYPES = ['item_not_received', 'refund_request', 'damaged', 'wrong_item', 'chargeback', 'return_abuse'];
const OPEN_STATUSES = ['open', 'escalated', 'pending'];
const RESOLVED_STATUSES = ['resolved_denied', 'resolved_refunded', 'resolved_won', 'resolved_lost'];

function buildClaimsForProfile(profile, orders, identityId, userId, claimCounter) {
  if (profile.claims <= 0 || orders.length === 0) return [];

  const rows = [];
  for (let c = 0; c < profile.claims; c += 1) {
    const order = orders[c % orders.length];
    const isOpen = (profile.risk === 'critical' || profile.risk === 'high')
      ? c < Math.ceil(profile.claims * 0.55)
      : c === profile.claims - 1;
    const status = isOpen
      ? pick(OPEN_STATUSES)
      : pick(RESOLVED_STATUSES);
    const claimType = profile.chargebacks > 0 && c === 1
      ? 'chargeback'
      : profile.risk === 'critical' || profile.risk === 'high'
        ? pick(['item_not_received', 'item_not_received', 'refund_request', 'return_abuse'])
        : pick(CLAIM_TYPES);
    const amount = money(order.totalPrice * (0.85 + rand() * 0.2));
    const ageDays = isOpen ? 1 + (c % 8) : 12 + (c % 40);
    const submittedAt = daysAgo(ageDays, 10);
    const claimId = randomUUID();

    rows.push({
      claim: {
        id: claimId,
        merchant_id: null,
        source_order_id: order.id,
        identity_id: identityId,
        claim_type: claimType,
        status,
        detection_method: c % 3 === 0 ? 'model' : 'manual',
        detection_detail: { segment: profile.segment ?? profile.risk, seed: 'presentation_demo' },
        reason_raw: `${profile.segment ?? profile.risk}: ${claimType.replace(/_/g, ' ')} on ${order.external_id}.`,
        reason_normalized: profile.note ?? `${profile.name} — ${claimType}`,
        amount_at_risk: amount,
        currency: 'GBP',
        requires_review: OPEN_STATUSES.includes(status),
        submitted_at: submittedAt,
        created_at: submittedAt,
        updated_at: daysAgo(Math.max(0.5, ageDays - 0.5), 14),
        assigned_to: status === 'escalated' ? userId : null,
        assigned_at: status === 'escalated' ? daysAgo(1, 11) : null,
      },
      event: {
        claim_id: claimId,
        event_type: 'created',
        to_status: status,
        note: 'Claim ingested from order + support signals.',
        actor_user_id: userId,
        metadata: { seed: true, profile: profile.key },
        created_at: submittedAt,
      },
      evidence: {
        claim_id: claimId,
        evidence_type: claimType === 'chargeback' ? 'payment_dispute' : 'tracking',
        metadata: { carrier: pick(['Royal Mail', 'DPD', 'Evri']), order_ref: order.external_id },
        added_by: userId,
      },
      outcome: !isOpen ? {
        claim_id: claimId,
        decision: status === 'resolved_denied' ? 'denied' : status === 'resolved_refunded' ? 'full_refund' : 'approved',
        outcome: status === 'resolved_denied' ? 'suspected_fraud' : 'legitimate',
        amount_refunded: status === 'resolved_refunded' ? amount : null,
        amount_recovered: status === 'resolved_denied' ? amount : null,
        notes: profile.note ?? `Resolved ${status} for ${profile.name}.`,
        decided_by: userId,
        decided_at: daysAgo(Math.max(1, ageDays - 2), 13),
      } : null,
      counter: claimCounter.count++,
    });
  }
  return rows;
}

async function seedClaimsAndState(merchantId, userId, orderByProfileKey) {
  await supabase.from('merchant_identity_state').delete().eq('merchant_id', merchantId);
  await supabase.from('identity_notes').delete().eq('merchant_id', merchantId);
  const { data: existingClaims } = await supabase.from('support_payout_cases').select('id').eq('merchant_id', merchantId);
  const existingClaimIds = (existingClaims ?? []).map((c) => c.id);
  if (existingClaimIds.length) {
    for (let i = 0; i < existingClaimIds.length; i += 200) {
      const slice = existingClaimIds.slice(i, i + 200);
      await supabase.from('claim_evidence').delete().in('claim_id', slice);
      await supabase.from('claim_outcomes').delete().in('claim_id', slice);
    }
    await supabase.from('support_payout_cases').delete().eq('merchant_id', merchantId);
  }
  await supabase.from('source_tickets').delete().eq('merchant_id', merchantId);

  log('Building identity email map…');
  const identityByEmail = await buildIdentityIdByEmail(ALL_PROFILES.map((p) => p.email));

  const identityStateById = new Map();
  const notes = [];
  const claimBundles = [];
  const claimCounter = { count: 0 };

  for (const profile of ALL_PROFILES) {
    const identityId = identityByEmail.get(profile.email.toLowerCase());
    if (!identityId) continue;

    const stateRow = {
      merchant_id: merchantId,
      identity_id: identityId,
      on_watchlist: profile.watchlist,
      investigation_status: profile.status,
      display_name: profile.name,
      display_email: profile.email,
    };
    const prev = identityStateById.get(identityId);
    if (!prev || riskRank(profile.risk) >= riskRank(prev._risk)) {
      identityStateById.set(identityId, { ...stateRow, _risk: profile.risk });
    }

    if (profile.note || profile.risk === 'high' || profile.risk === 'critical') {
      notes.push({
        merchant_id: merchantId,
        identity_id: identityId,
        body: profile.note ?? `${profile.name} flagged as ${profile.segment ?? profile.risk} risk.`,
        created_by: userId,
      });
    }

    const bundles = buildClaimsForProfile(
      profile,
      orderByProfileKey.get(profile.key) ?? [],
      identityId,
      userId,
      claimCounter,
    );
    claimBundles.push(...bundles);
  }

  const identityState = [...identityStateById.values()].map(({ _risk, ...row }) => row);
  const claims = claimBundles.map((b) => ({ ...b.claim, merchant_id: merchantId }));
  const events = claimBundles.map((b) => ({ ...b.event, merchant_id: merchantId }));
  const evidence = claimBundles.map((b) => ({ ...b.evidence, merchant_id: merchantId }));
  const outcomes = claimBundles.filter((b) => b.outcome).map((b) => b.outcome);

  log('Inserting identity state & notes…', { state: identityState.length, notes: notes.length });
  if (identityState.length) await chunkedInsert('merchant_identity_state', identityState, 300);
  if (notes.length) await chunkedInsert('identity_notes', notes, 300);

  log('Inserting claims…', { claims: claims.length });
  if (claims.length) await chunkedInsert('claims', claims, 200);
  if (events.length) await chunkedInsert('claim_events', events, 300);
  if (evidence.length) await chunkedInsert('claim_evidence', evidence, 300);
  if (outcomes.length) await chunkedInsert('claim_outcomes', outcomes, 300);

  const openClaims = claims.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  return {
    claims: claims.length,
    openClaims,
    watchlist: identityState.filter((r) => r.on_watchlist).length,
    exposureAtRisk: money(claims.filter((c) => OPEN_STATUSES.includes(c.status)).reduce((s, c) => s + (c.amount_at_risk ?? 0), 0)),
  };
}

const NETWORK_SIBLINGS = [
  { slug: 'northline', name: 'Northline Electronics', domain: 'northline-demo.myshopify.com', prefix: 'NL' },
  { slug: 'harbor', name: 'Harbor Home', domain: 'harbor-demo.myshopify.com', prefix: 'HB' },
  { slug: 'lumen', name: 'Lumen Beauty', domain: 'lumen-demo.myshopify.com', prefix: 'LM' },
];

async function deleteSiblingMerchantData(merchantId) {
  await supabase.from('customer_identity_signals').delete().eq('merchant_id', merchantId);
  await supabase.from('identity_edges').delete().eq('merchant_id', merchantId);
  for (let round = 0; round < 30; round += 1) {
    const { data: orderRows } = await supabase.from('source_orders').select('id').eq('merchant_id', merchantId).limit(400);
    if (!orderRows?.length) break;
    await supabase.from('source_orders').delete().in('id', orderRows.map((r) => r.id));
  }
  for (let round = 0; round < 10; round += 1) {
    const { data: customerRows } = await supabase.from('source_customers').select('id').eq('merchant_id', merchantId).limit(500);
    if (!customerRows?.length) break;
    await supabase.from('source_customers').delete().in('id', customerRows.map((r) => r.id));
  }
  await supabase.from('sync_jobs').delete().eq('merchant_id', merchantId);
}

async function ensureSiblingMerchant(sibling) {
  const merchantId = uuid(`merchant:demo-sibling:${sibling.slug}`);
  await supabase.from('merchants').upsert({
    id: merchantId,
    name: sibling.name,
    is_demo: true,
    is_internal: false,
    settings: {
      setup_complete: true,
      platform: 'shopify',
      presentation_demo_sibling: true,
      primary_merchant: STORE_NAME,
    },
  }, { onConflict: 'id' });

  await supabase.from('store_connections').delete().eq('platform', 'shopify').eq('store_key', sibling.domain);
  const storeId = uuid(`store:sibling:${sibling.slug}`);
  await supabase.from('store_connections').upsert({
    id: storeId,
    merchant_id: merchantId,
    platform: 'shopify',
    store_key: sibling.domain,
    store_url: `https://${sibling.domain}`,
    status: 'active',
    credentials_encrypted: 'presentation-sibling-placeholder',
    scopes: ['read_orders'],
    installed_at: daysAgo(400),
    last_sync_at: daysAgo(1),
  }, { onConflict: 'id' });

  return { merchantId, storeId };
}

async function seedCrossMerchantNetwork() {
  log('Seeding cross-merchant network siblings…', { siblings: NETWORK_SIBLINGS.length, villains: BAD_ACTORS.length });
  const allSignalKeys = new Map();
  let totalSiblingOrders = 0;

  for (const sibling of NETWORK_SIBLINGS) {
    const { merchantId, storeId } = await ensureSiblingMerchant(sibling);
    await deleteSiblingMerchantData(merchantId);

    const jobId = uuid(`job:sibling:${sibling.slug}`);
    await supabase.from('sync_jobs').insert({
      id: jobId,
      merchant_id: merchantId,
      job_kind: 'platform_backfill',
      source: 'shopify',
      status: 'completed',
      label: `${sibling.name} — network intelligence backfill`,
      total_rows: 0,
      processed_rows: 0,
      failed_rows: 0,
      hidden: false,
      completed_at: daysAgo(14, 11),
      created_at: daysAgo(15, 9),
      updated_at: daysAgo(14, 11),
    });

    const customers = [];
    const orders = [];
    const observations = [];
    let orderSeq = 0;

    for (const actor of BAD_ACTORS) {
      const customerId = uuid(`customer:${sibling.slug}:${actor.key}`);
      const [firstName, ...rest] = actor.name.split(' ');
      const externalId = `NET-CUST-${sibling.prefix}-${actor.key}`;
      const orderCount = 6 + (BAD_ACTORS.indexOf(actor) % 6);

      customers.push({
        id: customerId,
        merchant_id: merchantId,
        source: 'shopify',
        connection_id: storeId,
        external_id: externalId,
        email: actor.email,
        phone: actor.phone,
        first_name: firstName,
        last_name: rest.join(' ') || 'Customer',
        orders_count: orderCount,
        total_spent: money(orderCount * (actor.risk === 'critical' ? 220 : 140)),
        account_created_at: daysAgo(280 + BAD_ACTORS.indexOf(actor) * 3),
      });

      for (let o = 0; o < orderCount; o += 1) {
        orderSeq += 1;
        const orderId = uuid(`order:${sibling.slug}:${actor.key}:${o}`);
        const externalOrderId = `${sibling.prefix}-${String(orderSeq).padStart(5, '0')}`;
        const placedAt = daysAgo(200 - orderSeq, 9 + (o % 6));
        const totalPrice = orderValueFor(actor, o);
        const hasRefund = o < actor.refunds;

        orders.push({
          id: orderId,
          merchant_id: merchantId,
          source: 'shopify',
          connection_id: storeId,
          job_id: jobId,
          external_id: externalOrderId,
          order_number: externalOrderId,
          source_customer_id: customerId,
          email: actor.email,
          phone: actor.phone,
          financial_status: hasRefund ? 'partially_refunded' : 'paid',
          fulfillment_state: 'delivered',
          total_price: totalPrice,
          currency: 'GBP',
          payment_gateway: 'shopify_payments',
          card_last4: actor.card,
          browser_ip: actor.ip,
          placed_at: placedAt,
          ingested_at: placedAt,
          customer_email: actor.email,
          customer_name: actor.name,
          order_value: totalPrice,
          processed_at: placedAt,
          identity_confidence_grade: gradeForRisk(actor.risk),
          match_status: matchForRisk(actor.risk),
          identity_score: identityScoreFor(actor.risk),
          dismissed_by_merchant: false,
        });

        observations.push({
          provenance: { orderId },
          source: 'shopify',
          observedAt: placedAt,
          email: actor.email,
          phone: actor.phone,
          ip: actor.ip,
          paymentGateway: 'shopify_payments',
          cardLast4: actor.card,
          shippingNormalized: normaliseAddress(actor.address),
          billingNormalized: normaliseAddress(actor.address),
          platformCustomerExternalId: externalId,
        });
      }
    }

    await supabase.from('sync_jobs').update({ total_rows: orders.length, processed_rows: orders.length }).eq('id', jobId);
    await chunkedInsert('source_customers', customers, 200);
    await chunkedInsert('source_orders', orders, 300);
    const emit = await emitObservationsBatched(merchantId, observations);
    for (const k of emit.signalKeys) allSignalKeys.set(`${k.type}|${k.hash}`, k);
    totalSiblingOrders += orders.length;
    log(`  ${sibling.name}: ${orders.length} orders, ${customers.length} network villains`);
  }

  // Re-resolve all villain identifier keys so identities merge across merchants.
  const seedKeys = [...allSignalKeys.values()];
  for (const actor of BAD_ACTORS) {
    const norm = normaliseEmail(actor.email);
    if (norm) {
      const hash = hashIdentifier(norm);
      seedKeys.push({ type: 'email', hash });
    }
    const phone = actor.phone?.replace(/\s+/g, '');
    if (phone) seedKeys.push({ type: 'phone', hash: hashIdentifier(phone) });
    if (actor.card) seedKeys.push({ type: 'payment_fingerprint', hash: hashIdentifier(`shopify_payments:${actor.card}`) });
    const addr = normaliseAddress(actor.address);
    if (addr) seedKeys.push({ type: 'shipping_address', hash: hashIdentifier(addr) });
  }
  const uniqueKeys = [...new Map(seedKeys.map((k) => [`${k.type}|${k.hash}`, k])).values()];

  log('Resolving cross-merchant identity graph…', { seedKeys: uniqueKeys.length });
  const resolved = await resolveIdentitiesForKeys(supabase, uniqueKeys, 'presentation_cross_merchant');

  const verification = [];
  for (const actor of BAD_ACTORS) {
    const norm = normaliseEmail(actor.email);
    if (!norm) continue;
    const hash = hashIdentifier(norm);
    const { data: member } = await supabase
      .from('identity_members')
      .select('identity_id')
      .eq('identifier_type', 'email')
      .eq('identifier_hash', hash)
      .maybeSingle();
    if (!member?.identity_id) continue;
    const { data: identity } = await supabase
      .from('identities')
      .select('id, merchant_count, confidence_grade, confidence_score')
      .eq('id', member.identity_id)
      .maybeSingle();
    verification.push({
      name: actor.name,
      email: actor.email,
      identity_id: member.identity_id,
      merchant_count: identity?.merchant_count ?? 0,
      grade: identity?.confidence_grade,
      score: identity?.confidence_score,
      network_visible: (identity?.merchant_count ?? 0) >= 3,
    });
  }

  return { totalSiblingOrders, resolved, verification };
}

async function seedTickets(merchantId, helpdeskId, orderByProfileKey) {
  const villainKeys = ['villain-priya', 'villain-reginald', 'villain-lara', 'villain-james', 'villain-vince', 'villain-sienna'];
  const subjects = [
    'Parcel not received — tracking shows delivered',
    'URGENT: chargeback opened after refund denial',
    'Wrong item received — requesting full refund',
    'Second missing parcel claim this month',
    'Refund not processed after 7 days',
    'Item damaged on arrival — photo attached',
    'Delivery photo shows wrong address',
    'Need refund before bank dispute',
  ];

  const tickets = Array.from({ length: 24 }, (_, i) => {
    const vKey = villainKeys[i % villainKeys.length];
    const orders = orderByProfileKey.get(vKey) ?? [];
    const order = orders[i % Math.max(1, orders.length)] ?? orders[0];
    return {
      id: uuid(`ticket:${i}`),
      merchant_id: merchantId,
      provider: 'gorgias',
      connection_id: helpdeskId,
      external_id: `GOR-${10240 + i}`,
      subject: subjects[i % subjects.length],
      channel: i % 4 === 0 ? 'chat' : 'email',
      status: i < 8 ? 'open' : 'pending',
      tags: i % 2 === 0 ? ['missing-parcel', 'high-risk'] : ['refund', 'fraud-review'],
      linked_order_external_ids: order ? [order.external_id] : [],
      opened_at_provider: daysAgo(1 + (i % 12), 9 + (i % 6)),
      created_at_provider: daysAgo(1 + (i % 12), 9 + (i % 6)),
      message_count: 3 + (i % 8),
      customer_reply_count: 1 + (i % 4),
    };
  });

  await chunkedInsert('source_tickets', tickets);
  return tickets.length;
}

async function main() {
  const crossMerchantOnly = process.argv.includes('--cross-merchant');
  const resume = process.argv.includes('--resume');
  const claimsOnly = process.argv.includes('--claims-only');
  log(crossMerchantOnly ? 'Seeding cross-merchant network…' : claimsOnly ? 'Finishing claims for presentation demo…' : resume ? 'Resuming presentation demo seed…' : 'Creating presentation demo account…');
  const userId = await ensureUser();
  const { merchantId } = await ensureMerchant(userId);

  if (crossMerchantOnly) {
    const network = await seedCrossMerchantNetwork();
    const summary = {
      ok: true,
      login: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      primary_merchant_id: merchantId,
      cross_merchant: {
        sibling_merchants: NETWORK_SIBLINGS.map((s) => s.name),
        sibling_orders: network.totalSiblingOrders,
        identities_resolved: network.resolved.identityIds.length,
        villains: network.verification,
        network_visible_count: network.verification.filter((v) => v.network_visible).length,
      },
      demo_searches: [
        'reginald.osei@aurora-demo.test',
        'vince.moreno@aurora-demo.test',
        'priya.mehta@aurora-demo.test',
      ],
    };
    fs.writeFileSync(path.join(repoRoot, 'scripts/presentation-demo-log.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  let orderByProfileKey;
  let observationEntities;
  let totalGmv = 0;
  let orderCount = 0;

  if (claimsOnly) {
    const { data: conn } = await supabase.from('store_connections').select('id').eq('merchant_id', merchantId).maybeSingle();
    const { data: hd } = await supabase.from('helpdesk_connections').select('id').eq('merchant_id', merchantId).maybeSingle();
    if (!conn || !hd) await ensureConnections(merchantId);
    const helpdeskId = hd?.id ?? uuid('helpdesk:gorgias:v2');
    const { count: existingOrders } = await supabase.from('source_orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId);
    orderCount = existingOrders ?? 0;
    orderByProfileKey = await loadOrderByProfileKey(merchantId);
    const claimSummary = await seedClaimsAndState(merchantId, userId, orderByProfileKey);
    const ticketCount = await seedTickets(merchantId, helpdeskId, orderByProfileKey);
    printSummary(merchantId, orderCount, 0, { signals: 0 }, { identityIds: [] }, claimSummary, ticketCount);
    return;
  }

  if (!resume) {
    log('Clearing previous presentation merchant data…', { merchantId });
    await deleteMerchantData(merchantId);

    const { storeId, helpdeskId } = await ensureConnections(merchantId);
    await ensureSubscription(merchantId);
    await ensureTeamInvites(merchantId, userId);

    log('Seeding customers, orders, and audit runs…', { profiles: ALL_PROFILES.length });
    const seeded = await seedCustomersOrdersJobs(merchantId, storeId);
    orderByProfileKey = seeded.orderByProfileKey;
    observationEntities = seeded.observationEntities;
    totalGmv = seeded.totalGmv;
    orderCount = seeded.orderCount;

    log('Emitting identity observations…', { entities: observationEntities.length });
    const emit = await emitObservationsBatched(merchantId, observationEntities);

    log('Resolving identities…', { signalKeys: emit.signalKeys.length });
    const resolved = await resolveIdentitiesForKeys(supabase, emit.signalKeys, 'presentation_demo_seed');

    log('Seeding claims, watchlist, and support tickets…');
    const claimSummary = await seedClaimsAndState(merchantId, userId, orderByProfileKey);
    const ticketCount = await seedTickets(merchantId, helpdeskId, orderByProfileKey);

    printSummary(merchantId, orderCount, totalGmv, emit, resolved, claimSummary, ticketCount);
    return;
  }

  const { data: conn } = await supabase.from('store_connections').select('id').eq('merchant_id', merchantId).maybeSingle();
  const storeId = conn?.id ?? uuid('store:shopify:v2');
  const { data: hd } = await supabase.from('helpdesk_connections').select('id').eq('merchant_id', merchantId).maybeSingle();
  const helpdeskId = hd?.id ?? uuid('helpdesk:gorgias:v2');
  if (!conn || !hd) {
    await ensureConnections(merchantId);
  }
  await ensureSubscription(merchantId);

  const { count: existingOrders } = await supabase.from('source_orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId);
  if (!existingOrders) throw new Error('No orders found — run without --resume first');
  orderCount = existingOrders;
  log('Loading existing orders for resume…', { orders: orderCount });
  orderByProfileKey = await loadOrderByProfileKey(merchantId);
  observationEntities = await loadObservationEntitiesFromOrders(merchantId, storeId);

  const { data: gmvRows } = await supabase.from('source_orders').select('total_price').eq('merchant_id', merchantId).limit(5000);
  totalGmv = money((gmvRows ?? []).reduce((s, r) => s + Number(r.total_price ?? 0), 0));

  log('Emitting identity observations (resume)…', { entities: observationEntities.length });
  const emit = await emitObservationsBatched(merchantId, observationEntities);

  log('Resolving identities…', { signalKeys: emit.signalKeys.length });
  const resolved = await resolveIdentitiesForKeys(supabase, emit.signalKeys, 'presentation_demo_seed');

  log('Seeding claims, watchlist, and support tickets…');
  const claimSummary = await seedClaimsAndState(merchantId, userId, orderByProfileKey);
  const ticketCount = await seedTickets(merchantId, helpdeskId, orderByProfileKey);

  printSummary(merchantId, orderCount, totalGmv, emit, resolved, claimSummary, ticketCount);
}

function printSummary(merchantId, orderCount, totalGmv, emit, resolved, claimSummary, ticketCount) {
  const badActorNames = BAD_ACTORS.map((b) => b.name);
  const summary = {
    ok: true,
    login: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    merchant: { id: merchantId, name: STORE_NAME, shop_domain: SHOP_DOMAIN },
    counts: {
      customers: ALL_PROFILES.length,
      orders: orderCount,
      total_gmv_gbp: totalGmv,
      sync_jobs: 8,
      claims: claimSummary.claims,
      open_claims: claimSummary.openClaims,
      exposure_at_risk_gbp: claimSummary.exposureAtRisk,
      watchlist: claimSummary.watchlist,
      support_tickets: ticketCount,
      identity_signals_emitted: emit.signals,
      identities_resolved: resolved.identityIds.length,
    },
    bad_actors_search: badActorNames,
    demo_searches: [
      'reginald.osei@aurora-demo.test',
      'vince.moreno@aurora-demo.test',
      'priya.mehta@aurora-demo.test',
      '12 Warehouse Mews',
    ],
    plan: 'growth (active)',
  };

  fs.writeFileSync(path.join(repoRoot, 'scripts/presentation-demo-log.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[presentation-seed] Failed:', err);
  process.exit(1);
});
