/**
 * Pure summary calculation for audit results pages.
 * All metrics are derived from `identity_confidence_grade` and related fields —
 * NOT from the legacy `risk_level` / `match_score` columns.
 */

export interface AuditRow {
  identity_confidence_grade: string | null;
  order_value: number | null;
  cluster_id: string | null;
  /** Two-tier model: set only for definite (confirmed) rows. */
  confirmed_identity_id?: string | null;
  match_status?: string | null;
}

export interface GradeCounts {
  definite: number;
  probable: number;
  possible: number;
  weak: number;
}

export interface AuditSummary extends GradeCounts {
  /** Rows with likely/definite same-person identity evidence */
  flaggedTransactions: number;
  /** Rows where identity_confidence_grade IS NULL */
  ungraded: number;
  /** Unique confirmed/likely identity clusters */
  linkedClusters: number;
  /** Sum of order_value for likely/definite identity links */
  valueAtRisk: number;
  /** Sum of order_value for probable + definite rows */
  estimatedExposure: number;
}

export function isReviewableIdentityMatch(row: Pick<AuditRow, 'identity_confidence_grade' | 'match_status'>): boolean {
  const grade = row.identity_confidence_grade?.toLowerCase() ?? null;
  const status = row.match_status?.toLowerCase() ?? null;
  return grade === 'definite' || grade === 'probable' || status === 'definite' || status === 'probable';
}

export function computeAuditSummary(rows: AuditRow[]): AuditSummary {
  const counts: GradeCounts = { definite: 0, probable: 0, possible: 0, weak: 0 };
  let ungraded = 0;
  let valueAtRisk = 0;
  let estimatedExposure = 0;
  let flaggedTransactions = 0;
  const clusters = new Set<string>();

  for (const row of rows) {
    const g = row.identity_confidence_grade?.toLowerCase() ?? null;

    if (g === 'definite') counts.definite++;
    else if (g === 'probable') counts.probable++;
    else if (g === 'possible') counts.possible++;
    else if (g === 'weak') counts.weak++;
    else ungraded++;

    if (!isReviewableIdentityMatch(row)) continue;

    flaggedTransactions++;
    valueAtRisk += row.order_value ?? 0;
    estimatedExposure += row.order_value ?? 0;

    // Possible/candidate evidence is visible, but it is not treated as a
    // linked identity for review counts. Use confirmed_identity_id when
    // available, otherwise fall back to the cluster id for likely links.
    const clusterId = row.confirmed_identity_id ?? row.cluster_id;
    if (clusterId) clusters.add(clusterId);
  }

  return {
    ...counts,
    flaggedTransactions,
    ungraded,
    linkedClusters: clusters.size,
    valueAtRisk,
    estimatedExposure,
  };
}
