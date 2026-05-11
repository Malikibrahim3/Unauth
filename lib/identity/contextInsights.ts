/**
 * Context Insights — merchant decision support ONLY.
 *
 * Computes refund/dispute/CE-3.0 context AFTER identity has been resolved.
 * These fields help the merchant make decisions but MUST NOT influence the
 * identity_match_score, identity_match_grade, match_status, or cluster
 * membership in any way.
 *
 * Output fields are deliberately named "context_*" to make misuse obvious.
 */

import type { LinkedCluster } from '../linker';
import type { ScorerOrder, CE3QualifyingPair } from '../scorer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextFlag {
  flag: string;
  detail: string;
  category: 'refund' | 'chargeback' | 'value' | 'velocity' | 'ce3' | 'historical';
}

export interface ContextInsightsResult {
  /** Structured context flags for UI display. */
  context_flags: ContextFlag[];
  /** Plain-English context summary for export. */
  context_summary: string | null;
  /** CE 3.0 eligibility. */
  ce3_eligible: boolean;
  /** CE 3.0 qualifying transaction pairs. */
  ce3_qualifying_transactions: CE3QualifyingPair[];
  /**
   * Recommended review reason — built from identity first, context second.
   * Callers should prefix this with their identity evidence summary.
   */
  context_review_reason: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// Context scoring functions
// ---------------------------------------------------------------------------

function assessRefundRate(orders: ScorerOrder[]): ContextFlag | null {
  const refundCount = orders.filter(
    (o) =>
      o.refund_status === 'full' ||
      o.refund_status === 'partial' ||
      o.refund_requested === true,
  ).length;
  if (orders.length === 0 || refundCount === 0) return null;

  const rate = refundCount / orders.length;
  if (rate < 0.4) return null;

  return {
    flag: 'elevated_refund_rate',
    detail: `Refund rate ${(rate * 100).toFixed(0)}% across ${orders.length} orders`,
    category: 'refund',
  };
}

function assessClaimVelocity(orders: ScorerOrder[]): ContextFlag | null {
  const claimDays: number[] = [];
  for (const o of orders) {
    const orderDate = parseDate(o.order_date);
    const refundDate = parseDate(o.refund_date);
    if (orderDate && refundDate) {
      claimDays.push(daysBetween(orderDate, refundDate));
    }
  }
  if (claimDays.length === 0) return null;
  const avg = claimDays.reduce((a, b) => a + b, 0) / claimDays.length;
  if (avg >= 7) return null;

  return {
    flag: 'fast_claim_velocity',
    detail: `Average ${avg.toFixed(1)} days to refund claim`,
    category: 'velocity',
  };
}

function assessChargebacks(orders: ScorerOrder[]): ContextFlag | null {
  const count = orders.filter((o) => o.chargeback_filed === true).length;
  if (count === 0) return null;
  return {
    flag: count >= 2 ? 'multiple_chargebacks' : 'chargeback_present',
    detail: `${count} chargeback${count > 1 ? 's' : ''} filed`,
    category: 'chargeback',
  };
}

function assessDenialThenChargeback(orders: ScorerOrder[]): ContextFlag | null {
  const instances = orders.filter(
    (o) =>
      o.chargeback_filed === true &&
      o.refund_status !== 'full',
  );
  if (instances.length === 0) return null;
  return {
    flag: 'denial_then_chargeback',
    detail: `Chargeback filed on ${instances.length} order${instances.length > 1 ? 's' : ''} without full refund`,
    category: 'chargeback',
  };
}

function assessValueEscalation(orders: ScorerOrder[]): ContextFlag | null {
  const refundOrders = orders.filter(
    (o) => o.refund_status === 'full' || o.refund_status === 'partial' || o.refund_requested === true,
  );
  if (refundOrders.length < 2) return null;

  const byValue = [...orders].sort((a, b) => b.order_total - a.order_total);
  const top2 = new Set([byValue[0]?.order_id, byValue[1]?.order_id]);

  const byDate = [...refundOrders]
    .map((o) => ({ o, d: parseDate(o.order_date) }))
    .filter((x): x is { o: ScorerOrder; d: Date } => x.d !== null)
    .sort((a, b) => b.d.getTime() - a.d.getTime());

  if (byDate.length < 2) return null;

  const last2 = new Set([byDate[0].o.order_id, byDate[1].o.order_id]);
  if ([...last2].every((id) => top2.has(id))) {
    return {
      flag: 'value_escalation',
      detail: 'Highest-value orders were among the most recent refund claims',
      category: 'value',
    };
  }
  return null;
}

function assessReasonRotation(orders: ScorerOrder[]): ContextFlag | null {
  const reasons = [
    ...new Set(
      orders
        .map((o) => o.refund_reason)
        .filter((r): r is string => !!r && r.trim().length > 0),
    ),
  ];
  if (reasons.length < 3) return null;
  return {
    flag: 'refund_reason_rotation',
    detail: `${reasons.length} distinct refund reasons: ${reasons.slice(0, 3).join(', ')}${reasons.length > 3 ? '…' : ''}`,
    category: 'refund',
  };
}

// ---------------------------------------------------------------------------
// CE 3.0
// ---------------------------------------------------------------------------

function checkCE3Eligibility(
  orders: ScorerOrder[],
): { eligible: boolean; pairs: CE3QualifyingPair[] } {
  const disputed = orders.filter((o) => o.chargeback_filed === true);
  if (disputed.length === 0) return { eligible: false, pairs: [] };

  const prior = orders.filter((o) => o.chargeback_filed !== true);
  if (prior.length < 2) return { eligible: false, pairs: [] };

  const pairs: CE3QualifyingPair[] = [];

  for (const d of disputed) {
    const dDate = parseDate(d.order_date);
    if (!dDate) continue;

    for (const p of prior) {
      const pDate = parseDate(p.order_date);
      if (!pDate || pDate >= dDate) continue;
      if (daysBetween(dDate, pDate) < 120) continue;

      const matching: string[] = [];
      if (d.device_id && p.device_id && d.device_id === p.device_id)           matching.push('device_id');
      if (d.ip_address && p.ip_address && d.ip_address === p.ip_address)       matching.push('ip_address');
      if (d.customer_email && p.customer_email && d.customer_email === p.customer_email) matching.push('email');
      if (d.shipping_address && p.shipping_address && d.shipping_address === p.shipping_address) matching.push('shipping_address');
      if (d.customer_phone && p.customer_phone && d.customer_phone === p.customer_phone) matching.push('phone');
      if (d.account_id && p.account_id && d.account_id === p.account_id)       matching.push('account_id');

      if (matching.length >= 2) {
        pairs.push({
          disputed_order_id: d.order_id,
          prior_order_id: p.order_id,
          matching_signals: matching,
        });
      }
    }
  }

  return { eligible: pairs.length > 0, pairs };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute merchant decision context for a cluster of orders.
 *
 * This function MUST only be called after identity has been resolved.
 * Its output is merchant context only — it must never feed back into
 * identity_match_score, identity_match_grade, or match_status.
 */
export function computeContextInsights(
  _cluster: LinkedCluster,
  orders: ScorerOrder[],
): ContextInsightsResult {
  if (orders.length < 2) {
    return {
      context_flags: [],
      context_summary: null,
      ce3_eligible: false,
      ce3_qualifying_transactions: [],
      context_review_reason: null,
    };
  }

  const flags: ContextFlag[] = [];

  const refundRateFlag = assessRefundRate(orders);
  if (refundRateFlag) flags.push(refundRateFlag);

  const velocityFlag = assessClaimVelocity(orders);
  if (velocityFlag) flags.push(velocityFlag);

  const chargebackFlag = assessChargebacks(orders);
  if (chargebackFlag) flags.push(chargebackFlag);

  const denialFlag = assessDenialThenChargeback(orders);
  if (denialFlag) flags.push(denialFlag);

  const escalationFlag = assessValueEscalation(orders);
  if (escalationFlag) flags.push(escalationFlag);

  const rotationFlag = assessReasonRotation(orders);
  if (rotationFlag) flags.push(rotationFlag);

  const ce3 = checkCE3Eligibility(orders);

  // Build context summary
  const contextParts: string[] = [];
  if (flags.some((f) => f.category === 'refund'))     contextParts.push('prior refund claims exist');
  if (flags.some((f) => f.category === 'chargeback')) contextParts.push('chargeback history present');
  if (flags.some((f) => f.flag === 'value_escalation')) contextParts.push('order value escalation pattern');
  if (ce3.eligible) contextParts.push('CE 3.0 qualifying transaction pair found');

  const context_summary = contextParts.length > 0
    ? `Context: ${contextParts.join('; ')}.`
    : null;

  const context_review_reason = contextParts.length > 0
    ? contextParts.join('; ')
    : null;

  return {
    context_flags: flags,
    context_summary,
    ce3_eligible: ce3.eligible,
    ce3_qualifying_transactions: ce3.pairs,
    context_review_reason,
  };
}
