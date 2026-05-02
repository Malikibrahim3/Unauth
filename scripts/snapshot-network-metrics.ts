/**
 * scripts/snapshot-network-metrics.ts
 *
 * Computes and upserts a daily network metrics snapshot row.
 * Run daily via Vercel cron or manually:
 *   npm run snapshot-metrics
 */

// Load .env.local for local runs
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function snapshotNetworkMetrics() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Identity graph counts ────────────────────────────────────────────────
  const { data: identityCounts, error: idErr } = await supabase
    .from('customer_profiles')
    .select('merchant_count');

  if (idErr) {
    console.error('Error fetching customer_profiles:', idErr.message);
    process.exit(1);
  }

  const totalIdentities = identityCounts?.length ?? 0;
  const at2 = identityCounts?.filter((r: { merchant_count: number }) => r.merchant_count === 2).length ?? 0;
  const at3plus = identityCounts?.filter((r: { merchant_count: number }) => r.merchant_count >= 3).length ?? 0;

  // ── Audits in last 30 days ───────────────────────────────────────────────
  const { count: auditsIn30d } = await supabase
    .from('processing_jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)
    .eq('status', 'completed');

  // ── Audits with cross-merchant signal in last 30 days ───────────────────
  // An audit fires a cross-merchant signal if any transaction has 'crossMerchant' in identity_signals
  const { data: crossMerchantJobs } = await supabase
    .from('audit_transactions')
    .select('job_id')
    .gte('created_at', thirtyDaysAgo)
    .contains('identity_signals', ['crossMerchant'] as unknown as string[]);

  const auditsWithCrossSignal = new Set(
    (crossMerchantJobs ?? []).map((r: { job_id: string }) => r.job_id)
  ).size;

  // ── Active merchants (at least one completed upload in last 30 days) ─────
  const { data: activeM } = await supabase
    .from('processing_jobs')
    .select('merchant_id')
    .gte('created_at', thirtyDaysAgo)
    .eq('status', 'completed');

  const activeMerchantsCount = new Set(
    (activeM ?? []).map((r: { merchant_id: string }) => r.merchant_id)
  ).size;

  // ── Lifetime cross-merchant match count (from access_audit_log) ──────────
  const { count: lifetimeCrossMatches } = await supabase
    .from('access_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('query_type', 'cross_merchant');

  // ── Network-wide refund & INR rates (averages across all customer_profiles) ──
  const { data: rateRows } = await supabase
    .from('customer_profiles')
    .select('refund_rate, inr_claim_rate')
    .not('refund_rate', 'is', null);

  let networkRefundRate: number | null = null;
  let networkInrRate: number | null = null;
  if (rateRows && rateRows.length > 0) {
    const typedRateRows = rateRows as Array<{ refund_rate: number | null; inr_claim_rate: number | null }>;
    networkRefundRate =
      typedRateRows.reduce((sum, r) => sum + (r.refund_rate ?? 0), 0) / typedRateRows.length;
    networkInrRate =
      typedRateRows.reduce((sum, r) => sum + (r.inr_claim_rate ?? 0), 0) / typedRateRows.length;
  }

  // ── Upsert snapshot ──────────────────────────────────────────────────────
  const { error: upsertErr } = await supabase
    .from('network_metrics_snapshots')
    .upsert(
      {
        snapshot_date: today,
        total_identities: totalIdentities,
        identities_at_2_merchants: at2,
        identities_at_3plus_merchants: at3plus,
        total_cross_merchant_matches_lifetime: lifetimeCrossMatches ?? 0,
        audits_in_last_30d: auditsIn30d ?? 0,
        audits_with_cross_merchant_signal_30d: auditsWithCrossSignal,
        active_merchants_30d: activeMerchantsCount,
        uploads_in_last_30d: auditsIn30d ?? 0,
        network_inr_claim_rate: networkInrRate !== null ? parseFloat(networkInrRate.toFixed(4)) : null,
        network_refund_rate: networkRefundRate !== null ? parseFloat(networkRefundRate.toFixed(4)) : null,
      },
      { onConflict: 'snapshot_date' }
    );

  if (upsertErr) {
    console.error('Upsert error:', upsertErr.message);
    process.exit(1);
  }

  console.log(`✅ Snapshot for ${today} written.`);
  console.log(`   Total identities:          ${totalIdentities}`);
  console.log(`   k-anon satisfied (3+):     ${at3plus}`);
  console.log(`   Audits (30d):              ${auditsIn30d ?? 0}`);
  console.log(`   Audits w/ cross-signal:    ${auditsWithCrossSignal}`);
  console.log(`   Active merchants (30d):    ${activeMerchantsCount}`);
}

snapshotNetworkMetrics().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
