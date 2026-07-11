/**
 * Aggregates operational payout / recovery dashboard metrics (MVP steering §18).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { listRecoveryCases } from '@/lib/recoveries/store';
import type { RecoveryCaseStatus } from '@/lib/recoveries/types';
import { LOSS_ATTRIBUTION_DISPLAY, type LossAttributionLabel } from '@/lib/payouts/types';
import { dominantCurrency } from '@/lib/utils/format';

const CLOSED_RECOVERY: RecoveryCaseStatus[] = ['paid', 'closed_unrecoverable', 'rejected'];

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
  /** Most common currency across the merchant's support payout cases (fallback USD). */
  displayCurrency: string;
};

function ownerLabel(key: string | null): string {
  if (!key) return 'Unknown';
  return LOSS_ATTRIBUTION_DISPLAY[key as LossAttributionLabel] ?? key.replace(/_/g, ' ');
}

export async function loadPayoutDashboardMetrics(
  client: SupabaseClient,
  merchantId: string,
): Promise<PayoutDashboardMetrics> {
  const [openClaimsRes, allClaimIdsRes, recoveryCases, financialRes] = await Promise.all([
    client
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        'id,amount_at_risk,currency,recoverability,loss_attribution,recommended_payout_action,status',
      )
      .eq('merchant_id', merchantId)
      // Must use only valid claim_status enum values; an invalid value (e.g. the
      // legacy 'under_review'/'evidence_requested') errors the whole query and
      // silently zeroes every payout-exposure metric on the dashboard.
      .in('status', [...ACTIVE_CLAIM_STATUSES]),
    client.from(TABLES.MERCHANT_CLAIMS).select('id').eq('merchant_id', merchantId),
    listRecoveryCases(client, merchantId).catch(() => []),
    client.from(TABLES.CASE_FINANCIAL_SUMMARIES).select('*').eq('merchant_id', merchantId),
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
    currency: string | null;
    recoverability: string | null;
    loss_attribution: string | null;
    recommended_payout_action: string | null;
    status: string;
  }>;

  const financial = (financialRes.data ?? []) as Array<{
    support_payout_case_id: string; currency: string; exposed_minor: number;
    recoverable_minor: number; recovered_minor: number; prevented_minor: number; written_off_minor: number;
  }>;
  // Ledger currencies are authoritative; source case/recovery currency is only a fallback.
  const displayCurrency = dominantCurrency(financial, dominantCurrency(openClaims, dominantCurrency(recoveryCases)));

  const activeClaimIds = new Set(openClaims.map((claim) => claim.id));
  const displaySummaries = financial.filter((row) => row.currency.toUpperCase() === displayCurrency);
  const summaryByCase = new Map(displaySummaries.map((row) => [row.support_payout_case_id, row]));
  const payoutExposureOpen = displaySummaries
    .filter((row) => activeClaimIds.has(row.support_payout_case_id))
    .reduce((sum, row) => sum + row.exposed_minor / 100, 0);

  const recoveryCasesOpen = recoveryCases.filter((c) => !CLOSED_RECOVERY.includes(c.status)).length;

  const recoverableIdentified = displaySummaries.reduce((sum, row) => sum + row.recoverable_minor / 100, 0);

  const amountRecovered = displaySummaries.reduce((sum, row) => sum + row.recovered_minor / 100, 0);

  const rejectedUnrecoverableAmount = displaySummaries.reduce((sum, row) => sum + row.written_off_minor / 100, 0);

  const preventionOnlyExposure = displaySummaries.reduce((sum, row) => sum + row.prevented_minor / 100, 0);

  const policyLeakageByOutcome = outcomes
    .filter(
      (o) =>
        o.followed_recommendation === false &&
        o.recommended_payout_action === 'deny_under_policy' &&
        o.decision === 'approved',
    )
    .reduce((sum, outcome) => sum + ((summaryByCase.get(outcome.claim_id)?.exposed_minor ?? 0) / 100), 0);

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
      exposure: cur.exposure + ((summaryByCase.get(c.id)?.exposed_minor ?? 0) / 100),
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
    displayCurrency,
  };
}
