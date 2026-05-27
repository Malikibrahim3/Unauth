import { getClaimSlaState, isActiveClaimStatus, isFinalClaimStatus } from './sla';

export type ClaimReportRow = {
  id: string;
  status: string;
  amount_at_risk: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClaimOutcomeReportRow = {
  claim_id: string;
  decision: string | null;
  outcome: string | null;
  amount_refunded?: number | null;
  decided_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type ClaimOpsMetrics = {
  totalClaims: number;
  openClaims: number;
  inReviewOrPendingClaims: number;
  resolvedClaims: number;
  deniedClaims: number;
  approvedClaims: number;
  suspectedFraudOutcomes: number;
  legitimateOutcomes: number;
  valueAtRisk: number;
  amountRefunded: number;
  resolutionRate: number;
  overdueClaims: number;
};

function outcomeTimestamp(row: ClaimOutcomeReportRow): string {
  return row.updated_at ?? row.decided_at ?? row.created_at ?? '';
}

export function latestOutcomeByClaim(outcomes: ClaimOutcomeReportRow[]) {
  const sorted = [...outcomes].sort((a, b) => outcomeTimestamp(b).localeCompare(outcomeTimestamp(a)));
  const map = new Map<string, ClaimOutcomeReportRow>();
  for (const row of sorted) {
    if (!map.has(row.claim_id)) map.set(row.claim_id, row);
  }
  return map;
}

export function buildClaimOpsMetrics(
  claims: ClaimReportRow[],
  outcomes: ClaimOutcomeReportRow[],
  now = new Date(),
): ClaimOpsMetrics {
  const latestOutcomes = latestOutcomeByClaim(outcomes);
  const latest = claims.map((claim) => latestOutcomes.get(claim.id)).filter(Boolean) as ClaimOutcomeReportRow[];
  const approvedDecisions = new Set(['approved', 'full_refund', 'partial_refund']);
  const legitimateOutcomes = new Set(['customer_verified', 'legitimate']);

  return {
    totalClaims: claims.length,
    openClaims: claims.filter((claim) => claim.status === 'open').length,
    inReviewOrPendingClaims: claims.filter((claim) => ['under_review', 'evidence_requested', 'pending', 'escalated'].includes(claim.status)).length,
    resolvedClaims: claims.filter((claim) => isFinalClaimStatus(claim.status)).length,
    deniedClaims: latest.filter((row) => row.decision === 'denied').length,
    approvedClaims: latest.filter((row) => approvedDecisions.has(row.decision ?? '')).length,
    suspectedFraudOutcomes: latest.filter((row) => row.outcome === 'suspected_fraud').length,
    legitimateOutcomes: latest.filter((row) => legitimateOutcomes.has(row.outcome ?? '')).length,
    valueAtRisk: claims.reduce((sum, claim) => sum + (Number(claim.amount_at_risk) || 0), 0),
    amountRefunded: latest.reduce((sum, row) => sum + (Number(row.amount_refunded) || 0), 0),
    resolutionRate: claims.length > 0 ? claims.filter((claim) => isFinalClaimStatus(claim.status)).length / claims.length : 0,
    overdueClaims: claims.filter((claim) => isActiveClaimStatus(claim.status) && getClaimSlaState(claim, now).state === 'overdue').length,
  };
}
