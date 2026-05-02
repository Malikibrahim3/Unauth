/**
 * One-time migration: Build customer_profiles from existing fraud_transactions.
 *
 * Processes transactions in chronological order (oldest first), grouped by email.
 * For each unique email, creates a profile and updates it with each transaction
 * as if it had been processed live.
 *
 * Transactions without email fall back to IP+address grouping with lower confidence (70).
 *
 * Guard: checks if customer_profiles already has rows and aborts if so (prevents double run).
 *
 * Usage: npx tsx scripts/migrate-customer-profiles.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '../lib/identity/normalise';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FraudTx {
  id: string;
  job_id: string;
  order_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  device_ip: string | null;
  card_last4: string | null;
  order_value: number | null;
  fraud_score: number;
  risk_level: string;
  fraud_flags: string[];
  refund_claimed: boolean | null;
  chargeback_filed: boolean | null;
  processed_at: string;
}

interface ProfileAccumulator {
  primary_email: string | null;
  emails: string[];
  ips: string[];
  addresses: string[];
  card_last4s: string[];
  names: string[];
  risk_score: number;
  fraud_flags: string[];
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  merchant_ids: string[];
  refund_timestamps: string[];
  first_seen: string;
  last_seen: string;
  last_audit_id: string;
  profile_confidence: number;
  transaction_ids: string[];
  job_ids: string[];
}

// ---------------------------------------------------------------------------
// Risk level helper
// ---------------------------------------------------------------------------

function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Customer Profile Migration ===\n');

  // Guard: prevent double run
  const { count: existingCount } = await supabase
    .from('customer_profiles')
    .select('id', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.error(
      `ABORT: customer_profiles already has ${existingCount} rows. ` +
      'This migration should only run once. Delete all rows first if you want to re-run.'
    );
    process.exit(1);
  }

  // Fetch ALL fraud_transactions ordered by processed_at ASC
  console.log('Fetching all fraud_transactions...');
  const allTxs: FraudTx[] = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('fraud_transactions')
      .select('*')
      .order('processed_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch transactions:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allTxs.push(...(data as FraudTx[]));
    offset += data.length;
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`Fetched ${allTxs.length} transactions total.\n`);

  if (allTxs.length === 0) {
    console.log('No transactions to migrate. Done.');
    process.exit(0);
  }

  // -----------------------------------------------------------------------
  // Group by normalised email
  // -----------------------------------------------------------------------
  const emailGroups = new Map<string, FraudTx[]>();
  const noEmailTxs: FraudTx[] = [];

  for (const tx of allTxs) {
    const email = normaliseEmail(tx.customer_email);
    if (email) {
      if (!emailGroups.has(email)) emailGroups.set(email, []);
      emailGroups.get(email)!.push(tx);
    } else {
      noEmailTxs.push(tx);
    }
  }

  console.log(`Email groups: ${emailGroups.size}`);
  console.log(`Transactions without email: ${noEmailTxs.length}\n`);

  // -----------------------------------------------------------------------
  // Group no-email transactions by IP+address
  // -----------------------------------------------------------------------
  const ipAddrGroups = new Map<string, FraudTx[]>();
  const unmatchedTxs: FraudTx[] = [];

  for (const tx of noEmailTxs) {
    const ip = normaliseIP(tx.device_ip);
    const addr = normaliseAddress(tx.shipping_address);
    if (ip && addr) {
      const key = `${ip}||${addr}`;
      if (!ipAddrGroups.has(key)) ipAddrGroups.set(key, []);
      ipAddrGroups.get(key)!.push(tx);
    } else {
      unmatchedTxs.push(tx);
    }
  }

  console.log(`IP+Address groups (no email): ${ipAddrGroups.size}`);
  console.log(`Unmatched (no email, no IP+addr): ${unmatchedTxs.length}\n`);

  // -----------------------------------------------------------------------
  // Build profiles from email groups
  // -----------------------------------------------------------------------
  const profileInserts: any[] = [];
  const appearanceInserts: any[] = [];
  let profileIndex = 0;

  function buildProfileFromGroup(
    txs: FraudTx[],
    primaryEmail: string | null,
    confidence: number
  ) {
    // Sort by processed_at to simulate chronological processing
    txs.sort((a, b) => new Date(a.processed_at).getTime() - new Date(b.processed_at).getTime());

    const acc: ProfileAccumulator = {
      primary_email: primaryEmail,
      emails: [],
      ips: [],
      addresses: [],
      card_last4s: [],
      names: [],
      risk_score: 0,
      fraud_flags: [],
      total_orders: 0,
      total_refund_claims: 0,
      total_chargebacks: 0,
      merchant_ids: [],
      refund_timestamps: [],
      first_seen: txs[0].processed_at,
      last_seen: txs[txs.length - 1].processed_at,
      last_audit_id: txs[txs.length - 1].job_id,
      profile_confidence: confidence,
      transaction_ids: [],
      job_ids: [],
    };

    let isFirstOrder = true;

    for (const tx of txs) {
      const email = normaliseEmail(tx.customer_email);
      const ip = normaliseIP(tx.device_ip);
      const addr = normaliseAddress(tx.shipping_address);
      const card = normaliseCard(tx.card_last4);
      const name = tx.customer_name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
      const isRefund = !!tx.refund_claimed;
      const isChargeback = !!tx.chargeback_filed;
      const flags = Array.isArray(tx.fraud_flags) ? tx.fraud_flags as string[] : [];

      // Merge identity arrays (deduplicated)
      if (email && !acc.emails.includes(email)) acc.emails.push(email);
      if (ip && !acc.ips.includes(ip)) acc.ips.push(ip);
      if (addr && !acc.addresses.includes(addr)) acc.addresses.push(addr);
      if (card && card.length === 4 && !acc.card_last4s.includes(card)) acc.card_last4s.push(card);
      if (name && !acc.names.includes(name)) acc.names.push(name);
      if (tx.job_id && !acc.merchant_ids.includes(tx.job_id)) acc.job_ids.push(tx.job_id);

      // Merge flags
      for (const f of flags) {
        if (!acc.fraud_flags.includes(f)) acc.fraud_flags.push(f);
      }

      acc.total_orders++;
      if (isRefund) acc.total_refund_claims++;
      if (isChargeback) acc.total_chargebacks++;

      if (isRefund && tx.processed_at) {
        acc.refund_timestamps.push(tx.processed_at);
      }

      // Rolling risk score (60/40 split) — first order just takes the score
      if (isFirstOrder) {
        acc.risk_score = tx.fraud_score;
        isFirstOrder = false;
      } else {
        acc.risk_score = (acc.risk_score * 0.6) + (tx.fraud_score * 0.4);
      }

      acc.last_seen = tx.processed_at;
      acc.last_audit_id = tx.job_id;
      acc.transaction_ids.push(tx.id);
    }

    const refundRate = acc.total_orders > 0 ? acc.total_refund_claims / acc.total_orders : 0;

    // Gather unique merchant (job) IDs for total_merchants_seen_at
    const uniqueJobs = Array.from(new Set(txs.map(t => t.job_id)));

    const profileId = crypto.randomUUID();

    profileInserts.push({
      id: profileId,
      primary_email: acc.primary_email,
      emails: acc.emails,
      ips: acc.ips,
      addresses: acc.addresses,
      card_last4s: acc.card_last4s,
      phones: [],
      names: acc.names,
      risk_score: acc.risk_score,
      risk_level: getRiskLevel(acc.risk_score),
      fraud_flags: acc.fraud_flags,
      total_orders: acc.total_orders,
      total_refund_claims: acc.total_refund_claims,
      total_chargebacks: acc.total_chargebacks,
      total_merchants_seen_at: uniqueJobs.length,
      refund_rate: refundRate,
      refund_timestamps: acc.refund_timestamps,
      merchant_ids: uniqueJobs,
      first_seen: acc.first_seen,
      last_seen: acc.last_seen,
      last_audit_id: acc.last_audit_id,
      profile_confidence: acc.profile_confidence,
    });

    // Build appearance links — one per transaction
    for (const tx of txs) {
      const flags = Array.isArray(tx.fraud_flags) ? tx.fraud_flags as string[] : [];
      appearanceInserts.push({
        profile_id: profileId,
        audit_id: tx.job_id,
        transaction_id: tx.id,
        score_at_time: tx.fraud_score,
        flags_at_time: flags,
        appeared_at: tx.processed_at,
      });
    }

    profileIndex++;
  }

  // Process email groups
  for (const [email, txs] of Array.from(emailGroups.entries())) {
    buildProfileFromGroup(txs, email, 100);
  }

  // Process IP+address groups (lower confidence)
  for (const [_key, txs] of Array.from(ipAddrGroups.entries())) {
    buildProfileFromGroup(txs, null, 70);
  }

  // -----------------------------------------------------------------------
  // Bulk insert profiles
  // -----------------------------------------------------------------------
  console.log(`Inserting ${profileInserts.length} profiles...`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < profileInserts.length; i += BATCH_SIZE) {
    const batch = profileInserts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('customer_profiles').insert(batch);
    if (error) {
      console.error(`Profile insert batch ${i / BATCH_SIZE} failed:`, error.message);
    }
  }

  // -----------------------------------------------------------------------
  // Bulk insert appearance links
  // -----------------------------------------------------------------------
  console.log(`Inserting ${appearanceInserts.length} appearance links...`);

  for (let i = 0; i < appearanceInserts.length; i += BATCH_SIZE) {
    const batch = appearanceInserts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('customer_profile_audit_appearances').insert(batch);
    if (error) {
      console.error(`Appearance insert batch ${i / BATCH_SIZE} failed:`, error.message);
    }
  }

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------
  console.log('\n=== Migration Report ===\n');
  console.log(`Total profiles created: ${profileInserts.length}`);

  const multiOrderProfiles = profileInserts.filter(p => p.total_orders > 1).length;
  console.log(`Profiles with >1 order: ${multiOrderProfiles}`);

  const refundProfiles = profileInserts.filter(p => p.total_refund_claims > 0).length;
  console.log(`Profiles with refund claims: ${refundProfiles}`);

  const multiAuditProfiles = profileInserts.filter(p => (p.merchant_ids as string[]).length > 1).length;
  console.log(`Profiles spanning >1 audit: ${multiAuditProfiles}`);

  console.log(`Transactions unmatched (no profile): ${unmatchedTxs.length}`);
  console.log(`Total appearance links written: ${appearanceInserts.length}`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
