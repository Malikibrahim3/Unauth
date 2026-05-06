# Fifth-Pass Enterprise Readiness Audit

Date: 2026-05-06  
Scope: Verification after Sonnet/Copilot Fix Pass 4  
Verdict: **Not ready for ASOS-level pilot yet, but close**

## Executive Summary

Pass 4 fixed several real issues: `lookup/remaining` now uses `requirePermission` and `ctx.merchantId`, the inbox page fails closed, the review queue helper no longer drops graded rows with `match_status = NULL`, and the Playwright UX audit now passes with 13 screenshots.

However, the app is still not at the requested 9-10/10 enterprise bar. The tests are green, but they missed live security and data-correctness issues:

- `/api/customers/search` still interpolates raw user input into a PostgREST `.or()` filter.
- `/customers` uses a local `encodeURIComponent` escape path that does **not** encode parentheses/single quotes and does not use the shared helper.
- `app/api/customers/[id]/route.ts` still reads global `fraud_identity_clusters` and exposes cross-merchant graph existence/count/entity-type/confidence/reason aggregates.
- `next.config.js` says only this project’s bucket is allowed, but the actual hostname allowlist is `*.supabase.co`.
- `npm audit --audit-level=moderate` still exits 1.
- Dashboard/job summary metrics still use legacy `risk_level` / `flagged_count` semantics in key places.

The result is improved, but **not safe to show as a polished enterprise pilot unless the fifth-pass blockers below are fixed.**

## Current Scorecard

| Area | Score | Notes |
|---|---:|---|
| Product clarity | 8.5/10 | Copy is much safer; core workflow is clearer. |
| UI polish | 8/10 | UX audit passes; still not fully Amplitude-grade consistency. |
| UX flow | 8.5/10 | Playwright pass: 13 screenshots, 0 errors. |
| CSV robustness | 8.5/10 | Benchmarks strong; duplicate header warnings expected. |
| Identity reliability | 8/10 | Blind benchmarks good, but legacy clean eval still has 53 FPs / 26.5% flag rate. |
| Explainability | 8/10 | Evidence is stronger, but linked identity API still exposes cross-merchant aggregate signals. |
| Data correctness | 8/10 | Review queue improved; dashboard/job summaries still use legacy risk fields. |
| Security/privacy | 7.5/10 | Raw filter injection remains; cluster aggregate leak remains; npm audit fails. |
| Performance | 8/10 | Build/audit OK; static scan still reports fixed limits and broad selects. |
| Maintainability | 8/10 | Helpers improving, but tests missed claimed fixes and API duplication remains. |

## Command Results

| Command | Result |
|---|---|
| `npm run build` | PASS — Next 14.2.35 production build, 41 pages generated. |
| `npm test -- --runInBand` | PASS — 32 suites, 476 tests. |
| `npm run audit:deployment` | PASS exit code, but security scanner reports 271 findings: 119 service-role, 77 csv-export, 48 broad-select, 19 banned-language, 7 fixed-limit, 1 unsafe-html. |
| `npm run dev` | PASS — local server ready on `http://localhost:3000`. |
| `npm run audit:ux` | PASS — 13 screenshots, 0 errors, evidence written to `UX_PLAYWRIGHT_EVIDENCE.json`. |
| `npm audit --audit-level=moderate` | FAIL — 5 vulnerabilities: `glob`, `next`, `postcss`; fix path is Next 16 breaking upgrade. |

## Blockers And High-Priority Findings

### BLOCKER: Customer Search Still Uses Raw PostgREST Filter Interpolation

**Evidence**

- `app/api/customers/search/route.ts:35` sets `const like = \`%${q}%\`;`
- `app/api/customers/search/route.ts:45` uses `.or(\`primary_email.ilike.${like},names.cs.{${q}}\`)`
- No `escapePostgrestFilterValue` import exists in this route.

**Impact**

Authenticated users can submit search strings containing commas, braces, parentheses, quotes, percent signs, or backslashes that alter or break PostgREST filter parsing. Because this route uses service role, any parsing bypass must be treated as enterprise-blocking.

**Cause**

Pass 4 added an escape helper but did not apply it to this route. Existing route tests only checked auth/scope and did not verify hostile input handling.

**Recommended Fix**

Use `escapePostgrestFilterValue(q)` before every `.or()` filter-string composition. Prefer avoiding composite `.or()` entirely if possible. Add route-level tests that mock the Supabase chain and assert hostile inputs never appear raw in `.or()` arguments.

**Effort**: 0.5 day  
**Status**: Not fixed

### BLOCKER: Customers Page Uses Incomplete Escaping

**Evidence**

- `app/(app)/customers/page.tsx:156` uses `q.replace(/[(),{}"'%\\]/g, (c) => encodeURIComponent(c))`
- `encodeURIComponent('(')` returns `(`, `encodeURIComponent(')')` returns `)`, and `encodeURIComponent("'")` returns `'`.

**Impact**

The UI customer list can still place unescaped PostgREST control characters inside `.or()` query strings. This is exactly the class of issue Pass 4 claimed to fix.

**Cause**

The page reimplemented escaping locally instead of using the shared helper.

**Recommended Fix**

Import and use `escapePostgrestFilterValue`. Add regression tests for parentheses, single quotes, commas, braces, double quotes, percent signs, backslashes, and mixed hostile input against this page’s exact source path.

**Effort**: 0.5 day  
**Status**: Not fixed

### HIGH: Customer Intelligence API Still Reads Global Identity Cluster Graph

**Evidence**

- `app/api/customers/[id]/route.ts:325` begins "Fetch linked accounts from fraud_identity_clusters".
- `app/api/customers/[id]/route.ts:344` reads `fraud_identity_clusters` by `entity_value`.
- `app/api/customers/[id]/route.ts:375` reads all members by `cluster_id`.
- `app/api/customers/[id]/route.ts:418-424` returns entity type, linked-account count, confidence, and match reasons.

**Impact**

Raw PII is masked, but the API still exposes cross-merchant graph existence and inferred linked identity evidence. That can reveal that another merchant has seen related identifiers and what signal types/reasons exist. This violates the prior rule: do not expose cross-merchant cluster existence, counts, entity types, or confidence without an explicit privacy-reviewed aggregate product contract.

**Cause**

The full customer page was fixed, but the API route retained duplicated legacy logic.

**Recommended Fix**

Remove `fraud_identity_clusters` reads from merchant-facing customer APIs. Derive linked identity evidence only from merchant-owned `audit_transactions`, or introduce a formally reviewed aggregate endpoint with explicit data contract, privacy copy, access controls, and tests.

**Effort**: 1 day  
**Status**: Not fixed

### HIGH: npm Audit Mitigation Is Still Internally Inconsistent

**Evidence**

- `next.config.js:8-9` says only this project’s Supabase bucket is allowed and no wildcard patterns are allowed.
- `next.config.js:14` allows `hostname: '*.supabase.co'`.
- `NPM_AUDIT_MITIGATIONS.md:49-50` claims explicit allowlist and "Do NOT use wildcard remotePatterns."
- `npm audit --audit-level=moderate` still fails with 5 vulnerabilities.

**Impact**

The mitigation document overstates the protection. It is better than no `remotePatterns`, but it is not project-specific and it contradicts itself.

**Recommended Fix**

Use a project-specific Supabase storage hostname, for example `${NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co` resolved safely at config time, or revise the document to state the wider accepted risk. Add tests that reject `hostname` values containing `*`, not just `hostname: '**'`.

**Effort**: 0.5 day  
**Status**: Partially fixed, still high risk

### HIGH: Dashboard And Job Finalisation Still Use Legacy Risk Summary Semantics

**Evidence**

- `app/api/process-csv-chunk/route.ts:149-153` computes final `flagged_count` using `.in('risk_level', ['high', 'critical'])`.
- `app/(app)/dashboard/page.tsx:46-50` computes review queue KPIs from `customer_profiles.risk_level`.
- `app/(app)/dashboard/page.tsx:55-60` derives flag rates from `processing_jobs.flagged_count`.

**Impact**

The audit results page and inbox now use identity confidence semantics, but dashboard/history/job summaries can still report stale legacy "flagged" counts. That creates demo confusion and data correctness risk: the same audit may show different populations depending on page.

**Recommended Fix**

Centralize audit summary calculations in one helper using `identity_confidence_grade IS NOT NULL OR match_status IN ('candidate','probable','definite')` and `dismissed_by_merchant IS NOT TRUE`. Use it for job finalisation, dashboard, audit history, exports, and review queue metrics.

**Effort**: 1 day  
**Status**: Not fixed

## Test Quality Gaps

- `tests/api/routeSecurity.test.ts` confirms `/api/customers/search` has auth and merchant scoping, but does not check hostile search input.
- The image mitigation test only rejects `hostname: '**'` and `hostname: "*"`, so `*.supabase.co` passes despite the policy saying no wildcard.
- Many tests remain source-inspection based. Add behavioral tests with mocked Supabase query builders for the exact filter strings generated by routes/pages/helpers.
- The clean merchant eval remains explicitly non-gating while showing 53 false positives / 26.5% flag rate. That is honest now, but not enterprise-ready.

## Updated Verdict

**Not ready, but close.**

This is now much closer to an internal pilot than pass 1, but it still cannot honestly be called 9-10/10 because:

1. A service-role customer search route still interpolates raw user input.
2. A customer API still exposes cross-merchant identity graph aggregates.
3. The npm audit mitigation is contradictory and `npm audit` still fails.
4. Summary metrics still mix legacy risk semantics with new identity confidence semantics.

## Fastest Path To Enterprise-Ready

1. Fix raw PostgREST search interpolation everywhere and add behavioral tests.
2. Remove `fraud_identity_clusters` from merchant-facing customer APIs.
3. Replace legacy flagged/review summary logic with a shared identity-summary helper.
4. Make the `next/image` mitigation truthful: no wildcard hostnames or explicitly documented accepted risk.
5. Keep `npm audit` failure as a tracked pilot exception only if infra assumptions are real and documented by deployment owner.
6. Promote the clean merchant eval to a gating enterprise test once false positives are below 2.5%.
