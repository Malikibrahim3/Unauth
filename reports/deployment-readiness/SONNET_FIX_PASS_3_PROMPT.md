# Sonnet Fix Pass 3 Prompt

You are fixing the third-pass enterprise readiness audit. The app is closer, but it is still not ASOS-level pilot ready.

Read first:
1. `reports/deployment-readiness/THIRD_PASS_AUDIT.md`
2. `reports/deployment-readiness/SECOND_PASS_AUDIT.md`
3. `reports/deployment-readiness/DEPLOYMENT_READINESS_REPORT.md`

Do not optimize for green tests. The tests are green already. Optimize for closing the remaining security/privacy/data-correctness gaps that the tests missed.

Fix these in order:

1. Public customer search leak
   - Fix `app/api/customers/search/route.ts`.
   - It currently uses `createServiceClient()` without auth or permission checks.
   - Add `auth.getUser()`.
   - Add `requirePermission(..., PERMISSIONS.VIEW_CUSTOMERS)`.
   - Scope results to `ctx.merchantId`.
   - Use `merchant_ids @> [ctx.merchantId]` or a shared helper.
   - Return 401 unauthenticated.
   - Add route-level tests proving unauthenticated search is blocked and cross-merchant profiles are not returned.

2. CE3 check endpoint
   - Fix `app/api/evidence/ce3-check/route.ts`.
   - Do not use `.eq('merchant_id', ctx.merchantId)` on `customer_profiles` or `audit_transactions`.
   - Use `fetchMerchantScopedCustomerProfile` and `fetchMerchantScopedCustomerTransactions`.
   - Verify the requested disputed order belongs to the merchant through job ownership.
   - Remove `.limit(500)` by using pagination through the helper.
   - Add route/helper tests proving cross-merchant order IDs return ineligible/404 and owned orders work.

3. Inbox review queue semantics
   - Fix `app/(app)/inbox/page.tsx`.
   - Fix `app/api/inbox/export/route.ts`.
   - Create a shared helper such as `fetchMerchantReviewQueueRows`.
   - Page and export must use the same definition:
     - `job_id` belongs to `ctx.merchantId`.
     - review-worthy rows only: `identity_confidence_grade IS NOT NULL` or `match_status IN ('candidate','probable','definite')`.
     - exclude `dismissed_by_merchant = true`.
     - order by `identity_score` then processed date.
   - Do not filter by legacy `risk_level`.
   - Do not order by legacy `match_score`.
   - Export must not include `match_status = 'none'`.
   - Add tests for page/export semantics, especially that normal rows are excluded.

4. Linked identity privacy
   - Fix `app/(app)/customers/[id]/page.tsx`.
   - Current linked identity code reads global `fraud_identity_clusters` and returns cluster-derived entity types/confidence.
   - Either remove this global cluster read from the merchant UI or derive linked identity signals only from merchant-owned `audit_transactions`.
   - Do not expose cross-merchant cluster existence, counts, entity types, or confidence unless there is an explicit privacy-reviewed aggregate product contract.
   - The current comment claiming the query is scoped to merchant jobs is false. Make the code truthful and safe.

5. Tests
   - Add behavioral route tests, not just substring tests.
   - Existing tests did not catch `/api/customers/search`, CE3 check, or inbox semantic drift.
   - Add a static guard that flags any `app/api/**/route.ts` using service role without one of:
     - `auth.getUser()` + `requirePermission()`
     - verified internal HMAC auth
     - explicitly whitelisted public synthetic demo route with no PII
   - Strengthen `tests/eval/engineEval.test.ts`: a clean merchant eval cannot pass with 53 false positives / 26.5% flag rate unless the test is explicitly marked legacy/non-gating. Do not present it as enterprise readiness.

6. Dependency audit
   - `npm audit --audit-level=moderate` still fails.
   - Either upgrade to a safe patched version path, or document accepted mitigations and deployment assumptions in the audit report.
   - Do not hide this failure.

After changes, run:

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
- Tests added.
- Command results.
- Remaining risks.

