# Seventh-Pass Enterprise Readiness Audit

Date: 2026-05-06  
Scope: Verification after Sonnet/Copilot Fix Pass 6  
Verdict: **Not ready for 9-10/10 enterprise bar; close for a controlled pilot after remaining data-scale fixes**

## Executive Summary

Pass 6 fixed the blocker introduced in pass 5:

- `countReviewWorthyTransactions()` now proves ownership through `processing_jobs.id + merchant_id`.
- It no longer queries a non-existent `audit_transactions.merchant_id` column.
- It throws on Supabase errors instead of silently returning `0`.
- It uses `.not('dismissed_by_merchant', 'is', true)` so NULL rows are included.

That is real progress. The remaining issues are now more about enterprise-scale correctness, consistency, and dependency posture than obvious cross-merchant leaks.

The app is still not at the requested 9-10/10 bar because dashboard/customer intelligence paths still contain fixed/default caps and one-off summary logic that can undercount large merchants, and `npm audit` still fails with high-severity advisories.

## Current Scorecard

| Area | Score | Notes |
|---|---:|---|
| Product clarity | 8.5/10 | Safer merchant-facing copy and clearer identity language. |
| UI polish | 8/10 | Playwright UX audit passes; still not fully enterprise-polished everywhere. |
| UX flow | 8.5/10 | 13 screenshot audit passes with 0 errors. |
| CSV robustness | 8.5/10 | Benchmarks strong; duplicate header warnings expected. |
| Identity reliability | 8/10 | Blind harness strong; legacy clean eval still reports 53 FPs / 26.5% flag rate. |
| Explainability | 8.5/10 | Cross-merchant cluster API leak removed. |
| Data correctness | 8/10 | Canonical job count fixed; dashboard/customer detail still have caps/one-off metrics. |
| Security/privacy | 8.5/10 | Major service-role/raw-filter issues improved; npm audit still fails. |
| Performance | 8/10 | Build and UX pass; several unpaginated/default-capped queries remain. |
| Maintainability | 8/10 | Helpers improved; summary logic not fully centralized. |

## Command Results

| Command | Result |
|---|---|
| `npm run build` | PASS — Next 14.2.35 production build, 41 pages generated. |
| `npm test -- --runInBand` | PASS — 32 suites, 502 tests. |
| `npm run audit:deployment` | PASS exit code; scanner still reports 270 findings: 119 service-role, 77 csv-export, 47 broad-select, 19 banned-language, 7 fixed-limit, 1 unsafe-html. |
| `npm run dev` | PASS — local server ready on `http://localhost:3000`. |
| `npm run audit:ux` | PASS — 13 screenshots, 0 errors. |
| `npm audit --audit-level=moderate` | FAIL — 5 vulnerabilities remain in `glob`, `next`, and `postcss`; fix path is Next 16 breaking upgrade. |

## Blockers And High-Priority Findings

### HIGH: Dashboard Review Queue Still Uses One-Off, Default-Capped Queries

**Evidence**

- `app/(app)/dashboard/page.tsx:49-52` selects reviewable profile IDs without pagination.
- `app/(app)/dashboard/page.tsx:66-71` selects qualifying transaction profile IDs without pagination.
- `app/(app)/dashboard/page.tsx:63-65` claims the query is bounded by the 50-job limit, but the profile query is not tied to the 50 fetched jobs.
- `app/(app)/dashboard/page.tsx:27`, `79-83`, `193`, and `209` still rely on stored `processing_jobs.flagged_count`, which may be legacy-derived for historical rows.

**Impact**

For large enterprise merchants, Supabase’s default row cap can undercount the dashboard review queue. The comment gives false confidence. A merchant could see "Customers to review" or match-rate KPIs that disagree with inbox/results/export counts.

**Business Impact**

Dashboard KPI mismatch is a serious demo risk. Enterprise buyers will compare dashboard totals to audit results and exports.

**Recommended Fix**

Create a shared dashboard summary helper that:

1. Uses merchant-owned processing jobs as the scope.
2. Uses the same review-worthy definition as inbox/export/job finalisation.
3. Uses count queries or pagination; no default 1000-row caps.
4. Computes distinct `customer_profile_id` server-side if possible.
5. Separates "stored historical flagged_count" from "current identity review count" in copy.

**Effort**: 1 day  
**Status**: Not fixed

### HIGH: Customer Detail API Still Has A Fixed 1000-Row Cap

**Evidence**

- `app/api/customers/[id]/route.ts:187-192` builds a merchant-owned transaction fallback query and applies `.limit(1000)`.
- Static security scan still reports `app/api/customers/[id]/route.ts:192 .limit(1000);`.

**Impact**

High-volume customer profiles can have truncated identity timelines/order histories/linked-signal summaries. This is especially likely for enterprise merchants with repeat buyers, families, offices, resale operations, or abuse rings.

**Recommended Fix**

Replace `.limit(1000)` with paginated fetches using the existing `paginateAll` pattern or a customer-profile-specific helper. Add a regression test that fails if this route contains `.limit(1000)` and a behavioral test proving >1000 rows are returned.

**Effort**: 0.5 day  
**Status**: Not fixed

### HIGH: Dependency Audit Still Fails

**Evidence**

- `npm audit --audit-level=moderate` exits 1.
- Remaining vulnerabilities: `glob` high, `next` high advisories, `postcss` moderate.
- `NPM_AUDIT_MITIGATIONS.md` now truthfully documents mitigations, but the technical vulnerability remains.

**Impact**

For a bounded internal pilot this may be accepted with WAF/CDN controls and no direct Node exposure. For a 9-10/10 security/privacy score, the dependency audit needs a real upgrade path or formal signed risk acceptance.

**Recommended Fix**

Choose one:

1. Upgrade intentionally to the patched Next major version and resolve React/App Router fallout.
2. Add a formal pilot risk acceptance artifact that states exact deployment assumptions, owner, expiry date, and pre-scale upgrade requirement.

**Effort**: 1-3 days for upgrade; 0.5 day for risk artifact  
**Status**: Not fixed

### MEDIUM: Customer Search Name Matching Is Now Exact Array Contains

**Evidence**

- `app/api/customers/search/route.ts:52-58` searches names with `.contains('names', [q])`.

**Impact**

This is safe, but likely less useful. Partial command-palette name search such as `ali` may not match `Alice Smith`. This is a UX regression from the injection fix.

**Recommended Fix**

Use a safe search strategy: normalized searchable text column, parameterized RPC, or merchant-scoped paginated candidate fetch with application-side matching for command-palette limits. Do not reintroduce raw `.or()` strings.

**Effort**: 0.5 day  
**Status**: Not fixed

### MEDIUM: Static Security Scan Still Produces 270 Findings

**Evidence**

- `npm run audit:deployment` reports 270 findings:
  - `service-role`: 119
  - `csv-export`: 77
  - `broad-select`: 47
  - `banned-language`: 19
  - `fixed-limit`: 7
  - `unsafe-html`: 1

**Impact**

Some findings are false positives, but the scanner is not yet enterprise-useful. A serious readiness process needs a triaged, low-noise security report where remaining findings are either fixed or explicitly accepted.

**Recommended Fix**

Triage scanner output into:

- true production risk;
- accepted false positive with reason;
- test-only/dev-only finding;
- backlog item.

Then update `audit-security.mjs` to ignore known false positives by file/context, not by broad blanket suppression.

**Effort**: 1 day  
**Status**: Not fixed

## Updated Verdict

**Not ready for the full requested 9-10/10 enterprise bar.**

The app is now much closer to a controlled pilot. The remaining product-risk surface is narrower: dashboard/customer detail count correctness at scale, dependency posture, and cleanup of security reporting. I would not put this in front of ASOS as "enterprise-ready" yet, because a large merchant could still catch inconsistent counts between dashboard, inbox, customer profile, and exports.

## Fastest Path To Enterprise-Ready

1. Centralize dashboard summary counts and remove default row caps.
2. Remove the customer detail `.limit(1000)` fallback.
3. Decide dependency strategy: Next major upgrade or formal time-boxed pilot risk acceptance.
4. Restore safe partial name search without raw PostgREST string interpolation.
5. Triage the static security scanner so the audit report becomes meaningful instead of noisy.
