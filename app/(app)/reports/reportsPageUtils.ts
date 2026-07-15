import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { RecoveryCase } from '@/lib/recoveries/types';
import { RECOVERY_OWNER_LABELS, RECOVERY_STATUS_LABELS } from '@/lib/recoveries/types';
import type {
  ClaimRow,
  ClaimTypeBreakdown,
  OutcomeBreakdown,
  OutcomeRow,
  PartnerPerformanceRow,
  RecoveryMetrics,
  RecoveryStatusBreakdown,
} from '@/app/(app)/reports/reportsPageTypes';

/**
 * State-aware "finish setup" copy for payout-control reports. Mirrors the
 * dashboard CTA so a data-present merchant sees existing context plus the
 * right next step, never a dead empty gate.
 */
export function liveSetupCta(connection: ConnectionState): { title: string; body: string; label: string } | null {
  if (connection.bothConnected) return null;
  if (connection.orderSourceOnlyConnected) {
    return {
      title: 'Connect your helpdesk to complete payout reporting',
      body: 'Order data is flowing. Add your helpdesk to report on support payout cases, evidence gaps, decisions, and outcomes.',
      label: 'Connect helpdesk',
    };
  }
  if (connection.helpdeskOnlyConnected) {
    return {
      title: 'Connect an order source to complete payout reporting',
      body: 'Support cases are flowing from your helpdesk. Add an order source to attach order value, exposure, fulfillment evidence, and recovery context.',
      label: 'Connect order source',
    };
  }
  return {
    title: 'Connect an order source and helpdesk for payout reporting',
    body: 'Reports combine store orders, support cases, evidence, decisions, and recoveries. Connect both sources to monitor new payout work as it happens.',
    label: 'Connect sources',
  };
}

const CASE_REASON_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  item_not_received: 'Item not received',
  inr: 'Item not received',
  missing_item: 'Missing item',
  damaged: 'Damaged item',
  damaged_item: 'Damaged item',
  wrong_item: 'Wrong item',
  late_delivery: 'Late delivery',
  refund_request: 'Refund request',
  reship_request: 'Reship request',
  replacement_request: 'Replacement request',
  returnless_refund: 'Returnless refund',
  store_credit_request: 'Store credit request',
  chargeback: 'Chargeback',
  chargeback_related: 'Chargeback-related',
  policy_exception: 'Policy exception',
  supplier_defect: 'Supplier defect',
  warehouse_error: 'Warehouse error',
  carrier_issue: 'Carrier issue',
  other: 'Other',
};

const REQUESTED_ACTION_LABELS: Record<string, string> = {
  refund: 'Refund',
  partial_refund: 'Partial refund',
  reship: 'Reship',
  replacement: 'Replacement',
  store_credit: 'Store credit',
  discount: 'Discount',
  return_label: 'Return label',
  investigation: 'Investigation',
  deny: 'Deny',
  manual_review: 'Manual review',
  unknown: 'Unknown',
};

const OUTCOME_DECISION_LABELS: Record<string, string> = {
  approved: 'Approved payout',
  denied: 'Denied under policy',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'Chargeback disputed',
  escalated: 'Escalated',
  no_action: 'No payout',
  other: 'Other',
};

function labelFor(map: Record<string, string>, key: string | null | undefined, fallback = 'Other'): string {
  if (!key) return fallback;
  return map[key] ?? key.replace(/_/g, ' ');
}

export function payoutExposureForClaim(claim: ClaimRow): number {
  const explicit = Number(claim.total_estimated_loss ?? claim.amount_at_risk ?? 0);
  if (explicit > 0) return explicit;
  return [
    claim.refund_amount,
    claim.replacement_item_value,
    claim.replacement_shipping_cost,
    claim.discount_amount,
    claim.store_credit_amount,
  ].reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
}

export function buildClaimTypeBreakdown(claims: ClaimRow[]): ClaimTypeBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const claim of claims) {
    const type = claim.claim_type ?? 'other';
    const existing = map.get(type) ?? { count: 0, value: 0 };
    map.set(type, { count: existing.count + 1, value: existing.value + payoutExposureForClaim(claim) });
  }
  return Array.from(map.entries())
    .map(([type, data]) => ({ type, label: labelFor(CASE_REASON_LABELS, type), ...data }))
    .sort((a, b) => b.count - a.count);
}

export function buildRequestedActionBreakdown(claims: ClaimRow[]): ClaimTypeBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const claim of claims) {
    const type = claim.requested_action ?? 'unknown';
    const existing = map.get(type) ?? { count: 0, value: 0 };
    map.set(type, { count: existing.count + 1, value: existing.value + payoutExposureForClaim(claim) });
  }
  return Array.from(map.entries())
    .map(([type, data]) => ({ type, label: labelFor(REQUESTED_ACTION_LABELS, type, 'Unknown'), ...data }))
    .sort((a, b) => b.count - a.count);
}

export function buildOutcomeBreakdown(outcomes: OutcomeRow[]): OutcomeBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const outcome of outcomes) {
    const decision = outcome.decision ?? 'other';
    const existing = map.get(decision) ?? { count: 0, value: 0 };
    map.set(decision, { count: existing.count + 1, value: existing.value + (Number(outcome.amount_refunded) || 0) });
  }
  return Array.from(map.entries())
    .map(([decision, data]) => ({ decision, label: labelFor(OUTCOME_DECISION_LABELS, decision), ...data }))
    .sort((a, b) => b.count - a.count);
}

function isRecoveryOpen(status: RecoveryCase['status']): boolean {
  return !['approved', 'partially_approved', 'rejected', 'paid', 'closed_unrecoverable'].includes(status);
}

function recoveryOpenValue(recoveryCase: RecoveryCase): number {
  if (!isRecoveryOpen(recoveryCase.status)) return 0;
  return Number(recoveryCase.eligible_loss_amount ?? recoveryCase.estimated_recoverable_max ?? recoveryCase.merchant_loss_amount ?? 0) || 0;
}

export function buildRecoveryMetrics(recoveryCases: RecoveryCase[]): RecoveryMetrics {
  const terminal = recoveryCases.filter((recoveryCase) =>
    ['approved', 'partially_approved', 'rejected', 'paid', 'closed_unrecoverable'].includes(recoveryCase.status),
  );
  const wins = terminal.filter((recoveryCase) => ['approved', 'partially_approved', 'paid'].includes(recoveryCase.status)).length;
  return {
    totalCases: recoveryCases.length,
    openCases: recoveryCases.filter((recoveryCase) => isRecoveryOpen(recoveryCase.status)).length,
    evidenceNeeded: recoveryCases.filter((recoveryCase) => recoveryCase.status === 'evidence_needed' || recoveryCase.evidence_missing.length > 0).length,
    chaseDue: recoveryCases.filter((recoveryCase) => recoveryCase.status === 'chase_due').length,
    submittedCases: recoveryCases.filter((recoveryCase) => ['submitted', 'waiting_response', 'chase_due'].includes(recoveryCase.status)).length,
    approvedCases: recoveryCases.filter((recoveryCase) => ['approved', 'partially_approved', 'paid'].includes(recoveryCase.status)).length,
    rejectedCases: recoveryCases.filter((recoveryCase) => ['rejected', 'closed_unrecoverable'].includes(recoveryCase.status)).length,
    recoveredAmount: recoveryCases.reduce((sum, recoveryCase) => sum + (Number(recoveryCase.amount_recovered) || 0), 0),
    unrecoveredAmount: recoveryCases.reduce((sum, recoveryCase) => {
      const loss = Number(recoveryCase.merchant_loss_amount) || 0;
      const recovered = Number(recoveryCase.amount_recovered) || 0;
      return sum + Math.max(loss - recovered, 0);
    }, 0),
    openRecoveryValue: recoveryCases.reduce((sum, recoveryCase) => sum + recoveryOpenValue(recoveryCase), 0),
    estimatedRecoverableMax: recoveryCases.reduce((sum, recoveryCase) => sum + (Number(recoveryCase.estimated_recoverable_max) || 0), 0),
    winRate: terminal.length > 0 ? wins / terminal.length : 0,
  };
}

export function buildRecoveryStatusBreakdown(recoveryCases: RecoveryCase[]): RecoveryStatusBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const recoveryCase of recoveryCases) {
    const existing = map.get(recoveryCase.status) ?? { count: 0, value: 0 };
    map.set(recoveryCase.status, {
      count: existing.count + 1,
      value: existing.value + recoveryOpenValue(recoveryCase),
    });
  }
  return Array.from(map.entries())
    .map(([status, data]) => ({
      status,
      label: RECOVERY_STATUS_LABELS[status as RecoveryCase['status']] ?? status,
      ...data,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildPartnerPerformance(recoveryCases: RecoveryCase[]): PartnerPerformanceRow[] {
  const map = new Map<string, PartnerPerformanceRow>();
  for (const recoveryCase of recoveryCases) {
    const partnerId = recoveryCase.partner_id ?? `owner:${recoveryCase.owner_type}`;
    const partnerName = recoveryCase.partner?.name
      ?? RECOVERY_OWNER_LABELS[recoveryCase.owner_type]
      ?? recoveryCase.owner_type;
    const existing = map.get(partnerId) ?? {
      partnerId,
      partnerName,
      ownerType: recoveryCase.owner_type,
      cases: 0,
      recoveredAmount: 0,
      openRecoveryValue: 0,
    };
    existing.cases += 1;
    existing.recoveredAmount += Number(recoveryCase.amount_recovered) || 0;
    existing.openRecoveryValue += recoveryOpenValue(recoveryCase);
    map.set(partnerId, existing);
  }
  return Array.from(map.values())
    .sort((a, b) => (b.recoveredAmount + b.openRecoveryValue) - (a.recoveredAmount + a.openRecoveryValue));
}

type NumericClaimMetricKey = {
  [K in keyof ClaimOpsMetrics]: ClaimOpsMetrics[K] extends number ? K : never;
}[keyof ClaimOpsMetrics];

export function delta(current: number, prior: number | null | undefined): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new vs prior period' : null;
  // "down 100%" against a quiet period reads as noise — say it plainly instead.
  if (current === 0) return 'none this period';
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `up ${pct}%` : `down ${Math.abs(pct)}%`;
}

function deltaCurrency(current: number, prior: number | null | undefined, currency = 'USD'): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new exposure vs prior period' : null;
  const diff = Math.round(current - prior);
  if (diff === 0) return null;
  const amount = formatCurrencyNullable(Math.abs(diff), currency);
  return diff > 0 ? `+${amount} vs prior` : `-${amount} vs prior`;
}

export function metricHint(
  base: string,
  current: number,
  priorMetrics: ClaimOpsMetrics | null,
  priorKey: NumericClaimMetricKey,
): string {
  const change = priorMetrics ? delta(current, priorMetrics[priorKey]) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}

export function metricHintCurrency(
  base: string,
  current: number,
  priorMetrics: ClaimOpsMetrics | null,
  currency = 'USD',
): string {
  const change = priorMetrics ? deltaCurrency(current, priorMetrics.valueAtRisk, currency) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}
