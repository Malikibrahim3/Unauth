# Sonnet Fix Pass 8 Prompt

You are fixing the eighth-pass enterprise readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

Pass 7 introduced useful fixes, but the app currently does **not build**. Do not optimize for green Jest tests. Fix the production build, then close the hidden enterprise-scale caps and dashboard silent-zero behavior.

Read first:

- `reports/deployment-readiness/EIGHTH_PASS_AUDIT.md`
- `reports/deployment-readiness/SEVENTH_PASS_AUDIT.md`
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Fix in this order.

## 1. Fix production build failure

Current failure:

```text
./app/api/customers/search/route.ts:72:56
Type error: Parameter 'r' implicitly has an 'any' type.
```

Requirements:

- Add an explicit customer search result row type.
- Type `emailRes`, `namePoolRes`, `nameMatches`, and the filter callback.
- Run `npm run build` before claiming completion.
- Add or strengthen a test/check so this route is covered by TypeScript/build gates, not only Jest.

## 2. Paginate `getMerchantOwnedJobIds()`

Current issue:

- `lib/supabase/merchantHelpers.ts` has `getMerchantOwnedJobIds()` with no `.range()` pagination.
- It is now used by dashboard review counts, inbox/export helpers, evidence package generation, and other merchant-scoped transaction helpers.
- A merchant with more than Supabase's default row cap of processing jobs can get incomplete results.

Requirements:

- Make `getMerchantOwnedJobIds()` paginate all processing job IDs.
- Throw on Supabase errors.
- Preserve the API signature if possible.
- Add behavioral tests with more than 1000 jobs proving all job IDs are returned.
- Add tests proving `countMerchantReviewQueueProfiles()` and `fetchMerchantReviewQueueRows()` receive/use job IDs beyond the first page.

## 3. Fix dashboard silent-zero behavior

Current issue:

- `app/(app)/dashboard/page.tsx` catches `countMerchantReviewQueueProfiles()` errors and sets `reviewQueue = 0`.
- The comment says there is a stale data warning, but no actual warning state is rendered.

Requirements:

- Do not display `0` when the review queue count failed.
- Render an explicit unavailable/error/warning state for the metric.
- Preserve the rest of the dashboard if appropriate, but make the metric truthfully unavailable.
- Add tests proving dashboard source does not convert helper errors into `0`.

## 4. Fix dashboard permission denial behavior

Current issue:

- Dashboard calls `requirePermission(...)` but ignores `denied`.
- Permission denial can render partial/empty data instead of failing closed.

Requirements:

- Handle `{ denied, ctx }` explicitly.
- Return the denied response or render a clear access-denied UI.
- If unauthenticated, redirect to login or rely on middleware only if documented and tested.
- Add tests matching the inbox fail-closed pattern.

## 5. Create security scan triage artifact

Current issue:

- `audit-security.mjs` now records suppressed findings separately.
- But `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md` was not created.

Requirements:

- Create `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md`.
- Summarize current unsuppressed and suppressed counts.
- Classify each group as true risk, accepted pilot risk, false positive, test/dev-only, or backlog.
- Include next action and owner placeholder for each group.
- Keep scanner suppressions precise; do not broadly suppress service-role/broad-select findings.

## 6. Revisit customer search fixed 500-profile pool

Current issue:

- Search is now safe, but partial name matching only checks the latest 500 merchant profiles.

Requirements:

- Either implement a better safe partial search strategy or explicitly document/test the bounded command-palette tradeoff.
- Do not reintroduce raw `.or()` user-input interpolation.
- Keep auth and merchant scoping.

## Preserve prior fixes

Do not regress:

- `countReviewWorthyTransactions()` must not query `audit_transactions.merchant_id`.
- It must throw on Supabase errors.
- It must use `.not('dismissed_by_merchant', 'is', true)`.
- `/api/customers/search` must not compose raw user input into `.or()` strings.
- `app/(app)/customers/page.tsx` must use `escapePostgrestFilterValue`.
- `app/api/customers/[id]/route.ts` must not query the global cluster graph table.
- `next.config.js` must not use wildcard image hostnames.
- `app/api/customers/[id]/route.ts` must not use `.limit(1000)`.

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

Do not claim 9/10 while production build fails, while shared job scoping is capped, while dashboard errors display as zero, or while security scan triage lacks an artifact.
