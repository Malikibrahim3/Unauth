# Sonnet Fix Pass 9 Prompt

You are fixing the ninth-pass enterprise readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

Pass 8 improved the build and pagination posture, but the app is still not ASOS-level pilot ready. The fresh Playwright audit passes mechanically while the dashboard visibly shows a broken KPI:

```text
CUSTOMERS TO REVIEW Unavailable Count could not be loaded
```

Do not optimize for green Jest tests. Fix the real runtime behavior and add tests that would have caught it.

Read first:

- `reports/deployment-readiness/NINTH_PASS_AUDIT.md`
- `reports/deployment-readiness/EIGHTH_PASS_AUDIT.md`
- `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json`
- `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md`
- `reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`

Fix in this order.

## 1. Fix dashboard review queue runtime failure

Current issue:

- `npm run build` passes.
- `npm test -- --runInBand` passes.
- `npm run audit:ux` exits 0.
- But `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json` still contains:
  - `CUSTOMERS TO REVIEW Unavailable Count could not be loaded`

Requirements:

- Diagnose why `countMerchantReviewQueueProfiles()` throws in the seeded happy path.
- Do not hide the problem by changing copy only.
- The dashboard happy path must render a real count.
- Add an audit/UX assertion that fails if dashboard evidence contains `Unavailable` or `Count could not be loaded`.
- Keep the fail-closed behavior for real data-access failures, but the seeded audit flow must not trigger it.

## 2. Resolve `audit_transactions.customer_profile_id` schema drift

Current evidence:

- `lib/supabase/merchantHelpers.ts` selects `customer_profile_id` from `audit_transactions` in `countMerchantReviewQueueProfiles()`.
- `lib/supabase/types.ts` `audit_transactions.Row` does not include `customer_profile_id`.
- `rg customer_profile_id supabase/migrations lib/supabase/types.ts` shows no migration adding `customer_profile_id` to `audit_transactions`.
- The dashboard helper likely fails because it selects a column the database does not have.

Requirements:

Choose one truthful path and implement it completely:

### Option A: Add the column

- Add a migration adding `audit_transactions.customer_profile_id`.
- Backfill it from `customer_profile_audit_appearances` or the authoritative profile-transaction association.
- Update generated/local Supabase types.
- Ensure the processing worker writes it for new transactions.
- Add indexes needed for dashboard/watchlist review queries.

### Option B: Remove the column assumption

- Rewrite `countMerchantReviewQueueProfiles()` to derive profile IDs through an existing proven table, such as `customer_profile_audit_appearances`, scoped through merchant-owned `processing_jobs`.
- Do not select `audit_transactions.customer_profile_id`.
- Preserve the canonical review-worthy definition:
  - `identity_confidence_grade IS NOT NULL`
  - OR `match_status IN ('candidate','probable','definite')`
  - excluding `dismissed_by_merchant IS TRUE`
- Keep merchant scoping through owned job IDs.
- Avoid Supabase default 1000-row caps.

Either way:

- Add tests that would fail if application code selects a column absent from migrations/types.
- Add behavioral tests proving dashboard counts reviewable profiles correctly with >1000 rows.
- Do not use `audit_transactions.merchant_id`.

## 3. Fix watchlist appearance processing

Current issue:

`app/api/process-csv-job/route.ts` and `app/api/process-csv-chunk/route.ts` query:

- `audit_transactions.customer_profile_id`
- `audit_transactions.merchant_id`

Earlier passes already established `audit_transactions.merchant_id` is not a valid ownership path.

Requirements:

- Rewrite watchlist appearance detection through merchant-owned `processing_jobs` and a proven profile association path.
- If using an appearance table, verify the table exists in migrations/types and is populated by processing.
- Do not query `audit_transactions.merchant_id`.
- Do not query `audit_transactions.customer_profile_id` unless you add and backfill that column in this pass.
- Throw or surface Supabase errors instead of silently returning from failed appearance queries.
- Add tests that fail if either route queries `audit_transactions.merchant_id`.

## 4. Fix static security scanner self-match and triage accuracy

Current issue:

`reports/deployment-readiness/benchmarks/security-static-scan.json` reports one `unsafe-html` finding:

```json
{
  "file": "scripts/deployment-readiness/audit-security.mjs",
  "text": "{ id: 'unsafe-html', pattern: /dangerouslySetInnerHTML|innerHTML\\s*=|eval\\s*\\(|new Function/g },"
}
```

This is the scanner's own regex definition, not production XSS.

Requirements:

- Add a precise suppression for `unsafe-html` in `scripts/deployment-readiness/audit-security.mjs` only for the scanner file/pattern definition.
- Do not suppress real `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` usage in app/lib/components code.
- Re-run `npm run audit:deployment`.
- Update `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md` so it accurately reports production unsafe-html findings. If the only finding is the scanner self-match, production unsafe-html should be 0 active findings after suppression.

## 5. Revisit customer search fixed 500-profile pool

Current issue:

- `app/api/customers/search/route.ts` uses `SEARCH_POOL = 500` for partial name matching.
- This is safe, but enterprise merchants can have far more than 500 profiles.

Requirements:

- Prefer a safe paginated search until enough matches are found or a documented hard cap is reached.
- Keep auth and `PERMISSIONS.VIEW_CUSTOMERS`.
- Keep merchant scoping via `merchant_ids`.
- Do not reintroduce raw `.or()` user-input interpolation.
- Add tests for hostile input and partial matches beyond the first page/candidate pool.

## 6. Dependency posture

`npm audit --audit-level=moderate` still fails with 5 vulnerabilities in `glob`, `next`, and `postcss`.

Choose one:

### Preferred for 9-10/10 security

- Upgrade intentionally to the patched Next major path reported by npm audit.
- Resolve build/test/App Router fallout.

### Bounded pilot only

- Update `NPM_AUDIT_MITIGATIONS.md` as a formal risk acceptance with:
  - owner
  - expiry date
  - exact deployment assumptions
  - affected advisories
  - mitigations already applied
  - mandatory pre-scale Next upgrade milestone

Do not claim dependency audit is fixed unless `npm audit --audit-level=moderate` exits 0.

## Preserve prior fixes

Do not regress:

- `npm run build` must pass.
- `getMerchantOwnedJobIds()` must stay paginated.
- `countReviewWorthyTransactions()` must not query `audit_transactions.merchant_id`.
- `countReviewWorthyTransactions()` must throw on Supabase errors.
- `countReviewWorthyTransactions()` must use `.not('dismissed_by_merchant', 'is', true)`.
- `/api/customers/search` must not compose raw user input into `.or()` strings.
- `app/(app)/customers/page.tsx` must use `escapePostgrestFilterValue`.
- `app/api/customers/[id]/route.ts` must not query the global cluster graph table.
- `app/api/customers/[id]/route.ts` must not use `.limit(1000)`.
- `next.config.js` must not use wildcard image hostnames.
- Dashboard must not display false zero on helper failure.

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

Also verify:

```bash
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json','utf8')); const s=JSON.stringify(j); if(s.includes('Unavailable') || s.includes('Count could not be loaded')) { console.error('Dashboard contains unavailable review queue metric'); process.exit(1); }"
```

Return:

- Files changed.
- Exact blockers fixed.
- Tests added or strengthened.
- Exact command results.
- Remaining risks with severity.

Do not claim 9/10 while the dashboard happy path shows `Unavailable`, while app code queries columns not present in migrations/types, while scanner self-matches remain active findings, or while dependency audit is only accepted but not fixed.
