import { computeAuditSummary } from '@/lib/analysis/auditSummary';

function row(grade: string | null, order_value = 100, cluster_id: string | null = null) {
  return { identity_confidence_grade: grade, order_value, cluster_id };
}

describe('computeAuditSummary', () => {
  it('counts each grade correctly', () => {
    const rows = [
      ...Array(10).fill(null).map((_, i) => row('definite', 100, `c${i}`)),
      ...Array(8).fill(null).map((_, i) => row('probable', 50, `c${i + 10}`)),
      ...Array(5).fill(null).map((_, i) => row('possible', 30, `c${i + 20}`)),
      ...Array(7).fill(null).map(() => row(null, 20, null)),
    ];
    const s = computeAuditSummary(rows);
    expect(s.definite).toBe(10);
    expect(s.probable).toBe(8);
    expect(s.possible).toBe(5);
    expect(s.weak).toBe(0);
    expect(s.ungraded).toBe(7);
  });

  it('returns flaggedTransactions = graded rows only', () => {
    const rows = [
      ...Array(10).fill(null).map(() => row('definite')),
      ...Array(8).fill(null).map(() => row('probable')),
      ...Array(5).fill(null).map(() => row('possible')),
      ...Array(7).fill(null).map(() => row(null)),
    ];
    const s = computeAuditSummary(rows);
    expect(s.flaggedTransactions).toBe(23);
    expect(s.ungraded).toBe(7);
  });

  it('sums valueAtRisk for all graded rows only', () => {
    const rows = [
      row('definite', 100),
      row('probable', 50),
      row('possible', 30),
      row(null, 999), // should NOT be included
    ];
    const s = computeAuditSummary(rows);
    expect(s.valueAtRisk).toBe(180);
  });

  it('sums estimatedExposure for probable + definite only', () => {
    const rows = [
      row('definite', 100),
      row('probable', 50),
      row('possible', 30),  // not in estimatedExposure
      row('weak', 20),       // not in estimatedExposure
    ];
    const s = computeAuditSummary(rows);
    expect(s.estimatedExposure).toBe(150);
  });

  it('counts unique linkedClusters from graded rows', () => {
    const rows = [
      row('definite', 100, 'cluster-A'),
      row('definite', 100, 'cluster-A'), // same cluster
      row('probable', 50,  'cluster-B'),
      row('possible', 30,  null),         // null cluster_id — not counted
      row(null,       20,  'cluster-C'),  // ungraded — not counted
    ];
    const s = computeAuditSummary(rows);
    expect(s.linkedClusters).toBe(2); // cluster-A and cluster-B only
  });

  it('handles empty input', () => {
    const s = computeAuditSummary([]);
    expect(s).toEqual({
      definite: 0, probable: 0, possible: 0, weak: 0,
      ungraded: 0, flaggedTransactions: 0, linkedClusters: 0,
      valueAtRisk: 0, estimatedExposure: 0,
    });
  });

  it('matches exact numbers from job 4e6e265e', () => {
    // 23 definite rows, 7 null rows, order_value averages to match SQL totals
    const rows = [
      ...Array(23).fill(null).map((_, i) => row('definite', 2012.75 / 23, `c${i % 9}`)),
      ...Array(7).fill(null).map(() => row(null, 503.63 / 7, null)),
    ];
    const s = computeAuditSummary(rows);
    expect(s.definite).toBe(23);
    expect(s.ungraded).toBe(7);
    expect(s.flaggedTransactions).toBe(23);
    expect(s.linkedClusters).toBe(9);
    expect(s.valueAtRisk).toBeCloseTo(2012.75, 1);
  });

  it('is case-insensitive for grade strings', () => {
    const rows = [row('DEFINITE'), row('Probable'), row('POSSIBLE'), row('Weak')];
    const s = computeAuditSummary(rows);
    expect(s.definite).toBe(1);
    expect(s.probable).toBe(1);
    expect(s.possible).toBe(1);
    expect(s.weak).toBe(1);
    expect(s.ungraded).toBe(0);
  });

  it('counts weak grade separately from ungraded', () => {
    const rows = [row('weak', 10, 'c1'), row(null, 10, null)];
    const s = computeAuditSummary(rows);
    expect(s.weak).toBe(1);
    expect(s.ungraded).toBe(1);
    expect(s.flaggedTransactions).toBe(1);
    expect(s.valueAtRisk).toBe(10); // only the weak row
  });
});
