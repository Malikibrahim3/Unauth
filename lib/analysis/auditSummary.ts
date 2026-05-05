/**
 * Pure summary calculation for audit results pages.
 * All metrics are derived from `identity_confidence_grade` and related fields —
 * NOT from the legacy `risk_level` / `match_score` columns.
 */

export interface AuditRow {
  identity_confidence_grade: string | null;
  order_value: number | null;
  cluster_id: string | null;
}

export interface GradeCounts {
  definite: number;
  probable: number;
  possible: number;
  weak: number;
}

export interface AuditSummary extends GradeCounts {
  /** Rows where identity_confidence_grade IS NOT NULL */
  flaggedTransactions: number;
  /** Rows where identity_confidence_grade IS NULL */
  ungraded: number;
  /** Unique cluster_ids across graded rows */
  linkedClusters: number;
  /** Sum of order_value for all graded rows */
  valueAtRisk: number;
  /** Sum of order_value for probable + definite rows */
  estimatedExposure: number;
}

export function computeAuditSummary(rows: AuditRow[]): AuditSummary {
  const counts: GradeCounts = { definite: 0, probable: 0, possible: 0, weak: 0 };
  let ungraded = 0;
  let valueAtRisk = 0;
  let estimatedExposure = 0;
  const clusters = new Set<string>();

  for (const row of rows) {
    const g = row.identity_confidence_grade?.toLowerCase() ?? null;

    if (g === 'definite') counts.definite++;
    else if (g === 'probable') counts.probable++;
    else if (g === 'possible') counts.possible++;
    else if (g === 'weak') counts.weak++;
    else { ungraded++; continue; }

    // Below here: row is graded
    valueAtRisk += row.order_value ?? 0;
    if (g === 'probable' || g === 'definite') {
      estimatedExposure += row.order_value ?? 0;
    }
    if (row.cluster_id) clusters.add(row.cluster_id);
  }

  const flaggedTransactions =
    counts.definite + counts.probable + counts.possible + counts.weak;

  return {
    ...counts,
    flaggedTransactions,
    ungraded,
    linkedClusters: clusters.size,
    valueAtRisk,
    estimatedExposure,
  };
}
