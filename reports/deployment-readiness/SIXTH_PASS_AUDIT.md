# Sixth-Pass Enterprise Readiness Audit

Date: 2026-05-06  
Scope: Verification after Sonnet/Copilot Fix Pass 5  
Verdict: **Not ready for ASOS-level pilot yet**

## Executive Summary

Pass 5 fixed several prior high-risk issues:

- `/api/customers/search` no longer composes raw `.or()` filter strings.
- `/customers` now uses `escapePostgrestFilterValue`.
- `app/api/customers/[id]/route.ts` no longer queries the global cluster graph table.
- `next.config.js` now derives a specific Supabase image hostname from `NEXT_PUBLIC_SUPABASE_URL`.

But pass 5 introduced a new deployment-blocking data correctness bug: `countReviewWorthyTransactions()` filters `audit_transactions.merchant_id`, even though this schema scopes `audit_transactions` through `job_id -> processing_jobs.merchant_id` and the generated `audit_transactions` type has no `merchant_id` column. The helper also ignores Supabase errors and uses `.neq('dismissed_by_merchant', true)`, which can exclude NULL rows. This means final job `flagged_count` can silently become `0` or dashboard metrics can undercount review-worthy orders.

The test suite is green because the new tests mostly inspect source strings rather than executing the helper against realistic Supabase query responses.

## Current Scorecard

| Area | Score | Notes |
|---|---:|---|
| Product clarity | 8.5/10 | Safer language and clearer workflow. |
| UI polish | 8/10 | UX audit passes with 13 screenshots. |
| UX flow | 8.5/10 | Login/app flows open successfully under Playwright. |
| CSV robustness | 8.5/10 | Benchmarks remain strong. |
| Identity reliability | 8/10 | Blind benchmarks good; legacy eval still has 53 clean false positives. |
| Explainability | 8/10 | Cross-merchant cluster API leak removed; review-count correctness regressed. |
| Data correctness | 7/10 | New canonical count helper is broken against the schema and ignores errors. |
| Security/privacy | 8.5/10 | Prior search and cluster privacy blockers improved; npm audit still fails. |
| Performance | 8/10 | Build/audit OK; dashboard review query still unpaginated. |
| Maintainability | 7.5/10 | Helpers improving, but tests allow false confidence. |

## Command Results

| Command | Result |
|---|---|
| `npm run build` | PASS — Next 14.2.35 production build, 41 pages generated. |
| `npm test -- --runInBand` | PASS — 32 suites, 490 tests. |
| `npm run audit:deployment` | PASS exit code; scanner still reports 270 findings: 119 service-role, 77 csv-export, 47 broad-select, 19 banned-language, 7 fixed-limit, 1 unsafe-html. |
| `npm run dev` | PASS — local server ready on `http://localhost:3000`. |
| `npm run audit:ux` | PASS — 13 screenshots, 0 errors. |
| `npm audit --audit-level=moderate` | FAIL — 5 vulnerabilities remain in `glob`, `next`, and `postcss`; fix path is Next 16 breaking upgrade. |

## Blockers And High-Priority Findings

### BLOCKER: Canonical Review Count Helper Queries A Non-Existent Column

**Evidence**

- `lib/supabase/merchantHelpers.ts:90-92` filters `audit_transactions` with `.eq('merchant_id', merchantId)`.
- `lib/supabase/merchantHelpers.ts:97-99` repeats the same `merchant_id` filter.
- `lib/supabase/types.ts:371-394` defines `audit_transactions.Row` and contains no `merchant_id`.
- `supabase/migrations/0043_fix_audit_transactions_rls.sql:25-38` explicitly documents the correct ownership path: `audit_transactions.job_id -> processing_jobs.id -> processing_jobs.merchant_id`.
- `app/api/process-csv-chunk/route.ts:152` now uses this helper for final `flagged_count`.

**Impact**

On a real database, PostgREST will return an error such as "column audit_transactions.merchant_id does not exist." The helper ignores `gradedRes.error` and `statusRes.error`, treats `data` as empty, and returns `0`. A completed upload can therefore persist `flagged_count = 0` even when the audit surfaced review-worthy orders.

**Business Impact**

Enterprise dashboards, history, review-rate charts, and executive summary cards can all show materially false counts. This is exactly the kind of demo embarrassment and production trust failure the audit is meant to prevent.

**Recommended Fix**

Rewrite `countReviewWorthyTransactions()` to:

1. Verify the job belongs to the supplied merchant through `processing_jobs.id` + `merchant_id`.
2. Query `audit_transactions` by `job_id` only after ownership is proven.
3. Do not query `audit_transactions.merchant_id`.
4. Throw on Supabase errors instead of silently returning `0`.
5. Use `.not('dismissed_by_merchant', 'is', true)` rather than `.neq('dismissed_by_merchant', true)`.

**Effort**: 0.5 day  
**Status**: Not fixed

### BLOCKER: Dismissed Filter Excludes NULL Rows

**Evidence**

- `lib/supabase/merchantHelpers.ts:93` uses `.neq('dismissed_by_merchant', true)`.
- `lib/supabase/merchantHelpers.ts:101` repeats `.neq('dismissed_by_merchant', true)`.
- `app/(app)/dashboard/page.tsx:63` uses `.neq('dismissed_by_merchant', true)`.
- The earlier correct helper used `.not('dismissed_by_merchant', 'is', true)` at `lib/supabase/merchantHelpers.ts:464`.

**Impact**

For nullable `dismissed_by_merchant`, SQL/PostgREST inequality does not behave like "not true". NULL rows can be excluded from counts, so normal undismissed rows may disappear from dashboard and final summary metrics.

**Recommended Fix**

Use `.not('dismissed_by_merchant', 'is', true)` everywhere the semantic is "include false and null; exclude true". Add tests where `dismissed_by_merchant` is `null`, `false`, and `true`.

**Effort**: 0.25 day  
**Status**: Not fixed

### HIGH: New Helper Tests Do Not Execute The Helper

**Evidence**

- `tests/api/routeSecurity.test.ts:807-837` is named "graded transaction is counted", but it only reads source and asserts strings.
- `tests/api/routeSecurity.test.ts:839-856` also uses source inspection instead of calling `countReviewWorthyTransactions()`.

**Impact**

Tests pass while the helper would fail against the actual schema. This is a test-quality problem, not just a missing assertion.

**Recommended Fix**

Add behavioral tests with mocked Supabase chains that:

- fail if `.eq('merchant_id', ...)` is called on `audit_transactions`;
- assert job ownership is checked on `processing_jobs`;
- assert Supabase errors are thrown, not swallowed;
- assert graded NULL-status rows count;
- assert status-only rows count;
- assert dismissed `true` rows do not count;
- assert dismissed `null` and `false` rows do count.

**Effort**: 0.5 day  
**Status**: Not fixed

### HIGH: Dashboard Review Queue Uses Same NULL-Sensitive Dismissed Filter And Is Unpaginated

**Evidence**

- `app/(app)/dashboard/page.tsx:49-52` fetches reviewable profiles without pagination.
- `app/(app)/dashboard/page.tsx:58-63` fetches qualifying transactions without pagination and uses `.neq('dismissed_by_merchant', true)`.
- `app/(app)/dashboard/page.tsx:70-75` still derives flag-rate cards from stored `processing_jobs.flagged_count`, which may be wrong for existing rows and will be wrong if the new helper returns zero.

**Impact**

Large merchants can see undercounted dashboard review queues because of pagination caps and NULL filtering. Existing historical `flagged_count` values may still be legacy-derived.

**Recommended Fix**

Centralize dashboard summary metrics in a shared helper that paginates all relevant rows, uses job ownership, and uses the same review-worthy definition as inbox/export/job finalisation. Add tests using more than 1000 rows.

**Effort**: 1 day  
**Status**: Not fixed

### MEDIUM: Customer Search Name Matching Became Exact Array Contains

**Evidence**

- `app/api/customers/search/route.ts:52-58` uses `.contains('names', [q])`.

**Impact**

This removes raw `.or()` injection risk, but likely regresses command-palette name search because array `contains` requires exact element matching, not fuzzy or prefix search. Searching "ali" will not match "Alice Smith".

**Recommended Fix**

Either search names through a safe normalized text column, a database RPC with parameters, or a paginated merchant-scoped result set filtered in application code for small command-palette limits. Avoid raw PostgREST `.or()` strings.

**Effort**: 0.5 day  
**Status**: Not fixed

## Updated Verdict

**Not ready for an ASOS-level pilot.**

Pass 5 improved security/privacy, but the new canonical summary helper would break data correctness in production. An enterprise merchant can tolerate a documented dependency exception for a bounded pilot; they cannot tolerate audit summary counts silently becoming zero because a helper queried a non-existent column and swallowed the error.

## Fastest Path To Enterprise-Ready

1. Fix `countReviewWorthyTransactions()` to prove job ownership through `processing_jobs`, query transactions by `job_id`, throw on errors, and use null-safe dismissed filtering.
2. Replace dashboard review metrics with the same helper logic and pagination.
3. Convert the new source-inspection tests into behavioral tests that would have caught the broken helper.
4. Keep the pass-5 privacy fixes: do not reintroduce global cluster graph reads.
5. Continue tracking the Next 16 dependency upgrade as a pilot exception, not as fixed.
