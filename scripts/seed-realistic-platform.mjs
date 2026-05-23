import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = 'UnauthDemo2026!';
const ANCHOR = new Date('2026-05-22T12:00:00Z');

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const merchants = [
  { slug: 'elara', name: 'Elara & Co Apparel', domain: 'elaraandco.com', platform: 'shopify', volume: '50k_250k', concern: 'refund_abuse', daysAgo: 168 },
  { slug: 'northline', name: 'Northline Electronics', domain: 'northline-electronics.co.uk', platform: 'magento', volume: 'over_250k', concern: 'chargebacks', daysAgo: 144 },
  { slug: 'harbor', name: 'Harbor Home', domain: 'harborhome.co.uk', platform: 'shopify', volume: '50k_250k', concern: 'inr_claims', daysAgo: 119 },
  { slug: 'lumen', name: 'Lumen Beauty', domain: 'lumenbeauty.com', platform: 'bigcommerce', volume: '10k_50k', concern: 'refund_abuse', daysAgo: 93 },
  { slug: 'vertex', name: 'Vertex Sneakers', domain: 'vertexsneakers.com', platform: 'woocommerce', volume: '50k_250k', concern: 'all', daysAgo: 71 },
  { slug: 'kestrel', name: 'Kestrel Kids', domain: 'kestrelkids.co.uk', platform: 'shopify', volume: '10k_50k', concern: 'inr_claims', daysAgo: 43 },
  { slug: 'vale', name: 'Vale Outdoor', domain: 'valeoutdoor.co.uk', platform: 'custom', volume: '50k_250k', concern: 'chargebacks', daysAgo: 18 },
];

const sharedProfiles = [
  { key: 'nora-kessler', name: 'Nora Kessler', email: 'nora.kessler@examplemail.com', merchants: [0, 1, 2, 3, 4, 6], grade: 'definite', score: 96, flags: ['crossmerchant_identity_match', 'refund_rate_over_60pct', 'payment_fingerprint_match', 'address_normalization_match'] },
  { key: 'miles-calder', name: 'Miles Calder', email: 'miles.calder@northpostmail.com', merchants: [0, 1, 3, 4, 5], grade: 'definite', score: 92, flags: ['crossmerchant_identity_match', 'denial_then_chargeback', 'device_reuse_observed', 'inr_repeat_pattern'] },
  { key: 'priya-shah', name: 'Priya Shah', email: 'priya.shah@parcelmail.co.uk', merchants: [0, 2, 3, 5], grade: 'probable', score: 84, flags: ['crossmerchant_identity_match', 'shipping_address_variant', 'refund_velocity_14d'] },
  { key: 'theo-marsh', name: 'Theo Marsh', email: 'theo.marsh@postinbox.com', merchants: [1, 2, 4], grade: 'probable', score: 78, flags: ['crossmerchant_identity_match', 'card_reuse_observed', 'inr_repeat_pattern'] },
  { key: 'amara-vale', name: 'Amara Vale', email: 'amara.vale@fastmail.example', merchants: [0, 3, 6], grade: 'possible', score: 66, flags: ['shipping_address_variant', 'multi_email_device'] },
  { key: 'elliot-king', name: 'Elliot King', email: 'elliot.king@shopmail.example', merchants: [2, 5], grade: 'possible', score: 58, flags: ['device_reuse_observed', 'refund_pattern_watch'] },
  { key: 'grace-lin', name: 'Grace Lin', email: 'grace.lin@samplemail.example', merchants: [0, 4, 6], grade: 'weak', score: 36, flags: ['low_confidence_address_overlap'] },
];

const firstNames = ['Maya', 'Jonas', 'Leah', 'Oscar', 'Sofia', 'Nathan', 'Iris', 'Daniel', 'Zara', 'Felix', 'Imani', 'Rafael', 'Clara', 'Hugo', 'Esme', 'Arun', 'Lina', 'Marcus', 'Anya', 'Theo'];
const lastNames = ['Bennett', 'Hart', 'Foster', 'Cole', 'Rahman', 'Patel', 'Morgan', 'Wallace', 'Reed', 'Stone', 'Hughes', 'Turner', 'Cooper', 'Ellis', 'Bailey', 'Shaw'];
const streets = ['Larkspur Lane', 'Hawthorn Road', 'Brixton Hill', 'Newington Green', 'Dale Street', 'Crescent Avenue', 'Station Road', 'Moorfield Drive', 'Granby Row', 'Market Street'];
const signals = ['refund_rate_over_60pct', 'crossmerchant_identity_match', 'shipping_address_variant', 'denial_then_chargeback', 'payment_fingerprint_match', 'address_normalization_match', 'device_reuse_observed', 'refund_velocity_14d', 'inr_repeat_pattern', 'card_reuse_observed'];

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function uuid(label) {
  const hex = hash(`unauth-realistic-seed:${label}`).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function daysAgo(days, hour = 10) {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(days) {
  return daysAgo(days).slice(0, 10);
}

function riskLevel(score) {
  if (score >= 88) return 'critical';
  if (score >= 72) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function matchStatus(grade) {
  if (grade === 'definite') return 'definite';
  if (grade === 'probable') return 'probable';
  if (grade === 'possible') return 'candidate';
  return 'none';
}

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(260522);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

async function findUser(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`List users failed: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

async function ensureUser(email, merchantName, primary = false) {
  const existing = await findUser(email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { setup_complete: true, merchant_name: merchantName, seeded_demo: true, primary_demo: primary },
    });
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { setup_complete: true, merchant_name: merchantName, seeded_demo: true, primary_demo: primary },
  });
  if (error || !data.user) throw new Error(`Create user ${email} failed: ${error?.message ?? 'missing user'}`);
  return data.user.id;
}

async function chunked(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function deleteIn(table, column, values) {
  const unique = [...new Set(values)].filter(Boolean);
  for (let i = 0; i < unique.length; i += 200) {
    const { error } = await supabase.from(table).delete().in(column, unique.slice(i, i + 200));
    if (error) throw new Error(`${table} delete failed: ${error.message}`);
  }
}

function makeProfile(template, index, merchantIds, jobForTx) {
  const isShared = Array.isArray(template.merchants);
  const profileId = uuid(`profile:${template.key}`);
  const merchantIndexes = isShared ? template.merchants : [template.merchantIndex];
  const profileMerchants = merchantIndexes.map((i) => merchantIds[i]);
  const baseScore = template.score;
  const grade = template.grade;
  const txs = [];
  const appearances = [];
  const refundDates = [];
  const flags = template.flags;
  const emails = new Set([template.email]);
  const cards = new Set();
  const ips = new Set();
  const addresses = new Set();
  const phones = new Set();
  const names = new Set([template.name]);
  let orderCount = 0;
  let claims = 0;
  let chargebacks = 0;
  let firstSeen = daysAgo(175);
  let lastSeen = daysAgo(2);
  let totalValue = 0;

  for (const merchantIndex of merchantIndexes) {
    const count = isShared ? 10 + Math.floor(rand() * 18) : 3 + Math.floor(rand() * 5);
    const merchant = merchants[merchantIndex];
    for (let i = 0; i < count; i += 1) {
      const age = Math.max(2, Math.floor(rand() * 168));
      const processedAt = daysAgo(age, 8 + Math.floor(rand() * 10));
      const job = jobForTx(merchantIndex, age);
      const txId = uuid(`tx:${template.key}:${merchant.slug}:${i}`);
      const score = Math.max(4, Math.min(99, Math.round(baseScore + (rand() - 0.48) * (isShared ? 10 : 22))));
      const level = riskLevel(score);
      const refundProbability = isShared ? (grade === 'definite' ? 0.48 : grade === 'probable' ? 0.34 : 0.16) : score > 55 ? 0.12 : 0.035;
      const chargebackProbability = isShared ? (grade === 'definite' ? 0.16 : grade === 'probable' ? 0.09 : 0.025) : 0.012;
      const refund = rand() < refundProbability;
      const chargeback = refund && rand() < chargebackProbability;
      const amount = Math.round((35 + rand() * (merchant.platform === 'magento' ? 840 : 320)) * 100) / 100;
      const suffix = i % 5 === 0 && isShared ? `+alias${i}@${merchant.domain}` : template.email;
      const email = suffix.replace('@', `.${merchant.slug}@`);
      const card = String(4100 + Math.floor(rand() * 5600)).slice(-4);
      const phone = `+44 7${Math.floor(100000000 + rand() * 899999999)}`;
      const address = `${10 + Math.floor(rand() * 880)} ${pick(streets)}, ${['London', 'Manchester', 'Bristol', 'Leeds', 'Birmingham'][merchantIndex % 5]}`;
      const ip = `82.${20 + merchantIndex}.${Math.floor(rand() * 220)}.${Math.floor(rand() * 220)}`;
      const firedSignals = isShared
        ? [...new Set([...flags, pick(signals), pick(signals)])].slice(0, 6)
        : score > 55
          ? [pick(signals), pick(signals)].filter((value, idx, arr) => arr.indexOf(value) === idx)
          : [];

      emails.add(email);
      cards.add(card);
      ips.add(ip);
      addresses.add(address);
      phones.add(phone);
      totalValue += amount;
      orderCount += 1;
      if (refund) {
        claims += 1;
        refundDates.push(processedAt);
      }
      if (chargeback) chargebacks += 1;
      if (processedAt < firstSeen) firstSeen = processedAt;
      if (processedAt > lastSeen) lastSeen = processedAt;

      txs.push({
        id: txId,
        job_id: job.id,
        order_id: `${merchant.slug.toUpperCase()}-${String(index).padStart(3, '0')}-${String(i + 1).padStart(4, '0')}`,
        customer_email: email,
        customer_name: template.name,
        shipping_address: address,
        billing_address: address,
        order_value: amount,
        payment_method: pick(['visa', 'mastercard', 'amex', 'paypal', 'apple_pay']),
        card_last4: card,
        device_ip: ip,
        account_created_at: dateOnly(age + 80 + Math.floor(rand() * 450)),
        previous_order_count: Math.floor(rand() * 18),
        delivery_status: refund ? pick(['delivered', 'signed', 'photo_proof_disputed']) : pick(['delivered', 'signed', 'collected']),
        refund_claimed: refund,
        refund_reason: refund ? pick(['Item not received', 'Wrong item received', 'Quality issue', 'Unauthorised purchase']) : null,
        chargeback_filed: chargeback,
        match_score: score,
        fraud_flags: firedSignals,
        risk_level: level,
        processed_at: processedAt,
        identity_confidence_grade: grade,
        match_status: matchStatus(grade),
        identity_score: score,
        signals_matched: firedSignals,
        behavioural_flags: firedSignals.filter((signal) => signal.includes('refund') || signal.includes('inr')),
        recommended_action: score >= 88 ? 'Decline next order and assemble evidence package' : score >= 72 ? 'Manual review before fulfilment' : score >= 45 ? 'Monitor future claims' : 'No action',
        ce3_eligible: chargeback || (refund && score >= 70),
        ce3_qualifying_transactions: [],
        identity_evidence: { grade, matched: firedSignals.slice(0, 4), merchants: profileMerchants.length },
        matched_datapoints: ['email', 'address', 'card_last4', 'device_ip'].slice(0, isShared ? 4 : 2),
        changed_datapoints: i % 4 === 0 ? ['email', 'address'] : [],
        evidence_summary: firedSignals.length ? `${firedSignals.length} signals matched across ${profileMerchants.length} merchant${profileMerchants.length === 1 ? '' : 's'}.` : 'No elevated identity evidence.',
        context_flags: { network: isShared, merchant_count: profileMerchants.length },
        context_summary: isShared ? `${profileMerchants.length} merchant footprint` : 'Single merchant profile',
        dismissed_by_merchant: false,
      });
      appearances.push({
        id: uuid(`appearance:${txId}`),
        profile_id: profileId,
        audit_id: job.id,
        transaction_id: txId,
        score_at_time: score,
        flags_at_time: firedSignals,
        appeared_at: processedAt,
      });
    }
  }

  return {
    profile: {
      id: profileId,
      primary_email: template.email,
      emails: [...emails].slice(0, 8),
      ips: [...ips].slice(0, 8),
      addresses: [...addresses].slice(0, 8),
      card_last4s: [...cards].slice(0, 8),
      phones: [...phones].slice(0, 5),
      names: [...names],
      risk_score: Math.round(Math.min(99, baseScore + claims * 1.6 + chargebacks * 3)),
      risk_level: riskLevel(Math.min(99, baseScore + claims * 1.6 + chargebacks * 3)),
      fraud_flags: [...new Set(flags)].slice(0, 8),
      total_orders: orderCount,
      total_refund_claims: claims,
      total_chargebacks: chargebacks,
      total_merchants_seen_at: profileMerchants.length,
      refund_rate: orderCount ? claims / orderCount : 0,
      refund_timestamps: refundDates,
      fastest_claim_days: claims ? Math.max(1, Math.round(1 + rand() * 4)) : null,
      avg_claim_days: claims ? Math.round(5 + rand() * 14) : null,
      refund_acceleration_score: Math.round(Math.min(100, claims * 9 + chargebacks * 18 + rand() * 10)),
      merchant_ids: profileMerchants,
      first_seen: firstSeen,
      last_seen: lastSeen,
      last_audit_id: txs[txs.length - 1]?.job_id ?? null,
      profile_confidence: Math.round(Math.min(99, baseScore + (isShared ? 5 : 0))),
      manually_reviewed: false,
      on_watchlist: false,
      investigation_status: baseScore >= 88 ? 'under_review' : baseScore >= 72 ? 'contacted' : 'new',
      identity_confidence_grade: grade,
      identity_signals_summary: [...new Set(flags)].slice(0, 5),
    },
    txs,
    appearances,
    totalValue,
  };
}

async function main() {
  console.log('[seed] Ensuring demo users and merchants');
  const userIds = [];
  const merchantIds = [];
  for (const [index, merchant] of merchants.entries()) {
    const email = index === 0 ? 'demo@unauth.app' : `ops+${merchant.slug}@unauth.app`;
    const userId = await ensureUser(email, merchant.name, index === 0);
    userIds.push(userId);
    const existing = await supabase.from('merchants').select('id').eq('user_id', userId).maybeSingle();
    if (existing.error) throw new Error(`Read merchant failed: ${existing.error.message}`);
    const id = existing.data?.id ?? uuid(`merchant:${merchant.slug}`);
    const { error } = await supabase.from('merchants').upsert({
      id,
      user_id: userId,
      name: merchant.name,
      created_at: daysAgo(merchant.daysAgo),
      updated_at: daysAgo(1),
      setup_complete: true,
      monthly_order_volume: merchant.volume,
      primary_fraud_concern: merchant.concern,
      is_internal: false,
      is_demo: true,
      platform: merchant.platform,
      default_column_map: null,
    }, { onConflict: 'id' });
    if (error) throw new Error(`Upsert merchant failed: ${error.message}`);
    merchantIds.push(id);
  }

  const jobs = [];
  for (const [mIndex, merchant] of merchants.entries()) {
    [132, 72, 18].forEach((age, j) => {
      jobs.push({
        id: uuid(`job:${merchant.slug}:${j}`),
        merchant_id: merchantIds[mIndex],
        status: 'completed',
        total_rows: 0,
        processed_rows: 0,
        failed_rows: 0,
        error_log: [],
        has_ground_truth: true,
        flagged_count: 0,
        created_at: daysAgo(age),
        updated_at: daysAgo(Math.max(1, age - 1)),
        completed_at: daysAgo(Math.max(1, age - 1)),
        is_demo: true,
        filename: `${merchant.domain.replace(/\W+/g, '-')}-orders-${dateOnly(age)}.csv`,
        hidden_by_merchant: false,
        data_quality: { rows_with_email: 0.97, rows_with_card: 0.91, source: merchant.platform },
        date_range_start: dateOnly(age + 30),
        date_range_end: dateOnly(Math.max(1, age - 1)),
        label: `${merchant.name} ${j === 0 ? 'winter' : j === 1 ? 'spring' : 'current'} audit`,
        upload_type: j === 0 ? 'historical' : 'standard',
        progress_pct: 100,
        progress_message: 'Complete',
        started_at: daysAgo(age),
        watchlist_sync_status: 'synced',
      });
    });
  }
  const jobForTx = (merchantIndex, age) => {
    const merchantJobs = jobs.filter((job) => job.merchant_id === merchantIds[merchantIndex]);
    if (age > 96) return merchantJobs[0];
    if (age > 42) return merchantJobs[1];
    return merchantJobs[2];
  };

  const profileTemplates = [...sharedProfiles];
  for (let merchantIndex = 0; merchantIndex < merchants.length; merchantIndex += 1) {
    for (let i = 0; i < 44; i += 1) {
      const first = pick(firstNames);
      const last = pick(lastNames);
      const score = Math.round(8 + rand() * (i % 9 === 0 ? 70 : 38));
      profileTemplates.push({
        key: `local-${merchants[merchantIndex].slug}-${i}`,
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@customer-mail.example`,
        merchantIndex,
        grade: score >= 72 ? 'probable' : score >= 45 ? 'possible' : 'weak',
        score,
        flags: score >= 72 ? [pick(signals), pick(signals), 'refund_velocity_14d'] : score >= 45 ? [pick(signals)] : [],
      });
    }
  }

  const built = profileTemplates.map((template, index) => makeProfile(template, index, merchantIds, jobForTx));
  const profiles = built.map((item) => item.profile);
  const txs = built.flatMap((item) => item.txs);
  const appearances = built.flatMap((item) => item.appearances);

  for (const job of jobs) {
    const rows = txs.filter((tx) => tx.job_id === job.id);
    job.total_rows = rows.length;
    job.processed_rows = rows.length;
    job.flagged_count = rows.filter((tx) => ['definite', 'probable'].includes(tx.match_status)).length;
  }

  const primaryMerchantId = merchantIds[0];
  const watchlistProfiles = profiles
    .filter((profile) => profile.merchant_ids.includes(primaryMerchantId) && profile.risk_score >= 45)
    .slice(0, 28);
  for (const profile of watchlistProfiles) profile.on_watchlist = true;

  const watchlistEntries = watchlistProfiles.map((profile, i) => ({
    id: uuid(`watchlist:${profile.id}`),
    merchant_id: userIds[0],
    customer_profile_id: profile.id,
    display_name: profile.names[0],
    display_email: profile.primary_email,
    added_at: daysAgo(34 - (i % 24)),
    last_seen_risk: profile.risk_level,
    last_seen_at: profile.last_seen,
    removed_by_merchant: i % 13 === 0,
  }));
  const watchlistAppearances = watchlistProfiles.slice(0, 16).map((profile, i) => {
    const appearance = appearances.find((row) => row.profile_id === profile.id);
    return {
      id: uuid(`watchlist-appearance:${profile.id}`),
      merchant_id: primaryMerchantId,
      customer_profile_id: profile.id,
      audit_id: appearance?.audit_id ?? jobs[2].id,
      transaction_count: 1 + Math.floor(rand() * 5),
      highest_grade: profile.identity_confidence_grade,
      first_seen_in_audit: appearance?.appeared_at ?? profile.last_seen,
      reviewed_at: i % 4 === 0 ? daysAgo(2 + i) : null,
    };
  });

  const evidencePackages = profiles
    .filter((profile) => profile.merchant_ids.includes(primaryMerchantId) && (profile.total_chargebacks > 0 || profile.risk_score >= 58))
    .slice(0, 14)
    .map((profile, i) => {
      const tx = txs.find((row) => row.customer_email && profile.emails.includes(row.customer_email) && row.ce3_eligible) ?? txs.find((row) => profile.emails.includes(row.customer_email));
      return {
        id: uuid(`evidence:${profile.id}`),
        merchant_id: primaryMerchantId,
        customer_profile_id: profile.id,
        generated_for_order_id: tx?.id ?? null,
        generated_at: daysAgo(12 - (i % 9), 14),
        reference_number: `UA-${ANCHOR.getUTCFullYear()}-${String(i + 1).padStart(4, '0')}`,
        narrative_summary: `${profile.names[0]} shows ${profile.identity_confidence_grade} identity confidence with ${profile.total_refund_claims} claims across ${profile.total_merchants_seen_at} merchant${profile.total_merchants_seen_at === 1 ? '' : 's'}.`,
        signal_snapshot: profile.identity_signals_summary,
        cross_merchant_indicator: profile.total_merchants_seen_at > 1,
        ce3_eligible: true,
        ce3_qualifying_signals: profile.identity_signals_summary,
        ce3_prior_transactions: [],
        merchant_notes: 'Demo evidence packet generated from seeded transaction history.',
        created_at: daysAgo(12 - (i % 9), 14),
      };
    });

  const activity = watchlistProfiles.slice(0, 20).flatMap((profile, i) => [
    {
      id: uuid(`activity:${profile.id}:created`),
      profile_id: profile.id,
      merchant_id: primaryMerchantId,
      event_type: 'profile_created',
      event_data: { source: 'seeded audit', score: profile.risk_score },
      created_at: profile.first_seen,
    },
    {
      id: uuid(`activity:${profile.id}:watchlist`),
      profile_id: profile.id,
      merchant_id: primaryMerchantId,
      event_type: 'watchlist_added',
      event_data: { reason: 'High confidence repeat pattern' },
      created_at: daysAgo(18 - (i % 12)),
    },
  ]);

  const globalProfiles = profiles.filter((profile) => profile.total_merchants_seen_at > 1);
  const globalAttributes = [];
  const globalClusters = [];
  const globalClusterAttributes = [];
  const globalAppearances = [];
  for (const profile of globalProfiles) {
    const clusterId = uuid(`global-cluster:${profile.id}`);
    const emailAttr = uuid(`global-attr:${profile.id}:email`);
    const cardAttr = uuid(`global-attr:${profile.id}:card`);
    globalAttributes.push(
      {
        id: emailAttr,
        attribute_type: 'email',
        attribute_value: hash(`email:${profile.primary_email}`),
        first_seen_at: profile.first_seen,
        last_seen_at: profile.last_seen,
        merchant_ids: profile.merchant_ids,
        audit_ids: [profile.last_audit_id].filter(Boolean),
        appearance_count: profile.total_orders,
        cross_merchant_count: profile.total_merchants_seen_at,
        confidence_grade: profile.identity_confidence_grade,
      },
      {
        id: cardAttr,
        attribute_type: 'card_last4',
        attribute_value: hash(`card:${profile.card_last4s[0] ?? profile.id}`),
        first_seen_at: profile.first_seen,
        last_seen_at: profile.last_seen,
        merchant_ids: profile.merchant_ids,
        audit_ids: [profile.last_audit_id].filter(Boolean),
        appearance_count: Math.max(2, profile.card_last4s.length),
        cross_merchant_count: profile.total_merchants_seen_at,
        confidence_grade: profile.identity_confidence_grade,
      },
    );
    globalClusters.push({
      id: clusterId,
      profile_id: profile.id,
      attribute_ids: [emailAttr, cardAttr],
      merchant_ids: profile.merchant_ids,
      audit_ids: [profile.last_audit_id].filter(Boolean),
      order_ids: [],
      confidence_grade: profile.identity_confidence_grade,
      first_seen_at: profile.first_seen,
      last_seen_at: profile.last_seen,
      updated_at: daysAgo(1),
    });
    globalClusterAttributes.push({ cluster_id: clusterId, attribute_id: emailAttr }, { cluster_id: clusterId, attribute_id: cardAttr });
    txs.filter((tx) => profile.emails.includes(tx.customer_email)).slice(0, 8).forEach((tx, i) => {
      globalAppearances.push({
        id: uuid(`global-appearance:${tx.id}:${i}`),
        attribute_id: i % 2 === 0 ? emailAttr : cardAttr,
        merchant_id: jobs.find((job) => job.id === tx.job_id).merchant_id,
        audit_id: tx.job_id,
        transaction_id: tx.id,
        order_id: tx.order_id,
        confidence_grade: profile.identity_confidence_grade,
        matched_signal_count: tx.signals_matched.length,
        appeared_at: tx.processed_at,
      });
    });
  }
  const uniqueGlobalAppearances = [...new Map(globalAppearances.map((row) => [row.id, row])).values()];

  const metricSnapshots = Array.from({ length: 45 }, (_, i) => ({
    id: uuid(`network-metrics:${i}`),
    snapshot_date: dateOnly(44 - i),
    total_identities: 3600 + i * 28 + Math.floor(rand() * 14),
    identities_at_2_merchants: 240 + i * 3 + Math.floor(rand() * 6),
    identities_at_3plus_merchants: 78 + i * 2 + Math.floor(rand() * 4),
    total_cross_merchant_matches_lifetime: 9200 + i * 44 + Math.floor(rand() * 24),
    audits_in_last_30d: 18 + Math.floor(i / 3),
    audits_with_cross_merchant_signal_30d: 9 + Math.floor(i / 5),
    active_merchants_30d: 7,
    uploads_in_last_30d: 21 + Math.floor(i / 2),
    network_inr_claim_rate: 0.045 + i * 0.0006,
    network_refund_rate: 0.071 + i * 0.0008,
    created_at: daysAgo(44 - i),
  }));

  const lookupCounts = Array.from({ length: 90 }, (_, i) => ({
    merchant_id: primaryMerchantId,
    lookup_date: dateOnly(89 - i),
    count: 12 + Math.floor(Math.sin(i / 6) * 5 + i / 4 + rand() * 8),
  }));

  const signalPerformance = signals.map((signal, i) => ({
    id: uuid(`signal-performance:${signal}`),
    signal_name: signal,
    true_positive_count: 120 + i * 19,
    false_positive_count: 8 + (i % 4) * 3,
    true_negative_count: 900 + i * 37,
    false_negative_count: 12 + (i % 5) * 2,
    precision_score: 0.78 + (i % 5) * 0.035,
    weight_adjustment: 0.92 + (i % 6) * 0.03,
    last_updated: daysAgo(1),
  }));

  console.log('[seed] Cleaning previous deterministic seed rows');
  await deleteIn('global_identity_appearances', 'id', uniqueGlobalAppearances.map((r) => r.id));
  await deleteIn('global_identity_cluster_attributes', 'cluster_id', globalClusters.map((r) => r.id));
  await deleteIn('global_identity_clusters', 'id', globalClusters.map((r) => r.id));
  await deleteIn('global_identity_attributes', 'id', globalAttributes.map((r) => r.id));
  await deleteIn('customer_activity_log', 'id', activity.map((r) => r.id));
  await deleteIn('evidence_packages', 'id', evidencePackages.map((r) => r.id));
  await deleteIn('watchlist_appearances', 'id', watchlistAppearances.map((r) => r.id));
  await deleteIn('watchlist_appearances', 'customer_profile_id', profiles.map((r) => r.id));
  await deleteIn('watchlist_entries', 'id', watchlistEntries.map((r) => r.id));
  await deleteIn('customer_profile_audit_appearances', 'id', appearances.map((r) => r.id));
  await deleteIn('audit_transactions', 'id', txs.map((r) => r.id));
  await deleteIn('customer_profiles', 'id', profiles.map((r) => r.id));
  await deleteIn('processing_jobs', 'id', jobs.map((r) => r.id));
  await deleteIn('network_metrics_snapshots', 'id', metricSnapshots.map((r) => r.id));
  await deleteIn('signal_performance', 'id', signalPerformance.map((r) => r.id));
  await supabase.from('lookup_daily_counts').delete().eq('merchant_id', primaryMerchantId);

  console.log('[seed] Writing jobs, profiles, transactions, graph, watchlist, and metrics');
  await chunked('processing_jobs', jobs);
  await chunked('customer_profiles', profiles);
  await chunked('audit_transactions', txs);
  await chunked('customer_profile_audit_appearances', appearances);
  await chunked('watchlist_entries', watchlistEntries);
  await chunked('watchlist_appearances', watchlistAppearances);
  await chunked('evidence_packages', evidencePackages);
  await chunked('customer_activity_log', activity);
  await chunked('global_identity_attributes', globalAttributes);
  await chunked('global_identity_clusters', globalClusters);
  await supabase.from('global_identity_cluster_attributes').insert(globalClusterAttributes);
  await chunked('global_identity_appearances', uniqueGlobalAppearances);
  await chunked('network_metrics_snapshots', metricSnapshots);
  await supabase.from('lookup_daily_counts').insert(lookupCounts);
  await chunked('signal_performance', signalPerformance);

  const summary = {
    login: 'demo@unauth.app',
    password: DEMO_PASSWORD,
    merchants: merchants.length,
    transactions: txs.length,
    profiles: profiles.length,
    watchlist_entries: watchlistEntries.filter((row) => !row.removed_by_merchant).length,
    evidence_packages: evidencePackages.length,
    confidence_breakdown: profiles.reduce((acc, profile) => {
      acc[profile.identity_confidence_grade] = (acc[profile.identity_confidence_grade] ?? 0) + 1;
      return acc;
    }, {}),
  };
  console.log('[seed] Complete', summary);
}

main().catch((error) => {
  console.error('[seed] Failed:', error);
  process.exit(1);
});
