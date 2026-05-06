# Sonnet Fix Pass 7 Prompt

You are fixing the seventh-pass enterprise readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

Pass 6 fixed the canonical `countReviewWorthyTransactions()` blocker. Do not keep re-fixing that. The remaining issues are dashboard/customer-detail data correctness at enterprise scale, dependency posture, and scanner signal quality.

Read first:

- `reports/deployment-readiness/SEVENTH_PASS_AUDIT.md`
- `reports/deployment-readiness/SIXTH_PASS_AUDIT.md`
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Fix in this order.

## 1. Centralize dashboard review metrics and remove default caps

Current issue:

- `app/(app)/dashboard/page.tsx` builds review queue metrics inline.
- It fetches reviewable profiles without pagination.
- It fetches qualifying transaction profile IDs without pagination.
- The comment says the query is bounded by the 50-job limit, but the profile query is not scoped to those 50 jobs.
- Dashboard still displays stored `processing_jobs.flagged_count`, which may be legacy-derived for historical rows.

Requirements:

- Create a shared helper, for example `fetchMerchantDashboardSummary()` or `countMerchantReviewQueueProfiles()`.
- Scope via merchant-owned `processing_jobs`, not a loose profile status query.
- Use the canonical review-worthy definition:
  - `identity_confidence_grade IS NOT NULL`
  - OR `match_status IN ('candidate','probable','definite')`
  - excluding `dismissed_by_merchant IS TRUE`
- Avoid Supabase default 1000-row caps by using count queries, pagination, or an RPC.
- Count distinct `customer_profile_id` for the review queue.
- Use clear copy that distinguishes:
  - current identity-review count
  - stored historical `processing_jobs.flagged_count`
- Add tests with >1000 mock rows proving dashboard counts are complete.
- Add tests proving dashboard/inbox/export/job finalisation share the same review-worthy definition.

Do not use `.neq('dismissed_by_merchant', true)`.

## 2. Remove fixed 1000-row cap from customer detail API

Current issue:

- `app/api/customers/[id]/route.ts` still uses `.limit(1000)` in the direct identity fallback query.

Requirements:

- Replace the fixed limit with pagination, preferably using existing `paginateAll`/merchant helper patterns.
- Keep all transaction reads merchant-scoped through owned job IDs.
- Add a regression test that fails if `app/api/customers/[id]/route.ts` contains `.limit(1000)`.
- Add a behavioral test proving more than 1000 fallback rows can be returned/processed.

## 3. Decide and implement dependency posture

`npm audit --audit-level=moderate` still fails.

Choose one path:

### Preferred for 9-10/10 security:

- Upgrade intentionally to the patched Next major path reported by `npm audit`.
- Resolve any React/App Router/build/test fallout.
- Run full build/tests/audits.

### Acceptable only for a bounded pilot:

- Create a formal risk acceptance document with:
  - owner;
  - exact deployment assumptions;
  - affected advisories;
  - mitigations already applied;
  - expiry date;
  - mandatory pre-scale upgrade milestone.
- Do not claim this is fixed. Claim "accepted pilot risk".

Do not hide the audit failure.

## 4. Restore safe partial name search

Current issue:

- `/api/customers/search` now uses `.contains('names', [q])`.
- This is safe but exact-match only and likely weakens command-palette UX.

Requirements:

- Implement safe partial name search without raw `.or()` string interpolation.
- Options:
  - normalized search column;
  - parameterized RPC;
  - merchant-scoped paginated candidate fetch with application-side filtering for command-palette limits.
- Keep auth and `PERMISSIONS.VIEW_CUSTOMERS`.
- Keep merchant scoping via `merchant_ids`.
- Add tests for partial name search and hostile input.

## 5. Triage static security scan findings

`npm run audit:deployment` still reports 270 findings.

Requirements:

- Classify findings as true risk, accepted risk, false positive, test/dev-only, or backlog.
- Update `scripts/deployment-readiness/audit-security.mjs` so known false positives are ignored only by precise file/context rules.
- Keep true findings visible.
- Produce a concise report artifact, for example `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md`.
- Do not suppress banned user-facing terms broadly; only suppress the central banned-term list/tests where the terms are intentionally present.

## Preserve prior fixes

Do not regress:

- `countReviewWorthyTransactions()` must not query `audit_transactions.merchant_id`.
- It must throw on Supabase errors.
- It must use `.not('dismissed_by_merchant', 'is', true)`.
- `/api/customers/search` must not compose raw user input into `.or()` strings.
- `app/(app)/customers/page.tsx` must use `escapePostgrestFilterValue`.
- `app/api/customers/[id]/route.ts` must not query the global cluster graph table.
- `next.config.js` must not use wildcard image hostnames.

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

Do not claim 9/10 while dashboard/customer-detail counts can be capped, while dependency audit is only accepted but not fixed, or while security scan output is mostly untriaged noise.
