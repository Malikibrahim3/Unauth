# Deployment Readiness Report

Audit date: 2026-05-06  
Verdict: **Not ready** for an ASOS-level internal pilot.

## 1. Executive Summary

The app has strong foundations: a serious enterprise UI direction, authenticated Supabase app shell, chunked CSV pipeline, conservative identity-linking intent, useful audit/history/customer surfaces, and a deterministic blind benchmark suite. However, it is not deployment-ready for a serious merchant pilot because critical tests fail, service-role reads can bypass merchant boundaries in customer profile flows, the upload worker dispatch uses serverless-unsafe fire-and-forget execution, identity/scoring semantics are inconsistent across tests/UI/database, and some core UX flows still feel stitched together.

The safest pilot posture is: **do not show this to ASOS/Gymshark/Zalando yet**. Show it only after the blockers below are fixed and re-audited.

## 2. Enterprise Readiness Verdict

**Not ready**

Reason: the app can build and core pages render, but it fails identity/scoring regression tests, has material data-isolation risks in service-role customer APIs, and has unresolved product semantics around candidate vs confirmed identities.

## 3. Scorecard

| Area | Score |
|---|---:|
| Product clarity | 6/10 |
| UI polish | 6/10 |
| UX flow | 5/10 |
| CSV robustness | 7/10 |
| Identity reliability | 5/10 |
| Explainability | 6/10 |
| Data correctness | 5/10 |
| Security/privacy | 4/10 |
| Performance | 6/10 |
| Code maintainability | 5/10 |

## 4. Architecture Map

Frontend routes:
- App shell: `/dashboard`, `/upload`, `/history`, `/audit/[runId]`, `/audit/[runId]/transaction/[id]`, `/customers`, `/customers/[id]`, `/watchlist`, `/chargebacks`, `/settings/*`, `/help/*`.
- Auth/public/internal: `/login`, `/callback`, `/demo`, `/legal/*`, `/eval`, `/network-metrics`.

API routes:
- Upload/processing: `app/api/audit/route.ts`, `app/api/process-csv-chunk/route.ts`, legacy `app/api/process-csv-job/route.ts`, `app/api/audit/[runId]/progress/route.ts`.
- Investigation/customer: `app/api/audit/[runId]/customer/route.ts`, `app/api/customers/[id]/route.ts`, notes/orders/status/search endpoints.
- Exports/evidence: `app/api/audit/[runId]/export/route.ts`, `app/api/evidence/*`, `app/api/inbox/export/route.ts`.
- Admin/privacy: team/settings/audit-trail/watchlist/lookup/demo routes.

Data model:
- Main tables observed: `merchants`, `merchant_members`, `processing_jobs`, `audit_transactions`, `csv_upload_queue`, `customer_profiles`, `customer_profile_audit_appearances`, `watchlist_entries`, `watchlist_appearances`, `customer_notes`, `evidence_packages`, `fraud_identity_clusters`, `fraud_entities`, `fraud_entity_co_occurrences`, `access_audit_log`, `user_action_log`, `user_permission_grants`, `identity_false_positive_reports`, `identity_transitions`.

CSV pipeline:
- Browser uploads to Supabase Storage in `components/upload/UploadClient.tsx`.
- `app/api/audit/route.ts` downloads with service role, stream-parses via `lib/processing/streamParser.ts`, creates `processing_jobs`, stages chunks in Storage, and dispatches `/api/process-csv-chunk`.
- `lib/processing/worker.ts` validates rows, normalises CSV, builds scoring context, links identities, scores clusters, writes `audit_transactions`, writes enrichment tables, then builds customer profiles via `lib/analysis/entityResolution.ts`.

Identity/scoring:
- In-batch linking: `lib/linker.ts`.
- Cluster scoring: `lib/scorer.ts`.
- Legacy/fast scoring: `lib/engine/*`, `lib/engine/fastScore.ts`, `lib/engine/identityMatching.ts`.
- Summary metrics: `lib/analysis/auditSummary.ts`.

UI/component surface:
- Shared UI: `components/ui/*`, plus older `components/common/*`.
- Audit: `components/audit/*`.
- Customers: `components/customers/CustomerDrawer.tsx`, `CustomerIntelligenceDrawer.tsx`, and an inline audit customer drawer inside `components/audit/AuditCustomersTableClient.tsx`.

Tests/scripts:
- Jest unit/identity/CSV/eval/security language tests under `tests/`.
- Playwright tests under `tests/audit`, `tests/customers`, `tests/evidence`, plus `tests/ux-audit`.
- New audit scripts added under `scripts/deployment-readiness/`.

## 5. Blockers

### BLOCKER: Customer API can leak other merchants' transactions

Evidence: `app/api/customers/[id]/route.ts:166-180` fetches `audit_transactions` by profile email/card/IP using a service-role client without constraining by merchant-owned job IDs. `app/api/customers/[id]/route.ts:192-230` also fetches transactions by appearance IDs/audit IDs without first verifying those appearances belong to the current merchant. `app/api/customers/[id]/route.ts:341-372` returns raw linked account entity values from `fraud_identity_clusters`.

User impact: a merchant viewing a customer profile may see order history or identity values contributed by another merchant.

Business impact: unacceptable for enterprise PII isolation, procurement, security review, and DPA commitments.

Technical cause: service-role bypasses RLS and the query depends on profile-level access rather than transaction/job ownership.

Recommended fix: every service-role customer transaction query must join or prefilter through `processing_jobs.merchant_id = ctx.merchantId`; appearance rows must be scoped through merchant-owned jobs; cross-merchant linked identities must be masked/aggregated, not raw entity values.

Estimated effort: 1-2 days plus regression tests.

Status: reported only.

### BLOCKER: Upload chunk dispatch is serverless-unsafe

Evidence: `app/api/audit/route.ts:257-267` calls `void dispatchChunk(...)` and immediately returns. In serverless runtimes, work scheduled after the response can be frozen before the fetch is sent.

User impact: uploads can remain stuck at "processing" with chunks staged but never processed.

Business impact: high demo embarrassment risk during the most important flow.

Technical cause: fire-and-forget async work inside a request handler.

Recommended fix: await the first dispatch until the request is accepted, or move to a durable queue/background worker. Record dispatch failure on `processing_jobs`.

Estimated effort: 1 day for await/error handling; 3-5 days for durable queue.

Status: reported only.

### BLOCKER: Identity/scoring tests fail

Evidence: `npm test -- --runInBand` failed 4 suites, 22 tests. `reports/deployment-readiness/benchmarks/identity-test-summary.json` records `passed: false`. Failures include `tests/engine/linker.test.ts`, `tests/engine/identityScoring.test.ts`, `tests/engine/auditSummary.test.ts`, and `tests/identity/uiSummary.test.ts`.

User impact: displayed confidence, linked-cluster counts, and review state cannot be trusted.

Business impact: an enterprise buyer will not accept an identity product whose identity engine regressions are red.

Technical cause: current code intentionally lowered card/email/IP weights and changed confirmed-cluster semantics, but older tests still encode previous expectations. Either tests are stale or implementation changed without updating acceptance criteria.

Recommended fix: freeze product semantics, update tests only where the conservative model is intentional, then make all identity/linking/audit-summary tests pass.

Estimated effort: 1-3 days.

Status: reported only.

### BLOCKER: Candidate/probable/confirmed semantics are inconsistent in summaries and UI

Evidence: `lib/analysis/auditSummary.ts` counts `linkedClusters` only from `confirmed_identity_id` or definite rows, causing benchmark linked-cluster counts of `0` on `small_sanity` despite 9 true surfaced matches and `1` on large/adversarial datasets despite multiple seeded clusters. See `reports/deployment-readiness/benchmarks/BENCHMARK_SUMMARY.md`.

User impact: the top-level dashboard can understate the number of linked profiles/clusters and confuse analysts.

Business impact: undermines trust in headline metrics.

Technical cause: confirmed-link count is named/displayed as linked-cluster count.

Recommended fix: split metrics: `candidate clusters`, `probable clusters`, `confirmed identities`, `merchant-confirmed identities`, `dismissed matches`.

Estimated effort: 1-2 days.

Status: reported only.

## 6. High-Priority Fixes

### HIGH: Export CSV injection risk

Evidence: `app/api/audit/[runId]/export/route.ts:87-100` quotes user-controlled cells but does not neutralize formula-leading characters (`=`, `+`, `-`, `@`, tab, CR).

Impact: opening exports in Excel/Sheets can execute formula payloads from uploaded CSV fields.

Fix: centralize CSV cell escaping and prefix dangerous formula values with `'`.

Effort: 0.5 day.

Status: reported only.

### HIGH: Progress/export counts still use legacy risk fields

Evidence: `app/api/audit/[runId]/progress/route.ts:39-47` counts flagged rows by `risk_level in high/critical`, while the product now uses identity confidence. Audit page uses identity fields, creating count drift.

Impact: upload complete state and dashboards can disagree with audit results.

Fix: use `identity_confidence_grade IS NOT NULL` or `match_status IN ('candidate','probable','definite')` depending on metric.

Effort: 0.5 day.

Status: reported only.

### HIGH: Customer profile transaction caps remain

Evidence: `app/api/customers/[id]/route.ts:166-198` uses `.limit(1000)` on direct and appearance-based transaction fetches. `app/(app)/customers/[id]/page.tsx` has similar 1000/200 limits.

Impact: high-volume customer profiles can show incomplete timelines and incorrect metrics.

Fix: range pagination until exhaustion, always scoped by merchant job IDs.

Effort: 1 day.

Status: reported only.

### HIGH: CSV and upload limits are inconsistent

Evidence: frontend says `Max 50 MB · up to 100,000 rows` at `components/upload/UploadClient.tsx:491`; backend stream parser allows `MAX_ROWS = 5_000_000` at `lib/processing/streamParser.ts:20`; API has a 500 MB constant but returns a `50 MB` error at `app/api/audit/route.ts:151-154`.

Impact: merchants get contradictory guidance and support will struggle to explain limits.

Fix: one shared constant/copy source for browser copy, API validation, and docs.

Effort: 0.5 day.

Status: reported only.

### HIGH: CSV parser warns about unmapped headers but UI/API do not persist or display them

Evidence: `app/api/audit/route.ts:274-278` returns unmapped header warnings, but `UploadClient` does not surface the API warning after upload starts. Benchmark header-chaos files show valid parsing but multiple unmapped headers.

Impact: merchants can silently lose useful fields.

Fix: persist upload warnings to `processing_jobs` and display them in upload completion/data-quality screens.

Effort: 1 day.

Status: reported only.

### HIGH: Duplicate customer investigation surfaces

Evidence: canonical `components/customers/CustomerDrawer.tsx`, older `components/customers/CustomerIntelligenceDrawer.tsx`, and inline `AuditCustomerDrawer` in `components/audit/AuditCustomersTableClient.tsx`.

Impact: different drawers show different concepts, labels, actions, and confidence language.

Fix: migrate audit/global customers to one shared `CustomerProfileDrawer` and one full-page profile model.

Effort: 2-4 days.

Status: reported only.

## 7. Medium/Low Priority Fixes

- MEDIUM: Build passes but with many lint warnings, unused variables, and dead paths. Fix before demo freeze.
- MEDIUM: Public `/demo` uses a service-role client in a public page (`app/(public)/demo/page.tsx:47-58`). It is filtered to a demo merchant, but public service-role routes deserve extra monitoring and tests.
- MEDIUM: legacy `/api/process-csv-job` remains beside the chunked route, increasing drift and security surface.
- MEDIUM: customer list click in Playwright did not open an obvious drawer/page from the row itself; "View" links are clearer than row-click affordance.
- MEDIUM: evidence package pages still use "Chargebacks" as nav/page language, which is valid for dispute docs but narrows the product story.
- LOW: duplicate shared UI primitives exist under `components/common` and `components/ui`.
- LOW: security static scan found 49 broad `select('*')` patterns; many are harmless count queries, but high-risk service-role paths should project only necessary columns.

## 8. Screenshots And Evidence

Screenshots saved to `reports/deployment-readiness/screenshots/`.

Key captures:
- `01-dashboard.png`: authenticated dashboard.
- `03-upload-mapping.png`: CSV mapping.
- `04-upload-context.png`: upload context.
- `06-audit-results.png`: audit result page.
- `08-audit-customer-drawer.png`: audit customer drawer/list state.
- `09-customers-list.png`: global customers.
- `11-watchlist.png`: empty watchlist.
- `12-evidence-packages.png`: evidence packages.

Playwright evidence JSON: `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json`.

## 9. Benchmark Results

Benchmark summary: `reports/deployment-readiness/benchmarks/BENCHMARK_SUMMARY.md`.

Highlights:
- Negative control: 1,500 rows, 0 surfaced, 0 false positives.
- Medium realistic: 1,350 rows, precision 1.0, recall 0.8485, 10 false negatives.
- Adversarial: 402 rows, precision 1.0, recall 0.8469, 15 false negatives.
- Large: 5,400 rows, all processed, precision 1.0, recall 0.8462, 20 false negatives.
- Reship/refund seeded scenarios are consistently missed.
- Header chaos formats parse as valid, including tab/semicolon/BOM/pipe, but unmapped headers remain.

## 10. UI/UX Findings

The UI is directionally enterprise-serious: dense tables, restrained colors, persistent sidebar, and dashboard cards are closer to Amplitude than a generic landing-page SaaS. The product is still not cohesive enough for an ASOS-level buyer:

- The audit page says `Customers (82)` while action copy says 2 customers and 9 orders with signals, which can confuse reviewers.
- Customer investigation has three competing surfaces with different framing.
- "Risk score" and grade badges still appear in customer views, while the product principle prefers identity confidence and evidence.
- Upload mapping is functional, but dense select menus expose too many fields at once; required and useful optional fields need clearer scan hierarchy.
- Empty states are decent but not always action-specific.

## 11. Security/Privacy Findings

Detailed file: `reports/deployment-readiness/SECURITY_PRIVACY_AUDIT.md`.

Most important: service-role customer APIs must not query by email/card/IP without merchant job scoping. CSV export injection needs a fix before enterprise pilots. Public/service-role demo and broad selects need focused review.

## 12. Database/RLS Findings

The migrations show previous RLS fixes for `processing_jobs` and `audit_transactions`, but many server components/API routes use `createServiceClient()`. When service role is used, RLS is not the control; application-level merchant filters must be perfect.

Known guarded issues:
- 1000-row summary cap is fixed on audit summary/export benchmarks.
- Customer profile pages still have 1000/200 caps.
- `audit_transactions` RLS was fixed in `0043`, but service-role routes can still bypass it.

## 13. Identity/Scoring Findings

Detailed file: `reports/deployment-readiness/IDENTITY_ENGINE_AUDIT.md`.

Current model is conservative on false positives, which is the right direction, but semantics are not ready: tests fail, candidate/confirmed naming is mixed, and benchmark false negatives concentrate in reship/refund patterns.

## 14. Recommended Refactor Roadmap

1. Centralize identity match states and labels: `none`, `candidate`, `probable`, `confirmed`, `merchant_confirmed`, `dismissed`.
2. Replace risk-oriented UI names with confidence/evidence language.
3. Unify `CustomerProfileDrawer`, full profile, `IdentityConfidenceBadge`, `EvidenceSignalsList`, `LinkedIdentityList`, `AuditSummaryCards`, `TransactionTable`, `PageHeader`, `SectionCard`, `EmptyState`, `LoadingState`, `FilterBar`.
4. Make all service-role queries call a shared `merchantScopedJobIds(ctx)` or equivalent helper.
5. Move CSV export escaping to a shared helper.
6. Replace fire-and-forget upload dispatch with a durable queue.

## 15. 7-Day Action Plan

Day 1: Fix service-role merchant scoping in customer APIs and add regression tests.  
Day 2: Fix upload first-dispatch reliability and failed dispatch job states.  
Day 3: Reconcile identity/scoring semantics and get all identity Jest tests green.  
Day 4: Fix CSV export injection, progress count drift, and upload limit copy.  
Day 5: Split candidate/probable/confirmed metrics in DB/API/UI.  
Day 6: Unify customer drawer entry points enough for one consistent demo path.  
Day 7: Run full Playwright + benchmark + security audit and freeze a pilot demo dataset.

## 16. 30-Day Enterprise-Readiness Plan

- Durable job queue/background worker and idempotent upload processing.
- Formal RLS/service-role threat model and automated cross-merchant isolation tests.
- Enterprise audit log coverage for export/evidence/profile actions.
- Unified investigation workspace with evidence, timelines, recommended review actions, notes, watchlist, and false-positive feedback.
- Tenant-safe exports and evidence-package access controls.
- Performance test at 100k+ rows with memory and query timing budgets.
- Security pack: DPA/privacy copy review, retention controls, incident logging, rate limits, and PII minimization.

## 17. Files Changed

Added:
- `scripts/deployment-readiness/run-benchmarks.ts`
- `scripts/deployment-readiness/audit-identity.mjs`
- `scripts/deployment-readiness/audit-security.mjs`
- `scripts/deployment-readiness/audit-ux-playwright.mjs`
- `reports/deployment-readiness/*`

Modified:
- `package.json` audit scripts.

Implementation files were not changed.

## 18. Commands To Rerun

```bash
npm run build
npm test -- --runInBand
npm run audit:csv
npm run audit:identity
npm run audit:security
npm run audit:ux
npm run audit:deployment
```

