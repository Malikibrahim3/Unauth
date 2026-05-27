import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const auditDir = path.join(root, 'design-audit');
const screenshotsDir = path.join(auditDir, 'screenshots');

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
fs.mkdirSync(screenshotsDir, { recursive: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const accountEmail = 'simulation@unauth-test.com';
const accountPassword = 'SimTest2025!';
const storeName = 'Aurora Outfitters UK';
const shopDomain = 'aurora-outfitters.myshopify.com';
const now = new Date('2026-05-27T12:00:00.000Z');

const profiles = [
  {
    key: 'low-1',
    segment: 'low-risk normal',
    name: 'Amelia King',
    email: 'amelia.king.audit@example.test',
    phone: '+447700900101',
    address: '41 Wycliffe Road, London SW11 5QR',
    risk: 8,
    confidence: 'weak',
    orders: 18,
    refunds: 0,
    claims: 0,
    chargebacks: 0,
    ltv: 1842.4,
    merchants: 1,
    flags: [],
    status: 'cleared',
    note: 'Long-tenured customer with clean fulfilment and no refund abuse indicators.',
  },
  {
    key: 'low-2',
    segment: 'low-risk normal',
    name: 'Noah Patel',
    email: 'noah.patel.audit@example.test',
    phone: '+447700900102',
    address: '18 York Place, Bristol BS8 1AH',
    risk: 14,
    confidence: 'weak',
    orders: 11,
    refunds: 1,
    claims: 0,
    chargebacks: 0,
    ltv: 936.8,
    merchants: 1,
    flags: ['single_carrier_lost_parcel_confirmed'],
    status: 'cleared',
    note: 'One carrier-confirmed refund, otherwise consistent purchase and delivery history.',
  },
  {
    key: 'low-3',
    segment: 'low-risk normal',
    name: 'Hannah Scott',
    email: 'hannah.scott.audit@example.test',
    phone: '+447700900103',
    address: '9 Elm Grove, Leeds LS6 1AN',
    risk: 19,
    confidence: 'weak',
    orders: 7,
    refunds: 0,
    claims: 1,
    chargebacks: 0,
    ltv: 512.35,
    merchants: 1,
    flags: ['late_dispatch_complaint_only'],
    status: 'resolved',
    note: 'Support-safe customer. Evidence indicates operational delay rather than abuse.',
  },
  {
    key: 'returns-1',
    segment: 'high-return legitimate',
    name: 'Sophie Evans',
    email: 'sophie.evans.audit@example.test',
    phone: '+447700900104',
    address: '27 Castle Street, Cardiff CF10 1BT',
    risk: 36,
    confidence: 'possible',
    orders: 24,
    refunds: 8,
    claims: 3,
    chargebacks: 0,
    ltv: 2780.1,
    merchants: 1,
    flags: ['high_return_rate', 'consistent_return_labels', 'warehouse_scans_match'],
    status: 'under_review',
    note: 'Frequent returns but all labels and warehouse scans reconcile. Preserve customer-safe tone.',
  },
  {
    key: 'returns-2',
    segment: 'high-return legitimate',
    name: 'Marcus Bennett',
    email: 'marcus.bennett.audit@example.test',
    phone: '+447700900105',
    address: '12 Merchant Lane, Manchester M2 4WG',
    risk: 42,
    confidence: 'possible',
    orders: 16,
    refunds: 5,
    claims: 2,
    chargebacks: 0,
    ltv: 1604.55,
    merchants: 1,
    flags: ['size_exchange_pattern', 'refunds_after_return_scan'],
    status: 'contacted',
    note: 'High return volume driven by size exchanges; no non-receipt pattern.',
  },
  {
    key: 'returns-3',
    segment: 'high-return legitimate',
    name: 'Isla Morgan',
    email: 'isla.morgan.audit@example.test',
    phone: '+447700900106',
    address: '6 Queen Street, Edinburgh EH2 1JE',
    risk: 48,
    confidence: 'possible',
    orders: 19,
    refunds: 7,
    claims: 2,
    chargebacks: 0,
    ltv: 2321.75,
    merchants: 1,
    flags: ['seasonal_return_spike', 'loyalty_member', 'proof_of_return_present'],
    status: 'under_review',
    note: 'VIP customer with elevated returns; reviewer should separate policy abuse from legitimate fit returns.',
  },
  {
    key: 'suspicious-1',
    segment: 'suspicious missing parcel/refund abuse',
    name: 'Priya Mehta',
    email: 'priya.mehta.audit@example.test',
    phone: '+447700900107',
    address: '14 Falcon House, London E1 6AN',
    risk: 84,
    confidence: 'definite',
    orders: 9,
    refunds: 6,
    claims: 5,
    chargebacks: 0,
    ltv: 988.6,
    merchants: 2,
    flags: ['rapid_claim_velocity', 'post_delivery_claim_rate_0_67', 'gps_mismatch', 'address_cluster_match'],
    status: 'under_review',
    note: 'Repeat delivered-but-missing claims. Two proof-of-delivery mismatches need manager review.',
  },
  {
    key: 'suspicious-2',
    segment: 'suspicious missing parcel/refund abuse',
    name: 'Owen Clarke',
    email: 'owen.clarke.audit@example.test',
    phone: '+447700900108',
    address: '89 Canal Yard, Birmingham B1 1AA',
    risk: 79,
    confidence: 'probable',
    orders: 8,
    refunds: 4,
    claims: 4,
    chargebacks: 1,
    ltv: 1218.2,
    merchants: 2,
    flags: ['chargeback_after_denial', 'duplicate_missing_parcel_claim', 'carrier_photo_disputed'],
    status: 'under_review',
    note: 'Duplicate-prevention scenario: same order has a resolved claim and reopened customer contact.',
  },
  {
    key: 'suspicious-3',
    segment: 'suspicious missing parcel/refund abuse',
    name: 'Ruby Clarke',
    email: 'ruby.clarke.audit@example.test',
    phone: '+447700900109',
    address: '2 Grafton Mews, Liverpool L1 8JQ',
    risk: 72,
    confidence: 'probable',
    orders: 6,
    refunds: 3,
    claims: 3,
    chargebacks: 0,
    ltv: 694.9,
    merchants: 1,
    flags: ['refund_reason_reuse', 'late_night_claim_submission', 'delivery_photo_available'],
    status: 'new',
    note: 'Pattern is suspicious but customer value is moderate; use evidence-led response.',
  },
  {
    key: 'critical-1',
    segment: 'critical/watchlisted',
    name: 'Reginald Osei',
    email: 'reginald.osei.audit@example.test',
    phone: '+447700900110',
    address: '31 Canal Yard, Manchester M4 6EF',
    risk: 97,
    confidence: 'definite',
    orders: 12,
    refunds: 8,
    claims: 7,
    chargebacks: 1,
    ltv: 2104.8,
    merchants: 4,
    flags: ['watchlisted', 'cross_merchant_match', 'repeat_denied_missing_parcel_claims', 'payment_fingerprint_match'],
    status: 'under_review',
    watchlist: true,
    note: 'Critical watchlist identity. Strong cross-merchant link and repeated denied INR claims.',
  },
  {
    key: 'critical-2',
    segment: 'critical/watchlisted',
    name: 'Lara Hughes',
    email: 'lara.hughes.audit@example.test',
    phone: '+447700900111',
    address: '77 Dock Road, London E16 2QU',
    risk: 91,
    confidence: 'definite',
    orders: 10,
    refunds: 6,
    claims: 6,
    chargebacks: 2,
    ltv: 1490.0,
    merchants: 3,
    flags: ['watchlisted', 'denial_then_chargeback', 'shared_address_with_denied_identity', 'device_ip_reuse'],
    status: 'under_review',
    watchlist: true,
    note: 'Watchlisted after reversal. Requires careful manager-visible audit trail.',
  },
  {
    key: 'new-1',
    segment: 'new account limited history',
    name: 'Ethan Lewis',
    email: 'ethan.lewis.audit@example.test',
    phone: '+447700900112',
    address: '5 Market Street, Newcastle NE1 6QE',
    risk: 31,
    confidence: 'possible',
    orders: 1,
    refunds: 0,
    claims: 1,
    chargebacks: 0,
    ltv: 126.5,
    merchants: 1,
    flags: ['new_account_9_days', 'first_order_missing_parcel_claim'],
    status: 'new',
    note: 'New account with limited history. Avoid overconfident fraud language.',
  },
];

const claims = [
  ['suspicious-1', 'AU-1007-004', 'missing_parcel', 'open', null, null, 149.9, 5, 'Customer says tracking shows delivered but concierge has no parcel.', 'Fresh high-risk INR claim; duplicate signals from prior orders.'],
  ['suspicious-1', 'AU-1007-003', 'missing_parcel', 'under_review', null, null, 212.4, 2.3, 'Nothing arrived despite delivery scan.', 'Approaching SLA. GPS ping appears 400m from address; carrier photo requested.'],
  ['suspicious-1', 'AU-1007-002', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 87.5, 14, 'Parcel not received.', 'Denied after proof-of-delivery matched door and recipient name.'],
  ['suspicious-1', 'AU-1007-001', 'wrong_item', 'resolved', 'approved', 'legitimate', 44.0, 26, 'Received wrong colour and size.', 'Warehouse confirmed pick error; approved full refund.'],
  ['suspicious-2', 'AU-1008-004', 'missing_parcel', 'escalated', null, null, 188.0, 5.2, 'Second request for same order after prior denial.', 'Duplicate-prevention scenario: resolved claim exists for same order.'],
  ['suspicious-2', 'AU-1008-004', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 188.0, 16, 'Original missing parcel claim.', 'Denied with carrier photo and depot scan. Customer reopened via support.'],
  ['suspicious-2', 'AU-1008-002', 'chargeback', 'pending', 'chargeback_disputed', 'pending', 254.3, 1.9, 'Issuer chargeback after refund denial.', 'Awaiting acquirer response. Evidence package generated.'],
  ['suspicious-3', 'AU-1009-003', 'refund_request', 'open', null, null, 73.0, 4, 'Item damaged and wants refund without return.', 'Photo EXIF mismatch; ask for return label scan.'],
  ['suspicious-3', 'AU-1009-002', 'missing_parcel', 'under_review', null, null, 118.5, 3, 'Delivery photo shows neighbour door.', 'Support-safe response needed while carrier confirms GPS.'],
  ['critical-1', 'AU-1010-006', 'missing_parcel', 'open', null, null, 315.6, 6, 'High-value parcel marked delivered, customer requests refund.', 'Overdue and critical watchlist. Manager action required.'],
  ['critical-1', 'AU-1010-005', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 219.0, 18, 'No parcel received.', 'Denied based on repeated pattern and named recipient POD.'],
  ['critical-1', 'AU-1010-004', 'return_abuse', 'resolved', 'partial_refund', 'recovered', 142.8, 9, 'Returned one item from three-item bundle.', 'Partial refund after warehouse scan showed one item missing.'],
  ['critical-2', 'AU-1011-005', 'chargeback', 'evidence_requested', 'escalated', 'pending', 199.99, 2.1, 'Chargeback after denial.', 'Evidence requested from payment processor.'],
  ['critical-2', 'AU-1011-004', 'missing_parcel', 'resolved', 'denied', 'suspected_fraud', 165.2, 21, 'Claims courier never attended.', 'Decision reversed once then denied after depot scan arrived.'],
  ['critical-2', 'AU-1011-003', 'missing_parcel', 'resolved', 'full_refund', 'legitimate', 58.0, 29, 'Carrier lost parcel before delivery.', 'Carrier admitted depot loss; full refund customer-safe.'],
  ['returns-1', 'AU-1004-006', 'refund_request', 'pending', null, null, 88.2, 1.2, 'Size exchange return not yet scanned.', 'Legitimate high-return customer; awaiting warehouse scan.'],
  ['returns-1', 'AU-1004-003', 'refund_request', 'resolved', 'approved', 'legitimate', 64.5, 12, 'Returned with label.', 'Approved after return scan and item condition check.'],
  ['returns-2', 'AU-1005-004', 'damaged', 'resolved', 'full_refund', 'legitimate', 51.2, 7, 'Damaged parcel on arrival.', 'Photo and carrier exception confirm damage.'],
  ['returns-3', 'AU-1006-005', 'refund_request', 'under_review', null, null, 132.75, 2.5, 'Multiple sizes returned.', 'Review for policy threshold but evidence suggests normal sizing behaviour.'],
  ['low-3', 'AU-1003-002', 'missing_parcel', 'resolved', 'approved', 'legitimate', 39.95, 10, 'Late dispatch, parcel lost.', 'Carrier confirmed loss and replacement shipped.'],
  ['new-1', 'AU-1012-001', 'missing_parcel', 'open', null, null, 126.5, 0.6, 'First order has not arrived.', 'New account. Use neutral evidence request rather than fraud language.'],
  ['low-2', 'AU-1002-005', 'missing_parcel', 'closed', 'approved', 'customer_verified', 72.4, 23, 'Carrier confirmed misroute.', 'Closed as customer-safe response.'],
];

function daysAgo(days, hour = 10) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - Math.floor(days));
  const fractionalHours = (days - Math.floor(days)) * 24;
  d.setUTCHours(hour - Math.floor(fractionalHours), 0, 0, 0);
  return d.toISOString();
}

function money(value) {
  return Number(value.toFixed(2));
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

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function ensureUser() {
  let user = null;
  for (let page = 1; page <= 20 && !user; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    user = data.users.find((u) => u.email?.toLowerCase() === accountEmail);
    if ((data.users ?? []).length < 1000) break;
  }

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: accountEmail,
      password: accountPassword,
      email_confirm: true,
      user_metadata: {
        store_name: storeName,
        setup_complete: true,
        is_test_account: true,
        design_audit_seed: true,
      },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    return data.user;
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: accountPassword,
    email_confirm: true,
    user_metadata: {
      ...(user.user_metadata ?? {}),
      store_name: storeName,
      setup_complete: true,
      is_test_account: true,
      design_audit_seed: true,
    },
  });
  if (error) throw error;
  return user;
}

async function ensureMerchant(userId) {
  const { data, error } = await supabase
    .from('merchants')
    .upsert({
      user_id: userId,
      name: storeName,
      platform: 'shopify',
      monthly_order_volume: 'over_250k',
      primary_fraud_concern: 'inr_claims',
      setup_complete: true,
      is_demo: false,
    }, { onConflict: 'user_id' })
    .select('id,user_id,name')
    .single();
  if (error) throw error;
  return data;
}

async function ensureShopify(merchantId) {
  const { error: shopError } = await supabase
    .from('shopify_merchants')
    .upsert({
      shop_domain: shopDomain,
      access_token: 'design-audit-service-only-placeholder',
      updated_at: now.toISOString(),
    }, { onConflict: 'shop_domain' });
  if (shopError) throw shopError;

  const { error } = await supabase
    .from('merchant_shopify_connections')
    .upsert({
      merchant_id: merchantId,
      shop_domain: shopDomain,
      active: true,
      updated_at: now.toISOString(),
      uninstalled_at: null,
    }, { onConflict: 'merchant_id' });
  if (error) throw error;
}

async function ensureJob(merchantId, index) {
  const filename = `aurora-outfitters-risk-audit-${String(index + 1).padStart(2, '0')}.csv`;
  const createdAt = daysAgo(35 - index * 7, 9);
  const totalRows = [18840, 21390, 19760, 22610, 23980][index];
  const flaggedCount = [362, 421, 388, 512, 496][index];
  const payload = {
    merchant_id: merchantId,
    filename,
    status: 'completed',
    total_rows: totalRows,
    processed_rows: totalRows,
    failed_rows: index === 2 ? 3 : 0,
    flagged_count: flaggedCount,
    progress_pct: 100,
    progress_message: 'Complete',
    upload_type: index === 4 ? 'standard' : 'historical',
    hidden_by_merchant: false,
    completed_at: daysAgo(34 - index * 7, 11),
    started_at: daysAgo(35 - index * 7, 8),
    created_at: createdAt,
    updated_at: daysAgo(34 - index * 7, 11),
    label: `Aurora Outfitters weekly fraud audit ${index + 1}`,
    has_ground_truth: true,
    is_demo: false,
    data_quality: {
      source: 'shopify',
      rows_with_email: 0.98,
      rows_with_card: 0.88,
      rows_with_tracking: 0.93,
    },
    watchlist_sync_status: 'synced',
  };

  const { data: existing, error: findError } = await supabase
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('filename', filename)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from('processing_jobs')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from('processing_jobs')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureProfile(merchantId, userId, profile) {
  const nowIso = now.toISOString();
  const firstSeenDays = profile.key === 'new-1' ? 9 : profile.key.startsWith('low') ? 420 : profile.watchlist ? 310 : 180;
  const lastSeenDays = profile.key === 'new-1' ? 1 : profile.watchlist ? 0.5 : profile.risk >= 70 ? 1.5 : 3;
  const card = String(4200 + profiles.findIndex((p) => p.key === profile.key) * 37).slice(-4);
  const ip = `198.51.100.${30 + profiles.findIndex((p) => p.key === profile.key)}`;
  const payload = {
    primary_email: profile.email,
    emails: [profile.email],
    ips: [ip],
    addresses: [profile.address],
    card_last4s: [card],
    phones: [profile.phone],
    names: [profile.name],
    risk_score: profile.risk,
    risk_level: riskLevel(profile.risk),
    fraud_flags: profile.flags,
    total_orders: profile.orders,
    total_refund_claims: profile.claims,
    total_chargebacks: profile.chargebacks,
    total_merchants_seen_at: profile.merchants,
    refund_rate: profile.orders > 0 ? money(profile.refunds / profile.orders) : 0,
    refund_timestamps: Array.from({ length: profile.refunds }, (_, i) => daysAgo(90 - i * 9, 12)),
    fastest_claim_days: profile.claims > 0 ? (profile.key === 'new-1' ? 1 : profile.risk >= 90 ? 1 : profile.risk >= 70 ? 2 : 8) : null,
    avg_claim_days: profile.claims > 0 ? (profile.risk >= 90 ? 3 : profile.risk >= 70 ? 5 : 14) : null,
    refund_acceleration_score: profile.risk >= 90 ? 94 : profile.risk >= 70 ? 76 : profile.refunds >= 5 ? 38 : 4,
    merchant_ids: [merchantId, userId],
    first_seen: daysAgo(firstSeenDays, 9),
    last_seen: daysAgo(lastSeenDays, 12),
    profile_confidence: Math.max(50, Math.min(99, profile.risk + (profile.confidence === 'definite' ? 2 : 8))),
    manually_reviewed: ['returns-1', 'suspicious-1', 'critical-1', 'critical-2'].includes(profile.key),
    merchant_notes: profile.note,
    on_watchlist: !!profile.watchlist,
    investigation_status: profile.status,
    identity_confidence_grade: profile.confidence,
    identity_signals_summary: {
      segment: profile.segment,
      ltv: profile.ltv,
      confidence: profile.confidence,
      top_flags: profile.flags.slice(0, 4),
    },
  };

  const { data: existing, error: findError } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('primary_email', profile.email)
    .maybeSingle();
  if (findError) throw findError;

  const { data, error } = existing
    ? await supabase.from('customer_profiles').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('customer_profiles').insert(payload).select('id').single();
  if (error) throw error;

  const identityRows = [
    ['email', profile.email],
    ['phone', profile.phone],
    ['address_hash', sha(profile.address).slice(0, 24)],
    ['shopify_customer_id', `CUST-${profile.key.toUpperCase()}`],
  ].map(([identity_type, identity_value]) => ({
    customer_profile_id: data.id,
    merchant_id: merchantId,
    shop_domain: shopDomain,
    identity_type,
    identity_value,
    source: 'design_audit_seed',
    updated_at: nowIso,
  }));
  const { error: identityError } = await supabase
    .from('customer_profile_identities')
    .upsert(identityRows, { onConflict: 'merchant_id,identity_type,identity_value' });
  if (identityError) throw identityError;

  return { id: data.id, card, ip };
}

async function ensureTransaction({ jobId, profileId, profile, orderNo, orderIndex, runIndex, card, ip }) {
  const orderId = `AU-${orderNo}-${String(orderIndex + 1).padStart(3, '0')}`;
  const processedAt = daysAgo(42 - runIndex * 7 - orderIndex, 10 + (orderIndex % 5));
  const orderValue = money(42 + ((orderIndex + 3) * 31 + profile.risk * 1.7) % 360);
  const hasClaim = claims.some(([key, claimOrder]) => key === profile.key && claimOrder === orderId);
  const chargeback = profile.chargebacks > 0 && orderIndex % 5 === 1;
  const tx = {
    job_id: jobId,
    order_id: orderId,
    customer_email: profile.email,
    customer_name: profile.name,
    shipping_address: profile.address,
    billing_address: profile.key === 'suspicious-1' ? '14 Falcon House, London E1 6AN' : profile.address,
    order_value: orderValue,
    payment_method: orderIndex % 3 === 0 ? 'shop_pay' : orderIndex % 3 === 1 ? 'card' : 'paypal',
    card_last4: card,
    device_ip: ip,
    account_created_at: profile.key === 'new-1' ? daysAgo(9).slice(0, 10) : daysAgo(520 - orderIndex).slice(0, 10),
    previous_order_count: Math.max(0, orderIndex),
    delivery_status: hasClaim ? 'delivered' : orderIndex % 9 === 0 ? 'in_transit' : 'delivered',
    refund_claimed: hasClaim || orderIndex < profile.refunds,
    refund_reason: hasClaim ? 'missing_parcel' : orderIndex < profile.refunds ? 'return_refund' : null,
    chargeback_filed: chargeback,
    match_score: profile.risk,
    identity_score: profile.risk,
    identity_confidence_grade: profile.confidence,
    match_status: matchStatus(profile.confidence),
    fraud_flags: profile.flags,
    signals_matched: profile.flags,
    behavioural_flags: profile.flags.filter((flag) => /refund|claim|chargeback|velocity|return/.test(flag)),
    recommended_action: profile.risk >= 90
      ? 'Escalate before refund and assemble evidence'
      : profile.risk >= 70
        ? 'Review proof of delivery before refund'
        : profile.refunds >= 5
          ? 'Check return scan before approving'
          : 'No fraud action needed',
    ce3_eligible: profile.risk >= 85,
    ce3_qualifying_transactions: [],
    risk_level: riskLevel(profile.risk),
    processed_at: processedAt,
    dismissed_by_merchant: profile.risk < 30,
    identity_evidence: {
      grade: profile.confidence,
      segment: profile.segment,
      merchants: profile.merchants,
    },
    matched_datapoints: ['email', 'address', 'card_last4'],
    changed_datapoints: profile.risk >= 70 ? ['address', 'device_ip'] : [],
    evidence_summary: `${profile.flags.length} fraud-ops signal(s) matched for ${profile.segment}.`,
    context_flags: { design_audit_seed: true, shopify_connected: true },
    context_summary: `${profile.orders} order history with ${profile.claims} claim(s).`,
  };

  const { data, error } = await supabase
    .from('audit_transactions')
    .upsert(tx, { onConflict: 'job_id,order_id' })
    .select('id,order_id,order_value')
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
    const { error: appearanceError } = await supabase.from('customer_profile_audit_appearances').insert({
      profile_id: profileId,
      audit_id: jobId,
      transaction_id: data.id,
      score_at_time: profile.risk,
      flags_at_time: profile.flags,
      appeared_at: processedAt,
    });
    if (appearanceError) throw appearanceError;
  }

  const shopifyOrderId = String(8800000000000 + orderNo * 100 + orderIndex);
  const orderNumber = orderId.replace('AU-', '');
  const commonIdentity = {
    shop_domain: shopDomain,
    source: 'order',
    source_id: shopifyOrderId,
    email: profile.email,
    phone: profile.phone,
    shipping_address: profile.address,
    billing_address: tx.billing_address,
    customer_id: `CUST-${profile.key.toUpperCase()}`,
    updated_at: now.toISOString(),
  };
  const { error: merchantIdentityError } = await supabase
    .from('merchant_identities')
    .upsert(commonIdentity, { onConflict: 'shop_domain,source,source_id' });
  if (merchantIdentityError) throw merchantIdentityError;

  const { error: shopifyOrderError } = await supabase
    .from('shopify_order_signals')
    .upsert({
      shop_domain: shopDomain,
      shopify_order_id: shopifyOrderId,
      order_number: orderNumber,
      customer_id: `CUST-${profile.key.toUpperCase()}`,
      created_at_shopify: processedAt,
      total_price: orderValue,
      currency: 'GBP',
      financial_status: 'paid',
      fulfillment_status: tx.delivery_status === 'delivered' ? 'fulfilled' : tx.delivery_status,
      refunds_count: tx.refund_claimed ? 1 : 0,
      discount_codes: orderIndex % 4 === 0 ? ['VIP10'] : [],
      payment_gateway_names: [tx.payment_method],
      shipping_country: 'GB',
      billing_country: 'GB',
      line_items_count: 1 + (orderIndex % 4),
      shipping_price: 3.99,
      source_name: 'shopify',
      tags: profile.risk >= 90 ? ['watchlist', 'risk-review'] : [],
      risk_recommendation: profile.risk >= 70 ? 'investigate' : 'accept',
      risk_level: riskLevel(profile.risk),
      raw_payload_hash: sha(`${shopifyOrderId}:${profile.email}:${orderValue}`),
      updated_at: now.toISOString(),
    }, { onConflict: 'shop_domain,shopify_order_id' });
  if (shopifyOrderError) throw shopifyOrderError;

  await supabase.from('customer_profile_identities').upsert({
    customer_profile_id: profileId,
    merchant_id: profile.merchantId,
    shop_domain: shopDomain,
    identity_type: 'shopify_order_id',
    identity_value: shopifyOrderId,
    source: 'shopify',
    updated_at: now.toISOString(),
  }, { onConflict: 'merchant_id,identity_type,identity_value' });

  return { txId: data.id, orderId, shopifyOrderId, orderValue };
}

async function ensureClaim({ merchantId, userId, profileId, claimSeed }) {
  const [profileKey, orderRef, claimType, status, decision, outcome, amount, ageDays, reason, notes] = claimSeed;
  const submittedAt = daysAgo(ageDays, 10);
  const payload = {
    merchant_id: merchantId,
    shop_domain: shopDomain,
    shopify_order_id: orderRef,
    customer_id: profileId,
    claim_type: claimType,
    customer_claim_reason: reason,
    normalized_reason: notes,
    status,
    amount_at_risk: amount,
    currency: 'GBP',
    submitted_at: submittedAt,
    actor_user_id: userId,
    created_at: submittedAt,
    updated_at: status === 'resolved' || status === 'closed' ? daysAgo(Math.max(1, ageDays - 2), 15) : daysAgo(0.3, 15),
  };

  const { data: existing, error: findError } = await supabase
    .from('merchant_claims')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('customer_id', profileId)
    .eq('shopify_order_id', orderRef)
    .eq('claim_type', claimType)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const { data, error } = existing
    ? await supabase.from('merchant_claims').update(payload).eq('id', existing.id).select('id,status').single()
    : await supabase.from('merchant_claims').insert(payload).select('id,status').single();
  if (error) throw error;

  if (decision && outcome) {
    const { data: existingOutcome } = await supabase
      .from('merchant_case_outcomes')
      .select('id')
      .eq('claim_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const outcomePayload = {
      claim_id: data.id,
      shop_domain: shopDomain,
      shopify_order_id: orderRef,
      decision,
      outcome,
      amount_refunded: ['approved', 'full_refund'].includes(decision) ? amount : decision === 'partial_refund' ? money(amount * 0.45) : null,
      amount_recovered: ['denied', 'chargeback_disputed'].includes(decision) ? amount : decision === 'partial_refund' ? money(amount * 0.55) : null,
      notes,
      actor_user_id: userId,
      decided_at: daysAgo(Math.max(0.6, ageDays - 2), 14),
      updated_at: daysAgo(Math.max(0.6, ageDays - 2), 14),
    };
    const { error: outcomeError } = existingOutcome
      ? await supabase.from('merchant_case_outcomes').update(outcomePayload).eq('id', existingOutcome.id)
      : await supabase.from('merchant_case_outcomes').insert(outcomePayload);
    if (outcomeError) throw outcomeError;
  }

  const evidenceRows = [
    {
      evidence_type: claimType === 'chargeback' ? 'payment_dispute' : 'tracking',
      source: claimType === 'chargeback' ? 'stripe' : 'carrier',
      evidence_url: `https://evidence.example.test/${orderRef}`,
      metadata: {
        seed_key: `audit-${orderRef}-tracking`,
        carrier: orderRef.endsWith('4') ? 'DPD' : orderRef.endsWith('5') ? 'Evri' : 'Royal Mail',
        order_ref: orderRef,
      },
    },
    {
      evidence_type: 'note',
      source: 'manual',
      evidence_url: null,
      metadata: {
        seed_key: `audit-${orderRef}-note`,
        analyst_note: notes,
      },
    },
  ];
  const { data: existingEvidence } = await supabase
    .from('claim_evidence_items')
    .select('id,metadata')
    .eq('claim_id', data.id)
    .limit(20);
  const existingKeys = new Set((existingEvidence ?? []).map((row) => row.metadata?.seed_key).filter(Boolean));
  for (const evidence of evidenceRows) {
    if (existingKeys.has(evidence.metadata.seed_key)) continue;
    const { error: evidenceError } = await supabase.from('claim_evidence_items').insert({
      claim_id: data.id,
      ...evidence,
      actor_user_id: userId,
      created_at: daysAgo(Math.max(0.4, ageDays - 1), 12),
    });
    if (evidenceError) throw evidenceError;
  }

  const baseEvents = [
    {
      event_type: 'claim_created',
      new_status: status,
      note: 'Claim created from audit seed data.',
      created_at: submittedAt,
    },
    {
      event_type: 'evidence_added',
      note: 'Tracking and order evidence attached.',
      created_at: daysAgo(Math.max(0.4, ageDays - 0.8), 11),
    },
  ];
  if (['under_review', 'pending', 'evidence_requested', 'escalated'].includes(status)) {
    baseEvents.push({
      event_type: status === 'escalated' ? 'escalation_added' : 'status_changed',
      previous_status: 'open',
      new_status: status,
      note: status === 'escalated' ? 'Escalated to fraud operations lead.' : 'Moved into active review.',
      created_at: daysAgo(Math.max(0.2, ageDays - 0.3), 13),
    });
  }
  if (decision && outcome) {
    baseEvents.push({
      event_type: 'outcome_added',
      previous_decision: null,
      new_decision: decision,
      previous_outcome: null,
      new_outcome: outcome,
      note: notes,
      created_at: daysAgo(Math.max(0.2, ageDays - 1.5), 14),
    });
    if (status === 'resolved' || status === 'closed') {
      baseEvents.push({
        event_type: 'claim_resolved',
        previous_status: 'under_review',
        new_status: status,
        note: `Resolved as ${outcome}.`,
        created_at: daysAgo(Math.max(0.2, ageDays - 1.1), 15),
      });
    }
  }
  if (orderRef === 'AU-1008-004' && status === 'escalated') {
    baseEvents.push({
      event_type: 'claim_reopened',
      previous_status: 'resolved',
      new_status: 'escalated',
      note: 'Customer reopened the same order claim through support.',
      created_at: daysAgo(4.8, 16),
    });
  }
  if (orderRef === 'AU-1011-004') {
    baseEvents.push({
      event_type: 'decision_reversed',
      previous_decision: 'approved',
      new_decision: 'denied',
      previous_outcome: 'legitimate',
      new_outcome: 'suspected_fraud',
      note: 'Decision reversed after depot scan and device reuse evidence arrived.',
      created_at: daysAgo(19, 16),
    });
  }
  if (['AU-1009-002', 'AU-1012-001'].includes(orderRef)) {
    baseEvents.push({
      event_type: 'customer_response_copied',
      note: 'Customer-safe response copied for support team.',
      created_at: daysAgo(Math.max(0.1, ageDays - 0.2), 17),
    });
  }

  const { data: existingEvents } = await supabase
    .from('claim_events')
    .select('id,metadata')
    .eq('claim_id', data.id)
    .limit(100);
  const existingEventKeys = new Set((existingEvents ?? []).map((row) => row.metadata?.seed_event_key).filter(Boolean));
  for (const [eventIndex, event] of baseEvents.entries()) {
    const seedEventKey = `audit-${orderRef}-${status}-${event.event_type}-${eventIndex}`;
    if (existingEventKeys.has(seedEventKey)) continue;
    const { error: eventError } = await supabase.from('claim_events').insert({
      claim_id: data.id,
      merchant_id: merchantId,
      shop_domain: shopDomain,
      event_type: event.event_type,
      previous_status: event.previous_status ?? null,
      new_status: event.new_status ?? null,
      previous_decision: event.previous_decision ?? null,
      new_decision: event.new_decision ?? null,
      previous_outcome: event.previous_outcome ?? null,
      new_outcome: event.new_outcome ?? null,
      note: event.note ?? null,
      actor_user_id: userId,
      actor_email_hash: sha(accountEmail).slice(0, 32),
      metadata: {
        seed_event_key: seedEventKey,
        profile_segment: profiles.find((p) => p.key === profileKey)?.segment ?? null,
        order_ref: orderRef,
      },
      created_at: event.created_at,
    });
    if (eventError) throw eventError;
  }

  return data.id;
}

async function ensureEvidencePackage(merchantId, profileId, txId, index, profile) {
  const reference = `UA-AUDIT-2026-${String(index + 1).padStart(4, '0')}`;
  const { data: existing, error: findError } = await supabase
    .from('evidence_packages')
    .select('id')
    .eq('reference_number', reference)
    .maybeSingle();
  if (findError) throw findError;
  const payload = {
    merchant_id: merchantId,
    customer_profile_id: profileId,
    generated_for_order_id: txId,
    generated_at: daysAgo(Math.max(1, 8 - index), 14),
    reference_number: reference,
    narrative_summary: `${profile.name} shows ${profile.confidence} identity confidence with ${profile.claims} claim(s) and ${profile.merchants} merchant context(s).`,
    signal_snapshot: profile.flags,
    cross_merchant_indicator: profile.merchants > 1,
    ce3_eligible: profile.risk >= 85,
    ce3_qualifying_signals: profile.flags,
    ce3_prior_transactions: [],
    merchant_notes: 'Design audit seed package for evidence-package UI review.',
    created_at: daysAgo(Math.max(1, 8 - index), 14),
  };
  const { data, error } = existing
    ? await supabase.from('evidence_packages').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('evidence_packages').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
}

async function ensureWatchlist(userId, profileId, profile) {
  if (!profile.watchlist) return null;
  const { data, error } = await supabase
    .from('watchlist_entries')
    .upsert({
      merchant_id: userId,
      customer_profile_id: profileId,
      email_hash: sha(profile.email).slice(0, 32),
      display_name: profile.name,
      display_email: profile.email,
      last_seen_risk: riskLevel(profile.risk),
      last_seen_at: daysAgo(0.4, 12),
      removed_by_merchant: false,
    }, { onConflict: 'merchant_id,customer_profile_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureNotes(merchantId, userId, profileId, profile) {
  const { data: existing } = await supabase
    .from('customer_notes')
    .select('id')
    .eq('merchant_id', userId)
    .eq('customer_profile_id', profileId)
    .ilike('body', '%Design audit seed%')
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
      .from('customer_notes')
      .insert({
      merchant_id: userId,
      customer_profile_id: profileId,
      body: `Design audit seed note: ${profile.note}`,
      deleted_by_merchant: false,
      created_at: daysAgo(2, 10),
      updated_at: daysAgo(2, 10),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureTeamAndAuditLog(merchantId, userId, seededProfileIds, seededClaimIds) {
  const members = [
    { invited_email: 'fraud.ops.lead@example.test', role: 'admin', invite_status: 'pending' },
    { invited_email: 'support.queue@example.test', role: 'analyst', invite_status: 'pending' },
    { invited_email: 'finance.reporting@example.test', role: 'viewer', invite_status: 'pending' },
  ];
  const memberIds = [];
  for (const member of members) {
    const { data, error } = await supabase
      .from('merchant_members')
      .upsert({
        merchant_id: merchantId,
        invited_by: userId,
        created_at: daysAgo(6 - memberIds.length, 10),
        accepted_at: null,
        ...member,
      }, { onConflict: 'merchant_id,invited_email' })
      .select('id')
      .single();
    if (error) throw error;
    memberIds.push(data.id);
  }

  const logs = [
    ['upload_csv', 'processing_job', null, { filename: 'aurora-outfitters-risk-audit-05.csv' }],
    ['view_customer', 'customer_profile', seededProfileIds[0], { source: 'design_audit_seed' }],
    ['add_to_watchlist', 'customer_profile', seededProfileIds[1], { reason: 'cross_merchant_match' }],
    ['generate_evidence', 'evidence_package', null, { ce3_eligible: true }],
    ['invite_team_member', 'merchant_member', memberIds[0], { email: members[0].invited_email, role: members[0].role }],
    ['submit_fraud_feedback', 'claim', seededClaimIds[0], { decision: 'denied', outcome: 'suspected_fraud' }],
  ];
  const logIds = [];
  for (const [index, [action, resourceType, resourceId, metadata]] of logs.entries()) {
    const { data: existing } = await supabase
      .from('user_action_log')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('action', action)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .limit(1)
      .maybeSingle();
    if (existing) {
      logIds.push(existing.id);
      continue;
    }
    const { data, error } = await supabase
      .from('user_action_log')
      .insert({
        merchant_id: merchantId,
        actor_user_id: userId,
        actor_role: 'owner',
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        request_ip: '127.0.0.1',
        created_at: daysAgo(index * 0.6, 10 + index),
      })
      .select('id')
      .single();
    if (error) throw error;
    logIds.push(data.id);
  }
  return { memberIds, logIds };
}

async function main() {
  const user = await ensureUser();
  const merchant = await ensureMerchant(user.id);
  await ensureShopify(merchant.id);

  const jobIds = [];
  for (let i = 0; i < 5; i += 1) {
    jobIds.push(await ensureJob(merchant.id, i));
  }

  const profileMap = new Map();
  const transactionMap = new Map();
  const seedLog = {
    generated_at: new Date().toISOString(),
    account: {
      email: accountEmail,
      password_hint: 'test account password stored in seed script',
      user_id: user.id,
      merchant_id: merchant.id,
      store_name: storeName,
      shop_domain: shopDomain,
    },
    counts: {},
    customers: {},
    claims: {},
    evidence_packages: [],
    watchlist_entries: [],
    team_members: [],
    user_action_log: [],
    processing_jobs: jobIds,
  };

  for (const [profileIndex, profile] of profiles.entries()) {
    const ensured = await ensureProfile(merchant.id, user.id, profile);
    profileMap.set(profile.key, ensured);
    seedLog.customers[profile.key] = {
      id: ensured.id,
      name: profile.name,
      email: profile.email,
      segment: profile.segment,
      risk_score: profile.risk,
      confidence_grade: profile.confidence,
      order_count: profile.orders,
      lifetime_value: profile.ltv,
      refund_count: profile.refunds,
      claim_count: profile.claims,
      latest_order: `AU-${1001 + profileIndex}-${String(Math.min(profile.orders, 6)).padStart(3, '0')}`,
    };

    const watchlistId = await ensureWatchlist(user.id, ensured.id, profile);
    if (watchlistId) seedLog.watchlist_entries.push(watchlistId);
    await ensureNotes(merchant.id, user.id, ensured.id, profile);

    const orderNo = 1001 + profileIndex;
    const ordersToSeed = Math.max(6, Math.min(profile.orders, 10));
    for (let orderIndex = 0; orderIndex < ordersToSeed; orderIndex += 1) {
      const jobId = jobIds[(profileIndex + orderIndex) % jobIds.length];
      const runIndex = jobIds.indexOf(jobId);
      const tx = await ensureTransaction({
        jobId,
        profileId: ensured.id,
        profile: { ...profile, merchantId: merchant.id },
        orderNo,
        orderIndex,
        runIndex,
        card: ensured.card,
        ip: ensured.ip,
      });
      transactionMap.set(tx.orderId, tx);
    }
  }

  for (const claimSeed of claims) {
    const profile = profileMap.get(claimSeed[0]);
    const id = await ensureClaim({
      merchantId: merchant.id,
      userId: user.id,
      profileId: profile.id,
      claimSeed,
    });
    seedLog.claims[`${claimSeed[0]}-${claimSeed[1]}-${claimSeed[3]}`] = id;
  }

  const evidenceTargets = ['critical-1', 'critical-2', 'suspicious-2', 'suspicious-1'];
  for (const [index, key] of evidenceTargets.entries()) {
    const profile = profiles.find((p) => p.key === key);
    const profileInfo = profileMap.get(key);
    const firstOrderRef = claims.find((claim) => claim[0] === key)?.[1];
    const tx = transactionMap.get(firstOrderRef);
    if (!profile || !profileInfo || !tx) continue;
    const pkgId = await ensureEvidencePackage(merchant.id, profileInfo.id, tx.txId, index, profile);
    seedLog.evidence_packages.push(pkgId);
  }

  const teamAndLogs = await ensureTeamAndAuditLog(
    merchant.id,
    user.id,
    evidenceTargets.map((key) => profileMap.get(key)?.id).filter(Boolean),
    Object.values(seedLog.claims).slice(0, 3),
  );
  seedLog.team_members = teamAndLogs.memberIds;
  seedLog.user_action_log = teamAndLogs.logIds;

  seedLog.counts = {
    customers_seeded: profiles.length,
    claims_seeded: Object.keys(seedLog.claims).length,
    audit_runs_seeded: jobIds.length,
    evidence_packages_seeded: seedLog.evidence_packages.length,
    watchlist_entries_seeded: seedLog.watchlist_entries.length,
    team_members_seeded: seedLog.team_members.length,
  };

  fs.writeFileSync(path.join(auditDir, 'seed_log.json'), JSON.stringify(seedLog, null, 2));
  console.log(JSON.stringify({
    ok: true,
    merchant_id: merchant.id,
    user_id: user.id,
    customers: profiles.length,
    claims: Object.keys(seedLog.claims).length,
    jobs: jobIds.length,
    evidence_packages: seedLog.evidence_packages.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
