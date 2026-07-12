/**
 * Phase 12 scheduled reconciliation.
 *
 * Beyond live event notifications, Unauth periodically compares its records with
 * connected sources to catch missed/delayed events and drift. Reconciliation is
 * safe and idempotent: detectors either apply a confirmed update through the normal
 * projection path or raise a de-duplicated exception — they never create duplicate
 * cases or re-apply financial facts.
 *
 * This module provides the sweep framework and its detectors. Each detector returns
 * how many discrepancies it found and how many exceptions it raised (new vs. already
 * present), so a re-run over unchanged data reports zero new exceptions.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { raiseException } from '@/lib/exceptions/store';

export type DetectorResult = { detector: string; found: number; raised: number };
export type ReconcileResult = { merchantId: string; detectors: DetectorResult[]; exceptionsRaised: number };

const REFUND_SCAN_LIMIT = 500;

/**
 * Detector: a completed refund exists in the source but no support payout case
 * covers its order — money left the business that Unauth is not tracking. Raised as
 * a probable `unmatched_refund` exception (the merchant confirms whether it needs a
 * case). Idempotent per refund via the dedup key.
 */
export async function detectUnmatchedRefunds(client: SupabaseClient, merchantId: string): Promise<DetectorResult> {
  const { data: refunds, error } = await client
    .from(TABLES.SOURCE_REFUNDS)
    .select('id,source_order_id,amount,currency,refunded_at')
    .eq('merchant_id', merchantId)
    .not('source_order_id', 'is', null)
    .order('refunded_at', { ascending: false })
    .limit(REFUND_SCAN_LIMIT);
  if (error) throw new Error(`reconcile_refunds_read_failed: ${error.message}`);
  const rows = (refunds ?? []) as Array<{ id: string; source_order_id: string; amount: number | null; currency: string | null; refunded_at: string | null }>;
  if (rows.length === 0) return { detector: 'unmatched_refunds', found: 0, raised: 0 };

  const orderIds = [...new Set(rows.map((r) => r.source_order_id))];
  const { data: cases, error: caseError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('source_order_id')
    .eq('merchant_id', merchantId)
    .in('source_order_id', orderIds);
  if (caseError) throw new Error(`reconcile_cases_read_failed: ${caseError.message}`);
  const coveredOrders = new Set((cases ?? []).map((c: { source_order_id: string | null }) => c.source_order_id).filter(Boolean));

  const unmatched = rows.filter((r) => !coveredOrders.has(r.source_order_id));
  let raised = 0;
  for (const refund of unmatched) {
    const result = await raiseException(client, merchantId, {
      exceptionType: 'unmatched_refund',
      confidence: 'probable',
      title: 'Refund with no payout case',
      detail: `A refund of ${refund.amount ?? '?'} ${refund.currency ?? ''} was recorded in the commerce source with no support payout case for its order.`.trim(),
      context: { source_order_id: refund.source_order_id, amount: refund.amount, currency: refund.currency, refunded_at: refund.refunded_at },
      subjectEntityType: 'refund',
      subjectEntityId: refund.id,
      sourceSystem: 'commerce',
      dedupKey: `reconcile:unmatched_refund:${refund.id}`,
    });
    if (result.created) raised += 1;
  }
  return { detector: 'unmatched_refunds', found: unmatched.length, raised };
}

const DETECTORS = [detectUnmatchedRefunds];

/** Run all reconciliation detectors for one merchant. */
export async function reconcileMerchant(client: SupabaseClient, merchantId: string): Promise<ReconcileResult> {
  const detectors: DetectorResult[] = [];
  for (const detector of DETECTORS) {
    detectors.push(await detector(client, merchantId));
  }
  return { merchantId, detectors, exceptionsRaised: detectors.reduce((sum, d) => sum + d.raised, 0) };
}
