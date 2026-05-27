/**
 * Finish partial simeon fraud-ops seed (claims, outcomes, watchlist, evidence).
 * Safe to re-run; skips rows that already exist.
 */

import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ACCOUNT_EMAIL = 'simeonmurray123@gmail.com';
const SHOP_DOMAIN = 'simeon-murray-store.myshopify.com';
const ANCHOR = new Date('2026-05-27T12:00:00.000Z');

function readEnv() {
  const raw = fs.readFileSync('.env.local', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
readEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function sha(v) {
  return crypto.createHash('sha256').update(v).digest('hex');
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
function riskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function segmentForIndex(i) {
  if (i % 23 === 0) return 'critical';
  if (i % 11 === 0) return 'high';
  if (i % 5 === 0) return 'medium';
  return 'low';
}

function profileSpec(i) {
  const segment = segmentForIndex(i);
  let claims = 0;
  let chargebacks = 0;
  let watchlist = false;
  let risk = 20;
  let name = `Customer ${i}`;
  let email = `simeon.seed.${String(i).padStart(4, '0')}@shopmail.test`;
  const fraud_flags = ['refund_velocity_14d', 'crossmerchant_identity_match'];

  if (segment === 'critical') {
    claims = 3 + (i % 5);
    chargebacks = i % 3 === 0 ? 1 : 0;
    watchlist = true;
    risk = 92;
  } else if (segment === 'high') {
    claims = 2 + (i % 3);
    chargebacks = i % 7 === 0 ? 1 : 0;
    watchlist = i % 4 === 0;
    risk = 78;
  } else if (segment === 'medium') {
    claims = i % 3 === 0 ? 1 : 0;
    risk = 45;
  }

  return { i, segment, claims, chargebacks, watchlist, risk, name, email, fraud_flags };
}

async function findUser() {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === ACCOUNT_EMAIL.toLowerCase());
}

async function chunkedInsert(table, rows, size = 150) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  const user = await findUser();
  if (!user) throw new Error(`User not found: ${ACCOUNT_EMAIL}`);
  const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
  if (!merchant) throw new Error('Merchant not found');

  const merchantId = merchant.id;
  const { data: profiles } = await supabase
    .from('customer_profiles')
    .select('id, primary_email')
    .filter('merchant_ids', 'cs', JSON.stringify([merchantId]));

  const emailToId = new Map((profiles ?? []).map((p) => [p.primary_email, p.id]));
  const { data: existingClaims } = await supabase
    .from('merchant_claims')
    .select('id, customer_id, shopify_order_id')
    .eq('merchant_id', merchantId);

  const claimKey = new Set((existingClaims ?? []).map((c) => `${c.customer_id}:${c.shopify_order_id}`));
  const claimIds = (existingClaims ?? []).map((c) => c.id);

  const { data: existingOutcomes } = await supabase
    .from('merchant_case_outcomes')
    .select('claim_id')
    .in('claim_id', claimIds.length ? claimIds : ['00000000-0000-0000-0000-000000000000']);
  const outcomeClaimIds = new Set((existingOutcomes ?? []).map((o) => o.claim_id));

  const newClaims = [];
  const newOutcomes = [];
  const newEvents = [];
  const newEvidence = [];

  for (let i = 1; i <= 500; i += 1) {
    const spec = profileSpec(i);
    const profileId = emailToId.get(spec.email);
    if (!profileId || spec.claims === 0) continue;

    for (let c = 0; c < spec.claims; c += 1) {
      const orderRef = `SM-${String(spec.i).padStart(4, '0')}-${String(c + 1).padStart(3, '0')}`;
      const key = `${profileId}:${orderRef}`;
      if (claimKey.has(key)) continue;

      const claimId = crypto.randomUUID();
      const claimType = c === 0 && spec.chargebacks > 0 ? 'chargeback' : 'missing_parcel';
      const isResolved = c < spec.claims - 1 || (spec.i + c) % 3 !== 0;
      const status = isResolved ? 'resolved' : 'open';
      const amount = money(50 + ((spec.i * 11 + c * 17) % 250));
      const ageDays = 3 + ((spec.i + c) % 25);
      const submittedAt = daysAgo(ageDays, 10);

      newClaims.push({
        id: claimId,
        merchant_id: merchantId,
        shop_domain: SHOP_DOMAIN,
        shopify_order_id: orderRef,
        customer_id: profileId,
        claim_type: claimType,
        customer_claim_reason: 'Seeded claim for fraud-ops demo.',
        normalized_reason: `Seeded ${claimType}.`,
        status,
        amount_at_risk: amount,
        currency: 'GBP',
        submitted_at: submittedAt,
        actor_user_id: user.id,
        created_at: submittedAt,
        updated_at: submittedAt,
      });

      newEvents.push({
        claim_id: claimId,
        merchant_id: merchantId,
        shop_domain: SHOP_DOMAIN,
        event_type: 'claim_created',
        new_status: status,
        note: 'Claim created from seed completion.',
        actor_user_id: user.id,
        actor_email_hash: sha(ACCOUNT_EMAIL).slice(0, 32),
        metadata: { seed_event_key: `complete-${orderRef}` },
        created_at: submittedAt,
      });

      newEvidence.push({
        claim_id: claimId,
        evidence_type: 'tracking',
        source: 'carrier',
        evidence_url: `https://evidence.seed.test/${orderRef}`,
        metadata: { seed_key: `complete-${orderRef}` },
        actor_user_id: user.id,
        created_at: submittedAt,
      });

      if (isResolved) {
        const decision = claimType === 'chargeback' ? 'chargeback_disputed' : 'denied';
        const outcome = decision === 'denied' ? 'suspected_fraud' : 'pending';
        newOutcomes.push({
          claim_id: claimId,
          shop_domain: SHOP_DOMAIN,
          shopify_order_id: orderRef,
          decision,
          outcome,
          amount_recovered: decision === 'denied' ? amount : null,
          notes: 'Seeded outcome.',
          actor_user_id: user.id,
          decided_at: daysAgo(Math.max(1, ageDays - 1), 13),
          updated_at: daysAgo(Math.max(1, ageDays - 1), 13),
        });
      }
    }
  }

  for (const claim of existingClaims ?? []) {
    if (outcomeClaimIds.has(claim.id)) continue;
    if (Math.random() > 0.65) continue;
    newOutcomes.push({
      claim_id: claim.id,
      shop_domain: SHOP_DOMAIN,
      shopify_order_id: claim.shopify_order_id,
      decision: 'denied',
      outcome: 'suspected_fraud',
      amount_recovered: 100,
      notes: 'Backfilled seeded outcome.',
      actor_user_id: user.id,
      decided_at: daysAgo(5, 13),
      updated_at: daysAgo(5, 13),
    });
  }

  const { data: existingPkgRefs } = await supabase
    .from('evidence_packages')
    .select('reference_number')
    .eq('merchant_id', merchantId);
  const pkgRefSet = new Set((existingPkgRefs ?? []).map((r) => r.reference_number));

  const evidencePackages = [];
  if (pkgRefSet.size < 40) {
    const { data: txs } = await supabase
      .from('audit_transactions')
      .select('id, customer_email, identity_confidence_grade')
      .in('identity_confidence_grade', ['probable', 'definite'])
      .limit(60);

    const highEmails = new Set();
    for (const [idx, email] of [...emailToId.keys()].entries()) {
      const spec = profileSpec(idx + 1);
      if (spec.segment === 'critical' || spec.segment === 'high') highEmails.add(email);
    }

    let pkgIndex = 0;
    for (const tx of txs ?? []) {
      if (!highEmails.has(tx.customer_email)) continue;
      const profileId = emailToId.get(tx.customer_email);
      if (!profileId) continue;
      const reference = `SM-EVD-2026-${String(pkgIndex + 1).padStart(4, '0')}`;
      if (pkgRefSet.has(reference)) {
        pkgIndex += 1;
        continue;
      }
      evidencePackages.push({
        merchant_id: merchantId,
        customer_profile_id: profileId,
        generated_for_order_id: tx.id,
        reference_number: reference,
        narrative_summary: 'Seeded evidence package for chargeback / INR review.',
        signal_snapshot: ['crossmerchant_identity_match', 'refund_velocity_14d'],
        cross_merchant_indicator: true,
        ce3_eligible: true,
        ce3_qualifying_signals: ['crossmerchant_identity_match'],
        ce3_prior_transactions: [],
        merchant_notes: 'Simeon fraud-ops seed.',
        generated_at: daysAgo(4 + (pkgIndex % 15), 14),
        created_at: daysAgo(4 + (pkgIndex % 15), 14),
      });
      pkgIndex += 1;
      if (pkgIndex >= 48) break;
    }
  }

  const watchlistRows = [];
  for (let i = 1; i <= 500; i += 1) {
    const spec = profileSpec(i);
    if (!spec.watchlist) continue;
    const profileId = emailToId.get(spec.email);
    if (!profileId) continue;
    watchlistRows.push({
      merchant_id: user.id,
      customer_profile_id: profileId,
      email_hash: sha(spec.email).slice(0, 32),
      display_name: spec.name,
      display_email: spec.email,
      last_seen_risk: riskLevel(spec.risk),
      last_seen_at: daysAgo(1, 12),
      removed_by_merchant: false,
      added_at: daysAgo(10 + (i % 20), 10),
    });
  }

  if (newClaims.length) await chunkedInsert('merchant_claims', newClaims);
  if (newOutcomes.length) await chunkedInsert('merchant_case_outcomes', newOutcomes);
  if (newEvidence.length) await chunkedInsert('claim_evidence_items', newEvidence);
  if (newEvents.length) await chunkedInsert('claim_events', newEvents);
  if (evidencePackages.length) await chunkedInsert('evidence_packages', evidencePackages);
  if (watchlistRows.length) {
    const { data: existingWl } = await supabase
      .from('watchlist_entries')
      .select('customer_profile_id')
      .eq('merchant_id', user.id);
    const wlIds = new Set((existingWl ?? []).map((r) => r.customer_profile_id));
    const freshWl = watchlistRows.filter((r) => !wlIds.has(r.customer_profile_id));
    if (freshWl.length) await chunkedInsert('watchlist_entries', freshWl);
  }

  const { count: finalClaims } = await supabase
    .from('merchant_claims')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  console.log(JSON.stringify({
    ok: true,
    merchant_id: merchantId,
    added: {
      claims: newClaims.length,
      outcomes: newOutcomes.length,
      evidence_packages: evidencePackages.length,
      watchlist: watchlistRows.length,
    },
    totals: { claims: finalClaims },
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
