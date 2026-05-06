# Fourth-Pass Deployment Readiness Audit

Date: 2026-05-06

## Verdict

Fix pass 3 closed the most serious third-pass blockers. The app is now much closer to pilot-ready, but it is still not at the requested 9-10/10 bar.

Updated verdict: Not ready for a high-confidence ASOS-level pilot yet, but close enough that the remaining work is now narrow and concrete.

## Gate Results

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `npm test -- --runInBand` | Pass: 32 suites, 455 tests |
| `npm run audit:deployment` | Pass command; static scan still reports 271 findings |
| `npm run audit:csv` | Pass |
| `npm run audit:identity` | Pass |
| `npm run dev` + `npm run audit:ux` | Pass: 13 screenshots, 0 errors |
| `npm audit --audit-level=moderate` | Fail: 5 vulnerabilities remain |

## Updated Scorecard

| Area | Third pass | Fourth pass | Target |
|---|---:|---:|---:|
| Product clarity | 7/10 | 8/10 | 9/10 |
| UI polish | 7/10 | 7.5/10 | 9/10 |
| UX flow | 7/10 | 7.5/10 | 9/10 |
| CSV robustness | 8.5/10 | 8.5/10 | 9/10 |
| Identity reliability | 8/10 | 8/10 | 9/10 |
| Explainability | 7/10 | 7.5/10 | 9/10 |
| Data correctness | 7/10 | 8/10 | 9/10 |
| Security/privacy | 6/10 | 7.5/10 | 9/10 |
| Performance | 7/10 | 7.5/10 | 9/10 |
| Code maintainability | 7/10 | 7.5/10 | 9/10 |

## What Improved

- `app/api/customers/search/route.ts` now requires auth and `VIEW_CUSTOMERS`, and constrains results to `merchant_ids`.
- `app/api/evidence/ce3-check/route.ts` now uses merchant-scoped profile and transaction helpers instead of incorrect `.eq('merchant_id')` filters.
- `app/(app)/inbox/page.tsx` now uses shared review queue logic and identity fields.
- `app/api/inbox/export/route.ts` now uses the same shared review queue helper as the inbox page.
- `app/(app)/customers/[id]/page.tsx` no longer reads `fraud_identity_clusters`; linked identity signals are derived from merchant-owned transactions only.
- `tests/api/routeSecurity.test.ts` adds 22 route/helper/security tests.

## Remaining Blockers

### BLOCKER: npm audit mitigation document claims a Next image allowlist that does not exist

Evidence:
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md` says the Image Optimizer DoS is mitigated because `next.config.js` specifies explicit `images.remotePatterns`.
- `next.config.js` currently has only:
  - `experimental.serverComponentsExternalPackages = ['papaparse']`
- There is no `images.remotePatterns`, no image-domain allowlist, and no image cache mitigation in code.

Impact:
The security exception is not trustworthy. A serious merchant/security reviewer will treat this as a failed accepted-risk process because one of the documented mitigations is not actually applied.

Required fix:
Either add the actual Next image configuration mitigation, or revise the mitigation document to accurately state no code-level image optimizer mitigation exists and the risk remains accepted only behind infrastructure controls. Prefer adding the explicit config.

### BLOCKER: Service-role static guard is weaker than the prompt required

Evidence:
- `tests/api/routeSecurity.test.ts:80-90` says service-role routes need either `auth.getUser()` or HMAC/internal auth.
- The prompt required `auth.getUser()` plus `requirePermission()` unless the route is HMAC/internal or explicitly whitelisted.
- The current guard did not flag `app/api/lookup/remaining/route.ts`, which uses service role and auth but no `requirePermission`.
- `app/api/lookup/remaining/route.ts:15-20` queries `lookup_daily_counts` using `merchant_id = user.id`, not `ctx.merchantId`.

Impact:
This can produce wrong quota behavior for team accounts and shows the test can still miss service-role routes that are auth-only but not merchant-context-safe.

Required fix:
Strengthen the static guard so service-role routes require `auth.getUser()` AND `requirePermission()` unless HMAC/internal or explicitly whitelisted. Fix `lookup/remaining` to use `requirePermission(..., PERMISSIONS.LOOKUP_CUSTOMER)` and `ctx.merchantId`.

## High-Priority Issues

### HIGH: Review queue helper can drop legacy graded rows where `match_status` is null

Evidence:
- `lib/supabase/merchantHelpers.ts:371` includes rows with `identity_confidence_grade` not null or match status candidate/probable/definite.
- `lib/supabase/merchantHelpers.ts:375` then applies `.not('match_status', 'eq', 'none')`.
- In SQL/PostgREST, `not.eq.none` does not necessarily include nulls. Legacy rows with `identity_confidence_grade IS NOT NULL` and `match_status IS NULL` may be excluded.

Impact:
The inbox/export can silently miss valid review rows from older uploads or partial migrations.

Required fix:
Replace the explicit `not match_status = none` filter with a single correct OR expression that includes:
- `identity_confidence_grade IS NOT NULL`
- OR `match_status IN ('candidate','probable','definite')`
Then separately exclude `dismissed_by_merchant IS TRUE`. Add a regression test for a graded row with `match_status = null`.

### HIGH: Customer search and related `.or()` filters interpolate raw user input

Evidence:
- `app/api/customers/search/route.ts:45` interpolates `q` directly into a PostgREST `.or()` filter string.
- `app/(app)/customers/page.tsx:154` also interpolates `q` directly into `.or(...)`.
- Similar patterns exist in `app/api/audit/[runId]/customer/route.ts`.

Impact:
Special characters can break search queries, and filter-string interpolation is a common source of PostgREST query bugs. It may not become SQL injection through PostgREST, but it is still not enterprise-grade input handling.

Required fix:
Escape PostgREST filter values or avoid composite `.or()` strings with raw user input. At minimum, sanitize commas, parentheses, braces, quotes, `%`, and backslashes, and add tests for hostile search strings.

### HIGH: Legacy eval warning is mathematically wrong

Evidence:
- Test output shows `clean.csv` has `falsePositives: 53` and `flagRate: 0.265`.
- `tests/eval/engineEval.test.ts:79` uses `metrics.baseRate ?? 0`, so the warning prints `0.0%`.

Impact:
The warning intended to make the false-positive risk visible currently under-reports the clean-dataset flag rate. This damages trust in the audit trail.

Required fix:
Use `metrics.flagRate`, not `metrics.baseRate`. Keep it explicitly non-gating if that is the decision, but the warning must be truthful.

### HIGH: Inbox page silently renders empty content when unauthenticated or permission denied

Evidence:
- `app/(app)/inbox/page.tsx:47-78` only loads data if `user` exists and permission is not denied.
- It does not redirect unauthenticated users or return the permission denial response.
- It also uses `PERMISSIONS.VIEW_CUSTOMERS` instead of the more specific `PERMISSIONS.VIEW_INBOX`.

Impact:
Users can see an empty queue instead of a clear auth/permission outcome. This is a reliability and enterprise UX issue.

Required fix:
Redirect unauthenticated users to login. Use `PERMISSIONS.VIEW_INBOX`. If denied, return/throw the appropriate forbidden response or route to a permission-safe error state.

## Medium Issues

- `app/api/customers/[id]/route.ts` still has duplicated customer intelligence logic and still reads `fraud_identity_clusters`. It masks raw values, but the safer architectural direction is to route both API and page through the same shared helper.
- `app/api/process-csv-chunk/route.ts:153` still computes final `flagged_count` from legacy `risk_level`. Align this with identity-review metrics before relying on dashboard/run summaries.
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md` says scale-out requires an upgrade sprint. That means current dependency posture should not score 9/10 for security until the sprint is done or the mitigations are made real and verified.

## Current Benchmark Results

| Dataset | Rows | Surfaced | TP | FP | FN | Precision | Recall | Review rate | Linked clusters |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| small_sanity | 91 | 9 | 9 | 0 | 0 | 1.00 | 1.00 | 9.89% | 2 |
| medium_realistic | 1,350 | 56 | 56 | 0 | 10 | 1.00 | 0.8485 | 4.15% | 7 |
| negative_control | 1,500 | 0 | 0 | 0 | 0 | 1.00 | 1.00 | 0.00% | 0 |
| adversarial_fraud | 402 | 83 | 83 | 0 | 15 | 1.00 | 0.8469 | 20.65% | 7 |
| large_merchant_scale | 5,400 | 110 | 110 | 0 | 20 | 1.00 | 0.8462 | 2.04% | 7 |

## Next Fix Order

1. Fix the real dependency mitigations: add `images.remotePatterns` or correct the audit doc.
2. Strengthen service-role route guard and fix `lookup/remaining`.
3. Fix review queue null `match_status` semantics.
4. Fix raw PostgREST filter interpolation in customer/search flows.
5. Fix the legacy eval warning to report `metrics.flagRate`.
6. Fix inbox auth/permission behavior.
7. Move the remaining customer API route to shared customer intelligence helpers.

## Commands Run

```bash
npm run build
npm test -- --runInBand
npm run audit:deployment
npm audit --audit-level=moderate
npm run dev
npm run audit:ux
```

