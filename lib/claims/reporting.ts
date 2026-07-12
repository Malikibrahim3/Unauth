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
  amount_recovered?: number | null;
  recommended_payout_action?: string | null;
  followed_recommendation?: boolean | null;
  decided_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type ClaimOpsMetrics = {
  totalClaims: number;
  openClaims: number;
  inReviewOrPendingClaims: number;
  evidenceRequestedClaims: number;
  resolvedClaims: number;
  deniedClaims: number;
  approvedClaims: number;
  noActionClaims: number;
  recoveredOutcomes: number;
  lossOutcomes: number;
  recommendationCount: number;
  followedRecommendations: number;
  recommendationFollowThroughRate: number;
  valueAtRisk: number;
  amountRefunded: number;
  amountRecovered: number;
  resolutionRate: number;
  overdueClaims: number;
};

function outcomeTimestamp(row: ClaimOutcomeReportRow): string {
  return row.updated_at ?? row.decided_at ?? row.created_at ?? '';
}

export function latestOutcomeByClaim(outcomes: ClaimOutcomeReportRow[]) {
  const sorted = outcomes.toSorted((a, b) => outcomeTimestamp(b).localeCompare(outcomeTimestamp(a)));
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
  const latest = claims.flatMap((claim) => { const v = latestOutcomes.get(claim.id); return v ? [v] : []; }) as ClaimOutcomeReportRow[];
  const approvedDecisions = new Set(['approved', 'full_refund', 'partial_refund']);
  const deniedDecisions = new Set(['denied', 'no_action']);
  const recommendationRows = latest.filter((row) => row.followed_recommendation != null);

  const isResolvedStatus = (status: string | null | undefined): boolean =>
    status === 'resolved' || isFinalClaimStatus(status);

  return {
    totalClaims: claims.length,
    openClaims: claims.filter((claim) => claim.status === 'open').length,
    inReviewOrPendingClaims: claims.filter((claim) => ['under_review', 'evidence_requested', 'pending', 'escalated'].includes(claim.status)).length,
    evidenceRequestedClaims: claims.filter((claim) => claim.status === 'evidence_requested').length,
    resolvedClaims: claims.filter((claim) => isResolvedStatus(claim.status)).length,
    deniedClaims: latest.filter((row) => deniedDecisions.has(row.decision ?? '')).length,
    approvedClaims: latest.filter((row) => approvedDecisions.has(row.decision ?? '')).length,
    noActionClaims: latest.filter((row) => row.decision === 'no_action').length,
    recoveredOutcomes: latest.filter((row) => ['recovered', 'chargeback_won'].includes(row.outcome ?? '')).length,
    lossOutcomes: latest.filter((row) => ['loss', 'chargeback_lost'].includes(row.outcome ?? '')).length,
    recommendationCount: recommendationRows.length,
    followedRecommendations: recommendationRows.filter((row) => row.followed_recommendation === true).length,
    recommendationFollowThroughRate: recommendationRows.length > 0
      ? recommendationRows.filter((row) => row.followed_recommendation === true).length / recommendationRows.length
      : 0,
    valueAtRisk: claims.reduce((sum, claim) => sum + (Number(claim.amount_at_risk) || 0), 0),
    amountRefunded: latest.reduce((sum, row) => sum + (Number(row.amount_refunded) || 0), 0),
    amountRecovered: latest.reduce((sum, row) => sum + (Number(row.amount_recovered) || 0), 0),
    resolutionRate: claims.length > 0 ? claims.filter((claim) => isResolvedStatus(claim.status)).length / claims.length : 0,
    overdueClaims: claims.filter((claim) => isActiveClaimStatus(claim.status) && getClaimSlaState(claim, now).state === 'overdue').length,
  };
}
