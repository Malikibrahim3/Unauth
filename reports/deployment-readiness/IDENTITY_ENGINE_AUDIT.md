# Identity Engine Audit

Verdict: **not ready for enterprise pilot** until tests and semantics are reconciled.

## Architecture

- `lib/linker.ts`: in-batch identity linking.
- `lib/scorer.ts`: cluster confidence, behavioral flags, CE3.0.
- `lib/processing/worker.ts`: persists `identity_score`, `identity_confidence_grade`, `match_status`, `candidate_cluster_id`, `confirmed_identity_id`.
- `lib/analysis/entityResolution.ts`: creates/updates customer profiles from probable/definite matches.
- `lib/analysis/auditSummary.ts`: audit top-line counts.

## Positive Findings

- Current linker is conservative: IP-only and postcode-only do not link.
- BIN + last4 is intentionally low weight, reducing false positives.
- Benchmarks show 0 false positives across tested clean, negative-control, corporate-office, household, and BIN/last4 collision traps.
- Two-tier fields exist in migration `0045_identity_match_status.sql`.

## Blockers

### Regression tests fail

`npm test -- --runInBand` failed 4 suites, 22 tests. `npm run audit:identity` records failing identity tests in `reports/deployment-readiness/benchmarks/identity-jest-output.txt`.

Interpretation: either the tests encode stale higher-risk behavior, or implementation has drifted from accepted semantics. The product cannot go to enterprise pilot while this is unresolved.

### Candidate vs confirmed metrics are conflated

`computeAuditSummary` counts linked clusters only from confirmed/definite rows. Benchmarks then show:
- `small_sanity`: 9 true surfaced rows, `linkedClusters = 0`.
- `large_merchant_scale`: 110 surfaced rows, `linkedClusters = 1`.

This is mathematically defensible only if the label is "confirmed identities"; it is misleading as "linked clusters".

### Reship/refund seeded clusters are missed

Benchmark false negatives concentrate in `fraud_reship_refund` scenarios:
- Medium: 10 FN.
- Adversarial: 15 FN.
- Large: 20 FN.

Given the product principle, these should likely remain candidate-only unless corroborated by stronger identity signals, but the answer key expects surfacing. Product must decide and encode the expected behavior.

## Recommended Model Contract

Use explicit states:
- `none`: no surfaced identity relationship.
- `candidate`: weak/partial signal shown for review only; no profile merge.
- `probable`: strong enough to group in review workspace; no confirmed identity.
- `confirmed`: high-confidence system-confirmed identity link.
- `merchant_confirmed`: merchant manually confirmed.
- `dismissed`: merchant rejected.

UI must display all states consistently and never imply guilt.

## Required Tests Before Pilot

- Candidate-only rows do not create permanent identity merges.
- Probable rows can be reviewed together but are not called confirmed.
- Confirmed identity requires strong independent signals.
- Shared IP, shared address/postcode, and BIN+last4 alone never confirm.
- Chain-linking cannot contaminate large clusters.
- UI summaries match DB persisted state.

