# Sonnet Fix Pass 6 Prompt

You are fixing the sixth-pass enterprise readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

The app is closer, and tests are green, but pass 5 introduced a new data-correctness blocker. Do not optimize for green tests. Fix the real behavior and add tests that would have caught the regression.

Read first:

- `reports/deployment-readiness/SIXTH_PASS_AUDIT.md`
- `reports/deployment-readiness/FIFTH_PASS_AUDIT.md`
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Fix in this order.

## 1. Fix `countReviewWorthyTransactions()`

Current bug:

- `lib/supabase/merchantHelpers.ts` filters `audit_transactions` with `.eq('merchant_id', merchantId)`.
- `audit_transactions` does not have `merchant_id` in `lib/supabase/types.ts`.
- Correct ownership path is `audit_transactions.job_id -> processing_jobs.id -> processing_jobs.merchant_id`.
- The helper ignores Supabase errors and returns `0` when queries fail.
- It uses `.neq('dismissed_by_merchant', true)`, which can exclude NULL rows.

Requirements:

- Verify the job belongs to the merchant by querying `processing_jobs` with `.eq('id', jobId).eq('merchant_id', merchantId)`.
- If the job is not owned, return `0` or throw a typed not-owned error. Choose one and document it.
- Query `audit_transactions` by `job_id` only after ownership is proven.
- Do not query `audit_transactions.merchant_id`.
- Throw on Supabase errors. Do not silently return zero on query errors.
- Use `.not('dismissed_by_merchant', 'is', true)` for "exclude dismissed, include false/null".
- Preserve the review-worthy definition:
  - `identity_confidence_grade IS NOT NULL`
  - OR `match_status IN ('candidate','probable','definite')`
  - excluding `dismissed_by_merchant IS TRUE`

## 2. Fix dashboard review queue metrics

Current bug:

- `app/(app)/dashboard/page.tsx` uses `.neq('dismissed_by_merchant', true)`.
- It fetches profile IDs and transactions without pagination.
- It does not reuse the canonical review-worthy helper/definition cleanly.

Requirements:

- Use null-safe dismissed filtering: `.not('dismissed_by_merchant', 'is', true)`.
- Avoid 1000-row caps by paginating or using count queries.
- Scope through merchant-owned jobs or rely only on RLS-safe authenticated queries if using the user client. Be explicit in comments.
- Prefer a shared helper for dashboard summary counts rather than one-off query logic.
- Existing historical `processing_jobs.flagged_count` may be legacy-derived; document or backfill/migrate if practical.

## 3. Replace source-inspection tests with behavioral tests

The current pass-5 tests are green but weak:

- `tests/api/routeSecurity.test.ts` names tests like "graded transaction is counted" but mostly reads source strings.

Add behavioral tests for `countReviewWorthyTransactions()`:

- It first checks `processing_jobs` ownership.
- It never calls `.eq('merchant_id', ...)` on an `audit_transactions` query.
- It throws when the ownership query errors.
- It throws when either transaction query errors.
- It counts graded rows where `match_status` is null.
- It counts status-only rows where grade is null and status is candidate/probable/definite.
- It does not double-count rows that satisfy both clauses.
- It excludes `dismissed_by_merchant === true`.
- It includes `dismissed_by_merchant === false`.
- It includes `dismissed_by_merchant === null`.

Add dashboard tests:

- Dashboard source must not use `.neq('dismissed_by_merchant', true)`.
- Dashboard source must not query unpaginated large review queues if using data selects.
- Dashboard must use the shared review-worthy definition.

## 4. Preserve pass-5 security/privacy fixes

Do not regress these:

- `/api/customers/search` must not compose raw user input into `.or()` strings.
- `app/(app)/customers/page.tsx` must use `escapePostgrestFilterValue`.
- `app/api/customers/[id]/route.ts` must not query the global cluster graph table.
- `next.config.js` must not use wildcard image hostnames.

Note: `app/api/customers/search/route.ts` now uses `.contains('names', [q])`, which is safe but likely exact-match only. If you improve it, keep it safe and merchant-scoped.

## Run and report

Run:

```bash
npm run build
npm test -- --runInBand
npm run audit:deployment
npm run dev
npm run audit:ux
npm audit --audit-level=moderate
```

Return:

- Files changed.
- Exact blockers fixed.
- Tests added or strengthened.
- Exact command results.
- Remaining risks with severity.

Do not claim 9/10 while canonical audit summary counts can silently become zero, while NULL dismissed rows are excluded, or while tests only prove strings exist rather than behavior.
