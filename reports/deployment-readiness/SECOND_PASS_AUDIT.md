# Second-Pass Deployment Readiness Audit

Date: 2026-05-06

## Verdict

Sonnet's first fix pass materially improved the app, but it is still not ready for an ASOS-level pilot and is not yet close to the target of 9-10/10 across all fronts.

Updated verdict: Not ready, but materially closer.

## Gate Results

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `npm test -- --runInBand` | Pass: 30 suites, 414 tests |
| `npm run audit:deployment` | Pass command, but security scan still reports unresolved patterns |
| `npm run audit:csv` | Pass |
| `npm run audit:identity` | Pass |
| `npm run audit:security` | Pass command, but 266 static findings remain |
| `npm run audit:ux` with dev server live | Pass: 13 screenshots/evidence entries |
| `npm run audit:ux` without dev server | False pass: exits 0 with only a browser connection error |
| `npm audit --audit-level=moderate` | Fail: 7 vulnerabilities, including high-severity Next.js advisories |

## Updated Scorecard

| Area | Previous | Second pass | Target |
|---|---:|---:|---:|
| Product clarity | 6/10 | 7/10 | 9/10 |
| UI polish | 6/10 | 7/10 | 9/10 |
| UX flow | 5/10 | 6/10 | 9/10 |
| CSV robustness | 7/10 | 8/10 | 9/10 |
| Identity reliability | 5/10 | 8/10 | 9/10 |
| Explainability | 6/10 | 7/10 | 9/10 |
| Data correctness | 5/10 | 7/10 | 9/10 |
| Security/privacy | 4/10 | 5/10 | 9/10 |
| Performance | 6/10 | 7/10 | 9/10 |
| Code maintainability | 5/10 | 6/10 | 9/10 |

## What Improved

- The production build now passes.
- The full Jest suite now passes: 414/414 tests.
- The identity audit now passes.
- The original customer API route now scopes transaction reads through merchant-owned jobs.
- Upload chunk dispatch now awaits the first dispatch instead of using fire-and-forget.
- Audit export now paginates, includes all rows, uses identity fields, and neutralizes CSV formula injection.
- CSV upload copy now matches the 500 MB / 5,000,000 row implementation.
- Synthetic benchmark results are stronger: no false positives in the negative-control dataset, precision 1.0 across benchmark datasets, and linked-cluster counts improved.
- UX screenshots now show a more cohesive enterprise direction with safer "identity match" language.

## Remaining Blockers

### BLOCKER: Full customer profile page still bypasses merchant isolation

Evidence:
- `app/(app)/customers/[id]/page.tsx:192` creates a service-role client directly.
- `app/(app)/customers/[id]/page.tsx:237` reads `customer_profile_audit_appearances` by `profile_id` without scoping appearances to jobs owned by the caller's merchant.
- `app/(app)/customers/[id]/page.tsx:262` fetches transactions by raw transaction IDs without also requiring job ownership.
- `app/(app)/customers/[id]/page.tsx:292` fallback query reads `audit_transactions` by email/card/IP without any `job_id` merchant boundary.
- `app/(app)/customers/[id]/page.tsx:346` reads `fraud_identity_clusters` and `app/(app)/customers/[id]/page.tsx:361` returns raw linked entity values.

Impact:
This page can leak cross-merchant transaction and identity data through the service role. The API route was fixed, but the full page duplicated the same risky logic.

Required fix:
Do not duplicate the customer intelligence query in the page. Move the merchant-scoped logic into a shared server helper and use it from both `app/api/customers/[id]/route.ts` and `app/(app)/customers/[id]/page.tsx`, or make the page call the same scoped helper. All transaction reads must be constrained by merchant-owned `processing_jobs.id`. Raw cross-merchant cluster entity values must never be rendered.

### BLOCKER: Inbox export is cross-merchant and CSV-injection unsafe

Evidence:
- `app/api/inbox/export/route.ts:28` calls `requirePermission` but discards `ctx`.
- `app/api/inbox/export/route.ts:31` reads `audit_transactions` without joining/filtering to processing jobs owned by `ctx.merchantId`.
- `app/api/inbox/export/route.ts:34` still uses legacy `risk_level` instead of identity confidence fields.
- `app/api/inbox/export/route.ts:37` caps export at 10,000 rows.
- `app/api/inbox/export/route.ts:53` writes unescaped raw cells for `order_id`, date, risk level, score, and value.

Impact:
A merchant could export other merchants' review queue rows if RLS does not protect service-role reads, and spreadsheet formula payloads can survive in exported cells.

Required fix:
Fetch merchant-owned job IDs first, then export only transactions for those jobs. Use `identity_confidence_grade` / `match_status`, not `risk_level`. Paginate the export. Reuse the safe CSV cell escaping helper from the audit export route.

### BLOCKER: Customer orders API leaks orders by email

Evidence:
- `app/api/customers/[id]/orders/route.ts:30` filters customer profile by `merchant_id`, but `customer_profiles` elsewhere uses `merchant_ids`; this may miss valid profiles or create inconsistent authorization behavior.
- `app/api/customers/[id]/orders/route.ts:48` fetches `audit_transactions` by customer email without merchant-owned job scoping.
- `app/api/customers/[id]/orders/route.ts:59` reads appearances by profile only, then trusts those `audit_id` values without verifying ownership.

Impact:
Evidence package order selection can include rows from another merchant sharing the same email.

Required fix:
Use the same shared merchant-scoped customer transaction helper as the main customer API/profile page.

### BLOCKER: Evidence package generation reads cross-merchant profile/order data

Evidence:
- `lib/evidence/buildPackage.ts:69` fetches a customer profile by ID only.
- `lib/evidence/buildPackage.ts:80` fetches transactions by profile emails only, without constraining to merchant-owned jobs.
- `app/api/evidence/route.ts` passes `ctx.merchantId`, but `buildEvidencePackage` does not enforce it for profile or order reads.

Impact:
A generated evidence package can include another merchant's customer orders if the profile ID or email overlaps.

Required fix:
`buildEvidencePackage` must verify profile merchant membership and fetch only orders whose `job_id` belongs to `ctx.merchantId`. It should also verify the disputed order belongs to that merchant.

### BLOCKER: Transaction detail page reads any transaction by ID with service role

Evidence:
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx:23` creates a service-role client.
- `app/(app)/audit/[runId]/transaction/[id]/page.tsx:24` reads `audit_transactions` by transaction ID only.
- It does not verify that `params.runId` belongs to the current merchant or that the transaction belongs to `params.runId`.

Impact:
Anyone with a valid transaction UUID could view transaction PII from another merchant.

Required fix:
Use auth/RBAC and verify `processing_jobs.id = params.runId` belongs to `ctx.merchantId`, then fetch the transaction with both `.eq('id', params.id)` and `.eq('job_id', params.runId)`.

### BLOCKER: Public demo route uses service-role credentials in a public page

Evidence:
- `app/(public)/demo/page.tsx:47` explicitly uses service role on a public route.
- `app/(public)/demo/page.tsx:50` reads `SUPABASE_SERVICE_ROLE_KEY`.

Impact:
Even if the key is server-only, public unauthenticated routes should not directly use privileged credentials. Any bug in filtering or future edit can expose tenant data.

Required fix:
Move demo data behind a locked server helper or API that only exposes whitelisted synthetic fields for `NEXT_PUBLIC_DEMO_MERCHANT_ID`, or use an anon/RLS-safe demo policy. Add a test preventing `SUPABASE_SERVICE_ROLE_KEY` in public routes.

## High-Priority Issues

### HIGH: UX audit script can falsely pass

Evidence:
- `scripts/deployment-readiness/audit-ux-playwright.mjs:116` catches Playwright errors and records a note.
- It never sets `process.exitCode = 1` when login/navigation/screenshots fail.
- Running `npm run audit:ux` without a dev server exited 0 with only `ERR_CONNECTION_REFUSED`.

Required fix:
Fail the script if any `playwright-error`, `auth-skipped`, missing critical screenshot, failed login, or fewer than the expected 13 route captures occur.

### HIGH: Watchlist uses `ctx.userId` instead of `ctx.merchantId`

Evidence:
- `app/api/watchlist/route.ts:19` filters by `merchant_id = ctx.userId`.
- `app/api/watchlist/route.ts:44` writes `merchant_id = ctx.userId`.
- `app/api/watchlist/[id]/route.ts` uses the same pattern.

Impact:
Team members and owner accounts can see different watchlists, and data may be written under the wrong identifier.

Required fix:
Use `ctx.merchantId` consistently. Add tests for owner and team member contexts.

### HIGH: Dependency audit fails

Evidence:
- `npm audit --audit-level=moderate` failed with 7 vulnerabilities.
- High-severity advisories affect `next`, `glob`, and `@supabase/ssr` via `cookie`.

Required fix:
Upgrade Next.js within the safest compatible 14.x patch if possible, upgrade Supabase SSR package intentionally, and rerun build/tests/audit. Do not use `npm audit fix --force` blindly.

### HIGH: Passing eval logs still show a false-positive-heavy legacy eval path

Evidence:
- `tests/eval/engineEval.test.ts` passes while logging `clean.csv` false positives: 53 FP, flag rate 26.5%.

Impact:
The core benchmark harness looks conservative, but at least one retained evaluation path still encodes behavior that would be unacceptable for a merchant-facing identity review product.

Required fix:
Decide whether the legacy eval path is obsolete. If obsolete, remove or replace it. If retained, make it assert false-positive ceilings.

## Updated Benchmark Results

| Dataset | Rows | Surfaced | TP | FP | FN | Precision | Recall | Review rate | Linked clusters |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| small_sanity | 91 | 9 | 9 | 0 | 0 | 1.00 | 1.00 | 9.89% | 2 |
| medium_realistic | 1,350 | 56 | 56 | 0 | 10 | 1.00 | 0.8485 | 4.15% | 7 |
| negative_control | 1,500 | 0 | 0 | 0 | 0 | 1.00 | 1.00 | 0.00% | 0 |
| adversarial_fraud | 402 | 83 | 83 | 0 | 15 | 1.00 | 0.8469 | 20.65% | 7 |
| large_merchant_scale | 5,400 | 110 | 110 | 0 | 20 | 1.00 | 0.8462 | 2.04% | 7 |

## Fastest Path To 9/10

1. Build a shared merchant-scoped data access layer for customer profiles, customer orders, transaction details, inbox queue, exports, and evidence packages.
2. Ban service-role reads from route/page code unless a helper proves merchant scope in the same function.
3. Replace source-code substring security tests with behavioral mock tests that assert query constraints and forbidden branches.
4. Fix watchlist merchant ID consistency.
5. Make UX audit scripts fail closed.
6. Resolve dependency advisories with controlled package upgrades.
7. Re-run the full audit and update this report.

## Commands Run

```bash
npm run build
npm test -- --runInBand
npm run audit:csv
npm run audit:identity
npm run audit:security
npm run audit:deployment
npm run dev
npm run audit:ux
npm audit --audit-level=moderate
```

