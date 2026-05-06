# Ninth-Pass Enterprise Readiness Audit

Date: 2026-05-06  
Scope: Verification after Sonnet/Copilot Fix Pass 8  
Verdict: **Not ASOS-level pilot ready**

## Executive Summary

Pass 8 fixed the previous production build failure, paginated `getMerchantOwnedJobIds()`, and stopped the dashboard from converting helper errors into a false `0`. Those are real improvements.

However, the fresh Playwright audit still shows a buyer-visible dashboard failure:

```text
CUSTOMERS TO REVIEW Unavailable Count could not be loaded
```

That is now the primary blocker. The likely cause is schema drift: `countMerchantReviewQueueProfiles()` queries `audit_transactions.customer_profile_id`, but the generated Supabase types and the migrations visible in this repo do not define `customer_profile_id` on `audit_transactions`. The app is therefore passing build/tests while the central dashboard KPI fails at runtime.

The second issue is scanner signal quality. `audit-security.mjs` reports one `unsafe-html` finding, but the finding is the scanner's own regex definition in `scripts/deployment-readiness/audit-security.mjs`. `SECURITY_SCAN_TRIAGE.md` currently treats that as an unresolved production XSS risk, which is inaccurate.

## Current Scorecard

| Area | Score | Notes |
|---|---:|---|
| Product clarity | 8.5/10 | Copy is mostly aligned with "identity review", not accusations. |
| UI polish | 8/10 | Visual system is much better, but dashboard shows a broken KPI in the happy path. |
| UX flow | 8/10 | UX audit passes mechanically, but evidence contains a visible unavailable core metric. |
| CSV robustness | 8.5/10 | Benchmarks continue to pass. |
| Identity reliability | 8/10 | Legacy clean eval still logs 53 false positives / 26.5% flag rate as non-gating. |
| Explainability | 8.5/10 | Cross-merchant cluster graph exposure remains removed. |
| Data correctness | 7/10 | Dashboard helper likely queries a non-existent transaction column. |
| Security/privacy | 8/10 | Route blockers improved, but npm audit fails and scanner triage has a false production XSS claim. |
| Performance | 8/10 | Job pagination improved. Search still uses a fixed candidate pool. |
| Maintainability | 8/10 | Better helpers and tests, but schema/type drift is not being caught. |

## Command Results

| Command | Result |
|---|---|
| `npm run build` | PASS - Next.js production build completed, 41 pages generated. |
| `npm test -- --runInBand` | PASS - 32 suites, 524 tests. |
| `npm run audit:deployment` | PASS exit - benchmarks pass; security scan reports 247 active findings and 29 suppressed findings. |
| `npm run dev` + `npm run audit:ux` | PASS exit - 13 screenshots, 0 script errors, but dashboard evidence contains `Unavailable Count could not be loaded`. |
| `npm audit --audit-level=moderate` | FAIL - 5 vulnerabilities remain in `glob`, `next`, and `postcss`; fix path is Next 16.2.4 breaking upgrade. |

## Blockers And High-Priority Findings

### BLOCKER: Dashboard Happy Path Shows Broken Review Queue KPI

**Evidence**

- Fresh `reports/deployment-readiness/UX_PLAYWRIGHT_EVIDENCE.json` dashboard sample contains:
  - `CUSTOMERS TO REVIEW Unavailable Count could not be loaded`
- Screenshot:
  - `reports/deployment-readiness/screenshots/01-dashboard.png`
- Code path:
  - `app/(app)/dashboard/page.tsx` calls `countMerchantReviewQueueProfiles()`.
  - On error, it renders `"Unavailable"` and `"Count could not be loaded"`.

**User impact**

The first screen of the app tells a merchant that the core review queue count failed. This is not acceptable for an ASOS/Gymshark/Zalando/Sephora/Wayfair pilot.

**Business impact**

The buyer's immediate conclusion will be that the app cannot reliably answer its central operational question: "how many customers/orders need identity review?"

**Technical cause**

The catch state is truthful, but the underlying helper is failing in the seeded happy path.

**Recommended fix**

Diagnose and fix the helper so the dashboard renders a real count in the normal Playwright audit. Add a UX/audit assertion that fails if dashboard evidence contains `Unavailable` or `Count could not be loaded`.

**Estimated effort**: 0.5-1 day  
**Status**: Reported only

### BLOCKER: `countMerchantReviewQueueProfiles()` Appears To Query A Missing Column

**Evidence**

- `lib/supabase/merchantHelpers.ts` selects `customer_profile_id` from `audit_transactions` in `countMerchantReviewQueueProfiles()`.
- `lib/supabase/types.ts` `audit_transactions.Row` does not include `customer_profile_id`.
- `rg customer_profile_id supabase/migrations lib/supabase/types.ts` shows `customer_profile_id` on watchlist, evidence packages, notes, and watchlist appearances, but not as an `audit_transactions` column.
- Visible migrations add `identity_confidence_grade`, `match_status`, and related identity fields, but not `audit_transactions.customer_profile_id`.

**User impact**

Dashboard review counts fail. Any other code path that assumes this column exists can silently fail, miscount, or skip watchlist appearances.

**Business impact**

Enterprise merchant data volumes will amplify this: operators could miss review-worthy customers or see broken summary counts after upload.

**Technical cause**

Schema, generated types, and application queries are out of sync. Tests mock the selected column instead of proving the schema supports it.

**Recommended fix**

Choose one truthful path:

1. Add a migration that adds `audit_transactions.customer_profile_id`, backfill it from `customer_profile_audit_appearances`, update `lib/supabase/types.ts`, and make the worker persist it consistently.
2. Or change `countMerchantReviewQueueProfiles()` to derive distinct profile IDs through `customer_profile_audit_appearances` or another proven schema path, scoped through merchant-owned `processing_jobs`.

Do not keep selecting a column that is absent from migrations/types. Add regression tests that fail when app queries reference columns missing from migrations/generated types.

**Estimated effort**: 1 day  
**Status**: Reported only

### HIGH: Watchlist Appearance Processing Also Uses The Same Suspect Column And A Non-Existent Merchant Column

**Evidence**

- `app/api/process-csv-job/route.ts` queries `audit_transactions` with:
  - `.select('customer_profile_id, identity_confidence_grade')`
  - `.eq('merchant_id', merchantId)`
  - `.in('customer_profile_id', watchlistedIds)`
- `app/api/process-csv-chunk/route.ts` has the same pattern.
- Earlier passes explicitly fixed `countReviewWorthyTransactions()` because `audit_transactions.merchant_id` does not exist.

**User impact**

Watchlist appearances may not record after processing, or may fail silently because these helper functions ignore query errors.

**Business impact**

Watchlist is an enterprise workflow. If watched customers do not appear after upload, merchants lose trust in monitoring.

**Technical cause**

The chunk/job watchlist code still uses legacy assumptions about transaction columns.

**Recommended fix**

Rewrite watchlist appearance detection through merchant-owned job IDs and proven profile appearance tables. Throw or surface errors instead of ignoring them. Add tests that fail if these routes query `audit_transactions.merchant_id`.

**Estimated effort**: 0.5-1 day  
**Status**: Reported only

### HIGH: Static Scanner Triage Is Incorrect For `unsafe-html`

**Evidence**

The only active `unsafe-html` scanner finding is:

```json
{
  "check": "unsafe-html",
  "file": "scripts/deployment-readiness/audit-security.mjs",
  "line": 24,
  "text": "{ id: 'unsafe-html', pattern: /dangerouslySetInnerHTML|innerHTML\\s*=|eval\\s*\\(|new Function/g },"
}
```

`SECURITY_SCAN_TRIAGE.md` currently says:

- "Current mitigations: Unknown"
- "The specific file and line were not captured"
- "The single finding must be resolved, not suppressed"

**User impact**

Security reviewers get inaccurate signal. This undermines the triage artifact's credibility.

**Business impact**

False production-risk claims create noise and slow enterprise review. True XSS findings need to stay visible; scanner self-matches should not.

**Recommended fix**

Add a precise suppression for `unsafe-html` in `scripts/deployment-readiness/audit-security.mjs` only for the scanner pattern definition file/context. Update `SECURITY_SCAN_TRIAGE.md` to say there are currently 0 production unsafe-html findings after suppression, if that remains true.

**Estimated effort**: 0.25 day  
**Status**: Reported only

### MEDIUM: Customer Search Partial Name Search Still Has A Fixed 500-Profile Pool

**Evidence**

- `app/api/customers/search/route.ts` sets `SEARCH_POOL = 500`.
- Name matching fetches the most recent 500 merchant profiles and filters names in application code.

**User impact**

For enterprise merchants, command-palette customer search can miss older matching profiles.

**Business impact**

This is not a data leak, but it weakens investigation UX at scale.

**Recommended fix**

Implement a safe paginated candidate search until enough matches are found, or add a normalized search column/RPC. Keep merchant scoping and do not reintroduce raw `.or()` interpolation.

**Estimated effort**: 0.5 day  
**Status**: Reported only

### HIGH: Dependency Audit Still Fails

**Evidence**

`npm audit --audit-level=moderate` reports 5 vulnerabilities:

- `glob` high
- `next` high advisories
- `postcss` moderate

Audit fix path installs `next@16.2.4`, a breaking upgrade.

**Recommended fix**

For a 9-10/10 security score, upgrade intentionally to the patched Next major path and resolve fallout. If this remains a bounded pilot risk, update `NPM_AUDIT_MITIGATIONS.md` with formal owner, expiry, exact deployment assumptions, and a pre-scale mandatory upgrade date.

**Estimated effort**: 1-3 days  
**Status**: Accepted risk only, not fixed

## Required Ninth-Pass Fixes

1. Make dashboard happy path render a real review queue count, not `Unavailable`.
2. Resolve the `audit_transactions.customer_profile_id` schema/query mismatch.
3. Fix watchlist appearance processing to avoid missing/non-existent transaction columns.
4. Suppress scanner self-matches precisely and update `SECURITY_SCAN_TRIAGE.md`.
5. Add tests that validate query columns against migrations/generated types, not just mocked Supabase chains.
6. Decide whether to upgrade Next or formalize the remaining audit failure as a named, time-boxed pilot risk.

## Updated Verdict

**Not ASOS-level pilot ready.**

The app is closer and no longer fails the production build, but a central dashboard KPI visibly fails in the Playwright happy path. Until that is fixed and schema drift is caught by tests, the app should not be shown to a serious enterprise merchant as pilot-ready.
