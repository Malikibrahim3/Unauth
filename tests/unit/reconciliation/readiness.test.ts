import { projectReconciliationReadiness } from '@/lib/reconciliation/readiness';

describe('projectReconciliationReadiness', () => {
  it('never calls zero canonical facts ready or gap-free', () => {
    expect(projectReconciliationReadiness({
      facts: [], matrix: [], recommendations: {}, loading: false, error: false, hasData: true,
    })).toEqual({
      state: 'not_ready',
      readiness: 'Not ready — no canonical facts',
      namedGaps: ['Canonical evidence facts'],
      nextAction: 'Collect canonical evidence before a merchant decision',
      stale: false,
    });
  });

  it('unions, normalizes, deduplicates, and sorts canonical gaps', () => {
    const result = projectReconciliationReadiness({
      facts: [{}],
      matrix: [{ missingEvidence: [' Parcel weight ', 'pack photo'] }],
      recommendations: {
        customerAction: { headline: 'Collect delivery proof', missing_evidence: ['pack photo'] },
        responsibility: null,
        recovery: null,
      },
      loading: false, error: false, hasData: true,
    });
    expect(result.namedGaps).toEqual(['pack photo', 'Parcel weight']);
    expect(result).toMatchObject({ readiness: 'Needs evidence', nextAction: 'Collect delivery proof' });
  });

  it('requires all three returned axes before saying no named gaps', () => {
    expect(projectReconciliationReadiness({
      facts: [{}], matrix: [], recommendations: { customerAction: { headline: 'Review' } },
      loading: false, error: false, hasData: true,
    })).toMatchObject({
      readiness: 'Not yet evaluated',
      nextAction: 'Evaluate the canonical evidence before a merchant decision',
    });
  });

  it('retains a ready projection when refresh fails with last-good data', () => {
    expect(projectReconciliationReadiness({
      facts: [{}], matrix: [],
      recommendations: {
        customerAction: { headline: 'Review customer action' },
        responsibility: { headline: 'Review responsibility' },
        recovery: { headline: 'Review recovery' },
      },
      loading: false, error: true, hasData: true, hasStaleData: true,
    })).toMatchObject({ readiness: 'Ready for merchant review', stale: true, nextAction: 'Review customer action' });
  });
});
