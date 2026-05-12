/**
 * Customer adapter — converts the legacy `CustomerIntelligencePanel` API shape
 * (from `/api/customers/[id]`) into the canonical `CustomerIntelligence` type
 * defined in `types/customer.ts`.
 *
 * Do NOT import this on the server — it runs in the browser via the drawer's
 * fetch hook and on the full-page client component.
 */

import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import type { CustomerIntelligence, Evidence, Transaction, SharedSignalGroup } from '@/types/customer';
import type { SignalType } from '@/components/ui/SignalBadge';
import { scoreToGrade } from '@/lib/confidence';
import { scoreToRiskLevel } from '@/components/ui/RiskScoreBadge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0] ?? '')
      .join('')
      .toUpperCase();
  }
  return (email[0] ?? '?').toUpperCase();
}

/** Best-effort: map fraud_flags strings to known SignalType values */
function flagsToSignalTypes(flags: string[]): SignalType[] {
  const MAP: Record<string, SignalType> = {
    shared_email:              'shared_email',
    shared_phone:              'shared_phone',
    shared_address:            'shared_address',
    shared_card:               'shared_card',
    shared_account_id:         'shared_account_id',
    shared_ip:                 'shared_ip',
    shared_device:             'shared_device',
    refund_velocity:           'refund_velocity',
    chargeback_after_delivery: 'chargeback_after_delivery',
    item_not_received_repeat:  'item_not_received_repeat',
    address_mismatch:          'address_mismatch',
    name_variant:              'name_variant',
    behavioral_anomaly:        'behavioral_anomaly',
  };
  return flags
    .map((f) => MAP[f.toLowerCase().replace(/ /g, '_')] ?? null)
    .filter((s): s is SignalType => s !== null);
}

/** Derive an explanation narrative from API data */
function deriveRationale(panel: CustomerIntelligencePanel): string {
  const { profile } = panel;
  const flags = Array.isArray(profile.fraud_flags) ? profile.fraud_flags : [];
  const refundRate = ((profile.refund_rate ?? 0) * 100).toFixed(0);
  if (flags.length === 0) {
    return `This customer has a risk score of ${profile.risk_score} and a ${refundRate}% refund rate across ${profile.total_orders} orders.`;
  }
  const topFlag = flags[0].replace(/_/g, ' ');
  return `This customer shows ${topFlag} and a ${refundRate}% refund rate across ${profile.total_orders} orders. Manual review is recommended.`;
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export function adaptCustomerIntelligence(panel: CustomerIntelligencePanel): CustomerIntelligence {
  const { profile, orderHistory, linkedAccounts, narrative } = panel;
  const score = profile.risk_score;
  const grade = scoreToGrade(score);
  const riskLevel = scoreToRiskLevel(score);
  const primaryEmail = profile.primary_email ?? profile.emails[0] ?? '';
  const primaryName = profile.names[0] ?? null;

  // ---------- Evidence -------------------------------------------------------
  const evidence: Evidence[] = (profile.fraud_flags ?? []).map((flag, i) => ({
    id: `flag-${i}`,
    signalType: (flagsToSignalTypes([flag])[0] ?? 'behavioral_anomaly') as SignalType,
    strength: i === 0 ? 'strong' : i < 3 ? 'moderate' : 'weak',
    headline: flag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    detail: `Detected during analysis of ${profile.total_orders} transactions.`,
    metadata: [],
  }));

  // ---------- Transactions ---------------------------------------------------
  const transactions: Transaction[] = orderHistory.map((order) => ({
    id: order.orderId,
    date: order.orderDate ?? order.processedAt,
    amount: order.orderValue ?? 0,
    currency: 'GBP',
    emailUsed: order.email ?? '',
    nameUsed: order.name ?? null,
    refund: {
      status: order.refundStatus === 'refunded' || order.returnRequested ? 'full'
            : order.refundStatus === 'partial_refund' ? 'partial'
            : 'none',
      amount: order.refundAmount ?? 0,
      reason: order.refundReason ?? null,
    },
    chargeback: {
      filed: order.chargebackFiled,
      date: order.chargebackDate ?? undefined,
      reason: order.chargebackReasonCode ?? undefined,
    },
    delivery: { status: 'delivered' },
    riskScore: order.fraudScore,
    matchedSignals: flagsToSignalTypes(order.fraudFlags),
  }));

  // ---------- Shared signals (derived from linked accounts) ------------------
  const sharedSignals: SharedSignalGroup[] = linkedAccounts.map((la) => ({
    signalType: (flagsToSignalTypes(la.matchReasons)[0] ?? 'shared_email') as SignalType,
    strength: la.confidence >= 0.8 ? 'strong' : la.confidence >= 0.5 ? 'moderate' : 'weak',
    count: 1,
    values: [{ value: la.entityValue, usedByIdentityIds: [] }],
  }));

  // ---------- Timeline (from identity timeline) ------------------------------
  const timeline = (panel.identityTimeline ?? []).map((entry) => ({
    id: `tl-${entry.date}-${entry.field}`,
    timestamp: entry.date,
    type: (entry.field === 'email' ? 'email_change'
         : entry.field === 'address' ? 'address_change'
         : 'account_change') as import('@/components/ui/Timeline').TimelineEventType,
    title: `${entry.field.charAt(0).toUpperCase() + entry.field.slice(1)} ${entry.isVariant ? 'variant' : 'change'}`,
    description: entry.value,
    severity: entry.isVariant ? ('warning' as const) : ('info' as const),
  }));

  // ---------- Linked identities (from linked accounts) ----------------------
  const linkedIdentities: CustomerIntelligence['linkedIdentities'] = linkedAccounts.map((la) => ({
    id: la.entityValue,
    name: null,
    emails: la.entityType === 'email' ? [la.entityValue] : [],
    phones: la.entityType === 'phone' ? [la.entityValue] : [],
    addresses: [],
    accountIds: la.entityType === 'account_id' ? [la.entityValue] : [],
    cardSignals: la.entityType === 'card_last4' ? [{ last4: la.entityValue }] : [],
    confidence: { grade: scoreToGrade(la.confidence * 100), score: Math.round(la.confidence * 100) },
    linkedBy: flagsToSignalTypes(la.matchReasons),
  }));

  // ---------- Recommendation ------------------------------------------------
  const action: CustomerIntelligence['recommendation']['action'] =
    riskLevel === 'critical' ? 'block'
    : riskLevel === 'high'     ? 'review'
    : riskLevel === 'medium'   ? 'watch'
    : 'allow';

  const rationale = narrative || deriveRationale(panel);

  return {
    id: profile.id,
    primary: {
      name: primaryName,
      email: primaryEmail,
      avatarInitials: deriveInitials(primaryName, primaryEmail),
    },
    confidence: { grade, score },
    risk: { level: riskLevel, score },
    recommendation: {
      action,
      confidence: grade,
      rationale,
      supportingEvidenceIds: evidence.slice(0, 3).map((e) => e.id),
      falsePositiveRisk: {
        level: 'medium',
        contradictingEvidenceIds: [],
        explanation: 'This customer may have experienced genuine issues with delivery or product quality. Consider reviewing order history before taking action.',
      },
    },
    metrics: {
      totalOrderValue: transactions.reduce((s, t) => s + t.amount, 0),
      totalRefundedValue: transactions.reduce((s, t) => s + t.refund.amount, 0),
      chargebackCount: profile.total_chargebacks,
      linkedIdentityCount: linkedAccounts.length,
      linkedTransactionCount: transactions.length,
      refundRate: profile.refund_rate ?? 0,
      refundCount: profile.total_refund_claims,
    },
    whyFlagged: {
      headline: `${profile.risk_level?.toUpperCase()} risk profile with ${profile.total_refund_claims} refund claims.`,
      bullets: evidence.slice(0, 6).map((e) => ({ signalType: e.signalType, text: e.headline })),
    },
    linkedIdentities,
    evidence,
    transactions,
    refundHistory: {
      count: profile.total_refund_claims,
      totalAmount: transactions.reduce((s, t) => s + t.refund.amount, 0),
      rate: profile.refund_rate ?? 0,
      topReasons: [],
      timingNote: profile.avg_claim_days != null
        ? `Average claim filed ${profile.avg_claim_days} days after order.`
        : undefined,
    },
    chargebackHistory: {
      count: profile.total_chargebacks,
      totalAmount: transactions.filter((t) => t.chargeback.filed).reduce((s, t) => s + t.amount, 0),
      items: transactions
        .filter((t) => t.chargeback.filed)
        .map((t) => ({
          date: t.chargeback.date ?? t.date,
          orderId: t.id,
          reason: t.chargeback.reason,
          status: 'filed',
        })),
    },
    sharedSignals,
    timeline,
    status: 'open',
    firstSeen: profile.first_seen,
    lastSeen: profile.last_seen,
  };
}
