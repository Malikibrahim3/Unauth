/**
 * Aggregates operational payout / recovery dashboard metrics (MVP steering §18).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { listRecoveryCases } from '@/lib/recoveries/store';
import type { RecoveryCaseStatus } from '@/lib/recoveries/types';
import { LOSS_ATTRIBUTION_DISPLAY, type LossAttributionLabel } from '@/lib/payouts/types';

const CLOSED_RECOVERY: RecoveryCaseStatus[] = ['paid', 'closed_unrecoverable', 'rejected'];
const REJECTED_RECOVERY: RecoveryCaseStatus[] = ['rejected', 'closed_unrecoverable'];

export type PayoutDashboardMetrics = {
  payoutExposureOpen: number;
  recoverableIdentified: number;
  recoveryCasesOpen: number;
  amountRecovered: number;
  rejectedUnrecoverableAmount: number;
  preventionOnlyExposure: number;
  policyLeakageExposure: number;
  chaseDue: number;
  casesMissingEvidence: number;
  topLossOwners: Array<{ owner: string; label: string; count: number; exposure: number }>;
};

function ownerLabel(key: string | null): string {
  if (!key) return 'Unknown';
  return LOSS_ATTRIBUTION_DISPLAY[key as LossAttributionLabel] ?? key.replace(/_/g, ' ');
}

export async function loadPayoutDashboardMetrics(
  client: SupabaseClient,
  merchantId: string,
): Promise<PayoutDashboardMetrics> {
  const [openClaimsRes, allClaimIdsRes, recoveryCases] = await Promise.all([
    client
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        'id,amount_at_risk,recoverability,loss_attribution,recommended_payout_action,status',
      )
      .eq('merchant_id', merchantId)
      // Must use only valid claim_status enum values — an invalid value (e.g. the
      // legacy 'under_review'/'evidence_requested') errors the whole query and
      // silently zeroes every payout-exposure metric on the dashboard.
      .in('status', [...ACTIVE_CLAIM_STATUSES]),
    client.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId),
    listRecoveryCases(client, merchantId).catch(() => []),
  ]);

  const claimIds = ((allClaimIdsRes.data ?? []) as Array<{ id: string }>).map((r) => r.id);
  let outcomes: Array<{
    claim_id: string;
    decision: string;
    followed_recommendation: boolean | null;
    recommended_payout_action: string | null;
    amount_refunded: number | null;
  }> = [];
  if (claimIds.length > 0) {
    const { data } = await client
      .from('claim_outcomes')
      .select('claim_id,decision,followed_recommendation,recommended_payout_action,amount_refunded')
      .in('claim_id', claimIds);
    outcomes = (data ?? []) as typeof outcomes;
  }

  const openClaims = (openClaimsRes.data ?? []) as Array<{
    id: string;
    amount_at_risk: number | null;
    recoverability: string | null;
    loss_attribution: string | null;
    recommended_payout_action: string | null;
    status: string;
  }>;

  const payoutExposureOpen = openClaims.reduce((s, c) => s + (c.amount_at_risk ?? 0), 0);

  const recoveryCasesOpen = recoveryCases.filter((c) => !CLOSED_RECOVERY.includes(c.status)).length;

  const recoverableIdentified = recoveryCases
    .filter((c) => !CLOSED_RECOVERY.includes(c.status))
    .reduce((s, c) => s + (c.estimated_recoverable_max ?? c.estimated_recoverable_min ?? 0), 0);

  const amountRecovered = recoveryCases.reduce((s, c) => s + (c.amount_recovered ?? 0), 0);

  const rejectedUnrecoverableAmount = recoveryCases
    .filter((c) => REJECTED_RECOVERY.includes(c.status))
    .reduce((s, c) => s + c.merchant_loss_amount, 0);

  const preventionOnlyExposure = openClaims
    .filter(
      (c) =>
        c.recoverability === 'not_recoverable' &&
        (c.loss_attribution === 'merchant_policy' || c.loss_attribution === 'failed_delivery_evidence'),
    )
    .reduce((s, c) => s + (c.amount_at_risk ?? 0), 0);

  const policyLeakageByOutcome = outcomes
    .filter(
      (o) =>
        o.followed_recommendation === false &&
        o.recommended_payout_action === 'deny_under_policy' &&
        o.decision === 'approved',
    )
    .reduce((s, o) => s + (o.amount_refunded ?? 0), 0);

  const chaseDue = recoveryCases.filter((c) => c.status === 'chase_due').length;

  const casesMissingEvidence = openClaims.filter(
    (c) =>
      c.recoverability === 'needs_more_evidence' ||
      c.status === 'evidence_needed' ||
      c.status === 'awaiting_customer_evidence' ||
      c.status === 'awaiting_carrier_response' ||
      c.status === 'awaiting_3pl_response' ||
      c.status === 'awaiting_supplier_response' ||
      c.status === 'evidence_requested',
  ).length;

  const ownerMap = new Map<string, { count: number; exposure: number }>();
  for (const c of openClaims) {
    const key = c.loss_attribution ?? 'unknown';
    const cur = ownerMap.get(key) ?? { count: 0, exposure: 0 };
    ownerMap.set(key, {
      count: cur.count + 1,
      exposure: cur.exposure + (c.amount_at_risk ?? 0),
    });
  }
  const topLossOwners = [...ownerMap.entries()]
    .map(([owner, v]) => ({ owner, label: ownerLabel(owner), ...v }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 5);

  return {
    payoutExposureOpen,
    recoverableIdentified,
    recoveryCasesOpen,
    amountRecovered,
    rejectedUnrecoverableAmount,
    preventionOnlyExposure,
    policyLeakageExposure: policyLeakageByOutcome,
    chaseDue,
    casesMissingEvidence,
    topLossOwners,
  };
}
