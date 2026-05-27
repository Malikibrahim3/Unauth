import { ACTIVE_CLAIM_STATUSES, getClaimSlaState, type ClaimAgeInput } from './sla';

const SLA_RANK: Record<string, number> = {
  overdue: 0,
  approaching: 1,
  normal: 2,
  resolved: 3,
};

export type PriorityClaimRow = ClaimAgeInput & {
  id: string;
  status: string;
  amount_at_risk?: number | null;
};

/** Pick the highest-priority claim for review: preferred id, then active SLA, then value, then age. */
export function pickPriorityClaim<T extends PriorityClaimRow>(
  claims: T[],
  preferredId?: string | null,
): T | null {
  if (claims.length === 0) return null;
  if (preferredId) {
    const preferred = claims.find((claim) => claim.id === preferredId);
    if (preferred) return preferred;
  }

  const active = claims.filter((claim) =>
    (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status),
  );
  const pool = active.length > 0 ? active : claims;

  return [...pool].sort((a, b) => {
    const slaA = getClaimSlaState(a);
    const slaB = getClaimSlaState(b);
    const rankA = SLA_RANK[slaA.state] ?? 9;
    const rankB = SLA_RANK[slaB.state] ?? 9;
    if (rankA !== rankB) return rankA - rankB;

    const riskA = Number(a.amount_at_risk) || 0;
    const riskB = Number(b.amount_at_risk) || 0;
    if (riskB !== riskA) return riskB - riskA;

    const ageA = new Date(a.submitted_at ?? a.created_at ?? 0).getTime();
    const ageB = new Date(b.submitted_at ?? b.created_at ?? 0).getTime();
    return ageA - ageB;
  })[0];
}
