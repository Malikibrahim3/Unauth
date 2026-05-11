import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

process.chdir(repoRoot);
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

const { createJob, updateJobTotalRows, completeJob } = require('../lib/processing/job.ts');
const { scoreOrders } = require('../lib/engine/index.ts');
const { normaliseRow } = require('../lib/csv/normalise.ts');
const {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} = require('../lib/identity/normalise.ts');
const {
  maskEmail,
  maskAddress,
  maskPhone,
} = require('../lib/evidence/buildPackage.ts');
const { buildNarrative } = require('../lib/evidence/narrative.ts');
const { renderEvidencePDF } = require('../lib/evidence/pdf.tsx');
const { buildDemoSeedDatasets } = require('./test-data/generateBlindMerchantCSVs.ts');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_MERCHANT_ID = process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID;
const DEMO_MERCHANT_EMAIL = process.env.DEMO_MERCHANT_EMAIL ?? 'demo-merchant@unauth.synthetic';
const DEMO_MERCHANT_NAME = process.env.DEMO_MERCHANT_NAME ?? 'ASOS Demo Merchant';
const DEMO_MERCHANT_USER_ID = process.env.DEMO_MERCHANT_USER_ID ?? null;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DEMO_MERCHANT_ID) {
  console.error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_DEMO_MERCHANT_ID'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(message, extra) {
  if (typeof extra === 'undefined') {
    console.log(`[seed-demo] ${message}`);
    return;
  }
  console.log(`[seed-demo] ${message}`, extra);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gradeFromRiskTier(riskTier) {
  if (riskTier === 'critical') return 'definite';
  if (riskTier === 'high') return 'probable';
  if (riskTier === 'medium') return 'possible';
  return null;
}

function matchStatusFromRiskTier(riskTier) {
  if (riskTier === 'critical') return 'definite';
  if (riskTier === 'high') return 'probable';
  if (riskTier === 'medium') return 'candidate';
  return 'none';
}

function riskRank(riskTier) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[riskTier] ?? 0;
}

function toCsvRow(order) {
  const refundRequested = order.refund_requested === 'true';
  return {
    order_id: order.order_id,
    order_date: order.order_date,
    customer_email: order.customer_email,
    customer_name: order.customer_name,
    shipping_address: order.shipping_address,
    order_total: order.order_total,
    currency: order.currency,
    order_status: order.order_status,
    customer_phone: order.customer_phone,
    billing_address: order.billing_address,
    shipping_postcode: order.shipping_postcode,
    postcode: order.postcode,
    refund_status: refundRequested ? 'full' : 'none',
    refund_reason: order.refund_reason || undefined,
    refund_date: order.chargeback_date || (refundRequested ? order.order_date : undefined),
    refund_amount: order.refund_amount || undefined,
    payment_method: order.payment_method,
    ip_address: order.ip_address,
    device_id: order.device_id,
    card_last4: order.card_last4,
    card_bin: order.card_bin,
    account_id: order.account_id,
    ground_truth_label: order._expected_should_flag === 'true' ? 'fraud' : 'legitimate',
    chargeback_dispute: order.chargeback_filed,
    refund_requested: order.refund_requested,
  };
}

async function ensureDemoUser() {
  if (DEMO_MERCHANT_USER_ID) {
    const existingById = await supabase.auth.admin.getUserById(DEMO_MERCHANT_USER_ID);
    if (existingById.data?.user) return existingById.data.user.id;
  }

  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === DEMO_MERCHANT_EMAIL.toLowerCase());
    if (found) return found.id;
    if (!data?.users?.length || data.users.length < 200) break;
    page += 1;
  }

  const created = await supabase.auth.admin.createUser({
    email: DEMO_MERCHANT_EMAIL,
    email_confirm: true,
    password: `${randomUUID()}!Aa9`,
    user_metadata: { is_demo: true, merchant_name: DEMO_MERCHANT_NAME },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Failed to create demo auth user: ${created.error?.message ?? 'unknown error'}`);
  }
  return created.data.user.id;
}

async function ensureDemoMerchant(userId) {
  const { data: existingById, error: existingByIdError } = await supabase
    .from('merchants')
    .select('id, user_id')
    .eq('id', DEMO_MERCHANT_ID)
    .maybeSingle();
  if (existingByIdError) {
    throw new Error(`Failed to read demo merchant by id: ${existingByIdError.message}`);
  }

  if (existingById && existingById.user_id !== userId) {
    throw new Error(
      `Demo merchant id ${DEMO_MERCHANT_ID} already belongs to a different user. Set DEMO_MERCHANT_USER_ID to the owning auth user before reseeding.`
    );
  }

  const { data: existingByUser, error: existingByUserError } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingByUserError) {
    throw new Error(`Failed to read merchant by user: ${existingByUserError.message}`);
  }
  if (existingByUser && existingByUser.id !== DEMO_MERCHANT_ID) {
    throw new Error(
      `Demo auth user already owns merchant ${existingByUser.id}. Expected ${DEMO_MERCHANT_ID}.`
    );
  }

  const payload = {
    id: DEMO_MERCHANT_ID,
    user_id: userId,
    name: DEMO_MERCHANT_NAME,
    business_name: DEMO_MERCHANT_NAME,
    setup_complete: true,
    is_demo: true,
    default_column_map: null,
  };

  const { error } = await supabase
    .from('merchants')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: false });
  if (error) {
    throw new Error(`Failed to upsert demo merchant: ${error.message}`);
  }
}

async function safeDeleteByEq(table, column, value) {
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function safeDeleteByIn(table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function resetDemoMerchant() {
  log('Resetting existing demo data');

  const [{ data: jobRows, error: jobsError }, { data: profileRows, error: profilesError }, { data: evidenceRows, error: evidenceError }] =
    await Promise.all([
      supabase.from('processing_jobs').select('id').eq('merchant_id', DEMO_MERCHANT_ID),
      supabase.from('customer_profiles').select('id').contains('merchant_ids', [DEMO_MERCHANT_ID]),
      supabase.from('evidence_packages').select('id,pdf_storage_path').eq('merchant_id', DEMO_MERCHANT_ID),
    ]);

  if (jobsError) throw new Error(`Failed to load demo jobs: ${jobsError.message}`);
  if (profilesError) throw new Error(`Failed to load demo profiles: ${profilesError.message}`);
  if (evidenceError) throw new Error(`Failed to load demo evidence packages: ${evidenceError.message}`);

  const jobIds = (jobRows ?? []).map((row) => row.id);
  const profileIds = (profileRows ?? []).map((row) => row.id);
  const pdfPaths = (evidenceRows ?? []).map((row) => row.pdf_storage_path).filter(Boolean);

  if (pdfPaths.length > 0) {
    const { error } = await supabase.storage.from('evidence-packages').remove(pdfPaths);
    if (error) {
      log('Continuing after evidence PDF cleanup error', error.message);
    }
  }

  if (profileIds.length > 0) {
    await safeDeleteByIn('customer_notes', 'customer_profile_id', profileIds);
    await safeDeleteByIn('customer_activity_log', 'profile_id', profileIds);
  }

  if (jobIds.length > 0) {
    await safeDeleteByIn('customer_profile_audit_appearances', 'audit_id', jobIds);
    await safeDeleteByIn('audit_transactions', 'job_id', jobIds);
  }

  if (profileIds.length > 0) {
    await safeDeleteByIn('customer_profile_audit_appearances', 'profile_id', profileIds);
    await safeDeleteByIn('watchlist_entries', 'customer_profile_id', profileIds);
    await safeDeleteByIn('customer_profiles', 'id', profileIds);
  }

  await safeDeleteByEq('evidence_packages', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('watchlist_appearances', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('watchlist_entries', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('access_audit_log', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('lookup_daily_counts', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('user_action_log', 'merchant_id', DEMO_MERCHANT_ID);
  await safeDeleteByEq('processing_jobs', 'merchant_id', DEMO_MERCHANT_ID);
}

async function insertTransactions(jobId, scoredRows) {
  const BATCH = 500;
  const txByOrderId = new Map();

  for (let i = 0; i < scoredRows.length; i += BATCH) {
    const batch = scoredRows.slice(i, i + BATCH).map((entry) => {
      const grade = gradeFromRiskTier(entry.scored.riskTier);
      const firedSignals = entry.scored.signals.filter((signal) => signal.fired).map((signal) => signal.name);

      return {
        job_id: jobId,
        order_id: entry.source.order_id,
        customer_email: entry.source.customer_email,
        customer_name: entry.source.customer_name,
        shipping_address: entry.source.shipping_address,
        billing_address: entry.source.billing_address,
        order_value: parseFloat(entry.source.order_total),
        payment_method: entry.source.payment_method,
        card_last4: entry.source.card_last4,
        device_ip: entry.source.ip_address,
        delivery_status: entry.source.delivery_status,
        refund_claimed: entry.source.refund_requested === 'true',
        refund_reason: entry.source.refund_reason || null,
        chargeback_filed: entry.source.chargeback_filed === 'true',
        chargeback_reason_code: entry.source.chargeback_reason_code || null,
        match_score: entry.scored.totalScore,
        fraud_flags: firedSignals,
        identity_signals: firedSignals,
        signals_matched: firedSignals,
        risk_level: entry.scored.riskTier,
        identity_confidence_grade: grade,
        identity_score: entry.scored.totalScore,
        match_status: matchStatusFromRiskTier(entry.scored.riskTier),
        ce3_eligible: false,
        ce3_qualifying_transactions: [],
        processed_at: entry.source.order_date,
      };
    });

    const { data, error } = await supabase
      .from('audit_transactions')
      .insert(batch)
      .select('id, order_id, chargeback_filed, match_score, risk_level');

    if (error) {
      throw new Error(`Failed to insert audit transactions: ${error.message}`);
    }

    for (const row of data ?? []) {
      txByOrderId.set(row.order_id, row);
    }
  }

  return txByOrderId;
}

async function insertProfiles(jobId, scoredRows, txByOrderId) {
  const profileGroups = new Map();

  for (const entry of scoredRows) {
    const personId = entry.source._ground_truth_person_id || `person:${entry.source.order_id}`;
    const firedSignals = entry.scored.signals.filter((signal) => signal.fired).map((signal) => signal.name);
    const refundCount = entry.source.refund_requested === 'true' ? 1 : 0;
    const chargebackCount = entry.source.chargeback_filed === 'true' ? 1 : 0;
    const current = profileGroups.get(personId) ?? {
      personId,
      primaryEmail: null,
      emails: new Set(),
      ips: new Set(),
      addresses: new Set(),
      cards: new Set(),
      phones: new Set(),
      names: new Set(),
      fraudFlags: new Set(),
      identitySignals: new Set(),
      refundTimestamps: [],
      totalOrders: 0,
      totalRefundClaims: 0,
      totalChargebacks: 0,
      maxScore: 0,
      maxRiskTier: 'low',
      firstSeen: entry.source.order_date,
      lastSeen: entry.source.order_date,
      txIds: [],
      txOrderIds: [],
    };

    const normEmail = normaliseEmail(entry.source.customer_email);
    const normIP = normaliseIP(entry.source.ip_address);
    const normAddress = normaliseAddress(entry.source.shipping_address);
    const normCard = normaliseCard(entry.source.card_last4);
    const normPhone = entry.source.customer_phone ? entry.source.customer_phone.replace(/\s+/g, '') : '';
    const normName = entry.source.customer_name ? entry.source.customer_name.trim().toLowerCase() : '';

    if (normEmail) {
      current.primaryEmail ||= normEmail;
      current.emails.add(normEmail);
    }
    if (normIP) current.ips.add(normIP);
    if (normAddress) current.addresses.add(normAddress);
    if (normCard) current.cards.add(normCard);
    if (normPhone) current.phones.add(normPhone);
    if (normName) current.names.add(normName);
    for (const flag of firedSignals) {
      current.fraudFlags.add(flag);
      current.identitySignals.add(flag);
    }

    current.totalOrders += 1;
    current.totalRefundClaims += refundCount;
    current.totalChargebacks += chargebackCount;
    if (refundCount && entry.source.chargeback_date) current.refundTimestamps.push(entry.source.chargeback_date);
    else if (refundCount) current.refundTimestamps.push(entry.source.order_date);
    if (entry.scored.totalScore > current.maxScore) current.maxScore = entry.scored.totalScore;
    if (riskRank(entry.scored.riskTier) > riskRank(current.maxRiskTier)) {
      current.maxRiskTier = entry.scored.riskTier;
    }
    if (entry.source.order_date < current.firstSeen) current.firstSeen = entry.source.order_date;
    if (entry.source.order_date > current.lastSeen) current.lastSeen = entry.source.order_date;
    current.txIds.push(txByOrderId.get(entry.source.order_id)?.id ?? null);
    current.txOrderIds.push(entry.source.order_id);

    profileGroups.set(personId, current);
  }

  const inserts = Array.from(profileGroups.values()).map((group) => {
    const grade = gradeFromRiskTier(group.maxRiskTier);
    return {
      primary_email: group.primaryEmail,
      emails: Array.from(group.emails),
      ips: Array.from(group.ips),
      addresses: Array.from(group.addresses),
      card_last4s: Array.from(group.cards),
      phones: Array.from(group.phones),
      names: Array.from(group.names),
      risk_score: group.maxScore,
      risk_level: group.maxRiskTier,
      fraud_flags: Array.from(group.fraudFlags),
      total_orders: group.totalOrders,
      total_refund_claims: group.totalRefundClaims,
      total_chargebacks: group.totalChargebacks,
      total_merchants_seen_at: 1,
      refund_rate: group.totalOrders > 0 ? group.totalRefundClaims / group.totalOrders : 0,
      refund_timestamps: group.refundTimestamps,
      merchant_ids: [DEMO_MERCHANT_ID],
      first_seen: group.firstSeen,
      last_seen: group.lastSeen,
      last_audit_id: jobId,
      profile_confidence: 100,
      identity_confidence_grade: grade,
      identity_signals_summary: Array.from(group.identitySignals),
      identity_cluster_id: null,
      identity_status: grade === 'definite' ? 'confirmed' : grade ? 'candidate' : null,
    };
  });

  const insertedProfiles = [];
  const profileIdByPerson = new Map();
  const BATCH = 500;

  for (let i = 0; i < inserts.length; i += BATCH) {
    const { data, error } = await supabase
      .from('customer_profiles')
      .insert(inserts.slice(i, i + BATCH))
      .select('id, primary_email, first_seen, last_seen');
    if (error) {
      throw new Error(`Failed to insert customer profiles: ${error.message}`);
    }
    insertedProfiles.push(...(data ?? []));
  }

  for (const group of profileGroups.values()) {
    const match = insertedProfiles.find(
      (profile) =>
        profile.primary_email === group.primaryEmail &&
        profile.first_seen === group.firstSeen &&
        profile.last_seen === group.lastSeen
    );
    if (!match) {
      throw new Error(`Could not map inserted profile for ${group.personId}`);
    }
    profileIdByPerson.set(group.personId, match.id);
  }

  const appearanceRows = [];
  for (const group of profileGroups.values()) {
    const profileId = profileIdByPerson.get(group.personId);
    for (const orderId of group.txOrderIds) {
      const tx = txByOrderId.get(orderId);
      const source = scoredRows.find((row) => row.source.order_id === orderId);
      if (!profileId || !tx || !source) continue;
      appearanceRows.push({
        profile_id: profileId,
        audit_id: jobId,
        transaction_id: tx.id,
        score_at_time: source.scored.totalScore,
        flags_at_time: source.scored.signals.filter((signal) => signal.fired).map((signal) => signal.name),
      });
    }
  }

  for (let i = 0; i < appearanceRows.length; i += BATCH) {
    const { error } = await supabase
      .from('customer_profile_audit_appearances')
      .insert(appearanceRows.slice(i, i + BATCH));
    if (error) {
      throw new Error(`Failed to insert customer profile appearances: ${error.message}`);
    }
  }

  return { profileGroups, profileIdByPerson };
}

async function buildEvidencePackageForRun(jobMeta, profileGroups, profileIdByPerson, txByOrderId, orderEntryByOrderId) {
  const candidateGroups = Array.from(profileGroups.values())
    .filter((group) => group.totalChargebacks > 0)
    .sort((a, b) => b.maxScore - a.maxScore);

  const targetGroup = candidateGroups[0];
  if (!targetGroup) {
    throw new Error(`No chargeback-backed profile found for ${jobMeta.name}`);
  }

  const profileId = profileIdByPerson.get(targetGroup.personId);
  const disputedOrderId = targetGroup.txOrderIds.find((orderId) => txByOrderId.get(orderId)?.chargeback_filed)
    ?? targetGroup.txOrderIds[0];
  const disputedTx = txByOrderId.get(disputedOrderId);
  const disputedEntry = orderEntryByOrderId.get(disputedOrderId);

  if (!profileId || !disputedTx || !disputedEntry) {
    throw new Error(`Unable to resolve evidence inputs for ${jobMeta.name}`);
  }

  const history = targetGroup.txOrderIds
    .map((orderId) => {
      const tx = txByOrderId.get(orderId);
      const entry = orderEntryByOrderId.get(orderId);
      if (!tx || !entry) return null;

      const isDisputedOrder = orderId === disputedOrderId;
      const refundClaimed = entry.source.refund_requested === 'true';
      const outcome = entry.source.chargeback_filed === 'true'
        ? 'disputed'
        : refundClaimed
          ? 'refunded'
          : 'completed';

      return {
        orderId,
        date: new Date(entry.source.order_date),
        value: parseFloat(entry.source.order_total),
        outcome,
        timeToClaim: refundClaimed ? 'Same-day claim' : undefined,
        isDisputedOrder,
        isCE3QualifyingTransaction: false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const identifierTypesPresent = [];
  if (targetGroup.emails.size > 0) identifierTypesPresent.push('email address');
  if (targetGroup.addresses.size > 0) identifierTypesPresent.push('shipping address');
  if (targetGroup.phones.size > 0) identifierTypesPresent.push('phone number');
  if (targetGroup.cards.size > 0) identifierTypesPresent.push('payment card');

  const pkg = {
    referenceNumber: `DEMO-${jobMeta.rows}-${String(Date.now()).slice(-6)}`,
    generatedAt: new Date(),
    merchant: {
      id: DEMO_MERCHANT_ID,
      name: DEMO_MERCHANT_NAME,
    },
    disputedOrder: {
      orderId: disputedOrderId,
      orderDate: new Date(disputedEntry.source.order_date),
      orderValue: parseFloat(disputedEntry.source.order_total),
      currency: disputedEntry.source.currency || 'GBP',
      outcome: 'disputed',
    },
    customer: {
      maskedEmail: targetGroup.primaryEmail ? maskEmail(targetGroup.primaryEmail) : '****',
      maskedAddress: targetGroup.addresses.size > 0 ? maskAddress(Array.from(targetGroup.addresses)[0]) : undefined,
      maskedPhone: targetGroup.phones.size > 0 ? maskPhone(Array.from(targetGroup.phones)[0]) : undefined,
      paymentLast4: targetGroup.cards.size > 0 ? `•••• ${Array.from(targetGroup.cards)[0]}` : undefined,
      deviceHashPrefix: disputedEntry.normalised.deviceIdHash?.slice(0, 10) ?? undefined,
      identifierTypesPresent,
    },
    orderHistory: history,
    identityEvidence: [
      ...(targetGroup.primaryEmail ? [{
        identifierType: 'Email address',
        maskedValue: maskEmail(targetGroup.primaryEmail),
        firstSeen: new Date(targetGroup.firstSeen),
        orderCount: targetGroup.totalOrders,
        ce3Accepted: true,
      }] : []),
      ...(targetGroup.addresses.size > 0 ? [{
        identifierType: 'Shipping address',
        maskedValue: maskAddress(Array.from(targetGroup.addresses)[0]),
        firstSeen: new Date(targetGroup.firstSeen),
        orderCount: targetGroup.totalOrders,
        ce3Accepted: true,
      }] : []),
      ...(targetGroup.phones.size > 0 ? [{
        identifierType: 'Phone number',
        maskedValue: maskPhone(Array.from(targetGroup.phones)[0]),
        firstSeen: new Date(targetGroup.firstSeen),
        orderCount: targetGroup.totalOrders,
        ce3Accepted: true,
      }] : []),
      ...(targetGroup.cards.size > 0 ? [{
        identifierType: 'Payment card (last 4)',
        maskedValue: `•••• ${Array.from(targetGroup.cards)[0]}`,
        firstSeen: new Date(targetGroup.firstSeen),
        orderCount: targetGroup.totalOrders,
        ce3Accepted: false,
      }] : []),
    ],
    ce3: {
      eligible: false,
      reason: 'This demo package highlights linked-order evidence rather than a CE3.0-qualified dispute.',
      qualifyingSignals: [],
      priorTransactions: [],
      disqualifyingFactors: ['Fewer than two CE3.0-qualified prior undisputed transactions are attached to this demo package.'],
    },
    crossMerchant: { satisfied: false },
    merchantNotes: `Synthetic ASOS-style demo dataset: ${jobMeta.label}.`,
    confidenceGrade: gradeFromRiskTier(targetGroup.maxRiskTier) ?? 'weak',
    engineVersion: 'demo-seed-1',
  };

  const narrative = buildNarrative(pkg);
  const pdfBuffer = await renderEvidencePDF(pkg, narrative);
  const storagePath = `demo/${jobMeta.jobId}/${pkg.referenceNumber}.pdf`;

  const uploadResult = await supabase.storage
    .from('evidence-packages')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  const { data, error } = await supabase
    .from('evidence_packages')
    .insert({
      merchant_id: DEMO_MERCHANT_ID,
      customer_profile_id: profileId,
      generated_for_order_id: disputedTx.id,
      reference_number: pkg.referenceNumber,
      pdf_storage_path: uploadResult.error ? null : storagePath,
      narrative_summary: narrative,
      signal_snapshot: pkg.identityEvidence,
      cross_merchant_indicator: pkg.crossMerchant.satisfied,
      ce3_eligible: pkg.ce3.eligible,
      ce3_qualifying_signals: pkg.ce3.qualifyingSignals,
      ce3_prior_transactions: pkg.ce3.priorTransactions,
      merchant_notes: pkg.merchantNotes ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert evidence package: ${error.message}`);
  }

  return {
    packageId: data.id,
    referenceNumber: pkg.referenceNumber,
    uploadError: uploadResult.error?.message ?? null,
  };
}

async function seedDataset(dataset, demoUserId) {
  log(`Seeding ${dataset.label} (${dataset.orders.length.toLocaleString()} rows)`);

  const filename = `${dataset.name}.csv`;
  const fileHash = sha256(JSON.stringify(dataset.orders.map((order) => order.order_id)));
  const jobId = await createJob(supabase, DEMO_MERCHANT_ID, {
    filename,
    label: dataset.label,
    uploadType: 'standard',
    fileHash,
  });

  await supabase
    .from('processing_jobs')
    .update({
      is_demo: true,
      status: 'processing',
      total_rows: dataset.orders.length,
      processed_rows: 0,
      failed_rows: 0,
      has_ground_truth: true,
      hidden_by_merchant: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  await updateJobTotalRows(supabase, jobId, dataset.orders.length);

  const scoredRows = dataset.orders.map((source) => {
    const csvRow = toCsvRow(source);
    const normalised = normaliseRow(csvRow);
    return {
      source,
      normalised,
    };
  });

  const scored = scoreOrders(scoredRows.map((entry) => entry.normalised));
  const merged = scoredRows.map((entry, index) => ({
    source: entry.source,
    normalised: entry.normalised,
    scored: scored[index],
  }));
  const orderEntryByOrderId = new Map(merged.map((entry) => [entry.source.order_id, entry]));

  const flaggedCount = merged.filter((entry) => entry.scored.flagged).length;
  const txByOrderId = await insertTransactions(jobId, merged);
  const { profileGroups, profileIdByPerson } = await insertProfiles(jobId, merged, txByOrderId);

  await supabase
    .from('processing_jobs')
    .update({
      processed_rows: dataset.orders.length,
      failed_rows: 0,
      flagged_count: flaggedCount,
      has_ground_truth: true,
      is_demo: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  await completeJob(supabase, jobId, true, [], flaggedCount);

  return {
    jobId,
    name: dataset.name,
    label: dataset.label,
    rows: dataset.orders.length,
    flaggedCount,
    profileGroups,
    profileIdByPerson,
    txByOrderId,
    orderEntryByOrderId,
  };
}

async function main() {
  const demoUserId = await ensureDemoUser();
  await ensureDemoMerchant(demoUserId);
  await resetDemoMerchant();
  await ensureDemoMerchant(demoUserId);

  const datasets = buildDemoSeedDatasets();
  const seededRuns = [];
  for (const dataset of datasets) {
    seededRuns.push(await seedDataset(dataset, demoUserId));
  }

  const evidenceRun = seededRuns
    .slice()
    .sort((a, b) => b.rows - a.rows)
    .find((run) => Array.from(run.profileGroups.values()).some((group) => group.totalChargebacks > 0));

  if (!evidenceRun) {
    throw new Error('No seeded run contains a chargeback-backed profile for evidence generation.');
  }

  const evidence = await buildEvidencePackageForRun(
    evidenceRun,
    evidenceRun.profileGroups,
    evidenceRun.profileIdByPerson,
    evidenceRun.txByOrderId,
    evidenceRun.orderEntryByOrderId
  );

  log('Demo merchant seed complete', {
    merchantId: DEMO_MERCHANT_ID,
    runs: seededRuns.map((run) => ({
      jobId: run.jobId,
      label: run.label,
      rows: run.rows,
      flaggedCount: run.flaggedCount,
    })),
    evidence,
  });
}

main().catch((error) => {
  console.error('[seed-demo] Fatal error:', error);
  process.exit(1);
});
