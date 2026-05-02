/**
 * Phase 7 Check 3 verification.
 * Calls buildFastContext with a synthetic batch of 600+ orders whose emails
 * match entries already in fraud_entities. If the chunking fix works, all
 * email/IP hits should be non-zero.
 */
import { createClient } from '@supabase/supabase-js';
import { buildFastContext } from '../lib/engine/fastContext';
import type { NormalisedOrder } from '../lib/engine/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // Pull every email that exists in fraud_entities today.
  const { data: emailRows, error: e1 } = await supabase
    .from('fraud_entities')
    .select('entity_value')
    .eq('entity_type', 'email')
    .limit(1000);
  if (e1) throw e1;
  const { data: ipRows, error: e2 } = await supabase
    .from('fraud_entities')
    .select('entity_value')
    .eq('entity_type', 'ip')
    .limit(1000);
  if (e2) throw e2;
  const { data: addrRows, error: e3 } = await supabase
    .from('fraud_entities')
    .select('entity_value')
    .eq('entity_type', 'address')
    .limit(1000);
  if (e3) throw e3;

  console.log(`Loaded ${emailRows?.length} emails, ${ipRows?.length} ips, ${addrRows?.length} addrs from DB`);

  // Construct synthetic orders that carry the raw fields buildFastContext expects.
  const now = new Date();
  const orders: NormalisedOrder[] = (emailRows ?? []).map((row: { entity_value: string }, i: number) => ({
    orderId: `VERIFY-${i}`,
    orderDate: now,
    emailHash: row.entity_value,
    addressHash: null,
    phoneHash: null,
    nameHash: null,
    billingAddressHash: null,
    ipHash: null,
    deviceIdHash: null,
    cardFingerprint: null,
    cardBin: null,
    cardLast4: null,
    cardBinLast4: null,
    browserFingerprint: null,
    cookieIdHash: null,
    userAgentHash: null,
    asnHash: null,
    accountIdHash: null,
    customerNameNorm: '',
    orderTotal: 10,
    currency: 'GBP',
    orderStatus: 'completed',
    refundStatus: 'none',
    refundReason: null,
    refundDate: null,
    refundAmount: null,
    paymentMethod: null,
    groundTruthLabel: null,
    _rawEmail: row.entity_value,
    _rawIP: ipRows?.[i % (ipRows?.length ?? 1)]?.entity_value ?? null,
    _rawAddress: addrRows?.[i % (addrRows?.length ?? 1)]?.entity_value ?? null,
    _rawCardLast4: null,
  } as unknown as NormalisedOrder));

  console.log(`Calling buildFastContext with ${orders.length} synthetic orders...`);
  const ctx = await buildFastContext(orders, supabase as any);

  console.log(`\n=== RESULT ===`);
  console.log(`historicalEmailMap:   ${ctx.historicalEmailMap.size}  (expected: ${emailRows?.length})`);
  console.log(`historicalIPMap:      ${ctx.historicalIPMap.size}  (expected: up to ${ipRows?.length})`);
  console.log(`historicalAddressMap: ${ctx.historicalAddressMap.size}  (expected: up to ${addrRows?.length})`);
  console.log(`historicalCardMap:    ${ctx.historicalCardMap.size}  (expected: 0)`);
  console.log(`weightAdjustments:    ${Object.keys(ctx.signalWeightAdjustments).length}  (expected: 10)`);

  const check3 = ctx.historicalEmailMap.size === (emailRows?.length ?? 0);
  console.log(`\nCheck 3 (enrichment): ${check3 ? 'PASSED' : 'FAILED'}`);

  // --- Check 4 / 5: score a slice and verify crossMerchant fires ---
  const { scoreBatch } = await import('../lib/engine/fastScore');
  const { buildIdentityClusters } = await import('../lib/engine/identityMatching');
  const slice = orders.slice(0, 20);
  const sliceCtx = await buildFastContext(slice, supabase as any);
  const clusterMap = await buildIdentityClusters(slice, sliceCtx);
  const scored = scoreBatch(slice, sliceCtx, clusterMap);

  let crossMerchantFiredCount = 0;
  let crossMerchantScoreSum = 0;
  let maxScore = 0;
  for (const s of scored) {
    const cm = s.signals.find((sig) => sig.name === 'crossMerchant');
    if (cm?.fired) {
      crossMerchantFiredCount++;
      crossMerchantScoreSum += cm.score;
    }
    if (s.totalScore > maxScore) maxScore = s.totalScore;
  }
  console.log(`\n=== Check 4/5 ===`);
  console.log(`Scored: ${scored.length} orders`);
  console.log(`crossMerchant fired on: ${crossMerchantFiredCount}/${scored.length}`);
  console.log(`  avg crossMerchant score (when fired): ${crossMerchantFiredCount > 0 ? (crossMerchantScoreSum / crossMerchantFiredCount).toFixed(1) : 'n/a'}`);
  console.log(`Max totalScore: ${maxScore.toFixed(1)}`);
  // Sample first 3 scored results
  for (const s of scored.slice(0, 3)) {
    const cm = s.signals.find((sig) => sig.name === 'crossMerchant');
    console.log(`  ${s.order.orderId} score=${s.totalScore.toFixed(1)} tier=${s.riskTier} crossMerchantFired=${cm?.fired} crossMerchantScore=${cm?.score}`);
  }

  const check4 = crossMerchantFiredCount > 0;
  console.log(`\nCheck 4/5 (crossMerchant fires on repeat customers): ${check4 ? 'PASSED' : 'FAILED'}`);

  process.exit(check3 && check4 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
