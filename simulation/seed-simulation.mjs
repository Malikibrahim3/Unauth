import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const simDir = path.join(root, 'simulation');

function readEnv() {
  const envPath = path.join(root, '.env.local');
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
if (!url || !serviceKey) throw new Error('Missing Supabase env');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const email = 'simulation@unauth-test.com';
const password = 'SimTest2025!';
const storeName = 'Simulation Test Store';
const seedShopDomain = 'simulation-test-store.myshopify.com';
let supportsClaimOrderRef = true;

const now = new Date('2026-05-27T09:00:00.000Z');
const isoDaysAgo = (days, hour = 10) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

function money(v) {
  return Number(v.toFixed(2));
}

function riskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function confidenceGrade(label) {
  return label.toLowerCase();
}

function matchStatus(label) {
  const grade = confidenceGrade(label);
  return grade === 'possible' ? 'candidate' : grade === 'weak' ? 'none' : grade;
}

async function ensureUser() {
  let user = null;
  for (let page = 1; page < 20 && !user; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    user = data.users.find((u) => u.email?.toLowerCase() === email);
    if ((data.users ?? []).length < 1000) break;
  }

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        store_name: storeName,
        setup_complete: true,
        is_test_account: true,
        simulation: 'asos-fraud-ops',
      },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        store_name: storeName,
        setup_complete: true,
        is_test_account: true,
        simulation: 'asos-fraud-ops',
      },
    });
    if (error) throw error;
  }
  return user;
}

async function ensureMerchant(userId) {
  const { data, error } = await supabase
    .from('merchants')
    .upsert({
      user_id: userId,
      name: storeName,
      platform: 'shopify',
      monthly_order_volume: '50000+',
      primary_fraud_concern: 'refund_abuse',
      setup_complete: true,
    }, { onConflict: 'user_id' })
    .select('id,user_id,name')
    .single();
  if (error) throw error;
  return data;
}

async function ensureShopifyConnection(merchantId) {
  const shopProbe = await supabase.from('shopify_merchants').select('shop_domain').limit(1);
  if (shopProbe.error) return null;
  await supabase.from('shopify_merchants').upsert({
    shop_domain: seedShopDomain,
    access_token: 'simulation-service-only-placeholder',
  }, { onConflict: 'shop_domain' });
  await supabase.from('merchant_shopify_connections').upsert({
    merchant_id: merchantId,
    shop_domain: seedShopDomain,
    active: true,
  }, { onConflict: 'merchant_id' });
  return seedShopDomain;
}

async function ensureSeedJob(merchantId) {
  const filename = 'simulation_seed_orders.csv';
  const { data: existing, error: loadError } = await supabase
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('filename', filename)
    .maybeSingle();
  if (loadError) throw loadError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      merchant_id: merchantId,
      filename,
      status: 'completed',
      total_rows: 40,
      processed_rows: 40,
      flagged_count: 9,
      progress_pct: 100,
      progress_message: 'Simulation seed complete',
      upload_type: 'historical',
      hidden_by_merchant: false,
      completed_at: now.toISOString(),
      started_at: isoDaysAgo(1),
      label: 'ASOS fraud ops simulation seed',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

const customers = [
  {
    key: 'A',
    name: 'Grace Okafor',
    email: 'grace.okafor@example.co.uk',
    score: 12,
    confidence: 'Probable',
    orders: 8,
    claims: 0,
    chargebacks: 0,
    refundRate: 0,
    profileConfidence: 78,
    merchants: 1,
    watchlist: false,
    flags: [],
    address: '22 Maple Road, Bristol BS1 4QA',
  },
  {
    key: 'B',
    name: 'Daniel Ashworth',
    email: 'daniel.ashworth@example.co.uk',
    score: 46,
    confidence: 'Probable',
    orders: 12,
    claims: 3,
    chargebacks: 0,
    refundRate: 0.25,
    profileConfidence: 82,
    merchants: 1,
    watchlist: false,
    flags: ['high_returner_pattern'],
    address: '8 Station View, Leeds LS1 2AB',
  },
  {
    key: 'C',
    name: 'Priya Mehta',
    email: 'priya.mehta@example.co.uk',
    score: 84,
    confidence: 'Definite',
    orders: 6,
    claims: 4,
    chargebacks: 0,
    refundRate: 0.67,
    profileConfidence: 96,
    merchants: 2,
    watchlist: false,
    flags: ['rapid_claim_velocity', 'billing_address_clustering', 'postcode_matches_denied_customer', 'post_delivery_claim_rate_0_67'],
    address: '14 Falcon House, London E1 6AN',
  },
  {
    key: 'D',
    name: 'Tom Walsh',
    email: 'tom.walsh@example.co.uk',
    score: 28,
    confidence: 'Possible',
    orders: 1,
    claims: 0,
    chargebacks: 0,
    refundRate: 0,
    profileConfidence: 58,
    merchants: 1,
    watchlist: false,
    flags: ['new_account_21_days'],
    address: '5 Warren Close, Cardiff CF10 1AA',
  },
  {
    key: 'E',
    name: 'Reginald Osei',
    email: 'reginald.osei@example.co.uk',
    score: 97,
    confidence: 'Definite',
    orders: 9,
    claims: 5,
    chargebacks: 0,
    refundRate: 0.56,
    profileConfidence: 99,
    merchants: 3,
    watchlist: true,
    flags: ['watchlisted', 'cross_merchant_match', 'matched_on_2_other_merchant_datasets', 'repeat_denied_missing_parcel_claims'],
    address: '31 Canal Yard, Manchester M4 6EF',
  },
  {
    key: 'F',
    name: 'Michelle Chen',
    email: 'michelle.chen@example.co.uk',
    score: 76,
    confidence: 'Definite',
    orders: 4,
    claims: 2,
    chargebacks: 1,
    refundRate: 0.5,
    profileConfidence: 93,
    merchants: 1,
    watchlist: false,
    flags: ['chargeback_history', 'mismatched_delivery_names'],
    address: '19 Bridge Street, Birmingham B1 1AA',
  },
];

const orderRefs = {
  A: ['ORD-2025-00044','ORD-2025-00091','ORD-2025-00132','ORD-2025-00193','ORD-2025-00244','ORD-2025-00304','ORD-2025-00371','ORD-2025-00491'],
  B: ['ORD-2025-00028','ORD-2025-00062','ORD-2025-00094','ORD-2025-00111','ORD-2025-00178','ORD-2025-00220','ORD-2025-00291','ORD-2025-00334','ORD-2025-00376','ORD-2025-00404','ORD-2025-00459','ORD-2025-00488'],
  C: ['ORD-2025-00155','ORD-2025-00201','ORD-2025-00287','ORD-2025-00341','ORD-2025-00373','ORD-2025-00446'],
  D: ['ORD-2025-00501'],
  E: ['ORD-2025-00102','ORD-2025-00166','ORD-2025-00214','ORD-2025-00267','ORD-2025-00302','ORD-2025-00344','ORD-2025-00388','ORD-2025-00412','ORD-2025-00481'],
  F: ['ORD-2025-00283','ORD-2025-00399','ORD-2025-00431','ORD-2025-00477'],
};

const claimSeeds = [
  ['C', 'ORD-2025-00341', 'missing_parcel', 'open', null, null, 89.99, "I was at home all day on the delivery date and nothing arrived. The tracking shows it was delivered but my neighbours didn't receive it either and there was no safe place card.", ''],
  ['C', 'ORD-2025-00287', 'missing_parcel', 'under_review', null, null, 124.00, "I stayed in for the delivery window and nothing came. Tracking says delivered, but the concierge has no parcel and there is no delivery photograph.", 'Checked with Evri - GPS ping shows delivery 400m from address. Requesting photo proof of delivery.'],
  ['C', 'ORD-2025-00201', 'other', 'resolved', 'denied', 'suspected_fraud', 67.50, 'The item I received is completely different to what was shown on the product page. The colour is wrong and the sizing label has been removed.', 'Fourth claim in 90 days. Carrier GPS confirms delivery at door. No delivery exception logged. Previous claim denied same reason. Escalated to fraud team.'],
  ['C', 'ORD-2025-00155', 'missing_parcel', 'resolved', 'approved', 'customer_verified', 43.00, 'The tracking stopped updating after dispatch and the parcel never arrived at my building. I checked with reception twice.', 'Carrier confirmed parcel lost in depot. Replacement dispatched. Closed legitimate.'],
  ['E', 'ORD-2025-00412', 'missing_parcel', 'open', null, null, 156.00, "Tracking says delivered yesterday, but I didn't receive anything and no one in the building has it. Please refund this order.", ''],
  ['E', 'ORD-2025-00388', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 98.00, 'The courier says the parcel was delivered but there was nothing outside my flat and no card left.', 'Third repeat missing parcel claim. DPD proof of delivery shows named recipient at address. Denied as suspected fraud.'],
  ['E', 'ORD-2025-00302', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 212.00, 'I cannot find the parcel even though the tracking says it was left with my household.', 'Carrier photograph and GPS confirm delivery. Prior claim denied on same pattern. Denied and added to watchlist.'],
  ['B', 'ORD-2025-00178', 'missing_parcel', 'resolved', 'approved', 'customer_verified', 55.00, 'The parcel did not arrive and Royal Mail confirmed by phone that the item was misrouted after leaving the depot.', 'Carrier confirmed non-delivery. Customer provided photo of empty mailbox. Legitimate - reordered same day.'],
  ['F', 'ORD-2025-00399', 'missing_parcel', 'under_review', null, null, 178.00, 'The tracking says delivered but the parcel was not at the door when I returned home and the delivery name does not match mine.', 'Open chargeback is unresolved. DPD proof shows different recipient name; checking depot scan and delivery photo.'],
];

function claimReasonForOrder(customer, ref) {
  if (customer.key === 'C' && ['ORD-2025-00341','ORD-2025-00287','ORD-2025-00201','ORD-2025-00155'].includes(ref)) return true;
  if (customer.key === 'E' && ['ORD-2025-00412','ORD-2025-00388','ORD-2025-00302'].includes(ref)) return true;
  if (customer.key === 'B' && ref === 'ORD-2025-00178') return true;
  if (customer.key === 'F' && ref === 'ORD-2025-00399') return true;
  return false;
}

async function upsertProfile(merchantId, customer) {
  const { data: existing, error: findError } = await supabase
    .from('customer_profiles')
    .select('id,merchant_ids,emails')
    .eq('primary_email', customer.email)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const firstSeen = isoDaysAgo(customer.key === 'A' ? 425 : customer.key === 'D' ? 21 : customer.key === 'E' ? 310 : 240);
  const lastSeen = customer.key === 'E' ? isoDaysAgo(8) : customer.key === 'D' ? isoDaysAgo(21) : isoDaysAgo(3);
  const payload = {
    primary_email: customer.email,
    emails: [customer.email],
    names: [customer.name],
    addresses: [customer.address],
    ips: [`203.0.113.${customer.key.charCodeAt(0)}`],
    card_last4s: [`${4000 + customer.key.charCodeAt(0)}`.slice(-4)],
    phones: [],
    risk_score: customer.score,
    risk_level: riskLevel(customer.score),
    fraud_flags: customer.flags,
    total_orders: customer.orders,
    total_refund_claims: customer.claims,
    total_chargebacks: customer.chargebacks,
    total_merchants_seen_at: customer.merchants,
    refund_rate: customer.refundRate,
    refund_timestamps: [],
    fastest_claim_days: customer.claims > 0 ? (customer.key === 'E' ? 1 : customer.key === 'C' ? 2 : 5) : null,
    avg_claim_days: customer.claims > 0 ? (customer.key === 'E' ? 4 : customer.key === 'C' ? 7 : 12) : null,
    refund_acceleration_score: customer.key === 'E' ? 92 : customer.key === 'C' ? 76 : customer.key === 'B' ? 35 : 0,
    merchant_ids: Array.from(new Set([...(existing?.merchant_ids ?? []), merchantId])),
    first_seen: firstSeen,
    last_seen: lastSeen,
    profile_confidence: customer.profileConfidence,
    manually_reviewed: false,
    on_watchlist: customer.watchlist,
    merchant_notes: customer.key === 'D' ? 'New account, 21 days old.' : null,
    identity_confidence_grade: confidenceGrade(customer.confidence),
    identity_signals_summary: { confidence: customer.confidence, postDeliveryClaimRate: customer.refundRate },
    investigation_status: 'new',
  };

  if (existing) {
    const { data, error } = await supabase.from('customer_profiles').update(payload).eq('id', existing.id).select('id').single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase.from('customer_profiles').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
}

async function upsertTransaction(jobId, profileId, customer, ref, index) {
  const claimLike = claimReasonForOrder(customer, ref);
  const value = money(22 + ((index * 37 + customer.key.charCodeAt(0)) % 318));
  const days = customer.key === 'A' ? 420 - index * 55
    : customer.key === 'D' ? 21
      : customer.key === 'E' && ref === 'ORD-2025-00412' ? 8
        : 300 - index * 28;
  const tx = {
    job_id: jobId,
    order_id: ref,
    customer_email: customer.email,
    customer_name: customer.name,
    shipping_address: customer.address,
    billing_address: customer.key === 'C' ? '14 Falcon House, London E1 6AN' : customer.address,
    order_value: value,
    payment_method: 'card',
    card_last4: `${4000 + customer.key.charCodeAt(0)}`.slice(-4),
    device_ip: `203.0.113.${customer.key.charCodeAt(0)}`,
    account_created_at: customer.key === 'D' ? isoDaysAgo(21).slice(0, 10) : isoDaysAgo(500).slice(0, 10),
    previous_order_count: Math.max(0, index),
    delivery_status: index % 7 === 2 ? 'in_transit' : index % 11 === 3 ? 'cancelled' : 'delivered',
    refund_claimed: claimLike,
    refund_reason: claimLike ? 'missing_parcel' : null,
    chargeback_filed: customer.key === 'F' && ref === 'ORD-2025-00283',
    match_score: customer.score,
    identity_score: customer.score,
    identity_confidence_grade: confidenceGrade(customer.confidence),
    match_status: matchStatus(customer.confidence),
    fraud_flags: customer.flags,
    signals_matched: customer.flags,
    risk_level: riskLevel(customer.score),
    processed_at: isoDaysAgo(Math.max(1, days), 11 + (index % 6)),
    dismissed_by_merchant: customer.score < 35,
  };

  const { data, error } = await supabase
    .from('audit_transactions')
    .upsert(tx, { onConflict: 'job_id,order_id' })
    .select('id,order_id')
    .single();
  if (error) throw error;

  const { data: appearance } = await supabase
    .from('customer_profile_audit_appearances')
    .select('id')
    .eq('profile_id', profileId)
    .eq('audit_id', jobId)
    .eq('transaction_id', data.id)
    .maybeSingle();
  if (!appearance) {
    const { error: appError } = await supabase.from('customer_profile_audit_appearances').insert({
      profile_id: profileId,
      audit_id: jobId,
      transaction_id: data.id,
      score_at_time: customer.score,
      flags_at_time: customer.flags,
      appeared_at: tx.processed_at,
    });
    if (appError) throw appError;
  }

  return { id: data.id, order_ref: ref, order_value: value };
}

async function upsertClaim(merchantId, userId, profileId, seed) {
  const [key, orderRef, claimType, status, decision, outcome, amount, reason, notes] = seed;
  let findQuery = supabase
    .from('merchant_claims')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('customer_id', profileId)
    .eq('claim_type', claimType);
  findQuery = supportsClaimOrderRef ? findQuery.eq('order_ref', orderRef) : findQuery.eq('shopify_order_id', orderRef);
  const { data: existing, error: findError } = await findQuery.limit(1).maybeSingle();
  if (findError) throw findError;
  const submittedDays = status === 'open' && key === 'E' ? 1 : status === 'open' ? 3 : status === 'under_review' ? 5 : 30;
  const payload = {
    merchant_id: merchantId,
    shop_domain: supportsClaimOrderRef ? null : seedShopDomain,
    shopify_order_id: supportsClaimOrderRef ? null : orderRef,
    customer_id: profileId,
    claim_type: claimType,
    customer_claim_reason: reason,
    normalized_reason: notes || null,
    status,
    amount_at_risk: amount,
    currency: 'GBP',
    submitted_at: isoDaysAgo(submittedDays, 9),
    actor_user_id: userId,
    updated_at: isoDaysAgo(status === 'resolved' ? 10 : 1, 14),
  };
  if (supportsClaimOrderRef) {
    payload.order_source = 'csv';
    payload.order_ref = orderRef;
  }
  const query = existing
    ? supabase.from('merchant_claims').update(payload).eq('id', existing.id).select('id').single()
    : supabase.from('merchant_claims').insert(payload).select('id').single();
  const { data, error } = await query;
  if (error) throw error;

  if (decision && outcome) {
    const { data: existingOutcome } = await supabase
      .from('merchant_case_outcomes')
      .select('id')
      .eq('claim_id', data.id)
      .limit(1)
      .maybeSingle();
    const outcomePayload = {
      claim_id: data.id,
      shop_domain: supportsClaimOrderRef ? null : seedShopDomain,
      shopify_order_id: supportsClaimOrderRef ? null : orderRef,
      decision,
      outcome,
      notes,
      actor_user_id: userId,
      decided_at: isoDaysAgo(10, 15),
      updated_at: isoDaysAgo(10, 15),
    };
    const { error: outcomeError } = existingOutcome
      ? await supabase.from('merchant_case_outcomes').update(outcomePayload).eq('id', existingOutcome.id)
      : await supabase.from('merchant_case_outcomes').insert(outcomePayload);
    if (outcomeError) throw outcomeError;
  }

  if (status !== 'open') {
    const existingEvidence = await supabase
      .from('claim_evidence_items')
      .select('id')
      .eq('claim_id', data.id)
      .limit(1)
      .maybeSingle();
    if (!existingEvidence.data) {
      const carrier = orderRef.endsWith('7') ? 'Royal Mail tracking' : orderRef.endsWith('9') ? 'DPD proof of delivery' : 'Evri GPS data';
      const { error: evError } = await supabase.from('claim_evidence_items').insert({
        claim_id: data.id,
        evidence_type: 'tracking',
        evidence_url: `https://tracking.example-carrier.com/${orderRef}`,
        source: 'carrier',
        metadata: { carrier, order_ref: orderRef },
        actor_user_id: userId,
      });
      if (evError) throw evError;
    }
  }

  return data.id;
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeTestCsv() {
  const rows = [
    ['ORD-2025-00901','amelia.king@example.co.uk','Amelia King','2026-05-19','72.50','SW1A 1AA','delivered','false',''],
    ['ORD-2025-00902','priya.mehta@example.co.uk','Priya Mehta','2026-05-20','89.99','E1 6AN','delivered','true','Missing parcel after delivery scan'],
    ['ORD-2025-00903','oliver.brown@example.co.uk','Oliver Brown','2026-05-18','34.00','M4 6EF','delivered','false',''],
    ['ORD-2025-00904','sophie.evans@example.co.uk','Sophie Evans','2026-05-17','124.00','BS1 4QA','in_transit','false',''],
    ['ORD-2025-00905','liam.wilson@example.co.uk','Liam Wilson','2026-05-16','212.40','LS1 2AB','delivered','true','Item not received'],
    ['ORD-2025-00906','priya.mehta@example.co.uk','Priya Mehta','2026-05-15','67.50','E1 6AN','delivered','false',''],
    ['ORD-2025-00907','hannah.scott@example.co.uk','Hannah Scott','2026-05-14','45.20','CF10 1AA','cancelled','false',''],
    ['ORD-2025-00908','noah.patel@example.co.uk','Noah Patel','2026-05-13','338.00','B1 1AA','delivered','false',''],
    ['ORD-2025-00909','ava.roberts@example.co.uk','Ava Roberts','2026-05-12','58.00','N1 9GU','delivered','true','Damaged parcel on arrival'],
    ['ORD-2025-00910','george.hughes@example.co.uk','George Hughes','2026-05-11','92.15','SE1 7PB','delivered','false',''],
    ['ORD-2025-00911','isla.morgan@example.co.uk','Isla Morgan','2026-05-10','22.99','EH1 1YZ','in_transit','false',''],
    ['ORD-2025-00912','jacob.green@example.co.uk','Jacob Green','2026-05-09','144.00','G1 1AA','delivered','false',''],
    ['ORD-2025-00913','ruby.clarke@example.co.uk','Ruby Clarke','2026-05-08','75.75','L1 8JQ','delivered','false',''],
    ['ORD-2025-00914','ethan.lewis@example.co.uk','Ethan Lewis','2026-05-07','19.99','NE1 4LP','cancelled','false',''],
    ['ORD-2025-00915','mia.walker@example.co.uk','Mia Walker','2026-05-06','310.00','OX1 1PT','delivered','false',''],
    ['ORD-2025-00916','archie.hall@example.co.uk','Archie Hall','2026-05-05','48.50','YO1 7PR','delivered','false',''],
    ['ORD-2025-00917','ella.allen@example.co.uk','Ella Allen','2026-05-04','86.20','CB2 1TN','delivered','false',''],
    ['ORD-2025-00918','freddie.young@example.co.uk','Freddie Young','2026-05-03','129.99','BN1 1AA','in_transit','false',''],
    ['ORD-2025-00919','charlotte.wright@example.co.uk','Charlotte Wright','2026-05-02','39.95','W1A 1HQ','delivered','false',''],
    ['ORD-2025-00920','oscar.harris@example.co.uk','Oscar Harris','2026-05-01','266.00','M20 2LT','delivered','false',''],
  ];
  const header = 'order_id,customer_email,customer_name,order_date,order_value,delivery_postcode,order_status,refund_requested,refund_reason';
  fs.writeFileSync(path.join(simDir, 'test_orders.csv'), [header, ...rows.map((r) => r.map(csvEscape).join(','))].join('\n'));
}

async function main() {
  fs.mkdirSync(path.join(simDir, 'screenshots'), { recursive: true });
  const orderRefProbe = await supabase.from('merchant_claims').select('order_ref,order_source').limit(1);
  supportsClaimOrderRef = !orderRefProbe.error;
  const user = await ensureUser();
  const merchant = await ensureMerchant(user.id);
  await ensureShopifyConnection(merchant.id);
  const jobId = await ensureSeedJob(merchant.id);

  const log = {
    generated_at: new Date().toISOString(),
    account: { email, user_id: user.id, merchant_id: merchant.id, store_name: merchant.name },
    processing_job_id: jobId,
    schema_capabilities: { merchant_claims_order_ref: supportsClaimOrderRef },
    customers: {},
    transactions: {},
    claims: {},
    watchlist_entries: [],
  };

  const profileIds = {};
  for (const customer of customers) {
    const profileId = await upsertProfile(merchant.id, customer);
    profileIds[customer.key] = profileId;
    log.customers[customer.key] = { id: profileId, name: customer.name, email: customer.email };
    log.transactions[customer.key] = [];
    for (const [index, ref] of orderRefs[customer.key].entries()) {
      log.transactions[customer.key].push(await upsertTransaction(jobId, profileId, customer, ref, index));
    }

    await supabase.from('customer_profile_identities').upsert({
      customer_profile_id: profileId,
      merchant_id: merchant.id,
      identity_type: 'email',
      identity_value: customer.email,
      source: 'csv',
    }, { onConflict: 'merchant_id,identity_type,identity_value' });

    if (customer.watchlist) {
      const { data, error } = await supabase.from('watchlist_entries').upsert({
        merchant_id: user.id,
        customer_profile_id: profileId,
        display_name: customer.name,
        display_email: customer.email,
        last_seen_risk: riskLevel(customer.score),
        last_seen_at: isoDaysAgo(8),
      }, { onConflict: 'merchant_id,customer_profile_id' }).select('id').single();
      if (error) throw error;
      log.watchlist_entries.push(data.id);
    }
  }

  for (const seed of claimSeeds) {
    const key = seed[0];
    const id = await upsertClaim(merchant.id, user.id, profileIds[key], seed);
    log.claims[`${key}-${seed[1]}`] = id;
  }

  writeTestCsv();
  fs.writeFileSync(path.join(simDir, 'seed_log.json'), JSON.stringify(log, null, 2));
  if (!fs.existsSync(path.join(simDir, 'issues.json'))) fs.writeFileSync(path.join(simDir, 'issues.json'), '[]\n');
  if (!fs.existsSync(path.join(simDir, 'fix_log.md'))) fs.writeFileSync(path.join(simDir, 'fix_log.md'), '# Fix Log\n');
  console.log(JSON.stringify({ ok: true, merchant_id: merchant.id, user_id: user.id, customers: Object.keys(log.customers).length, claims: Object.keys(log.claims).length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
