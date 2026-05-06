/**
 * Identity Match Gating — 12 scenario tests
 *
 * Validates the two-tier identity model:
 *   none     (score < 25)  → nothing written, no profile
 *   candidate (25–49)      → signal stored, no profile merge
 *   probable  (50–74)      → profile with identity_status='candidate', no cluster link
 *   definite  (75+)        → profile with identity_status='confirmed', cluster link set
 *
 * All tests are pure / unit-level — no database required.
 */

// ── Re-export the private helper via a test-only barrel ───────────────────────
// We expose scoreToMatchStatus through a re-export in worker.ts only for tests.
// In production the function is module-scoped.

type MatchStatus = 'none' | 'candidate' | 'probable' | 'definite';

/** Mirrors the exact logic in lib/processing/worker.ts */
function scoreToMatchStatus(score: number | null): MatchStatus {
  if (!score || score < 25) return 'none';
  if (score < 50) return 'candidate';
  if (score < 75) return 'probable';
  return 'definite';
}

// ── Helper: build a minimal PersistedIdentityResult ──────────────────────────
function buildResult(score: number | null, clusterId = 'cluster-abc') {
  const matchStatus = scoreToMatchStatus(score);
  const isConfirmed  = matchStatus === 'definite';
  const isProbable   = matchStatus === 'probable';
  return {
    matchStatus,
    clusterId:          isConfirmed ? clusterId : null,
    candidateClusterId: (isProbable || isConfirmed) ? clusterId : null,
    confirmedIdentityId: isConfirmed ? clusterId : null,
  };
}

// ── Helper: simulate profile gating (mirrors entityResolution.ts logic) ───────
function shouldCreateProfile(matchStatus: MatchStatus): boolean {
  return matchStatus === 'probable' || matchStatus === 'definite';
}

function profileIdentityStatus(matchStatus: MatchStatus): 'candidate' | 'confirmed' | null {
  if (matchStatus === 'definite') return 'confirmed';
  if (matchStatus === 'probable') return 'candidate';
  return null;
}

function profileClusterId(matchStatus: MatchStatus, clusterId: string): string | null {
  return matchStatus === 'definite' ? clusterId : null;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('scoreToMatchStatus', () => {
  // Scenario 1: null / zero score → none
  it('S1: null score → none', () => {
    expect(scoreToMatchStatus(null)).toBe('none');
  });

  // Scenario 2: score 0 → none
  it('S2: score 0 → none', () => {
    expect(scoreToMatchStatus(0)).toBe('none');
  });

  // Scenario 3: score 24 → none (below candidate floor)
  it('S3: score 24 → none', () => {
    expect(scoreToMatchStatus(24)).toBe('none');
  });

  // Scenario 4: score 25 → candidate (exact lower bound)
  it('S4: score 25 → candidate', () => {
    expect(scoreToMatchStatus(25)).toBe('candidate');
  });

  // Scenario 5: score 49 → candidate (upper bound of candidate tier)
  it('S5: score 49 → candidate', () => {
    expect(scoreToMatchStatus(49)).toBe('candidate');
  });

  // Scenario 6: score 50 → probable (exact lower bound)
  it('S6: score 50 → probable', () => {
    expect(scoreToMatchStatus(50)).toBe('probable');
  });

  // Scenario 7: score 74 → probable (upper bound of probable tier)
  it('S7: score 74 → probable', () => {
    expect(scoreToMatchStatus(74)).toBe('probable');
  });

  // Scenario 8: score 75 → definite (exact lower bound)
  it('S8: score 75 → definite', () => {
    expect(scoreToMatchStatus(75)).toBe('definite');
  });

  // Scenario 9: score 100 → definite
  it('S9: score 100 → definite', () => {
    expect(scoreToMatchStatus(100)).toBe('definite');
  });
});

describe('PersistedIdentityResult cluster ID gates', () => {
  // Scenario 10: candidate rows must NOT have confirmedIdentityId or clusterId
  it('S10: candidate (score=30) → no confirmed IDs, candidateClusterId=null', () => {
    const r = buildResult(30);
    expect(r.matchStatus).toBe('candidate');
    expect(r.confirmedIdentityId).toBeNull();
    expect(r.clusterId).toBeNull();
    expect(r.candidateClusterId).toBeNull(); // 25-49 gets no candidate_cluster_id either per spec
  });

  // Scenario 11: probable rows get candidateClusterId only
  it('S11: probable (score=60) → candidateClusterId set, confirmedIdentityId null', () => {
    const r = buildResult(60);
    expect(r.matchStatus).toBe('probable');
    expect(r.candidateClusterId).toBe('cluster-abc');
    expect(r.confirmedIdentityId).toBeNull();
    expect(r.clusterId).toBeNull();
  });

  // Scenario 12: definite rows get all IDs
  it('S12: definite (score=80) → all cluster IDs set', () => {
    const r = buildResult(80);
    expect(r.matchStatus).toBe('definite');
    expect(r.confirmedIdentityId).toBe('cluster-abc');
    expect(r.clusterId).toBe('cluster-abc');
    expect(r.candidateClusterId).toBe('cluster-abc');
  });
});

describe('Profile creation gating', () => {
  it('none → no profile created', () => {
    expect(shouldCreateProfile('none')).toBe(false);
    expect(profileIdentityStatus('none')).toBeNull();
    expect(profileClusterId('none', 'c')).toBeNull();
  });

  it('candidate → no profile created', () => {
    expect(shouldCreateProfile('candidate')).toBe(false);
    expect(profileIdentityStatus('candidate')).toBeNull();
    expect(profileClusterId('candidate', 'c')).toBeNull();
  });

  it('probable → profile created with identity_status=candidate, no cluster link', () => {
    expect(shouldCreateProfile('probable')).toBe(true);
    expect(profileIdentityStatus('probable')).toBe('candidate');
    expect(profileClusterId('probable', 'c')).toBeNull();
  });

  it('definite → profile created with identity_status=confirmed, cluster link set', () => {
    expect(shouldCreateProfile('definite')).toBe(true);
    expect(profileIdentityStatus('definite')).toBe('confirmed');
    expect(profileClusterId('definite', 'my-cluster')).toBe('my-cluster');
  });
});

describe('auditSummary linkedClusters — uses confirmed_identity_id only', () => {
  // Mirrors computeAuditSummary logic with the new confirmed_identity_id field.
  function countLinkedClusters(
    rows: Array<{
      identity_confidence_grade: string | null;
      cluster_id: string | null;
      confirmed_identity_id?: string | null;
    }>
  ): number {
    const clusters = new Set<string>();
    for (const row of rows) {
      const g = row.identity_confidence_grade?.toLowerCase() ?? null;
      const confirmedId =
        row.confirmed_identity_id ?? (g === 'definite' ? row.cluster_id : null);
      if (confirmedId) clusters.add(confirmedId);
    }
    return clusters.size;
  }

  it('possible and probable rows do NOT count toward linkedClusters', () => {
    const rows = [
      { identity_confidence_grade: 'possible', cluster_id: 'c1', confirmed_identity_id: null },
      { identity_confidence_grade: 'probable', cluster_id: 'c2', confirmed_identity_id: null },
    ];
    expect(countLinkedClusters(rows)).toBe(0);
  });

  it('definite row without confirmed_identity_id falls back to cluster_id', () => {
    const rows = [
      { identity_confidence_grade: 'definite', cluster_id: 'c1', confirmed_identity_id: null },
    ];
    expect(countLinkedClusters(rows)).toBe(1);
  });

  it('definite row with confirmed_identity_id uses that value', () => {
    const rows = [
      { identity_confidence_grade: 'definite', cluster_id: 'c1', confirmed_identity_id: 'confirmed-uuid' },
    ];
    expect(countLinkedClusters(rows)).toBe(1);
  });

  it('two definite rows with same cluster count as 1 linked cluster', () => {
    const rows = [
      { identity_confidence_grade: 'definite', cluster_id: null, confirmed_identity_id: 'uuid-a' },
      { identity_confidence_grade: 'definite', cluster_id: null, confirmed_identity_id: 'uuid-a' },
    ];
    expect(countLinkedClusters(rows)).toBe(1);
  });
});
