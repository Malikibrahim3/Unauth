import { computeAuditSummary } from '../../lib/analysis/auditSummary';

describe('blind UI summary expectations', () => {
  test('summary derives counts from identity fields, not stale risk fields', () => {
    const rows = [
      { identity_confidence_grade: 'definite', order_value: 100, cluster_id: 'c1' },
      { identity_confidence_grade: 'probable', order_value: 50, cluster_id: 'c1' },
      { identity_confidence_grade: 'possible', order_value: 25, cluster_id: 'c2' },
      { identity_confidence_grade: 'weak', order_value: 10, cluster_id: 'c3' },
      { identity_confidence_grade: null, order_value: 999, cluster_id: null },
    ];

    // Reviewable/flagged metrics count only the ACTIONABLE grades (definite +
    // probable); possible/weak are visible but excluded from flagged counts,
    // value-at-risk, and linked-cluster counts.
    //   flaggedTransactions = definite(1) + probable(1) = 2
    //   valueAtRisk = 100 (definite) + 50 (probable) = 150
    //   linkedClusters = distinct clusters among reviewable rows = {c1} = 1
    expect(computeAuditSummary(rows)).toMatchObject({
      definite: 1,
      probable: 1,
      possible: 1,
      weak: 1,
      flaggedTransactions: 2,
      ungraded: 1,
      linkedClusters: 1,
      valueAtRisk: 150,
      estimatedExposure: 150,
    });
  });
});
