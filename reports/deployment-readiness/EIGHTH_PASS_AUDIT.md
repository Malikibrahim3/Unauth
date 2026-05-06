# Eighth-Pass Enterprise Readiness Audit

Date: 2026-05-06  
Scope: Verification after Sonnet/Copilot Fix Pass 7  
Verdict: **Not deployable: production build currently fails**

## Executive Summary

Pass 7 made useful changes:

- Dashboard review queue logic now delegates to `countMerchantReviewQueueProfiles()`.
- Customer detail fallback removed the direct `.limit(1000)` and now paginates with `.range()`.
- Customer search no longer exact-matches `names` and now does safe partial matching in application code.
- The static security scanner now records suppressed findings separately.

However, the app is currently **not deployable** because `npm run build` fails with a TypeScript error in `/api/customers/search`. Green Jest tests missed it. There are also still enterprise-scale correctness gaps under the new helpers: `getMerchantOwnedJobIds()` is unpaginated, so dashboard, inbox/export, evidence, and customer-profile helper paths can silently ignore jobs after Supabase's default row cap. Dashboard also catches helper failures and displays `0`, reintroducing the "silent zero" pattern that previous passes worked to remove.

## Current Scorecard

| Area | Score | Notes |
|---|---:|---|
| Product clarity | 8.5/10 | Copy direction remains good. |
| UI polish | 8/10 | Last UX audit passed, but current build failure blocks deploy validation. |
| UX flow | 8/10 | Playwright not rerun after build failure; previous run passed. |
| CSV robustness | 8.5/10 | Benchmark output remains strong. |
| Identity reliability | 8/10 | Legacy clean eval still reports 53 FPs / 26.5% flag rate. |
| Explainability | 8.5/10 | Cross-merchant cluster UI/API leak remains fixed. |
| Data correctness | 7.5/10 | Hidden job-ID cap and dashboard silent-zero behavior remain. |
| Security/privacy | 8/10 | Scanner triage improved, but npm audit still fails and no triage report artifact exists. |
| Performance | 7.5/10 | New search uses a fixed 500-profile candidate pool; helper job scope is unpaginated. |
| Maintainability | 7.5/10 | Better helpers, but build/test gap and partial source-inspection tests persist. |

## Command Results

| Command | Result |
|---|---|
| `npm run build` | **FAIL** — TypeScript error in `app/api/customers/search/route.ts:72`: parameter `r` implicitly has `any` type. |
| `npm test -- --runInBand` | PASS — 32 suites, 515 tests. |
| `npm run audit:deployment` | PASS exit code; scanner now reports 247 unsuppressed findings and 29 suppressed findings. |
| `npm run dev` | Not run after build failure. |
| `npm run audit:ux` | Not run after build failure. |
| `npm audit --audit-level=moderate` | FAIL — 5 vulnerabilities remain in `glob`, `next`, and `postcss`; fix path is Next 16 breaking upgrade. |

## Blockers And High-Priority Findings

### BLOCKER: Production Build Fails

**Evidence**

- `npm run build` fails at `app/api/customers/search/route.ts:72`.
- Error: `Parameter 'r' implicitly has an 'any' type.`
- The failing code is the new application-side partial-name filter:
  - `const nameMatches = (namePoolRes.data ?? []).filter((r) => ...`

**Impact**

The app cannot be deployed. This is an immediate blocker regardless of test results.

**Recommended Fix**

Add an explicit result-row type for customer search rows and type both the Supabase result casts and filter callback. Add a build-gating test or CI command so this cannot be missed by Jest.

**Effort**: 0.25 day  
**Status**: Not fixed

### BLOCKER: Shared Merchant Job-ID Helper Is Still Unpaginated

**Evidence**

- `lib/supabase/merchantHelpers.ts:288-298` defines `getMerchantOwnedJobIds()` with:
  - `.from('processing_jobs')`
  - `.select('id')`
  - `.eq('merchant_id', merchantId)`
  - no `.range()` pagination and no count/RPC.
- `countMerchantReviewQueueProfiles()` calls it at `lib/supabase/merchantHelpers.ts:185`.
- `fetchMerchantReviewQueueRows()` calls it at `lib/supabase/merchantHelpers.ts:575`.
- `lib/evidence/buildPackage.ts` also calls `getMerchantOwnedJobIds()`.

**Impact**

For merchants with more than the default Supabase row cap of processing jobs, all downstream job-scoped reads can silently ignore older jobs. This affects dashboard review counts, inbox/export populations, evidence packages, and customer-scoped transaction fetches.

**Business Impact**

Enterprise merchants with many uploads could see incomplete review queues or evidence packages. This is exactly the "large merchant" class the audit is meant to protect.

**Recommended Fix**

Make `getMerchantOwnedJobIds()` paginate all processing jobs, or replace it with an RPC/count-safe query pattern. Add behavioral tests with >1000 jobs proving dashboard/inbox/export/evidence helpers include jobs beyond the first page.

**Effort**: 0.5 day  
**Status**: Not fixed

### HIGH: Dashboard Reintroduces Silent Zero On Summary Failure

**Evidence**

- `app/(app)/dashboard/page.tsx:71-77` calls `countMerchantReviewQueueProfiles()` inside `try/catch`.
- On any helper error it sets `reviewQueue = 0`.
- The comment says "KPI shows 0 with stale data warning", but no actual warning state is present in the code shown.

**Impact**

Previous passes explicitly fixed helpers to throw instead of silently returning zero. Dashboard now swallows those errors and presents `0`, which can mislead an enterprise buyer.

**Recommended Fix**

Return an explicit error/warning state in the dashboard UI, or render the metric as unavailable. Do not convert data-access failures into `0`.

**Effort**: 0.5 day  
**Status**: Not fixed

### HIGH: Dashboard Permission Denial Is Not Fail-Closed

**Evidence**

- `app/(app)/dashboard/page.tsx:22-25` calls `requirePermission(...)` but destructures only `{ ctx }`.
- It does not inspect or return `denied`.
- If the user lacks permission, dashboard can render with partial/zero data.

**Impact**

Permission denial should not look like an empty dashboard. Enterprise access-control behavior must fail closed with a redirect/403/error state.

**Recommended Fix**

Handle `{ denied, ctx }` explicitly. If denied, return the denied response or a clear access-denied UI, matching the inbox route pattern.

**Effort**: 0.25 day  
**Status**: Not fixed

### HIGH: Security Scan Triage Artifact Missing

**Evidence**

- `scripts/deployment-readiness/audit-security.mjs` now outputs suppressed findings separately.
- `reports/deployment-readiness/SECURITY_SCAN_TRIAGE.md` does not exist.
- Scanner still reports 247 unsuppressed findings: 121 service-role, 77 csv-export, 48 broad-select, 1 unsafe-html.

**Impact**

The scanner is less noisy, but the requested enterprise-readable triage artifact was not produced. The buyer/reviewer still cannot tell which findings are true risk, accepted risk, false positive, or backlog.

**Recommended Fix**

Create `SECURITY_SCAN_TRIAGE.md` summarizing grouped unsuppressed and suppressed findings, with owner/status for each class. Keep scanner suppressions precise.

**Effort**: 0.5 day  
**Status**: Partially fixed, artifact missing

### MEDIUM: Customer Search Partial Name Matching Uses A Fixed 500-Profile Candidate Pool

**Evidence**

- `app/api/customers/search/route.ts:52` sets `SEARCH_POOL = 500`.
- `app/api/customers/search/route.ts:63-67` fetches the 500 most recent merchant profiles and filters names in app code.

**Impact**

Search is safe, but it can miss older matching customers for enterprise merchants. For a command palette this may be acceptable as a bounded UX tradeoff, but it should be explicit and tested.

**Recommended Fix**

Use a normalized search column, parameterized RPC, or paginated candidate fetch that continues until enough matches are found or a documented maximum is reached. Rename the limit to make the tradeoff explicit if retained.

**Effort**: 0.5-1 day  
**Status**: Partially fixed

## Updated Verdict

**Not deployable.**

Pass 7 was directionally good, but current production build failure blocks deployment outright. After fixing that, the next enterprise-readiness priority is the unpaginated `getMerchantOwnedJobIds()` helper because it is now a shared dependency for several critical flows.

## Fastest Path To Enterprise-Ready

1. Fix the TypeScript build error in `/api/customers/search`.
2. Paginate `getMerchantOwnedJobIds()` and add >1000-job tests.
3. Make dashboard summary failures visible instead of displaying `0`.
4. Handle dashboard permission denial explicitly.
5. Produce `SECURITY_SCAN_TRIAGE.md`.
6. Decide dependency posture: Next major upgrade or formal signed pilot risk acceptance.
