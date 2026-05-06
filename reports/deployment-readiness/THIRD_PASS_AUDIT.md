# Third-Pass Deployment Readiness Audit

Date: 2026-05-06

## Verdict

Sonnet/Copilot's second fix pass is materially better than pass 1, but the app is still not ready for an ASOS-level pilot and is still below the 9-10 target.

Updated verdict: Not ready, but closer. Security/privacy and review-flow correctness remain the gating areas.

## Gate Results

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `npm test -- --runInBand` | Pass: 31 suites, 433 tests |
| `npm run audit:deployment` | Pass command, but static security scan still reports 266 findings |
| `npm run audit:csv` | Pass |
| `npm run audit:identity` | Pass |
| `npm run audit:ux` with no dev server | Correctly fails closed |
| `npm run dev` + `npm run audit:ux` | Pass: 13 screenshots, 0 errors |
| `npm audit --audit-level=moderate` | Fail: 5 vulnerabilities, including high-severity Next.js advisories |

## Updated Scorecard

| Area | Second pass | Third pass | Target |
|---|---:|---:|---:|
| Product clarity | 7/10 | 7/10 | 9/10 |
| UI polish | 7/10 | 7/10 | 9/10 |
| UX flow | 6/10 | 7/10 | 9/10 |
| CSV robustness | 8/10 | 8.5/10 | 9/10 |
| Identity reliability | 8/10 | 8/10 | 9/10 |
| Explainability | 7/10 | 7/10 | 9/10 |
| Data correctness | 7/10 | 7/10 | 9/10 |
| Security/privacy | 5/10 | 6/10 | 9/10 |
| Performance | 7/10 | 7/10 | 9/10 |
| Code maintainability | 6/10 | 7/10 | 9/10 |

## What Improved

- New shared merchant-scoped helper module was added at `lib/supabase/merchantHelpers.ts`.
- `app/(app)/customers/[id]/page.tsx` now fetches profile transactions via `fetchMerchantScopedCustomerTransactions`.
- `app/api/customers/[id]/orders/route.ts` now uses merchant-scoped profile and transaction helpers.
- `lib/evidence/buildPackage.ts` now verifies the profile and disputed order through merchant-scoped helpers.
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx` now verifies the job belongs to the caller's merchant and fetches by both transaction ID and job ID.
- Watchlist routes now use `ctx.merchantId`, not `ctx.userId`.
- Public `/demo` page no longer imports service-role credentials directly.
- `audit:ux` now fails closed when localhost is unavailable.
- Dependency posture improved from 7 audit vulnerabilities to 5.

## Remaining Blockers

### BLOCKER: `/api/customers/search` is public and uses service role

Evidence:
- `app/api/customers/search/route.ts:18` creates a service-role client.
- The route has no `auth.getUser()` check.
- The route has no `requirePermission()`.
- `app/api/customers/search/route.ts:22-27` queries `customer_profiles` by name/email and returns IDs, names, emails, and risk levels.

Impact:
An unauthenticated caller can enumerate customer profile records through a service-role route. This is a direct PII/privacy blocker.

Required fix:
Add auth and `PERMISSIONS.VIEW_CUSTOMERS`, scope search to `ctx.merchantId`, and do not use service role unless the query proves merchant membership. Add a behavioral API test that unauthenticated requests return 401 and cross-merchant profiles are not returned.

### BLOCKER: CE3 eligibility endpoint is broken and not merchant-scoped correctly

Evidence:
- `app/api/evidence/ce3-check/route.ts:30-35` filters `customer_profiles` by `.eq('merchant_id', ctx.merchantId)`, but profile ownership elsewhere is represented by `merchant_ids`, not `merchant_id`.
- `app/api/evidence/ce3-check/route.ts:40-46` queries `audit_transactions` by email and `.eq('merchant_id', ctx.merchantId)`. `audit_transactions` does not have a `merchant_id` column in the Supabase types or migrations; ownership is via `job_id -> processing_jobs.merchant_id`.
- The endpoint does not use `fetchMerchantScopedCustomerProfile` or `fetchMerchantScopedCustomerTransactions`.
- It has a fixed `.limit(500)`.

Impact:
The CE3 check can silently return incorrect results, fail depending on database shape, or miss/over-read rows. Evidence package workflows are not reliable enough for enterprise review.

Required fix:
Rewrite this endpoint to use the shared merchant-scoped helpers. Verify the disputed order belongs to the merchant via job ownership. Remove the fixed cap with pagination.

### BLOCKER: Inbox page still uses legacy risk fields and does not match the fixed export

Evidence:
- `app/(app)/inbox/page.tsx:29-35` queries `audit_transactions` directly with the user client.
- It filters `.in('risk_level', ['high', 'critical'])` instead of `identity_confidence_grade` / `match_status`.
- It orders by `match_score` rather than `identity_score`.
- Page title says "High and critical transactions awaiting review", preserving the old risk mental model.

Impact:
The UI review queue can disagree with audit results and exports. It may miss candidate/probable/definite identity matches or show stale legacy-risk rows.

Required fix:
Use identity fields and the same review-queue semantics as the export. Prefer a shared helper for review queue rows so page and export cannot drift again.

### BLOCKER: Inbox export is merchant-scoped but exports the wrong population

Evidence:
- `app/api/inbox/export/route.ts:54-62` scopes by merchant-owned jobs, which is good.
- It does not filter to review-worthy identity rows.
- `.not('match_status', 'in', '("dismissed","false_positive")')` does not match the current migration states (`none`, `candidate`, `probable`, `definite`) and does not check `dismissed_by_merchant`.
- Result: normal rows with `match_status = 'none'` can be exported.

Impact:
The review queue export can include the full transaction population, not just review-worthy rows. That is embarrassing in a demo and risky for analysts.

Required fix:
Filter to rows where `identity_confidence_grade IS NOT NULL` or `match_status IN ('candidate','probable','definite')`, and exclude `dismissed_by_merchant = true`. Add a test that a `none` row is not exported.

## High-Priority Issues

### HIGH: Linked identity counts still read global cluster memberships

Evidence:
- `app/(app)/customers/[id]/page.tsx:273-287` reads `fraud_identity_clusters` by profile emails and cluster IDs.
- The code comment says it fetches "from within merchant-owned jobs", but the query is not scoped to jobs or merchants.
- It no longer returns raw entity values, which is an improvement, but it can still reveal cross-merchant cluster existence, entity types, and confidence.

Required fix:
Either suppress cross-merchant cluster counts entirely from merchant UI, or derive linked identity signals only from merchant-owned `audit_transactions`. If cross-merchant intelligence is a product feature, expose only explicitly approved aggregate signals with privacy review.

### HIGH: Tests still allow unacceptable clean-dataset false positives

Evidence:
- `tests/eval/engineEval.test.ts` passes while logging clean.csv false positives: 53 FP, 26.5% flag rate.
- The assertion was changed to `toBeLessThan(62)`, which tracks the current baseline but does not enforce the enterprise product principle.

Required fix:
Do not treat this as an enterprise pass. Either retire the obsolete eval path or split it from identity review. Any active clean merchant eval should assert near-zero review rate.

### HIGH: Dependency audit still fails

Evidence:
- `npm audit --audit-level=moderate` still exits 1.
- Remaining advisories include high-severity Next.js advisories and PostCSS.

Required fix:
Decide whether to move to a patched Next major, apply accepted mitigations with documented deployment constraints, or pin/override vulnerable transitive packages where safe. Enterprise readiness cannot ignore this.

### HIGH: Source-code tests are still too easy to satisfy

Evidence:
- `tests/api/merchantIsolation.test.ts` includes useful helper-level behavior tests, but also still relies on string checks for watchlist and public demo security.
- It did not catch `/api/customers/search`.
- It did not catch `app/api/evidence/ce3-check/route.ts`.
- It did not catch inbox page/export semantic drift.

Required fix:
Add route-level tests for every service-role route handling customer/order data. Tests should mock auth, permissions, and Supabase query chains, then assert 401/403/correct merchant scoping and correct review population.

## Current Benchmark Results

| Dataset | Rows | Surfaced | TP | FP | FN | Precision | Recall | Review rate | Linked clusters |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| small_sanity | 91 | 9 | 9 | 0 | 0 | 1.00 | 1.00 | 9.89% | 2 |
| medium_realistic | 1,350 | 56 | 56 | 0 | 10 | 1.00 | 0.8485 | 4.15% | 7 |
| negative_control | 1,500 | 0 | 0 | 0 | 0 | 1.00 | 1.00 | 0.00% | 0 |
| adversarial_fraud | 402 | 83 | 83 | 0 | 15 | 1.00 | 0.8469 | 20.65% | 7 |
| large_merchant_scale | 5,400 | 110 | 110 | 0 | 20 | 1.00 | 0.8462 | 2.04% | 7 |

## Next Fix Order

1. Fix `/api/customers/search` immediately.
2. Rewrite CE3 check through merchant-scoped helpers.
3. Build shared review-queue helper and use it in both `/inbox` and `/api/inbox/export`.
4. Remove global cluster-membership reads from customer page or replace with merchant-owned transaction-derived signals.
5. Strengthen tests to route-level behavioral tests and clean-dataset false-positive ceilings.
6. Resolve or explicitly mitigate remaining dependency advisories.

## Commands Run

```bash
npm run build
npm test -- --runInBand
npm run audit:deployment
npm audit --audit-level=moderate
npm run audit:ux
npm run dev
npm run audit:ux
```

