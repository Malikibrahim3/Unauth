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

    expect(computeAuditSummary(rows)).toMatchObject({
      definite: 1,
      probable: 1,
      possible: 1,
      weak: 1,
      flaggedTransactions: 4,
      ungraded: 1,
      linkedClusters: 3,
      valueAtRisk: 185,
      estimatedExposure: 150,
    });
  });
});
