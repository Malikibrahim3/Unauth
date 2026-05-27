/**
 * Seed simeonmurray123@gmail.com with ~500 customers, audit runs, claims,
 * chargebacks, watchlist, and evidence packages for full fraud-ops UI review.
 *
 * Usage: node scripts/seed-simeon-fraud-ops.mjs
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_EMAIL = 'simeonmurray123@gmail.com';
const STORE_NAME = 'Simeon Murray Store';
const SHOP_DOMAIN = 'simeon-murray-store.myshopify.com';
const CUSTOMER_COUNT = 500;
const ANCHOR = new Date('2026-05-27T12:00:00.000Z');

function readEnv() {
  const envPath = '.env.local';
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

readEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const firstNames = ['Maya', 'Jonas', 'Leah', 'Oscar', 'Sofia', 'Nathan', 'Iris', 'Daniel', 'Zara', 'Felix', 'Imani', 'Rafael', 'Clara', 'Hugo', 'Esme', 'Arun', 'Lina', 'Marcus', 'Anya', 'Theo', 'Elena', 'Noah', 'Priya', 'Owen', 'Ruby', 'Ethan', 'Lara', 'Reginald', 'Hannah', 'Amelia'];
const lastNames = ['Bennett', 'Hart', 'Foster', 'Cole', 'Rahman', 'Patel', 'Morgan', 'Wallace', 'Reed', 'Stone', 'Hughes', 'Turner', 'Cooper', 'Ellis', 'Bailey', 'Shaw', 'Murray', 'Kessler', 'Shah', 'Marsh'];
const streets = ['King Street', 'Market Road', 'Canal Yard', 'Dock Road', 'Station Road', 'Queen Street', 'Castle Street', 'Elm Grove', 'Falcon House', 'Merchant Lane'];
const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Cardiff', 'Liverpool', 'Newcastle', 'Glasgow'];
const flagsPool = [
  'refund_rate_over_60pct', 'crossmerchant_identity_match', 'shipping_address_variant',
  'denial_then_chargeback', 'payment_fingerprint_match', 'address_normalization_match',
  'device_reuse_observed', 'refund_velocity_14d', 'inr_repeat_pattern', 'card_reuse_observed',
  'rapid_claim_velocity', 'post_delivery_claim_rate_0_67', 'gps_mismatch', 'watchlisted',
];
const claimTypes = ['missing_parcel', 'damaged', 'wrong_item', 'refund_request', 'chargeback', 'return_abuse'];
const openStatuses = ['open', 'under_review', 'evidence_requested', 'pending', 'escalated'];
const resolvedStatuses = ['resolved', 'closed'];
const decisions = ['approved', 'denied', 'escalated', 'partial_refund', 'full_refund', 'chargeback_disputed'];
const outcomes = ['loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost', 'customer_verified', 'suspected_fraud'];

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uuid(label) {
  const hex = sha(`simeon-fraud-ops-seed:${label}`).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(270527);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const money = (v) => Number(v.toFixed(2));

function daysAgo(days, hour = 10) {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - Math.floor(days));
  const fractionalHours = (days - Math.floor(days)) * 24;
  d.setUTCHours(hour - Math.floor(fractionalHours), 0, 0, 0);
  return d.toISOString();
}

function riskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function matchStatus(confidence) {
  if (confidence === 'definite') return 'definite';
  if (confidence === 'probable') return 'probable';
  if (confidence === 'possible') return 'candidate';
  return 'none';
}

function segmentForIndex(i) {
  if (i % 23 === 0) return 'critical';
  if (i % 11 === 0) return 'high';
  if (i % 5 === 0) return 'medium';
  return 'low';
}

function profileSpec(i) {
  const segment = segmentForIndex(i);
  const first = firstNames[i % firstNames.length];
  const last = lastNames[(i * 7) % lastNames.length];
  const name = `${first} ${last}`;
  const email = `simeon.seed.${String(i).padStart(4, '0')}@shopmail.test`;
  const phone = `+4477009${String(10000 + i).slice(-5)}`;
  const address = `${(i % 180) + 1} ${streets[i % streets.length]}, ${cities[i % cities.length]}, UK`;
  const card = String(4000 + (i * 37) % 6000).slice(-4);

  let risk;
  let confidence;
  let orders;
  let refunds;
  let claims;
  let chargebacks;
  let merchants;
  let watchlist;
  let status;

  switch (segment) {
    case 'critical':
      risk = 88 + (i % 12);
      confidence = 'definite';
      orders = 8 + (i % 6);
      refunds = 4 + (i % 4);
      claims = 3 + (i % 5);
      chargebacks = i % 3 === 0 ? 1 : 0;
      merchants = 2 + (i % 3);
      watchlist = true;
      status = 'under_review';
      break;
    case 'high':
      risk = 72 + (i % 16);
      confidence = 'probable';
      orders = 6 + (i % 5);
      refunds = 2 + (i % 3);
      claims = 2 + (i % 3);
      chargebacks = i % 7 === 0 ? 1 : 0;
      merchants = 1 + (i % 2);
      watchlist = i % 4 === 0;
      status = i % 2 === 0 ? 'under_review' : 'new';
      break;
    case 'medium':
      risk = 38 + (i % 30);
      confidence = 'possible';
      orders = 4 + (i % 6);
      refunds = 1 + (i % 2);
      claims = i % 3 === 0 ? 1 : 0;
      chargebacks = 0;
      merchants = 1;
      watchlist = false;
      status = i % 2 === 0 ? 'contacted' : 'cleared';
      break;
    default:
      risk = 6 + (i % 28);
      confidence = 'weak';
      orders = 2 + (i % 12);
      refunds = i % 9 === 0 ? 1 : 0;
      claims = 0;
      chargebacks = 0;
      merchants = 1;
      watchlist = false;
      status = 'cleared';
  }

  const flagCount = segment === 'low' ? (i % 4 === 0 ? 1 : 0) : 2 + (i % 4);
  const fraud_flags = Array.from({ length: flagCount }, (_, f) => flagsPool[(i + f * 3) % flagsPool.length]);

  return {
    i,
    segment,
    name,
    email,
    phone,
    address,
    card,
    risk,
    confidence,
    orders,
    refunds,
    claims,
    chargebacks,
    merchants,
    watchlist,
    status,
    fraud_flags,
    ltv: money(orders * (42 + (i % 80))),
    profileId: uuid(`profile:${i}`),
  };
}

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if ((data.users ?? []).length < 1000) break;
  }
  return null;
}

async function chunkedInsert(table, rows, size = 200) {
  for (let offset = 0; offset < rows.length; offset += size) {
    const batch = rows.slice(offset, offset + size);
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase.from(table).insert(batch);
      if (!error) {
        lastError = null;
        break;
      }
      lastError = error;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    if (lastError) throw new Error(`${table} insert failed: ${lastError.message}`);
  }
}

async function deleteByMerchant(merchantId, userId) {
  const { data: jobs } = await supabase.from('processing_jobs').select('id').eq('merchant_id', merchantId);
  const jobIds = (jobs ?? []).map((j) => j.id);

  const merchantFilter = `merchant_ids.cs.${JSON.stringify([merchantId])}`;
  const { data: profiles } = await supabase.from('customer_profiles').select('id').or(merchantFilter);
  const profileIds = (profiles ?? []).map((p) => p.id);

  const { data: claims } = await supabase.from('merchant_claims').select('id').eq('merchant_id', merchantId);
  const claimIds = (claims ?? []).map((c) => c.id);

  // merchant_claims cannot be deleted via API when claim_events exist (append-only).
  // Use scripts/sql/purge_merchant_claims_for_reseed.sql in SQL editor for full reset.

  await supabase.from('evidence_packages').delete().eq('merchant_id', merchantId);
  await supabase.from('watchlist_appearances').delete().eq('merchant_id', userId);
  await supabase.from('watchlist_entries').delete().eq('merchant_id', userId);

  if (profileIds.length > 0) {
    for (let i = 0; i < profileIds.length; i += 200) {
      const slice = profileIds.slice(i, i + 200);
      await supabase.from('customer_notes').delete().in('customer_profile_id', slice);
      await supabase.from('customer_activity_log').delete().in('profile_id', slice);
      await supabase.from('customer_profile_identities').delete().in('customer_profile_id', slice);
    }
  }

  if (jobIds.length > 0) {
    await supabase.from('customer_profile_audit_appearances').delete().in('audit_id', jobIds);
    for (let i = 0; i < jobIds.length; i += 50) {
      await supabase.from('audit_transactions').delete().in('job_id', jobIds.slice(i, i + 50));
    }
    await supabase.from('processing_jobs').delete().in('id', jobIds);
  }

  if (profileIds.length > 0) {
    for (let i = 0; i < profileIds.length; i += 200) {
      await supabase.from('customer_profiles').delete().in('id', profileIds.slice(i, i + 200));
    }
  }

  await supabase.from('merchant_identities').delete().eq('shop_domain', SHOP_DOMAIN);
  await supabase.from('shopify_order_signals').delete().eq('shop_domain', SHOP_DOMAIN);
  await supabase.from('user_action_log').delete().eq('merchant_id', merchantId);
}

async function ensureMerchant(userId) {
  const { data, error } = await supabase
    .from('merchants')
    .upsert({
      user_id: userId,
      name: STORE_NAME,
      platform: 'shopify',
      monthly_order_volume: 'over_250k',
      primary_fraud_concern: 'all',
      setup_complete: true,
      is_demo: false,
    }, { onConflict: 'user_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureShopify(merchantId) {
  await supabase.from('shopify_merchants').upsert({
    shop_domain: SHOP_DOMAIN,
    access_token: 'seed-placeholder-not-for-production',
    updated_at: ANCHOR.toISOString(),
  }, { onConflict: 'shop_domain' });

  await supabase.from('merchant_shopify_connections').upsert({
    merchant_id: merchantId,
    shop_domain: SHOP_DOMAIN,
    active: true,
    updated_at: ANCHOR.toISOString(),
    uninstalled_at: null,
  }, { onConflict: 'merchant_id' });
}

function buildProfiles(merchantId, userId) {
  return Array.from({ length: CUSTOMER_COUNT }, (_, idx) => {
    const p = profileSpec(idx + 1);
    const firstSeenDays = 30 + (idx % 400);
    const lastSeenDays = idx % 40;
    return {
      id: p.profileId,
      primary_email: p.email,
      emails: [p.email],
      ips: [`198.51.${100 + (idx % 100)}.${20 + (idx % 200)}`],
      addresses: [p.address],
      card_last4s: [p.card],
      phones: [p.phone],
      names: [p.name],
      risk_score: p.risk,
      risk_level: riskLevel(p.risk),
      fraud_flags: p.fraud_flags,
      total_orders: p.orders,
      total_refund_claims: p.claims,
      total_chargebacks: p.chargebacks,
      total_merchants_seen_at: p.merchants,
      refund_rate: p.orders > 0 ? money(p.refunds / p.orders) : 0,
      refund_timestamps: Array.from({ length: p.refunds }, (_, r) => daysAgo(120 - r * 11, 12)),
      fastest_claim_days: p.claims > 0 ? (p.segment === 'critical' ? 1 : p.segment === 'high' ? 2 : 8) : null,
      avg_claim_days: p.claims > 0 ? (p.segment === 'critical' ? 3 : p.segment === 'high' ? 6 : 14) : null,
      refund_acceleration_score: p.segment === 'critical' ? 90 + (idx % 8) : p.segment === 'high' ? 70 + (idx % 15) : p.refunds >= 3 ? 35 : 5,
      merchant_ids: [merchantId, userId],
      first_seen: daysAgo(firstSeenDays, 9),
      last_seen: daysAgo(lastSeenDays, 12),
      profile_confidence: Math.min(99, p.risk + 8),
      manually_reviewed: p.segment !== 'low' && idx % 3 === 0,
      merchant_notes: `Seeded ${p.segment} segment — ${p.claims} claim(s), ${p.chargebacks} chargeback(s).`,
      on_watchlist: p.watchlist,
      investigation_status: p.status,
      identity_confidence_grade: p.confidence,
      identity_signals_summary: {
        segment: p.segment,
        ltv: p.ltv,
        confidence: p.confidence,
        top_flags: p.fraud_flags.slice(0, 4),
        seed: 'simeon_fraud_ops',
      },
    };
  });
}

function buildJobs(merchantId) {
  const jobCount = 12;
  return Array.from({ length: jobCount }, (_, i) => {
    const id = uuid(`job:${i}`);
    const totalRows = 18500 + i * 1200;
    const flaggedCount = 320 + i * 28;
    return {
      id,
      merchant_id: merchantId,
      filename: `simeon-orders-${String(i + 1).padStart(2, '0')}-2026.csv`,
      status: 'completed',
      total_rows: totalRows,
      processed_rows: totalRows,
      failed_rows: i === 3 ? 2 : 0,
      flagged_count: flaggedCount,
      progress_pct: 100,
      progress_message: 'Complete',
      upload_type: i < 8 ? 'historical' : 'standard',
      hidden_by_merchant: false,
      completed_at: daysAgo(90 - i * 7, 11),
      started_at: daysAgo(91 - i * 7, 8),
      created_at: daysAgo(91 - i * 7, 8),
      updated_at: daysAgo(90 - i * 7, 11),
      label: `${STORE_NAME} fraud audit run ${i + 1}`,
      has_ground_truth: true,
      is_demo: false,
      data_quality: { source: 'shopify', rows_with_email: 0.98, rows_with_card: 0.9, rows_with_tracking: 0.94 },
      watchlist_sync_status: 'synced',
    };
  });
}

function buildTransactions(jobs, profiles, merchantId) {
  const txs = [];
  const appearances = [];
  const identities = [];
  const shopifyOrders = [];

  for (const profile of profiles) {
    const spec = profileSpec(profiles.indexOf(profile) + 1);
    const orderCount = Math.min(spec.orders, 12);
    for (let o = 0; o < orderCount; o += 1) {
      const job = jobs[(spec.i + o) % jobs.length];
      const txId = uuid(`tx:${spec.i}:${o}`);
      const orderId = `SM-${String(spec.i).padStart(4, '0')}-${String(o + 1).padStart(3, '0')}`;
      const orderValue = money(35 + ((spec.i * 17 + o * 31) % 420));
      const processedAt = daysAgo(85 - (spec.i % 80) - o, 9 + (o % 6));
      const hasRefund = o < spec.refunds;
      const hasChargeback = spec.chargebacks > 0 && o === 1;
      const hasClaim = o < spec.claims;

      txs.push({
        id: txId,
        job_id: job.id,
        order_id: orderId,
        customer_email: spec.email,
        customer_name: spec.name,
        shipping_address: spec.address,
        billing_address: spec.address,
        order_value: orderValue,
        payment_method: o % 3 === 0 ? 'shop_pay' : o % 3 === 1 ? 'card' : 'paypal',
        card_last4: spec.card,
        device_ip: profile.ips[0],
        account_created_at: daysAgo(400).slice(0, 10),
        previous_order_count: o,
        delivery_status: hasClaim ? 'delivered' : o % 8 === 0 ? 'in_transit' : 'delivered',
        refund_claimed: hasRefund || hasClaim,
        refund_reason: hasClaim ? 'missing_parcel' : hasRefund ? 'return_refund' : null,
        chargeback_filed: hasChargeback,
        match_score: spec.risk,
        identity_score: spec.risk,
        identity_confidence_grade: spec.confidence,
        match_status: matchStatus(spec.confidence),
        fraud_flags: spec.fraud_flags,
        signals_matched: spec.fraud_flags,
        behavioural_flags: spec.fraud_flags.filter((f) => /refund|claim|chargeback|velocity|return|inr/.test(f)),
        recommended_action: spec.risk >= 90
          ? 'Escalate before refund and assemble evidence'
          : spec.risk >= 70
            ? 'Review proof of delivery before refund'
            : 'No fraud action needed',
        ce3_eligible: spec.risk >= 85,
        ce3_qualifying_transactions: [],
        risk_level: riskLevel(spec.risk),
        processed_at: processedAt,
        dismissed_by_merchant: spec.segment === 'low' && spec.i % 5 === 0,
        identity_evidence: { grade: spec.confidence, segment: spec.segment },
        matched_datapoints: ['email', 'address', 'card_last4'],
        changed_datapoints: spec.risk >= 70 ? ['address', 'device_ip'] : [],
        evidence_summary: `${spec.fraud_flags.length} signal(s) for ${spec.segment} profile.`,
        context_flags: { simeon_fraud_ops_seed: true },
        context_summary: `${spec.orders} orders, ${spec.claims} claims.`,
      });

      if (spec.confidence === 'probable' || spec.confidence === 'definite') {
        appearances.push({
          profile_id: profile.id,
          audit_id: job.id,
          transaction_id: txId,
          score_at_time: spec.risk,
          flags_at_time: spec.fraud_flags,
          appeared_at: processedAt,
        });
      }

      const shopifyOrderId = String(9900000000000 + spec.i * 100 + o);
      identities.push({
        shop_domain: SHOP_DOMAIN,
        source: 'order',
        source_id: shopifyOrderId,
        email: spec.email,
        phone: spec.phone,
        shipping_address: spec.address,
        billing_address: spec.address,
        customer_id: `CUST-SM-${spec.i}`,
        updated_at: ANCHOR.toISOString(),
      });
      shopifyOrders.push({
        shop_domain: SHOP_DOMAIN,
        shopify_order_id: shopifyOrderId,
        order_number: orderId,
        customer_id: `CUST-SM-${spec.i}`,
        created_at_shopify: processedAt,
        total_price: orderValue,
        currency: 'GBP',
        financial_status: hasRefund ? 'partially_refunded' : 'paid',
        fulfillment_status: 'fulfilled',
        refunds_count: hasRefund ? 1 : 0,
        discount_codes: o % 5 === 0 ? ['LOYAL10'] : [],
        payment_gateway_names: [o % 2 === 0 ? 'shopify_payments' : 'paypal'],
        shipping_country: 'GB',
        billing_country: 'GB',
        line_items_count: 1 + (o % 3),
        shipping_price: 4.99,
        source_name: 'shopify',
        tags: spec.watchlist ? ['watchlist', 'risk-review'] : [],
        risk_recommendation: spec.risk >= 70 ? 'investigate' : 'accept',
        risk_level: riskLevel(spec.risk),
        raw_payload_hash: sha(`${shopifyOrderId}:${spec.email}`),
        updated_at: ANCHOR.toISOString(),
      });
    }
  }

  return { txs, appearances, identities, shopifyOrders };
}

function buildClaims(merchantId, userId, profiles) {
  const claims = [];
  const outcomes = [];
  const evidence = [];
  const events = [];

  for (const profile of profiles) {
    const spec = profileSpec(profiles.indexOf(profile) + 1);
    if (spec.claims === 0) continue;

    for (let c = 0; c < spec.claims; c += 1) {
      const claimId = crypto.randomUUID();
      const orderRef = `SM-${String(spec.i).padStart(4, '0')}-${String(c + 1).padStart(3, '0')}`;
      const claimType = c === 0 && spec.chargebacks > 0
        ? 'chargeback'
        : pick(claimTypes.filter((t) => t !== 'chargeback'));
      const isResolved = c < spec.claims - 1 || spec.segment === 'low' || (spec.i + c) % 3 !== 0;
      const status = isResolved
        ? pick(resolvedStatuses)
        : pick(openStatuses);
      const amount = money(40 + ((spec.i * 13 + c * 29) % 280));
      const ageDays = 2 + ((spec.i + c * 3) % 28);
      const submittedAt = daysAgo(ageDays, 10);

      claims.push({
        id: claimId,
        merchant_id: merchantId,
        shop_domain: SHOP_DOMAIN,
        shopify_order_id: orderRef,
        customer_id: profile.id,
        claim_type: claimType,
        customer_claim_reason: claimType === 'missing_parcel'
          ? 'Parcel marked delivered but not received.'
          : claimType === 'chargeback'
            ? 'Issuer dispute after refund denial.'
            : 'Customer requested refund via support.',
        normalized_reason: `Seeded ${claimType} for fraud-ops review.`,
        status,
        amount_at_risk: amount,
        currency: 'GBP',
        submitted_at: submittedAt,
        actor_user_id: userId,
        created_at: submittedAt,
        updated_at: isResolved ? daysAgo(Math.max(1, ageDays - 2), 14) : daysAgo(0.5, 14),
      });

      evidence.push({
        claim_id: claimId,
        evidence_type: claimType === 'chargeback' ? 'payment_dispute' : 'tracking',
        source: claimType === 'chargeback' ? 'stripe' : 'carrier',
        evidence_url: `https://evidence.seed.test/${orderRef}`,
        metadata: { seed_key: `sm-${orderRef}-tracking`, carrier: 'Royal Mail' },
        actor_user_id: userId,
        created_at: daysAgo(Math.max(0.5, ageDays - 1), 11),
      });

      events.push({
        claim_id: claimId,
        merchant_id: merchantId,
        shop_domain: SHOP_DOMAIN,
        event_type: 'claim_created',
        new_status: status,
        note: 'Claim created from seeded order data.',
        actor_user_id: userId,
        actor_email_hash: sha(ACCOUNT_EMAIL).slice(0, 32),
        metadata: { seed_event_key: `sm-${orderRef}-created` },
        created_at: submittedAt,
      });

      if (isResolved) {
        const decision = claimType === 'chargeback'
          ? 'chargeback_disputed'
          : pick(decisions.filter((d) => d !== 'chargeback_disputed'));
        let outcome = 'pending';
        if (decision === 'denied') outcome = 'suspected_fraud';
        else if (decision === 'approved' || decision === 'full_refund') outcome = 'customer_verified';
        else if (decision === 'chargeback_disputed') outcome = 'pending';
        else if (decision === 'partial_refund') outcome = 'recovered';
        else outcome = pick(outcomes);
        outcomes.push({
          claim_id: claimId,
          shop_domain: SHOP_DOMAIN,
          shopify_order_id: orderRef,
          decision,
          outcome,
          amount_refunded: ['approved', 'full_refund'].includes(decision) ? amount : decision === 'partial_refund' ? money(amount * 0.5) : null,
          amount_recovered: decision === 'denied' ? amount : null,
          notes: `Seeded outcome for ${spec.name}.`,
          actor_user_id: userId,
          decided_at: daysAgo(Math.max(1, ageDays - 1), 13),
          updated_at: daysAgo(Math.max(1, ageDays - 1), 13),
        });
        events.push({
          claim_id: claimId,
          merchant_id: merchantId,
          shop_domain: SHOP_DOMAIN,
          event_type: 'outcome_added',
          new_decision: decision,
          new_outcome: outcome,
          note: `Resolved as ${outcome}.`,
          actor_user_id: userId,
          actor_email_hash: sha(ACCOUNT_EMAIL).slice(0, 32),
          metadata: { seed_event_key: `sm-${orderRef}-outcome` },
          created_at: daysAgo(Math.max(0.8, ageDays - 1.2), 14),
        });
      }
    }
  }

  return { claims, outcomes, evidence, events };
}

function buildEvidencePackages(merchantId, profiles, txs) {
  const packages = [];
  const highRisk = profiles.filter((_, idx) => {
    const s = profileSpec(idx + 1);
    return s.segment === 'critical' || s.segment === 'high';
  });

  highRisk.slice(0, 48).forEach((profile, index) => {
    const spec = profileSpec(profiles.indexOf(profile) + 1);
    const tx = txs.find((t) => t.customer_email === spec.email && (t.identity_confidence_grade === 'definite' || t.identity_confidence_grade === 'probable'));
    if (!tx) return;
    packages.push({
      merchant_id: merchantId,
      customer_profile_id: profile.id,
      generated_for_order_id: tx.id,
      reference_number: `SM-EVD-2026-${String(index + 1).padStart(4, '0')}`,
      narrative_summary: `${spec.name}: ${spec.confidence} identity confidence, ${spec.claims} active claim(s), CE3 ${spec.risk >= 85 ? 'eligible' : 'not eligible'}.`,
      signal_snapshot: spec.fraud_flags,
      cross_merchant_indicator: spec.merchants > 1,
      ce3_eligible: spec.risk >= 85,
      ce3_qualifying_signals: spec.fraud_flags.slice(0, 3),
      ce3_prior_transactions: [],
      merchant_notes: 'Auto-generated for Simeon fraud-ops seed.',
      generated_at: daysAgo(5 + (index % 20), 14),
      created_at: daysAgo(5 + (index % 20), 14),
    });
  });
  return packages;
}

function buildWatchlist(userId, profiles, jobs) {
  const entries = [];
  const appearances = [];
  const defaultJobId = jobs[0]?.id;
  for (const profile of profiles) {
    const spec = profileSpec(profiles.indexOf(profile) + 1);
    if (!spec.watchlist || !defaultJobId) continue;
    entries.push({
      merchant_id: userId,
      customer_profile_id: profile.id,
      email_hash: sha(spec.email).slice(0, 32),
      display_name: spec.name,
      display_email: spec.email,
      last_seen_risk: riskLevel(spec.risk),
      last_seen_at: daysAgo(1, 12),
      removed_by_merchant: false,
      added_at: daysAgo(14 + (spec.i % 30), 10),
    });
    appearances.push({
      merchant_id: userId,
      customer_profile_id: profile.id,
      audit_id: jobs[spec.i % jobs.length].id,
      transaction_count: Math.max(1, spec.orders),
      highest_grade: spec.confidence,
      reviewed_at: spec.i % 4 === 0 ? daysAgo(2, 15) : null,
    });
  }
  return { entries, appearances };
}

async function main() {
  const user = await findUser(ACCOUNT_EMAIL);
  if (!user) {
    throw new Error(`No auth user for ${ACCOUNT_EMAIL}. Sign up or log in once, then re-run.`);
  }

  const merchantId = await ensureMerchant(user.id);
  await ensureShopify(merchantId);

  console.log('Clearing previous merchant seed data…');
  await deleteByMerchant(merchantId, user.id);

  const profiles = buildProfiles(merchantId, user.id);
  const jobs = buildJobs(merchantId);
  const { txs, appearances, identities, shopifyOrders } = buildTransactions(jobs, profiles, merchantId);
  const { claims, outcomes, evidence, events } = buildClaims(merchantId, user.id, profiles);
  const evidencePackages = buildEvidencePackages(merchantId, profiles, txs);
  const { entries: watchlistEntries, appearances: watchlistAppearances } = buildWatchlist(user.id, profiles, jobs);

  console.log('Inserting profiles…');
  await chunkedInsert('customer_profiles', profiles);

  console.log('Inserting audit runs and transactions…');
  await chunkedInsert('processing_jobs', jobs);
  await chunkedInsert('audit_transactions', txs);
  await chunkedInsert('customer_profile_audit_appearances', appearances);

  console.log('Inserting Shopify signals…');
  for (let i = 0; i < identities.length; i += 400) {
    await supabase.from('merchant_identities').upsert(identities.slice(i, i + 400), { onConflict: 'shop_domain,source,source_id' });
  }
  for (let i = 0; i < shopifyOrders.length; i += 400) {
    await supabase.from('shopify_order_signals').upsert(shopifyOrders.slice(i, i + 400), { onConflict: 'shop_domain,shopify_order_id' });
  }

  console.log('Inserting claims and outcomes…');
  await chunkedInsert('merchant_claims', claims);
  if (outcomes.length) await chunkedInsert('merchant_case_outcomes', outcomes);
  if (evidence.length) await chunkedInsert('claim_evidence_items', evidence);
  if (events.length) await chunkedInsert('claim_events', events);

  console.log('Inserting evidence packages and watchlist…');
  if (evidencePackages.length) await chunkedInsert('evidence_packages', evidencePackages);
  if (watchlistEntries.length) await chunkedInsert('watchlist_entries', watchlistEntries);
  if (watchlistAppearances.length) await chunkedInsert('watchlist_appearances', watchlistAppearances);

  const notes = profiles
    .filter((_, idx) => profileSpec(idx + 1).segment !== 'low')
    .slice(0, 120)
    .map((profile, idx) => {
      const spec = profileSpec(profiles.indexOf(profile) + 1);
      return {
        merchant_id: user.id,
        customer_profile_id: profile.id,
        body: `Fraud ops note: ${spec.name} — ${spec.segment} risk, ${spec.claims} claim(s).`,
        deleted_by_merchant: false,
        created_at: daysAgo(3 + (idx % 10), 10),
        updated_at: daysAgo(3 + (idx % 10), 10),
      };
    });
  if (notes.length) await chunkedInsert('customer_notes', notes);

  const summary = {
    ok: true,
    email: ACCOUNT_EMAIL,
    user_id: user.id,
    merchant_id: merchantId,
    store_name: STORE_NAME,
    shop_domain: SHOP_DOMAIN,
    counts: {
      customers: profiles.length,
      processing_jobs: jobs.length,
      audit_transactions: txs.length,
      claims: claims.length,
      evidence_packages: evidencePackages.length,
      watchlist_entries: watchlistEntries.length,
      inbox_reviewable_tx: txs.filter((t) => ['probable', 'definite'].includes(t.identity_confidence_grade) && !t.dismissed_by_merchant).length,
    },
  };

  fs.writeFileSync('scripts/seed-simeon-fraud-ops-log.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
