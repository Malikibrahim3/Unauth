/**
 * Real-pipeline diagnostic for identity matching.
 *
 * Replaces the broken .tmp_inspect.js, which built a stub context
 * (empty historical maps) and then misread the resulting null clusters
 * as production bugs.
 *
 * Two scenarios are run against a real Supabase instance:
 *
 *   1. fresh-batch    Two synthetic orders sharing IP + shipping address.
 *                     Neither identifier exists in fraud_entities yet, so
 *                     the engine must rely on in-batch matching.
 *
 *   2. historical     Two synthetic orders where the first is written to
 *                     fraud_entities, then the second is run through the
 *                     full pipeline and must match against history.
 *
 * Run:
 *   npm run diagnose
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local before any module that reads process.env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

import { normaliseRow } from '../lib/csv/normalise';
import { buildFastContext } from '../lib/engine/fastContext';
import { buildIdentityClusters } from '../lib/engine/identityMatching';
import { scoreBatch } from '../lib/engine/fastScore';
import type { CsvRow } from '../lib/csv/schema';

function row(overrides: Partial<CsvRow>): CsvRow {
  const base: CsvRow = {
    order_id: overrides.order_id ?? `diag-${Math.random().toString(36).slice(2, 10)}`,
    order_date: overrides.order_date ?? new Date().toISOString(),
    customer_email: overrides.customer_email ?? 'unknown@example.com',
    customer_name: overrides.customer_name ?? 'Unknown Customer',
    shipping_address: overrides.shipping_address ?? '',
    customer_phone: overrides.customer_phone ?? null,
    billing_address: overrides.billing_address ?? null,
    ip_address: overrides.ip_address ?? null,
    device_id: overrides.device_id ?? null,
    card_fingerprint: overrides.card_fingerprint ?? null,
    card_bin: overrides.card_bin ?? null,
    card_last4: overrides.card_last4 ?? null,
    browser_fingerprint: overrides.browser_fingerprint ?? null,
    cookie_id: overrides.cookie_id ?? null,
    user_agent: overrides.user_agent ?? null,
    asn: overrides.asn ?? null,
    account_id: overrides.account_id ?? null,
    order_total: overrides.order_total ?? '50.00',
    currency: overrides.currency ?? 'GBP',
    order_status: overrides.order_status ?? 'completed',
    refund_status: overrides.refund_status ?? 'none',
    refund_reason: overrides.refund_reason ?? null,
    refund_date: overrides.refund_date ?? null,
    refund_amount: overrides.refund_amount ?? null,
    payment_method: overrides.payment_method ?? 'card',
    ground_truth_label: overrides.ground_truth_label ?? null,
  } as CsvRow;
  return base;
}

function summariseClusters(map: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [orderId, cluster] of Object.entries(map)) {
    if (!cluster) {
      out[orderId] = null;
      continue;
    }
    const c = cluster as { confidence: number; matchReasons: string[]; entityType: string };
    out[orderId] = {
      confidence: c.confidence,
      entityType: c.entityType,
      matchReasons: c.matchReasons,
    };
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ---------- Scenario 1: fresh-batch (in-batch only) ---------------------
  // Use a unique IP + address that very likely don't exist in the DB.
  const stamp = Date.now();
  const sharedIp = `10.${(stamp >> 16) & 0xff}.${(stamp >> 8) & 0xff}.${stamp & 0xff}`;
  const addrA = `${stamp} Diagnostic St, London`;
  const addrB = `${stamp} Diagnostic Street, London`;

  const orderA = normaliseRow(row({
    order_id: `fresh-a-${stamp}`,
    customer_email: `alice.${stamp}@diagnostic.test`,
    customer_name: 'Alice Diagnostic',
    shipping_address: addrA,
    ip_address: sharedIp,
    order_total: '79.99',
  }));
  const orderB = normaliseRow(row({
    order_id: `fresh-b-${stamp}`,
    customer_email: `bob.${stamp}@diagnostic.test`,
    customer_name: 'Bob Diagnostic',
    shipping_address: addrB,
    ip_address: sharedIp,
    order_total: '82.49',
  }));

  console.log('===SCENARIO_1_FRESH_BATCH===');
  console.log(`shared_ip=${sharedIp}`);
  console.log(`addr_a=${addrA}`);
  console.log(`addr_b=${addrB}`);
  console.log(`addressHash_a=${orderA.addressHash}`);
  console.log(`addressHash_b=${orderB.addressHash}`);
  console.log(`addressHash_match=${orderA.addressHash === orderB.addressHash}`);
  console.log(`ipHash_match=${orderA.ipHash === orderB.ipHash}`);

  const ctx1 = await buildFastContext([orderA, orderB], supabase);
  console.log(`historical_map_sizes: emails=${ctx1.historicalEmailMap.size} ips=${ctx1.historicalIPMap.size} addrs=${ctx1.historicalAddressMap.size} cards=${ctx1.historicalCardMap.size}`);

  const clusters1 = await buildIdentityClusters([orderA, orderB], ctx1);
  console.log('clusters:');
  console.log(JSON.stringify(summariseClusters(clusters1), null, 2));

  const scored1 = scoreBatch([orderA, orderB], ctx1, clusters1);
  console.log('scoring_summary:');
  for (const s of scored1) {
    const fired = s.signals.filter((sig) => sig.fired).map((sig) => `${sig.name}:${sig.score}`);
    console.log(`  ${s.order.orderId} totalScore=${s.totalScore.toFixed(1)} grade=${s.confidenceGrade} flagged=${s.flagged} fired=[${fired.join(', ')}] alert=${s.identityAlerts.hasMatch ? `match conf=${s.identityAlerts.confidence}` : 'no-match'}`);
  }

  // ---------- Scenario 2: historical match --------------------------------
  // Look up an arbitrary IP that already exists in fraud_entities, then build
  // a synthetic order with that IP and a fresh address. Confirms the
  // historical path still works.
  console.log('\n===SCENARIO_2_HISTORICAL_MATCH===');
  const { data: knownIp } = await supabase
    .from('fraud_entities')
    .select('entity_value, total_orders, total_merchants')
    .eq('entity_type', 'ip')
    .gte('total_orders', 2)
    .limit(1);

  if (!knownIp || knownIp.length === 0) {
    console.log('SKIPPED — no historical IP entity with total_orders >= 2');
  } else {
    const histIp = knownIp[0].entity_value as string;
    const orderC = normaliseRow(row({
      order_id: `hist-c-${stamp}`,
      customer_email: `charlie.${stamp}@diagnostic.test`,
      customer_name: 'Charlie Diagnostic',
      shipping_address: `999 Brand New Address, London`,
      ip_address: histIp,
      order_total: '129.00',
    }));

    console.log(`historical_ip=${histIp} (total_orders=${knownIp[0].total_orders}, merchants=${knownIp[0].total_merchants})`);

    const ctx2 = await buildFastContext([orderC], supabase);
    console.log(`historical_map_sizes: ips=${ctx2.historicalIPMap.size} addrs=${ctx2.historicalAddressMap.size}`);
    const ipHit = ctx2.historicalIPMap.get(histIp);
    console.log(`historical_ip_lookup=${ipHit ? `HIT total_orders=${ipHit.total_orders}` : 'MISS'}`);

    const clusters2 = await buildIdentityClusters([orderC], ctx2);
    console.log('clusters:');
    console.log(JSON.stringify(summariseClusters(clusters2), null, 2));
  }

  // ---------- Scenario 3: sentinel scan -----------------------------------
  console.log('\n===SCENARIO_3_FASTEST_CLAIM_SENTINEL===');
  const { count: sentinelCount, error: sentinelErr } = await supabase
    .from('fraud_entities')
    .select('*', { count: 'exact', head: true })
    .or('fastest_claim_days.eq.99999,fastest_claim_days.eq.999999');
  if (sentinelErr) {
    console.log(`ERROR: ${sentinelErr.message}`);
  } else {
    console.log(`rows_with_sentinel=${sentinelCount}`);
  }

  // ---------- Scenario 4: cluster count investigation ---------------------
  console.log('\n===SCENARIO_4_CLUSTER_COUNT===');
  const { count: clusterRowCount } = await supabase
    .from('fraud_identity_clusters')
    .select('*', { count: 'exact', head: true });
  console.log(`fraud_identity_clusters_total_rows=${clusterRowCount}`);
  const { data: sample } = await supabase
    .from('fraud_identity_clusters')
    .select('cluster_id')
    .limit(20000);
  if (sample) {
    const histogram = new Map<string, number>();
    for (const r of sample) {
      const c = (r as { cluster_id: string }).cluster_id;
      histogram.set(c, (histogram.get(c) ?? 0) + 1);
    }
    const distinct = histogram.size;
    const multiRow = Array.from(histogram.values()).filter((n) => n > 1).length;
    console.log(`sample_rows=${sample.length} distinct_cluster_ids=${distinct} multi_row_clusters=${multiRow}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
