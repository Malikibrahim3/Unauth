# Sonnet Fix Pass 2 Prompt

You are fixing the second-pass enterprise deployment-readiness audit for a Next.js + Supabase app handling sensitive merchant/customer/order data.

The first fix pass improved tests and benchmarks, but the app is still not enterprise-ready. Do not optimize for making tests pass. Optimize for removing whole classes of security, privacy, data correctness, and auditability risk.

Target outcome:
- Minimum 9/10 across security/privacy, data correctness, identity reliability, CSV robustness, UX flow, performance, and maintainability.
- No cross-merchant data exposure under any service-role path.
- No merchant-facing copy that accuses a customer of fraud or guilt.
- Conservative identity matching: false positives are worse than false negatives.
- Candidate, probable, definite, merchant-confirmed, dismissed, and false-positive-reported states must remain distinct.

Read these first:
1. `reports/deployment-readiness/SECOND_PASS_AUDIT.md`
2. `reports/deployment-readiness/DEPLOYMENT_READINESS_REPORT.md`
3. `reports/deployment-readiness/SECURITY_PRIVACY_AUDIT.md`
4. `reports/deployment-readiness/IDENTITY_ENGINE_AUDIT.md`
5. `reports/deployment-readiness/CSV_INGESTION_AUDIT.md`
6. `reports/deployment-readiness/UX_FLOW_MAP.md`
7. `reports/deployment-readiness/COMPONENT_DUPLICATION_REPORT.md`

Fix these blocker classes everywhere, not just in the example files:

1. Service-role tenant isolation
   - Every service-role read/write of merchant data must prove merchant ownership in code.
   - Do not rely on RLS with service-role clients.
   - Do not fetch transactions by email/card/IP/profile/transaction ID unless also constrained through merchant-owned `processing_jobs.id`.
   - Create shared helpers if needed, for example:
     - `getCallerContextOrThrow`
     - `getMerchantOwnedJobIds`
     - `assertMerchantOwnsJob`
     - `fetchMerchantScopedCustomerProfile`
     - `fetchMerchantScopedCustomerTransactions`
     - `fetchMerchantScopedTransaction`
     - `paginateAll`
     - `escapeCsvCell`
   - Prefer central helpers over duplicating query logic across pages/routes.

2. Full customer profile page
   - Fix `app/(app)/customers/[id]/page.tsx`.
   - It currently duplicates the old unsafe customer API logic.
   - Scope appearances through merchant-owned jobs.
   - Scope all transaction reads by merchant-owned job IDs.
   - Remove fixed 200/1000-row caps by using pagination.
   - Never render raw linked entity values from `fraud_identity_clusters` that might belong to another merchant.
   - Reuse the safe logic from `app/api/customers/[id]/route.ts` or move both to a shared server helper.

3. Inbox and review queue
   - Fix `app/api/inbox/export/route.ts`.
   - Fix `app/(app)/inbox/page.tsx`.
   - Queries must be scoped to merchant-owned jobs.
   - Use identity fields (`identity_confidence_grade`, `identity_score`, `match_status`) rather than legacy `risk_level`.
   - Paginate exports; no silent 10,000 row cap.
   - Use a shared CSV escaping helper that neutralizes formula injection for every string cell.

4. Customer orders and evidence packages
   - Fix `app/api/customers/[id]/orders/route.ts`.
   - Fix `app/api/evidence/route.ts`.
   - Fix `lib/evidence/buildPackage.ts`.
   - Verify profile belongs to `ctx.merchantId`.
   - Verify disputed order belongs to `ctx.merchantId`.
   - Fetch only transactions from merchant-owned jobs.
   - Evidence packages must not include cross-merchant PII.

5. Transaction detail page
   - Fix `app/(app)/audit/[runId]/transaction/[id]/page.tsx`.
   - Verify current user has permission.
   - Verify `params.runId` belongs to `ctx.merchantId`.
   - Fetch transaction by both `id` and `job_id`.

6. Public demo service role
   - Fix `app/(public)/demo/page.tsx`.
   - Public unauthenticated routes must not import or use `SUPABASE_SERVICE_ROLE_KEY`.
   - Move demo reads to a tightly scoped server helper/API exposing only synthetic demo fields, or use anon client plus RLS-safe demo policy.
   - Add a test that fails if public routes reference service-role credentials.

7. Watchlist merchant ID consistency
   - Fix `app/api/watchlist/route.ts`.
   - Fix `app/api/watchlist/[id]/route.ts`.
   - Use `ctx.merchantId`, not `ctx.userId`, for `watchlist_entries.merchant_id`.
   - Add tests for owner and team-member contexts.

8. UX audit must fail closed
   - Fix `scripts/deployment-readiness/audit-ux-playwright.mjs`.
   - If login fails, localhost is unavailable, any critical route cannot be captured, or fewer than the expected screenshots are written, exit non-zero.
   - Do not record `playwright-error` as a successful audit.

9. Dependency audit
   - Run `npm audit --audit-level=moderate`.
   - Upgrade vulnerable dependencies intentionally.
   - Do not use `npm audit fix --force` blindly.
   - Prefer compatible Next 14.x patch upgrades unless the app is intentionally moved to a newer major.

10. Eval/test quality
   - `tests/eval/engineEval.test.ts` currently passes while logging false positives on `clean.csv`.
   - Either retire this obsolete eval path or make it assert conservative false-positive ceilings.
   - Add behavioral tests for merchant isolation, not only source-code substring tests.

Important implementation rules:
- Do not do a huge redesign.
- Do not weaken identity thresholds to improve recall.
- Do not permanently merge candidate/probable matches.
- Do not expose raw cross-merchant linked identity values.
- Do not leave fixed export/query caps where users expect complete data.
- Do not use accusatory labels such as fraudster, guilty, confirmed fraud, probable fraud, deny claim, or fraud confirmed in user-facing UI.
- Keep changes scoped, but fix the class of bug everywhere.

After changes, run and report:

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
- Which blocker classes are fixed.
- Tests added.
- Exact command results.
- Remaining risks, with severity.

